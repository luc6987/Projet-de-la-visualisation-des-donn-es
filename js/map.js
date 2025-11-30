
import { CleanVaccin } from './clean.js';

// Context object for map dimensions and data
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
    
    const countryGroups = d3.group(data, d => d.ReportingCountry);
    countryGroups.forEach((countryData, country) => {
        const filteredData = countryData.filter(d => 
            d.TargetGroup === 'ALL' && d.Region === country
        );
        
        if (filteredData.length === 0) return;
        
        // Sort by week to ensure cumulative calculation is correct
        filteredData.sort((a, b) => a.YearWeekISO.localeCompare(b.YearWeekISO));
        
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

    const g = svgMap.append('g');

    Promise.all([
        d3.json("data/europe.geojson")
    ]).then(function(data) {
        // Store geodata in context
        const geo = data[0];
        ctx.geo = geo;

        // Calculate vaccination uptake for each country
        const uptakeByCountry = calculateUptakeByCountry(vaccinData);
        console.log("Uptake by country:", uptakeByCountry);
      
        // Attach uptake data to country features
        geo.features.forEach(feature => {
            const countryCode = feature.properties.ISO2;
            if (uptakeByCountry[countryCode]) {
                feature.properties.uptake = uptakeByCountry[countryCode];
            }
        });

        // Create projection to fit Europe in the SVG viewport - using same approach as cartogram.js
        const padding = 40;
        ctx.proj = d3.geoMercator()
            .fitSize([ctx.MAP_W , ctx.MAP_H ], geo);

        // Create path generator using the projection
        let projTopath = d3.geoPath().projection(ctx.proj);

        // Color scale: Space theme gradient from dark purple to cyan
        const colorScale = d3.scaleSequential(d3.interpolateCool)
            .domain([0, 100]);

        // Draw background map (semi-transparent)
        g.selectAll('.country-bg')
            .data(geo.features)
            .enter()
            .append('path')
            .attr('class', 'country-bg')
            .attr('d', projTopath)
            .style('fill', 'rgba(165, 180, 252, 0.1)')
            .style('stroke', 'rgba(255, 255, 255, 0.3)')
            .style('stroke-width', 0.3)
            .style('opacity', 0.5);

        // Draw country areas with color based on primary course uptake
        g.append('g')
            .attr("id", "countryArea")
            .selectAll("path")
            .data(geo.features)
            .enter()
            .append("path")
            .attr('d', projTopath)
            .attr('class', 'countryArea')
            .attr('data-country', d => d.properties.ISO2)  // Add country code as data attribute
            .style('fill', d => {
                // Color based on primary course (2nd dose) uptake
                if (d.properties.uptake) {
                    return colorScale(d.properties.uptake.primaryCourse);
                }
                return '#cccccc';  // Gray for countries without data
            })
            .style('stroke', 'white')
            .style('stroke-width', '0.5px')
            .style('cursor', 'pointer')  // Show pointer cursor on hover
            .style('transition', 'all 0.3s ease')  // Add transition for smooth highlighting
            .on('mouseover', function(event, d) {
                // Highlight the country on hover
                d3.select(this)
                    .style('stroke', 'rgba(255, 255, 255, 0.5)')
                    .style('stroke-width', '2px')
                    .style('filter', 'brightness(1.1)');
                
                // Show tooltip with country information
                const countryCode = d.properties.ISO2;
                const countryName = countryNames[countryCode] || d.properties.NAME || countryCode;
                const uptake = d.properties.uptake;
                
                let tooltipContent = `<strong>${countryName}</strong><br/>`;
                
                if (uptake) {
                    tooltipContent += `
                        <div style="margin-top: 5px;">
                            <div>Population: ${uptake.population.toLocaleString()}</div>
                            <div style="margin-top: 3px;">
                                <strong>Vaccination Coverage:</strong>
                            </div>
                            <div>1st Dose: ${uptake.firstDose.toFixed(1)}%</div>
                            <div>2nd Dose: ${uptake.primaryCourse.toFixed(1)}%</div>
                            <div>Booster: ${uptake.booster1.toFixed(1)}%</div>
                        </div>
                    `;
                } else {
                    tooltipContent += '<div style="margin-top: 5px; color: #999;">No data available</div>';
                }
                
                // Create or update tooltip
                let tooltip = d3.select('body').select('.map-tooltip');
                if (tooltip.empty()) {
                    tooltip = d3.select('body').append('div')
                        .attr('class', 'map-tooltip')
                        .style('position', 'absolute')
                        .style('background', 'rgba(255, 255, 255, 0.95)')
                        .style('border', '2px solid #333')
                        .style('border-radius', '8px')
                        .style('padding', '12px 15px')
                        .style('font-size', '13px')
                        .style('line-height', '1.6')
                        .style('pointer-events', 'none')
                        .style('z-index', '10000')
                        .style('box-shadow', '0 4px 12px rgba(0,0,0,0.15)')
                        .style('min-width', '200px');
                }
                
                tooltip
                    .html(tooltipContent)
                    .style('left', (event.pageX + 15) + 'px')
                    .style('top', (event.pageY - 10) + 'px')
                    .style('opacity', 1);
            })
            .on('mousemove', function(event) {
                // Update tooltip position as mouse moves
                d3.select('.map-tooltip')
                    .style('left', (event.pageX + 15) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', function() {
                // Reset country style
                d3.select(this)
                    .style('stroke', 'white')
                    .style('stroke-width', '0.5px')
                    .style('filter', 'none');
                
                // Remove tooltip
                d3.select('.map-tooltip').style('opacity', 0).remove();
            });
        
        addLegend(svgMap, colorScale);
    });
}


function addLegend(svg, colorScale) {
    const legendWidth = 20;
    const legendHeight = 200;
    const legendX = ctx.MAP_W - 60;  // Position near right edge
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
        .attr('y1', '100%')  // Bottom to top
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
        .style('fill', 'white')
        .text('Uptake (%)');
}


/**
 * Highlight selected countries on the map
 * @param {string} country1 - First selected country code
 * @param {string} country2 - Second selected country code
 */
function highlightCountries(country1, country2) {
    console.log(`🗺️  Highlighting countries: ${country1}, ${country2}`);
    
    // Find all country paths in the map
    const countries = d3.selectAll('#mapArea path');
    
    // Reset all countries to default style (faded)
    countries
        .transition()
        .duration(300)
        .style('opacity', 0.3)
        .style('stroke', 'rgba(165, 180, 252, 0.5)')
        .style('stroke-width', 0.5);
    
    // Highlight country 1 (cyan glow)
    d3.selectAll(`#mapArea path[data-country="${country1}"]`)
        .transition()
        .duration(500)
        .style('opacity', 1)
        .style('stroke', '#00d4ff')
        .style('stroke-width', 3)
        .style('filter', 'drop-shadow(0 0 10px #00d4ff)');
    
    // Highlight country 2 (magenta glow)
    d3.selectAll(`#mapArea path[data-country="${country2}"]`)
        .transition()
        .duration(500)
        .style('opacity', 1)
        .style('stroke', '#ff00ff')
        .style('stroke-width', 3)
        .style('filter', 'drop-shadow(0 0 10px #ff00ff)');
    
    // Show comparison stats
    showComparisonStats(country1, country2);
}

/**
 * Display detailed comparison statistics for selected countries
 */
function showComparisonStats(country1, country2) {
    const statsContent = document.getElementById('statsContent');
    
    if (!window.__mapVaccinData || !statsContent) return;
    
    // Get detailed stats for both countries
    const stats1 = getDetailedCountryStats(window.__mapVaccinData, country1);
    const stats2 = getDetailedCountryStats(window.__mapVaccinData, country2);
    
    // Build HTML for stats panel
    statsContent.innerHTML = `
        <!-- Country 1 Stats Card -->
        <div class="country-stat-card country1">
            <h4>🔵 ${countryNames[country1] || country1}</h4>
            <div class="stat-row">
                <span class="stat-label">Population</span>
                <span class="stat-value">${stats1.population}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Total Vaccines</span>
                <span class="stat-value">${stats1.totalVaccines}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">1st Dose</span>
                <span class="stat-value">${stats1.firstDose} (${stats1.firstDosePercent}%)</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">2nd Dose</span>
                <span class="stat-value">${stats1.secondDose} (${stats1.secondDosePercent}%)</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Booster</span>
                <span class="stat-value">${stats1.booster} (${stats1.boosterPercent}%)</span>
            </div>
        </div>
        
        <!-- Country 2 Stats Card -->
        <div class="country-stat-card country2">
            <h4>🔴 ${countryNames[country2] || country2}</h4>
            <div class="stat-row">
                <span class="stat-label">Population</span>
                <span class="stat-value">${stats2.population}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Total Vaccines</span>
                <span class="stat-value">${stats2.totalVaccines}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">1st Dose</span>
                <span class="stat-value">${stats2.firstDose} (${stats2.firstDosePercent}%)</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">2nd Dose</span>
                <span class="stat-value">${stats2.secondDose} (${stats2.secondDosePercent}%)</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Booster</span>
                <span class="stat-value">${stats2.booster} (${stats2.boosterPercent}%)</span>
            </div>
        </div>
        
        <!-- Comparison Section -->
        <div class="comparison-section">
            <h4>Coverage Comparison</h4>
            
            <div class="comparison-bar">
                <div class="comparison-label">1st Dose</div>
                <div class="comparison-bars">
                    <div class="bar-segment country1" style="width: ${Math.min(stats1.firstDosePercent, 100)}%" title="${countryNames[country1]}: ${stats1.firstDosePercent}%"></div>
                    <div class="bar-segment country2" style="width: ${Math.min(stats2.firstDosePercent, 100)}%" title="${countryNames[country2]}: ${stats2.firstDosePercent}%"></div>
                </div>
            </div>
            
            <div class="comparison-bar">
                <div class="comparison-label">2nd Dose</div>
                <div class="comparison-bars">
                    <div class="bar-segment country1" style="width: ${Math.min(stats1.secondDosePercent, 100)}%" title="${countryNames[country1]}: ${stats1.secondDosePercent}%"></div>
                    <div class="bar-segment country2" style="width: ${Math.min(stats2.secondDosePercent, 100)}%" title="${countryNames[country2]}: ${stats2.secondDosePercent}%"></div>
                </div>
            </div>
            
            <div class="comparison-bar">
                <div class="comparison-label">Booster</div>
                <div class="comparison-bars">
                    <div class="bar-segment country1" style="width: ${Math.min(stats1.boosterPercent, 100)}%" title="${countryNames[country1]}: ${stats1.boosterPercent}%"></div>
                    <div class="bar-segment country2" style="width: ${Math.min(stats2.boosterPercent, 100)}%" title="${countryNames[country2]}: ${stats2.boosterPercent}%"></div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Get detailed vaccination statistics for a country
 */
function getDetailedCountryStats(data, countryCode) {
    const countryData = data.filter(d => 
        d.ReportingCountry === countryCode && 
        d.TargetGroup === 'ALL' && 
        d.Region === countryCode
    );
    
    if (countryData.length === 0) {
        return {
            population: 'N/A',
            totalVaccines: 'N/A',
            firstDose: 'N/A',
            firstDosePercent: 0,
            secondDose: 'N/A',
            secondDosePercent: 0,
            booster: 'N/A',
            boosterPercent: 0
        };
    }
    
    let firstDoseTotal = 0;
    let secondDoseTotal = 0;
    let boosterTotal = 0;
    
    countryData.forEach(d => {
        firstDoseTotal += parseFloat(d.FirstDose) || 0;
        secondDoseTotal += parseFloat(d.SecondDose) || 0;
        boosterTotal += parseFloat(d.DoseAdditional1) || 0;
    });
    
    const population = parseFloat(countryData[countryData.length - 1].Population) || 1;
    const totalVaccines = firstDoseTotal + secondDoseTotal + boosterTotal;
    
    return {
        population: population.toLocaleString(),
        totalVaccines: Math.round(totalVaccines).toLocaleString(),
        firstDose: Math.round(firstDoseTotal).toLocaleString(),
        firstDosePercent: ((firstDoseTotal / population) * 100).toFixed(1),
        secondDose: Math.round(secondDoseTotal).toLocaleString(),
        secondDosePercent: ((secondDoseTotal / population) * 100).toFixed(1),
        booster: Math.round(boosterTotal).toLocaleString(),
        boosterPercent: ((boosterTotal / population) * 100).toFixed(1)
    };
}

/**
 * Add COVID cases/deaths overlay circles on the map
 * @param {string} type - 'cases' or 'deaths'
 * @param {number} year - Year to display (2020-2023)
 */
async function addCovidOverlay(type, year) {
    console.log(`📍 Adding COVID ${type} overlay for ${year}`);
    
    // Remove existing overlay
    d3.select('#mapArea svg g#covidOverlay').remove();
    
    if (type === 'none') {
        console.log('Overlay type is none, removing overlay');
        return;
    }
    
    try {
        // Load COVID data
        console.log('Loading COVID data from data/covid.csv...');
        const covidData = await d3.csv('data/covid.csv', d => ({
            location: d.location,
            date: d.date,
            new_cases: +d.new_cases,
            new_deaths: +d.new_deaths,
            year: new Date(d.date).getFullYear()
        }));
        
        console.log(`COVID data loaded: ${covidData.length} records`);
        
        // Country name mapping
        const nameMap = {
            'Czechia': 'Czech Republic',
            'North Macedonia': 'Macedonia',
            'Republic of Ireland': 'Ireland',
            'Russian Federation': 'Russia',
            'UK': 'United Kingdom'
        };
        
        // Aggregate data by country for the selected year
        const metric = type === 'deaths' ? 'new_deaths' : 'new_cases';
        const byCountry = d3.rollup(
            covidData.filter(r => r.year === +year),
            v => d3.sum(v, d => d[metric]),
            d => d.location
        );
        
        // Get geo features and projection from context
        if (!ctx.geo || !ctx.proj) {
            console.error('❌ Map not initialized yet - ctx.geo or ctx.proj is missing');
            console.log('ctx.geo:', ctx.geo);
            console.log('ctx.proj:', ctx.proj);
            return;
        }
        
        console.log('Map context is ready, creating overlay data...');
        
        const geoByName = new Map(ctx.geo.features.map(f => [f.properties.NAME, f]));
        
        // Prepare data with geographic centroids
        const overlayData = [];
        for (const [location, value] of byCountry) {
            if (location === 'Russia' || value <= 0) continue;
            
            const name = nameMap[location] || location;
            let feature = geoByName.get(name) || geoByName.get(location);
            
            if (feature) {
                const centroid = d3.geoPath().projection(ctx.proj).centroid(feature);
                overlayData.push({
                    name: location,
                    value: value,
                    x: centroid[0],
                    y: centroid[1]
                });
            }
        }
        
        // Create radius scale
        const maxVal = d3.max(overlayData, d => d.value);
        const minVal = d3.min(overlayData, d => d.value);
        const maxRadius = 30;
        const minRadius = 5;
        
        const radiusScale = d3.scaleSqrt()
            .domain([minVal, maxVal])
            .range([minRadius, maxRadius]);
        
        // Color based on type
        const fillColor = type === 'deaths' ? '#ff00ff' : '#00d4ff';
        const strokeColor = type === 'deaths' ? '#c0392b' : '#2980b9';
        
        // Add overlay group
        const svg = d3.select('#mapArea svg');
        
        if (svg.empty()) {
            console.error('❌ SVG element not found in #mapArea');
            return;
        }
        
        const overlayGroup = svg.select('g').append('g')
            .attr('id', 'covidOverlay');
        
        console.log(`Creating ${overlayData.length} circles for overlay...`);
        
        // Draw circles
        overlayGroup.selectAll('circle')
            .data(overlayData)
            .enter()
            .append('circle')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', 0)
            .style('fill', fillColor)
            .style('fill-opacity', 0.6)
            .style('stroke', strokeColor)
            .style('stroke-width', 1.5)
            .style('pointer-events', 'all')
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .style('fill-opacity', 0.9)
                    .style('stroke-width', 2.5);
                
                // Show tooltip
                const tooltip = d3.select('body').append('div')
                    .attr('class', 'covid-tooltip')
                    .style('position', 'absolute')
                    .style('background', 'rgba(0,0,0,0.8)')
                    .style('color', 'white')
                    .style('padding', '8px 12px')
                    .style('border-radius', '4px')
                    .style('font-size', '12px')
                    .style('pointer-events', 'none')
                    .style('z-index', '10000')
                    .html(`
                        <strong>${d.name}</strong><br/>
                        ${type === 'deaths' ? 'Deaths' : 'Cases'}: ${d.value.toLocaleString()}
                    `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 20) + 'px');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .style('fill-opacity', 0.6)
                    .style('stroke-width', 1.5);
                d3.selectAll('.covid-tooltip').remove();
            })
            .transition()
            .duration(800)
            .attr('r', d => radiusScale(d.value));
        
        console.log(`✅ Added ${overlayData.length} circles for ${type}`);
        
    } catch (error) {
        console.error('Error loading COVID overlay:', error);
    }
}

function createMapViz(vaccinData = null) {
    console.log("Initializing geographic map visualization...");
    
    // Store data globally for highlighting feature
    if (vaccinData) {
        window.__mapVaccinData = vaccinData;
        makeGeo(vaccinData);
    } else {
        CleanVaccin().then(data => {
            console.log("Vaccination data loaded:", data.length, "rows");
            window.__mapVaccinData = data;
            makeGeo(data);
        });
    }
}

/**
 * Display COVID-19 statistics for selected countries
 * @param {Array} covidData - COVID data array
 * @param {string} country1 - First selected country code
 * @param {string} country2 - Second selected country code
 */
function showCovidStats(covidData, country1, country2) {
    const statsContent = document.getElementById('statsContent');
    
    if (!covidData || !statsContent) return;
    
    // Country code to full name mapping for COVID data
    const covidCountryNames = {
        'AT': 'Austria', 'BE': 'Belgium', 'BG': 'Bulgaria', 'CY': 'Cyprus',
        'CZ': 'Czechia', 'DE': 'Germany', 'DK': 'Denmark', 'EE': 'Estonia',
        'EL': 'Greece', 'ES': 'Spain', 'FI': 'Finland', 'FR': 'France',
        'HR': 'Croatia', 'HU': 'Hungary', 'IE': 'Ireland', 'IS': 'Iceland',
        'IT': 'Italy', 'LI': 'Liechtenstein', 'LT': 'Lithuania', 'LU': 'Luxembourg',
        'LV': 'Latvia', 'MT': 'Malta', 'NL': 'Netherlands', 'NO': 'Norway',
        'PL': 'Poland', 'PT': 'Portugal', 'RO': 'Romania', 'SE': 'Sweden',
        'SI': 'Slovenia', 'SK': 'Slovakia'
    };
    
    // Get COVID stats for both countries
    const stats1 = getCovidCountryStats(covidData, country1);
    const stats2 = getCovidCountryStats(covidData, country2);
    
    // Build HTML for stats panel
    statsContent.innerHTML = `
        <!-- Country 1 Stats Card -->
        <div class="country-stat-card country1">
            <h4>🔵 ${covidCountryNames[country1] || country1}</h4>
            <div class="stat-row">
                <span class="stat-label">Total Cases</span>
                <span class="stat-value">${stats1.totalCases}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Total Deaths</span>
                <span class="stat-value">${stats1.totalDeaths}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Case Fatality Rate</span>
                <span class="stat-value">${stats1.fatalityRate}%</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Peak Daily Cases</span>
                <span class="stat-value">${stats1.peakCases}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Peak Daily Deaths</span>
                <span class="stat-value">${stats1.peakDeaths}</span>
            </div>
        </div>
        
        <!-- Country 2 Stats Card -->
        <div class="country-stat-card country2">
            <h4>🔴 ${covidCountryNames[country2] || country2}</h4>
            <div class="stat-row">
                <span class="stat-label">Total Cases</span>
                <span class="stat-value">${stats2.totalCases}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Total Deaths</span>
                <span class="stat-value">${stats2.totalDeaths}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Case Fatality Rate</span>
                <span class="stat-value">${stats2.fatalityRate}%</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Peak Daily Cases</span>
                <span class="stat-value">${stats2.peakCases}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Peak Daily Deaths</span>
                <span class="stat-value">${stats2.peakDeaths}</span>
            </div>
        </div>
        
        <!-- Comparison Section -->
        <div class="comparison-section">
            <h4>Impact Comparison</h4>
            
            <div class="comparison-bar">
                <div class="comparison-label">Total Cases</div>
                <div class="comparison-bars">
                    <div class="bar-segment country1" style="width: ${stats1.casesPercent}%" title="${covidCountryNames[country1]}: ${stats1.totalCases}"></div>
                    <div class="bar-segment country2" style="width: ${stats2.casesPercent}%" title="${covidCountryNames[country2]}: ${stats2.totalCases}"></div>
                </div>
            </div>
            
            <div class="comparison-bar">
                <div class="comparison-label">Total Deaths</div>
                <div class="comparison-bars">
                    <div class="bar-segment country1" style="width: ${stats1.deathsPercent}%" title="${covidCountryNames[country1]}: ${stats1.totalDeaths}"></div>
                    <div class="bar-segment country2" style="width: ${stats2.deathsPercent}%" title="${covidCountryNames[country2]}: ${stats2.totalDeaths}"></div>
                </div>
            </div>
            
            <div class="comparison-bar">
                <div class="comparison-label">Fatality Rate</div>
                <div class="comparison-bars">
                    <div class="bar-segment country1" style="width: ${stats1.fatalityRatePercent}%" title="${covidCountryNames[country1]}: ${stats1.fatalityRate}%"></div>
                    <div class="bar-segment country2" style="width: ${stats2.fatalityRatePercent}%" title="${covidCountryNames[country2]}: ${stats2.fatalityRate}%"></div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Calculate COVID statistics for a specific country
 */
function getCovidCountryStats(covidData, countryCode) {
    // Map country codes to location names in COVID data
    const codeToLocation = {
        'AT': 'Austria', 'BE': 'Belgium', 'BG': 'Bulgaria', 'CY': 'Cyprus',
        'CZ': 'Czechia', 'DE': 'Germany', 'DK': 'Denmark', 'EE': 'Estonia',
        'EL': 'Greece', 'ES': 'Spain', 'FI': 'Finland', 'FR': 'France',
        'HR': 'Croatia', 'HU': 'Hungary', 'IE': 'Ireland', 'IS': 'Iceland',
        'IT': 'Italy', 'LI': 'Liechtenstein', 'LT': 'Lithuania', 'LU': 'Luxembourg',
        'LV': 'Latvia', 'MT': 'Malta', 'NL': 'Netherlands', 'NO': 'Norway',
        'PL': 'Poland', 'PT': 'Portugal', 'RO': 'Romania', 'SE': 'Sweden',
        'SI': 'Slovenia', 'SK': 'Slovakia'
    };
    
    const location = codeToLocation[countryCode] || countryCode;
    const countryData = covidData.filter(d => d.location === location);
    
    if (countryData.length === 0) {
        return {
            totalCases: 'N/A',
            totalDeaths: 'N/A',
            fatalityRate: 'N/A',
            peakCases: 'N/A',
            peakDeaths: 'N/A',
            casesPercent: 0,
            deathsPercent: 0,
            fatalityRatePercent: 0
        };
    }
    
    // Get most recent data (has cumulative totals)
    const latestData = countryData.reduce((latest, current) => 
        new Date(current.date) > new Date(latest.date) ? current : latest
    );
    
    const totalCases = latestData.total_cases || 0;
    const totalDeaths = latestData.total_deaths || 0;
    const fatalityRate = totalCases > 0 ? ((totalDeaths / totalCases) * 100) : 0;
    
    // Find peak daily values
    const peakCases = d3.max(countryData, d => d.new_cases) || 0;
    const peakDeaths = d3.max(countryData, d => d.new_deaths) || 0;
    
    return {
        totalCases: totalCases.toLocaleString(),
        totalDeaths: totalDeaths.toLocaleString(),
        fatalityRate: fatalityRate.toFixed(2),
        peakCases: peakCases.toLocaleString(),
        peakDeaths: peakDeaths.toLocaleString(),
        casesPercent: 100, // Will be normalized in comparison
        deathsPercent: 100,
        fatalityRatePercent: Math.min((fatalityRate / 5) * 100, 100) // Scale 0-5% to 0-100%
    };
}

export { createMapViz, highlightCountries, addCovidOverlay, showCovidStats };
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        // Only auto-initialize if not being used as a module
        if (document.getElementById('mapArea') && !window.__dashboardMode) {
            createMapViz();
        }
    });
}
