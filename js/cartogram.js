
import * as d3 from 'https://cdn.skypack.dev/d3@7';

const csvPath = 'data/covid.csv';
const geoPath = 'data/europe.geojson';

const container = d3.select('#chart');
const tooltip = d3.select('#tooltip');

let width = container.node().clientWidth;
let height = container.node().clientHeight;

const svg = container.append('svg')
  .attr('width', '100%')
  .attr('height', '100%')
  .attr('viewBox', `0 0 ${width * 2} ${height * 2}`)
  .style('display', 'block');

console.log(svg);
const g = svg.append('g');

const countryToCode = {
  'France': 'FR', 'Germany': 'DE', 'Italy': 'IT', 'Spain': 'ES',
  'Poland': 'PL', 'Romania': 'RO', 'Netherlands': 'NL', 'Belgium': 'BE',
  'Czech Republic': 'CZ', 'Portugal': 'PT', 'Greece': 'GR', 'Hungary': 'HU',
  'Sweden': 'SE', 'Austria': 'AT', 'Bulgaria': 'BG', 'Denmark': 'DK',
  'Finland': 'FI', 'Slovakia': 'SK', 'Ireland': 'IE', 'Croatia': 'HR',
  'Lithuania': 'LT', 'Slovenia': 'SI', 'Latvia': 'LV', 'Estonia': 'EE',
  'Cyprus': 'CY', 'Luxembourg': 'LU', 'Malta': 'MT', 'Iceland': 'IS',
  'Norway': 'NO', 'Liechtenstein': 'LI', 'Switzerland': 'CH', 'Albania': 'AL',
  'Bosnia and Herzegovina': 'BA', 'Serbia': 'RS', 'Montenegro': 'ME',
  'North Macedonia': 'MK', 'Moldova': 'MD', 'Ukraine': 'UA', 'Belarus': 'BY',
  'Russia': 'RU', 'United Kingdom': 'GB', 'Turkey': 'TR'
};

const nameMap = {
  'Czechia': 'Czech Republic',
  'North Macedonia': 'Macedonia',
  'Republic of Ireland': 'Ireland',
  'Russian Federation': 'Russia',
  'UK': 'United Kingdom'
};

function mappedName(n) { return nameMap[n] || n; }
function parseYear(dateStr) { return new Date(dateStr).getFullYear(); }

// Flag to know if we've already done the big map → circle morph
let hasMorphed = false;

Promise.all([
  d3.csv(csvPath, d => ({ 
    ...d, 
    new_cases: +d.new_cases, 
    new_deaths: +d.new_deaths,
    year: parseYear(d.date) 
  })),
  d3.json(geoPath)
]).then(([rows, geo]) => {
  console.log('Load data');

  const countries = new Set();
  geo.features.forEach(f => countries.add(f.properties.NAME));

 
  const geoByName = new Map(geo.features.map(f => [f.properties.NAME, f]));


  const years = Array.from(new Set(rows.map(d => d.year))).sort((a, b) => a - b);

  const yearSelect = d3.select('#yearSelect');
  yearSelect.selectAll('option')
    .data(years)
    .join('option')
    .attr('value', d => d)
    .text(d => d);

  // Metric selector
  const metricSelect = d3.select('#metricSelect');
  let currentMetric = 'cases'; 


  console.log("hello");
  const paddingMap = 60;  
  let projection = d3.geoMercator()
    .fitExtent(
      [ [paddingMap, paddingMap], [width - paddingMap, height - paddingMap] ],
      geo
    );


  // Helper: aggregate new_cases by country for a given year
  function aggregateForYear(year) {
    const byCountry = d3.rollup(
      rows.filter(r => r.year === +year),
      v => d3.sum(v, d => d.new_cases),
      d => d.location
    );
    const result = [];
    for (const [loc, val] of byCountry) {
      // Skip Russia
      if (loc === 'Russia') continue;
      
      const name = mappedName(loc);
      let feature = geoByName.get(name);
      if (!feature && countries.has(loc)) {
        feature = geoByName.get(loc);
      }
      if (feature) {
        result.push({ name, value: val, feature });
      }
    }
    return result;
  }

  function aggregateDeathsForYear(year) {
    const byCountry = d3.rollup(
      rows.filter(r => r.year === +year),
      v => d3.sum(v, d => d.new_deaths),
      d => d.location
    );
    const result = [];
    for (const [loc, val] of byCountry) {
      // Skip Russia
      if (loc === 'Russia') continue;
      
      const name = mappedName(loc);
      let feature = geoByName.get(name);
      if (!feature && countries.has(loc)) {
        feature = geoByName.get(loc);
      }
      if (feature) {
        result.push({ name, value: val, feature });
      }
    }
    return result;
  }

  function update(year, metric = 'cases') {
    console.log("I am here");

    width = container.node().clientWidth;
    height = container.node().clientHeight;
    
    console.log('SVG Dimensions:', { width, height });

    const padding = 2;
    svg.attr('viewBox', `0 0 ${width} ${height}`);
    const paddingMap = 80;
    projection = d3.geoMercator()
      .fitExtent(
        [[paddingMap, paddingMap], [width - paddingMap, height - paddingMap]],
        geo
      );

    const pathGenerator = d3.geoPath().projection(projection);


    g.selectAll('.country-bg').remove();
    const mapPaths = g.selectAll('.country-bg')
      .data(geo.features.filter(f => f.properties.NAME !== 'Russia'))
      .enter()
      .append('path')
      .attr('class', 'country-bg')
      .attr('d', pathGenerator)
      .style('fill', '#f48506ff')
      .style('stroke', '#0b0101ff')
      .style('stroke-width', 0.3)
      .style('opacity', 0.2); 

    // Get data based on selected metric
    const data = (metric === 'deaths' ? aggregateDeathsForYear(year) : aggregateForYear(year))
      .filter(d => d.value > 0);
    const maxVal = d3.max(data, d => d.value);
    const minVal = d3.min(data, d => d.value);

    const maxRadius = Math.min(width, height) / 50;  
    const minRadius = Math.min(width, height) / 80; 

    // Color based on metric
    const fillColor = metric === 'deaths' ? '#e74c3c' : '#2ecc71';
    const strokeColor = metric === 'deaths' ? '#c0392b' : '#27ae60';

    const nodes = data.map(d => {
      const lon = d.feature.properties.LON;
      const lat = d.feature.properties.LAT;
      const [cx, cy] = projection([lon, lat]);
  
      const countryCode = countryToCode[d.name] || d.name.substring(0, 2).toUpperCase();
      return {
        id: d.name,
        code: countryCode,
        value: d.value,
        r:  metric === 'deaths' ? d.value/100000 : d.value/100000 ,
    
        x: cx + padding,
        y: cy + padding,
        cx: cx + padding,
        cy: cy + padding
      };
    });

    const minCX = d3.min(nodes, d => d.cx);
    const maxCX = d3.max(nodes, d => d.cx);
    const circles = g.selectAll('circle').data(nodes, d => d.id);
    const labels = g.selectAll('text.label').data(nodes, d => d.id);

    circles.exit()
      .transition()
      .duration(500)
      .attr('r', 0)
      .style('opacity', 0)
      .remove();

    labels.exit()
      .transition()
      .duration(400)
      .style('opacity', 0)
      .remove();

    const isFirstMorph = !hasMorphed;

    const enter = circles.enter().append('circle')
      .attr('r', 0)
      .attr('cx', d => isFirstMorph ? d.cx : d.x)
      .attr('cy', d => isFirstMorph ? d.cy : d.y)
      .style('fill', fillColor)
      .style('fill-opacity', 0)
      .style('stroke', strokeColor)
      .style('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mousemove', (event, d) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(150)
          .style('fill-opacity', 1)
          .attr('r', d.r * 1.15);

        const metricLabel = metric === 'deaths' ? 'Total Deaths' : 'Total Cases';
        const accentColor = metric === 'deaths' ? '#e74c3c' : '#2ecc71';
        
        tooltip.style('display', 'block')
          .style('left', (event.pageX + 12) + 'px')
          .style('top', (event.pageY - 10) + 'px')
          .html(`
            <div style="border-bottom: 2px solid ${accentColor}; padding-bottom: 6px; margin-bottom: 6px;">
              <strong style="font-size: 15px; color: ${accentColor};">${d.id}</strong>
            </div>
            <div style="margin-bottom: 4px; color: #ecf0f1;">
              <span style="color: #95a5a6;">Country Code:</span> <strong>${d.code}</strong>
            </div>
            <div style="margin-bottom: 4px; color: #ecf0f1;">
              <span style="color: #95a5a6;">${metricLabel}:</span> <strong style="color: ${accentColor};">${d3.format(',')(Math.round(d.value))}</strong>
            </div>
            <div style="color: #95a5a6; font-size: 11px; margin-top: 6px; padding-top: 6px; border-top: 1px solid #34495e;">
              ${(d.value / 1e6).toFixed(2)}M cases
            </div>
          `);
      })
      .on('mouseout', (event, d) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .style('fill-opacity', 0.8)
          .attr('r', d.r);

        tooltip.style('display', 'none');
      });

    // ENTER transition
    enter.transition()
      .duration(900)
      .delay(d => {
        if (!isFirstMorph) return 0;
        const t = (d.cx - minCX) / Math.max(1, (maxCX - minCX)); 
        return 400 + t * 800; 
      })
      .ease(isFirstMorph ? d3.easeCubicOut : d3.easeCubicInOut)
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => d.r)
      .style('fill-opacity', 0.8);

    
    circles.transition()
      .duration(800)
      .ease(d3.easeCubicInOut)
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => d.r)
      .style('fill', fillColor)
      .style('stroke', strokeColor);

    // ENTER labels
    const enterLabels = labels.enter().append('text')
      .attr('class', 'label')
      .attr('x', d => isFirstMorph ? d.cx : d.x)
      .attr('y', d => isFirstMorph ? d.cy : d.y)
      .attr('dominant-baseline', 'middle')
      .style('fill', 'white')
      .style('font-size', d => Math.max(9, Math.min(14, d.r / 2.5)) + 'px')
      .style('font-weight', '700')
      .style('pointer-events', 'none')
      .style('user-select', 'none')
      .style('opacity', 0)
    

    enterLabels.transition()
      .duration(700)
      .delay((d, i) => (isFirstMorph ? 600 : 200) + i * 15)
      .ease(d3.easeCubicOut)
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .style('opacity', 1);

    // UPDATE labels on year change
    labels.transition()
      .duration(800)
      .ease(d3.easeCubicInOut)
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .style('font-size', d => Math.max(9, Math.min(14, d.r / 2.5)) + 'px');

    d3.select('#summary')
      .text(`Countries: ${nodes.length} — max ${metric === 'deaths' ? 'deaths' : 'cases'}: ${d3.format(',')(Math.round(maxVal))} — using log scale for better comparison`);

    if (!hasMorphed) {
      hasMorphed = true;
    }
  }

  const initialYear = +years[0];
  update(initialYear, currentMetric);
  yearSelect.property('value', initialYear);

  yearSelect.on('change', (event) => {
    update(+event.target.value, currentMetric);
  });

  metricSelect.on('change', (event) => {
    currentMetric = event.target.value;
    update(+yearSelect.property('value'), currentMetric);
  });


  let resizeTimer;
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      update(+yearSelect.property('value'), currentMetric);
    }, 250);
  });
}).catch(err => {
  console.error('Failed to load data for cartogram', err);
});
