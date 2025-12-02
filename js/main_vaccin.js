
import { CleanVaccin } from './clean.js?v=2';
import { plotPyramidBarCharts } from './barPlot.js?v=3';
import { plotCumulativeUptake } from './tsPlot.js?v=3';
import { createMapViz, highlightCountries, addCovidOverlay, showCovidStats, setFranceClickHandler } from './map_eu.js?v=8';
import { plotTwoCountryComparison } from './kernelPlot.js?v=3';
import { plotVaccinationHeatmap } from './heatmap.js?v=6';
import { drawFranceMap } from './map_france.js?v=38';
import { createStackedBarChart, createCumulativeLineChart, createEUMedianBarChart, createEUMedianLineChart } from './age_group_viz.js?v=17';

window.__dashboardMode = true;

function parseYearWeek(yearWeek) {
    const [year, week] = yearWeek.split('-W');
    const date = new Date(year, 0, 1 + (week - 1) * 7);
    return date;
}

let globalVaccinData = null;
let isAgeGroupMode = false; 

// ============================================
// CONFIGURATION
// ============================================

const config = {
    DEFAULT_COUNTRY: 'FR',  
    DEFAULT_YEAR: 2020,
    
    TS_COUNTRIES: ['FR', 'DE', 'IT', 'ES', 'PL', 'RO', 'NL', 'BE', 'CZ', 'PT'],
    
    DOSE_TYPES: ['FirstDose', 'SecondDose', 'DoseAdditional1']
};

// ============================================
// MAP VISUALIZATION MODULE
// ============================================

function createFranceStatistics() {
    console.log("📊 Creating France statistics summary...");
    
    const barSectionDefault = document.getElementById('barSectionDefault');

    barSectionDefault.innerHTML = '';
    barSectionDefault.style.display = 'block';
    
    const statsContainer = document.createElement('div');
    statsContainer.id = 'franceStatsContainer';
    statsContainer.style.cssText = `
        width: 100%;
        max-width: 280px;
        margin: 10px auto;
        padding: 15px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 12px;
        box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
    `;
    
    statsContainer.innerHTML = `
        <div style="text-align: center; color: white;">
            <div style="font-size: 18px; font-weight: 600; margin-bottom: 15px; color: rgba(255,255,255,0.95);">
                🇫🇷 France Overview
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; text-align: left;">
                <div>
                    <div style="font-size: 11px; color: rgba(255,255,255,0.8); margin-bottom: 4px;">📍 Regions</div>
                    <div id="statRegions" style="font-size: 24px; font-weight: bold; color: #fff;">13</div>
                </div>
                
                <div>
                    <div style="font-size: 11px; color: rgba(255,255,255,0.8); margin-bottom: 4px;">💉 Total Doses</div>
                    <div id="statTotalVaccinations" style="font-size: 24px; font-weight: bold; color: #fff;">...</div>
                </div>
                
                <div>
                    <div style="font-size: 11px; color: rgba(255,255,255,0.8); margin-bottom: 4px;">🎯 Coverage</div>
                    <div id="statAvgCoverage" style="font-size: 24px; font-weight: bold; color: #fff;">...</div>
                </div>
                
                <div>
                    <div style="font-size: 11px; color: rgba(255,255,255,0.8); margin-bottom: 4px;">🔄 Booster</div>
                    <div id="statBoosterRate" style="font-size: 24px; font-weight: bold; color: #fff;">...</div>
                </div>
            </div>
        </div>
    `;
    
    barSectionDefault.appendChild(statsContainer);
    
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
        <div class="chart-card" style="height: 100%; display: flex; flex-direction: column; overflow: hidden;">
            <div class="card-header" style="margin-bottom: 10px; flex-shrink: 0;">
                <h2 style="font-size: 1.1rem; color: #fff; margin-bottom: 3px;">📈 Vaccination by Age Group</h2>
                <p style="font-size: 0.75rem; color: #c4b5fd;">Booster progression across age groups</p>
            </div>
            
            <div id="stackedAreaChart" class="chart-container" style="width: 100%; height: 350px; overflow: hidden;"></div>
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

        if (window.initDashboard) {
            window.initDashboard();
        }
    }
}


function loadGenderVisualization() {
    console.log("👥 Loading gender vaccination visualization...");
    
    // Place gender pyramid in tsSectionDefault (where tsPlot resides)
    const tsSectionDefault = document.getElementById('tsSectionDefault');
    tsSectionDefault.innerHTML = '';
    tsSectionDefault.style.display = 'block';
    tsSectionDefault.style.height = 'auto';
    tsSectionDefault.style.maxHeight = '400px';
    tsSectionDefault.style.marginTop = '-20px';
    
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
            
            <div id="pyramidChart" class="chart-container" style="width: 100%; flex: 1; min-height: 0; overflow: hidden;"></div>
        </div>
    `;
    
    tsSectionDefault.appendChild(genderContainer);
    
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
        
        // Hide sections and control elements, keep bar for statistics
        const barSection = document.getElementById('barSection');
        const tsSection = document.getElementById('tsSection');
        const barSectionDefault = document.getElementById('barSectionDefault');
        const tsSectionDefault = document.getElementById('tsSectionDefault');
        const mapStats = document.getElementById('mapStats');
        const globalControls = document.querySelector('.global-controls');
        const toggleAnalysisBtn = document.getElementById('toggleAnalysisBtn');
        const kernelSection = document.getElementById('kernelSection');
        
        // Hide barPlot.js and tsPlot.js sections
        if (barSectionDefault) barSectionDefault.style.display = 'none';
        if (tsSectionDefault) tsSectionDefault.style.display = 'none';
        
        // Hide header sections (used for Age Group mode)
        if (barSection) barSection.style.display = 'none';
        if (tsSection) tsSection.style.display = 'none';
        
        if (mapStats) mapStats.style.display = 'none';
        if (globalControls) globalControls.style.display = 'none';
        if (toggleAnalysisBtn) toggleAnalysisBtn.parentElement.style.display = 'none';
        if (kernelSection) kernelSection.style.display = 'none'; 
        
        // Ensure heatmap section is visible for France age visualization
        const heatmapSection = document.getElementById('heatmapSection');
        if (heatmapSection) heatmapSection.style.display = 'block';
        
        // Clear the map area and create France map
        const mapArea = document.getElementById('mapArea');
        mapArea.innerHTML = '';
        
        // Adjust map section height for France to fit without scrolling
        const mapSection = document.getElementById('mapSection');
        if (mapSection) {
            mapSection.style.height = '580px';
        }
        
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
        
        // Draw France map
        console.log('🗺️ Drawing France map in container:', franceMapContainer);
        drawFranceMap('#franceMapContainer');
        console.log('✅ France map drawing initiated');
        
        // Add "Back to Dashboard" button
        if (mapSection && !document.getElementById('backToDashboardBtn')) {
            const backBtn = document.createElement('button');
            backBtn.id = 'backToDashboardBtn';
            backBtn.innerHTML = '← Back to Dashboard';
            backBtn.style.cssText = `
                position: absolute;
                top: 10px;
                left: 10px;
                padding: 8px 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: 2px solid #a78bfa;
                border-radius: 8px;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                z-index: 1000;
                transition: all 0.3s ease;
            `;
            
            backBtn.addEventListener('mouseenter', () => {
                backBtn.style.transform = 'translateY(-2px)';
                backBtn.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.5)';
            });
            
            backBtn.addEventListener('mouseleave', () => {
                backBtn.style.transform = '';
                backBtn.style.boxShadow = '';
            });
            
            backBtn.addEventListener('click', returnToEurope);
            
            mapSection.style.position = 'relative';
            mapSection.appendChild(backBtn);
        }
        
        // Function to return to Europe map
        const returnToEurope = () => {
            console.log("↩️ Returning to Europe map...");
            
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
            if (tsSection) {
                tsSection.style.display = '';
                tsSection.innerHTML = '';
            }
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
            
            // Remove Back to Dashboard button
            const backBtn = document.getElementById('backToDashboardBtn');
            if (backBtn) {
                backBtn.remove();
            }
            
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
                
                const barSection = document.getElementById('barSection');
                const tsSection = document.getElementById('tsSection');
                
                // Update grouped bar chart in tsSection (at top - showing cumulative uptake)
                if (tsSection) {
                    tsSection.style.height = 'auto';
                    tsSection.style.minHeight = '950px';
                    tsSection.style.overflow = 'visible';
                    tsSection.innerHTML = `
                        <h2 class="mb-4 text-white text-lg sm:text-xl lg:text-2xl font-semibold">
                            Cumulative Vaccine Uptake by Age Group - ${country1}
                        </h2>
                        <div id="ageStackedBarChart" style="width: 100%; height: 900px;"></div>
                    `;
                    createStackedBarChart('#ageStackedBarChart', countryData);
                }
                
                // Update cumulative line chart in tsSectionDefault (side panel)
                const tsSectionDefault = document.getElementById('tsSectionDefault');
                if (tsSectionDefault) {
                    tsSectionDefault.style.display = 'block';
                    tsSectionDefault.style.height = 'auto';
                    tsSectionDefault.style.minHeight = '650px';
                    tsSectionDefault.style.overflow = 'visible';
                    tsSectionDefault.innerHTML = `
                        <h2 class="mb-4 text-white text-lg sm:text-xl lg:text-2xl font-semibold">
                            Cumulative Vaccination by Age Group - ${country1}
                        </h2>
                        <div id="ageCumulativeChart" style="width: 100%; height: 600px;"></div>
                    `;
                    createCumulativeLineChart('#ageCumulativeChart', countryData);
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

// ============================================
// AGE GROUP BUTTON MODULE
// ============================================

function createAgeGroupButton() {
    // Find the global controls container
    const globalControls = document.querySelector('.global-controls');
    if (!globalControls) {
        console.warn('⚠️ Global controls container not found');
        return;
    }
    
    // Create Age Group button
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
    
    // Create Reset button (initially hidden)
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
    
    // Add hover effects for Age Group button
    ageGroupBtn.addEventListener('mouseenter', () => {
        ageGroupBtn.style.transform = 'translateY(-2px)';
        ageGroupBtn.style.boxShadow = '0 5px 20px rgba(167, 139, 250, 0.4)';
    });
    
    ageGroupBtn.addEventListener('mouseleave', () => {
        ageGroupBtn.style.transform = '';
        ageGroupBtn.style.boxShadow = '';
    });
    
    // Add click handler to hide all plots except map
    ageGroupBtn.addEventListener('click', () => {
        console.log('📊 Age Group button clicked - showing age group analysis');
        
        // Enable age group mode
        isAgeGroupMode = true;
        
        // Hide sections
        const barSection = document.getElementById('barSection');
        const tsSection = document.getElementById('tsSection');
        const heatmapSection = document.getElementById('heatmapSection');
        const kernelSection = document.getElementById('kernelSection');
        const barSectionDefault = document.getElementById('barSectionDefault');
        
        if (heatmapSection) heatmapSection.style.display = 'none';
        if (kernelSection) kernelSection.style.display = 'none';
        if (barSectionDefault) barSectionDefault.style.display = 'none';
        
        // Hide second country selector
        const country2Container = document.getElementById('globalCountry2Select')?.parentElement;
        if (country2Container) {
            country2Container.style.display = 'none';
        }
        
        // Hide "Vaccin & COVID analysis" button
        const toggleAnalysisBtn = document.getElementById('toggleAnalysisBtn');
        if (toggleAnalysisBtn) {
            toggleAnalysisBtn.parentElement.style.display = 'none';
        }
        const mapStats = document.getElementById('mapStats');
        if (mapStats) {
            mapStats.style.display = 'none';
        }
        
        // Make map section bigger in Age Group mode
        const mapSection = document.getElementById('mapSection');
        if (mapSection) {
            mapSection.style.height = '1000px';
        }
        
        const mapArea = document.getElementById('mapArea');
        if (mapArea) {
            mapArea.style.flex = '1';
            mapArea.style.width = '100%';
            console.log('✅ Map area expanded');
        }
        
        // Update label for country1 selector to be more clear
        const country1Label = document.querySelector('label[for="globalCountry1Select"]');
        if (country1Label) {
            country1Label.textContent = 'Select Country:';
        }
        
        // Get selected country
        const selectedCountry = document.getElementById('globalCountry1Select')?.value || 'FR';
        
        // Load and display age group visualizations
        console.log('📊 Loading age group visualizations for', selectedCountry);
        
        // Load vaccination data
        d3.csv('data/vaccin.csv').then(rawData => {
            console.log('📂 Vaccination data loaded:', rawData.length, 'rows');
            
            // Clean and filter data for selected country and age groups
            const countryData = rawData
                .filter(d => 
                    d.ReportingCountry === selectedCountry && 
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
            
            console.log('✅ Filtered data:', countryData.length, 'rows for', selectedCountry);
            
            const barSection = document.getElementById('barSection');
            const tsSection = document.getElementById('tsSection');
            
            // Setup tsSection for grouped bar chart showing cumulative vaccine uptake
            if (tsSection) {
                tsSection.style.display = 'block';
                tsSection.style.height = 'auto';
                tsSection.style.minHeight = '950px';
                tsSection.style.overflow = 'visible';
                tsSection.innerHTML = `
                    <h2 class="mb-4 text-white text-lg sm:text-xl lg:text-2xl font-semibold">
                        Cumulative Vaccine Uptake by Age Group - ${selectedCountry}
                    </h2>
                    <div id="ageStackedBarChart" style="width: 100%; height: 900px;"></div>
                `;
                
                console.log('📊 About to create bar chart with', countryData.length, 'data points');
                createStackedBarChart('#ageStackedBarChart', countryData);
            }
            
            // Hide barSection in header (not used in age group mode)
            if (barSection) {
                barSection.style.display = 'none';
            }
            
            // Put age group time series in the tsSectionDefault (side panel)
            const tsSectionDefault = document.getElementById('tsSectionDefault');
            if (tsSectionDefault) {
                tsSectionDefault.style.display = 'block';
                tsSectionDefault.style.height = 'auto';
                tsSectionDefault.style.minHeight = '650px';
                tsSectionDefault.style.overflow = 'visible';
                tsSectionDefault.innerHTML = `
                    <h2 class="mb-4 text-white text-lg sm:text-xl lg:text-2xl font-semibold">
                        Cumulative Vaccination by Age Group - ${selectedCountry}
                    </h2>
                    <div id="ageCumulativeChart" style="width: 100%; height: 600px;"></div>
                `;
                
                createCumulativeLineChart('#ageCumulativeChart', countryData);
            }
            
            // Hide kernel section in age group mode
            const kernelSection = document.getElementById('kernelSection');
            if (kernelSection) {
                kernelSection.style.display = 'none';
            }
            
        }).catch(error => {
            console.error('❌ Error loading vaccination data:', error);
        });
        
        ageGroupBtn.style.display = 'none';
        resetBtn.style.display = 'inline-block';
        
        console.log('✅ Age group mode activated');
    });
    
    resetBtn.addEventListener('click', () => {
        console.log('↩️ Reloading page to return to dashboard');
        
        window.location.reload();
    });
    

    globalControls.appendChild(ageGroupBtn);
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

// Initialize dashboard when page loads
window.addEventListener('load', initializeDashboard);


let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        console.log("🔄 Window resized - consider reloading visualizations");
       
    }, 250);
});

console.log("✅ Dashboard controller loaded successfully");