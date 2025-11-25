// D3.js implementation of vaccination vs COVID cases time series
export function plotVaccinationVsCases(vaccinData, covidData, country1 = 'France', country2 = 'Italy', startYear = 2021, endYear = 2022) {
  // Clear existing plot
  d3.select('#tsCovidPlot').selectAll('*').remove();

  // Country code mapping
  const countryCodeMap = {
    'France': 'FR', 'Germany': 'DE', 'Italy': 'IT', 'Spain': 'ES',
    'United Kingdom': 'GB', 'Poland': 'PL', 'Netherlands': 'NL',
    'Belgium': 'BE', 'Greece': 'GR', 'Portugal': 'PT', 'Sweden': 'SE',
    'Austria': 'AT', 'Switzerland': 'CH', 'Denmark': 'DK', 'Finland': 'FI',
    'Norway': 'NO', 'Ireland': 'IE', 'Croatia': 'HR', 'Bulgaria': 'BG',
    'Romania': 'RO', 'Slovakia': 'SK', 'Slovenia': 'SI', 'Lithuania': 'LT',
    'Latvia': 'LV', 'Estonia': 'EE', 'Cyprus': 'CY', 'Luxembourg': 'LU',
    'Malta': 'MT', 'Iceland': 'IS'
  };

  // State to track which country is currently displayed
  let currentCountry = country1;

  // Function to render plot for a given country
  const renderPlot = (country) => {
    // Clear only the SVG, not the button
    d3.select('#tsCovidPlot').select('svg').remove();

  const countryCode = countryCodeMap[country];
  if (!countryCode) {
    console.error(`Country code not found for ${country}`);
    return;
  }

  // Step 1: Prepare COVID data
  const countryCovid = covidData.filter(d => 
    d.location === country &&
    d.date >= `${startYear}-01-01` &&
    d.date <= `${endYear}-12-31`
  );

  // Resample COVID data to weekly
  const covidWeekly = d3.rollup(
    countryCovid,
    v => ({
      new_cases: d3.sum(v, d => +d.new_cases || 0),
      total_cases: d3.sum(v, d => +d.total_cases || 0)
    }),
    d => {
      const date = new Date(d.date);
      // Get Sunday of the week
      const sunday = new Date(date);
      sunday.setDate(date.getDate() - date.getDay());
      return sunday.toISOString().split('T')[0];
    }
  );

  const covidTS = Array.from(covidWeekly, ([date, values]) => ({
    date: new Date(date),
    new_cases: values.new_cases,
    total_cases: values.total_cases
  })).sort((a, b) => a.date - b.date);

  // Step 2: Prepare vaccination data
  const countryVaccin = vaccinData.filter(d =>
    d.ReportingCountry === countryCode &&
    d.YearWeekISO >= `${startYear}-W01` &&
    d.YearWeekISO <= `${endYear}-W53`
  );

  const vaccinWeekly = d3.rollup(
    countryVaccin,
    v => ({
      FirstDose: d3.sum(v, d => +d.FirstDose || 0),
      SecondDose: d3.sum(v, d => +d.SecondDose || 0),
      DoseAdditional1: d3.sum(v, d => +d.DoseAdditional1 || 0)
    }),
    d => d.YearWeekISO
  );

  const vaccinTS = Array.from(vaccinWeekly, ([yearWeek, values]) => {
    const [year, week] = yearWeek.split('-W');
    const date = new Date(year, 0, 1 + (week - 1) * 7);
    return {
      date: date,
      FirstDose: values.FirstDose,
      SecondDose: values.SecondDose,
      DoseAdditional1: values.DoseAdditional1
    };
  }).sort((a, b) => a.date - b.date);

  // Step 3: Merge data
  const mergedData = covidTS.map(covidPoint => {
    // Find nearest vaccination point (within 3 days)
    const vaccinPoint = vaccinTS.reduce((nearest, v) => {
      const diff = Math.abs(v.date - covidPoint.date);
      const nearestDiff = Math.abs(nearest.date - covidPoint.date);
      return diff < nearestDiff ? v : nearest;
    }, vaccinTS[0]);

    const timeDiff = Math.abs(vaccinPoint.date - covidPoint.date) / (1000 * 60 * 60 * 24);
    if (timeDiff > 3) {
      return { ...covidPoint, FirstDose: 0, SecondDose: 0, DoseAdditional1: 0 };
    }

    return {
      ...covidPoint,
      FirstDose: vaccinPoint.FirstDose,
      SecondDose: vaccinPoint.SecondDose,
      DoseAdditional1: vaccinPoint.DoseAdditional1
    };
  });

  // Normalize data to 0-1 scale
  const normalize = (arr, key) => {
    const values = arr.map(d => d[key]);
    const min = d3.min(values);
    const max = d3.max(values);
    return arr.map(d => ({
      ...d,
      [`${key}_norm`]: max === min ? 0 : (d[key] - min) / (max - min)
    }));
  };

  let normalizedData = normalize(mergedData, 'new_cases');
  normalizedData = normalize(normalizedData, 'FirstDose');
  normalizedData = normalize(normalizedData, 'SecondDose');
  normalizedData = normalize(normalizedData, 'DoseAdditional1');

  // Step 4: Plot the data
  const margin = {top: 40, right: 60, bottom: 80, left: 80};
  const width = 1000 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select('#tsCovidPlot')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Scales
  const x = d3.scaleTime()
    .domain(d3.extent(normalizedData, d => d.date))
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([-0.05, 1.05])
    .range([height, 0]);

  // Grid
  svg.append('g')
    .attr('class', 'grid')
    .selectAll('line')
    .data(y.ticks(10))
    .enter()
    .append('line')
    .attr('x1', 0)
    .attr('x2', width)
    .attr('y1', d => y(d))
    .attr('y2', d => y(d))
    .attr('stroke', '#e0e0e0')
    .attr('stroke-width', 1)
    .style('opacity', 0.3);

  // Line generators
  const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.value));

  // Plot lines with animations
  const lines = [
    { key: 'new_cases_norm', color: '#d62728', label: 'New Cases (normalized)', width: 2.5, opacity: 1 },
    { key: 'FirstDose_norm', color: '#1f77b4', label: '1st Dose (normalized)', width: 2, opacity: 0.7 },
    { key: 'SecondDose_norm', color: '#2ca02c', label: '2nd Dose (normalized)', width: 2, opacity: 0.7 },
    { key: 'DoseAdditional1_norm', color: '#9467bd', label: 'Booster (normalized)', width: 2, opacity: 0.7 }
  ];

  lines.forEach((lineConfig, index) => {
    const lineData = normalizedData.map(d => ({ date: d.date, value: d[lineConfig.key] }));
    
    const path = svg.append('path')
      .datum(lineData)
      .attr('fill', 'none')
      .attr('stroke', lineConfig.color)
      .attr('stroke-width', lineConfig.width)
      .attr('opacity', 0)
      .attr('d', line);

    // Get the total length of the path
    const totalLength = path.node().getTotalLength();

    // Animate the line drawing from left to right
    path
      .attr('stroke-dasharray', totalLength + ' ' + totalLength)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(1500)
      .delay(index * 200)
      .ease(d3.easeCubicInOut)
      .attr('stroke-dashoffset', 0)
      .attr('opacity', lineConfig.opacity);
  });

  // X-axis
  const xAxis = svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .style('font-size', '11px')
    .style('opacity', 0);

  xAxis.transition()
    .duration(800)
    .delay(400)
    .style('opacity', 1);

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + 50)
    .attr('text-anchor', 'middle')
    .style('font-size', '14px')
    .style('font-weight', 'bold')
    .style('opacity', 0)
    .text('Date')
    .transition()
    .duration(800)
    .delay(600)
    .style('opacity', 1);

  // Y-axis
  const yAxis = svg.append('g')
    .call(d3.axisLeft(y))
    .style('font-size', '11px')
    .style('opacity', 0);

  yAxis.transition()
    .duration(800)
    .delay(200)
    .style('opacity', 1);

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -60)
    .attr('text-anchor', 'middle')
    .style('font-size', '14px')
    .style('font-weight', 'bold')
    .style('opacity', 0)
    .text('Normalized Scale (0-1)')
    .transition()
    .duration(800)
    .delay(400)
    .style('opacity', 1);

  // Title
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -20)
    .attr('text-anchor', 'middle')
    .style('font-size', '16px')
    .style('font-weight', 'bold')
    .style('opacity', 0)
    .text(`Weekly COVID Cases and Vaccinations in ${country} (${startYear}-${endYear}) - Normalized`)
    .transition()
    .duration(1000)
    .delay(100)
    .style('opacity', 1);

  // Legend
  const legend = svg.append('g')
    .attr('transform', `translate(10, 10)`)
    .style('opacity', 0);

  lines.forEach((lineConfig, i) => {
    const legendRow = legend.append('g')
      .attr('transform', `translate(0, ${i * 20})`);

    legendRow.append('line')
      .attr('x1', 0)
      .attr('x2', 40)
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('stroke', lineConfig.color)
      .attr('stroke-width', lineConfig.width)
      .attr('opacity', lineConfig.opacity);

    legendRow.append('text')
      .attr('x', 45)
      .attr('y', 4)
      .style('font-size', '12px')
      .text(lineConfig.label);
  });

  legend.append('rect')
    .attr('x', -5)
    .attr('y', -10)
    .attr('width', 220)
    .attr('height', 90)
    .attr('fill', 'white')
    .attr('opacity', 0.9)
    .attr('stroke', '#ccc')
    .attr('stroke-width', 1)
    .lower();

  // Animate legend
  legend.transition()
    .duration(800)
    .delay(800)
    .style('opacity', 1);
  }; // End of renderPlot function

  // Create toggle button
  const tsCovidContainer = d3.select('#tsCovidPlot');
  
  // Remove any existing button first
  tsCovidContainer.selectAll('.tscovid-toggle-container').remove();
  
  const buttonContainer = tsCovidContainer
    .append('div')
    .attr('class', 'tscovid-toggle-container')
    .style('position', 'absolute')
    .style('top', '10px')
    .style('right', '10px')
    .style('z-index', '100');

  const toggleButton = buttonContainer.append('button')
    .attr('class', 'tscovid-toggle-btn')
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
    .text(`Switch to ${country2}`)
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
      // Toggle between countries
      currentCountry = (currentCountry === country1) ? country2 : country1;
      const otherCountry = (currentCountry === country1) ? country2 : country1;
      
      // Update button text
      d3.select(this).text(`Switch to ${otherCountry}`);
      
      // Re-render plot
      renderPlot(currentCountry);
    });

  // Initial render
  renderPlot(currentCountry);
}
