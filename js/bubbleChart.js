
// Load data
Promise.all([
  d3.csv('data/covid.csv')
]).then(([covidData]) => {
  

  const europeanCountries = [
    'Albania', 'Austria', 'Belarus', 'Belgium', 'Bosnia and Herzegovina',
    'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 'Denmark', 'Estonia',
    'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland',
    'Ireland', 'Italy', 'Latvia', 'Liechtenstein', 'Lithuania',
    'Luxembourg', 'Malta', 'Moldova', 'Montenegro', 'Netherlands',
    'North Macedonia', 'Norway', 'Poland', 'Portugal', 'Romania',
    'Russia', 'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden',
    'Switzerland', 'Ukraine', 'United Kingdom'
  ];

  const countryData = d3.rollup(
    covidData.filter(d => europeanCountries.includes(d.location)),
    v => ({
      total_cases: d3.max(v, d => +d.total_cases || 0),
      total_deaths: d3.max(v, d => +d.total_deaths || 0)
    }),
    d => d.location
  );
  const data = Array.from(countryData, ([location, values]) => ({
    location,
    total_cases: values.total_cases,
    total_deaths: values.total_deaths,
    mortality_rate: values.total_cases > 0 ? (values.total_deaths / values.total_cases) * 100 : 0
  })).filter(d => d.total_cases > 0 && d.total_deaths > 0);


  createBubbleChart(data);
});

function createBubbleChart(data) {
  const container = d3.select('#chart');
  const tooltip = d3.select('#tooltip');
  
  const margin = { top: 40, right: 120, bottom: 60, left: 80 };
  const width = container.node().clientWidth - margin.left - margin.right;
  const height = container.node().clientHeight - margin.top - margin.bottom;

  // Clear existing SVG
  container.selectAll('*').remove();

  
  const svg = container.append('svg')
    .attr('width', container.node().clientWidth)
    .attr('height', container.node().clientHeight);


  svg.append('defs')
    .append('clipPath')
    .attr('id', 'clip')
    .append('rect')
    .attr('width', width)
    .attr('height', height);

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Scales
  const minCases = d3.min(data, d => d.total_cases);
  const maxCases = d3.max(data, d => d.total_cases);
  const minDeaths = d3.min(data, d => d.total_deaths);
  const maxDeaths = d3.max(data, d => d.total_deaths);
  const maxMortality = d3.max(data, d => d.mortality_rate);
  const minMortality = d3.min(data, d => d.mortality_rate);

  const xScale = d3.scaleLog()
    .domain([minCases * 0.8, maxCases * 1.2])
    .range([0, width])
    .nice();

  const yScale = d3.scaleLog()
    .domain([minDeaths * 0.8, maxDeaths * 1.2])
    .range([height, 0])
    .nice();

  const sizeScale = d3.scaleSqrt()
    .domain([minMortality, maxMortality])
    .range([4, 30]);

  const colorScale = d3.scaleSequential()
    .domain([minMortality, maxMortality])
    .interpolator(d3.interpolateRdYlGn)
    .domain([maxMortality, minMortality]);

  // Axes
  const xAxis = d3.axisBottom(xScale)
    .ticks(6)
    .tickFormat(d => {
      if (d >= 1e6) return `${(d / 1e6).toFixed(0)}M`;
      if (d >= 1e3) return `${(d / 1e3).toFixed(0)}K`;
      return d;
    });

  const yAxis = d3.axisLeft(yScale)
    .ticks(6)
    .tickFormat(d => {
      if (d >= 1e6) return `${(d / 1e6).toFixed(0)}M`;
      if (d >= 1e3) return `${(d / 1e3).toFixed(0)}K`;
      return d;
    });

  // Add subtle grid lines
  g.append('g')
    .attr('class', 'grid')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale)
      .ticks(5)
      .tickSize(-height)
      .tickFormat(''))
    .style('stroke', '#e8e8e8')
    .style('stroke-opacity', 0.3)
    .select('.domain').remove();

  g.append('g')
    .attr('class', 'grid')
    .call(d3.axisLeft(yScale)
      .ticks(5)
      .tickSize(-width)
      .tickFormat(''))
    .style('stroke', '#e8e8e8')
    .style('stroke-opacity', 0.3)
    .select('.domain').remove();

  // Add axes
  const xAxisG = g.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(xAxis)
    .style('font-size', '12px')
    .style('color', '#666');

  const yAxisG = g.append('g')
    .call(yAxis)
    .style('font-size', '12px')
    .style('color', '#666');

  // Axis labels
  g.append('text')
    .attr('x', width / 2)
    .attr('y', height + 45)
    .attr('text-anchor', 'middle')
    .style('font-size', '14px')
    .style('font-weight', '700')
    .style('fill', '#2c3e50')
    .text('Total Cases (Log Scale)');

  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -60)
    .attr('text-anchor', 'middle')
    .style('font-size', '14px')
    .style('font-weight', '700')
    .style('fill', '#2c3e50')
    .text('Total Deaths (Log Scale)');

  // Create bubbles group with clip path
  const bubblesGroup = g.append('g')
    .attr('clip-path', 'url(#clip)');

  // Add bubbles
  const bubbles = bubblesGroup.selectAll('.bubble')
    .data(data)
    .enter()
    .append('circle')
    .attr('class', 'bubble')
    .attr('cx', d => xScale(d.total_cases))
    .attr('cy', d => yScale(d.total_deaths))
    .attr('r', 0)
    .attr('fill', d => colorScale(d.mortality_rate))
    .attr('stroke', 'white')
    .attr('stroke-width', 1.5)
    .attr('opacity', 0.7)
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('opacity', 1)
        .attr('stroke-width', 3)
        .attr('r', sizeScale(d.mortality_rate) * 1.2);

      tooltip.style('display', 'block')
        .html(`
          <div class="tooltip-country">${d.location}</div>
          <div class="tooltip-row">
            <span class="tooltip-label">📊 Total Cases:</span>
            <span class="tooltip-value">${d.total_cases.toLocaleString()}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">💀 Total Deaths:</span>
            <span class="tooltip-value">${d.total_deaths.toLocaleString()}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">📈 Mortality Rate:</span>
            <span class="tooltip-value">${d.mortality_rate.toFixed(2)}%</span>
          </div>
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #34495e; font-size: 11px; color: #95a5a6; font-style: italic;">
            Bubble size represents mortality rate
          </div>
        `);
    })
    .on('mousemove', function(event) {
      tooltip
        .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    })
    .on('mouseout', function(event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('opacity', 0.7)
        .attr('stroke-width', 1.5)
        .attr('r', sizeScale(d.mortality_rate));

      tooltip.style('display', 'none');
    });

  // Animate bubbles
  bubbles.transition()
    .duration(800)
    .delay((d, i) => i * 20)
    .ease(d3.easeElasticOut.amplitude(1).period(0.5))
    .attr('r', d => sizeScale(d.mortality_rate));

  // Add country labels for all countries
  bubblesGroup.selectAll('.country-label')
    .data(data)
    .enter()
    .append('text')
    .attr('class', 'country-label')
    .attr('x', d => xScale(d.total_cases))
    .attr('y', d => yScale(d.total_deaths))
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .style('font-size', d => {
      const r = sizeScale(d.mortality_rate);
      return `${Math.max(8, Math.min(11, r / 2.5))}px`;
    })
    .style('font-weight', '700')
    .style('fill', 'white')
    .style('pointer-events', 'none')
    .style('text-shadow', '0 1px 3px rgba(0,0,0,0.8)')
    .style('opacity', 0)
    .text(d => d.location)
    .transition()
    .duration(600)
    .delay((d, i) => 800 + i * 15)
    .style('opacity', 1);

  // Add color legend
  const legendWidth = 200;
  const legendHeight = 15;
  
  const legendG = svg.append('g')
    .attr('transform', `translate(${width + margin.left - legendWidth}, ${margin.top - 30})`);

  // Create gradient
  const defs = svg.append('defs');
  const gradient = defs.append('linearGradient')
    .attr('id', 'mortality-gradient')
    .attr('x1', '0%')
    .attr('x2', '100%');

  gradient.append('stop')
    .attr('offset', '0%')
    .attr('stop-color', colorScale(minMortality));

  gradient.append('stop')
    .attr('offset', '100%')
    .attr('stop-color', colorScale(maxMortality));

  legendG.append('rect')
    .attr('width', legendWidth)
    .attr('height', legendHeight)
    .style('fill', 'url(#mortality-gradient)')
    .style('stroke', '#999')
    .style('stroke-width', 0.5);

  legendG.append('text')
    .attr('x', 0)
    .attr('y', -5)
    .style('font-size', '11px')
    .style('fill', '#666')
    .text(`${minMortality.toFixed(1)}%`);

  legendG.append('text')
    .attr('x', legendWidth)
    .attr('y', -5)
    .attr('text-anchor', 'end')
    .style('font-size', '11px')
    .style('fill', '#666')
    .text(`${maxMortality.toFixed(1)}%`);

  legendG.append('text')
    .attr('x', legendWidth / 2)
    .attr('y', -5)
    .attr('text-anchor', 'middle')
    .style('font-size', '10px')
    .style('font-weight', '700')
    .style('fill', '#2c3e50')
    .text('Mortality Rate');

  // Add zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([1, 10])
    .extent([[0, 0], [width, height]])
    .on('zoom', zoomed);

  svg.call(zoom);

  function zoomed(event) {
    const newXScale = event.transform.rescaleX(xScale);
    const newYScale = event.transform.rescaleY(yScale);

    xAxisG.call(xAxis.scale(newXScale));
    yAxisG.call(yAxis.scale(newYScale));

    bubbles
      .attr('cx', d => newXScale(d.total_cases))
      .attr('cy', d => newYScale(d.total_deaths));

    bubblesGroup.selectAll('.country-label')
      .attr('x', d => newXScale(d.total_cases))
      .attr('y', d => newYScale(d.total_deaths));
  }

  // Double-click to reset zoom
  svg.on('dblclick.zoom', function() {
    svg.transition()
      .duration(750)
      .call(zoom.transform, d3.zoomIdentity);
  });
}

// Responsive resize
window.addEventListener('resize', () => {
  Promise.all([
    d3.csv('data/covid.csv')
  ]).then(([covidData]) => {
    const europeanCountries = [
      'Albania', 'Austria', 'Belarus', 'Belgium', 'Bosnia and Herzegovina',
      'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 'Denmark', 'Estonia',
      'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland',
      'Ireland', 'Italy', 'Latvia', 'Liechtenstein', 'Lithuania',
      'Luxembourg', 'Malta', 'Moldova', 'Montenegro', 'Netherlands',
      'North Macedonia', 'Norway', 'Poland', 'Portugal', 'Romania',
      'Russia', 'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden',
      'Switzerland', 'Ukraine', 'United Kingdom'
    ];

    const countryData = d3.rollup(
      covidData.filter(d => europeanCountries.includes(d.location)),
      v => ({
        total_cases: d3.max(v, d => +d.total_cases || 0),
        total_deaths: d3.max(v, d => +d.total_deaths || 0)
      }),
      d => d.location
    );

    const data = Array.from(countryData, ([location, values]) => ({
      location,
      total_cases: values.total_cases,
      total_deaths: values.total_deaths,
      mortality_rate: values.total_cases > 0 ? (values.total_deaths / values.total_cases) * 100 : 0
    })).filter(d => d.total_cases > 0 && d.total_deaths > 0);

    createBubbleChart(data);
  });
});
