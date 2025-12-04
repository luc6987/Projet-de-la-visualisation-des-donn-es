// Main script for Age Group Analysis page
import { createStackedBarChart, createCumulativeLineChart } from './age_group_viz.js?v=27';
import { createMapViz, highlightCountries } from './map_eu.js?v=28';

// Country code to full name mapping
const countryNames = {
    'AT': 'Austria',
    'BE': 'Belgium',
    'BG': 'Bulgaria',
    'CY': 'Cyprus',
    'CZ': 'Czechia',
    'DE': 'Germany',
    'DK': 'Denmark',
    'EE': 'Estonia',
    'EL': 'Greece',
    'ES': 'Spain',
    'FI': 'Finland',
    'FR': 'France',
    'HR': 'Croatia',
    'HU': 'Hungary',
    'IE': 'Ireland',
    'IS': 'Iceland',
    'IT': 'Italy',
    'LI': 'Liechtenstein',
    'LT': 'Lithuania',
    'LU': 'Luxembourg',
    'LV': 'Latvia',
    'MT': 'Malta',
    'NL': 'Netherlands',
    'NO': 'Norway',
    'PL': 'Poland',
    'PT': 'Portugal',
    'RO': 'Romania',
    'SE': 'Sweden',
    'SI': 'Slovenia',
    'SK': 'Slovakia'
};

// Parse YearWeek format (e.g., "2020-W01") to Date
function parseYearWeek(yearWeek) {
    if (!yearWeek) return null;
    const [year, week] = yearWeek.split('-W');
    const date = new Date(year, 0, 1 + (week - 1) * 7);
    return date;
}

// Initialize the page
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Age Group Analysis page loaded');
    
    // Initialize the map
    console.log('🗺️ Initializing Europe map...');
    createMapViz();
    
    // Get country selector
    const countrySelect = document.getElementById('globalCountry1Select');
    
    // Load country list
    try {
        const data = await d3.csv('data/vaccin.csv');
        
        // Get unique countries
        const countries = [...new Set(data.map(d => d.ReportingCountry))].sort();
        
        // Add EU option at the beginning
        const euOption = document.createElement('option');
        euOption.value = 'EU';
        euOption.textContent = 'European Union (All Countries)';
        countrySelect.appendChild(euOption);
        
        // Populate country selector with full names
        countries.forEach(countryCode => {
            const option = document.createElement('option');
            option.value = countryCode;
            option.textContent = countryNames[countryCode] || countryCode;
            countrySelect.appendChild(option);
        });
        
        // Set default country to France
        countrySelect.value = 'FR';
        
        // Load initial visualizations
        loadAgeGroupVisualizations('FR');
        
        // Add event listener for country change
        countrySelect.addEventListener('change', function() {
            const selectedCountry = this.value;
            console.log('🔄 Country changed to:', selectedCountry);
            loadAgeGroupVisualizations(selectedCountry);
            
            // Highlight selected country on map
            highlightCountries(selectedCountry, selectedCountry);
        });
        
    } catch (error) {
        console.error('❌ Error loading country list:', error);
    }
});

// Load and display age group visualizations
async function loadAgeGroupVisualizations(country) {
    console.log('📊 Loading age group visualizations for', country);
    
    try {
        const rawData = await d3.csv('data/vaccin.csv');
        console.log('📂 Vaccination data loaded:', rawData.length, 'rows');
        
        // Clean and filter data for selected country or all EU countries
        // Accept both detailed age groups (Age5_9, Age10_14, etc.) and broader categories (1_Age<60, 1_Age60+, Age<18)
        const countryData = rawData
            .filter(d => {
                // Filter by country: either specific country or all EU countries
                const countryMatch = (country === 'EU') ? true : (d.ReportingCountry === country);
                if (!countryMatch || !d.TargetGroup) return false;
                
                const tg = d.TargetGroup;
                
                // Exclude these categories
                if (tg === 'AgeUNK' || tg === 'ALL') return false;
                
                // Accept detailed age groups (Age5_9, Age10_14, etc.)
                if (tg.startsWith('Age') && tg.match(/Age\d+/)) return true;
                
                // Accept broader age categories for countries like Germany
                if (tg === 'Age<18' || tg === '1_Age<60' || tg === '1_Age60+') return true;
                
                return false;
            })
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
        
        console.log('✅ Filtered data:', countryData.length, 'rows for', country);
        
        // Clear previous visualizations
        d3.select('#tsPlotAgeGroup').selectAll('*').remove();
        d3.select('#barPlotAgeGroup').selectAll('*').remove();
        
        // Create visualizations
        if (countryData.length > 0) {
            createCumulativeLineChart('#tsPlotAgeGroup', countryData, country);
            createStackedBarChart('#barPlotAgeGroup', countryData, country);
            console.log('✅ Age group visualizations created');
        } else {
            console.warn('⚠️ No data available for', country);
            d3.select('#tsPlotAgeGroup').append('p')
                .attr('class', 'text-white text-center p-4')
                .text('No age group data available for this country');
            d3.select('#barPlotAgeGroup').append('p')
                .attr('class', 'text-white text-center p-4')
                .text('No age group data available for this country');
        }
        
    } catch (error) {
        console.error('❌ Error loading vaccination data:', error);
    }
}
