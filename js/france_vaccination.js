// France Vaccination Data Visualization
// Plots cumulative vaccination data by region with interactive dose type selection

/**
 * Create dot plot visualization for French vaccination data
 * @param {string} containerSelector - CSS selector for container
 */
export async function createFranceVaccinationPlot(containerSelector = '#vaccinPlot') {
    const container = d3.select(containerSelector);
    
    // Clear existing content
    container.html('');
    
    // Get container dimensions
    const containerNode = container.node();
    const rect = containerNode.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;
    const margin = { top: 80, right: 150, bottom: 100, left: 100 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    // Create control buttons container
    const controlsDiv = container.append('div')
        .attr('class', 'dose-controls')
        .style('text-align', 'center')
        .style('margin-bottom', '20px')
        .style('padding', '15px')
        .style('background', 'rgba(20, 0, 40, 0.6)')
        .style('border-radius', '8px')
        .style('border', '1px solid rgba(167, 139, 250, 0.3)');

    controlsDiv.append('h3')
        .style('color', '#a78bfa')
        .style('margin', '0 0 15px 0')
        .style('font-size', '1.2rem')
        .text('Select Dose Type:');

    const buttonGroup = controlsDiv.append('div')
        .attr('class', 'button-group')
        .style('display', 'flex')
        .style('gap', '10px')
        .style('justify-content', 'center')
        .style('flex-wrap', 'wrap');

    // Dose type configurations
    const doseTypes = [
        { key: 'n_tot_dose1', label: '1st Dose', color: '#60a5fa' },
        { key: 'n_tot_dose2', label: '2nd Dose', color: '#34d399' },
        { key: 'n_tot_complet', label: 'Complete', color: '#a78bfa' },
        { key: 'n_tot_rappel', label: '1st Booster', color: '#f472b6' },
        { key: 'n_tot_2_rappel', label: '2nd Booster', color: '#fb923c' },
        { key: 'n_tot_dose3', label: '3rd Dose', color: '#fbbf24' },
        { key: 'n_tot_dose4', label: '4th Dose', color: '#f87171' }
    ];

    let currentDoseType = doseTypes[0];

    // Create SVG
    const svg = container.append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Load and process data
    try {
        // Load CSV with semicolon delimiter
        const rawData = await d3.text('data/vacsi-tot-v-reg-2023-07-13-15h51.csv');
        const data = d3.dsvFormat(';').parse(rawData, d => ({
            region: d.reg,
            vaccin: d.vaccin,
            jour: d.jour,
            n_tot_dose1: +d.n_tot_dose1 || 0,
            n_tot_dose2: +d.n_tot_dose2 || 0,
            n_tot_dose3: +d.n_tot_dose3 || 0,
            n_tot_dose4: +d.n_tot_dose4 || 0,
            n_tot_complet: +d.n_tot_complet || 0,
            n_tot_rappel: +d.n_tot_rappel || 0,
            n_tot_2_rappel: +d.n_tot_2_rappel || 0
        }));

        console.log(`Loaded ${data.length} vaccination records`);

        // Aggregate data by region (sum all vaccine types per region)
        const regionData = d3.rollup(
            data,
            v => ({
                n_tot_dose1: d3.sum(v, d => d.n_tot_dose1),
                n_tot_dose2: d3.sum(v, d => d.n_tot_dose2),
                n_tot_dose3: d3.sum(v, d => d.n_tot_dose3),
                n_tot_dose4: d3.sum(v, d => d.n_tot_dose4),
                n_tot_complet: d3.sum(v, d => d.n_tot_complet),
                n_tot_rappel: d3.sum(v, d => d.n_tot_rappel),
                n_tot_2_rappel: d3.sum(v, d => d.n_tot_2_rappel)
            }),
            d => d.region
        );

        // Convert to array and sort by region
        const plotData = Array.from(regionData, ([region, values]) => ({
            region,
            ...values
        })).sort((a, b) => a.region.localeCompare(b.region));

        console.log('Aggregated data by region:', plotData);

        // Create scales
        const xScale = d3.scaleBand()
            .domain(plotData.map(d => d.region))
            .range([0, plotWidth])
            .padding(0.3);

        const yScale = d3.scaleLinear()
            .range([plotHeight, 0]);

        // Create axes groups
        const xAxisGroup = g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${plotHeight})`);

        const yAxisGroup = g.append('g')
            .attr('class', 'y-axis');

        // Add axis labels
        g.append('text')
            .attr('class', 'x-label')
            .attr('x', plotWidth / 2)
            .attr('y', plotHeight + 60)
            .attr('text-anchor', 'middle')
            .style('fill', '#e0d5ff')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text('Region (Département)');

        const yLabel = g.append('text')
            .attr('class', 'y-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -plotHeight / 2)
            .attr('y', -60)
            .attr('text-anchor', 'middle')
            .style('fill', '#e0d5ff')
            .style('font-size', '14px')
            .style('font-weight', 'bold');

        // Add title
        const title = g.append('text')
            .attr('class', 'plot-title')
            .attr('x', plotWidth / 2)
            .attr('y', -40)
            .attr('text-anchor', 'middle')
            .style('fill', '#a78bfa')
            .style('font-size', '18px')
            .style('font-weight', 'bold');

        // Dots group
        const dotsGroup = g.append('g').attr('class', 'dots');

        // Tooltip
        const tooltip = d3.select('body').append('div')
            .attr('class', 'vaccination-tooltip')
            .style('position', 'absolute')
            .style('visibility', 'hidden')
            .style('background', 'rgba(20, 0, 40, 0.95)')
            .style('color', '#e0d5ff')
            .style('padding', '12px')
            .style('border-radius', '8px')
            .style('border', '1px solid rgba(167, 139, 250, 0.3)')
            .style('font-size', '13px')
            .style('pointer-events', 'none')
            .style('z-index', '10000')
            .style('box-shadow', '0 0 20px rgba(167, 139, 250, 0.2)');

        // Update function
        function updatePlot(doseType) {
            currentDoseType = doseType;

            // Update y scale domain
            const maxValue = d3.max(plotData, d => d[doseType.key]);
            yScale.domain([0, maxValue * 1.1]);

            // Update axes
            xAxisGroup.transition().duration(750)
                .call(d3.axisBottom(xScale))
                .selectAll('text')
                .style('fill', '#e0d5ff')
                .style('font-size', '11px')
                .attr('transform', 'rotate(-45)')
                .style('text-anchor', 'end');

            xAxisGroup.selectAll('path, line')
                .style('stroke', 'rgba(255, 255, 255, 0.3)');

            yAxisGroup.transition().duration(750)
                .call(d3.axisLeft(yScale).ticks(8).tickFormat(d3.format('.2s')))
                .selectAll('text')
                .style('fill', '#e0d5ff')
                .style('font-size', '12px');

            yAxisGroup.selectAll('path, line')
                .style('stroke', 'rgba(255, 255, 255, 0.3)');

            // Update title and label
            title.text(`French Vaccination Data by Region - ${doseType.label}`);
            yLabel.text(`Cumulative ${doseType.label} Count`);

            // Update dots
            const dots = dotsGroup.selectAll('circle')
                .data(plotData, d => d.region);

            // Exit
            dots.exit()
                .transition()
                .duration(500)
                .attr('r', 0)
                .remove();

            // Enter + Update
            dots.enter()
                .append('circle')
                .attr('cx', d => xScale(d.region) + xScale.bandwidth() / 2)
                .attr('cy', plotHeight)
                .attr('r', 0)
                .style('fill', doseType.color)
                .style('stroke', 'white')
                .style('stroke-width', 2)
                .style('opacity', 0.8)
                .style('cursor', 'pointer')
                .merge(dots)
                .on('mouseover', function(event, d) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('r', 10)
                        .style('opacity', 1);

                    tooltip
                        .html(`
                            <strong style="color: ${doseType.color};">Region ${d.region}</strong><br/>
                            <span style="color: #c4b5fd;">${doseType.label}:</span> 
                            <strong>${d[doseType.key].toLocaleString()}</strong>
                        `)
                        .style('visibility', 'visible');
                })
                .on('mousemove', function(event) {
                    tooltip
                        .style('top', (event.pageY - 10) + 'px')
                        .style('left', (event.pageX + 10) + 'px');
                })
                .on('mouseout', function() {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('r', 6)
                        .style('opacity', 0.8);

                    tooltip.style('visibility', 'hidden');
                })
                .transition()
                .duration(750)
                .attr('cy', d => yScale(d[doseType.key]))
                .attr('r', 6)
                .style('fill', doseType.color);
        }

        // Create buttons
        doseTypes.forEach(doseType => {
            const button = buttonGroup.append('button')
                .attr('class', 'dose-button')
                .style('padding', '10px 20px')
                .style('border', '2px solid ' + doseType.color)
                .style('background', 'rgba(20, 0, 40, 0.8)')
                .style('color', '#e0d5ff')
                .style('border-radius', '6px')
                .style('cursor', 'pointer')
                .style('font-size', '14px')
                .style('font-weight', 'bold')
                .style('transition', 'all 0.3s ease')
                .text(doseType.label)
                .on('click', function() {
                    // Update active button style
                    buttonGroup.selectAll('button')
                        .style('background', 'rgba(20, 0, 40, 0.8)')
                        .style('transform', 'scale(1)');

                    d3.select(this)
                        .style('background', doseType.color)
                        .style('transform', 'scale(1.05)');

                    updatePlot(doseType);
                })
                .on('mouseover', function() {
                    if (currentDoseType !== doseType) {
                        d3.select(this)
                            .style('background', 'rgba(' + doseType.color + ', 0.3)')
                            .style('transform', 'scale(1.05)');
                    }
                })
                .on('mouseout', function() {
                    if (currentDoseType !== doseType) {
                        d3.select(this)
                            .style('background', 'rgba(20, 0, 40, 0.8)')
                            .style('transform', 'scale(1)');
                    }
                });
        });

        // Initial plot
        updatePlot(currentDoseType);

        // Set initial button state
        buttonGroup.select('button')
            .style('background', currentDoseType.color)
            .style('transform', 'scale(1.05)');

    } catch (error) {
        console.error('Error loading vaccination data:', error);
        container.append('div')
            .style('color', '#ff6b6b')
            .style('padding', '20px')
            .style('text-align', 'center')
            .text('Error loading vaccination data: ' + error.message);
    }
}

export default { createFranceVaccinationPlot };
