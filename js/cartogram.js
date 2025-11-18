
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
  .attr('viewBox', `0 0 ${width} ${height}`)
  .style('display','block');

const g = svg.append('g');

// Country name to ISO2 code mapping
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

// Some name mapping for common mismatches between CSV and GeoJSON NAME
const nameMap = {
  'Czechia': 'Czech Republic',
  'North Macedonia': 'Macedonia',
  'Republic of Ireland': 'Ireland',
  'Russian Federation': 'Russia',
  'UK': 'United Kingdom'
};

function mappedName(n){ return nameMap[n] || n; }

function parseYear(dateStr){ return new Date(dateStr).getFullYear(); }

Promise.all([
  d3.csv(csvPath, d => ({ ...d, new_cases: +d.new_cases, year: parseYear(d.date) })),
  d3.json(geoPath)
]).then(([rows, geo]) => {
  console.log('Load data');
  // country in europe
  const countries = new Set();
  geo.features.forEach(f => countries.add(f.properties.NAME));
  console.log(countries);

  console.log(geo.features.map(f => [f.properties.NAME, f]));


 

  // Build a lookup of geo features by NAME for quick access
  const geoByName = new Map(geo.features.map(f => [f.properties.NAME, f]));
  console.log(geoByName);

  // All years in CSV
  const years = Array.from(new Set(rows.map(d => d.year))).sort((a,b)=>a-b);

  const yearSelect = d3.select('#yearSelect');
  yearSelect.selectAll('option')
    .data(years)
    .join('option')
      .attr('value', d=>d)
      .text(d=>d);

  // Prepare projection fitted to Europe geo
  let projection = d3.geoMercator().fitSize([width, height], geo);

  // Helper: aggregate new_cases by country for a given year
  function aggregateForYear(year){
    const byCountry = d3.rollup(rows.filter(r=>r.year===+year), v=>d3.sum(v, d=>d.new_cases), d=>d.location);
    const result = [];
    for (const [loc, val] of byCountry){
      const name = mappedName(loc);
      const feature = geoByName.get(name);
      if (!feature){
        // try direct match
        if (countries.has(loc)){
          const f2 = geoByName.get(loc);
          result.push({name: loc, value: val, feature: f2});
        } else {
          // missing from geojson
          console.warn('No geo feature for', loc);
        }
      } else {
        result.push({name, value: val, feature});
      }
    }
    return result;
  }

  // Draw/Update the chart for a year
  function update(year){
    width = container.node().clientWidth;
    height = container.node().clientHeight;
    
    // Add padding to keep circles inside the frame
    const padding = 40;
    svg.attr('viewBox', `0 0 ${width} ${height}`);
    projection = d3.geoMercator().fitSize([width - padding * 2, height - padding * 2], geo);
    
    // Adjust projection center to account for padding
    const center = projection.invert([width/2, height/2]);
    projection.center(center).fitSize([width - padding * 2, height - padding * 2], geo);

    // Draw the map background (semi-transparent)
    const pathGenerator = d3.geoPath().projection(projection);
    
    g.selectAll('.country-bg').remove();
    g.selectAll('.country-bg')
      .data(geo.features)
      .enter()
      .append('path')
      .attr('class', 'country-bg')
      .attr('d', pathGenerator)
      .attr('transform', `translate(${padding}, ${padding})`)
      .style('fill', '#e8f5e9')
      .style('stroke', '#c8e6c9')
      .style('stroke-width', 0.3)
      .style('opacity', 0.15);

    const data = aggregateForYear(year).filter(d => d.value>0);

    const maxVal = d3.max(data, d=>d.value) || 1;
    const minVal = d3.min(data, d=>d.value) || 1;
    
    // Use logarithmic scale for better visualization of wide range
    const rScale = d3.scaleSqrt()
      .domain([0, maxVal])
      .range([0, Math.max(6, Math.min(width,height)/20)]);
    
    // Alternative: use log scale for radius (uncomment to use)
    const rScaleLog = d3.scaleSqrt()
      .domain([minVal, maxVal])
      .range([Math.max(4, Math.min(width,height)/80), Math.max(6, Math.min(width,height)/20)]);
    
    // Use log-based scaling
    const logScale = d3.scaleLog()
      .domain([minVal, maxVal])
      .range([Math.max(4, Math.min(width,height)/80), Math.max(6, Math.min(width,height)/15)]);

    // Create nodes (positioned at geographic locations, fixed in place)
    const nodes = data.map(d=>{
      const lon = d.feature.properties.LON;
      const lat = d.feature.properties.LAT;
      const [cx, cy] = projection([lon, lat]);
      const countryCode = countryToCode[d.name] || d.name.substring(0, 2).toUpperCase();
      return {
        id: d.name,
        code: countryCode,
        value: d.value,
        r: logScale(d.value),  // Use log scale for radius
        fx: cx + padding,  // Fix to geographic X position
        fy: cy + padding,  // Fix to geographic Y position
        x: cx + padding,
        y: cy + padding,
        cx: cx + padding, 
        cy: cy + padding
      };
    });

    // data join
    const circles = g.selectAll('circle').data(nodes, d=>d.id);
    const labels = g.selectAll('text.label').data(nodes, d=>d.id);

    // Exit: fade out and shrink removed circles
    circles.exit()
      .transition()
      .duration(600)
      .ease(d3.easeCubicIn)
      .attr('r', 0)
      .style('opacity', 0)
      .remove();
    
    labels.exit()
      .transition()
      .duration(400)
      .ease(d3.easeCubicIn)
      .style('opacity', 0)
      .remove();

    const enter = circles.enter().append('circle')
      .attr('r', 0)
      .attr('cx', d=>d.x)
      .attr('cy', d=>d.y)
      .style('fill', '#2ecc71')
      .style('fill-opacity', 0)
      .style('stroke', '#27ae60')
      .style('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mousemove', (event, d)=>{
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .style('fill-opacity', 1)
          .attr('r', d.r * 1.15);
        
        tooltip.style('display','block')
          .style('left', (event.pageX + 12) + 'px')
          .style('top', (event.pageY - 10) + 'px')
          .html(`
            <div style="border-bottom: 2px solid #2ecc71; padding-bottom: 6px; margin-bottom: 6px;">
              <strong style="font-size: 15px; color: #2ecc71;">${d.id}</strong>
            </div>
            <div style="margin-bottom: 4px; color: #ecf0f1;">
              <span style="color: #95a5a6;">Country Code:</span> <strong>${d.code}</strong>
            </div>
            <div style="margin-bottom: 4px; color: #ecf0f1;">
              <span style="color: #95a5a6;">Total Cases:</span> <strong style="color: #e74c3c;">${d3.format(',')(Math.round(d.value))}</strong>
            </div>
            <div style="color: #95a5a6; font-size: 11px; margin-top: 6px; padding-top: 6px; border-top: 1px solid #34495e;">
              ${(d.value / 1e6).toFixed(2)}M cases
            </div>
          `);
      })
      .on('mouseout', (event, d)=> {
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .style('fill-opacity', 0.8)
          .attr('r', d.r);
        
        tooltip.style('display','none');
      });

    // Animate entering circles: grow with elastic bounce at their geographic positions
    enter.transition()
      .duration(800)
      .delay((d, i) => i * 30)
      .ease(d3.easeElasticOut.amplitude(1).period(0.5))
      .attr('cx', d => d.fx)
      .attr('cy', d => d.fy)
      .attr('r', d => d.r)
      .style('fill-opacity', 0.8);

    // Update existing circles with smooth transitions to new positions and sizes
    circles.transition()
      .duration(700)
      .ease(d3.easeCubicInOut)
      .attr('cx', d => d.fx)
      .attr('cy', d => d.fy)
      .attr('r', d => d.r);

    const enterLabels = labels.enter().append('text')
      .attr('class', 'label')
      .attr('x', d=>d.x)
      .attr('y', d=>d.y)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('fill', 'white')
      .style('font-size', d => Math.max(9, Math.min(14, d.r/2.5)) + 'px')
      .style('font-weight', '700')
      .style('pointer-events', 'none')
      .style('user-select', 'none')
      .style('text-shadow', '0 1px 2px rgba(0,0,0,0.5)')
      .style('opacity', 0)
      .text(d => d.code);
    
    // Fade in labels after circles appear
    enterLabels.transition()
      .duration(600)
      .delay((d, i) => 400 + i * 30)
      .ease(d3.easeCubicOut)
      .style('opacity', 1);
    
    // Update existing label sizes and positions
    labels.transition()
      .duration(700)
      .ease(d3.easeCubicInOut)
      .attr('x', d => d.fx)
      .attr('y', d => d.fy)
      .style('font-size', d => Math.max(9, Math.min(14, d.r/2.5)) + 'px');

    // Position labels at their geographic locations
    enterLabels.attr('x', d => d.fx).attr('y', d => d.fy);

    // summary
    d3.select('#summary').text(`Countries: ${nodes.length} — max cases: ${d3.format(',')(Math.round(maxVal))} — using log scale for better comparison`);

    // legend (simple size legend with log scale)
    g.selectAll('.legend').remove();
    const legend = g.append('g').attr('class','legend').attr('transform', `translate(${10}, ${height-80})`);
    
    // Create legend with log-scale representative values
    const legendVals = [maxVal, Math.pow(10, Math.floor(Math.log10(maxVal)) - 1), Math.pow(10, Math.floor(Math.log10(maxVal)) - 2)].map(Math.round);
    
    legend.append('text')
      .attr('x', 0)
      .attr('y', -10)
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .text('Cases (Log Scale)');
    
    legend.selectAll('g').data(legendVals).enter().append('g')
      .attr('transform', (d,i)=>`translate(${i*80},0)`)
      .call(g => {
        g.append('circle').attr('r', d=>logScale(d)).attr('cx',0).attr('cy',0).style('fill','#2ecc71').style('fill-opacity',0.8).style('stroke','#27ae60').style('stroke-width',1.5);
        g.append('text').attr('x', 0).attr('y', d=>logScale(d)+16).attr('text-anchor','middle').style('font-size','10px').style('font-weight','600').text(d=>{
          if (d >= 1e6) return d3.format('.1f')(d/1e6) + 'M';
          if (d >= 1e3) return d3.format('.0f')(d/1e3) + 'K';
          return d3.format(',')(d);
        });
      });
  }

  // initial draw
  const initialYear = +years[0];
  update(initialYear);
  yearSelect.property('value', initialYear);

  yearSelect.on('change', (event)=>{
    update(+event.target.value);
  });

  // responsiveness: redraw on resize
  let resizeTimer;
  window.addEventListener('resize', ()=>{
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(()=>{
      update(+yearSelect.property('value'));
    }, 250);
  });
}).catch(err=>{
  console.error('Failed to load data for cartogram', err);
});
