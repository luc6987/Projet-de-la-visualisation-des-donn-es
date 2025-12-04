
// Import data cleaning function that loads and processes vaccination data
import { CleanVaccin } from './clean.js';

console.log("✅ tsPlot.js loaded successfully!");

// Country code to full name mapping for display purposes
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

// Dose type labels for display
const doseLabels = {
    'FirstDose': 'First Dose',
    'SecondDose': 'Primary Course (2 doses)',
    'DoseAdditional1': 'First Booster',
    'DoseAdditional2': 'Second Booster',
    'DoseAdditional3': 'Third Booster',
    'DoseAdditional4': 'Fourth Booster',
    'DoseAdditional5': 'Fifth Booster'
};

// Color palette for countries (vibrant space theme)
const countryColors = [
    '#00d4ff', '#ff00ff', '#00ff88', '#ff6b35', '#a855f7',
    '#fbbf24', '#f472b6', '#22d3ee', '#a3e635', '#fb923c',
    '#818cf8', '#4ade80', '#facc15', '#f87171', '#c084fc'
];


function processCountryData(data, countryCode) {
    // Filter for the specified country, ALL target group, and NATIONAL total
    const countryData = data.filter(d => 
        d.ReportingCountry === countryCode &&
        d.TargetGroup === "ALL" &&
        d.Region === countryCode
    );
    if (countryData.length === 0) {
        console.warn(`No data found for country code: ${countryCode}`);
        return null;
    }
    // Sort by date
    const sortedData = countryData.sort((a, b) => a.Date - b.Date);
    // Aggregate by YearWeekISO (sum across vaccine types)
    const weeklyData = d3.rollup(
        sortedData,
        v => ({
            FirstDose: d3.sum(v, d => +d.FirstDose || 0),
            SecondDose: d3.sum(v, d => +d.SecondDose || 0),
            DoseAdditional1: d3.sum(v, d => +d.DoseAdditional1 || 0),
            DoseAdditional2: d3.sum(v, d => +d.DoseAdditional2 || 0),
            DoseAdditional3: d3.sum(v, d => +d.DoseAdditional3 || 0),
            DoseAdditional4: d3.sum(v, d => +d.DoseAdditional4 || 0),
            DoseAdditional5: d3.sum(v, d => +d.DoseAdditional5 || 0),
            Population: d3.max(v, d => +d.Population || 0),  // Take max population
            Date: v[0].Date  // Use first date for the week
        }),
        d => d.YearWeekISO
    );
    // Convert to array and sort by date
    const weeklyArray = Array.from(weeklyData.values())
        .sort((a, b) => a.Date - b.Date);
    // Calculate cumulative doses and uptake percentages
    const doseTypes = ['FirstDose', 'SecondDose', 'DoseAdditional1', 'DoseAdditional2', 'DoseAdditional3', 'DoseAdditional4', 'DoseAdditional5'];
    
    let cumulatives = {};
    doseTypes.forEach(type => cumulatives[type] = 0);
    
    weeklyArray.forEach(week => {
        doseTypes.forEach(type => {
            cumulatives[type] += week[type];
            // Calculate uptake as percentage of population
            week[`${type}_uptake`] = (cumulatives[type] / week.Population) * 100;
        });
    });
    
    return weeklyArray;
}


function plotCumulativeUptake(data, countryCodes, doseType = 'SecondDose') {
    // Clear any existing chart
    d3.select("#tsPlot").selectAll("*").remove();
    // Process data for all countries
    const processedData = [];
    countryCodes.forEach((code, idx) => {
        const countryData = processCountryData(data, code);
        if (countryData) {
            processedData.push({
                country: code,
                countryName: countryNames[code] || code,
                data: countryData,
                color: countryColors[idx % countryColors.length]
            });
        }
    });
    
    if (processedData.length === 0) {
        console.error("No data available to plot");
        return;
    }
    
    // Get container dimensions for responsive sizing
    const container = document.getElementById('tsPlot');
    const containerWidth = container.clientWidth || 800;
    const containerHeight = container.clientHeight || 500;
    
    // Define chart dimensions based on container size
    // Increased right margin to accommodate legend
    const margin = { top: 60, right: 180, bottom: 60, left: 60 };
    const width = Math.min(containerWidth - margin.left - margin.right, 900);
    const height = Math.min(containerHeight - margin.top - margin.bottom, 400);
    
    // Create responsive SVG container
    const svg = d3.select("#tsPlot")
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("display", "block")
        .style("margin", "0 auto")
        .style("background", "transparent")
        .style("background", "transparent");
    
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Get date range from all data
    const allDates = processedData.flatMap(d => d.data.map(p => p.Date));
    const dateExtent = d3.extent(allDates);
    
    // Get max uptake value across all countries
    const maxUptake = d3.max(processedData, d => 
        d3.max(d.data, p => p[`${doseType}_uptake`])
    );
    
    // Create scales
    const xScale = d3.scaleTime()
        .domain(dateExtent)
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([0, Math.max(100, maxUptake)])
        .range([height, 0])
        .nice();
    
    // Add grid lines
    g.append("g")
        .attr("class", "grid-y")
        .style("stroke", "rgba(165, 180, 252, 0.15)")
        .style("stroke-dasharray", "3,3")
        .style("opacity", 1)
        .call(d3.axisLeft(yScale)
            .tickSize(-width)
            .tickFormat("")
        )
        .select(".domain").remove();
    
    g.append("g")
        .attr("class", "grid-x")
        .attr("transform", `translate(0,${height})`)
        .style("stroke", "rgba(165, 180, 252, 0.1)")
        .style("stroke-dasharray", "3,3")
        .style("opacity", 1)
        .call(d3.axisBottom(xScale)
            .ticks(d3.timeMonth.every(3))
            .tickSize(-height)
            .tickFormat("")
        )
        .select(".domain").remove();
    
    // Create line generator
    const line = d3.line()
        .x(d => xScale(d.Date))
        .y(d => yScale(d[`${doseType}_uptake`]))
        .curve(d3.curveMonotoneX);  // Smooth curve
    
    // Create tooltip div
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "ts-tooltip")
        .style("position", "absolute")
        .style("background", "rgba(10, 14, 39, 0.95)")
        .style("color", "#e0e7ff")
        .style("padding", "12px 16px")
        .style("border-radius", "6px")
        .style("pointer-events", "none")
        .style("font-size", "13px")
        .style("box-shadow", "0 4px 20px rgba(0, 212, 255, 0.3)")
        .style("border", "1px solid rgba(168, 85, 247, 0.3)")
        .style("z-index", "1000")
        .style("opacity", 0);
    
    // Draw lines for each country with animation
    processedData.forEach((country, idx) => {
        const path = g.append("path")
            .datum(country.data)
            .attr("class", `line-${country.country}`)
            .attr("fill", "none")
            .attr("stroke", country.color)
            .attr("stroke-width", 2.5)
            .attr("d", line)
            .style("opacity", 0);
        
        const totalLength = path.node().getTotalLength();
        path
            .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
            .attr("stroke-dashoffset", totalLength)
            .transition()
            .duration(1500)
            .delay(idx * 150)
            .ease(d3.easeCubicOut)
            .attr("stroke-dashoffset", 0)
            .style("opacity", 1);

        const lastPoint = country.data[country.data.length - 1];
        const finalUptake = lastPoint[`${doseType}_uptake`];
        
        g.append("text")
            .attr("x", xScale(lastPoint.Date) + 10)
            .attr("y", yScale(finalUptake))
            .attr("dy", "0.35em")
            .style("font-size", "11px")
            .style("font-weight", "bold")
            .style("fill", country.color)
            .style("opacity", 0)
            .text(`${finalUptake.toFixed(1)}%`)
            .attr('fill','white')
            .transition()
            .duration(600)
            .delay(idx * 150 + 2000)
            .style("opacity", 1);
    });
    
    const xAxis = g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .style("opacity", 0)
        .call(d3.axisBottom(xScale)
            .ticks(d3.timeMonth.every(3))
            .tickFormat(d3.timeFormat("%b %Y"))
        );
    
    xAxis.selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-0.8em")
        .attr("dy", "0.15em")
        .attr("transform", "rotate(-45)")
        .style("font-size", "11px")
        .style("fill", "#e0e7ff");
    
    xAxis.transition()
        .duration(800)
        .delay(500)
        .style("opacity", 1);
    
    xAxis.selectAll(".domain").style("stroke", "#a5b4fc");
    xAxis.selectAll(".tick line").style("stroke", "#a5b4fc");
    
    const yAxis = g.append("g")
        .attr("class", "y-axis")
        .style("opacity", 0)
        .call(d3.axisLeft(yScale)
            .tickFormat(d => d + "%")
        );
    
    yAxis.selectAll("text")
        .style("font-size", "11px")
        .style("fill", "#e0e7ff");
    
    yAxis.selectAll(".domain").style("stroke", "#a5b4fc");
    yAxis.selectAll(".tick line").style("stroke", "#a5b4fc");
    
    yAxis.transition()
        .duration(800)
        .delay(500)
        .style("opacity", 1);
    
    g.append("text")
        .attr("class", "x-label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 5)
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("fill", "#e0e7ff")
        .style("opacity", 0)
        .text("Date")
        .transition()
        .duration(600)
        .delay(1000)
        .style("opacity", 1);
    
    g.append("text")
        .attr("class", "y-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 20)
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("fill", "#e0e7ff")
        .style("opacity", 0)
        .text("Vaccine uptake (% of total population)")
        .transition()
        .duration(600)
        .delay(1000)
        .style("opacity", 1);
    
    const doseLabel = doseLabels[doseType] || doseType;
    const countriesStr = processedData.slice(0, 3).map(d => d.countryName).join(", ");
    const titleStr = processedData.length > 3 
        ? `${countriesStr} and ${processedData.length - 3} more`
        : countriesStr;
    
    const titleText = `Cumulative COVID-19 Vaccine Uptake: ${doseLabel}`;
    const titleFontSize = titleText.length > 45 ? "14px" : "16px";
    
    svg.append("text")
        .attr("class", "main-title")
        .attr("x", (width + margin.left + margin.right) / 2)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .style("font-size", titleFontSize)
        .style("font-weight", "bold")
        .style("fill", "#e0e7ff")
        .style("opacity", 0)
        .text(titleText)
        .transition()
        .duration(800)
        .delay(800)
        .style("opacity", 1);
    
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + margin.left+50}, ${margin.top})`);
    
    processedData.forEach((country, idx) => {
        const legendItem = legend.append("g")
            .attr("transform", `translate(0, ${idx * 25})`)
            .style("opacity", 0)
            .style("cursor", "pointer")
            .on("mouseover", function() {
                // Highlight the corresponding line
                g.select(`.line-${country.country}`)
                    .transition()
                    .duration(200)
                    .attr("stroke-width", 4);
            })
            .on("mouseout", function() {
                g.select(`.line-${country.country}`)
                    .transition()
                    .duration(200)
                    .attr("stroke-width", 2.5);
            });
        
        legendItem.append("line")
            .attr("x1", 0)
            .attr("x2", 20)
            .attr("y1", 0)
            .attr("y2", 0)
            .attr("stroke", country.color)
            .attr('fill','white')
            .attr("stroke-width", 2.5);
        
        legendItem.append("text")
            .attr("x", 25)
            .attr("y", 0)
            .attr("dy", "0.35em")
            .attr('fill','white')
            .style("font-size", "11px")
            .text(`${country.countryName} (${country.country})`);
        
        legendItem.transition()
            .duration(400)
            .delay(1200 + idx * 100)
            .style("opacity", 1);
    });
    
    console.log(`✅ Cumulative uptake chart created successfully`);
    
    console.log(`\n📊 Final Uptake Percentages - ${doseLabel}`);
    processedData.forEach(country => {
        const lastPoint = country.data[country.data.length - 1];
        const finalUptake = lastPoint[`${doseType}_uptake`];
        console.log(`${country.countryName} (${country.country}): ${finalUptake.toFixed(2)}%`);
    });
}

let globalData = null;


function updateChart() {
    const checkboxes = document.querySelectorAll('#countryCheckboxes input[type="checkbox"]:checked');
    const selectedCountries = Array.from(checkboxes).map(cb => cb.value);
    
    updateSelectedCountriesDisplay(selectedCountries);
    
    const doseType = document.getElementById('doseTypeSelect').value;
    
    if (globalData && selectedCountries.length > 0) {
        console.log(`Updating chart: ${selectedCountries.join(', ')} - ${doseType}`);
        plotCumulativeUptake(globalData, selectedCountries, doseType);
    } else if (selectedCountries.length === 0) {
        console.warn("Please select at least one country");
        d3.select("#tsPlot").selectAll("*").remove();
        d3.select("#tsPlot").append("div")
            .attr("class", "loading")
            .text("Please select at least one country to display");
    }
}

function updateSelectedCountriesDisplay(selectedCountries) {
    const display = document.getElementById('selectedCountriesDisplay');
    
    if (selectedCountries.length === 0) {
        display.innerHTML = '<em style="color: #999;">No countries selected</em>';
    } else {

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
        
        display.innerHTML = selectedCountries
            .map(code => `<span>${countryNames[code] || code}</span>`)
            .join('');
    }
}

if (!window.__dashboardMode) {
    CleanVaccin().then(data => {
        console.log("Data loaded, creating visualization...");
        globalData = data;
        plotCumulativeUptake(data, ['FR', 'DE', 'IT', 'ES'], 'SecondDose');
        
        const checkboxes = document.querySelectorAll('#countryCheckboxes input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateChart);
        });
        
        document.getElementById('doseTypeSelect').addEventListener('change', updateChart);
    
        document.getElementById('selectAll').addEventListener('click', () => {
            checkboxes.forEach(cb => cb.checked = true);
            updateChart();
        });
        document.getElementById('clearAll').addEventListener('click', () => {
            checkboxes.forEach(cb => cb.checked = false);
            updateChart();
        });
        const toggleButton = document.getElementById('toggleCountryPanel');
        const countryPanel = document.getElementById('countryPanel');
        
        toggleButton.addEventListener('click', () => {
            const isOpen = countryPanel.classList.contains('open');
            
            if (isOpen) {
                countryPanel.classList.remove('open');
                toggleButton.classList.remove('open');
            } else {
                countryPanel.classList.add('open');
                toggleButton.classList.add('open');
            }
        });
        
        console.log("✅ Controls initialized and ready!");
    }).catch(error => {

        console.error("Error loading vaccination data:", error);
    });
}


export { plotCumulativeUptake };
