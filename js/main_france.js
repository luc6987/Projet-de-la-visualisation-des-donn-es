
function parseYearWeek(yearWeek) {
    if (!yearWeek) return null;
    const [year, week] = yearWeek.split('-W');
    const date = new Date(year, 0, 1 + (week - 1) * 7);
    return date;
}


document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 France Regional Analysis page loaded');
    
    console.log('🗺️ Initializing France map...');
    let highlightRegionFunc = null;
    try {
        const { drawFranceMap, highlightRegion } = await import('./map_france.js?v=42');
        drawFranceMap('#mapArea');
        highlightRegionFunc = highlightRegion;
        console.log('✅ France map initialized');
        
        highlightRegion('all');
    } catch (error) {
        console.error('❌ Failed to initialize France map:', error);
    }
    
    const regionSelect = document.getElementById('regionSelect');
    if (regionSelect) {
        regionSelect.addEventListener('change', function() {
            const selectedRegion = this.value;
            console.log('🎯 Region selected:', selectedRegion);
            
    
            setTimeout(() => {
                if (highlightRegionFunc) {
                    console.log('📞 Calling highlightRegion with:', selectedRegion);
                    highlightRegionFunc(selectedRegion);
                } else {
                    console.error('❌ highlightRegion function not available');
                }
            }, 100);
        });
    } else {
        console.warn('⚠️ regionSelect element not found');
    }

});
