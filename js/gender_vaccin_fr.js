// Gender Vaccination Dashboard - Population Pyramid
// Interactive pyramid chart comparing male vs female vaccination by region

const regionNames = {
    '11': 'Île-de-France', '24': 'Centre-Val de Loire', '27': 'Bourgogne-Franche-Comté',
    '28': 'Normandie', '32': 'Hauts-de-France', '44': 'Grand Est',
    '52': 'Pays de la Loire', '53': 'Bretagne', '75': 'Nouvelle-Aquitaine',
    '76': 'Occitanie', '84': 'Auvergne-Rhône-Alpes', '93': 'Provence-Alpes-Côte d\'Azur',
    '94': 'Corse'
};

const overseasRegions = ['01', '02', '03', '04', '06', '07', '08'];
const sexLabels = { '0': 'All', '1': 'Male', '2': 'Female' };

let globalData = [];

const vaccineTypeLabels = {
    'dose1': 'First Dose',
    'complete': 'Complete Vaccination',
    'booster1': 'First Booster',
    'booster2': 'Second Booster'
};

// Load data
async function loadData() {
    const rawData = await d3.dsv(';', 'data/vacsi-tot-s-reg-2023-07-13-15h51.csv', d => ({
        region: d.reg,
        regionName: regionNames[d.reg] || d.reg,
        sex: d.sexe,
        sexLabel: sexLabels[d.sexe] || d.sexe,
        date: d.jour,
        dose1: +d.n_tot_dose1,
        complete: +d.n_tot_complet,
        booster1: +d.n_tot_rappel,
        booster2: +d.n_tot_2_rappel,
        boosterBiv: +d.n_tot_rappel_biv,
        booster3: +d.n_tot_3_rappel,
        covDose1: +d.couv_tot_dose1,
        covComplete: +d.couv_tot_complet,
        covBooster1: +d.couv_tot_rappel,
        covBooster2: +d.couv_tot_2_rappel,
        covBoosterBiv: +d.couv_tot_rappel_biv,
        covBooster3: +d.couv_tot_3_rappel
    }));
    
    globalData = rawData.filter(d => d.sex !== '0' && !overseasRegions.includes(d.region) && regionNames[d.region]);
    console.log(`Loaded ${globalData.length} records (metropolitan regions only)`);
}

// Population Pyramid Chart - Gender Comparison by Region
function createPyramidChart(vaccineType = 'complete') {
    const container = d3.select('#pyramidChart');
    container.html('');
    
    const containerRect = container.node().getBoundingClientRect();
    const width = containerRect.width;
    const height = Math.max(450, containerRect.height || 500);
    const margin = { top: 40, right: 60, bottom: 40, left: 150 };
    
    const svg = container.append('svg')
        .attr('width', '100%')
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Prepare data based on vaccine type
    const regions = [...new Set(globalData.map(d => d.regionName))];
    const pyramidData = [];
    
    const dataKey = {
        'dose1': { count: 'dose1', coverage: 'covDose1' },
        'complete': { count: 'complete', coverage: 'covComplete' },
        'booster1': { count: 'booster1', coverage: 'covBooster1' },
        'booster2': { count: 'booster2', coverage: 'covBooster2' }
    }[vaccineType];
    
    regions.forEach(region => {
        const male = globalData.find(d => d.regionName === region && d.sex === '1');
        const female = globalData.find(d => d.regionName === region && d.sex === '2');
        
        if (male && female) {
            pyramidData.push({
                region,
                male: male[dataKey.count],
                female: female[dataKey.count],
                maleCov: male[dataKey.coverage],
                femaleCov: female[dataKey.coverage]
            });
        }
    });
    
    // Sort by total descending
    pyramidData.sort((a, b) => (b.male + b.female) - (a.male + a.female));
    
    // Find max for symmetric scale
    const maxValue = d3.max(pyramidData, d => Math.max(d.male, d.female));
    
    // Scales
    const x = d3.scaleLinear()
        .domain([-maxValue, maxValue])
        .range([0, width - margin.left - margin.right]);
    
    const y = d3.scaleBand()
        .domain(pyramidData.map(d => d.region))
        .range([0, height - margin.top - margin.bottom])
        .padding(0.2);
    
    // Center line
    g.append('line')
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
        .data(pyramidData)
        .join('rect')
        .attr('class', 'bar-male')
        .attr('x', x(0))
        .attr('y', d => y(d.region))
        .attr('width', 0)
        .attr('height', y.bandwidth())
        .attr('fill', 'url(#male-gradient)')
        .attr('rx', 8)
        .style('cursor', 'pointer')
        .style('filter', 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.4))')
        .on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .style('filter', 'drop-shadow(0 4px 12px rgba(59, 130, 246, 0.8))');
            showPyramidTooltip(event, d, 'male');
        })
        .on('mouseout', function() {
            d3.select(this)
                .transition()
                .duration(200)
                .style('filter', 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.4))');
            hideTooltip();
        })
        .transition()
        .duration(1000)
        .delay((d, i) => i * 60)
        .attr('x', d => x(-d.male))
        .attr('width', d => x(0) - x(-d.male));
    
    // Female bars (right side)
    g.selectAll('.bar-female')
        .data(pyramidData)
        .join('rect')
        .attr('class', 'bar-female')
        .attr('x', x(0))
        .attr('y', d => y(d.region))
        .attr('width', 0)
        .attr('height', y.bandwidth())
        .attr('fill', 'url(#female-gradient)')
        .attr('rx', 8)
        .style('cursor', 'pointer')
        .style('filter', 'drop-shadow(0 2px 4px rgba(236, 72, 153, 0.4))')
        .on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .style('filter', 'drop-shadow(0 4px 12px rgba(236, 72, 153, 0.8))');
            showPyramidTooltip(event, d, 'female');
        })
        .on('mouseout', function() {
            d3.select(this)
                .transition()
                .duration(200)
                .style('filter', 'drop-shadow(0 2px 4px rgba(236, 72, 153, 0.4))');
            hideTooltip();
        })
        .transition()
        .duration(1000)
        .delay((d, i) => i * 60 + 100)
        .attr('width', d => x(d.female) - x(0));
    
    // Value labels - Male
    g.selectAll('.label-male')
        .data(pyramidData)
        .join('text')
        .attr('class', 'label-male')
        .attr('x', d => x(-d.male) - 10)
        .attr('y', d => y(d.region) + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'end')
        .text(d => (d.male / 1000000).toFixed(2) + 'M')
        .style('fill', '#93c5fd')
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .style('opacity', 0)
        .transition()
        .duration(600)
        .delay((d, i) => 1000 + i * 60)
        .style('opacity', 1);
    
    // Value labels - Female
    g.selectAll('.label-female')
        .data(pyramidData)
        .join('text')
        .attr('class', 'label-female')
        .attr('x', d => x(d.female) + 10)
        .attr('y', d => y(d.region) + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'start')
        .text(d => (d.female / 1000000).toFixed(2) + 'M')
        .style('fill', '#f9a8d4')
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .style('opacity', 0)
        .transition()
        .duration(600)
        .delay((d, i) => 1100 + i * 60)
        .style('opacity', 1);
    
    // Axes
    const xAxis = d3.axisBottom(x)
        .ticks(8)
        .tickFormat(d => Math.abs(d / 1e6).toFixed(1) + 'M');
    
    g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${height - margin.top - margin.bottom})`)
        .call(xAxis)
        .selectAll('text')
        .style('fill', '#e0d5ff')
        .style('font-size', '12px');
    
    g.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(y))
        .selectAll('text')
        .style('fill', '#fff')
        .style('font-size', '13px')
        .style('font-weight', '500');
    
    g.selectAll('.domain, .tick line')
        .style('stroke', 'rgba(167, 139, 250, 0.3)');
    
    // Gradients
    const defs = svg.append('defs');
    
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
    
    // Gender labels
    svg.append('text')
        .attr('x', margin.left + x(-maxValue * 0.5))
        .attr('y', margin.top - 20)
        .attr('text-anchor', 'middle')
        .text('♂ MALE')
        .style('fill', '#60a5fa')
        .style('font-size', '18px')
        .style('font-weight', 'bold')
        .style('letter-spacing', '2px');
    
    svg.append('text')
        .attr('x', margin.left + x(maxValue * 0.5))
        .attr('y', margin.top - 20)
        .attr('text-anchor', 'middle')
        .text('♀ FEMALE')
        .style('fill', '#f472b6')
        .style('font-size', '18px')
        .style('font-weight', 'bold')
        .style('letter-spacing', '2px');
    
    // Subtitle
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', 55)
        .attr('text-anchor', 'middle')
        .style('fill', '#c4b5fd')
        .style('font-size', '13px');
}

function showPyramidTooltip(event, d, sex) {
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
    
    tooltipDiv.html(`
        <div style="font-weight: bold; font-size: 15px; margin-bottom: 10px; color: ${color}; border-bottom: 2px solid ${color}; padding-bottom: 8px;">
            ${icon} ${d.region}
        </div>
        <div style="margin: 6px 0; display: flex; justify-content: space-between; gap: 20px;">
            <span>Count:</span>
            <strong>${(value / 1000000).toFixed(2)}M</strong>
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
    const maleTotal = d3.sum(globalData.filter(d => d.sex === '1'), d => d.complete);
    const femaleTotal = d3.sum(globalData.filter(d => d.sex === '2'), d => d.complete);
    const avgMaleCov = d3.mean(globalData.filter(d => d.sex === '1'), d => d.covComplete);
    const avgFemaleCov = d3.mean(globalData.filter(d => d.sex === '2'), d => d.covComplete);
    
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
    
    // Setup vaccine type buttons
    setupVaccineTypeButtons();
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}
