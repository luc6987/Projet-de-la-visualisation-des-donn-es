
export function plotVaccinationHeatmap(vaccinData, countryCode1, countryCode2, startYear = 2021, endYear = 2022, doseType = 'DoseAdditional1') {
 
  d3.select('#heatmap').selectAll('*').remove();

  
  const countryNames = {
    'AT': 'Austria', 'BE': 'Belgium', 'BG': 'Bulgaria', 'HR': 'Croatia',
    'CY': 'Cyprus', 'CZ': 'Czechia', 'DK': 'Denmark', 'EE': 'Estonia',
    'FI': 'Finland', 'FR': 'France', 'DE': 'Germany', 'GR': 'Greece',
    'HU': 'Hungary', 'IS': 'Iceland', 'IE': 'Ireland', 'IT': 'Italy',
    'LV': 'Latvia', 'LI': 'Liechtenstein', 'LT': 'Lithuania', 'LU': 'Luxembourg',
    'MT': 'Malta', 'NL': 'Netherlands', 'NO': 'Norway', 'PL': 'Poland',
    'PT': 'Portugal', 'RO': 'Romania', 'SK': 'Slovakia', 'SI': 'Slovenia',
    'ES': 'Spain', 'SE': 'Sweden'
  };
  let currentCountry = countryCode1;
  let resizeTimer;

  const renderHeatmap = (countryCode) => {

    d3.select('#heatmap').select('svg').remove();

    const countryName = countryNames[countryCode] || countryCode;
    d3.select('.heatmap-title').text(`Vaccination by Age Group (2021-2022) - ${countryName}`);

  const countryData = vaccinData.filter(d => {
    const reportingCountry = d.ReportingCountry;
    const yearWeek = d.YearWeekISO;
    return reportingCountry === countryCode && 
           yearWeek >= `${startYear}-W01` && 
           yearWeek <= `${endYear}-W53`;
  });

  countryData.forEach(d => {
    const [year, week] = d.YearWeekISO.split('-W');
    const date = new Date(year, 0, 1 + (week - 1) * 7);
    d.date = date;
    d.Year = date.getFullYear();
    d.Quarter = Math.floor(date.getMonth() / 3) + 1;
    d.Period = `${d.Year}-Q${d.Quarter}`;
    d[doseType] = +d[doseType] || 0;
  });

  const aggregated = d3.rollup(
    countryData,
    v => d3.sum(v, d => d[doseType]),
    d => d.Period,
    d => d.TargetGroup
  );
  const periods = Array.from(new Set(countryData.map(d => d.Period))).sort();
  const allAgeGroups = Array.from(new Set(countryData.map(d => d.TargetGroup)));
  
  const ageGroups = allAgeGroups
    .filter(ag => ag.startsWith('Age'))
    .sort((a, b) => {
      const getNum = (str) => {
        const num = str.replace('Age', '').split('_')[0].replace('+', '').replace('<', '');
        return parseInt(num) || 0;
      };
      return getNum(a) - getNum(b);
    });
  const values = ageGroups.map(age => 
    periods.map(period => {
      const periodMap = aggregated.get(period);
      return periodMap ? (periodMap.get(age) || 0) : 0;
    })
  );

  const container = d3.select('#heatmap').node();
  
  if (!container) {
    console.warn('⚠️ Heatmap container not found, skipping render');
    return;
  }
  
  const containerWidth = container.getBoundingClientRect().width;
  const containerHeight = container.getBoundingClientRect().height;
  
  const margin = {top: 20, right: 100, bottom: 80, left: 80};
  const width = Math.max(300, containerWidth - margin.left - margin.right);
  const height = Math.max(200, containerHeight - margin.top - margin.bottom);

  const svg = d3.select('#heatmap')
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('background', 'transparent')
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const flatData = [];
  ageGroups.forEach((age, i) => {
    periods.forEach((period, j) => {
      flatData.push({
        age: age,
        period: period,
        value: values[i][j],
        row: i,
        col: j
      });
    });
  });

  const x = d3.scaleBand()
    .domain(periods)
    .range([0, width])
    .padding(0);

  const y = d3.scaleBand()
    .domain(ageGroups)
    .range([0, height])
    .padding(0);

  const maxValue = d3.max(flatData, d => d.value);
  const minValue = 0;
  
  const colorScale = d3.scaleSequential()
    .domain([minValue, maxValue])
    .interpolator(d3.interpolateYlOrRd);

  const cells = svg.selectAll('rect')
    .data(flatData)
    .enter()
    .append('rect')
    .attr('x', d => x(d.period))
    .attr('y', d => y(d.age))
    .attr('width', x.bandwidth())
    .attr('height', y.bandwidth())
    .attr('fill', d => colorScale(d.value))
    .attr('stroke', 'white')
    .attr('stroke-width', 0.5)
    .style('opacity', 0)
    .style('transform', 'scale(0)')
    .style('transform-origin', 'center');

  cells.transition()
    .duration(600)
    .delay((d, i) => {

      const colDelay = d.col * 80; 
      const rowDelay = d.row * 15; 
      return colDelay + rowDelay;
    })
    .ease(d3.easeCubicOut)
    .style('opacity', 1)
    .style('transform', 'scale(1)');

  cells
    .on('mouseover', function(event, d) {
      d3.selectAll('.heatmap-tooltip').remove();
      
      d3.select(this)
        .transition()
        .duration(200)
        .style('transform', 'scale(1.1)')
        .attr('stroke-width', 2)
        .attr('stroke', '#2c3e50');
    
      d3.select('body').append('div')
        .attr('class', 'heatmap-tooltip')
        .style('position', 'absolute')
        .style('background', 'rgba(44, 62, 80, 0.95)')
        .style('color', 'white')
        .style('padding', '8px 12px')
        .style('border-radius', '6px')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)')
        .style('z-index', '1000')
        .html(`<strong>${d.age}</strong><br/>${d.period}<br/>Doses: ${d.value.toLocaleString()}`)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .style('opacity', 0)
        .transition()
        .duration(200)
        .style('opacity', 1);
    })
    .on('mousemove', function(event) {
      d3.select('.heatmap-tooltip')
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    })
    .on('mouseout', function() {
      d3.select(this)
        .transition()
        .duration(200)
        .style('transform', 'scale(1)')
        .attr('stroke-width', 0.5)
        .attr('stroke', 'white');
      
      d3.selectAll('.heatmap-tooltip').remove();
    });

  const xAxis = svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).tickSize(0))
    .style('font-size', '10px')
    .style('opacity', 0);
  
  xAxis.selectAll('text')
    .attr('transform', 'translate(-10,10) rotate(-45)')
    .style('text-anchor', 'end')
    .style('fill', 'white');

  xAxis.select('.domain').remove();
  xAxis.selectAll('.tick line').style('stroke', 'white');

  xAxis.transition()
    .duration(800)
    .delay(400)
    .style('opacity', 1);

  const yAxis = svg.append('g')
    .call(d3.axisLeft(y).tickSize(0))
    .style('font-size', '11px')
    .style('opacity', 0);
  
  yAxis.selectAll('text').style('fill', 'white');
  yAxis.select('.domain').remove();
  yAxis.selectAll('.tick line').style('stroke', 'white');

  yAxis.transition()
    .duration(800)
    .delay(200)
    .style('opacity', 1);

  const legendWidth = 15;
  const legendHeight = height * 0.7;
  
  const legendScale = d3.scaleLinear()
    .domain([maxValue, minValue])
    .range([0, legendHeight]);

  const legend = svg.append('g')
    .attr('transform', `translate(${width + 40}, ${height * 0.15})`)
    .style('opacity', 0);


  const defs = svg.append('defs');
  const gradientId = `legend-gradient-${Date.now()}`;
  const gradient = defs.append('linearGradient')
    .attr('id', gradientId)
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '0%')
    .attr('y2', '100%');

  const numStops = 100;
  for (let i = 0; i <= numStops; i++) {
    gradient.append('stop')
      .attr('offset', `${(i / numStops) * 100}%`)
      .attr('stop-color', colorScale(maxValue - (maxValue * i / numStops)));
  }


  legend.append('rect')
    .attr('width', legendWidth)
    .attr('height', legendHeight)
    .style('fill', `url(#${gradientId})`);


  legend.transition()
    .duration(800)
    .delay(600)
    .style('opacity', 1);

  const legendAxis = d3.axisRight(legendScale)
    .ticks(8)
    .tickFormat(d => {
      if (d >= 1000) {
        return `${Math.round(d/1000)}K`;
      }
      return Math.round(d);
    });

  const legendAxisGroup = legend.append('g')
    .attr('transform', `translate(${legendWidth}, 0)`)
    .call(legendAxis)
    .style('font-size', '10px');
  
  legendAxisGroup.selectAll('text').style('fill', 'white');
  legendAxisGroup.selectAll('.domain, .tick line').style('stroke', 'white');
  legendAxisGroup.select('.domain').remove();

  const xGridLines = svg.append('g')
    .attr('class', 'grid-lines');
  
  periods.forEach((period, i) => {
    xGridLines.append('line')
      .attr('x1', x(period) + x.bandwidth())
      .attr('x2', x(period) + x.bandwidth())
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', 'white')
      .attr('stroke-width', 0.5);
  });

  const yGridLines = svg.append('g')
    .attr('class', 'grid-lines');
  
  ageGroups.forEach((age, i) => {
    yGridLines.append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', y(age) + y.bandwidth())
      .attr('y2', y(age) + y.bandwidth())
      .attr('stroke', 'white')
      .attr('stroke-width', 0.5);
  });
  }; 

  const heatmapContainer = d3.select('#heatmap');

  heatmapContainer.selectAll('.heatmap-toggle-container').remove();
  
  const buttonContainer = heatmapContainer
    .append('div')
    .attr('class', 'heatmap-toggle-container')
    .style('position', 'absolute')
    .style('top', '10px')
    .style('right', '10px')
    .style('z-index', '100');

  const toggleButton = buttonContainer.append('button')
    .attr('class', 'heatmap-toggle-btn')
    .style('background', '#3498db')
    .style('color', 'white')
    .style('border', 'none')
    .style('padding', '8px 16px')
    .style('border-radius', '5px')
    .style('cursor', 'pointer')
    .style('font-size', '13px')
    .style('font-weight', '600')
    .style('box-shadow', '0 2px 4px rgba(0,0,0,0.2)')
    .style('transition', 'all 0.3s ease')
    .text(`Switch to ${countryNames[countryCode2] || countryCode2}`)
    .on('mouseover', function() {
      d3.select(this)
        .style('background', '#2980b9')
        .style('transform', 'translateY(-1px)')
        .style('box-shadow', '0 4px 8px rgba(0,0,0,0.3)');
    })
    .on('mouseout', function() {
      d3.select(this)
        .style('background', '#3498db')
        .style('transform', 'translateY(0)')
        .style('box-shadow', '0 2px 4px rgba(0,0,0,0.2)');
    })
    .on('click', function() {
      
      currentCountry = (currentCountry === countryCode1) ? countryCode2 : countryCode1;
      const otherCountry = (currentCountry === countryCode1) ? countryCode2 : countryCode1;
      
      d3.select(this).text(`Switch to ${countryNames[otherCountry] || otherCountry}`);
      
      renderHeatmap(currentCountry);
    });

  renderHeatmap(currentCountry);

  window.addEventListener('resize', function() {
    const container = d3.select('#heatmap').node();
    if (!container) return;
    
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      renderHeatmap(currentCountry);
    }, 250); 
  });
}
