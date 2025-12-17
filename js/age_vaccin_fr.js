

if (!window.ageVizInitialized) {
    window.ageVizInitialized = true;

const ageRegionNames = {
    '11': 'Île-de-France', '24': 'Centre-Val de Loire', '27': 'Bourgogne-Franche-Comté',
    '28': 'Normandie', '32': 'Hauts-de-France', '44': 'Grand Est',
    '52': 'Pays de la Loire', '53': 'Bretagne', '75': 'Nouvelle-Aquitaine',
    '76': 'Occitanie', '84': 'Auvergne-Rhône-Alpes', '93': 'Provence-Alpes-Côte d\'Azur',
    '94': 'Corse'
};

const ageGroupLabels = {
    '04': '0-4 years',
    '09': '5-9 years',
    '11': '10-11 years',
    '17': '12-17 years',
    '24': '18-24 years',
    '29': '25-29 years',
    '39': '30-39 years',
    '49': '40-49 years',
    '59': '50-59 years',
    '64': '60-64 years',
    '69': '65-69 years',
    '74': '70-74 years',
    '79': '75-79 years',
    '80': '80+ years',
    '0': 'All ages'
};

const overseasRegions = ['01', '02', '03', '04', '06', '07', '08'];
let ageGlobalData = [];
let ageSelectedRegion = '11';
let currentSelectedDepartement = 'all'; 


const coverageColorScale = d3.scaleSequential()
    .domain([0, 100])
    .interpolator(d3.interpolateViridis);

const ageColorScale = d3.scaleOrdinal()
    .domain(Object.keys(ageGroupLabels).filter(k => k !== '0'))
    .range(d3.schemeTableau10);


async function loadData() {
    const rawData = await d3.dsv(';', 'data/vacsi-tot-a-reg-2023-07-13-15h50.csv', d => ({
        region: d.reg,
        regionName: ageRegionNames[d.reg] || d.reg,
        ageGroup: d.clage_vacsi,
        ageLabel: ageGroupLabels[d.clage_vacsi] || d.clage_vacsi,
        date: d.jour,
        dose1: +d.n_tot_dose1,
        complete: +d.n_tot_complet,
        booster1: +d.n_tot_rappel,
        booster2: +d.n_tot_2_rappel,
        boosterBiv: +d.n_tot_rappel_biv,
        booster3: +d.n_tot_3_rappel,
        population: +d.pop,
        covDose1: +d.couv_tot_dose1,
        covComplete: +d.couv_tot_complet,
        covBooster1: +d.couv_tot_rappel,
        covBooster2: +d.couv_tot_2_rappel,
        covBoosterBiv: +d.couv_tot_rappel_biv,
        covBooster3: +d.couv_tot_3_rappel
    }));
    
    ageGlobalData = rawData.filter(d => 
        !overseasRegions.includes(d.region) && 
        ageRegionNames[d.region] && 
        d.ageGroup !== '0'
    );
    
    console.log(`Loaded ${ageGlobalData.length} records (${Object.keys(ageRegionNames).length} regions, ${Object.keys(ageGroupLabels).length - 1} age groups)`);
}


function createStackedAreaChart(selectedDepartement = 'all') {
    const container = d3.select('#stackedAreaChart');
    container.html('');
    
    const margin = { top: 60, right: 100, bottom: 100, left: 50 };
    const containerRect = container.node().getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height+70;
    
    const svg = container.append('svg')
        .attr('width', width+50)
        .attr('height', height+50)
        .style('background', 'transparent');
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const filteredData = selectedDepartement === 'all' 
        ? ageGlobalData 
        : ageGlobalData.filter(d => d.region === selectedDepartement);
    
    const ageGroups = Object.keys(ageGroupLabels).filter(k => k !== '0');
    const aggregated = ageGroups.map(age => {
        const ageData = filteredData.filter(d => d.ageGroup === age);
        return {
            ageGroup: age,
            ageLabel: ageGroupLabels[age].split(' ')[0],
            dose1: d3.sum(ageData, d => d.dose1),
            complete: d3.sum(ageData, d => d.complete),
            booster1: d3.sum(ageData, d => d.booster1),
            booster2: d3.sum(ageData, d => d.booster2),
            booster3: d3.sum(ageData, d => d.booster3)
        };
    });
    
    const keys = ['dose1', 'complete', 'booster1', 'booster2', 'booster3'];
    const stack = d3.stack().keys(keys);
    const series = stack(aggregated);
    
    const totalVaccinations = d3.sum(aggregated, d => d.dose1 + d.complete + d.booster1 + d.booster2 + d.booster3);

    const x = d3.scalePoint()
        .domain(aggregated.map(d => d.ageLabel))
        .range([0, width - margin.left - margin.right])
        .padding(0.2);
    
    const maxY = d3.max(series, s => d3.max(s, d => d[1]));

    const y = d3.scaleLinear()
        .domain([0, maxY])
        .range([height - margin.top - margin.bottom, 0]);
    
    const color = d3.scaleOrdinal()
        .domain(keys)
        .range(['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa']);
    
    const area = d3.area()
        .x(d => x(d.data.ageLabel))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveMonotoneX);
    
    g.selectAll('.area')
        .data(series)
        .join('path')
        .attr('class', 'area')
        .attr('fill', d => color(d.key))
        .attr('d', area)
        .style('opacity', 0.8)
        .on('mouseover', function() {
            d3.select(this).transition().duration(200).style('opacity', 1);
        })
        .on('mouseout', function() {
            d3.select(this).transition().duration(200).style('opacity', 0.8);
        });
    
    const xAxisGroup = g.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x));
    
    xAxisGroup.selectAll('text')
        .style('fill', '#fff')
        .style('font-size', '11px')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end');
    
    xAxisGroup.selectAll('line, path')
        .style('stroke', '#fff');
    
    const formatYAxis = (value) => {
        if (value >= 1e6) {
            return (value / 1e6).toFixed(1) + 'M';
        } else if (value >= 1e3) {
            return (value / 1e3).toFixed(0) + 'K';
        } else {
            return value.toFixed(0);
        }
    };
    
    const yAxisGroup = g.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(5).tickFormat(formatYAxis));
    
    yAxisGroup.selectAll('text')
        .style('fill', '#fff')
        .style('font-size', '11px');
    
    yAxisGroup.selectAll('line, path')
        .style('stroke', '#fff');
    
    const titleText = selectedDepartement === 'all' 
        ? 'Vaccination Progression: All France' 
        : `Vaccination Progression: ${ageRegionNames[selectedDepartement]}`;
    
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', 30)
        .attr('text-anchor', 'middle')
        .text(titleText)
        .style('fill', '#fff')
        .style('font-size', '18px')
        .style('font-weight', 'bold');
    
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - margin.right + 20},${margin.top})`);
    
    const legendLabels = {
        'dose1': 'First Dose',
        'complete': 'Complete',
        'booster1': 'Booster 1',
        'booster2': 'Booster 2',
        'booster3': 'Booster 3'
    };
    
    keys.forEach((key, i) => {
        const lg = legend.append('g')
            .attr('transform', `translate(0,${i * 25})`);
        
        lg.append('rect')
            .attr('width', 18)
            .attr('height', 18)
            .attr('fill', color(key))
            .attr('rx', 3);
        
        lg.append('text')
            .attr('x', 25)
            .attr('y', 9)
            .attr('dy', '0.35em')
            .text(legendLabels[key])
            .style('fill', '#fff')
            .style('font-size', '12px');
    });
}

function showTooltip(event, d, chartType) {
    const tooltip = d3.select('body').selectAll('.viz-tooltip').data([0]);
    const tooltipDiv = tooltip.enter().append('div')
        .attr('class', 'viz-tooltip')
        .merge(tooltip);
    
    let content = '';
    
    if (chartType === 'heatmap') {
        content = `
            <div style="font-weight: bold; margin-bottom: 8px; color: #a78bfa;">${d.regionName}</div>
            <div style="font-size: 12px; margin-bottom: 8px; color: #c4b5fd;">${d.ageLabel}</div>
            <div style="border-top: 1px solid rgba(167, 139, 250, 0.3); padding-top: 8px; margin-top: 8px;">
                <div>Complete: <strong>${d.covComplete.toFixed(1)}%</strong></div>
                <div>Population: <strong>${(d.population / 1000).toFixed(0)}K</strong></div>
                <div>Vaccinated: <strong>${(d.complete / 1000).toFixed(0)}K</strong></div>
            </div>
        `;
    } else if (chartType === 'pyramid') {
        content = `
            <div style="font-weight: bold; margin-bottom: 8px; color: #a78bfa;">${d.ageLabel}</div>
            <div style="border-top: 1px solid rgba(167, 139, 250, 0.3); padding-top: 8px; margin-top: 8px;">
                <div>Complete: <strong>${(d.complete / 1000000).toFixed(2)}M</strong></div>
                <div>Coverage: <strong>${d.covComplete.toFixed(1)}%</strong></div>
                <div>Population: <strong>${(d.population / 1000000).toFixed(2)}M</strong></div>
            </div>
        `;
    } else if (chartType === 'line') {
        content = `
            <div style="font-weight: bold; margin-bottom: 8px; color: #a78bfa;">${d.ageLabel}</div>
            <div style="border-top: 1px solid rgba(167, 139, 250, 0.3); padding-top: 8px; margin-top: 8px;">
                <div>Avg Coverage: <strong>${d.avgCoverage.toFixed(1)}%</strong></div>
                <div>Max: <strong>${d.maxCoverage.toFixed(1)}%</strong></div>
                <div>Min: <strong>${d.minCoverage.toFixed(1)}%</strong></div>
            </div>
        `;
    } else if (chartType === 'bubble') {
        content = `
            <div style="font-weight: bold; margin-bottom: 8px; color: #a78bfa;">${d.regionName}</div>
            <div style="font-size: 12px; margin-bottom: 8px; color: #c4b5fd;">${d.ageLabel}</div>
            <div style="border-top: 1px solid rgba(167, 139, 250, 0.3); padding-top: 8px; margin-top: 8px;">
                <div>Complete: <strong>${d.covComplete.toFixed(1)}%</strong></div>
                <div>Booster: <strong>${d.covBooster1.toFixed(1)}%</strong></div>
                <div>Population: <strong>${(d.population / 1000).toFixed(0)}K</strong></div>
            </div>
        `;
    }
    
    tooltipDiv.html(content)
        .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .style('opacity', 1);
}

function hideTooltip() {
    d3.select('.viz-tooltip')
        .transition()
        .duration(200)
        .style('opacity', 0)
        .remove();
}

function setupRegionSelector() {
    const select = d3.select('#regionSelect');
    
    select.append('option')
        .attr('value', 'all')
        .text('All Régions (France)')
        .property('selected', true);
    
    Object.entries(ageRegionNames).forEach(([code, name]) => {
        select.append('option')
            .attr('value', code)
            .text(name);
    });
    
    select.on('change', function() {
        const selectedRegion = this.value;
        currentSelectedDepartement = selectedRegion;
        console.log(`📍 Region changed to: ${selectedRegion === 'all' ? 'All France' : ageRegionNames[selectedRegion]}`);
        createStackedAreaChart(selectedRegion);
        
        window.dispatchEvent(new CustomEvent('regionChanged', {
            detail: { regionCode: selectedRegion }
        }));
    });
}

async function initDashboard() {
    await loadData();

    setupRegionSelector();
    createStackedAreaChart('all');
    
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            console.log('🔄 Window resized - re-rendering age vaccination charts');
            
            createStackedAreaChart(currentSelectedDepartement);
        }, 250);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}

}
