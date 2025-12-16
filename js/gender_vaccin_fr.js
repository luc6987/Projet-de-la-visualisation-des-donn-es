// Gender Vaccination Dashboard - Population Pyramid
// Interactive pyramid chart comparing male vs female vaccination by region

const regionNames = {
    '11': 'Île-de-France', '24': 'Centre-Val de Loire', '27': 'Bourgogne-Franche-Comté',
    '28': 'Normandie', '32': 'Hauts-de-France', '44': 'Grand Est',
    '52': 'Pays de la Loire', '53': 'Bretagne', '75': 'Nouvelle-Aquitaine',
    '76': 'Occitanie', '84': 'Auvergne-Rhône-Alpes', '93': 'Provence-Alpes-Côte d\'Azur',
    '94': 'Corse'
};

// Département to region mapping
const depToRegion = {
    '75': '11', '77': '11', '78': '11', '91': '11', '92': '11', '93': '11', '94': '11', '95': '11',
    '18': '24', '28': '24', '36': '24', '37': '24', '41': '24', '45': '24',
    '21': '27', '25': '27', '39': '27', '58': '27', '70': '27', '71': '27', '89': '27', '90': '27',
    '14': '28', '27': '28', '50': '28', '61': '28', '76': '28',
    '02': '32', '59': '32', '60': '32', '62': '32', '80': '32',
    '08': '44', '10': '44', '51': '44', '52': '44', '54': '44', '55': '44', '57': '44', '67': '44', '68': '44', '88': '44',
    '44': '52', '49': '52', '53': '52', '72': '52', '85': '52',
    '22': '53', '29': '53', '35': '53', '56': '53',
    '16': '75', '17': '75', '19': '75', '23': '75', '24': '75', '33': '75', '40': '75', '47': '75', '64': '75', '79': '75', '86': '75', '87': '75',
    '09': '76', '11': '76', '12': '76', '30': '76', '31': '76', '32': '76', '34': '76', '46': '76', '48': '76', '65': '76', '66': '76', '81': '76', '82': '76',
    '01': '84', '03': '84', '07': '84', '15': '84', '26': '84', '38': '84', '42': '84', '43': '84', '63': '84', '69': '84', '73': '84', '74': '84',
    '04': '93', '05': '93', '06': '93', '13': '93', '83': '93', '84': '93',
    '2A': '94', '2B': '94'
};

// Département names
const depNames = {
    '75': 'Paris', '77': 'Seine-et-Marne', '78': 'Yvelines', '91': 'Essonne', '92': 'Hauts-de-Seine', '93': 'Seine-Saint-Denis', '94': 'Val-de-Marne', '95': "Val-d'Oise",
    '18': 'Cher', '28': 'Eure-et-Loir', '36': 'Indre', '37': 'Indre-et-Loire', '41': 'Loir-et-Cher', '45': 'Loiret',
    '21': "Côte-d'Or", '25': 'Doubs', '39': 'Jura', '58': 'Nièvre', '70': 'Haute-Saône', '71': 'Saône-et-Loire', '89': 'Yonne', '90': 'Territoire de Belfort',
    '14': 'Calvados', '27': 'Eure', '50': 'Manche', '61': 'Orne', '76': 'Seine-Maritime',
    '02': 'Aisne', '59': 'Nord', '60': 'Oise', '62': 'Pas-de-Calais', '80': 'Somme',
    '08': 'Ardennes', '10': 'Aube', '51': 'Marne', '52': 'Haute-Marne', '54': 'Meurthe-et-Moselle', '55': 'Meuse', '57': 'Moselle', '67': 'Bas-Rhin', '68': 'Haut-Rhin', '88': 'Vosges',
    '44': 'Loire-Atlantique', '49': 'Maine-et-Loire', '53': 'Mayenne', '72': 'Sarthe', '85': 'Vendée',
    '22': "Côtes-d'Armor", '29': 'Finistère', '35': 'Ille-et-Vilaine', '56': 'Morbihan',
    '16': 'Charente', '17': 'Charente-Maritime', '19': 'Corrèze', '23': 'Creuse', '24': 'Dordogne', '33': 'Gironde', '40': 'Landes', '47': 'Lot-et-Garonne', '64': 'Pyrénées-Atlantiques', '79': 'Deux-Sèvres', '86': 'Vienne', '87': 'Haute-Vienne',
    '09': 'Ariège', '11': 'Aude', '12': 'Aveyron', '30': 'Gard', '31': 'Haute-Garonne', '32': 'Gers', '34': 'Hérault', '46': 'Lot', '48': 'Lozère', '65': 'Hautes-Pyrénées', '66': 'Pyrénées-Orientales', '81': 'Tarn', '82': 'Tarn-et-Garonne',
    '01': 'Ain', '03': 'Allier', '07': 'Ardèche', '15': 'Cantal', '26': 'Drôme', '38': 'Isère', '42': 'Loire', '43': 'Haute-Loire', '63': 'Puy-de-Dôme', '69': 'Rhône', '73': 'Savoie', '74': 'Haute-Savoie',
    '04': 'Alpes-de-Haute-Provence', '05': 'Hautes-Alpes', '06': 'Alpes-Maritimes', '13': 'Bouches-du-Rhône', '83': 'Var', '84': 'Vaucluse',
    '2A': 'Corse-du-Sud', '2B': 'Haute-Corse'
};

const overseasRegions = ['01', '02', '03', '04', '06', '07', '08'];
const sexLabels = { '0': 'All', '1': 'Male', '2': 'Female' };

let globalData = [];
let selectedYearRange = 'all';
let selectedRegionCode = 'all'; // Track selected region

const vaccineTypeLabels = {
    'dose1': 'First Dose',
    'complete': 'Complete Vaccination',
    'booster1': 'First Booster',
    'booster2': 'Second Booster'
};

// Load data from département-level daily data with cumulative values
async function loadData() {
    const rawData = await d3.dsv(';', 'data/vacsi-s-dep-2023-07-13-15h51.csv', d => ({
        dep: d.dep,
        region: depToRegion[d.dep],
        depName: depNames[d.dep] || d.dep,
        sex: d.sexe,
        sexLabel: sexLabels[d.sexe] || d.sexe,
        date: d.jour,
        year: d.jour ? parseInt(d.jour.split('-')[0]) : null,
        dose1: +d.n_cum_dose1 || 0,
        complete: +d.n_cum_complet || 0,
        booster1: +d.n_cum_rappel || 0,
        booster2: +d.n_cum_2_rappel || 0,
        covDose1: +d.couv_dose1 || 0,
        covComplete: +d.couv_complet || 0,
        covBooster1: +d.couv_rappel || 0,
        covBooster2: +d.couv_2_rappel || 0
    }));
    
    globalData = rawData.filter(d => 
        d.sex !== '0' && 
        d.region && 
        regionNames[d.region] &&
        !overseasRegions.includes(d.region) &&
        d.year !== null
    );
    
    console.log(`Loaded ${globalData.length} records (metropolitan regions only, by département, daily with cumulative)`);
}

// Population Pyramid Chart - Gender Comparison by Département or Region
function createPyramidChart(vaccineType = 'complete') {
    const container = d3.select('#pyramidChart');
    
    const containerRect = container.node().getBoundingClientRect();
    const width = containerRect.width+150;
    const height = 500;
    const margin = { top: 60, right: 80, bottom: 60, left: 180 }; 

    // Reuse or create SVG
    let svg = container.select('svg');
    if (svg.empty()) {
        svg = container.append('svg')
            .attr('width', '100%')
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`)
            .style('background', 'transparent');
    } else {
        svg.attr('viewBox', `0 0 ${width} ${height}`);
    }
    
    // Reuse or create main group
    let g = svg.select('g.main-group');
    if (g.empty()) {
        g = svg.append('g')
            .attr('class', 'main-group')
            .attr('transform', `translate(${margin.left},${margin.top})`);
    }
    
    // Determine what to show based on selected region
    const showDepartements = selectedRegionCode !== 'all';
    
    // Filter data by year range
    let filteredData = globalData;
    
    // Filter by year range
    if (selectedYearRange !== 'all') {
        filteredData = filteredData.filter(d => {
            if (selectedYearRange === '2020-2021') {
                return d.year >= 2020 && d.year <= 2021;
            } else if (selectedYearRange === '2021-2022') {
                return d.year >= 2021 && d.year <= 2022;
            } else if (selectedYearRange === '2022-2023') {
                return d.year >= 2022 && d.year <= 2023;
            }
            return true;
        });
    }
    
    // Filter by region if specific region selected
    if (showDepartements) {
        filteredData = filteredData.filter(d => d.region === selectedRegionCode);
    }
    
    const pyramidData = [];
    const dataKey = vaccineType === 'dose1' ? 'dose1' :
                    vaccineType === 'complete' ? 'complete' :
                    vaccineType === 'booster1' ? 'booster1' : 'booster2';
    
    const covKey = vaccineType === 'dose1' ? 'covDose1' :
                   vaccineType === 'complete' ? 'covComplete' :
                   vaccineType === 'booster1' ? 'covBooster1' : 'covBooster2';
    
    if (showDepartements) {
        // Show départements of the selected region
        const departements = [...new Set(filteredData.map(d => d.dep))].filter(Boolean);
        
        departements.forEach(dep => {
            // Get latest cumulative data for male within the year range
            const maleRecords = filteredData.filter(d => d.dep === dep && d.sex === '1')
                .sort((a, b) => new Date(a.date) - new Date(b.date));
            const maleLatest = maleRecords.length > 0 ? maleRecords[maleRecords.length - 1] : null;
            const maleTotal = maleLatest ? maleLatest[dataKey] : 0;
            const maleCov = maleLatest ? maleLatest[covKey] : 0;
            
            // Get latest cumulative data for female within the year range
            const femaleRecords = filteredData.filter(d => d.dep === dep && d.sex === '2')
                .sort((a, b) => new Date(a.date) - new Date(b.date));
            const femaleLatest = femaleRecords.length > 0 ? femaleRecords[femaleRecords.length - 1] : null;
            const femaleTotal = femaleLatest ? femaleLatest[dataKey] : 0;
            const femaleCov = femaleLatest ? femaleLatest[covKey] : 0;
            
            if (maleTotal > 0 || femaleTotal > 0) {
                pyramidData.push({
                    label: depNames[dep] || dep,
                    code: dep,
                    male: maleTotal,
                    female: femaleTotal,
                    maleCov: maleCov,
                    femaleCov: femaleCov
                });
            }
        });
    } else {
        // Show all regions
        const regions = [...new Set(filteredData.map(d => d.region))].filter(Boolean);
        
        regions.forEach(regionCode => {
            const regionName = regionNames[regionCode];
            
            // Get départements in this region
            const depsInRegion = [...new Set(filteredData.filter(d => d.region === regionCode).map(d => d.dep))];
            
            let maleTotal = 0;
            let femaleTotal = 0;
            let maleCovSum = 0;
            let femaleCovSum = 0;
            let maleCount = 0;
            let femaleCount = 0;
            
            // Aggregate latest data from each département in the region
            depsInRegion.forEach(dep => {
                const maleRecords = filteredData.filter(d => d.dep === dep && d.sex === '1')
                    .sort((a, b) => new Date(a.date) - new Date(b.date));
                if (maleRecords.length > 0) {
                    const latest = maleRecords[maleRecords.length - 1];
                    maleTotal += latest[dataKey];
                    maleCovSum += latest[covKey];
                    maleCount++;
                }
                
                const femaleRecords = filteredData.filter(d => d.dep === dep && d.sex === '2')
                    .sort((a, b) => new Date(a.date) - new Date(b.date));
                if (femaleRecords.length > 0) {
                    const latest = femaleRecords[femaleRecords.length - 1];
                    femaleTotal += latest[dataKey];
                    femaleCovSum += latest[covKey];
                    femaleCount++;
                }
            });
            
            const maleCov = maleCount > 0 ? maleCovSum / maleCount : 0;
            const femaleCov = femaleCount > 0 ? femaleCovSum / femaleCount : 0;
            
            if (maleTotal > 0 || femaleTotal > 0) {
                pyramidData.push({
                    label: regionName,
                    code: regionCode,
                    male: maleTotal,
                    female: femaleTotal,
                    maleCov: maleCov,
                    femaleCov: femaleCov
                });
            }
        });
    }
    
    // Sort by total descending
    pyramidData.sort((a, b) => (b.male + b.female) - (a.male + a.female));
    
    // Find max for symmetric scale
    const maxValue = d3.max(pyramidData, d => Math.max(d.male, d.female));
    
    // Scales
    const x = d3.scaleLinear()
        .domain([-maxValue, maxValue])
        .range([0, width - margin.left - margin.right]);
    
    const y = d3.scaleBand()
        .domain(pyramidData.map(d => d.label))
        .range([0, height - margin.top - margin.bottom])
        .padding(0.2);
    
    // Update or create center line
    g.selectAll('.center-line')
        .data([null])
        .join('line')
        .attr('class', 'center-line')
        .attr('x1', x(0))
        .attr('x2', x(0))
        .attr('y1', -10)
        .attr('y2', height - margin.top - margin.bottom + 10)
        .attr('stroke', '#a78bfa')
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '8,4')
        .style('opacity', 0.6);
    
    // Male bars (left side)
    g.selectAll('.bar-male')
        .data(pyramidData, d => d.label)
        .join(
            enter => enter.append('rect')
                .attr('class', 'bar-male')
                .attr('x', x(0))
                .attr('y', d => y(d.label))
                .attr('width', 0)
                .attr('height', y.bandwidth())
                .attr('fill', 'url(#male-gradient)')
                .attr('rx', 8)
                .style('cursor', 'pointer')
                .style('filter', 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.4))')
                .style('opacity', 0)
                .call(enter => enter.transition()
                    .duration(800)
                    .delay((d, i) => i * 40)
                    .style('opacity', 1)
                    .attr('x', d => x(-d.male))
                    .attr('width', d => x(0) - x(-d.male))
                ),
            update => update
                .call(update => update.transition()
                    .duration(600)
                    .ease(d3.easeCubicInOut)
                    .attr('y', d => y(d.label))
                    .attr('height', y.bandwidth())
                    .attr('x', d => x(-d.male))
                    .attr('width', d => x(0) - x(-d.male))
                ),
            exit => exit
                .call(exit => exit.transition()
                    .duration(400)
                    .style('opacity', 0)
                    .attr('width', 0)
                    .remove()
                )
        )
        .on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .style('filter', 'drop-shadow(0 4px 12px rgba(59, 130, 246, 0.8))');
            showPyramidTooltip(event, d, 'male', showDepartements);
        })
        .on('mouseout', function() {
            d3.select(this)
                .transition()
                .duration(200)
                .style('filter', 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.4))');
            hideTooltip();
        });
    
    // Female bars (right side)
    g.selectAll('.bar-female')
        .data(pyramidData, d => d.label)
        .join(
            enter => enter.append('rect')
                .attr('class', 'bar-female')
                .attr('x', x(0))
                .attr('y', d => y(d.label))
                .attr('width', 0)
                .attr('height', y.bandwidth())
                .attr('fill', 'url(#female-gradient)')
                .attr('rx', 8)
                .style('cursor', 'pointer')
                .style('filter', 'drop-shadow(0 2px 4px rgba(236, 72, 153, 0.4))')
                .style('opacity', 0)
                .call(enter => enter.transition()
                    .duration(800)
                    .delay((d, i) => i * 40 + 100)
                    .style('opacity', 1)
                    .attr('width', d => x(d.female) - x(0))
                ),
            update => update
                .call(update => update.transition()
                    .duration(600)
                    .ease(d3.easeCubicInOut)
                    .attr('y', d => y(d.label))
                    .attr('height', y.bandwidth())
                    .attr('width', d => x(d.female) - x(0))
                ),
            exit => exit
                .call(exit => exit.transition()
                    .duration(400)
                    .style('opacity', 0)
                    .attr('width', 0)
                    .remove()
                )
        )
        .on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .style('filter', 'drop-shadow(0 4px 12px rgba(236, 72, 153, 0.8))');
            showPyramidTooltip(event, d, 'female', showDepartements);
        })
        .on('mouseout', function() {
            d3.select(this)
                .transition()
                .duration(200)
                .style('filter', 'drop-shadow(0 2px 4px rgba(236, 72, 153, 0.4))');
            hideTooltip();
        });
    
    // Value labels - Male
    g.selectAll('.label-male')
        .data(pyramidData, d => d.label)
        .join(
            enter => enter.append('text')
                .attr('class', 'label-male')
                .attr('x', d => x(-d.male) - 10)
                .attr('y', d => y(d.label) + y.bandwidth() / 2)
                .attr('dy', '0.35em')
                .attr('text-anchor', 'end')
                .text(d => showDepartements ? (d.male / 1000).toFixed(0) + 'K' : (d.male / 1000000).toFixed(2) + 'M')
                .style('fill', '#93c5fd')
                .style('font-size', '11px')
                .style('font-weight', 'bold')
                .style('opacity', 0)
                .call(enter => enter.transition()
                    .duration(500)
                    .delay((d, i) => 800 + i * 40)
                    .style('opacity', 1)
                ),
            update => update
                .call(update => update.transition()
                    .duration(600)
                    .ease(d3.easeCubicInOut)
                    .attr('x', d => x(-d.male) - 10)
                    .attr('y', d => y(d.label) + y.bandwidth() / 2)
                    .text(d => showDepartements ? (d.male / 1000).toFixed(0) + 'K' : (d.male / 1000000).toFixed(2) + 'M')
                ),
            exit => exit
                .call(exit => exit.transition()
                    .duration(300)
                    .style('opacity', 0)
                    .remove()
                )
        );
    
    // Value labels - Female
    g.selectAll('.label-female')
        .data(pyramidData, d => d.label)
        .join(
            enter => enter.append('text')
                .attr('class', 'label-female')
                .attr('x', d => x(d.female) + 10)
                .attr('y', d => y(d.label) + y.bandwidth() / 2)
                .attr('dy', '0.35em')
                .attr('text-anchor', 'start')
                .text(d => showDepartements ? (d.female / 1000).toFixed(0) + 'K' : (d.female / 1000000).toFixed(2) + 'M')
                .style('fill', '#f9a8d4')
                .style('font-size', '11px')
                .style('font-weight', 'bold')
                .style('opacity', 0)
                .call(enter => enter.transition()
                    .duration(500)
                    .delay((d, i) => 900 + i * 40)
                    .style('opacity', 1)
                ),
            update => update
                .call(update => update.transition()
                    .duration(600)
                    .ease(d3.easeCubicInOut)
                    .attr('x', d => x(d.female) + 10)
                    .attr('y', d => y(d.label) + y.bandwidth() / 2)
                    .text(d => showDepartements ? (d.female / 1000).toFixed(0) + 'K' : (d.female / 1000000).toFixed(2) + 'M')
                ),
            exit => exit
                .call(exit => exit.transition()
                    .duration(300)
                    .style('opacity', 0)
                    .remove()
                )
        );
    
    // Axes
    // const xAxis = d3.axisBottom(x)
    //     .ticks(8)
    //     .tickFormat(d => showDepartements ? Math.abs(d / 1e3).toFixed(0) + 'K' : Math.abs(d / 1e6).toFixed(1) + 'M');
    
    // const xAxisGroup = g.selectAll('.x-axis')
    //     .data([null])
    //     .join('g')
    //     .attr('class', 'x-axis')
    //     .attr('transform', `translate(0,${height - margin.top - margin.bottom})`);
    
    // xAxisGroup.transition()
    //     .duration(600)
    //     .call(xAxis);
    
    // xAxisGroup.selectAll('text')
    //     .style('fill', '#e0d5ff')
    //     .style('font-size', '12px');
    
    const yAxisGroup = g.selectAll('.y-axis')
        .data([null])
        .join('g')
        .attr('class', 'y-axis')
        .attr('transform', `translate(-35,0)`);
    
    yAxisGroup.transition()
        .duration(600)
        .call(d3.axisLeft(y));
    
    yAxisGroup.selectAll('text')
        .style('fill', '#fff')
        .style('font-size', '13px')
        .style('font-weight', '500');
    
    g.selectAll('.domain, .tick line')
        .style('stroke', 'rgba(167, 139, 250, 0.3)');
    
    let defs = svg.select('defs');
    if (defs.empty()) {
        defs = svg.append('defs');
        
        const maleGradient = defs.append('linearGradient')
            .attr('id', 'male-gradient')
            .attr('x1', '0%').attr('x2', '100%');
        maleGradient.append('stop').attr('offset', '0%').attr('stop-color', '#1e3a8a');
        maleGradient.append('stop').attr('offset', '50%').attr('stop-color', '#2563eb');
        maleGradient.append('stop').attr('offset', '100%').attr('stop-color', '#60a5fa');
        
        const femaleGradient = defs.append('linearGradient')
            .attr('id', 'female-gradient')
            .attr('x1', '0%').attr('x2', '100%');
        femaleGradient.append('stop').attr('offset', '0%').attr('stop-color', '#f472b6');
        femaleGradient.append('stop').attr('offset', '50%').attr('stop-color', '#ec4899');
        femaleGradient.append('stop').attr('offset', '100%').attr('stop-color', '#be185d');
    }
    
    // Gender labels (update or create)
    svg.selectAll('.male-label')
        .data([null])
        .join('text')
        .attr('class', 'male-label')
        .attr('x', margin.left + x(-maxValue * 0.5))
        .attr('y', margin.top - 20)
        .attr('text-anchor', 'middle')
        .text('♂ MALE')
        .style('fill', '#60a5fa')
        .style('font-size', '18px')
        .style('font-weight', 'bold')
        .style('letter-spacing', '2px');
    
    svg.selectAll('.female-label')
        .data([null])
        .join('text')
        .attr('class', 'female-label')
        .attr('x', margin.left + x(maxValue * 0.5))
        .attr('y', margin.top - 20)
        .attr('text-anchor', 'middle')
        .text('♀ FEMALE')
        .style('fill', '#f472b6')
        .style('font-size', '18px')
        .style('font-weight', 'bold')
        .style('letter-spacing', '2px');
    
    // Subtitle (update or create)
    const subtitleText = showDepartements ? 
        `` : 
        '';
    
    svg.selectAll('.pyramid-subtitle')
        .data([null])
        .join('text')
        .attr('class', 'pyramid-subtitle')
        .attr('x', width / 2)
        .attr('y', 55)
        .attr('text-anchor', 'middle')
        .text(subtitleText)
        .style('fill', '#c4b5fd')
        .style('font-size', '13px');
}

function showPyramidTooltip(event, d, sex, isDepartement = false) {
    const tooltip = d3.select('body').selectAll('.viz-tooltip').data([0]);
    const tooltipDiv = tooltip.enter().append('div')
        .attr('class', 'viz-tooltip')
        .merge(tooltip);
    
    const value = sex === 'male' ? d.male : d.female;
    const coverage = sex === 'male' ? d.maleCov : d.femaleCov;
    const otherValue = sex === 'male' ? d.female : d.male;
    const gap = ((value - otherValue) / otherValue * 100);
    const color = sex === 'male' ? '#60a5fa' : '#f472b6';
    const icon = sex === 'male' ? '♂' : '♀';
    const unit = isDepartement ? 'K' : 'M';
    const divisor = isDepartement ? 1000 : 1000000;
    
    tooltipDiv.html(`
        <div style="font-weight: bold; font-size: 15px; margin-bottom: 10px; color: ${color}; border-bottom: 2px solid ${color}; padding-bottom: 8px;">
            ${icon} ${d.label}
        </div>
        <div style="margin: 6px 0; display: flex; justify-content: space-between; gap: 20px;">
            <span>Count:</span>
            <strong>${(value / divisor).toFixed(isDepartement ? 0 : 2)}${unit}</strong>
        </div>
        <div style="margin: 6px 0; display: flex; justify-content: space-between; gap: 20px;">
            <span>Coverage:</span>
            <strong>${coverage.toFixed(1)}%</strong>
        </div>
        <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(167, 139, 250, 0.3); font-size: 11px; color: #c4b5fd;">
            Difference: ${gap > 0 ? '+' : ''}${gap.toFixed(1)}% vs ${sex === 'male' ? 'female' : 'male'}
        </div>
    `)
    .style('left', (event.pageX + 15) + 'px')
    .style('top', (event.pageY - 10) + 'px')
    .style('opacity', 1);
}

// Update statistics
function updateStatistics() {
    // Filter data by year range
    let filteredData = globalData;
    if (selectedYearRange !== 'all') {
        filteredData = filteredData.filter(d => {
            if (selectedYearRange === '2020-2021') {
                return d.year >= 2020 && d.year <= 2021;
            } else if (selectedYearRange === '2021-2022') {
                return d.year >= 2021 && d.year <= 2022;
            } else if (selectedYearRange === '2022-2023') {
                return d.year >= 2022 && d.year <= 2023;
            }
            return true;
        });
    }
    
    // Get all départements
    const allDeps = [...new Set(filteredData.map(d => d.dep))];
    
    let maleTotal = 0;
    let femaleTotal = 0;
    let maleCovSum = 0;
    let femaleCovSum = 0;
    let maleCount = 0;
    let femaleCount = 0;
    
    // Aggregate latest cumulative data from each département
    allDeps.forEach(dep => {
        const maleRecords = filteredData.filter(d => d.dep === dep && d.sex === '1')
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        if (maleRecords.length > 0) {
            const latest = maleRecords[maleRecords.length - 1];
            maleTotal += latest.complete;
            maleCovSum += latest.covComplete;
            maleCount++;
        }
        
        const femaleRecords = filteredData.filter(d => d.dep === dep && d.sex === '2')
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        if (femaleRecords.length > 0) {
            const latest = femaleRecords[femaleRecords.length - 1];
            femaleTotal += latest.complete;
            femaleCovSum += latest.covComplete;
            femaleCount++;
        }
    });
    
    const avgMaleCov = maleCount > 0 ? maleCovSum / maleCount : 0;
    const avgFemaleCov = femaleCount > 0 ? femaleCovSum / femaleCount : 0;
    
    d3.select('#statMaleTotal').text((maleTotal / 1000000).toFixed(1) + 'M');
    d3.select('#statFemaleTotal').text((femaleTotal / 1000000).toFixed(1) + 'M');
    d3.select('#statMaleCov').text(avgMaleCov.toFixed(1) + '%');
    d3.select('#statFemaleCov').text(avgFemaleCov.toFixed(1) + '%');
}

function hideTooltip() {
    d3.select('.viz-tooltip')
        .transition()
        .duration(200)
        .style('opacity', 0)
        .remove();
}

function setupVaccineTypeButtons() {
    const buttons = document.querySelectorAll('.vaccine-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            buttons.forEach(b => b.classList.remove('active'));
            // Add active to clicked button
            btn.classList.add('active');
            // Update chart
            const vaccineType = btn.dataset.type;
            createPyramidChart(vaccineType);
        });
    });
}

// Initialize
async function initDashboard() {
    await loadData();
    
    createPyramidChart('complete');
    updateStatistics();
    
    setupVaccineTypeButtons();
    
    window.addEventListener('regionChanged', (event) => {
        selectedRegionCode = event.detail.regionCode;
        console.log(`👥 Gender chart: Region changed to ${selectedRegionCode === 'all' ? 'All Regions' : regionNames[selectedRegionCode]}`);
        
        const activeBtn = document.querySelector('.vaccine-btn.active');
        const vaccineType = activeBtn ? activeBtn.dataset.type : 'complete';
        
        createPyramidChart(vaccineType);
        updateStatistics();
    });
    
    document.addEventListener('yearRangeChanged', (event) => {
        selectedYearRange = event.detail.yearRange;
        console.log(`📅 Gender chart: Year range changed to ${selectedYearRange}`);
        
        const activeBtn = document.querySelector('.vaccine-btn.active');
        const vaccineType = activeBtn ? activeBtn.dataset.type : 'complete';
        
        createPyramidChart(vaccineType);
        updateStatistics();
    });
    
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            console.log('🔄 Window resized - re-rendering gender pyramid chart');
            
            const activeBtn = document.querySelector('.vaccine-btn.active');
            const vaccineType = activeBtn ? activeBtn.dataset.type : 'complete';
            
            createPyramidChart(vaccineType);
        }, 250);
    });
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}
