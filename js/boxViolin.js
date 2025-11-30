import * as d3 from 'https://cdn.skypack.dev/d3@7';

// ============================================
// CONFIGURATION CONSTANTS
// ============================================

const CONFIG = {
    // Data source
    data: {
        csvPath: 'data/covid.csv',
        topCountriesCount: 10
    },
    
    // Chart dimensions
    dimensions: {
        height: 500,
        margin: { top: 60, right: 150, bottom: 100, left: 80 }
    },
    
    // Visual styling
    styling: {
        violin: {
            fill: '#1abc9c',
            opacity: 0.3,
            stroke: '#16a085',
            strokeWidth: 1.5
        },
        box: {
            fill: '#9b59b6',
            opacity: 0.8,
            stroke: 'darkviolet',
            strokeWidth: 2,
            widthRatio: 0.3
        },
        median: {
            stroke: 'yellow',
            strokeWidth: 3
        },
        whisker: {
            stroke: '#9b59b6',
            strokeWidth: 2
        },
        grid: {
            opacity: 0.3,
            dashArray: '3,3'
        },
        referenceLine: {
            value: 1.0,
            stroke: 'red',
            strokeWidth: 2,
            dashArray: '5,5',
            opacity: 0.7
        }
    },
    
    // Chart parameters
    parameters: {
        bandPadding: 0.3,
        yDomainMin: -0.3,
        yDomainMax: 6,
        bandwidth: 0.15,
        yTickRange: { start: -0.3, end: 6, step: 0.1 }
    },
    
    // Font sizes
    fontSize: {
        small: '10px',
        normal: '11px',
        medium: '12px',
        large: '13px',
        xlarge: '15px'
    },
    
    // European countries list
    countries: [
        'Albania', 'Austria', 'Belarus', 'Belgium', 'Bosnia and Herzegovina',
        'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 'Denmark', 'Estonia',
        'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland',
        'Ireland', 'Italy', 'Latvia', 'Liechtenstein', 'Lithuania',
        'Luxembourg', 'Malta', 'Moldova', 'Montenegro', 'Netherlands',
        'North Macedonia', 'Norway', 'Poland', 'Portugal', 'Romania',
        'Russia', 'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden',
        'Switzerland', 'Ukraine', 'United Kingdom'
    ]
};

// ============================================
// DOM SETUP
// ============================================

const containerElement = document.getElementById('boxViolinPlot') || document.getElementById('boxPlot');
const container = d3.select(containerElement);

// Hide separate violin plot container if it exists
const violinPlot = d3.select('#violinPlot');
if (!violinPlot.empty()) {
    violinPlot.style('display', 'none');
}

let width = container.node().clientWidth;
const { height, margin } = CONFIG.dimensions;

// Create SVG
const svg = container.append('svg')
    .attr('width', '100%')
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('display', 'block');

const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate quartile statistics for box plot
 */
function quartiles(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    const q1 = d3.quantile(sorted, 0.25);
    const median = d3.quantile(sorted, 0.5);
    const q3 = d3.quantile(sorted, 0.75);
    const iqr = q3 - q1;
    const min = Math.max(d3.min(sorted), q1 - 1.5 * iqr);
    const max = Math.min(d3.max(sorted), q3 + 1.5 * iqr);
    return { min, q1, median, q3, max, mean: d3.mean(values) };
}

/**
 * Kernel density estimator for violin plot
 */
function kernelDensityEstimator(kernel, X) {
    return function(V) {
        return X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
    };
}

/**
 * Epanechnikov kernel function
 */
function kernelEpanechnikov(bandwidth) {
    return x => Math.abs(x /= bandwidth) <= 1 ? 0.75 * (1 - x * x) / bandwidth : 0;
}

/**
 * Calculate comprehensive statistics
 */
function calculateStats(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    return {
        mean: d3.mean(values),
        median: d3.quantile(sorted, 0.5),
        stdDev: Math.sqrt(d3.mean(values.map(v => Math.pow(v - d3.mean(values), 2)))),
        min: d3.min(values),
        max: d3.max(values)
    };
}

// ============================================
// DATA PROCESSING
// ============================================

/**
 * Load and process COVID data
 */
d3.csv(CONFIG.data.csvPath, d => ({
    location: d.location,
    date: new Date(d.date),
    weekly_cases: +d.weekly_cases || 0,
    weekly_deaths: +d.weekly_deaths || 0
})).then(data => {
    console.log('Loaded COVID data:', data.length, 'records');
    
    const europeData = data.filter(d => CONFIG.countries.includes(d.location));
    
    const totalCasesByCountry = d3.rollup(
        europeData,
        v => d3.sum(v, d => d.weekly_cases),
        d => d.location
    );
    
    const topCountries = Array.from(totalCasesByCountry, ([country, total]) => ({ country, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, CONFIG.data.topCountriesCount)
        .map(d => d.country);
    
    console.log('Top 10 countries:', topCountries);
    
    const weeklyCFR = calculateWeeklyCFR(europeData, topCountries);
    drawCombinedPlot(weeklyCFR, topCountries);
}).catch(err => {
    console.error('Failed to load COVID data:', err);
});

/**
 * Calculate weekly CFR for each country
 */
function calculateWeeklyCFR(europeData, countries) {
    const weeklyCFR = {};
    
    countries.forEach(country => {
        const countryData = europeData.filter(d => d.location === country);
        const validWeeks = countryData.filter(d => d.weekly_cases > 0 && d.weekly_deaths > 0);
        const cfrValues = validWeeks.map(d => (d.weekly_deaths / d.weekly_cases) * 100);
        weeklyCFR[country] = cfrValues;
    });
    
    return weeklyCFR;
}

// ============================================
// VISUALIZATION FUNCTIONS
// ============================================

/**
 * Main function to draw combined box and violin plot
 */
function drawCombinedPlot(weeklyCFR, countries) {
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    const { cfrDataFiltered, cfrDataForViolin, whiskerRanges } = prepareData(weeklyCFR, countries);
    
    const { xScale, yScale } = createScales(countries, chartWidth, chartHeight);
    
    drawAxes(xScale, yScale, chartWidth, chartHeight);
    drawGrid(yScale, chartWidth);
    drawReferenceLine(yScale, chartWidth);
    
    drawViolinPlots(cfrDataForViolin, countries, xScale, yScale);
    drawBoxPlots(cfrDataFiltered, countries, xScale, yScale, weeklyCFR);
    
    addLabels(chartWidth, chartHeight);
    addLegend(chartWidth);
}

/**
 * Prepare and filter data for visualization
 */
function prepareData(weeklyCFR, countries) {
    const cfrDataFiltered = {};
    const cfrDataForViolin = {};
    const whiskerRanges = {};
    
    countries.forEach(country => {
        const data = weeklyCFR[country];
        const filtered = data.filter(d => d <= 10.0);
        cfrDataFiltered[country] = filtered.length > 0 ? filtered : data;
        
        const stats = quartiles(cfrDataFiltered[country]);
        whiskerRanges[country] = { lower: stats.min, upper: stats.max };
        
        const trimmed = cfrDataFiltered[country].filter(d => d >= stats.min && d <= stats.max);
        cfrDataForViolin[country] = trimmed.length > 0 ? trimmed : cfrDataFiltered[country];
    });
    
    return { cfrDataFiltered, cfrDataForViolin, whiskerRanges };
}

/**
 * Create scales for the chart
 */
function createScales(countries, chartWidth, chartHeight) {
    const { parameters } = CONFIG;
    
    const xScale = d3.scaleBand()
        .domain(countries)
        .range([0, chartWidth])
        .padding(parameters.bandPadding);
    
    const yScale = d3.scaleLinear()
        .domain([parameters.yDomainMin, parameters.yDomainMax])
        .range([chartHeight, 0])
        .nice();
    
    return { xScale, yScale };
}

/**
 * Draw axes
 */
function drawAxes(xScale, yScale, chartWidth, chartHeight) {
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale)
        .ticks(8)
        .tickFormat(d => d.toFixed(1) + '%');
    
    g.append('g')
        .attr('transform', `translate(0,${chartHeight})`)
        .call(xAxis)
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .style('font-size', CONFIG.fontSize.normal);
    
    g.append('g')
        .call(yAxis)
        .style('font-size', CONFIG.fontSize.normal);
}

/**
 * Draw background grid
 */
function drawGrid(yScale, chartWidth) {
    const { grid } = CONFIG.styling;
    
    g.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(yScale)
            .tickSize(-chartWidth)
            .tickFormat(''))
        .style('stroke-dasharray', grid.dashArray)
        .style('opacity', grid.opacity);
}

/**
 * Draw reference line
 */
function drawReferenceLine(yScale, chartWidth) {
    const { referenceLine } = CONFIG.styling;
    
    g.append('line')
        .attr('x1', 0)
        .attr('x2', chartWidth)
        .attr('y1', yScale(referenceLine.value))
        .attr('y2', yScale(referenceLine.value))
        .attr('stroke', referenceLine.stroke)
        .attr('stroke-width', referenceLine.strokeWidth)
        .attr('stroke-dasharray', referenceLine.dashArray)
        .attr('opacity', referenceLine.opacity);
}

/**
 * Draw violin plots
 */
function drawViolinPlots(cfrDataForViolin, countries, xScale, yScale) {
    const { violin } = CONFIG.styling;
    const { parameters } = CONFIG;
    
    countries.forEach(country => {
        const values = cfrDataForViolin[country];
        const x = xScale(country);
        const violinWidth = xScale.bandwidth();
        
        const yTicks = d3.range(
            parameters.yTickRange.start,
            parameters.yTickRange.end,
            parameters.yTickRange.step
        );
        const kde = kernelDensityEstimator(kernelEpanechnikov(parameters.bandwidth), yTicks);
        const density = kde(values);
        
        const maxDensity = d3.max(density, d => d[1]);
        const xNum = d3.scaleLinear()
            .domain([0, maxDensity])
            .range([0, violinWidth / 2]);
        
        const area = d3.area()
            .x0(d => x + violinWidth / 2 - xNum(d[1]))
            .x1(d => x + violinWidth / 2 + xNum(d[1]))
            .y(d => yScale(d[0]))
            .curve(d3.curveCatmullRom);
        
        g.append('path')
            .datum(density)
            .attr('d', area)
            .attr('fill', violin.fill)
            .attr('opacity', violin.opacity)
            .attr('stroke', violin.stroke)
            .attr('stroke-width', violin.strokeWidth);
    });
}

/**
 * Draw box plots
 */
function drawBoxPlots(cfrDataFiltered, countries, xScale, yScale, weeklyCFR) {
    const { box, whisker, median } = CONFIG.styling;
    
    countries.forEach(country => {
        const values = cfrDataFiltered[country];
        const stats = quartiles(values);
        const x = xScale(country);
        const boxWidth = xScale.bandwidth() * box.widthRatio;
        const boxX = x + (xScale.bandwidth() - boxWidth) / 2;
        
        // Vertical line (min to max)
        g.append('line')
            .attr('x1', x + xScale.bandwidth() / 2)
            .attr('x2', x + xScale.bandwidth() / 2)
            .attr('y1', yScale(stats.min))
            .attr('y2', yScale(stats.max))
            .attr('stroke', whisker.stroke)
            .attr('stroke-width', whisker.strokeWidth);
        
        // Whiskers
        drawWhisker(boxX, boxWidth, yScale(stats.min));
        drawWhisker(boxX, boxWidth, yScale(stats.max));
        
        // Box (Q1 to Q3)
        g.append('rect')
            .attr('x', boxX)
            .attr('y', yScale(stats.q3))
            .attr('width', boxWidth)
            .attr('height', yScale(stats.q1) - yScale(stats.q3))
            .attr('fill', box.fill)
            .attr('opacity', box.opacity)
            .attr('stroke', box.stroke)
            .attr('stroke-width', box.strokeWidth)
            .style('cursor', 'pointer')
            .on('mouseover', function(event) {
                d3.select(this).attr('opacity', 1);
                showTooltip(event, country, stats, values.length, weeklyCFR[country]);
            })
            .on('mouseout', function() {
                d3.select(this).attr('opacity', box.opacity);
                hideTooltip();
            });
        
        // Median line
        g.append('line')
            .attr('x1', boxX)
            .attr('x2', boxX + boxWidth)
            .attr('y1', yScale(stats.median))
            .attr('y2', yScale(stats.median))
            .attr('stroke', median.stroke)
            .attr('stroke-width', median.strokeWidth);
    });
}

/**
 * Draw whisker line
 */
function drawWhisker(boxX, boxWidth, y) {
    const { whisker } = CONFIG.styling;
    
    g.append('line')
        .attr('x1', boxX + boxWidth * 0.25)
        .attr('x2', boxX + boxWidth * 0.75)
        .attr('y1', y)
        .attr('y2', y)
        .attr('stroke', whisker.stroke)
        .attr('stroke-width', whisker.strokeWidth);
}

/**
 * Add chart labels
 */
function addLabels(chartWidth, chartHeight) {
    // Title
    g.append('text')
        .attr('x', chartWidth / 2)
        .attr('y', -35)
        .attr('text-anchor', 'middle')
        .style('font-size', CONFIG.fontSize.large)
        .style('font-weight', 'bold')
        .text('Weekly Case Fatality Rate Distribution - Top 10 European Countries');
    
    g.append('text')
        .attr('x', chartWidth / 2)
        .attr('y', -15)
        .attr('text-anchor', 'middle')
        .style('font-size', CONFIG.fontSize.normal)
        .text('(Box Plot + Violin Plot: Deaths/Cases × 100, Y-axis limited to 6% for clarity)');
    
    // Y-axis label
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -chartHeight / 2)
        .attr('y', -55)
        .attr('text-anchor', 'middle')
        .style('font-size', CONFIG.fontSize.medium)
        .style('font-weight', 'bold')
        .text('Case Fatality Rate (%)');
    
    // X-axis label
    g.append('text')
        .attr('x', chartWidth / 2)
        .attr('y', chartHeight + 85)
        .attr('text-anchor', 'middle')
        .style('font-size', CONFIG.fontSize.medium)
        .style('font-weight', 'bold')
        .text('Country');
}

/**
 * Add legend
 */
function addLegend(chartWidth) {
    const { violin, box, referenceLine } = CONFIG.styling;
    
    const legend = g.append('g')
        .attr('transform', `translate(${chartWidth + 10}, 0)`);
    
    const legendItems = [
        { 
            label: 'Violin (Density Distribution)', 
            fill: violin.fill, 
            opacity: violin.opacity, 
            stroke: violin.stroke, 
            strokeWidth: violin.strokeWidth 
        },
        { 
            label: 'Box (Quartiles)', 
            fill: box.fill, 
            opacity: box.opacity, 
            stroke: box.stroke, 
            strokeWidth: box.strokeWidth 
        },
        { 
            label: '1% CFR Reference', 
            stroke: referenceLine.stroke, 
            strokeWidth: referenceLine.strokeWidth, 
            dashed: true 
        }
    ];
    
    legendItems.forEach((item, i) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 25})`);
        
        if (item.dashed) {
            legendRow.append('line')
                .attr('x1', 0)
                .attr('x2', 20)
                .attr('y1', 8)
                .attr('y2', 8)
                .attr('stroke', item.stroke)
                .attr('stroke-width', item.strokeWidth)
                .attr('stroke-dasharray', '5,5')
                .attr('opacity', 0.7);
        } else {
            legendRow.append('rect')
                .attr('width', 20)
                .attr('height', 15)
                .attr('fill', item.fill)
                .attr('opacity', item.opacity)
                .attr('stroke', item.stroke)
                .attr('stroke-width', item.strokeWidth);
        }
        
        legendRow.append('text')
            .attr('x', 28)
            .attr('y', 12)
            .style('font-size', CONFIG.fontSize.small)
            .text(item.label);
    });
}

// ============================================
// TOOLTIP FUNCTIONS
// ============================================

/**
 * Show tooltip with statistics
 */
function showTooltip(event, country, stats, filteredCount, allValues) {
    const tooltip = d3.select('#tooltip');
    
    const allStats = calculateStats(allValues);
    
    tooltip.style('display', 'block')
        .style('left', (event.pageX + 12) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .html(`
            <div style="border-bottom: 2px solid #1abc9c; padding-bottom: 6px; margin-bottom: 6px;">
                <strong style="font-size: ${CONFIG.fontSize.medium}; color: #1abc9c;">${country}</strong>
            </div>
            <div style="margin-bottom: 4px; color: #ecf0f1;">
                <span style="color: #95a5a6;">Mean CFR:</span> <strong>${allStats.mean.toFixed(3)}%</strong>
            </div>
            <div style="margin-bottom: 4px; color: #ecf0f1;">
                <span style="color: #95a5a6;">Median CFR:</span> <strong style="color: #f39c12;">${allStats.median.toFixed(3)}%</strong>
            </div>
            <div style="margin-bottom: 4px; color: #ecf0f1;">
                <span style="color: #95a5a6;">Std Dev:</span> <strong>${allStats.stdDev.toFixed(3)}%</strong>
            </div>
            <div style="margin-bottom: 4px; color: #ecf0f1;">
                <span style="color: #95a5a6;">Q1 - Q3:</span> <strong>${stats.q1.toFixed(3)}% - ${stats.q3.toFixed(3)}%</strong>
            </div>
            <div style="margin-bottom: 4px; color: #ecf0f1;">
                <span style="color: #95a5a6;">Min - Max:</span> <strong>${allStats.min.toFixed(3)}% - ${allStats.max.toFixed(3)}%</strong>
            </div>
            <div style="margin-bottom: 4px; color: #ecf0f1;">
                <span style="color: #95a5a6;">Data Points:</span> <strong>${allValues.length.toLocaleString()}</strong>
            </div>
        `);
}

/**
 * Hide tooltip
 */
function hideTooltip() {
    d3.select('#tooltip').style('display', 'none');
}


// ============================================
// EVENT HANDLERS
// ============================================

/**
 * Handle window resize with debouncing
 */
let resizeTimer;
window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        const { dimensions } = CONFIG;
        width = container.node().clientWidth;
        svg.attr('viewBox', `0 0 ${width} ${dimensions.height}`);
        g.selectAll('*').remove();
        location.reload();
    }, 250);
});
