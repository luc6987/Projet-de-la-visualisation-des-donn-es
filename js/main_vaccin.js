
import { CleanVaccin } from './clean.js?v=2';
import { plotPyramidBarCharts } from './barPlot.js?v=3';
import { plotCumulativeUptake } from './tsPlot.js?v=3';
import { createMapViz, highlightCountries, addCovidOverlay, showCovidStats, setFranceClickHandler } from './map_eu.js?v=8';
import { plotTwoCountryComparison } from './kernelPlot.js?v=3';
import { plotVaccinationHeatmap } from './heatmap.js?v=6';
import { drawFranceMap } from './map_france.js?v=38';

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

// Function to create France statistics summary
function createFranceStatistics() {
    console.log("📊 Creating France statistics summary...");
    
    // Create statistics container in the bar section
    const barSection = document.getElementById('barSection');
    console.log("📊 barSection element:", barSection);
    console.log("📊 barSection current display:", barSection ? barSection.style.display : 'N/A');
    
    barSection.innerHTML = '';
    barSection.style.display = 'block';
    
    console.log("📊 barSection display set to:", barSection.style.display);
    
    const statsContainer = document.createElement('div');
    statsContainer.id = 'franceStatsContainer';
    statsContainer.style.cssText = `
        width: 100%;
        height: 100%;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 15px;
        padding: 20px;
    `;
    
    statsContainer.innerHTML = `
        <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 15px; box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);">
            <div style="font-size: 14px; color: rgba(255,255,255,0.9); margin-bottom: 8px; font-weight: 500;">📍 Regions Analyzed</div>
            <div id="statRegions" style="font-size: 32px; font-weight: bold; color: #fff; margin-bottom: 5px;">13</div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.7);">Metropolitan France</div>
        </div>
        
        <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 15px; box-shadow: 0 8px 20px rgba(240, 147, 251, 0.3);">
            <div style="font-size: 14px; color: rgba(255,255,255,0.9); margin-bottom: 8px; font-weight: 500;">👥 Gender Gap</div>
            <div id="statGenderGap" style="font-size: 32px; font-weight: bold; color: #fff; margin-bottom: 5px;">...</div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.7);">Female vs Male coverage</div>
        </div>
        
        <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 15px; box-shadow: 0 8px 20px rgba(79, 172, 254, 0.3);">
            <div style="font-size: 14px; color: rgba(255,255,255,0.9); margin-bottom: 8px; font-weight: 500;">💉 Total Vaccinations</div>
            <div id="statTotalVaccinations" style="font-size: 32px; font-weight: bold; color: #fff; margin-bottom: 5px;">...</div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.7);">Complete doses administered</div>
        </div>
        
        <div class="stat-card" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 20px; border-radius: 15px; box-shadow: 0 8px 20px rgba(250, 112, 154, 0.3);">
            <div style="font-size: 14px; color: rgba(255,255,255,0.9); margin-bottom: 8px; font-weight: 500;">🎯 Avg Coverage</div>
            <div id="statAvgCoverage" style="font-size: 32px; font-weight: bold; color: #fff; margin-bottom: 5px;">...</div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.7);">All regions combined</div>
        </div>
        
        <div class="stat-card" style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); padding: 20px; border-radius: 15px; box-shadow: 0 8px 20px rgba(168, 237, 234, 0.3);">
            <div style="font-size: 14px; color: rgba(50,50,50,0.9); margin-bottom: 8px; font-weight: 500;">👴 Elderly Coverage</div>
            <div id="statElderlyCoverage" style="font-size: 32px; font-weight: bold; color: #333; margin-bottom: 5px;">...</div>
            <div style="font-size: 11px; color: rgba(50,50,50,0.7);">Ages 65+ complete vaccination</div>
        </div>
        
        <div class="stat-card" style="background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); padding: 20px; border-radius: 15px; box-shadow: 0 8px 20px rgba(255, 236, 210, 0.3);">
            <div style="font-size: 14px; color: rgba(50,50,50,0.9); margin-bottom: 8px; font-weight: 500;">👶 Youth Coverage</div>
            <div id="statYouthCoverage" style="font-size: 32px; font-weight: bold; color: #333; margin-bottom: 5px;">...</div>
            <div style="font-size: 11px; color: rgba(50,50,50,0.7);">Ages 18-39 complete vaccination</div>
        </div>
        
        <div class="stat-card" style="background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); padding: 20px; border-radius: 15px; box-shadow: 0 8px 20px rgba(255, 154, 158, 0.3);">
            <div style="font-size: 14px; color: rgba(255,255,255,0.9); margin-bottom: 8px; font-weight: 500;">🔄 Booster Rate</div>
            <div id="statBoosterRate" style="font-size: 32px; font-weight: bold; color: #fff; margin-bottom: 5px;">...</div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.7);">Population with 1st booster</div>
        </div>
        
        <div class="stat-card" style="background: linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%); padding: 20px; border-radius: 15px; box-shadow: 0 8px 20px rgba(251, 194, 235, 0.3);">
            <div style="font-size: 14px; color: rgba(255,255,255,0.9); margin-bottom: 8px; font-weight: 500;">🏆 Top Region</div>
            <div id="statTopRegion" style="font-size: 20px; font-weight: bold; color: #fff; margin-bottom: 5px;">...</div>
            <div id="statTopRegionCov" style="font-size: 11px; color: rgba(255,255,255,0.7);">Highest coverage rate</div>
        </div>
    `;
    
    barSection.appendChild(statsContainer);
    
    console.log("📊 Stats container appended to barSection");
    console.log("📊 barSection children:", barSection.children.length);
    
    // Load the statistics calculation script
    if (!window.franceStatsLoaded) {
        const script = document.createElement('script');
        script.src = 'js/france_stats.js?v=' + Date.now();
        script.onload = () => {
            console.log("✅ France statistics script loaded");
            window.franceStatsLoaded = true;
            // Call the function after script loads
            if (window.updateFranceStatistics) {
                window.updateFranceStatistics();
            }
        };
        script.onerror = () => {
            console.error("❌ Failed to load France statistics script");
        };
        document.body.appendChild(script);
    } else {
        if (window.updateFranceStatistics) {
            window.updateFranceStatistics();
        }
    }
}

// Function to load age-based vaccination visualization
function loadAgeVisualization() {
    console.log("📊 Loading age-based vaccination visualization...");
    
    // Create age chart container in the heatmap section
    const heatmapSection = document.getElementById('heatmapSection');
    heatmapSection.innerHTML = '';
    
    const ageContainer = document.createElement('div');
    ageContainer.id = 'ageStackedContainer';
    ageContainer.style.cssText = `
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    `;
    
    ageContainer.innerHTML = `
        <div class="chart-card" style="height: 100%; display: flex; flex-direction: column;">
            <div class="card-header" style="margin-bottom: 10px; flex-shrink: 0;">
                <h2 style="font-size: 1.1rem; color: #fff; margin-bottom: 3px;">📈 Vaccination by Age Group</h2>
                <p style="font-size: 0.75rem; color: #c4b5fd;">Booster progression across age groups</p>
            </div>
            
            <div id="stackedAreaChart" class="chart-container" style="width: 100%; height: 450px;"></div>
        </div>
    `;
    
    heatmapSection.appendChild(ageContainer);
    
    // Load the age_vaccin_fr.js script dynamically (only if not already loaded)
    if (!window.ageVizLoaded) {
        const script = document.createElement('script');
        script.src = 'js/age_vaccin_fr.js?v=' + Date.now();
        script.onload = () => {
            console.log("✅ Age visualization script loaded");
            window.ageVizLoaded = true;
        };
        script.onerror = () => {
            console.error("❌ Failed to load age visualization script");
        };
        document.body.appendChild(script);
    } else {
        // Script already loaded, just initialize
        if (window.initDashboard) {
            window.initDashboard();
        }
    }
}

// Function to load gender vaccination visualization
function loadGenderVisualization() {
    console.log("👥 Loading gender vaccination visualization...");
    
    // Create gender pyramid container in the kernel section
    const kernelSection = document.getElementById('kernelSection');
    kernelSection.innerHTML = '';
    
    const genderContainer = document.createElement('div');
    genderContainer.id = 'genderPyramidContainer';
    genderContainer.style.cssText = `
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    `;
    
    genderContainer.innerHTML = `
        <div class="chart-card" style="height: 100%; display: flex; flex-direction: column; overflow: hidden;">
            <div class="card-header" style="margin-bottom: 10px; flex-shrink: 0;">
                <h2 style="font-size: 1.1rem; color: #fff; margin-bottom: 3px;">📊 Gender Comparison by Region</h2>
                <p style="font-size: 0.75rem; color: #c4b5fd;">Male (left) vs Female (right) • Population Pyramid</p>
            </div>
            
            <!-- Vaccine Type Selector -->
            <div class="vaccine-selector" style="display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: nowrap; justify-content: center; flex-shrink: 0;">
                <button class="vaccine-btn active" data-type="complete" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: 2px solid #a78bfa; border-radius: 8px; padding: 4px 8px; color: #fff; font-size: 10px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; gap: 4px; backdrop-filter: blur(10px);">
                    <span class="btn-icon" style="font-size: 11px;">💉</span>
                    <span class="btn-label" style="letter-spacing: 0.3px;">Complete</span>
                </button>
                <button class="vaccine-btn" data-type="dose1" style="background: rgba(255, 255, 255, 0.08); border: 2px solid rgba(167, 139, 250, 0.3); border-radius: 8px; padding: 4px 8px; color: #e0d5ff; font-size: 10px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; gap: 4px; backdrop-filter: blur(10px);">
                    <span class="btn-icon" style="font-size: 11px;">1️⃣</span>
                    <span class="btn-label" style="letter-spacing: 0.3px;">Dose 1</span>
                </button>
                <button class="vaccine-btn" data-type="booster1" style="background: rgba(255, 255, 255, 0.08); border: 2px solid rgba(167, 139, 250, 0.3); border-radius: 8px; padding: 4px 8px; color: #e0d5ff; font-size: 10px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; gap: 4px; backdrop-filter: blur(10px);">
                    <span class="btn-icon" style="font-size: 11px;">🔄</span>
                    <span class="btn-label" style="letter-spacing: 0.3px;">Boost 1</span>
                </button>
                <button class="vaccine-btn" data-type="booster2" style="background: rgba(255, 255, 255, 0.08); border: 2px solid rgba(167, 139, 250, 0.3); border-radius: 8px; padding: 4px 8px; color: #e0d5ff; font-size: 10px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; gap: 4px; backdrop-filter: blur(10px);">
                    <span class="btn-icon" style="font-size: 11px;">🔄</span>
                    <span class="btn-label" style="letter-spacing: 0.3px;">Boost 2</span>
                </button>
            </div>
            
            <div id="pyramidChart" class="chart-container" style="width: 100%; flex: 1; min-height: 0; overflow: auto;"></div>
        </div>
    `;
    
    kernelSection.appendChild(genderContainer);
    
    // Load the gender_vaccin.js script dynamically (only if not already loaded)
    if (!window.genderVizLoaded) {
        const script = document.createElement('script');
        script.src = 'js/gender_vaccin_fr.js?v=1' + Date.now();
        script.onload = () => {
            console.log("✅ Gender visualization script loaded");
            window.genderVizLoaded = true;
        
        // Add hover styles for buttons
        const buttons = document.querySelectorAll('.vaccine-btn');
        buttons.forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                if (!btn.classList.contains('active')) {
                    btn.style.background = 'rgba(255, 255, 255, 0.15)';
                    btn.style.borderColor = 'rgba(167, 139, 250, 0.6)';
                    btn.style.transform = 'translateY(-2px)';
                    btn.style.boxShadow = '0 5px 20px rgba(167, 139, 250, 0.3)';
                }
            });
            btn.addEventListener('mouseleave', () => {
                if (!btn.classList.contains('active')) {
                    btn.style.background = 'rgba(255, 255, 255, 0.08)';
                    btn.style.borderColor = 'rgba(167, 139, 250, 0.3)';
                    btn.style.transform = '';
                    btn.style.boxShadow = '';
                }
            });
        });
        };
        script.onerror = () => {
            console.error("❌ Failed to load gender visualization script");
        };
        document.body.appendChild(script);
    } else {
        // Script already loaded, just initialize
        if (window.initDashboard) {
            window.initDashboard();
        }
    }
}

function createMapVisualization(vaccinData) {
    console.log("🗺️  Creating geographic map...");
    createMapViz(vaccinData);
    
    // Define France click handler function
    const showFranceMap = () => {
        console.log("🇫🇷 France clicked - loading detailed map...");
        
        // Remove any existing tooltips from Europe map
        d3.selectAll('.map-tooltip').remove();
        
        // Hide ts sections and control elements, keep bar for statistics
        const barSection = document.getElementById('barSection');
        const tsSection = document.getElementById('tsSection');
        const mapStats = document.getElementById('mapStats');
        const globalControls = document.querySelector('.global-controls');
        const toggleAnalysisBtn = document.getElementById('toggleAnalysisBtn');
        
        // Keep bar section visible for statistics display
        if (barSection) barSection.style.display = 'block';
        if (tsSection) tsSection.style.display = 'none';
        if (mapStats) mapStats.style.display = 'none';
        if (globalControls) globalControls.style.display = 'none';
        if (toggleAnalysisBtn) toggleAnalysisBtn.parentElement.style.display = 'none';
        
        // Ensure kernel and heatmap sections are visible for France visualizations
        const kernelSection = document.getElementById('kernelSection');
        const heatmapSection = document.getElementById('heatmapSection');
        if (kernelSection) kernelSection.style.display = 'block';
        if (heatmapSection) heatmapSection.style.display = 'block';
        
        // Clear the map area and create France map
        const mapArea = document.getElementById('mapArea');
        mapArea.innerHTML = '';
        
        // Create container for France map
        const franceMapContainer = document.createElement('div');
        franceMapContainer.id = 'franceMapContainer';
        franceMapContainer.style.cssText = `
            width: 100%;
            height: 100%;
            position: relative;
        `;
        
        mapArea.appendChild(franceMapContainer);
        
        // Load France statistics summary
        createFranceStatistics();
        
        // Load gender vaccination visualization
        loadGenderVisualization();
        
        // Load age-based vaccination visualization
        loadAgeVisualization();
        
        // Function to return to Europe map
        const returnToEurope = () => {
            console.log("↩️ Returning to Europe map...");
            document.removeEventListener('click', handleOutsideClick, true);
            
            // Remove any tooltips from France map
            d3.selectAll('.map-tooltip').remove();
            
            // Show all visualization sections and controls again
            const barSection = document.getElementById('barSection');
            const tsSection = document.getElementById('tsSection');
            const heatmapSection = document.getElementById('heatmapSection');
            const mapStats = document.getElementById('mapStats');
            const kernelSection = document.getElementById('kernelSection');
            const globalControls = document.querySelector('.global-controls');
            const toggleAnalysisBtn = document.getElementById('toggleAnalysisBtn');
            
            if (barSection) barSection.style.display = '';
            if (tsSection) tsSection.style.display = '';
            if (heatmapSection) {
                heatmapSection.style.display = '';
                // Clear heatmap section and restore it
                heatmapSection.innerHTML = '<div id="heatmap" class="flex-1 overflow-hidden"></div>';
            }
            if (mapStats) mapStats.style.display = '';
            if (kernelSection) {
                kernelSection.style.display = '';
                // Clear kernel section and restore it
                kernelSection.innerHTML = '<div id="chart" role="img" aria-label="Kernel density plot comparing vaccination distribution between countries" class="flex-1 overflow-hidden"></div>';
            }
            if (globalControls) globalControls.style.display = '';
            if (toggleAnalysisBtn) toggleAnalysisBtn.parentElement.style.display = '';
            
            // Clear France statistics container
            const franceStatsContainer = document.getElementById('franceStatsContainer');
            if (franceStatsContainer) {
                franceStatsContainer.remove();
            }
            
            // Restore bar section
            if (barSection) {
                barSection.innerHTML = '<h2 class="mb-4 text-white text-lg sm:text-xl lg:text-2xl font-semibold">Vaccination Doses by Year (2020-2023)</h2><div id="barPlot" role="img" aria-label="Bar chart showing vaccination doses by year for selected countries" class="flex-1 overflow-hidden"></div>';
            }
            
            // Clear gender visualization container
            const genderContainer = document.getElementById('genderPyramidContainer');
            if (genderContainer) {
                genderContainer.remove();
            }
            
            // Clear age visualization container
            const ageContainer = document.getElementById('ageStackedContainer');
            if (ageContainer) {
                ageContainer.remove();
            }
            
            // Remove dynamically loaded scripts
            const genderScript = document.querySelector('script[src*="gender_vaccin_fr.js"]');
            if (genderScript) {
                genderScript.remove();
            }
            
            const ageScript = document.querySelector('script[src*="age_vaccin_fr.js"]');
            if (ageScript) {
                ageScript.remove();
            }
            
            // Restore map area
            mapArea.innerHTML = '';
            createMapVisualization(vaccinData);
            
            // Re-initialize all charts with current selections
            const country1 = document.getElementById('globalCountry1Select')?.value || 'FR';
            const country2 = document.getElementById('globalCountry2Select')?.value || 'IT';
            const doseType = document.getElementById('doseTypeSelect')?.value || 'SecondDose';
            
            // Recreate visualizations
            plotPyramidBarCharts(globalVaccinData, country1, country2, 2020, 2023);
            plotCumulativeUptake(globalVaccinData, [country1, country2], doseType);
            plotTwoCountryComparison(globalVaccinData, country1, country2);
            plotVaccinationHeatmap(globalVaccinData, country1, country2, 2021, 2022, doseType);
        };
        
        // Handler for clicks outside - use capture phase
        const handleOutsideClick = (e) => {
            const target = e.target;
            console.log("Click detected on:", target.tagName, target.id, target.className);
            
            // Don't close if clicking on vaccine buttons in gender pyramid
            if (target.closest('.vaccine-selector') || 
                target.classList?.contains('vaccine-btn') ||
                target.closest('.vaccine-btn')) {
                console.log("Click on vaccine selector buttons - ignoring");
                return;
            }
            
            // Don't close if clicking inside gender pyramid chart
            if (target.closest('#pyramidChart') || target.id === 'pyramidChart') {
                console.log("Click on gender pyramid chart - ignoring");
                return;
            }
            
            // Don't close if clicking inside the gender pyramid container
            if (target.closest('#genderPyramidContainer') || target.id === 'genderPyramidContainer') {
                console.log("Click on gender pyramid container - ignoring");
                return;
            }
            
            // Don't close if clicking inside age stacked area chart
            if (target.closest('#stackedAreaChart') || target.id === 'stackedAreaChart') {
                console.log("Click on age stacked area chart - ignoring");
                return;
            }
            
            // Don't close if clicking inside the age stacked container
            if (target.closest('#ageStackedContainer') || target.id === 'ageStackedContainer') {
                console.log("Click on age stacked container - ignoring");
                return;
            }
            
            // Don't close if clicking inside heatmap section (contains age viz)
            const heatmapSection = document.getElementById('heatmapSection');
            if (heatmapSection && heatmapSection.contains(target)) {
                console.log("Click inside heatmap section - ignoring");
                return;
            }
            
            // Don't close if clicking on France map SVG or its elements
            const franceMapContainer = document.getElementById('franceMapContainer');
            if (franceMapContainer && franceMapContainer.contains(target)) {
                console.log("Click inside France map container - ignoring");
                return;
            }
            
            // Don't close if clicking on vaccine control buttons (France map)
            if (target.closest('.vaccine-controls') || 
                target.classList?.contains('vaccine-type-button') ||
                target.classList?.contains('vaccine-controls')) {
                console.log("Click on France map vaccine controls - ignoring");
                return;
            }
            
            // Don't close if clicking inside the kernel section (contains gender pyramid)
            const kernelSection = document.getElementById('kernelSection');
            if (kernelSection && kernelSection.contains(target)) {
                console.log("Click inside kernel section - ignoring");
                return;
            }
            
            // Don't close if clicking inside map section
            const mapSection = document.getElementById('mapSection');
            if (mapSection && mapSection.contains(target)) {
                console.log("Click inside map section - ignoring");
                return;
            }
            
            // Close for any other click (outside both visualizations)
            console.log("Click outside all France visualizations - closing France map");
            returnToEurope();
        };
        
        // Draw France map first
        drawFranceMap('#franceMapContainer');
        
        // Add click listener after a short delay to prevent immediate closing
        setTimeout(() => {
            console.log("🎯 Click-outside listener activated");
            document.addEventListener('click', handleOutsideClick, true);
        }, 200);
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