
import { CleanVaccin } from './clean.js';
import { plotPyramidBarCharts } from './barPlot.js';
import { plotCumulativeUptake } from './tsPlot.js';
import { createMapViz, highlightCountries, addCovidOverlay, showCovidStats } from './map.js?v=3';
import { plotTwoCountryComparison } from './kernelPlot.js';
import { plotVaccinationHeatmap } from './heatmap.js?v=4';

console.log("🚀 Dashboard controller initialized");

// Set flag to prevent auto-initialization in modules
window.__dashboardMode = true;

// Store data globally for event handlers
let globalVaccinData = null;

// ============================================
// CONFIGURATION
// ============================================

const config = {
    // Default parameters
    DEFAULT_COUNTRY: 'FR',  
    DEFAULT_YEAR: 2020,
    
    // Countries to display in time series (top European countries by population)
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
    
    console.log("✅ Global controls initialized");
}

// ============================================
// BAR CHART VISUALIZATION MODULE
// ============================================

function createBarChartVisualization(data) {
    console.log("📊 Creating bar chart okay...");
    
    // Temporarily clear the container and set up for bar chart
    const container = d3.select('#barPlot');
    container.html(''); // Clear any loading text
    
    // Call the pyramid bar chart function from barPlot.js
    // This function compares two countries side-by-side
    plotPyramidBarCharts(
        data,
        'FR',  // France (left side)
        'IT',  // Italy (right side)
        2020,  // Start year
        2023   // End year
    );
    
    console.log("✅ Bar chart visualization complete");
}

// ============================================
// TIME SERIES VISUALIZATION MODULE
// ============================================


function initializeTimeSeriesControls(data) {
    // Only add listener for dose type (countries controlled by global selectors)
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
    
    // Temporarily clear the container and set up for time series
    const container = d3.select('#tsPlot');
    container.html(''); // Clear any loading text
    
    // Call the cumulative uptake function from tsPlot.js
    // This function takes a single dose type (not an array)
    plotCumulativeUptake(
        data,
        ['FR', 'IT'],    
        'SecondDose'            
    );
    
    console.log("✅ Time series visualization complete");
}

// ============================================
// KERNEL DENSITY PLOT VISUALIZATION MODULE
// ============================================

function createKernelPlotVisualization(data) {
    console.log("📊 Creating kernel density plot...");
    
    // Clear the container
    const container = d3.select('#chart');
    container.html('');
    
    // Call the kernel plot function with same default countries as bar chart
    plotTwoCountryComparison(data, 'FR', 'IT');
    
    console.log("✅ Kernel plot visualization complete");
}

// ============================================
// DASHBOARD INITIALIZATION
// ============================================

async function initializeDashboard() {
    console.log("🎯 Initializing COVID-19 Vaccination Dashboard...");
    
    try {

        // Only set loading indicators for elements that exist
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
        
        // Load vaccination data
        console.log("📥 Loading vaccination data...");
        const vaccinData = await CleanVaccin();
        console.log(`✅ Data loaded: ${vaccinData.length} records`);
        
        // Store data globally for event handlers
        globalVaccinData = vaccinData;
        
        // Clear loading indicators for elements that exist
        if (mapArea) mapArea.innerHTML = '';
        if (barPlot) barPlot.innerHTML = '';
        if (tsPlot) tsPlot.innerHTML = '';
        if (chart) chart.innerHTML = '';
        if (heatmapElement) heatmapElement.innerHTML = '';
        
        // Create visualizations only if containers exist
        if (mapArea) createMapVisualization(vaccinData);
        if (barPlot) createBarChartVisualization(vaccinData);
        if (tsPlot) createTimeSeriesVisualization(vaccinData);
        if (chart) createKernelPlotVisualization(vaccinData);
        
        // Create heatmap visualization only if element exists (vaccination page only)
        if (heatmapElement) {
            console.log("🔥 Creating vaccination heatmap...");
            plotVaccinationHeatmap(vaccinData, 'FR', 'IT', 2021, 2022, 'SecondDose');
            console.log("✅ Heatmap visualization complete");
        }
        
        // Initialize global controls (must be after visualizations are created)
        initializeGlobalControls();
        
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