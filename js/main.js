
import { CleanVaccin } from './clean.js';
import { plotPyramidBarCharts } from './barPlot.js';
import { plotCumulativeUptake } from './tsPlot.js';
import { createMapViz } from './map.js';

console.log("🚀 Dashboard controller initialized");

// Set flag to prevent auto-initialization in modules
window.__dashboardMode = true;


const config = {
    DEFAULT_COUNTRY: 'FR',  
    DEFAULT_YEAR: 2020,
    
    TS_COUNTRIES: ['FR', 'DE', 'IT', 'ES', 'PL', 'RO', 'NL', 'BE', 'CZ', 'PT'],
    DOSE_TYPES: ['FirstDose', 'SecondDose', 'DoseAdditional1']
};

// ============================================
// MAP VISUALIZATION MODULE
// ============================================

function createMapVisualization(vaccinData) {
    console.log("🗺️  Creating geographic map...");
    createMapViz(vaccinData);
    console.log("✅ Map visualization complete");
}

// ============================================
// BAR CHART VISUALIZATION MODULE
// ============================================

function initializeBarChartControls(data) {
    const countries = [...new Set(data.map(d => d.ReportingCountry))].sort();
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
    const select1 = document.getElementById('country1Select');
    const select2 = document.getElementById('country2Select');
    countries.forEach(code => {
        const option1 = document.createElement('option');
        option1.value = code;
        option1.textContent = countryNames[code] || code;
        if (code === 'FR') option1.selected = true;
        select1.appendChild(option1);
        const option2 = document.createElement('option');
        option2.value = code;
        option2.textContent = countryNames[code] || code;
        if (code === 'DE') option2.selected = true;
        select2.appendChild(option2);
    });
    
    const updateChart = () => {
        const country1 = select1.value;
        const country2 = select2.value;
        plotPyramidBarCharts(data, country1, country2, 2020, 2023);
    };
    
    select1.addEventListener('change', updateChart);
    select2.addEventListener('change', updateChart);
}

function createBarChartVisualization(data) {
    console.log("📊 Creating bar chart okay...");
   
    initializeBarChartControls(data);
    
    // Temporarily clear the container and set up for bar chart
    const container = d3.select('#barPlot');
    container.html(''); // Clear any loading text
    
    // This function compares two countries side-by-side
    plotPyramidBarCharts(
        data,
        'FR',  // France (left side)
        'DE',  // Germany (right side)
        2020,  // Start year
        2023   // End year
    );
    
    console.log("✅ Bar chart visualization complete");
}

// ============================================
// TIME SERIES VISUALIZATION MODULE
// ============================================


function initializeTimeSeriesControls(data) {
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
    
    const countrySelect = document.getElementById('countrySelect');
    const defaultCountries = config.TS_COUNTRIES;
    
    // Create options for multi-select dropdown
    Object.entries(countryNames).forEach(([code, name]) => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = name;
        option.selected = defaultCountries.includes(code);
        countrySelect.appendChild(option);
    });
    
   
    const updateChart = () => {
        const selectedCountries = Array.from(countrySelect.selectedOptions).map(opt => opt.value);
        const doseType = document.getElementById('doseTypeSelect').value;
        
        if (selectedCountries.length > 0) {
            plotCumulativeUptake(data, selectedCountries, doseType);
        }
    };
    
    countrySelect.addEventListener('change', updateChart);
    document.getElementById('doseTypeSelect').addEventListener('change', updateChart);
}


function createTimeSeriesVisualization(data) {
    console.log("📈 Creating time series...");
    

    initializeTimeSeriesControls(data);
    
    const container = d3.select('#tsPlot');
    container.html(''); // Clear any loading text
    
    // Call the cumulative uptake function from tsPlot.js
    // This function takes a single dose type (not an array)
    plotCumulativeUptake(
        data,
        config.TS_COUNTRIES,    
        'SecondDose'            
    );
    
    console.log("✅ Time series visualization complete");
}

// ============================================
// DASHBOARD INITIALIZATION
// ============================================


async function initializeDashboard() {
    console.log("🎯 Initializing COVID-19 Vaccination Dashboard...");
    
    try {

        document.getElementById('mapArea').innerHTML = '<div class="loading">Loading map</div>';
        document.getElementById('barPlot').innerHTML = '<div class="loading">Loading bar chart</div>';
        document.getElementById('tsPlot').innerHTML = '<div class="loading">Loading time series</div>';
        
        // Load vaccination data
        console.log("📥 Loading vaccination data...");
        const vaccinData = await CleanVaccin();
        console.log(`✅ Data loaded: ${vaccinData.length} records`);
        
        // Clear loading indicators
        document.getElementById('mapArea').innerHTML = '';
        document.getElementById('barPlot').innerHTML = '';
        document.getElementById('tsPlot').innerHTML = '';
        
        // Create all visualizations
        createMapVisualization(vaccinData);
        createBarChartVisualization(vaccinData);
        createTimeSeriesVisualization(vaccinData);
        
        console.log("🎉 Dashboard initialization complete!");
        
    } catch (error) {
        console.error("❌ Error initializing dashboard:", error);
        alert("Failed to load dashboard. Please check the console for details.");
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

// Initialize dashboard when page loads
window.addEventListener('load', initializeDashboard);

// Handle window resize for responsive layout
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        console.log("🔄 Window resized - consider reloading visualizations");
       
    }, 250);
});

console.log("✅ Dashboard controller loaded successfully");