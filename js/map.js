
import { CleanVaccin } from './clean.js';


const ctx = {
    MAP_H: window.innerHeight / 2,
    MAP_W: window.innerWidth / 2,
    H: 1000,
    YEAR: 2020
};

// Country code to country name mapping
const countryNames = {
    'AT': 'Austria', 'BE': 'Belgium', 'BG': 'Bulgaria', 'CY': 'Cyprus',
    'CZ': 'Czechia', 'DE': 'Germany', 'DK': 'Denmark', 'EE': 'Estonia',
    'EL': 'Greece', 'ES': 'Spain', 'FI': 'Finland', 'FR': 'France',
    'HR': 'Croatia', 'HU': 'Hungary', 'IE': 'Ireland', 'IS': 'Iceland',
    'IT': 'Italy', 'LI': 'Liechtenstein', 'LT': 'Lithuania', 'LU': 'Luxembourg',
    'LV': 'Latvia', 'MT': 'Malta', 'NL': 'Netherlands', 'NO': 'Norway',
    'PL': 'Poland', 'PT': 'Portugal', 'RO': 'Romania', 'SE': 'Sweden',
    'SI': 'Slovenia', 'SK': 'Slovakia'
};

function calculateUptakeByCountry(data) {
    const results = {};
    
    // Group data by country
    const countryGroups = d3.group(data, d => d.ReportingCountry);
    
    countryGroups.forEach((countryData, country) => {
        // Filter for national-level data and "ALL" target group
        const filteredData = countryData.filter(d => 
            d.TargetGroup === 'ALL' && d.Region === country
        );
        
        if (filteredData.length === 0) return;
        
        // Sort by week to ensure cumulative calculation is correct
        filteredData.sort((a, b) => a.YearWeekISO.localeCompare(b.YearWeekISO));
        
        // Calculate cumulative doses across all weeks
        let firstDoseCum = 0;
        let secondDoseCum = 0;
        let booster1Cum = 0;
        
        filteredData.forEach(d => {
            firstDoseCum += parseFloat(d.FirstDose) || 0;
            secondDoseCum += parseFloat(d.SecondDose) || 0;
            booster1Cum += parseFloat(d.DoseAdditional1) || 0;
        });
        
        // Get population from the most recent record
        const population = parseFloat(filteredData[filteredData.length - 1].Population);
        
        // Calculate uptake percentages (doses per 100 people)
        results[country] = {
            country: country,
            countryName: countryNames[country] || country,
            firstDose: (firstDoseCum / population) * 100,
            primaryCourse: (secondDoseCum / population) * 100,
            booster1: (booster1Cum / population) * 100,
            population: population
        };
    });
    
    return results;
}

function makeGeo(vaccinData) {
    // Get actual div size from the DOM
    const mapAreaDiv = document.getElementById("mapArea");
    const rect = mapAreaDiv.getBoundingClientRect();
    ctx.MAP_W = rect.width;
    ctx.MAP_H = rect.height;

    // Create SVG container with responsive viewBox
    let svgMap = d3.select("#mapArea")
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${ctx.MAP_W} ${ctx.MAP_H}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

    // Load all GeoJSON files in parallel
    Promise.all([
        d3.json("data/nutsrg.geojson"),    // NUTS regions
        d3.json("data/cntbn.geojson"),     // Country boundaries
        d3.json("data/europe.geojson"),    // Country regions
        d3.json("data/gra.geojson"),       // Graticule
        d3.json("data/nutsbn.geojson")     // NUTS boundaries
    ]).then(function(data) {
        // Store geodata in context
        ctx.nutsrg = data[0];
        ctx.cntbn = data[1];
        ctx.cntrg = data[2];
        ctx.gra = data[3];
        ctx.nutsbn = data[4];

        // Calculate vaccination uptake for each country
        const uptakeByCountry = calculateUptakeByCountry(vaccinData);
        console.log("Uptake by country:", uptakeByCountry);
      
        // Attach uptake data to country features
        ctx.cntrg.features.forEach(feature => {
            const countryCode = feature.properties.ISO2;
            if (uptakeByCountry[countryCode]) {
                feature.properties.uptake = uptakeByCountry[countryCode];
            }
        });

        // Create projection to fit Europe in the SVG viewport
        ctx.proj = d3.geoIdentity()
            .reflectY(true)  
            .fitSize([ctx.MAP_W, ctx.MAP_H], ctx.cntrg);
        let projTopath = d3.geoPath().projection(ctx.proj);
        const colorScale = d3.scaleSequential(d3.interpolateViridis)
            .domain([0, 100]);

        // Draw country areas with color based on primary course uptake
        svgMap.append('g')
            .attr("id", "countryArea")
            .selectAll("path")
            .data(ctx.cntrg.features)
            .enter()
            .append("path")
            .attr('d', projTopath)
            .attr('class', 'countryArea')
            .style('fill', d => {
                // Color based on primary course (2nd dose) uptake
                if (d.properties.uptake) {
                    return colorScale(d.properties.uptake.primaryCourse);
                }
                return '#cccccc';  // Gray for countries without data
            })
            .style('stroke', 'white')
            .style('stroke-width', '0.5px')
            .on('mouseover', function(event, d) {
                // Highlight country on hover
                d3.select(this).style('opacity', 0.7);
                
                // Log country info to console
                const countryName = d.properties.NAME || (d.properties.uptake ? d.properties.uptake.countryName : 'Unknown');
                if (d.properties.uptake) {
                    const uptake = d.properties.uptake;
                    console.log(`${countryName}: ${uptake.primaryCourse.toFixed(2)}%`);
                } else {
                    console.log(`${countryName}: No vaccination data`);
                }
            })
            .on('mouseout', function(event, d) {
                // Remove highlight when mouse leaves
                d3.select(this).style('opacity', 1);
            });

        // Draw NUTS regions (administrative subdivisions) as reference lines
        svgMap.append("g")
            .attr("id", "regionArea")
            .selectAll("path")
            .data(ctx.nutsrg.features)
            .enter()
            .append("path")
            .attr("d", projTopath)
            .attr("class", "nutsArea")
            .style('fill', 'none')
            .style('stroke', '#999')
            .style('stroke-width', '0.3px')
            .style('pointer-events', 'none');  // Don't interfere with country hover

        // Draw country borders on top for clear delineation
        svgMap.append("g")
            .attr("id", "countryBorder")
            .selectAll("path")
            .data(ctx.cntbn.features)
            .enter()
            .append("path")
            .attr("d", projTopath)
            .attr("class", "countryBorder");

        // Add color legend to explain the uptake scale
        addLegend(svgMap, colorScale);
    });
}

function addLegend(svg, colorScale) {
    const legendWidth = 20;
    const legendHeight = 200;
    const legendX = ctx.MAP_W - 60; 
    const legendY = 50;

    // Create legend group
    const legend = svg.append('g')
        .attr('id', 'legend')
        .attr('transform', `translate(${legendX}, ${legendY})`);

    // Define gradient for the legend bar
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
        .attr('id', 'legend-gradient')
        .attr('x1', '0%')
        .attr('y1', '100%')  
        .attr('x2', '0%')
        .attr('y2', '0%');

    // Add color stops to the gradient (0% at bottom, 100% at top)
    const numStops = 10;
    for (let i = 0; i <= numStops; i++) {
        const value = (i / numStops) * 100;
        gradient.append('stop')
            .attr('offset', `${(i / numStops) * 100}%`)
            .attr('stop-color', colorScale(value));
    }

    // Draw the colored rectangle
    legend.append('rect')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', 'url(#legend-gradient)')
        .style('stroke', 'black')
        .style('stroke-width', '1px');

    // Create scale for the legend axis
    const legendScale = d3.scaleLinear()
        .domain([0, 100])
        .range([legendHeight, 0]);  // Inverted to match gradient

    // Create axis with percentage labels
    const legendAxis = d3.axisRight(legendScale)
        .ticks(5)
        .tickFormat(d => `${d}%`);

    // Add axis to legend
    legend.append('g')
        .attr('transform', `translate(${legendWidth}, 0)`)
        .call(legendAxis);

    // Add legend title
    legend.append('text')
        .attr('x', legendWidth / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .text('Uptake (%)');
}

function createMapViz(vaccinData = null) {
    console.log("Initializing geographic map visualization...");
    
    if (vaccinData) {
        // Use pre-loaded data
        makeGeo(vaccinData);
    } else {
        // Load vaccination data, then create the map
        CleanVaccin().then(data => {
            console.log("Vaccination data loaded:", data.length, "rows");
            makeGeo(data);
        });
    }
}


export { createMapViz };

// Initialize visualization when DOM is fully loaded (for standalone use)
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        // Only auto-initialize if not being used as a module
        if (document.getElementById('mapArea') && !window.__dashboardMode) {
            createMapViz();
        }
    });
}
