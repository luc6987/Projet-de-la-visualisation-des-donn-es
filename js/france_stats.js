// France Vaccination Statistics Calculator
// Combines data from gender and age datasets for comprehensive insights

async function updateFranceStatistics() {
    console.log("📊 Calculating France vaccination statistics...");
    
    try {
        // Load both datasets
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
        
        // Filter metropolitan regions
        const metroGenderData = genderData.filter(d => 
            !overseasRegions.includes(d.reg) && regionNames[d.reg]
        );
        
        const metroAgeData = ageData.filter(d => 
            !overseasRegions.includes(d.reg) && regionNames[d.reg]
        );
        
        // 1. Gender Gap Calculation
        const maleData = metroGenderData.filter(d => d.sexe === '1');
        const femaleData = metroGenderData.filter(d => d.sexe === '2');
        
        const avgMaleCov = d3.mean(maleData, d => parseFloat(d.couv_tot_complet));
        const avgFemaleCov = d3.mean(femaleData, d => parseFloat(d.couv_tot_complet));
        const genderGap = avgFemaleCov - avgMaleCov;
        
        document.getElementById('statGenderGap').textContent = 
            (genderGap > 0 ? '+' : '') + genderGap.toFixed(1) + '%';
        
        // 2. Total Vaccinations
        const totalVaccinations = d3.sum(metroGenderData, d => parseFloat(d.n_tot_complet) || 0);
        const totalMillions = (totalVaccinations / 1000000).toFixed(1);
        document.getElementById('statTotalVaccinations').textContent = totalMillions + 'M';
        
        // 3. Average Coverage
        const allRegionsData = metroGenderData.filter(d => d.sexe === '0');
        const avgCoverage = d3.mean(allRegionsData, d => parseFloat(d.couv_tot_complet));
        document.getElementById('statAvgCoverage').textContent = avgCoverage.toFixed(1) + '%';
        
        // 4. Elderly Coverage (65+)
        const elderlyAges = ['69', '74', '79', '80'];
        const elderlyData = metroAgeData.filter(d => elderlyAges.includes(d.clage_vacsi));
        const elderlyCoverage = d3.mean(elderlyData, d => parseFloat(d.couv_tot_complet));
        document.getElementById('statElderlyCoverage').textContent = elderlyCoverage.toFixed(1) + '%';
        
        // 5. Youth Coverage (18-39)
        const youthAges = ['24', '29', '39'];
        const youthData = metroAgeData.filter(d => youthAges.includes(d.clage_vacsi));
        const youthCoverage = d3.mean(youthData, d => parseFloat(d.couv_tot_complet));
        document.getElementById('statYouthCoverage').textContent = youthCoverage.toFixed(1) + '%';
        
        // 6. Booster Rate
        const boosterData = metroGenderData.filter(d => d.sexe === '0');
        const avgBoosterCov = d3.mean(boosterData, d => parseFloat(d.couv_tot_rappel));
        document.getElementById('statBoosterRate').textContent = avgBoosterCov.toFixed(1) + '%';
        
        // 7. Top Region
        const regionCoverages = allRegionsData.map(d => ({
            region: regionNames[d.reg],
            coverage: parseFloat(d.couv_tot_complet)
        }));
        
        const topRegion = regionCoverages.reduce((max, r) => 
            r.coverage > max.coverage ? r : max
        );
        
        document.getElementById('statTopRegion').textContent = topRegion.region;
        document.getElementById('statTopRegionCov').textContent = 
            'Coverage: ' + topRegion.coverage.toFixed(1) + '%';
        
        console.log("✅ Statistics updated successfully");
        console.log(`Gender gap: ${genderGap.toFixed(1)}%`);
        console.log(`Total vaccinations: ${totalMillions}M`);
        console.log(`Average coverage: ${avgCoverage.toFixed(1)}%`);
        console.log(`Elderly coverage: ${elderlyCoverage.toFixed(1)}%`);
        console.log(`Youth coverage: ${youthCoverage.toFixed(1)}%`);
        console.log(`Booster rate: ${avgBoosterCov.toFixed(1)}%`);
        console.log(`Top region: ${topRegion.region} (${topRegion.coverage.toFixed(1)}%)`);
        
    } catch (error) {
        console.error("❌ Error calculating statistics:", error);
        document.getElementById('statGenderGap').textContent = 'Error';
        document.getElementById('statTotalVaccinations').textContent = 'Error';
        document.getElementById('statAvgCoverage').textContent = 'Error';
        document.getElementById('statElderlyCoverage').textContent = 'Error';
        document.getElementById('statYouthCoverage').textContent = 'Error';
        document.getElementById('statBoosterRate').textContent = 'Error';
        document.getElementById('statTopRegion').textContent = 'Error';
    }
}

// Export function to global scope
window.updateFranceStatistics = updateFranceStatistics;
