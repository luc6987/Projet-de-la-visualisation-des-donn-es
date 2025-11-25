/**
 * COVID Analysis Dashboard Main Controller
 * This file coordinates all visualizations on the covidAnalysis.html page
 */

// Global state
let covidData = null;
let currentCountry1 = 'France';
let currentCountry2 = 'Germany';

/**
 * Initialize the COVID Analysis Dashboard
 */
async function initializeCovidAnalysis() {
    console.log('Initializing COVID Analysis Dashboard...');
    
    try {
        // Load COVID data
        covidData = await d3.csv('data/covid.csv', d => ({
            location: d.location,
            date: new Date(d.date),
            total_cases: +d.total_cases || 0,
            new_cases: +d.new_cases || 0,
            total_deaths: +d.total_deaths || 0,
            new_deaths: +d.new_deaths || 0,
            weekly_cases: +d.weekly_cases || 0,
            weekly_deaths: +d.weekly_deaths || 0
        }));
        
        console.log(`Loaded ${covidData.length} COVID data records`);
        
        // Initialize all visualizations
        await initializeVisualizations();
        
        // Setup event listeners for controls
        setupEventListeners();
        
        console.log('COVID Analysis Dashboard initialized successfully');
    } catch (error) {
        console.error('Error initializing COVID Analysis Dashboard:', error);
        displayError('Failed to load COVID data. Please check the console for details.');
    }
}

/**
 * Initialize all visualizations on the page
 */
async function initializeVisualizations() {
    console.log('Initializing visualizations...');
    
    // Check which visualization containers are available
    const hasBoxViolin = document.getElementById('boxViolinPlot');
    const hasGrowthRate = document.getElementById('growthRatePlot');
    const hasMap = document.getElementById('mapArea');
    
    // Initialize Box/Violin plot if container exists
    if (hasBoxViolin && typeof window.createBoxViolinPlot === 'function') {
        console.log('Initializing Box/Violin CFR plot...');
        try {
            await window.createBoxViolinPlot();
        } catch (error) {
            console.error('Error initializing Box/Violin plot:', error);
        }
    }
    
    // Initialize Growth Rate Comparison if container exists
    if (hasGrowthRate && typeof window.loadAndProcessData === 'function') {
        console.log('Initializing Growth Rate Comparison...');
        try {
            await window.loadAndProcessData();
        } catch (error) {
            console.error('Error initializing Growth Rate plot:', error);
        }
    }
    
    // Map initialization would go here if needed
    if (hasMap) {
        console.log('Map container found');
        // Add map initialization code here if you have a map visualization
    }
}

/**
 * Setup event listeners for interactive controls
 */
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Back button
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'index_vaccin.html';
        });
    }
    
    // Country selection for growth rate comparison
    const country1Select = document.getElementById('country1Select');
    const country2Select = document.getElementById('country2Select');
    const updateBtn = document.getElementById('updateBtn');
    
    if (country1Select && country2Select && updateBtn) {
        updateBtn.addEventListener('click', () => {
            const country1 = country1Select.value;
            const country2 = country2Select.value;
            
            console.log(`🔄 Update button clicked! Country1: ${country1}, Country2: ${country2}`);
            console.log(`📊 window.updateComparison exists? ${typeof window.updateComparison === 'function'}`);
            
            if (country1 && country2 && country1 !== country2) {
                console.log(`✅ Updating comparison: ${country1} vs ${country2}`);
                currentCountry1 = country1;
                currentCountry2 = country2;
                
                // Update growth rate visualization if available
                if (typeof window.updateComparison === 'function') {
                    console.log('🚀 Calling window.updateComparison()');
                    window.updateComparison();
                } else {
                    console.error('❌ window.updateComparison is not available!');
                }
            } else if (country1 === country2) {
                alert('Please select different countries for comparison');
            }
        });
        
        // Enable Enter key to update
        [country1Select, country2Select].forEach(select => {
            select.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    updateBtn.click();
                }
            });
        });
    }
}

/**
 * Display error message to user
 */
function displayError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #e74c3c;
        color: white;
        padding: 15px 30px;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 9999;
        font-size: 14px;
        font-weight: 500;
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        errorDiv.style.opacity = '0';
        errorDiv.style.transition = 'opacity 0.5s ease';
        setTimeout(() => errorDiv.remove(), 500);
    }, 5000);
}

/**
 * Refresh all visualizations
 */
function refreshAllVisualizations() {
    console.log('Refreshing all visualizations...');
    initializeVisualizations();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Starting COVID Analysis Dashboard');
    initializeCovidAnalysis();
});

// Export functions for external use
window.covidAnalysis = {
    refresh: refreshAllVisualizations,
    getCurrentCountries: () => ({ country1: currentCountry1, country2: currentCountry2 }),
    getData: () => covidData
};
