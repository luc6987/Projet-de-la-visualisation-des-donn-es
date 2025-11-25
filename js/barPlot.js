import { CleanVaccin } from './clean.js';

const CONFIG = {
    // Chart dimensions
    dimensions: {
        pyramid: {
            totalWidth: 800,
            height: 700,
            margin: { top: 40, right: 40, bottom: 40, left: 40 },
            centerGap: 50
        }
    },
    // Animation settings
    animation: {
        barDuration: 800,
        barDelay: 15,
        doseTypeDelay: 100,
        axisFadeDelay: 400,
        labelDelay: 500,
        legendDelay: 1000,
        legendItemDelay: 100
    },
    // Visual styling
    styling: {
        barPadding: 0.1,
        strokeWidth: 0.5,
        fontSize: {
            small: '9px',
            normal: '12px',
            medium: '13px',
            large: '14px',
            title: '18px'
        },
        colors: {
            country1: '#3498db',
            country2: '#e74c3c'
        }
    },
    // Legend configuration
    legend: {
        spacing: 100,
        boxSize: 12,
        offsetY: 20,
        textOffset: 6
    },
    // Dose types configuration
    doses: {
        types: ['FirstDose', 'SecondDose', 'DoseAdditional1', 'DoseAdditional2', 'DoseAdditional3'],
        colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'],
        labels: ['First Dose', 'Second Dose', 'Booster 1', 'Booster 2', 'Booster 3']
    },
    // Country name mappings
    countryNames: {
        'FR': 'France', 'DE': 'Germany', 'IT': 'Italy', 'ES': 'Spain',
        'PL': 'Poland', 'RO': 'Romania', 'NL': 'Netherlands', 'BE': 'Belgium',
        'CZ': 'Czech Republic', 'PT': 'Portugal', 'GR': 'Greece', 'HU': 'Hungary',
        'SE': 'Sweden', 'AT': 'Austria', 'BG': 'Bulgaria', 'DK': 'Denmark',
        'FI': 'Finland', 'SK': 'Slovakia', 'IE': 'Ireland', 'HR': 'Croatia',
        'LT': 'Lithuania', 'SI': 'Slovenia', 'LV': 'Latvia', 'EE': 'Estonia',
        'CY': 'Cyprus', 'LU': 'Luxembourg', 'MT': 'Malta', 'IS': 'Iceland',
        'NO': 'Norway', 'LI': 'Liechtenstein'
    }
};
// Destructure frequently used config values for convenience
const { doseTypes, colors, labels } = CONFIG.doses;
const { countryNames } = CONFIG;


/**
 * Aggregate weekly data into monthly totals
 */
function aggregateMonthlyData(countryData, startYear, endYear) {
    const filteredData = countryData.filter(d => {
        if (!d.Date) return false;
        const year = d.Date.getFullYear();
        return year >= startYear && year <= endYear;
    });
    
    if (filteredData.length === 0) return null;
    
    const monthlyData = d3.rollup(
        filteredData,
        v => ({
            FirstDose: d3.sum(v, d => +d.FirstDose || 0),
            SecondDose: d3.sum(v, d => +d.SecondDose || 0),
            DoseAdditional1: d3.sum(v, d => +d.DoseAdditional1 || 0),
            DoseAdditional2: d3.sum(v, d => +d.DoseAdditional2 || 0),
            DoseAdditional3: d3.sum(v, d => +d.DoseAdditional3 || 0)
        }),
        d => d.YearMonth
    );
    
    return Array.from(monthlyData, ([month, doses]) => ({
        month,
        ...doses
    })).sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Get monthly data for a specific country
 */
function getMonthlyData(data, countryCode, startYear, endYear) {
    const countryData = data.filter(d => d.ReportingCountry === countryCode);
    
    if (countryData.length === 0) {
        console.error(`No data found for country code: ${countryCode}`);
        return null;
    }
    
    return aggregateMonthlyData(countryData, startYear, endYear);
}


// ============================================
// MAIN VISUALIZATION FUNCTION
// ============================================

/**
 * Create horizontal pyramid bar charts comparing two countries
 */
function plotPyramidBarCharts(data, countryCode1, countryCode2, startYear = 2020, endYear = 2023) {
    // Get monthly data for both countries
    const monthlyArray1 = getMonthlyData(data, countryCode1, startYear, endYear);
    const monthlyArray2 = getMonthlyData(data, countryCode2, startYear, endYear);
    
    if (!monthlyArray1 || !monthlyArray2) {
        console.error("Cannot create pyramid charts due to missing data");
        return;
    }
    const allMonths = [...new Set([
        ...monthlyArray1.map(d => d.month), 
        ...monthlyArray2.map(d => d.month)
    ])].sort();
    
    const data1Map = new Map(monthlyArray1.map(d => [d.month, d]));
    const data2Map = new Map(monthlyArray2.map(d => [d.month, d]));
    // Clear existing chart
    d3.select("#barPlot").selectAll("*").remove();
    
    const container = document.getElementById('barPlot');
    const containerWidth = container.clientWidth || 800;
    const { dimensions: dim, styling } = CONFIG;
    const { margin, centerGap, totalWidth, height } = dim.pyramid;
    const chartWidth = (Math.min(containerWidth * 0.98, totalWidth) - centerGap) / 2 - margin.left - margin.right + 55;
    
    // Create responsive SVG
    const svg = d3.select("#barPlot")
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${totalWidth} ${height + margin.top + margin.bottom}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("display", "block")
        .style("margin", "0 auto");
    
    // Create scales
    const yScale = d3.scaleBand()
        .domain(allMonths)
        .range([0, height])
        .padding(styling.barPadding);
    
    const maxTotal = Math.max(
        d3.max(monthlyArray1, d => doseTypes.reduce((sum, type) => sum + d[type], 0)),
        d3.max(monthlyArray2, d => doseTypes.reduce((sum, type) => sum + d[type], 0))
    );
    
    const xScaleLeft = d3.scaleLinear().domain([0, maxTotal]).range([chartWidth, 0]);
    const xScaleRight = d3.scaleLinear().domain([0, maxTotal]).range([0, chartWidth]);
    
    // Create both charts
    createHorizontalChart(svg, monthlyArray1, data1Map, allMonths, xScaleLeft, yScale, margin.left, true);
    createHorizontalChart(svg, monthlyArray2, data2Map, allMonths, xScaleRight, yScale, 
        margin.left + chartWidth + centerGap, false);
    
    // Add center Y-axis, labels, and legend
    addCenterAxis(svg, yScale, margin, chartWidth, centerGap, height);
    addCountryLabels(svg, countryCode1, countryCode2, margin, chartWidth, centerGap);
    addLegend(svg, totalWidth, height, margin);
    
    console.log(`✅ Horizontal pyramid bar charts created successfully`);
}
// ============================================
// CHART RENDERING FUNCTIONS
// ============================================

/**
 * Create horizontal stacked bar chart for one country
 */
function createHorizontalChart(svg, monthlyArray, dataMap, allMonths, xScale, yScale, xOffset, isLeft) {
    const { animation, styling } = CONFIG;
    const g = svg.append("g").attr("transform", `translate(${xOffset},${CONFIG.dimensions.pyramid.margin.top})`);
    const completeData = allMonths.map(month => {
        const existing = dataMap.get(month);
        return existing || {
            month,
            FirstDose: 0,
            SecondDose: 0,
            DoseAdditional1: 0,
            DoseAdditional2: 0,
            DoseAdditional3: 0
        };
    });
    // Generate stacked data
    const stack = d3.stack().keys(doseTypes);
    const stackedData = stack(completeData);
    
    // Create bars with animations
    stackedData.forEach((doseData, doseIndex) => {
        g.selectAll(`.bar-${doseIndex}`)
            .data(doseData)
            .enter()
            .append("rect")
            .attr("class", `bar-${doseIndex}`)
            .attr("y", d => yScale(d.data.month))
            .attr("x", xScale(0))
            .attr("width", 0)
            .attr("height", yScale.bandwidth())
            .attr("fill", colors[doseIndex])
            .attr("stroke", "white")
            .attr("stroke-width", styling.strokeWidth)
            .attr("opacity", 0)
            .style("cursor", "pointer")
            .on("mouseover", (event, d) => showTooltip(event, d, doseIndex))
            .on("mousemove", (event) => moveTooltip(event))
            .on("mouseout", () => hideTooltip())
            .transition()
            .duration(animation.barDuration)
            .delay((d, i) => i * animation.barDelay + doseIndex * animation.doseTypeDelay)
            .ease(d3.easeCubicOut)
            .attr("opacity", 1)
            .attr("x", d => isLeft ? xScale(d[1]) : xScale(d[0]))
            .attr("width", d => Math.abs(xScale(d[1]) - xScale(d[0])));
    });
    
    // Add X-axis
    const xAxis = d3.axisBottom(xScale).ticks(5).tickFormat(d => (d / 1e6).toFixed(0) + "M");
    g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${CONFIG.dimensions.pyramid.height})`)
        .style("opacity", 0)
        .call(xAxis)
        .selectAll("text")
        .style("font-size", styling.fontSize.small)
        .attr("opacity", 0);
    
    g.select(".x-axis")
        .transition()
        .duration(600)
        .delay(animation.axisFadeDelay)
        .style("opacity", 1)
        .selectAll("text")
        .attr("opacity", 1);
}

/**
 * Show tooltip on bar hover
 */
function showTooltip(event, d, doseIndex) {
    d3.select(event.target)
        .attr("stroke", "#000")
        .attr("stroke-width", 2)
        .attr("opacity", 1);
    
    const doseValue = d[1] - d[0];
    const doseName = labels[doseIndex];
    const month = d.data.month;
    const monthTotal = doseTypes.reduce((sum, type) => sum + d.data[type], 0);
    const percentage = ((doseValue / monthTotal) * 100).toFixed(1);
    
    d3.select("body")
        .append("div")
        .attr("class", "chart-tooltip")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.9)")
        .style("color", "white")
        .style("padding", "12px 16px")
        .style("border-radius", "6px")
        .style("pointer-events", "none")
        .style("font-size", CONFIG.styling.fontSize.medium)
        .style("box-shadow", "0 4px 6px rgba(0,0,0,0.3)")
        .style("z-index", "1000")
        .style("max-width", "250px")
        .html(`
            <div style="border-bottom: 2px solid ${colors[doseIndex]}; padding-bottom: 8px; margin-bottom: 8px;">
                <strong style="font-size: ${CONFIG.styling.fontSize.large};">${month}</strong>
            </div>
            <div style="margin-bottom: 6px;">
                <span style="color: ${colors[doseIndex]};">●</span> 
                <strong>${doseName}</strong>
            </div>
            <div style="margin-bottom: 4px;">
                Doses: <strong>${doseValue.toLocaleString()}</strong>
            </div>
            <div style="margin-bottom: 4px;">
                ${(doseValue / 1e6).toFixed(2)}M doses
            </div>
            <div style="color: #aaa; font-size: 11px;">
                ${percentage}% of month's total
            </div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #555; font-size: 11px; color: #bbb;">
                Monthly Total: ${monthTotal.toLocaleString()}
            </div>
        `)
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 20) + "px");
}

/**
 * Move tooltip with cursor
 */
function moveTooltip(event) {
    d3.select(".chart-tooltip")
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 20) + "px");
}

/**
 * Hide tooltip
 */
function hideTooltip() {
    d3.select(event.target)
        .attr("stroke", "white")
        .attr("stroke-width", CONFIG.styling.strokeWidth)
        .attr("opacity", 1);
    
    d3.selectAll(".chart-tooltip").remove();
}

/**
 * Add center Y-axis with month labels
 */
function addCenterAxis(svg, yScale, margin, chartWidth, centerGap, height) {
    const { animation, styling } = CONFIG;
    const yAxisG = svg.append("g")
        .attr("transform", `translate(${margin.left + chartWidth + centerGap/2},${margin.top})`)
        .style("opacity", 0);
    
    yAxisG.call(d3.axisLeft(yScale).tickSize(0))
        .selectAll("text")
        .style("text-anchor", "middle")
        .style("font-size", styling.fontSize.small)
        .style("font-weight", "500");
    
    yAxisG.select(".domain").remove();
    
    yAxisG.transition()
        .duration(800)
        .delay(200)
        .style("opacity", 1);
    
    yAxisG.selectAll("text")
        .style("opacity", 0)
        .transition()
        .duration(400)
        .delay((d, i) => 300 + i * 10)
        .style("opacity", 1);
}

/**
 * Add country labels
 */
function addCountryLabels(svg, countryCode1, countryCode2, margin, chartWidth, centerGap) {
    const { animation, styling } = CONFIG;
    const country1Name = countryNames[countryCode1] || countryCode1;
    const country2Name = countryNames[countryCode2] || countryCode2;
    const rightOffset = margin.left + chartWidth + centerGap;
    
    // Left country label
    svg.append("text")
        .attr("x", margin.left + chartWidth / 2 - 100)
        .attr("y", margin.top - 15)
        .attr("text-anchor", "middle")
        .style("font-size", styling.fontSize.large)
        .style("font-weight", "bold")
        .style("fill", styling.colors.country1)
        .style("opacity", 0)
        .text(country1Name)
        .transition()
        .duration(600)
        .delay(animation.labelDelay)
        .ease(d3.easeBackOut)
        .attr("x", margin.left + chartWidth / 2)
        .style("opacity", 1);
    
    // Right country label
    svg.append("text")
        .attr("x", rightOffset + chartWidth / 2 + 100)
        .attr("y", margin.top - 15)
        .attr("text-anchor", "middle")
        .style("font-size", styling.fontSize.large)
        .style("font-weight", "bold")
        .style("fill", styling.colors.country2)
        .style("opacity", 0)
        .text(country2Name)
        .transition()
        .duration(600)
        .delay(animation.labelDelay)
        .ease(d3.easeBackOut)
        .attr("x", rightOffset + chartWidth / 2)
        .style("opacity", 1);
}

/**
 * Add legend at bottom
 */
function addLegend(svg, totalWidth, height, margin) {
    const { legend: legendCfg, animation } = CONFIG;
    const totalLegendWidth = (labels.length - 1) * legendCfg.spacing;
    const legendX = (totalWidth / 2) - (totalLegendWidth / 2);
    const legendY = height + margin.top + legendCfg.offsetY;
    
    const legend = svg.append("g").attr("transform", `translate(${legendX}, ${legendY})`);
    
    labels.forEach((label, i) => {
        const legendItem = legend.append("g")
            .attr("transform", `translate(${i * legendCfg.spacing}, 0)`)
            .style("opacity", 0);
        
        legendItem.append("rect")
            .attr("width", legendCfg.boxSize)
            .attr("height", legendCfg.boxSize)
            .attr("fill", colors[i]);
        
        legendItem.append("text")
            .attr("x", legendCfg.boxSize + legendCfg.textOffset)
            .attr("y", legendCfg.boxSize / 2)
            .attr("dy", "0.35em")
            .style("font-size", CONFIG.styling.fontSize.normal)
            .text(label);
        
        legendItem.transition()
            .duration(400)
            .delay(animation.legendDelay + i * animation.legendItemDelay)
            .ease(d3.easeBounceOut)
            .style("opacity", 1);
    });
}

// ============================================
// INITIALIZATION & EVENT HANDLING
// ============================================

let globalData = null;

/**
 * Update chart when country selection changes
 */
function updateChart() {
    const country1 = document.getElementById('country1Select').value;
    const country2 = document.getElementById('country2Select').value;
    
    if (globalData) {
        console.log(`Updating chart: ${country1} vs ${country2}`);
        plotPyramidBarCharts(globalData, country1, country2, 2020, 2023);
    }
}

/**
 * Initialize visualization (only in standalone mode)
 */
if (!window.__dashboardMode) {
    CleanVaccin().then(data => {
        console.log("Data loaded, creating visualization...");
        globalData = data;
        
        plotPyramidBarCharts(data, 'FR', 'DE', 2020, 2023);
        
        document.getElementById('country1Select').addEventListener('change', updateChart);
        document.getElementById('country2Select').addEventListener('change', updateChart);
        
        console.log("✅ Visualization initialized");
    }).catch(error => {
        console.error("Error loading vaccination data:", error);
    });
}

export { plotPyramidBarCharts };
