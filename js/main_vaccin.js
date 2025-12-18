
import { CleanVaccin } from './clean.js?v=2';
import { plotPyramidBarCharts } from './barPlot.js?v=7';
import { plotCumulativeUptake } from './tsPlot.js?v=6';
import { createMapViz, highlightCountries, addCovidOverlay, showCovidStats, setFranceClickHandler } from './map_eu.js?v=12';
import { plotTwoCountryComparison } from './kernelPlot.js?v=13';
import { plotVaccinationHeatmap } from './heatmap.js?v=2';
import { createStackedBarChart, createCumulativeLineChart, createEUMedianBarChart, createEUMedianLineChart } from './age_group_viz.js?v=21';

window.__dashboardMode = true;

function parseYearWeek(yearWeek) {
    const [year, week] = yearWeek.split('-W');
    const date = new Date(year, 0, 1 + (week - 1) * 7);
    return date;
}

let globalVaccinData = null;
let isAgeGroupMode = false; 


const config = {
    DEFAULT_COUNTRY: 'FR',  
    DEFAULT_YEAR: 2020,
    
    TS_COUNTRIES: ['FR', 'DE', 'IT', 'ES', 'PL', 'RO', 'NL', 'BE', 'CZ', 'PT'],
    
    DOSE_TYPES: ['FirstDose', 'SecondDose', 'DoseAdditional1']
};




function createMapVisualization(vaccinData) {
    console.log("🗺️  Creating geographic map...");
    createMapViz(vaccinData);
    
    // Define France click handler function
    const showFranceMap = () => {
        console.log("🇫🇷 France clicked - redirecting to France analysis page...");
        window.location.href = 'index_france.html';
    };
    
    // Set up click handler for France to show detailed map
    setFranceClickHandler(showFranceMap);
    
    console.log("✅ Map visualization complete");
}

// ============================================
// GLOBAL CONTROLS MODULE
// ============================================

function initializeGlobalControls() {
    const countries = [...new Set(globalVaccinData.map(d => d.ReportingCountry))].sort();
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
    
    // Skip initialization on COVID analysis page (it has its own country selectors)
    if (window.__covidAnalysisMode) {
        console.log('⚠️ COVID analysis mode detected, skipping vaccination country selects initialization');
        return;
    }
    
    // Support both vaccination dashboard and COVID analysis page
    const select1 = document.getElementById('globalCountry1Select') || document.getElementById('country1Select');
    const select2 = document.getElementById('globalCountry2Select') || document.getElementById('country2Select');
    
    // If selects don't exist, skip initialization (not on a page that needs this)
    if (!select1 || !select2) {
        console.log('⚠️ Country selects not found, skipping global controls initialization');
        return;
    }
    
    // Populate dropdowns
    countries.forEach(code => {
        const option1 = document.createElement('option');
        option1.value = code;
        option1.textContent = countryNames[code] || code;
        if (code === 'FR') option1.selected = true;
        select1.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = code;
        option2.textContent = countryNames[code] || code;
        if (code === 'IT') option2.selected = true;
        select2.appendChild(option2);
    });
    
    // Global update function for all visualizations
    const updateAllCharts = () => {
        // If in age group mode, update age group visualizations
        if (isAgeGroupMode) {
            console.log('🔄 Age group mode - updating visualizations for country change');
            const country1 = select1.value;
            // Update map highlighting
            highlightCountries(country1, country1);
            
            // Reload age group data for new country
            d3.csv('data/vaccin.csv').then(rawData => {
                const countryData = rawData
                    .filter(d => 
                        d.ReportingCountry === country1 && 
                        d.TargetGroup && 
                        d.TargetGroup.startsWith('Age') &&
                        d.TargetGroup !== 'AgeUNK' &&
                        d.TargetGroup !== 'Age<18' &&
                        d.TargetGroup !== 'ALL'
                    )
                    .map(d => ({
                        ...d,
                        FirstDose: parseFloat(d.FirstDose) || 0,
                        SecondDose: parseFloat(d.SecondDose) || 0,
                        DoseAdditional1: parseFloat(d.DoseAdditional1) || 0,
                        DoseAdditional2: parseFloat(d.DoseAdditional2) || 0,
                        DoseAdditional3: parseFloat(d.DoseAdditional3) || 0,
                        DoseAdditional4: parseFloat(d.DoseAdditional4) || 0,
                        DoseAdditional5: parseFloat(d.DoseAdditional5) || 0,
                        date: d.YearWeekISO ? parseYearWeek(d.YearWeekISO) : null
                    }));
                
                const tsSection = document.getElementById('tsSection');
                
                // Update merged section with both time series and stacked bar chart
                if (tsSection) {
                    tsSection.style.height = 'auto';
                    tsSection.style.minHeight = '1200px';
                    tsSection.style.overflow = 'auto';
                    tsSection.innerHTML = `
                        <h2 class="mb-4 text-white text-lg sm:text-xl lg:text-2xl font-semibold">Age Group Analysis</h2>
                        
                        <!-- Time Series Container -->
                        <div class="ts-container mb-6">
                            <h3 class="mb-3 text-white text-base sm:text-lg font-semibold">Cumulative Vaccination Over Time</h3>
                            <div id="ageCumulativeChart" style="width: 100%; min-height: 500px;"></div>
                        </div>
                        
                        <!-- Stacked Bar Chart Container -->
                        <div class="bar-container">
                            <h3 class="mb-3 text-white text-base sm:text-lg font-semibold">Vaccine Uptake by Age Group - ${country1}</h3>
                            <div id="ageStackedBarChart" style="width: 100%; min-height: 600px;"></div>
                        </div>
                    `;
                    createCumulativeLineChart('#ageCumulativeChart', countryData);
                    createStackedBarChart('#ageStackedBarChart', countryData);
                }
                
                console.log('✅ Age group visualizations updated for', country1);
            });
            return;
        }
        
        const country1 = select1.value;
        const country2 = select2.value;
        
        console.log(`🌍 Global update: ${country1} vs ${country2}`);
        
        // Update map highlighting
        highlightCountries(country1, country2);
        
        // Update bar chart
        plotPyramidBarCharts(globalVaccinData, country1, country2, 2020, 2023);
        
        // Update kernel plot
        plotTwoCountryComparison(globalVaccinData, country1, country2);
        
        // Update time series with both countries
        const doseType = document.getElementById('doseTypeSelect').value;
        plotCumulativeUptake(globalVaccinData, [country1, country2], doseType);
        
        // Update heatmap with both countries
        plotVaccinationHeatmap(globalVaccinData, country1, country2, 2021, 2022, doseType);
    };
    
    // Add event listeners
    select1.addEventListener('change', updateAllCharts);
    select2.addEventListener('change', updateAllCharts);
    
    // Initial highlighting
    highlightCountries('FR', 'IT');
    
    // Create Age Group button
    createAgeGroupButton();
    
    console.log("✅ Global controls initialized");
}

function createAgeGroupButton() {
    
    const globalControls = document.querySelector('.global-controls');
    if (!globalControls) {
        console.warn('⚠️ Global controls container not found');
        return;
    }
    
    const ageGroupBtn = document.createElement('button');
    ageGroupBtn.id = 'ageGroupBtn';
    ageGroupBtn.textContent = 'Age Group';
    ageGroupBtn.style.cssText = `
        padding: 8px 16px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: 2px solid #a78bfa;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        margin-left: 10px;
    `;

    const franceBtn = document.createElement('button');
    franceBtn.id = 'franceMapBtn';
    franceBtn.textContent = '🇫🇷 France';
    franceBtn.style.cssText = ageGroupBtn.style.cssText;
    
    const resetBtn = document.createElement('button');
    resetBtn.id = 'resetDashboardBtn';
    resetBtn.textContent = '↩️ Back to Dashboard';
    resetBtn.style.cssText = `
        padding: 8px 16px;
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
        color: white;
        border: 2px solid #ff8787;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        margin-left: 10px;
        display: none;
    `;
    
    ageGroupBtn.addEventListener('mouseenter', () => {
        ageGroupBtn.style.transform = 'translateY(-2px)';
        ageGroupBtn.style.boxShadow = '0 5px 20px rgba(167, 139, 250, 0.4)';
    });
    
    ageGroupBtn.addEventListener('mouseleave', () => {
        ageGroupBtn.style.transform = '';
        ageGroupBtn.style.boxShadow = '';
    });

    franceBtn.addEventListener('mouseenter', () => {
        franceBtn.style.transform = 'translateY(-2px)';
        franceBtn.style.boxShadow = '0 5px 20px rgba(167, 139, 250, 0.4)';
    });

    franceBtn.addEventListener('mouseleave', () => {
        franceBtn.style.transform = '';
        franceBtn.style.boxShadow = '';
    });
    
    ageGroupBtn.addEventListener('click', () => {
        console.log('📊 Age Group button clicked - redirecting to age group page');
        
        window.location.href = 'index_agegroup.html';
    });

    franceBtn.addEventListener('click', () => {
        console.log('🇫🇷 France button clicked - redirecting to France regional analysis page');

        window.location.href = 'index_france.html';
    });
    
    resetBtn.addEventListener('click', () => {
        console.log('↩️ Reloading page to return to dashboard');
        
        window.location.reload();
    });
    

    globalControls.appendChild(ageGroupBtn);
    globalControls.appendChild(franceBtn);
    globalControls.appendChild(resetBtn);
    
    console.log('✅ Age Group button created');
}


function createBarChartVisualization(data) {
    console.log("📊 Creating bar chart okay...");
    
    const container = d3.select('#barPlot');
    container.html(''); 
    
    plotPyramidBarCharts(
        data,
        'FR',  // France (left side)
        'IT',  // Italy (right side)
        2020,  // Start year
        2023   // End year
    );
    
    console.log("✅ Bar chart visualization complete");
}


function initializeTimeSeriesControls(data) {

    const updateChart = () => {
        const country1 = document.getElementById('globalCountry1Select').value;
        const country2 = document.getElementById('globalCountry2Select').value;
        const doseType = document.getElementById('doseTypeSelect').value;
        
        plotCumulativeUptake(data, [country1, country2], doseType);
    };
    
    document.getElementById('doseTypeSelect').addEventListener('change', updateChart);
}


function createTimeSeriesVisualization(data) {
    console.log("📈 Creating time series...");
    
    initializeTimeSeriesControls(data);
    

    const container = d3.select('#tsPlot');
    container.html(''); 
    
    plotCumulativeUptake(
        data,
        ['FR', 'IT'],    
        'SecondDose'            
    );
    
    console.log("✅ Time series visualization complete");
}

function createKernelPlotVisualization(data) {
    console.log("📊 Creating kernel density plot...");
    
   
    const container = d3.select('#chart');
    container.html('');
    
    plotTwoCountryComparison(data, 'FR', 'IT');
    
    console.log("✅ Kernel plot visualization complete");
}

async function initializeDashboard() {
    console.log("🎯 Initializing COVID-19 Vaccination Dashboard...");
    
    try {

        const mapArea = document.getElementById('mapArea');
        const barPlot = document.getElementById('barPlot');
        const tsPlot = document.getElementById('tsPlot');
        const chart = document.getElementById('chart');
        const heatmapElement = document.getElementById('heatmap');
        
        if (mapArea) mapArea.innerHTML = '<div class="loading">Loading map</div>';
        if (barPlot) barPlot.innerHTML = '<div class="loading">Loading bar chart</div>';
        if (tsPlot) tsPlot.innerHTML = '<div class="loading">Loading time series</div>';
        if (chart) chart.innerHTML = '<div class="loading">Loading kernel density plot</div>';
        if (heatmapElement) heatmapElement.innerHTML = '<div class="loading">Loading heatmap</div>';
        
        const vaccinData = await CleanVaccin();
        globalVaccinData = vaccinData;
        if (mapArea) mapArea.innerHTML = '';
        if (barPlot) barPlot.innerHTML = '';
        if (tsPlot) tsPlot.innerHTML = '';
        if (chart) chart.innerHTML = '';
        if (heatmapElement) heatmapElement.innerHTML = '';
    
        if (mapArea) createMapVisualization(vaccinData);
        if (barPlot) createBarChartVisualization(vaccinData);
        if (tsPlot) createTimeSeriesVisualization(vaccinData);
        if (chart) createKernelPlotVisualization(vaccinData);
        
        if (heatmapElement) {
            console.log("🔥 Creating vaccination heatmap...");
            plotVaccinationHeatmap(vaccinData, 'FR', 'IT', 2021, 2022, 'SecondDose');
        }
        
        initializeGlobalControls();

    } catch (error) {
        console.error("❌ Error initializing dashboard:", error);
        alert("Failed to load dashboard. Please check the console for details.");
    }
}

window.addEventListener('load', initializeDashboard);


let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        console.log("🔄 Window resized - consider reloading visualizations");
       
    }, 250);
});

