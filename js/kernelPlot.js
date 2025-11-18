

import { CleanVaccin } from './clean.js';

const countryNames = {
    'AT': 'Austria', 'BE': 'Belgium', 'BG': 'Bulgaria', 'HR': 'Croatia',
    'CY': 'Cyprus', 'CZ': 'Czechia', 'DK': 'Denmark', 'EE': 'Estonia',
    'FI': 'Finland', 'FR': 'France', 'DE': 'Germany', 'GR': 'Greece',
    'HU': 'Hungary', 'IS': 'Iceland', 'IE': 'Ireland', 'IT': 'Italy',
    'LV': 'Latvia', 'LI': 'Liechtenstein', 'LT': 'Lithuania', 'LU': 'Luxembourg',
    'MT': 'Malta', 'NL': 'Netherlands', 'NO': 'Norway', 'PL': 'Poland',
    'PT': 'Portugal', 'RO': 'Romania', 'SK': 'Slovakia', 'SI': 'Slovenia',
    'ES': 'Spain', 'SE': 'Sweden'
};

function kernelDensityEstimation(data, bandwidth, xValues) {
    // Gaussian kernel function
    const kernel = (u) => {
        return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * u * u);
    };
    
    return xValues.map(x => {
        // For each x, sum contributions from all data points
        const density = data.reduce((sum, dataPoint) => {
            const u = (x - dataPoint) / bandwidth;
            return sum + kernel(u);
        }, 0);
        
        // Normalize by number of points and bandwidth
        return density / (data.length * bandwidth);
    });
}


function processVaccineData(data, countryCode) {
    // Filter data for the specified country and target group "ALL"
    console.log("Hok SENG");
    const countryData = data.filter(d => 
        d.ReportingCountry === countryCode && 
        d.TargetGroup === 'ALL' &&
        d.Region === countryCode 
    );
    
    // Group by vaccine
    const vaccineMap = new Map();
    
    countryData.forEach(row => {
        const vaccine = row.Vaccine;
        if (!vaccine) return;
        
        if (!vaccineMap.has(vaccine)) {
            vaccineMap.set(vaccine, []);
        }
        vaccineMap.get(vaccine).push({
            week: row.YearWeekISO,
            dose: +row.SecondDose || 0
        });
    });
    
    // Process each vaccine: sum by week, normalize
    const normalizedData = {};
    
    vaccineMap.forEach((records, vaccine) => {
        // Sum doses by week
        const weeklyMap = new Map();
        records.forEach(r => {
            const current = weeklyMap.get(r.week) || 0;
            weeklyMap.set(r.week, current + r.dose);
        });
        
        const weeklyDoses = Array.from(weeklyMap.values()).filter(d => d > 0);
        
        // Need at least 5 data points for KDE
        if (weeklyDoses.length < 5) return;
        
        // Normalize to [0, 1] range
        const min = Math.min(...weeklyDoses);
        const max = Math.max(...weeklyDoses);
        
        if (max === min) return; // Avoid division by zero
        
        const normalized = weeklyDoses.map(d => (d - min) / (max - min));
        
        normalizedData[vaccine] = {
            values: normalized,
            min: min,
            max: max,
            median: d3.median(normalized)
        };
    });
    
    return normalizedData;
}


function plasmaColor(t) {
    // Simplified plasma colormap approximation
    const colors = [
        [13, 8, 135],      // Dark blue
        [75, 0, 146],      // Purple
        [126, 3, 167],     // Magenta
        [173, 31, 162],    // Pink-purple
        [213, 62, 144],    // Pink
        [244, 97, 117],    // Salmon
        [253, 141, 60],    // Orange
        [252, 194, 0],     // Yellow
        [240, 249, 33]     // Bright yellow
    ];
    
    const idx = t * (colors.length - 1);
    const i1 = Math.floor(idx);
    const i2 = Math.min(i1 + 1, colors.length - 1);
    const frac = idx - i1;
    
    const c1 = colors[i1];
    const c2 = colors[i2];
    
    const r = Math.round(c1[0] + (c2[0] - c1[0]) * frac);
    const g = Math.round(c1[1] + (c2[1] - c1[1]) * frac);
    const b = Math.round(c1[2] + (c2[2] - c1[2]) * frac);
    
    return `rgb(${r}, ${g}, ${b})`;
}

function plotRidgelineKDE(data, countryCode) {
   
    const vaccineData = processVaccineData(data, countryCode);
    
    const vaccines = Object.keys(vaccineData).sort();
    
    if (vaccines.length === 0) {
        console.error('No vaccine data available');
        return;
    }
    
    // Get container dimensions for responsive sizing
    const container = document.getElementById('chart');
    const containerWidth = container.clientWidth || 1000;
    const containerHeight = container.clientHeight || 600;
    
    // Chart dimensions - responsive to container
    const margin = { top: 60, right: 50, bottom: 60, left: 120 };
    const rowHeight = 50;
    const width = Math.min(containerWidth - margin.left - margin.right, 1400);
    const height = vaccines.length * rowHeight;
    
    // Clear any existing chart
    d3.select('#chart').selectAll('*').remove();
    
    // Create responsive SVG with viewBox
    const svg = d3.select('#chart')
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Scales
    const xScale = d3.scaleLinear()
        .domain([0, 1])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, vaccines.length])
        .range([height,0]);  

    

    // Generate x values for KDE evaluation (sample points)
    const xValues = d3.range(0, 1.01, 0.01);
    
    // Bandwidth for KDE (similar to bw_adjust=0.6 in seaborn)
    const bandwidth = 0.05;
    
    // Create ridges for each vaccine
    vaccines.forEach((vaccine, idx) => {
        const vData = vaccineData[vaccine];
        
        // Calculate KDE
        const densityValues = kernelDensityEstimation(vData.values, bandwidth, xValues);
        
        // Normalize height to 0.8 of row height (similar to Python code)
        const maxDensity = Math.max(...densityValues);
        const normalizedDensity = densityValues.map(d => (d / maxDensity) * 0.8);
        
        // Create path data: [[x, y], [x, y], ...]
        const pathData = xValues.map((x, i) => ({
            x: x,
            y: idx + normalizedDensity[i]
        }));
        
        // Color based on median
        const color = plasmaColor(vData.median);
        
        // Create area generator
        const area = d3.area()
            .x(d => xScale(d.x))
            .y0(yScale(idx))
            .y1(d => yScale(d.y))
            .curve(d3.curveMonotoneX);
        
        // Create line generator for outline
        const line = d3.line()
            .x(d => xScale(d.x))
            .y(d => yScale(d.y))
            .curve(d3.curveMonotoneX);
        
        // Draw filled area
        svg.append('path')
            .datum(pathData)
            .attr('class', 'ridge-area')
            .attr('d', area)
            .style('fill', color)
            .style('opacity', 0.85);
        
        // Draw outline
        svg.append('path')
            .datum(pathData)
            .attr('class', 'ridge-line')
            .attr('d', line)
            .style('fill', 'none')
            .style('stroke', 'black')
            .style('stroke-width', 1);
    });
    
    // X-axis
    svg.append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).ticks(10))
        .append('text')
        .attr('x', width / 2)
        .attr('y', 45)
        .attr('fill', 'black')
        .style('font-size', '13px')
        .style('font-weight', 'normal')
        .style('text-anchor', 'middle')
        .text('Normalized Weekly Doses');
    
    // Y-axis (vaccine labels)
    const yAxis = d3.axisLeft(yScale)
        .tickValues(d3.range(vaccines.length))
        .tickFormat((d, i) => vaccines[i]);
    
    svg.append('g')
        .call(yAxis)
        .selectAll('text')
        .style('font-size', '11px');
    
    // Title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -30)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .text(`Vaccine Distribution Comparison (Ridgeline KDE) - ${countryNames[countryCode] || countryCode}`);
    
    // Add grid
    svg.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(xScale)
            .tickSize(-height)
            .tickFormat('')
        )
        .style('stroke-opacity', 0.15);
}

function plotTwoCountryComparison(data, countryCode1, countryCode2) {
    console.log(`🏔️ Creating two-country ridgeline comparison: ${countryCode1} vs ${countryCode2}`);
    
    // Process data for both countries
    const vaccineData1 = processVaccineData(data, countryCode1);
    const vaccineData2 = processVaccineData(data, countryCode2);
    
    // Get union of all vaccines from both countries
    const vaccines1 = Object.keys(vaccineData1);
    const vaccines2 = Object.keys(vaccineData2);
    const allVaccines = [...new Set([...vaccines1, ...vaccines2])].sort();
    
    if (allVaccines.length === 0) {
        console.error('No vaccine data available for comparison');
        return;
    }
    
    // Get container dimensions for responsive sizing
    const container = document.getElementById('chart');
    const containerWidth = container.clientWidth || 1000;
    const containerHeight = container.clientHeight || 600;
    
    // Chart dimensions - responsive to container
    const margin = { top: 80, right: 120, bottom: 60, left: 150 };
    const rowHeight = 60;
    const width = Math.min(containerWidth - margin.left - margin.right, 1400);
    const height = allVaccines.length * rowHeight;
    
    // Clear any existing chart
    d3.select('#chart').selectAll('*').remove();
    
    // Create responsive SVG with viewBox
    const svg = d3.select('#chart')
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Scales
    const xScale = d3.scaleLinear()
        .domain([0, 1])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, allVaccines.length])
        .range([height, 0]);
    
    // Generate x values for KDE evaluation
    const xValues = d3.range(0, 1.01, 0.01);
    const bandwidth = 0.05;
    
    // Colors for two countries
    const color1 = '#3498db';  // Blue for country 1
    const color2 = '#e74c3c';  // Red for country 2
    
    // Create ridges for each vaccine
    allVaccines.forEach((vaccine, idx) => {
        // Draw country 1 if data exists
        if (vaccineData1[vaccine]) {
            const vData1 = vaccineData1[vaccine];
            const densityValues1 = kernelDensityEstimation(vData1.values, bandwidth, xValues);
            const maxDensity1 = Math.max(...densityValues1);
            const normalizedDensity1 = densityValues1.map(d => (d / maxDensity1) * 0.7);
            
            const pathData1 = xValues.map((x, i) => ({
                x: x,
                y: idx + normalizedDensity1[i]
            }));
            
            const area1 = d3.area()
                .x(d => xScale(d.x))
                .y0(yScale(idx))
                .y1(d => yScale(d.y))
                .curve(d3.curveMonotoneX);
            
            const line1 = d3.line()
                .x(d => xScale(d.x))
                .y(d => yScale(d.y))
                .curve(d3.curveMonotoneX);
            
            // Draw filled area for country 1
            svg.append('path')
                .datum(pathData1)
                .attr('class', `ridge-area-country1-${vaccine}`)
                .attr('d', area1)
                .style('fill', color1)
                .style('opacity', 0.5);
            
            // Draw outline for country 1
            svg.append('path')
                .datum(pathData1)
                .attr('class', `ridge-line-country1-${vaccine}`)
                .attr('d', line1)
                .style('fill', 'none')
                .style('stroke', color1)
                .style('stroke-width', 2);
        }
        
        // Draw country 2 if data exists
        if (vaccineData2[vaccine]) {
            const vData2 = vaccineData2[vaccine];
            const densityValues2 = kernelDensityEstimation(vData2.values, bandwidth, xValues);
            const maxDensity2 = Math.max(...densityValues2);
            const normalizedDensity2 = densityValues2.map(d => (d / maxDensity2) * 0.7);
            
            const pathData2 = xValues.map((x, i) => ({
                x: x,
                y: idx + normalizedDensity2[i]
            }));
            
            const area2 = d3.area()
                .x(d => xScale(d.x))
                .y0(yScale(idx))
                .y1(d => yScale(d.y))
                .curve(d3.curveMonotoneX);
            
            const line2 = d3.line()
                .x(d => xScale(d.x))
                .y(d => yScale(d.y))
                .curve(d3.curveMonotoneX);
            
            // Draw filled area for country 2
            svg.append('path')
                .datum(pathData2)
                .attr('class', `ridge-area-country2-${vaccine}`)
                .attr('d', area2)
                .style('fill', color2)
                .style('opacity', 0.5);
            
            // Draw outline for country 2
            svg.append('path')
                .datum(pathData2)
                .attr('class', `ridge-line-country2-${vaccine}`)
                .attr('d', line2)
                .style('fill', 'none')
                .style('stroke', color2)
                .style('stroke-width', 2);
        }
    });
    
    // X-axis
    svg.append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).ticks(10))
        .append('text')
        .attr('x', width / 2)
        .attr('y', 45)
        .attr('fill', 'black')
        .style('font-size', '13px')
        .style('font-weight', 'normal')
        .style('text-anchor', 'middle')
        .text('Normalized Weekly Doses');
    
    // Y-axis (vaccine labels)
    const yAxis = d3.axisLeft(yScale)
        .tickValues(d3.range(allVaccines.length))
        .tickFormat((d, i) => allVaccines[i]);
    
    svg.append('g')
        .call(yAxis)
        .selectAll('text')
        .style('font-size', '11px');
    
    // Title
    const country1Name = countryNames[countryCode1] || countryCode1;
    const country2Name = countryNames[countryCode2] || countryCode2;
    
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -50)
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        .style('font-weight', 'bold')
        .text(`Vaccine Distribution Comparison: ${country1Name} vs ${country2Name}`);
    
    // Add legend
    const legend = svg.append('g')
        .attr('transform', `translate(${width + 20}, 0)`);
    
    // Country 1 legend
    legend.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 20)
        .attr('height', 15)
        .style('fill', color1)
        .style('opacity', 0.5)
        .style('stroke', color1)
        .style('stroke-width', 2);
    
    legend.append('text')
        .attr('x', 25)
        .attr('y', 12)
        .style('font-size', '12px')
        .text(country1Name);
    
    // Country 2 legend
    legend.append('rect')
        .attr('x', 0)
        .attr('y', 25)
        .attr('width', 20)
        .attr('height', 15)
        .style('fill', color2)
        .style('opacity', 0.5)
        .style('stroke', color2)
        .style('stroke-width', 2);
    
    legend.append('text')
        .attr('x', 25)
        .attr('y', 37)
        .style('font-size', '12px')
        .text(country2Name);
    
    // Add grid
    svg.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(xScale)
            .tickSize(-height)
            .tickFormat('')
        )
        .style('stroke-opacity', 0.15);
    
    console.log(`✅ Two-country ridgeline comparison created successfully`);
}

/**
 * Update chart based on user selection
 */
function updateChart() {
    const mode = document.getElementById('modeSelect')?.value || 'single';
    
    if (mode === 'compare') {
        const country1 = document.getElementById('country1Select').value;
        const country2 = document.getElementById('country2Select').value;
        
        CleanVaccin().then(data => {
            plotTwoCountryComparison(data, country1, country2);
        });
    } else {
        const countryCode = document.getElementById('countrySelect').value;
        
        CleanVaccin().then(data => {
            plotRidgelineKDE(data, countryCode);
        });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    updateChart();
    
    // Add event listeners
    document.getElementById('countrySelect')?.addEventListener('change', updateChart);
    document.getElementById('country1Select')?.addEventListener('change', updateChart);
    document.getElementById('country2Select')?.addEventListener('change', updateChart);
    document.getElementById('modeSelect')?.addEventListener('change', () => {
        const mode = document.getElementById('modeSelect').value;
        const singleControls = document.getElementById('singleCountryControls');
        const compareControls = document.getElementById('compareCountryControls');
        
        if (mode === 'compare') {
            singleControls.style.display = 'none';
            compareControls.style.display = 'block';
        } else {
            singleControls.style.display = 'block';
            compareControls.style.display = 'none';
        }
        
        updateChart();
    });
});


export { plotRidgelineKDE, plotTwoCountryComparison };
