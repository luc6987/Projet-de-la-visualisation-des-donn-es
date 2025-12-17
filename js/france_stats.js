
async function updateFranceStatistics() {
    console.log("📊 Calculating France vaccination statistics...");
    
    try {
        const genderData = await d3.dsv(';', 'data/vacsi-tot-s-reg-2023-07-13-15h51.csv');
        const ageData = await d3.dsv(';', 'data/vacsi-tot-a-reg-2023-07-13-15h50.csv');
        
        const regionNames = {
            '11': 'Île-de-France', '24': 'Centre-Val de Loire', '27': 'Bourgogne-Franche-Comté',
            '28': 'Normandie', '32': 'Hauts-de-France', '44': 'Grand Est',
            '52': 'Pays de la Loire', '53': 'Bretagne', '75': 'Nouvelle-Aquitaine',
            '76': 'Occitanie', '84': 'Auvergne-Rhône-Alpes', '93': 'Provence-Alpes-Côte d\'Azur',
            '94': 'Corse'
        };
        
        const overseasRegions = ['01', '02', '03', '04', '06', '07', '08'];
        
        const metroGenderData = genderData.filter(d => 
            !overseasRegions.includes(d.reg) && regionNames[d.reg]
        );
        
        const metroAgeData = ageData.filter(d => 
            !overseasRegions.includes(d.reg) && regionNames[d.reg]
        );
        
        const totalVaccinations = d3.sum(metroGenderData, d => parseFloat(d.n_tot_complet) || 0);
        const totalMillions = (totalVaccinations / 1000000).toFixed(1);
        const totalVacElement = document.getElementById('statTotalVaccinations');
        if (totalVacElement) totalVacElement.textContent = totalMillions + 'M';
        
        const allRegionsData = metroGenderData.filter(d => d.sexe === '0');
        const avgCoverage = d3.mean(allRegionsData, d => parseFloat(d.couv_tot_complet));
        const avgCovElement = document.getElementById('statAvgCoverage');
        if (avgCovElement) avgCovElement.textContent = avgCoverage.toFixed(1) + '%';
        
        const boosterData = metroGenderData.filter(d => d.sexe === '0');
        const avgBoosterCov = d3.mean(boosterData, d => parseFloat(d.couv_tot_rappel));
        const boosterElement = document.getElementById('statBoosterRate');
        if (boosterElement) boosterElement.textContent = avgBoosterCov.toFixed(1) + '%';
        
        console.log("✅ Statistics updated successfully");
        console.log(`Total vaccinations: ${totalMillions}M`);
        console.log(`Average coverage: ${avgCoverage.toFixed(1)}%`);
        console.log(`Booster rate: ${avgBoosterCov.toFixed(1)}%`);
        
    } catch (error) {
        console.error("❌ Error calculating statistics:", error);
        const totalVacElement = document.getElementById('statTotalVaccinations');
        const avgCovElement = document.getElementById('statAvgCoverage');
        const boosterElement = document.getElementById('statBoosterRate');
        
        if (totalVacElement) totalVacElement.textContent = 'Error';
        if (avgCovElement) avgCovElement.textContent = 'Error';
        if (boosterElement) boosterElement.textContent = 'Error';
    }
}

window.updateFranceStatistics = updateFranceStatistics;
