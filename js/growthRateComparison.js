/**
 * Growth Rate Comparison Visualization
 * Compares daily growth rates between two countries
 */

// Global variables
let allData = [];
let topCountries = [];
let currentCountry1Data = [];
let currentCountry2Data = [];

// Configuration - use global variables if available
const config = {
    country1: window.selectedCountry1 || 'France',
    country2: window.selectedCountry2 || 'Germany',
    colors: {
        country1: { fill: '#e74c3c', line: '#c0392b' },
        country2: { fill: '#3498db', line: '#2980b9' }
    }
};

// Transition duration
const TRANSITION_DURATION = 800;

// Load and process data
d3.csv('data/covid.csv').then(data => {
    console.log('Data loaded:', data.length, 'rows');
    
    // Parse data
    data.forEach(d => {
        d.date = new Date(d.date);
        d.total_cases = +d.total_cases || 0;
        d.location = d.location;
    });

    console.log('Sample data:', data.slice(0, 3));

    // European countries list
    const europeanCountries = [
        'Albania', 'Andorra', 'Austria', 'Belarus', 'Belgium', 'Bosnia and Herzegovina',
        'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 'Denmark', 'Estonia', 'Finland',
        'France', 'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland', 'Italy',
        'Kosovo', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Moldova', 'Monaco',
        'Montenegro', 'Netherlands', 'North Macedonia', 'Norway', 'Poland', 'Portugal',
        'Romania', 'Russia', 'San Marino', 'Serbia', 'Slovakia', 'Slovenia', 'Spain',
        'Sweden', 'Switzerland', 'Ukraine', 'United Kingdom', 'Vatican'
    ];

    // Get top 10 European countries by total cases
    // Exclude aggregated regions
    const excludeRegions = [
        'World', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania',
        'High-income countries', 'Low-income countries', 'Lower-middle-income countries', 
        'Upper-middle-income countries', 'European Union', 'International'
    ];
    
    const totalCasesByCountry = d3.rollup(
        data.filter(d => !excludeRegions.includes(d.location) && europeanCountries.includes(d.location)),
        v => d3.max(v, d => d.total_cases),
        d => d.location
    );
    
    // Get top 5 European countries by total cases
    const top5Countries = Array.from(totalCasesByCountry.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(d => d[0]);

    console.log('Top 5 European countries:', top5Countries);
    console.log('Looking for:', config.country1, 'and', config.country2);

    // Filter data for European countries only
    const topData = data.filter(d => !excludeRegions.includes(d.location) && europeanCountries.includes(d.location));
    
    console.log('Filtered data points (excluding regions):', topData.length);
    console.log('Sample filtered data:', topData.slice(0, 5).map(d => ({ location: d.location, date: d.date, cases: d.total_cases })));

    // Store for later use
    allData = topData;
    topCountries = top5Countries;

    // Populate dropdowns with top 5 countries
    populateCountrySelectors(top5Countries);

    // Process data for both countries
    currentCountry1Data = processCountryData(topData, config.country1);
    currentCountry2Data = processCountryData(topData, config.country2);

    console.log(`${config.country1} data points:`, currentCountry1Data.length);
    console.log(`${config.country2} data points:`, currentCountry2Data.length);

    // Draw visualization
    drawComparison(currentCountry1Data, currentCountry2Data);

    // Display statistics - DISABLED
    // displayStatistics(config.country1, currentCountry1Data, config.country2, currentCountry2Data);
}).catch(error => {
    console.error('Error loading data:', error);
    d3.select('#growthPlot').append('div')
        .style('color', 'red')
        .style('padding', '20px')
        .style('text-align', 'center')
        .html(`<h3>Error loading data</h3><p>${error.message}</p><p>Make sure covid.csv is in the data/ folder</p>`);
});

function processCountryData(data, country) {
    console.log(`Processing data for: "${country}"`);
    
    // Filter for specific country
    let countryData = data.filter(d => d.location === country);
    
    console.log(`Found ${countryData.length} rows for ${country}`);
    
    if (countryData.length === 0) {
        console.warn(`No data found for country: "${country}"`);
        console.log('Available countries in data:', [...new Set(data.map(d => d.location))].slice(0, 10));
        return [];
    }
    
    // Sort by date
    countryData.sort((a, b) => a.date - b.date);
    
    // Calculate growth rate (percentage change)
    const processedData = [];
    for (let i = 1; i < countryData.length; i++) {
        const prev = countryData[i - 1];
        const curr = countryData[i];
        
        if (prev.total_cases > 0) {
            const growthRate = ((curr.total_cases - prev.total_cases) / prev.total_cases) * 100;
            
            // Filter: only include growth rates between 0 and 100
            if (growthRate >= 0 && growthRate <= 100) {
                processedData.push({
                    date: curr.date,
                    growth_rate: growthRate,
                    total_cases: curr.total_cases
                });
            }
        }
    }
    
    return processedData;
}

function populateCountrySelectors(countries) {
    const select1 = document.getElementById('country1Select');
    const select2 = document.getElementById('country2Select');
    
    // Clear existing options
    select1.innerHTML = '';
    select2.innerHTML = '';
    
    // Add options
    countries.forEach(country => {
        const option1 = document.createElement('option');
        option1.value = country;
        option1.textContent = country;
        if (country === config.country1) option1.selected = true;
        select1.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = country;
        option2.textContent = country;
        if (country === config.country2) option2.selected = true;
        select2.appendChild(option2);
    });
}

// Function to update comparison with smooth transition
window.updateComparison = function() {
    const newCountry1 = document.getElementById('country1Select').value;
    const newCountry2 = document.getElementById('country2Select').value;
    
    if (newCountry1 === newCountry2) {
        alert('Please select two different countries for comparison.');
        return;
    }
    
    console.log(`Updating comparison: ${newCountry1} vs ${newCountry2}`);
    
    // Update config
    config.country1 = newCountry1;
    config.country2 = newCountry2;
    
    // Process new data
    const newCountry1Data = processCountryData(allData, newCountry1);
    const newCountry2Data = processCountryData(allData, newCountry2);
    
    // Update with transition
    updateVisualizationWithTransition(newCountry1Data, newCountry2Data);
    
    // Update statistics - DISABLED
    // displayStatistics(config.country1, newCountry1Data, config.country2, newCountry2Data);
    
    // Store current data
    currentCountry1Data = newCountry1Data;
    currentCountry2Data = newCountry2Data;
};

function updateVisualizationWithTransition(country1Data, country2Data) {
    const svg = d3.select('#growthPlot svg g');
    
    if (svg.empty()) {
        // First time - draw normally
        drawComparison(country1Data, country2Data);
        return;
    }
    
    // Get dimensions
    const margin = { top: 80, right: 150, bottom: 100, left: 80 };
    const width = 1200 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;
    
    // Scales
    const allDates = [...country1Data.map(d => d.date), ...country2Data.map(d => d.date)];
    const xScale = d3.scaleTime()
        .domain(d3.extent(allDates))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([-5, 100])
        .range([height, 0]);
    
    // Area generators
    const area1 = d3.area()
        .x(d => xScale(d.date))
        .y0(height)
        .y1(d => yScale(d.growth_rate))
        .curve(d3.curveMonotoneX);

    const area2 = d3.area()
        .x(d => xScale(d.date))
        .y0(height)
        .y1(d => yScale(d.growth_rate))
        .curve(d3.curveMonotoneX);

    const line1 = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.growth_rate))
        .curve(d3.curveMonotoneX);

    const line2 = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.growth_rate))
        .curve(d3.curveMonotoneX);
    
    // Update areas and lines with transition
    svg.select('.area1')
        .transition()
        .duration(TRANSITION_DURATION)
        .ease(d3.easeCubicInOut)
        .attr('d', area1(country1Data));
    
    svg.select('.line1')
        .transition()
        .duration(TRANSITION_DURATION)
        .ease(d3.easeCubicInOut)
        .attr('d', line1(country1Data));
    
    svg.select('.area2')
        .transition()
        .duration(TRANSITION_DURATION)
        .ease(d3.easeCubicInOut)
        .attr('d', area2(country2Data));
    
    svg.select('.line2')
        .transition()
        .duration(TRANSITION_DURATION)
        .ease(d3.easeCubicInOut)
        .attr('d', line2(country2Data));
    
    // Update title with fade effect
    svg.select('.main-title')
        .transition()
        .duration(TRANSITION_DURATION / 2)
        .style('opacity', 0)
        .transition()
        .duration(TRANSITION_DURATION / 2)
        .style('opacity', 1)
        .text(`COVID-19 Daily Growth Rate Comparison: ${config.country1} vs ${config.country2}`);
    
    // Update legend
    svg.selectAll('.legend-text')
        .data([config.country1, config.country2])
        .transition()
        .duration(TRANSITION_DURATION / 2)
        .style('opacity', 0)
        .transition()
        .duration(TRANSITION_DURATION / 2)
        .style('opacity', 1)
        .text(d => d);
}

function drawComparison(country1Data, country2Data) {
    console.log('Drawing comparison...');
    console.log('Country 1 data:', country1Data.length, 'points');
    console.log('Country 2 data:', country2Data.length, 'points');
    
    // Check for both possible container IDs
    const plotElement = document.getElementById('growthRatePlot') || document.getElementById('growthPlot');
    const plotContainer = d3.select(plotElement);
    
    // Clear any existing visualization
    plotContainer.selectAll('*').remove();

    // Dimensions
    const margin = { top: 80, right: 150, bottom: 100, left: 80 };
    const width = 1200 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    console.log('SVG dimensions:', { width, height, margin });

    // Create SVG
    const svg = plotContainer
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);    // Scales
    const allDates = [...country1Data.map(d => d.date), ...country2Data.map(d => d.date)];
    const xScale = d3.scaleTime()
        .domain(d3.extent(allDates))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([-5, 100])
        .range([height, 0]);

    console.log('X scale domain:', d3.extent(allDates));
    console.log('Y scale domain:', [-5, 100]);

    // Axes
    const xAxis = d3.axisBottom(xScale)
        .ticks(d3.timeMonth.every(3))
        .tickFormat(d3.timeFormat('%b %Y'));

    const yAxis = d3.axisLeft(yScale)
        .ticks(10);

    // Add grid
    svg.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.3)
        .call(d3.axisLeft(yScale)
            .tickSize(-width)
            .tickFormat('')
        )
        .selectAll('line')
        .style('stroke-dasharray', '3,3');

    // Area generators
    const area1 = d3.area()
        .x(d => xScale(d.date))
        .y0(height)
        .y1(d => yScale(d.growth_rate))
        .curve(d3.curveMonotoneX);

    const area2 = d3.area()
        .x(d => xScale(d.date))
        .y0(height)
        .y1(d => yScale(d.growth_rate))
        .curve(d3.curveMonotoneX);

    // Line generators
    const line1 = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.growth_rate))
        .curve(d3.curveMonotoneX);

    const line2 = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.growth_rate))
        .curve(d3.curveMonotoneX);

    // Draw country 1
    svg.append('path')
        .attr('class', 'area1')
        .datum(country1Data)
        .attr('fill', config.colors.country1.fill)
        .attr('fill-opacity', 0)
        .attr('d', area1)
        .transition()
        .duration(TRANSITION_DURATION)
        .attr('fill-opacity', 0.3);

    svg.append('path')
        .attr('class', 'line1')
        .datum(country1Data)
        .attr('fill', 'none')
        .attr('stroke', config.colors.country1.line)
        .attr('stroke-width', 2.5)
        .attr('stroke-dasharray', function() {
            const length = this.getTotalLength();
            return length + ' ' + length;
        })
        .attr('stroke-dashoffset', function() {
            return this.getTotalLength();
        })
        .attr('d', line1)
        .transition()
        .duration(TRANSITION_DURATION)
        .ease(d3.easeCubicInOut)
        .attr('stroke-dashoffset', 0);

    // Draw country 2
    svg.append('path')
        .attr('class', 'area2')
        .datum(country2Data)
        .attr('fill', config.colors.country2.fill)
        .attr('fill-opacity', 0)
        .attr('d', area2)
        .transition()
        .duration(TRANSITION_DURATION)
        .attr('fill-opacity', 0.3);

    svg.append('path')
        .attr('class', 'line2')
        .datum(country2Data)
        .attr('fill', 'none')
        .attr('stroke', config.colors.country2.line)
        .attr('stroke-width', 2.5)
        .attr('stroke-dasharray', function() {
            const length = this.getTotalLength();
            return length + ' ' + length;
        })
        .attr('stroke-dashoffset', function() {
            return this.getTotalLength();
        })
        .attr('d', line2)
        .transition()
        .duration(TRANSITION_DURATION)
        .ease(d3.easeCubicInOut)
        .attr('stroke-dashoffset', 0);

    // Reference line at y=0
    svg.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', yScale(0))
        .attr('y2', yScale(0))
        .attr('stroke', 'black')
        .attr('stroke-width', 1)
        .attr('opacity', 0.5);

    // Add X axis
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis)
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .style('font-size', '10px');

    // Add Y axis
    svg.append('g')
        .call(yAxis)
        .selectAll('text')
        .style('font-size', '11px');

    // X-axis label
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + 50)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .text('Date');

    // Y-axis label
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -55)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .text('Daily Growth Rate (%)');

    // Title
    svg.append('text')
        .attr('class', 'main-title')
        .attr('x', width / 2)
        .attr('y', -50)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('opacity', 0)
        .text(`COVID-19 Daily Growth Rate Comparison: ${config.country1} vs ${config.country2}`)
        .transition()
        .duration(TRANSITION_DURATION)
        .style('opacity', 1);

    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -30)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('opacity', 0)
        .text('(Percentage change in total cases day-over-day)')
        .transition()
        .duration(TRANSITION_DURATION)
        .style('opacity', 1);

    // Legend
    const legend = svg.append('g')
        .attr('transform', `translate(${width - 100}, 10)`);

    const legendItems = [
        { label: config.country1, color: config.colors.country1.line },
        { label: config.country2, color: config.colors.country2.line }
    ];

    legendItems.forEach((item, i) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 25})`)
            .style('opacity', 0);

        // Draw a line with filled area representation
        legendRow.append('rect')
            .attr('width', 20)
            .attr('height', 15)
            .attr('fill', item.color)
            .attr('opacity', 0.3);
        
        legendRow.append('line')
            .attr('x1', 0)
            .attr('x2', 20)
            .attr('y1', 8)
            .attr('y2', 8)
            .attr('stroke', item.color)
            .attr('stroke-width', 2.5);

        legendRow.append('text')
            .attr('class', 'legend-text')
            .attr('x', 28)
            .attr('y', 12)
            .style('font-size', '11px')
            .style('font-weight', '600')
            .text(item.label);
        
        // Apply fade-in transition after elements are added
        legendRow.transition()
            .delay(TRANSITION_DURATION / 2)
            .duration(TRANSITION_DURATION / 2)
            .style('opacity', 1);
    });

    // Add tooltip
    const tooltip = d3.select('#tooltip');

    // Add invisible overlay for tooltip
    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'none')
        .attr('pointer-events', 'all')
        .on('mousemove', function(event) {
            const [mouseX] = d3.pointer(event);
            const date = xScale.invert(mouseX);
            
            // Find closest data points
            const closest1 = findClosestDataPoint(country1Data, date);
            const closest2 = findClosestDataPoint(country2Data, date);

            if (closest1 || closest2) {
                let html = '<div style="padding: 5px;">';
                if (closest1) {
                    html += `<div style="margin-bottom: 8px; border-bottom: 1px solid ${config.colors.country1.line}; padding-bottom: 5px;">`;
                    html += `<strong style="color: ${config.colors.country1.line};">${config.country1}</strong><br>`;
                    html += `Date: ${d3.timeFormat('%Y-%m-%d')(closest1.date)}<br>`;
                    html += `Growth Rate: <strong>${closest1.growth_rate.toFixed(2)}%</strong>`;
                    html += `</div>`;
                }
                if (closest2) {
                    html += `<div style="margin-top: 5px;">`;
                    html += `<strong style="color: ${config.colors.country2.line};">${config.country2}</strong><br>`;
                    html += `Date: ${d3.timeFormat('%Y-%m-%d')(closest2.date)}<br>`;
                    html += `Growth Rate: <strong>${closest2.growth_rate.toFixed(2)}%</strong>`;
                    html += `</div>`;
                }
                html += '</div>';

                tooltip.style('display', 'block')
                    .style('left', (event.pageX + 12) + 'px')
                    .style('top', (event.pageY - 10) + 'px')
                    .html(html);
            }
        })
        .on('mouseout', function() {
            tooltip.style('display', 'none');
        });
}

function findClosestDataPoint(data, date) {
    if (!data || data.length === 0) return null;
    
    let closest = data[0];
    let minDiff = Math.abs(data[0].date - date);
    
    for (let i = 1; i < data.length; i++) {
        const diff = Math.abs(data[i].date - date);
        if (diff < minDiff) {
            minDiff = diff;
            closest = data[i];
        }
    }
    return minDiff < 7 * 24 * 60 * 60 * 1000 ? closest : null; // Within 7 days
}

function displayStatistics(country1, data1, country2, data2) {
    // Support both new and old div IDs
    const statsElement = document.getElementById('growthRateStats') || document.getElementById('statistics');
    if (!statsElement) {
        console.error('Statistics container not found');
        return;
    }
    const statsDiv = d3.select(statsElement);
    statsDiv.selectAll('*').remove();
    // Create statistics cards
    const container = statsDiv.append('div')
        .style('display', 'grid')
        .style('grid-template-columns', '1fr 1fr')
        .style('gap', '20px')
        .style('margin-top', '20px');
    // Title
    statsDiv.insert('h2', ':first-child')
        .style('text-align', 'center')
        .style('color', '#2c3e50')
        .style('margin-bottom', '10px')
        .html(`📊 Growth Rate Comparison: ${country1} vs ${country2}`);
    statsDiv.insert('hr', 'div')
        .style('border', 'none')
        .style('border-top', '2px solid #ddd')
        .style('margin', '10px 0 20px 0');

    [
        { country: country1, data: data1, color: config.colors.country1.line },
        { country: country2, data: data2, color: config.colors.country2.line }
    ].forEach(({ country, data, color }) => {
        if (data.length === 0) return;

        const stats = calculateStats(data);
        
        const card = container.append('div')
            .style('background', `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`)
            .style('border-left', `4px solid ${color}`)
            .style('border-radius', '8px')
            .style('padding', '20px')
            .style('box-shadow', '0 2px 8px rgba(0,0,0,0.1)');

        card.append('h3')
            .style('color', color)
            .style('margin-top', '0')
            .style('font-size', '18px')
            .text(country);

        const statsList = card.append('div')
            .style('color', '#555')
            .style('line-height', '1.8');

        statsList.append('div')
            .html(`<strong>Peak Growth Rate:</strong> ${stats.max.toFixed(2)}% on ${d3.timeFormat('%Y-%m-%d')(stats.maxDate)}`);

        statsList.append('div')
            .html(`<strong>Average Growth Rate:</strong> ${stats.mean.toFixed(2)}%`);

        statsList.append('div')
            .html(`<strong>Median Growth Rate:</strong> ${stats.median.toFixed(2)}%`);

        statsList.append('div')
            .html(`<strong>Periods with >10% growth:</strong> ${stats.over10} days`);

        statsList.append('div')
            .html(`<strong>Periods with >50% growth:</strong> ${stats.over50} days`);
    });
}

function calculateStats(data) {
    const growthRates = data.map(d => d.growth_rate);
    const maxIdx = d3.maxIndex(growthRates);
    
    return {
        max: d3.max(growthRates),
        maxDate: data[maxIdx].date,
        mean: d3.mean(growthRates),
        median: d3.median(growthRates),
        over10: data.filter(d => d.growth_rate > 10).length,
        over50: data.filter(d => d.growth_rate > 50).length
    };
}
