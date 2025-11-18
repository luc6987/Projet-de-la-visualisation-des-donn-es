
import { CleanVaccin } from './clean.js';

console.log("✅ barPlot.js loaded successfully! HokHok (v2.0 - fixed duplicate export)");


const countryNames = {
    'FR': 'France', 'DE': 'Germany', 'IT': 'Italy', 'ES': 'Spain',
    'PL': 'Poland', 'RO': 'Romania', 'NL': 'Netherlands', 'BE': 'Belgium',
    'CZ': 'Czech Republic', 'PT': 'Portugal', 'GR': 'Greece', 'HU': 'Hungary',
    'SE': 'Sweden', 'AT': 'Austria', 'BG': 'Bulgaria', 'DK': 'Denmark',
    'FI': 'Finland', 'SK': 'Slovakia', 'IE': 'Ireland', 'HR': 'Croatia',
    'LT': 'Lithuania', 'SI': 'Slovenia', 'LV': 'Latvia', 'EE': 'Estonia',
    'CY': 'Cyprus', 'LU': 'Luxembourg', 'MT': 'Malta', 'IS': 'Iceland',
    'NO': 'Norway', 'LI': 'Liechtenstein'
};


function plotVaccineDosesByCountry(data, countryCode, startYear = 2020, endYear = 2023) {
    console.log(`📊 Creating bar chart for ${countryCode} (${startYear}-${endYear})`);
    
    // Filter data for the specified country
    const countryData = data.filter(d => d.ReportingCountry === countryCode);
    
    if (countryData.length === 0) {
        console.error(`No data found for country code: ${countryCode}`);
        return;
    }
    
    // Filter for year range and aggregate by YearMonth
    const filteredData = countryData.filter(d => {
        if (!d.Date) return false;
        const year = d.Date.getFullYear();
        return year >= startYear && year <= endYear;
    });
    
    if (filteredData.length === 0) {
        console.error(`No data found for ${countryCode} between ${startYear} and ${endYear}`);
        return;
    }
    
    // Group by YearMonth and sum doses
    const monthlyData = d3.rollup(
        filteredData,
        v => ({
            FirstDose: d3.sum(v, d => +d.FirstDose || 0),
            SecondDose: d3.sum(v, d => +d.SecondDose || 0),
            DoseAdditional1: d3.sum(v, d => +d.DoseAdditional1 || 0),
            DoseAdditional2: d3.sum(v, d => +d.DoseAdditional2 || 0),
            DoseAdditional3: d3.sum(v, d => +d.DoseAdditional3 || 0)
        }),
        d => d.YearMonth  // Group by YearMonth (YYYY-MM format)
    );

    // Convert Map to array and sort chronologically by month
    const monthlyArray = Array.from(monthlyData, ([month, doses]) => ({
        month,
        ...doses
    })).sort((a, b) => a.month.localeCompare(b.month));
    
    console.log(`Processed ${monthlyArray.length} months of data`);
    
    // Clear any existing chart to prevent duplicates
    d3.select("#barPlot").selectAll("*").remove();
    
    // Set up chart dimensions with margins for axes and labels
    const margin = { top: 60, right: 150, bottom: 80, left: 80 };
    const width = 1000 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;
    
    // Create SVG container and position the main group with margins
    const svg = d3.select("#barPlot")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Define dose types, their colors, and display labels
    const doseTypes = ['FirstDose', 'SecondDose', 'DoseAdditional1', 'DoseAdditional2', 'DoseAdditional3'];
    const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'];  // Distinct colors for each dose
    const labels = ['First Dose', 'Second Dose', 'Booster 1', 'Booster 2', 'Booster 3'];
    
    // X-scale: maps months to horizontal positions with padding between bars
    const x = d3.scaleBand()
        .domain(monthlyArray.map(d => d.month))
        .range([0, width])
        .padding(0.2);  // 20% padding between bars
    
    // Calculate maximum total doses across all months for Y-scale
    const maxTotal = d3.max(monthlyArray, d => 
        doseTypes.reduce((sum, type) => sum + d[type], 0)
    );
    
    // Y-scale: maps dose counts to vertical positions
    const y = d3.scaleLinear()
        .domain([0, maxTotal])
        .nice()
        .range([height, 0]);
    
    // Create stacked data
    const stack = d3.stack()
        .keys(doseTypes);
    
    const stackedData = stack(monthlyArray);
    
    // Add bars (stacked)
    const barGroups = svg.selectAll(".bar-group")
        .data(stackedData)
        .enter()
        .append("g")
        .attr("class", "bar-group")
        .attr("fill", (d, i) => colors[i]);
    
    barGroups.selectAll("rect")
        .data(d => d)
        .enter()
        .append("rect")
        .attr("x", d => x(d.data.month))
        .attr("y", d => y(d[1]))
        .attr("height", d => y(d[0]) - y(d[1]))
        .attr("width", x.bandwidth())
        .attr("stroke", "white")
        .attr("stroke-width", 0.5)
        .on("mouseover", function(event, d) {
            const doseType = d3.select(this.parentNode).datum().key;
            const value = d.data[doseType];
            
            d3.select(this)
                .attr("opacity", 0.7);
            
            // Show tooltip
            const tooltip = d3.select("body")
                .append("div")
                .attr("class", "tooltip")
                .style("position", "absolute")
                .style("background", "rgba(0,0,0,0.8)")
                .style("color", "white")
                .style("padding", "10px")
                .style("border-radius", "5px")
                .style("pointer-events", "none")
                .style("font-size", "12px")
                .html(`
                    <strong>${d.data.month}</strong><br>
                    ${labels[doseTypes.indexOf(doseType)]}: ${value.toLocaleString()}
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("opacity", 1);
            d3.selectAll(".tooltip").remove();
        });
    
    // Add X axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)")
        .style("font-size", "11px");
    
    // Add Y axis
    svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d => d.toLocaleString()))
        .selectAll("text")
        .style("font-size", "11px");
    
    // Add X axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text("Month");
         
    // Add Y axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 20)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text("Total Vaccine Doses Administered");
    
    // Add title
    const countryName = countryNames[countryCode] || countryCode;
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(`Vaccine Doses Administered in ${countryName} by Dose Type (${startYear}-${endYear})`);
    
    // Add legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width + 20}, 0)`);
    
    labels.forEach((label, i) => {
        const legendRow = legend.append("g")
            .attr("transform", `translate(0, ${i * 25})`);
        
        legendRow.append("rect")
            .attr("width", 18)
            .attr("height", 18)
            .attr("fill", colors[i])
            .attr("stroke", "white")
            .attr("stroke-width", 0.5);
        
        legendRow.append("text")
            .attr("x", 25)
            .attr("y", 9)
            .attr("dy", "0.35em")
            .style("font-size", "11px")
            .text(label);
    });
    
    // Print summary statistics
    const totalDoses = monthlyArray.reduce((sum, month) => 
        sum + doseTypes.reduce((doseSum, type) => doseSum + month[type], 0), 0
    );
    
    console.log(`\nSummary for ${countryCode}:`);
    console.log(`Total doses administered: ${totalDoses.toLocaleString()}`);
    console.log(`Period: ${monthlyArray[0].month} to ${monthlyArray[monthlyArray.length - 1].month}`);
}

// Load data and create visualization

function plotPyramidBarCharts(data, countryCode1, countryCode2, startYear = 2020, endYear = 2023) {
    console.log(`🏔️ Creating pyramid bar charts: ${countryCode1} vs ${countryCode2}`);
    
    // Helper function: Extract and aggregate monthly data for a specific country
    function getMonthlyData(countryCode) {
        // Filter all data for this country
        const countryData = data.filter(d => d.ReportingCountry === countryCode);
        if (countryData.length === 0) {
            console.error(`No data found for country code: ${countryCode}`);
            return null;
        }
        // Filter by year range
        const filteredData = countryData.filter(d => {
            if (!d.Date) return false;
            const year = d.Date.getFullYear();
            return year >= startYear && year <= endYear;
        });
        
        if (filteredData.length === 0) {
            console.error(`No data found for ${countryCode} between ${startYear} and ${endYear}`);
            return null;
        }
        
        // Aggregate weekly data into monthly totals using d3.rollup
        const monthlyData = d3.rollup(
            filteredData,
            v => ({
                FirstDose: d3.sum(v, d => +d.FirstDose || 0),
                SecondDose: d3.sum(v, d => +d.SecondDose || 0),
                DoseAdditional1: d3.sum(v, d => +d.DoseAdditional1 || 0),
                DoseAdditional2: d3.sum(v, d => +d.DoseAdditional2 || 0),
                DoseAdditional3: d3.sum(v, d => +d.DoseAdditional3 || 0)
            }),
            d => d.YearMonth  // Group by month
        );
        
        // Convert Map to sorted array
        return Array.from(monthlyData, ([month, doses]) => ({
            month,
            ...doses
        })).sort((a, b) => a.month.localeCompare(b.month));
    }
    
    // Get monthly data for both countries
    const monthlyArray1 = getMonthlyData(countryCode1);
    const monthlyArray2 = getMonthlyData(countryCode2);
    
    if (!monthlyArray1 || !monthlyArray2) {
        console.error("Cannot create pyramid charts due to missing data");
        return;
    }
    
    // Get all unique months from both datasets (union)
    // This ensures both charts have the same Y-axis even if one country has gaps
    const allMonths = [...new Set([...monthlyArray1.map(d => d.month), ...monthlyArray2.map(d => d.month)])].sort();
    
    // Create lookup maps for O(1) access to dose data by month
    const data1Map = new Map(monthlyArray1.map(d => [d.month, d]));
    const data2Map = new Map(monthlyArray2.map(d => [d.month, d]));
    
    // Clear any existing chart
    d3.select("#barPlot").selectAll("*").remove();
    
    // Get container dimensions for responsive sizing
    const container = document.getElementById('barPlot');
    const containerWidth = container.clientWidth || 800;
    const containerHeight = container.clientHeight || 500;
    
    // Define chart dimensions based on container size with tighter margins
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const totalWidth = Math.min(containerWidth * 0.98, 800);  // Use 98% of container width
    const height = 700;
    const centerGap = 50;  // Reduced space in middle for Y-axis labels
    const chartWidth = (totalWidth - centerGap) / 2 - margin.left - margin.right+55;
    
    // Create responsive SVG container with viewBox for scaling
    const svg = d3.select("#barPlot")
        .append("svg")
        .attr("width", "100%")  // Responsive width
        .attr("height", "100%")  // Responsive height
        .attr("viewBox", `0 0 ${totalWidth} ${height + margin.top + margin.bottom}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("display", "block")
        .style("margin", "0 auto");
    
    // Define dose types, colors, and labels for stacked bars
    const doseTypes = ['FirstDose', 'SecondDose', 'DoseAdditional1', 'DoseAdditional2', 'DoseAdditional3'];
    const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'];
    const labels = ['First Dose', 'Second Dose', 'Booster 1', 'Booster 2', 'Booster 3'];
    
    // Y-scale: shared between both charts, maps months to vertical positions
    const yScale = d3.scaleBand()
        .domain(allMonths)
        .range([0, height])
        .padding(0.1);  // Spacing between month bars (0.0 = no gap, 1.0 = max gap)
    
    // Find maximum total doses to scale both charts equally
    const maxTotal1 = d3.max(monthlyArray1, d => doseTypes.reduce((sum, type) => sum + d[type], 0));
    const maxTotal2 = d3.max(monthlyArray2, d => doseTypes.reduce((sum, type) => sum + d[type], 0));
    const maxTotal = Math.max(maxTotal1, maxTotal2);  // Use same scale for fair comparison
    
    // X-scales: left side reversed (grows leftward), right side normal (grows rightward)
    const xScaleLeft = d3.scaleLinear()
        .domain([0, maxTotal])
        .range([chartWidth, 0]);  // Reversed: high values on left
    
    const xScaleRight = d3.scaleLinear()
        .domain([0, maxTotal])
        .range([0, chartWidth]);  // Normal: high values on right
    
    // Stack generator: transforms data for stacked bar layout
    const stack = d3.stack().keys(doseTypes);
    
    function createHorizontalChart(monthlyArray, dataMap, xScale, xOffset, isLeft) {
        const g = svg.append("g")
            .attr("transform", `translate(${xOffset},${margin.top})`);
        
        // Prepare complete dataset: fill missing months with zeros for consistent alignment
        const completeData = allMonths.map(month => {
            const existing = dataMap.get(month);
            if (existing) return existing;
            // Fill missing months with zero values
            return {
                month,
                FirstDose: 0,
                SecondDose: 0,
                DoseAdditional1: 0,
                DoseAdditional2: 0,
                DoseAdditional3: 0
            };
        });
        
        // Generate stacked data: each layer contains cumulative start/end positions
        const stackedData = stack(completeData);
        
        // Create stacked bars for each dose type with animated transitions
        stackedData.forEach((doseData, doseIndex) => {
            g.selectAll(`.bar-${doseIndex}`)
                .data(doseData)
                .enter()
                .append("rect")
                .attr("class", `bar-${doseIndex}`)
                .attr("y", d => yScale(d.data.month))
                .attr("x", d => isLeft ? xScale(0) : xScale(0))  // Start from center
                .attr("width", 0)  // Start with zero width for animation
                .attr("height", yScale.bandwidth())
                .attr("fill", colors[doseIndex])
                .attr("stroke", "white")
                .attr("stroke-width", 0.5)
                .attr("opacity", 0)  // Start invisible
                .style("cursor", "pointer")
                // Tooltip on hover: show detailed dose information
                .on("mouseover", function(event, d) {
                    // Highlight hovered bar
                    d3.select(this)
                        .attr("stroke", "#000")
                        .attr("stroke-width", 2)
                        .attr("opacity", 1);
                    
                    // Calculate values for this dose segment
                    const doseValue = d[1] - d[0];  // d[1] is end, d[0] is start of stack
                    const doseName = labels[doseIndex];
                    const month = d.data.month;
                    
                    // Calculate monthly total and percentage
                    const monthTotal = doseTypes.reduce((sum, type) => sum + d.data[type], 0);
                    const percentage = ((doseValue / monthTotal) * 100).toFixed(1);
                    
                    // Create and position tooltip
                    const tooltip = d3.select("body")
                        .append("div")
                        .attr("class", "chart-tooltip")
                        .style("position", "absolute")
                        .style("background", "rgba(0, 0, 0, 0.9)")
                        .style("color", "white")
                        .style("padding", "12px 16px")
                        .style("border-radius", "6px")
                        .style("pointer-events", "none")
                        .style("font-size", "13px")
                        .style("box-shadow", "0 4px 6px rgba(0,0,0,0.3)")
                        .style("z-index", "1000")
                        .style("max-width", "250px")
                        .html(`
                            <div style="border-bottom: 2px solid ${colors[doseIndex]}; padding-bottom: 8px; margin-bottom: 8px;">
                                <strong style="font-size: 14px;">${month}</strong>
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
                })
                .on("mousemove", function(event) {
                    // Update tooltip position as cursor moves
                    d3.select(".chart-tooltip")
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 20) + "px");
                })
                .on("mouseout", function() {
                    // Remove highlight and tooltip when cursor leaves
                    d3.select(this)
                        .attr("stroke", "white")
                        .attr("stroke-width", 0.5)
                        .attr("opacity", 1);
                    
                    d3.selectAll(".chart-tooltip").remove();
                })
                // Animate bars growing from center with staggered timing
                .transition()
                .duration(800)  // Animation duration
                .delay((d, i) => i * 15 + doseIndex * 100)  // Stagger: each month delays 15ms, each dose type 100ms
                .ease(d3.easeCubicOut)  // Smooth easing function
                .attr("opacity", 1)  // Fade in
                .attr("x", d => isLeft ? xScale(d[1]) : xScale(d[0]))  // Final position
                .attr("width", d => Math.abs(xScale(d[1]) - xScale(d[0])));  // Final width
        });
        
        // Add X-axis at bottom showing dose scale in millions
        const xAxis = isLeft ? 
            d3.axisBottom(xScale).ticks(5).tickFormat(d => (d / 1e6).toFixed(0) + "M") :
            d3.axisBottom(xScale).ticks(5).tickFormat(d => (d / 1e6).toFixed(0) + "M");
        
        g.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${height})`)
            .style("opacity", 0)  // Start invisible
            .call(xAxis)
            .selectAll("text")
            .style("font-size", "10px")
            .attr("opacity", 0);
        
        // Fade in X-axis with delay
        g.select(".x-axis")
            .transition()
            .duration(600)
            .delay(400)
            .style("opacity", 1)
            .selectAll("text")
            .attr("opacity", 1);
    }
    
    // Create left chart (country 1) - bars grow leftward from center
    createHorizontalChart(monthlyArray1, data1Map, xScaleLeft, margin.left, true);
    
    // Create right chart (country 2) - bars grow rightward from center
    const rightOffset = margin.left + chartWidth + centerGap;
    createHorizontalChart(monthlyArray2, data2Map, xScaleRight, rightOffset, false);
    
    // Add shared Y-axis (months) in the center between both charts
    const yAxisG = svg.append("g")
        .attr("transform", `translate(${margin.left + chartWidth + centerGap/2},${margin.top})`)
        .style("opacity", 0);  // Start invisible for animation
    
    yAxisG.call(d3.axisLeft(yScale).tickSize(0))  // No tick lines
        .selectAll("text")
        .style("text-anchor", "middle")  // Center-align month labels
        .style("font-size", "9px")
        .style("font-weight", "500");
    
    // Remove the Y-axis domain line (keep only labels)
    yAxisG.select(".domain").remove();
    
    // Fade in Y-axis with staggered tick labels for cascade effect
    yAxisG.transition()
        .duration(800)
        .delay(200)
        .style("opacity", 1);
    
    yAxisG.selectAll("text")
        .style("opacity", 0)
        .transition()
        .duration(400)
        .delay((d, i) => 300 + i * 10)  // Each label delays 10ms more than previous
        .style("opacity", 1);
    
    // Add country names with slide-in animation from sides
    const country1Name = countryNames[countryCode1] || countryCode1;
    const country2Name = countryNames[countryCode2] || countryCode2;
    
    // Left country label: slides in from left
    svg.append("text")
        .attr("class", "country-label-left")
        .attr("x", margin.left + chartWidth / 2 - 100)  
        .attr("y", margin.top - 15)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("fill", "#3498db")
        .style("opacity", 0)
        .text(country1Name)
        .transition()
        .duration(600)
        .delay(500)
        .ease(d3.easeBackOut)  // Bouncy easing for playful effect
        .attr("x", margin.left + chartWidth / 2)  // Slide to center position
        .style("opacity", 1);
    
    // Right country label: slides in from right
    svg.append("text")
        .attr("class", "country-label-right")
        .attr("x", rightOffset + chartWidth / 2 + 100)  // Start off to right
        .attr("y", margin.top - 15)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("fill", "#e74c3c")
        .style("opacity", 0)
        .text(country2Name)
        .transition()
        .duration(600)
        .delay(500)
        .ease(d3.easeBackOut)
        .attr("x", rightOffset + chartWidth / 2) 
        .style("opacity", 1);
    
    // Add main title centered at top with fade-in animation
    svg.append("text")
        .attr("class", "main-title")
        .attr("x", totalWidth / 2)  
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .style("opacity", 0)
        .transition()
        .duration(800)
        .delay(800)  
        .style("opacity", 1);
    
    // Add shared legend at bottom with staggered bounce animation
    // === ADJUST THESE ===
    const legendSpacing = 100;  // space between legend items
    const boxSize = 12;          // size of colored squares
    const legendOffsetY = 20;    // vertical distance below chart
    const textOffset = 6;        // space between square and label text
   

    // Compute how wide the whole legend is
    const totalLegendWidth = (labels.length - 1) * legendSpacing;

    // Center legend horizontally
    const legendX = (totalWidth / 2) - (totalLegendWidth / 2);
    const legendY = height + margin.top + legendOffsetY;

    // Create centered legend group
    const legend = svg.append("g")
        .attr("transform", `translate(${legendX}, ${legendY})`);

    // Create each legend item
    labels.forEach((label, i) => {
        const legendItem = legend.append("g")
            .attr("transform", `translate(${i * legendSpacing}, 0)`)
            .style("opacity", 0);

        // Color square
        legendItem.append("rect")
            .attr("width", boxSize)
            .attr("height", boxSize)
            .attr("fill", colors[i]);

        // Label text
        legendItem.append("text")
            .attr("x", boxSize + textOffset)
            .attr("y", boxSize / 2)
            .attr("dy", "0.35em")
            .style("font-size", "12px")
            .text(label);
        
        // Bounce in each legend item sequentially
        legendItem.transition()
            .duration(400)
            .delay(1000 + i * 100)  // Each item 100ms after previous
            .ease(d3.easeBounceOut)
            .style("opacity", 1);
    });
    
    console.log(`✅ Horizontal pyramid bar charts created successfully okay`);
}

// ============================================
// MAIN EXECUTION & EVENT HANDLING
// ============================================

// Global variable to store loaded vaccination data for reuse
let globalData = null;

function updateChart() {
    const country1 = document.getElementById('country1Select').value;
    const country2 = document.getElementById('country2Select').value;
    
    if (globalData) {
        console.log(`Updating chart: ${country1} vs ${country2}`);
        plotPyramidBarCharts(globalData, country1, country2, 2020, 2023);
    }
}

// Load data from CSV and initialize visualization
CleanVaccin().then(data => {
    console.log("Hello hok");
    console.log("Data loaded, creating visualization...");
    console.log("Hello World");
    globalData = data;  
    
    // Create initial chart with France vs Germany
    plotPyramidBarCharts(data, 'FR', 'DE', 2020, 2023);
    
    // Attach event listeners to dropdown menus for interactive updates
    document.getElementById('country1Select').addEventListener('change', updateChart);
    document.getElementById('country2Select').addEventListener('change', updateChart);
    
    console.log("✅ Dropdowns initialized and ready!");
}).catch(error => {
    // Handle data loading errors
    console.error("Error loading vaccination data:", error);
});

// Export functions for external use
export { plotVaccineDosesByCountry, plotPyramidBarCharts };
