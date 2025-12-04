
const mapContext = {
    width: window.innerWidth * 0.8 - 100,
    height: window.innerHeight * 0.8 - 100,
    selectedRegion: null,
    selectedRegionCode: null, 
    allRegionsData: null,
    allBoundariesData: null,
    nuts2RegionsData: null,
    vaccinationData: null,
    projection: null,
    path: null,
    svg: null,
    mapGroup: null,
    regionsGroup: null,
    boundariesGroup: null,
    dotsGroup: null,
    labelsGroup: null,
    zoom: null,
    showDots: true,
    selectedVaccineType: 'all',
    selectedYearRange: 'all',
    showByVaccineType: false,
    containerSelector: null
};

// Vaccine type mapping
const vaccineTypeNames = {
    '0': 'Tous vaccins',
    '1': 'COMIRNATY-30-adulte (Pfizer/BioNTech)',
    '2': 'Spikevax (Moderna)',
    '3': 'Vaxzevria (AstraZeneca)',
    '4': 'Janssen (Johnson&Johnson)',
    '5': 'COMIRNATY-10-enfant (Pfizer/BioNTech)',
    '6': 'NUVAXOVID (Novavax)',
    '9': 'Spikevax Bivalent (Moderna)',
    '10': 'Sanofi VidPrevtyn Beta',
    '11': 'COMIRNATY-3 pédiatrique 6m-4a (Pfizer/BioNTech)',
    '12': 'Spikevax Bivalent Ori/Omi BA.5 (Moderna)'
};

// Color palette for vaccine types (11 distinct colors)
const vaccineColors = {
    '0': '#808080',  // Gray for "All vaccines"
    '1': '#1f77b4',  // Blue - Pfizer adult
    '2': '#ff7f0e',  // Orange - Moderna
    '3': '#2ca02c',  // Green - AstraZeneca
    '4': '#d62728',  // Red - Janssen
    '5': '#9467bd',  // Purple - Pfizer child
    '6': '#8c564b',  // Brown - Novavax
    '9': '#e377c2',  // Pink - Moderna Bivalent
    '10': '#7f7f7f', // Gray - Sanofi
    '11': '#bcbd22', // Yellow-green - Pfizer pediatric
    '12': '#17becf'  // Cyan - Moderna BA.5
};

const vaccineColorScale = d3.scaleOrdinal()
    .domain(Object.keys(vaccineTypeNames))
    .range(Object.values(vaccineColors));

// Color scale for regions
const colorScale = d3.scaleSequential()
    .interpolator(d3.interpolatePurples)
    .domain([0, 1]);

// Soft pastel palette for French regions (NUTS2)
const regionColorPalette = [
    '#c4b5fd', '#a78bfa', '#d8b4fe', '#f0abfc', '#e0d5ff',
    '#c084fc', '#ddd6fe', '#e879f9', '#d946ef', '#c026d3',
    '#a21caf', '#9333ea', '#c7d2fe', '#8b5cf6', '#a5b4fc'
];

const regionColorScale = d3.scaleOrdinal(regionColorPalette);

// Map region codes to their NUTS3 département codes (from nutsrg.geojson)
const regionToDepartements = {
    '11': ['FR101', 'FR102', 'FR103', 'FR104', 'FR105', 'FR106', 'FR107', 'FR108'], // Île-de-France
    '32': ['FRE11', 'FRE12', 'FRE21', 'FRE22', 'FRE23'], // Hauts-de-France
    '44': ['FRF11', 'FRF12', 'FRF21', 'FRF22', 'FRF23', 'FRF24', 'FRF31', 'FRF32', 'FRF33', 'FRF34'], // Grand Est
    '27': ['FRC11', 'FRC12', 'FRC13', 'FRC14', 'FRC21', 'FRC22', 'FRC23', 'FRC24'], // Bourgogne-Franche-Comté
    '28': ['FRD11', 'FRD12', 'FRD13', 'FRD21', 'FRD22'], // Normandie
    '53': ['FRH01', 'FRH02', 'FRH03', 'FRH04'], // Bretagne
    '52': ['FRG01', 'FRG02', 'FRG03', 'FRG04', 'FRG05'], // Pays de la Loire
    '24': ['FRB01', 'FRB02', 'FRB03', 'FRB04', 'FRB05', 'FRB06'], // Centre-Val de Loire
    '75': ['FRI11', 'FRI12', 'FRI13', 'FRI14', 'FRI15', 'FRI21', 'FRI22', 'FRI23', 'FRI31', 'FRI32', 'FRI33', 'FRI34'], // Nouvelle-Aquitaine
    '76': ['FRJ11', 'FRJ12', 'FRJ13', 'FRJ14', 'FRJ15', 'FRJ21', 'FRJ22', 'FRJ23', 'FRJ24', 'FRJ25', 'FRJ26', 'FRJ27', 'FRJ28'], // Occitanie
    '84': ['FRK11', 'FRK12', 'FRK13', 'FRK14', 'FRK21', 'FRK22', 'FRK23', 'FRK24', 'FRK25', 'FRK26', 'FRK27', 'FRK28'], // Auvergne-Rhône-Alpes
    '93': ['FRL01', 'FRL02', 'FRL03', 'FRL04', 'FRL05', 'FRL06'], // Provence-Alpes-Côte d'Azur
    '94': ['FRM01', 'FRM02'] // Corse
};
 
export function drawFranceMap(containerSelector = '#franceMap') {
    const container = d3.select(containerSelector);
    
    // Store container selector for resize
    mapContext.containerSelector = containerSelector;
    
    const containerNode = container.node();
    if (containerNode) {
        const rect = containerNode.getBoundingClientRect();
        mapContext.width = rect.width || mapContext.width;
        mapContext.height = rect.height || mapContext.height;
        console.log(`📐 Map dimensions: ${mapContext.width}x${mapContext.height}`);
    }

    // Add vaccine type selection buttons
    const vaccineControlsDiv = container
        .append('div')
        .attr('class', 'vaccine-controls')
        .style('display', 'flex')
        .style('justify-content', 'center')
        .style('align-items', 'center')
        .style('gap', '10px')
        .style('text-align', 'center')
        .style('margin-bottom', '15px')
        .style('padding', '10px')
        .style('background', 'rgba(20, 0, 40, 0.6)')
        .style('border-radius', '8px')
        .style('border', '1px solid rgba(167, 139, 250, 0.3)')
        .style('opacity', '1');

    vaccineControlsDiv.append('span')
        .style('color', '#ff7b8a')
        .style('margin-right', '10px')
        .style('font-weight', 'bold')
        .text('Vaccine Type:');

    const vaccineTypes = [
        { id: 'all', label: 'All Doses', field: 'all' },
        { id: 'dose1', label: '1st Dose', field: 'n_tot_dose1' },
        { id: 'dose2', label: '2nd Dose', field: 'n_tot_dose2' },
        { id: 'rappel', label: 'Booster', field: 'n_tot_rappel' },
        { id: '2_rappel', label: '2nd Booster', field: 'n_tot_2_rappel' }
    ];

    vaccineTypes.forEach(vaccineType => {
        vaccineControlsDiv.append('button')
            .attr('class', 'vaccine-type-button')
            .attr('data-type', vaccineType.id)
            .style('padding', '6px 12px')
            .style('border', '2px solid rgba(255, 123, 138, 0.5)')
            .style('background', vaccineType.id === 'all' ? 'rgba(255, 0, 51, 0.3)' : 'rgba(20, 0, 40, 0.8)')
            .style('color', '#ffe6e6')
            .style('border-radius', '6px')
            .style('cursor', 'pointer')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .style('transition', 'all 0.3s ease')
            .text(vaccineType.label)
            .on('click', function() {
                // Update button states
                vaccineControlsDiv.selectAll('button')
                    .style('background', 'rgba(20, 0, 40, 0.8)');
                
                d3.select(this)
                    .style('background', 'rgba(255, 0, 51, 0.3)');


                mapContext.selectedVaccineType = vaccineType.id;
                console.log(`💉 Vaccine type changed to: ${vaccineType.label}`);
                
                // Re-render dots with transition
                if (mapContext.showDots) {
                    updateMapLevel();
                }
            })
            .on('mouseover', function() {
                if (mapContext.selectedVaccineType !== vaccineType.id) {
                    d3.select(this).style('background', 'rgba(255, 123, 138, 0.2)');
                }
            })
            .on('mouseout', function() {
                if (mapContext.selectedVaccineType !== vaccineType.id) {
                    d3.select(this).style('background', 'rgba(20, 0, 40, 0.8)');
                }
            });
    });

    // Year Range Controls
    const yearControlsDiv = container
        .append('div')
        .attr('class', 'year-range-controls')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('justify-content', 'center')
        .style('gap', '8px')
        .style('margin-bottom', '10px')
        .style('padding', '8px 15px')
        .style('background', 'rgba(20, 0, 40, 0.6)')
        .style('border-radius', '6px')
        .style('border', '1px solid rgba(138, 165, 255, 0.3)')
        .style('transition', 'opacity 0.3s ease');

    yearControlsDiv.append('span')
        .style('font-size', '12px')
        .style('color', '#8aa5ff')
        .style('margin-right', '10px')
        .style('font-weight', 'bold')
        .text('Year Range:');

    const yearRanges = [
        { id: 'all', label: 'All Years' },
        { id: '2020-2021', label: '2020-2021' },
        { id: '2021-2022', label: '2021-2022' },
        { id: '2022-2023', label: '2022-2023' }
    ];

    yearRanges.forEach(yearRange => {
        yearControlsDiv.append('button')
            .attr('class', 'year-range-button')
            .attr('data-range', yearRange.id)
            .style('padding', '6px 12px')
            .style('border', '2px solid rgba(138, 165, 255, 0.5)')
            .style('background', yearRange.id === 'all' ? 'rgba(0, 102, 255, 0.3)' : 'rgba(20, 0, 40, 0.8)')
            .style('color', '#e6f0ff')
            .style('border-radius', '6px')
            .style('cursor', 'pointer')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .style('transition', 'all 0.3s ease')
            .text(yearRange.label)
            .on('click', function() {
                // Update button states
                yearControlsDiv.selectAll('button')
                    .style('background', 'rgba(20, 0, 40, 0.8)');
                
                d3.select(this)
                    .style('background', 'rgba(0, 102, 255, 0.3)');

                mapContext.selectedYearRange = yearRange.id;
                console.log(`📅 Year range changed to: ${yearRange.label}`);
                
                // Dispatch event for other visualizations
                const event = new CustomEvent('yearRangeChanged', {
                    detail: {
                        yearRange: yearRange.id,
                        yearLabel: yearRange.label
                    }
                });
                document.dispatchEvent(event);
                
                // Re-render the map with new year filter
                if (mapContext.showDots) {
                    updateMapLevel();
                }
            })
            .on('mouseover', function() {
                if (mapContext.selectedYearRange !== yearRange.id) {
                    d3.select(this).style('background', 'rgba(138, 165, 255, 0.2)');
                }
            })
            .on('mouseout', function() {
                if (mapContext.selectedYearRange !== yearRange.id) {
                    d3.select(this).style('background', 'rgba(20, 0, 40, 0.8)');
                }
            });
    });

    // Add "By Vaccine Type" toggle button
    const vaccineTypeToggleDiv = container
        .append('div')
        .attr('class', 'vaccine-type-toggle')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('justify-content', 'center')
        .style('margin-bottom', '10px')
        .style('padding', '8px 15px')
        .style('background', 'rgba(20, 0, 40, 0.6)')
        .style('border-radius', '6px')
        .style('border', '1px solid rgba(167, 255, 139, 0.3)')
        .style('transition', 'opacity 0.3s ease');

    vaccineTypeToggleDiv.append('span')
        .style('font-size', '12px')
        .style('color', '#a7ff8b')
        .style('margin-right', '10px')
        .style('font-weight', 'bold')
        .text('Visualization Mode:');

    const modeButtons = [
        { id: 'intensity', label: 'By Intensity' },
        { id: 'vaccine-type', label: 'By Vaccine Type' }
    ];

    modeButtons.forEach(mode => {
        vaccineTypeToggleDiv.append('button')
            .attr('class', 'mode-button')
            .attr('data-mode', mode.id)
            .style('padding', '6px 12px')
            .style('border', '2px solid rgba(167, 255, 139, 0.5)')
            .style('background', mode.id === 'intensity' ? 'rgba(50, 205, 50, 0.3)' : 'rgba(20, 0, 40, 0.8)')
            .style('color', '#e6ffe6')
            .style('border-radius', '6px')
            .style('cursor', 'pointer')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .style('transition', 'all 0.3s ease')
            .style('margin-right', '8px')
            .text(mode.label)
            .on('click', function() {
                // Update button states
                vaccineTypeToggleDiv.selectAll('button')
                    .style('background', 'rgba(20, 0, 40, 0.8)');
                
                d3.select(this)
                    .style('background', 'rgba(50, 205, 50, 0.3)');

                mapContext.showByVaccineType = (mode.id === 'vaccine-type');
                console.log(`🎨 Visualization mode changed to: ${mode.label}`);
                
                // Toggle visibility of vaccine type controls
                vaccineControlsDiv.style('opacity', mapContext.showByVaccineType ? '0' : '1');
                // Disable vaccine type controls when in "By Vaccine Type" mode
                vaccineControlsDiv.style('pointer-events', mapContext.showByVaccineType ? 'none' : 'auto');
                
                // Toggle vaccine info panel visibility
                if (mapContext.vaccineInfoPanel) {
                    mapContext.vaccineInfoPanel.style('display', mapContext.showByVaccineType ? 'block' : 'none');
                }
                
                // Toggle dot legend visibility
                if (mapContext.dotLegend) {
                    mapContext.dotLegend.style('display', mapContext.showByVaccineType ? 'none' : 'flex');
                }
                
                // Toggle legend visibility
                if (mapContext.showByVaccineType) {
                    d3.select('#dot-intensity-legend').style('display', 'none');
                    d3.select('#vaccine-type-legend').style('display', 'none');
                } else {
                    d3.select('#dot-intensity-legend').style('display', 'block');
                    d3.select('#vaccine-type-legend').style('display', 'none');
                }
                
                // Re-render dots
                if (mapContext.showDots) {
                    updateMapLevel();
                }
            })
            .on('mouseover', function() {
                if ((mode.id === 'vaccine-type') !== mapContext.showByVaccineType) {
                    d3.select(this).style('background', 'rgba(167, 255, 139, 0.2)');
                }
            })
            .on('mouseout', function() {
                if ((mode.id === 'vaccine-type') !== mapContext.showByVaccineType) {
                    d3.select(this).style('background', 'rgba(20, 0, 40, 0.8)');
                }
            });
    });

    // Show vaccine controls when dots are enabled
    function updateVaccineControlsVisibility() {
        vaccineControlsDiv.style('opacity', mapContext.showDots ? '1' : '0');
        yearControlsDiv.style('opacity', mapContext.showDots ? '1' : '0');
        vaccineTypeToggleDiv.style('opacity', mapContext.showDots ? '1' : '0');
    }

    // Add dot legend - will be updated when dots are generated
    const dotLegend = container
        .append('div')
        .attr('class', 'dot-legend')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('justify-content', 'center')
        .style('gap', '8px')
        .style('margin-bottom', '10px')
        .style('padding', '8px 15px')
        .style('background', 'rgba(20, 0, 40, 0.6)')
        .style('border-radius', '6px')
        .style('border', '1px solid rgba(255, 123, 138, 0.3)')
        .style('font-size', '12px')
        .style('color', '#ffe6e6');

    dotLegend.append('span')
        .attr('class', 'dot-symbol')
        .style('width', '8px')
        .style('height', '8px')
        .style('border-radius', '50%')
        .style('background', '#ff7b8a')
        .style('display', 'inline-block');

    dotLegend.append('span')
        .attr('class', 'dot-text')
        .style('color', '#c4b5fd')
        .text('1 dot = ');

    dotLegend.append('span')
        .attr('class', 'dot-value')
        .style('font-weight', 'bold')
        .style('color', '#ffe6e6')
        .text('calculating...');

    dotLegend.append('span')
        .style('color', '#c4b5fd')
        .text(' vaccinations');

    // Store reference for updates
    mapContext.dotLegend = dotLegend;

    // Add vaccine type info panel below the map (initially hidden)
    const vaccineInfoPanel = container
        .append('div')
        .attr('class', 'vaccine-info-panel')
        .style('display', 'none')
        .style('margin-top', '15px')
        .style('padding', '15px')
        .style('background', 'rgba(20, 0, 40, 0.9)')
        .style('border-radius', '8px')
        .style('border', '2px solid rgba(167, 255, 139, 0.6)')
        .style('max-width', '100%');

    vaccineInfoPanel.append('div')
        .style('text-align', 'center')
        .style('margin-bottom', '12px')
        .style('font-weight', 'bold')
        .style('font-size', '14px')
        .style('color', '#a7ff8b')
        .text('Vaccine Type Color Guide');

    const vaccineGrid = vaccineInfoPanel.append('div')
        .style('display', 'grid')
        .style('grid-template-columns', 'repeat(auto-fit, minmax(280px, 1fr))')
        .style('gap', '10px')
        .style('margin-top', '10px');

    // Add vaccine type items (excluding "0" - Tous vaccins)
    Object.entries(vaccineTypeNames)
        .filter(([id]) => id !== '0')
        .forEach(([vaccineId, vaccineName]) => {
            const item = vaccineGrid.append('div')
                .style('display', 'flex')
                .style('align-items', 'center')
                .style('padding', '8px 12px')
                .style('background', 'rgba(255, 255, 255, 0.05)')
                .style('border-radius', '6px')
                .style('border', `1px solid ${vaccineColors[vaccineId]}30`);

            item.append('div')
                .style('width', '14px')
                .style('height', '14px')
                .style('border-radius', '50%')
                .style('background', vaccineColors[vaccineId])
                .style('border', '2px solid rgba(255, 255, 255, 0.5)')
                .style('margin-right', '10px')
                .style('flex-shrink', '0');

            item.append('span')
                .style('font-size', '12px')
                .style('color', '#e6ffe6')
                .style('line-height', '1.3')
                .text(vaccineName);
        });

    // Store reference for updates
    mapContext.vaccineInfoPanel = vaccineInfoPanel;

    // Create SVG container
    const svg = container
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${mapContext.width} ${mapContext.height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .style('background', 'transparent')
        .style('background', 'transparent');

    // Decorative defs for glows and shadows
    const defs = svg.append('defs');

    const glowFilter = defs.append('filter')
        .attr('id', 'regionGlow')
        .attr('x', '-30%')
        .attr('y', '-30%')
        .attr('width', '160%')
        .attr('height', '160%');

    glowFilter.append('feGaussianBlur')
        .attr('stdDeviation', 6)
        .attr('result', 'coloredBlur');

    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Create groups for layers
    const mapGroup = svg.append('g').attr('class', 'map-group');
    const regionsGroup = mapGroup.append('g').attr('class', 'regions');
    const boundariesGroup = mapGroup.append('g').attr('class', 'boundaries');
    const dotsGroup = mapGroup.append('g').attr('class', 'dots');
    const labelsGroup = mapGroup.append('g').attr('class', 'labels');

    // Create tooltip
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'map-tooltip')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('background', 'rgba(20, 0, 40, 0.95)')
        .style('color', '#e0d5ff')
        .style('padding', '12px')
        .style('border-radius', '8px')
        .style('border', '1px solid rgba(167, 139, 250, 0.3)')
        .style('font-size', '14px')
        .style('pointer-events', 'none')
        .style('z-index', '1000')
        .style('box-shadow', '0 0 20px rgba(167, 139, 250, 0.2)');

    const zoom = d3.zoom()
        .scaleExtent([1, 1]) 
        .on('zoom', null); 

    mapContext.svg = svg;
    mapContext.mapGroup = mapGroup;
    mapContext.regionsGroup = regionsGroup;
    mapContext.boundariesGroup = boundariesGroup;
    mapContext.dotsGroup = dotsGroup;
    mapContext.labelsGroup = labelsGroup;
    mapContext.zoom = zoom;

    // Load the GeoJSON data and vaccination data
    Promise.all([
        d3.json('data/nutsrg.geojson'),
        d3.json('data/nutsbn.geojson'),
        d3.json('data/regions.geojson'),
        d3.dsv(';', 'data/vacsi-v-dep-2023-07-13-15h51.csv')
    ]).then(([regionsData, boundariesData, nuts2RegionsData, vaccinationData]) => {
        console.log('GeoJSON data loaded successfully');
        console.log('Vaccination data loaded:', vaccinationData.length, 'records');
        
        // Store data in context
        mapContext.allRegionsData = regionsData;
        mapContext.allBoundariesData = boundariesData;
        mapContext.vaccinationData = vaccinationData;
        mapContext.nuts2RegionsData = nuts2RegionsData;

        // Initial render
        updateMapLevel();
    })
    .catch(error => {
        console.error('Error loading France map data:', error);
        container.append('div')
            .style('color', '#ff6b6b')
            .style('padding', '20px')
            .text('Error loading map data: ' + error.message);
    });

    function dissolveToNuts2(nuts3Features) {
        const regionGroups = new Map();
        
        nuts3Features.forEach(feature => {
            const nuts2Code = feature.properties.id.substring(0, 3);
            if (!regionGroups.has(nuts2Code)) {
                regionGroups.set(nuts2Code, []);
            }
            regionGroups.get(nuts2Code).push(feature);
        });

        const nuts2Features = [];
        regionGroups.forEach((depts, nuts2Code) => {
        
            const mergedGeometry = {
                type: 'GeometryCollection',
                geometries: depts.map(d => d.geometry)
            };

            const mergedFeature = {
                type: 'Feature',
                properties: {
                    id: nuts2Code,
                    na: `Region ${nuts2Code}`,
                    lvl: 2
                },
                geometry: mergedGeometry
            };

            nuts2Features.push(mergedFeature);
        });

        return nuts2Features;
    }

    function generateDotsForDepartment(feature, vaccinationIntensity, path, dotsPerUnit, vaccineTypeId = null) {
        const dots = [];
        
        if (vaccinationIntensity === 0) return dots;
        
        const numDots = Math.floor(vaccinationIntensity / dotsPerUnit);
        
        if (numDots === 0) return dots;
        const bounds = path.bounds(feature);
        const [[x0, y0], [x1, y1]] = bounds;
        
        const context = d3.path();
        path.context(context)(feature);
        const pathString = context.toString();
        
        let attempts = 0;
        const maxAttempts = numDots * 200;
        
        while (dots.length < numDots && attempts < maxAttempts) {
            attempts++;
            
            const x = x0 + Math.random() * (x1 - x0);
            const y = y0 + Math.random() * (y1 - y0);
            
            if (isPointInPath(x, y, pathString, feature, path)) {
                dots.push({ 
                    x, 
                    y, 
                    intensity: vaccinationIntensity,
                    depId: feature.properties.id,
                    vaccineType: vaccineTypeId
                });
            }
        }
        

        if (dots.length < numDots * 0.5 && numDots > 10) {
            console.warn(`Low dot generation for ${feature.properties.id} (${feature.properties.na}): ${dots.length}/${numDots} dots after ${attempts} attempts`);
        }
        
        return dots;
    }
    
    function isPointInPath(x, y, pathString, feature, path) {
        const projection = path.projection();
        
        const scale = projection.scale();
        const translate = projection.translate();
        
        const geoX = (x - translate[0]) / scale;
        const geoY = (translate[1] - y) / scale; 
        
        return testPointInFeature(geoX, geoY, feature);
    }
    
    function testPointInFeature(x, y, feature) {
        const geometry = feature.geometry;
        
        if (geometry.type === 'Polygon') {
            return pointInPolygon([x, y], geometry.coordinates);
        } else if (geometry.type === 'MultiPolygon') {
            return geometry.coordinates.some(polygon => pointInPolygon([x, y], polygon));
        }
        
        return false;
    }
    
    function pointInPolygon(point, rings) {
        const [x, y] = point;
        const ring = rings[0]; 
        let inside = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const [xi, yi] = ring[i];
            const [xj, yj] = ring[j];
            
            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            
            if (intersect) inside = !inside;
        }
        
        return inside;
    }

    function getNutsToDepCode() {
        return {
            'FR101': '75', 'FR102': '77', 'FR103': '78', 'FR104': '91', 'FR105': '92',
            'FR106': '93', 'FR107': '94', 'FR108': '95',
            'FRB01': '18', 'FRB02': '28', 'FRB03': '36', 'FRB04': '37', 'FRB05': '41', 'FRB06': '45',
            'FRC11': '75', 'FRC12': '77', 'FRC13': '78', 'FRC14': '91', 'FRC21': '92', 'FRC22': '93', 'FRC23': '94', 'FRC24': '95',
            'FRD11': '14', 'FRD12': '16', 'FRD13': '35', 'FRD14': '50', 'FRD21': '61', 'FRD22': '76', 'FRD23': '80',
            'FRE11': '59', 'FRE12': '62', 'FRE21': '02', 'FRE22': '60', 'FRE23': '80',
            'FRF11': '18', 'FRF12': '36', 'FRF13': '37', 'FRF14': '41', 'FRF15': '45',
            'FRF21': '08', 'FRF22': '10', 'FRF23': '51', 'FRF24': '52',
            'FRF31': '54', 'FRF32': '55', 'FRF33': '57', 'FRF34': '67', 'FRF35': '68', 'FRF36': '88',
            'FRG01': '27', 'FRG02': '44', 'FRG03': '49', 'FRG04': '53', 'FRG05': '72', 'FRG06': '85',
            'FRH01': '22', 'FRH02': '29', 'FRH03': '56', 'FRH04': '56',
            'FRI11': '19', 'FRI12': '23', 'FRI13': '40', 'FRI14': '47', 'FRI15': '64',
            'FRI21': '87', 'FRI22': '23', 'FRI23': '87',
            'FRI31': '17', 'FRI32': '24', 'FRI33': '33', 'FRI34': '40', 'FRI35': '47', 'FRI36': '64', 'FRI37': '79', 'FRI38': '86',
            'FRJ11': '11', 'FRJ12': '12', 'FRJ13': '34', 'FRJ14': '48', 'FRJ15': '66',
            'FRJ21': '09', 'FRJ22': '30', 'FRJ23': '31', 'FRJ24': '32', 'FRJ25': '46', 'FRJ26': '65', 'FRJ27': '81', 'FRJ28': '82',
            'FRK11': '03', 'FRK12': '15', 'FRK13': '43', 'FRK14': '63',
            'FRK21': '01', 'FRK22': '07', 'FRK23': '21', 'FRK24': '25', 'FRK25': '39', 'FRK26': '26', 'FRK27': '38', 'FRK28': '42', 'FRK29': '69',
            'FRK31': '58', 'FRK32': '70', 'FRK33': '71', 'FRK34': '73', 'FRK35': '74', 'FRK36': '89', 'FRK37': '90',
            'FRL01': '04', 'FRL02': '05', 'FRL03': '06', 'FRL04': '13', 'FRL05': '83', 'FRL06': '84',
            'FRM01': '2A', 'FRM02': '2B',
            'FRY10': '971', 'FRY20': '972', 'FRY30': '973', 'FRY40': '974', 'FRY50': '976'
        };
    }

    function getVaccinationIntensity(depCode) {
        if (!mapContext.vaccinationData) return 0;
        const simpleDepCode = getNutsToDepCode()[depCode];
        if (!simpleDepCode) {
            console.warn(`No mapping found for NUTS code: ${depCode}`);
            return 0;
        }
        
        let depData = mapContext.vaccinationData.filter(d => d.dep === simpleDepCode);
        const yearRange = mapContext.selectedYearRange || 'all';
        if (yearRange !== 'all' && depData.length > 0) {
            depData = depData.filter(d => {
                if (!d.jour) return false;
                
                const dateParts = d.jour.split('-');
                const year = parseInt(dateParts[0]);
                if (yearRange === '2020-2021') {
                    return year >= 2020 && year <= 2021;
                } else if (yearRange === '2021-2022') {
                    return year >= 2021 && year <= 2022;
                } else if (yearRange === '2022-2023') {
                    return year >= 2022 && year <= 2023;
                }
                
                return false;
            });
        }

        const vaccineType = mapContext.selectedVaccineType || 'all';
        const byVaccine = d3.group(depData, d => d.vaccin);
        
        let totalIntensity = 0;
        byVaccine.forEach((records, vaccin) => {
            let vaccineTotal = 0;
            records.forEach(d => {
                if (vaccineType === 'all') {
                    vaccineTotal += (+d.n_dose1 || 0) + 
                                   (+d.n_dose2 || 0) + 
                                   (+d.n_rappel || 0) + 
                                   (+d.n_2_rappel || 0);
                } else if (vaccineType === 'dose1') {
                    vaccineTotal += (+d.n_dose1 || 0);
                } else if (vaccineType === 'dose2') {
                    vaccineTotal += (+d.n_dose2 || 0);
                } else if (vaccineType === 'rappel') {
                    vaccineTotal += (+d.n_rappel || 0);
                } else if (vaccineType === '2_rappel') {
                    vaccineTotal += (+d.n_2_rappel || 0);
                }
            });
            
            totalIntensity += vaccineTotal;
        });
        
        return totalIntensity;
    }
    function renderDotDensity(franceRegions, path) {
        if (!mapContext.showDots) {
            mapContext.dotsGroup.selectAll('circle')
                .transition()
                .duration(400)
                .attr('r', 0)
                .attr('opacity', 0)
                .remove();
            return; 
        }
        
        const intensities = franceRegions.features.map(feature => {
            const depCode = feature.properties.id;
            return getVaccinationIntensity(depCode);
        });
        const maxIntensity = d3.max(intensities) || 1;
        const totalIntensity = d3.sum(intensities);
        let targetDotsTotal;
        const vaccineType = mapContext.selectedVaccineType || 'all';
        
        if (vaccineType === 'all') {
            targetDotsTotal = 7000; // All doses combined - most dots
        } else if (vaccineType === 'dose1') {
            targetDotsTotal = 6000; // First dose - high coverage
        } else if (vaccineType === 'dose2') {
            targetDotsTotal = 4000; // Second dose - slightly less
        } else if (vaccineType === 'rappel') {
            targetDotsTotal = 2000; // Booster - fewer people
        } else if (vaccineType === '2_rappel') {
            targetDotsTotal = 800; // Second booster - much fewer
        } else {
            targetDotsTotal = 5000;
        }
        
        const vaccinationsPerDot = 27000;
        
        if (mapContext.dotLegend) {
            mapContext.dotLegend.select('.dot-value')
                .text(vaccinationsPerDot.toLocaleString());
        }
        const colorScale = d3.scaleSequential()
            .domain([0, maxIntensity])
            .interpolator(d3.interpolatePlasma);
        
        const dotRadius = 2;
        
        const allDots = [];
        let totalDotsGenerated = 0;
        let deptsWithNoDots = [];
        
        if (mapContext.showByVaccineType) {
            franceRegions.features.forEach(feature => {
                const depCode = feature.properties.id;
                const simpleDepCode = getNutsToDepCode()[depCode];
                if (!simpleDepCode) return;
                
                let depData = mapContext.vaccinationData.filter(d => d.dep === simpleDepCode);
                const yearRange = mapContext.selectedYearRange || 'all';
                if (yearRange !== 'all' && depData.length > 0) {
                    depData = depData.filter(d => {
                        if (!d.jour) return false;
                        const dateParts = d.jour.split('-');
                        const year = parseInt(dateParts[0]);
                        if (yearRange === '2020-2021') {
                            return year >= 2020 && year <= 2021;
                        } else if (yearRange === '2021-2022') {
                            return year >= 2021 && year <= 2022;
                        } else if (yearRange === '2022-2023') {
                            return year >= 2022 && year <= 2023;
                        }
                        return false;
                    });
                }
                
                const byVaccine = d3.group(depData, d => d.vaccin);
                byVaccine.forEach((records, vaccineTypeId) => {

                    if (vaccineTypeId === '0') return;
                    
                    let vaccineTotal = 0;
                    records.forEach(d => {
                        vaccineTotal += (+d.n_dose1 || 0) + 
                                       (+d.n_dose2 || 0) + 
                                       (+d.n_rappel || 0) + 
                                       (+d.n_2_rappel || 0);
                    });
                    
                    if (vaccineTotal > 0) {
                        const dots = generateDotsForDepartment(feature, vaccineTotal, path, vaccinationsPerDot, vaccineTypeId);
                        if (dots.length === 0 && vaccineTotal > 0) {
                            const centroid = path.centroid(feature);
                            if (centroid && !isNaN(centroid[0]) && !isNaN(centroid[1])) {
                                dots.push({
                                    x: centroid[0],
                                    y: centroid[1],
                                    intensity: vaccineTotal,
                                    depId: feature.properties.id,
                                    vaccineType: vaccineTypeId
                                });
                            }
                        }
                        totalDotsGenerated += dots.length;
                        allDots.push(...dots);
                    }
                });
            });
        } else {
            franceRegions.features.forEach(feature => {
            const intensity = getVaccinationIntensity(feature.properties.id);
            if (intensity > 0) {
                const dots = generateDotsForDepartment(feature, intensity, path, vaccinationsPerDot);
                
                if (dots.length === 0 && intensity > 0) {
                    const centroid = path.centroid(feature);
                    if (centroid && !isNaN(centroid[0]) && !isNaN(centroid[1])) {
                        dots.push({
                            x: centroid[0],
                            y: centroid[1],
                            intensity: intensity,
                            depId: feature.properties.id
                        });
                    }
                }
                
                if (dots.length === 0) {
                    deptsWithNoDots.push(feature.properties.id + ' (' + feature.properties.na + ')');
                }
                
                totalDotsGenerated += dots.length;
                allDots.push(...dots);
            }
            });
        }
        mapContext.dotsGroup.selectAll('circle')
            .data(allDots, (d, i) => `${d.depId}-${d.vaccineType || 'int'}-${i}`) 
            .join(
                enter => enter.append('circle')
                    .attr('cx', d => d.x)
                    .attr('cy', d => d.y)
                    .attr('r', 0)
                    .attr('fill', d => mapContext.showByVaccineType ? vaccineColorScale(d.vaccineType) : colorScale(d.intensity))
                    .attr('opacity', 0)
                    .style('pointer-events', 'none')
                    .call(enter => enter.transition()
                        .duration(600)
                        .delay((d, i) => (i % 100) * 1.5)
                        .attr('r', dotRadius)
                        .attr('opacity', 0.8)
                    ),
                update => update
                    .call(update => update.transition()
                        .duration(500)
                        .attr('cx', d => d.x)
                        .attr('cy', d => d.y)
                        .attr('fill', d => mapContext.showByVaccineType ? vaccineColorScale(d.vaccineType) : colorScale(d.intensity))
                        .attr('r', dotRadius)
                        .attr('opacity', 0.8)
                    ),
                exit => exit
                    .call(exit => exit.transition()
                        .duration(300)
                        .attr('r', 0)
                        .attr('opacity', 0)
                        .remove()
                    )
            );
    }

    function updateMapLevel() {
        const allFrenchDepts = mapContext.allRegionsData.features.filter(feature => {
            const id = feature.properties.id;
            return id && id.startsWith('FR') && id.length === 5;
        });
        
        const franceRegions = {
            type: 'FeatureCollection',
            features: allFrenchDepts
        };
        const franceBoundaries = {
            type: 'FeatureCollection',
            features: mapContext.allBoundariesData.features.filter(feature => {
                const id = feature.properties.id;
                return id && id.startsWith('FR');
            })
        };
        const projection = d3.geoIdentity()
            .reflectY(true); 
        const path = d3.geoPath().projection(projection);
        mapContext.projection = projection;
        mapContext.path = path;
        const franceBbox = path.bounds(franceRegions);
        const [[left, top], [right, bottom]] = franceBbox;
        const bboxWidth = right - left;
        const bboxHeight = bottom - top;

        const margin = 50;
        const scale = Math.min(
            (mapContext.width - 2 * margin) / bboxWidth,
            (mapContext.height - 2 * margin) / bboxHeight
        );
        const translateX = (mapContext.width - bboxWidth * scale) / 2 - left * scale;
        const translateY = (mapContext.height - bboxHeight * scale) / 2 - top * scale;

        projection.scale(scale).translate([translateX, translateY]);

        mapContext.regionsGroup.selectAll('*').remove();
        mapContext.boundariesGroup.selectAll('*').remove();
        mapContext.labelsGroup.selectAll('*').remove();

        mapContext.svg.transition()
            .duration(750)
            .call(mapContext.zoom.transform, d3.zoomIdentity);

        franceRegions.features.forEach((feature, index) => {
            const regionFill = mapContext.showDots ? '#009c8c' : '#808080';
            const regionOpacity = mapContext.showDots ? 0.6 : 1;
            const idleStroke = 'rgba(234, 230, 230, 0.8)';
            const hoverStroke = '#a78bfa';

            mapContext.regionsGroup
                .append('path')
                .datum(feature)
                .attr('d', path)
                .attr('class', 'region')
                .attr('fill', regionFill)
                .attr('stroke', mapContext.showDots ? 'rgba(255, 255, 255, 0.1)' : idleStroke)
                .attr('stroke-width', mapContext.showDots ? 0.5 : 1.5)
                .attr('stroke-linejoin', 'round')
                .attr('opacity', regionOpacity)
                .style('cursor', 'pointer')
                .on('mouseover', function(event, d) {
               
                    d3.select(this)
                        .attr('opacity', 1)
                        .attr('stroke', hoverStroke)
                        .attr('stroke-width', 2);

                    const regionName = d.properties.na || d.properties.id;
                    let tooltipContent = `
                        <strong style="color: #a78bfa;">${regionName}</strong><br/>
                        <span style="font-size: 12px; color: #c4b5fd;">Code: ${d.properties.id}</span>
                    `;
                    
                    if (mapContext.showByVaccineType) {
                        const depCode = d.properties.id;
                        const simpleDepCode = getNutsToDepCode()[depCode];
                        
                        if (simpleDepCode) {
                            let depData = mapContext.vaccinationData.filter(rec => rec.dep === simpleDepCode);
                            
                            const yearRange = mapContext.selectedYearRange || 'all';
                            if (yearRange !== 'all' && depData.length > 0) {
                                depData = depData.filter(rec => {
                                    if (!rec.jour) return false;
                                    const dateParts = rec.jour.split('-');
                                    const year = parseInt(dateParts[0]);
                                    
                                    if (yearRange === '2020-2021') {
                                        return year >= 2020 && year <= 2021;
                                    } else if (yearRange === '2021-2022') {
                                        return year >= 2021 && year <= 2022;
                                    } else if (yearRange === '2022-2023') {
                                        return year >= 2022 && year <= 2023;
                                    }
                                    return false;
                                });
                            }
                            
                            const byVaccine = d3.group(depData, rec => rec.vaccin);
                            const vaccineTypeTotals = [];
                            
                            byVaccine.forEach((records, vaccineTypeId) => {
                                let total = 0;
                                records.forEach(rec => {
                                    total += (+rec.n_dose1 || 0) + 
                                           (+rec.n_dose2 || 0) + 
                                           (+rec.n_rappel || 0) + 
                                           (+rec.n_2_rappel || 0);
                                });
                                
                                if (total > 0) {
                                    vaccineTypeTotals.push({
                                        id: vaccineTypeId,
                                        name: vaccineTypeNames[vaccineTypeId] || `Vaccine ${vaccineTypeId}`,
                                        total: total,
                                        color: vaccineColors[vaccineTypeId]
                                    });
                                }
                            });
                            
                            vaccineTypeTotals.sort((a, b) => b.total - a.total);
                            
                            if (vaccineTypeTotals.length > 0) {
                                tooltipContent += `<br/>
                                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(167, 139, 250, 0.3);">
                                        <span style="color: #a7ff8b; font-weight: bold; font-size: 11px;">Vaccinations by Type:</span><br/>
                                `;
                                
                                vaccineTypeTotals.forEach(vt => {
                                    tooltipContent += `
                                        <div style="display: flex; align-items: center; margin-top: 4px;">
                                            <div style="width: 10px; height: 10px; background: ${vt.color}; border-radius: 50%; margin-right: 6px; flex-shrink: 0;"></div>
                                            <div style="flex: 1; min-width: 0;">
                                                <div style="font-size: 10px; color: #e6ffe6; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${vt.name}</div>
                                                <div style="font-size: 11px; color: #ffe6e6; font-weight: bold;">${vt.total.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    `;
                                });
                                
                                tooltipContent += `</div>`;
                            }
                        }
                    } else {
                        const vaccineType = mapContext.selectedVaccineType || 'all';
                        const intensity = getVaccinationIntensity(d.properties.id);
                        
                        const vaccineTypeLabels = {
                            'all': 'All Doses',
                            'dose1': '1st Dose',
                            'dose2': '2nd Dose',
                            'rappel': 'Booster',
                            '2_rappel': '2nd Booster'
                        };
                        const vaccineLabel = vaccineTypeLabels[vaccineType] || 'All Doses';

                        if (intensity > 0) {
                            tooltipContent += `<br/>
                                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(167, 139, 250, 0.3);">
                                    <span style="color: #ff7b8a; font-weight: bold;">${vaccineLabel}</span><br/>
                                    <span style="font-size: 14px; color: #ffe6e6;">${intensity.toLocaleString()}</span> 
                                    <span style="font-size: 11px; color: #c4b5fd;">vaccinations</span>
                                </div>
                            `;
                        }
                    }
                    
                    tooltip
                        .html(tooltipContent)
                        .style('visibility', 'visible');
                })
                .on('mousemove', function(event) {
                    tooltip
                        .style('top', (event.pageY - 10) + 'px')
                        .style('left', (event.pageX + 10) + 'px');
                })
                .on('mouseout', function(event, d) {
                    d3.select(this)
                        .attr('opacity', regionOpacity)
                        .attr('stroke', idleStroke)
                        .attr('stroke-width', mapContext.showDots ? 0.5 : 1.5);

                    tooltip.style('visibility', 'hidden');
                })
                .on('click', function(event, d) {
                    event.stopPropagation();
                    selectRegion(d, this);
                })
                .transition()
                .duration(750)
                .attr('opacity', regionOpacity);
        });

        franceBoundaries.features.forEach(feature => {
            mapContext.boundariesGroup
                .append('path')
                .datum(feature)
                .attr('d', path)
                .attr('class', 'boundary')
                .attr('fill', 'none')
                .attr('stroke', () => {
                    const lvl = feature.properties.lvl;
               
                    if (lvl === 0) return 'rgba(255, 255, 255, 0.8)'; // Country level
                    if (lvl === 1) return 'rgba(167, 139, 250, 0.6)'; // Region level
                    return 'rgba(167, 139, 250, 0.3)'; // Lower levels
                })
                .attr('stroke-width', () => {
                    const lvl = feature.properties.lvl;
                    if (lvl === 0) return 2;
                    if (lvl === 1) return 1.5;
                    return 0.8;
                })
                .style('pointer-events', 'none');
        });

        if (franceRegions.features.length <= 20 && !mapContext.showDots) {
            franceRegions.features.forEach(feature => {
                const centroid = path.centroid(feature);
                if (centroid && !isNaN(centroid[0]) && !isNaN(centroid[1])) {
                    const group = mapContext.labelsGroup
                        .append('g')
                        .attr('transform', `translate(${centroid[0]}, ${centroid[1]})`)
                        .attr('text-anchor', 'middle');
                    const fontSize = (level === 2 || level === 'metro') ? '11px' : '12px';

                    group.append('text')
                        .attr('class', 'label-halo')
                        .attr('text-anchor', 'middle')
                        .attr('dy', '.35em')
                        .attr('font-size', fontSize)
                        .attr('fill', 'none')
                        .attr('stroke', 'rgba(10, 0, 21, 0.9)')
                        .attr('stroke-width', 3)
                        .attr('stroke-linejoin', 'round')
                        .attr('opacity', 0.85)
                        .style('pointer-events', 'none')
                        .text(feature.properties.na || feature.properties.id);

                    group.append('text')
                        .attr('class', 'region-label')
                        .attr('text-anchor', 'middle')
                        .attr('dy', '.35em')
                        .attr('font-size', fontSize)
                        .attr('fill', '#f5f3ff')
                        .attr('opacity', 0.95)
                        .style('pointer-events', 'none')
                        .style('user-select', 'none')
                        .text(feature.properties.na || feature.properties.id);
                }
            });
        }

        function selectRegion(feature, element) {
       
            mapContext.regionsGroup.selectAll('path')
                .attr('opacity', 0.7)
                .attr('stroke-width', 1.5);
            d3.select(element)
                .attr('opacity', 1)
                .attr('stroke-width', 2);

            mapContext.selectedRegion = feature;
            mapContext.selectedRegionCode = feature.properties.id; 
    
            const event = new CustomEvent('regionSelected', {
                detail: {
                    regionId: feature.properties.id,
                    regionName: feature.properties.na,
                    feature: feature
                }
            });
            document.dispatchEvent(event);
        }
        renderDotDensity(franceRegions, path);

        if (mapContext.selectedRegionCode) {
            const selectedPath = mapContext.regionsGroup.selectAll('path')
                .filter(d => d.properties.id === mapContext.selectedRegionCode);
            
            if (!selectedPath.empty()) {
                mapContext.regionsGroup.selectAll('path')
                    .attr('opacity', mapContext.showDots ? 0.6 : 0.7)
                    .attr('stroke-width', mapContext.showDots ? 0.5 : 1.5);
                
                selectedPath
                    .attr('opacity', 1)
                    .attr('stroke', '#a78bfa')
                    .attr('stroke-width', 2);
            
            }
        }
        addDotIntensityLegend(mapContext.svg, mapContext.width);
        addVaccineTypeLegend(mapContext.svg, mapContext.width, mapContext.height);
        
        if (mapContext.showByVaccineType) {
            d3.select('#dot-intensity-legend').style('display', 'none');
            d3.select('#vaccine-type-legend').style('display', 'none');
        } else {
            d3.select('#dot-intensity-legend').style('display', 'block');
            d3.select('#vaccine-type-legend').style('display', 'none');
        }

        addMapControls(mapContext.svg, mapContext.zoom, mapContext.regionsGroup, mapContext.labelsGroup);

    }
}

function addVaccineTypeLegend(svg, mapWidth, mapHeight) {
    const legendWidth = 220;
    const legendItemHeight = 22;
    const legendX = 10;
    const legendY = 70;


    svg.select('#vaccine-type-legend').remove();
    const legend = svg.append('g')
        .attr('id', 'vaccine-type-legend')
        .attr('transform', `translate(${legendX}, ${legendY})`)
        .style('display', 'none'); 
    const vaccineTypes = Object.entries(vaccineTypeNames).filter(([id]) => id !== '0');
    const bgHeight = vaccineTypes.length * legendItemHeight + 45;
    
    legend.append('rect')
        .attr('width', legendWidth)
        .attr('height', bgHeight)
        .attr('fill', 'rgba(20, 0, 40, 0.95)')
        .attr('stroke', 'rgba(167, 255, 139, 0.6)')
        .attr('stroke-width', 2)
        .attr('rx', 8);

    legend.append('text')
        .attr('x', legendWidth / 2)
        .attr('y', 22)
        .attr('text-anchor', 'middle')
        .style('font-size', '13px')
        .style('font-weight', 'bold')
        .style('fill', '#a7ff8b')
        .text('Vaccine Types');

    vaccineTypes.forEach(([vaccineId, vaccineName], index) => {
        const itemY = 38 + index * legendItemHeight;
        
        const item = legend.append('g')
            .attr('transform', `translate(12, ${itemY})`)
            .style('cursor', 'default');
        
        item.append('circle')
            .attr('cx', 7)
            .attr('cy', 7)
            .attr('r', 6)
            .attr('fill', vaccineColors[vaccineId])
            .attr('stroke', 'rgba(255, 255, 255, 0.5)')
            .attr('stroke-width', 1.5);
        
        const textGroup = item.append('g');
        const displayNames = {
            '1': 'Pfizer Adult (COMIRNATY-30)',
            '2': 'Moderna (Spikevax)',
            '3': 'AstraZeneca (Vaxzevria)',
            '4': 'Janssen (J&J)',
            '5': 'Pfizer Child (COMIRNATY-10)',
            '6': 'Novavax (NUVAXOVID)',
            '9': 'Moderna Bivalent',
            '10': 'Sanofi VidPrevtyn',
            '11': 'Pfizer Pediatric 6m-4a',
            '12': 'Moderna BA.5'
        };
        
        const displayName = displayNames[vaccineId] || vaccineName;
        textGroup.append('text')
            .attr('x', 20)
            .attr('y', 11)
            .style('font-size', '10.5px')
            .style('fill', '#e6ffe6')
            .style('font-weight', '500')
            .text(displayName);
        
        item.append('title')
            .text(vaccineName);
    });
}

function addDotIntensityLegend(svg, mapWidth) {
    const legendWidth = 20;
    const legendHeight = 180;
    const legendX = mapWidth - 70;  
    const legendY = 70;

    svg.select('#dot-intensity-legend').remove();

    const legend = svg.append('g')
        .attr('id', 'dot-intensity-legend')
        .attr('transform', `translate(${legendX}, ${legendY})`);

    const defs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs');
    const gradient = defs.append('linearGradient')
        .attr('id', 'plasma-gradient')
        .attr('x1', '0%')
        .attr('y1', '100%') 
        .attr('x2', '0%')
        .attr('y2', '0%');

    const plasmaColors = [
        { offset: '0%', color: '#0d0887' },   
        { offset: '12.5%', color: '#46039f' },
        { offset: '25%', color: '#7201a8' },
        { offset: '37.5%', color: '#9c179e' },
        { offset: '50%', color: '#bd3786' },
        { offset: '62.5%', color: '#d8576b' },
        { offset: '75%', color: '#ed7953' },
        { offset: '87.5%', color: '#fb9f3a' },
        { offset: '93.75%', color: '#fdca26' },
        { offset: '100%', color: '#f0f921' }  
    ];

    plasmaColors.forEach(stop => {
        gradient.append('stop')
            .attr('offset', stop.offset)
            .attr('stop-color', stop.color);
    });

    legend.append('rect')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', 'url(#plasma-gradient)')
        .style('stroke', 'rgba(255, 255, 255, 0.5)')
        .style('stroke-width', '1.5px')
        .attr('rx', 3);
    legend.append('text')
        .attr('x', legendWidth / 2)
        .attr('y', -15)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .style('fill', '#ffffff')
        .text('Vaccination Intensity');

    legend.append('text')
        .attr('x', legendWidth + 8)
        .attr('y', 5)
        .style('font-size', '11px')
        .style('fill', '#f0f921')
        .style('font-weight', '600')
        .text('High');

    legend.append('text')
        .attr('x', legendWidth + 8)
        .attr('y', legendHeight + 5)
        .style('font-size', '11px')
        .style('fill', '#a78bfa')
        .style('font-weight', '600')
        .text('Low');
}

function addMapControls(svg, zoom, regionsGroup, labelsGroup) {
}


export function updateMapData(data, valueAccessor, colorScale) {
    d3.selectAll('.region')
        .transition()
        .duration(750)
        .attr('fill', d => {
            const regionId = d.properties.id;
            const value = data[regionId];
            if (value !== undefined) {
                return colorScale(valueAccessor(value));
            }
            return 'rgba(100, 100, 100, 0.3)'; 
        });
}

export function getSelectedRegion() {
    return mapContext.selectedRegion;
}

export function highlightRegion(regionCode) {
    const allRegions = d3.selectAll('.region');
    allRegions
        .attr('stroke', 'rgba(234, 230, 230, 0.8)')
        .attr('stroke-width', mapContext.showDots ? 0.5 : 1.5)
        .attr('opacity', mapContext.showDots ? 0.6 : 1)
        .attr('fill-opacity', null);
    const departements = regionToDepartements[regionCode];
    allRegions
        .attr('opacity', 0.2)
        .attr('fill-opacity', 0.2);
    const highlighted = [];
    allRegions.each(function(d) {
        if (d && d.properties) {
            const deptId = d.properties.id;
            if (departements.includes(deptId)) {
                highlighted.push(deptId);
                d3.select(this)
                    .attr('stroke', '#ff0066')  // Bright pink/red stroke
                    .attr('stroke-width', 4)     // Thick border
                    .attr('opacity', 1)          // Full opacity
                    .attr('fill-opacity', 0.9)   // Bright fill
                    .raise();                    // Bring to front
            }
        }
    });
    
    if (highlighted.length === 0) {
        let sampleCount = 0;
        allRegions.each(function(d) {
            if (d && d.properties && d.properties.id && sampleCount < 10) {
                console.log(`  Available: ${d.properties.id}`);
                sampleCount++;
            }
        });
    } else {
        console.log(`🎉 SUCCESS! ${highlighted.length} départements should now be visible with pink borders`);
    }
}

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (mapContext.svg && mapContext.containerSelector) {
            console.log('🔄 Window resized - re-rendering France map');
            const container = d3.select(mapContext.containerSelector);
            container.selectAll('*').remove();
            
            drawFranceMap(mapContext.containerSelector);
        }
    }, 250);
});

export default {
    drawFranceMap,
    updateMapData,
    getSelectedRegion,
    highlightRegion
};