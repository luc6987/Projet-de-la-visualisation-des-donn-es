
// Context for map configuration
const mapContext = {
    width: window.innerWidth * 0.8,
    height: window.innerHeight * 0.8,
    selectedRegion: null,
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
    selectedVaccineType: 'all' // all, dose1, dose2, rappel, 2_rappel
};

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

export function drawFranceMap(containerSelector = '#franceMap') {
    const container = d3.select(containerSelector);
    
    // Get actual container dimensions
    const containerNode = container.node();
    if (containerNode) {
        const rect = containerNode.getBoundingClientRect();
        mapContext.width = rect.width || mapContext.width;
        mapContext.height = rect.height || mapContext.height;
    }

    // Vaccine type selection controls only (map always shows départements with dots)

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

                // Update selected vaccine type
                mapContext.selectedVaccineType = vaccineType.id;
                
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

    // Show vaccine controls when dots are enabled
    function updateVaccineControlsVisibility() {
        vaccineControlsDiv.style('opacity', mapContext.showDots ? '1' : '0');
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

    // Create SVG container
    const svg = container
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${mapContext.width} ${mapContext.height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
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

    // Disable zoom and pan interactions
    const zoom = d3.zoom()
        .scaleExtent([1, 1]) // Fixed scale - no zoom
        .on('zoom', null); // No zoom behavior

    // Don't apply zoom to svg to prevent dragging
    // svg.call(zoom);

    // Store references in context
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
        d3.dsv(';', 'data/vacsi-tot-v-dep-2023-07-13-15h51.csv')
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

    // Function to dissolve NUTS3 départements into NUTS2 regions
    function dissolveToNuts2(nuts3Features) {
        // Group départements by their NUTS2 code (first 3 characters)
        const regionGroups = new Map();
        
        nuts3Features.forEach(feature => {
            const nuts2Code = feature.properties.id.substring(0, 3);
            if (!regionGroups.has(nuts2Code)) {
                regionGroups.set(nuts2Code, []);
            }
            regionGroups.get(nuts2Code).push(feature);
        });

        // Create merged features for each NUTS2 region
        const nuts2Features = [];
        regionGroups.forEach((depts, nuts2Code) => {
            // Use D3's geoPath to merge geometries
            // This creates a proper dissolved boundary
            const mergedGeometry = {
                type: 'GeometryCollection',
                geometries: depts.map(d => d.geometry)
            };

            // Create a merged feature with the collection
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

    // Function to generate dots for a département (dot density map approach)
    // Each dot represents a fixed number of vaccinations
    function generateDotsForDepartment(feature, vaccinationIntensity, path, dotsPerUnit) {
        const dots = [];
        
        if (vaccinationIntensity === 0) return dots;
        
        // Calculate number of dots for this département
        const numDots = Math.floor(vaccinationIntensity / dotsPerUnit);
        
        if (numDots === 0) return dots;
        
        const bounds = path.bounds(feature);
        const [[x0, y0], [x1, y1]] = bounds;
        
        // Create a temporary context to test point containment
        const context = d3.path();
        path.context(context)(feature);
        const pathString = context.toString();
        
        // Generate random points within the département bounds
        let attempts = 0;
        const maxAttempts = numDots * 200;
        
        while (dots.length < numDots && attempts < maxAttempts) {
            attempts++;
            
            // Random position within bounding box
            const x = x0 + Math.random() * (x1 - x0);
            const y = y0 + Math.random() * (y1 - y0);
            
            // Use a more reliable point-in-polygon test for projected coordinates
            // Since we're using EPSG:3035 projected data, test directly in pixel space
            if (isPointInPath(x, y, pathString, feature, path)) {
                dots.push({ 
                    x, 
                    y, 
                    intensity: vaccinationIntensity,
                    depId: feature.properties.id
                });
            }
        }
        
        // Debug logging for départements with low success rate
        if (dots.length < numDots * 0.5 && numDots > 10) {
            console.warn(`Low dot generation for ${feature.properties.id} (${feature.properties.na}): ${dots.length}/${numDots} dots after ${attempts} attempts`);
        }
        
        return dots;
    }
    
    // Helper function to test if a point is inside a polygon path
    function isPointInPath(x, y, pathString, feature, path) {
        // For projected coordinates (EPSG:3035), we need to test in coordinate space
        // Convert pixel coordinates back to the feature's coordinate system
        const projection = path.projection();
        
        // For geoIdentity, the coordinates are already in the right space
        // We just need to reverse the reflectY transformation
        const scale = projection.scale();
        const translate = projection.translate();
        
        // Reverse the transformation: (x - tx) / k, (ty - y) / k
        const geoX = (x - translate[0]) / scale;
        const geoY = (translate[1] - y) / scale; // reflectY reversal
        
        // Test if this coordinate is within the feature's geometry
        return testPointInFeature(geoX, geoY, feature);
    }
    
    // Test if a point is inside a GeoJSON feature using ray casting
    function testPointInFeature(x, y, feature) {
        const geometry = feature.geometry;
        
        if (geometry.type === 'Polygon') {
            return pointInPolygon([x, y], geometry.coordinates);
        } else if (geometry.type === 'MultiPolygon') {
            return geometry.coordinates.some(polygon => pointInPolygon([x, y], polygon));
        }
        
        return false;
    }
    
    // Ray casting algorithm for point-in-polygon test
    function pointInPolygon(point, rings) {
        const [x, y] = point;
        const ring = rings[0]; // Test exterior ring
        
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

    // Function to calculate vaccination intensity for a département
    function getVaccinationIntensity(depCode) {
        if (!mapContext.vaccinationData) return 0;
        
        // Mapping from NUTS codes to département numbers for France
        // This maps the GeoJSON IDs (like FRK21) to the vaccination data codes (like 01)
        const nutsToDepCode = {
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
        
        // Get the département code from NUTS code
        const simpleDepCode = nutsToDepCode[depCode];
        if (!simpleDepCode) {
            console.warn(`No mapping found for NUTS code: ${depCode}`);
            return 0;
        }
        
        // Sum vaccination doses for this département based on selected type
        const depData = mapContext.vaccinationData.filter(d => 
            d.dep === simpleDepCode
        );
        
        let totalIntensity = 0;
        const vaccineType = mapContext.selectedVaccineType || 'all';
        
        depData.forEach(d => {
            if (vaccineType === 'all') {
                totalIntensity += (+d.n_tot_dose1 || 0) + 
                                (+d.n_tot_dose2 || 0) + 
                                (+d.n_tot_rappel || 0) + 
                                (+d.n_tot_2_rappel || 0);
            } else if (vaccineType === 'dose1') {
                totalIntensity += (+d.n_tot_dose1 || 0);
            } else if (vaccineType === 'dose2') {
                totalIntensity += (+d.n_tot_dose2 || 0);
            } else if (vaccineType === 'rappel') {
                totalIntensity += (+d.n_tot_rappel || 0);
            } else if (vaccineType === '2_rappel') {
                totalIntensity += (+d.n_tot_2_rappel || 0);
            }
        });
        
        return totalIntensity;
    }

    // Function to render dot density visualization
    function renderDotDensity(franceRegions, path) {
        // Dots are always shown for départements
        if (!mapContext.showDots) {
            // Fade out existing dots with transition
            mapContext.dotsGroup.selectAll('circle')
                .transition()
                .duration(400)
                .attr('r', 0)
                .attr('opacity', 0)
                .remove();
            return; 
        }
        
        // Calculate intensities for all départements
        const intensities = franceRegions.features.map(feature => {
            const depCode = feature.properties.id;
            return getVaccinationIntensity(depCode);
        });
        
        const maxIntensity = d3.max(intensities) || 1;
        const totalIntensity = d3.sum(intensities);
        
        console.log(`Total vaccination intensity: ${totalIntensity.toLocaleString()}`);
        console.log(`Max département intensity: ${maxIntensity.toLocaleString()}`);
        
        // Define how many vaccinations each dot represents
        // Adjust this value to control dot density (lower = more dots)
        const vaccinationsPerDot = Math.floor(totalIntensity / 5000); // Target ~5000 dots total
        
        console.log(`Each dot represents ${vaccinationsPerDot.toLocaleString()} vaccinations`);
        
        // Update the dot legend
        if (mapContext.dotLegend) {
            mapContext.dotLegend.select('.dot-value')
                .text(vaccinationsPerDot.toLocaleString());
        }
        
        // Create color scale based on département intensity (for dot color variation)
        // Higher intensity départements get redder dots
        const colorScale = d3.scaleSequential()
            .domain([0, maxIntensity])
            .interpolator(t => {
                if (t < 0.3) return d3.interpolate('#ffe6e6', '#ff7b8a')(t / 0.3);
                return d3.interpolate('#ff7b8a', '#ff0033')((t - 0.3) / 0.7);
            });
        
        // All dots have the same size (this is key for dot density maps!)
        const dotRadius = 2;
        
        // Generate dots for each département
        const allDots = [];
        let totalDotsGenerated = 0;
        let deptsWithNoDots = [];
        
        franceRegions.features.forEach(feature => {
            const intensity = getVaccinationIntensity(feature.properties.id);
            if (intensity > 0) {
                const dots = generateDotsForDepartment(feature, intensity, path, vaccinationsPerDot);
                
                // Ensure at least 1 dot for départements with data (minimum representation)
                if (dots.length === 0 && intensity > 0) {
                    // Generate at least one dot in the center of the département
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
        
        if (deptsWithNoDots.length > 0) {
            console.warn(`Départements with no dots generated: ${deptsWithNoDots.join(', ')}`);
        }
        
        console.log(`Generated ${totalDotsGenerated} dots for ${franceRegions.features.length} départements`);
        
        // Render dots with smooth transitions
        mapContext.dotsGroup.selectAll('circle')
            .data(allDots, (d, i) => `${d.depId}-${i}`) 
            .join(
                enter => enter.append('circle')
                    .attr('cx', d => d.x)
                    .attr('cy', d => d.y)
                    .attr('r', 0)
                    .attr('fill', d => colorScale(d.intensity))
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
                        .attr('fill', d => colorScale(d.intensity))
                        .attr('opacity', 0.8)
                    ),
                exit => exit
                    .call(exit => exit.transition()
                        .duration(400)
                        .attr('r', 0)
                        .attr('opacity', 0)
                        .remove()
                    )
            );
    }

    // Function to update map based on selected NUTS level
    function updateMapLevel() {
        // Always use NUTS3 départements (no metro regions)
        const allFrenchDepts = mapContext.allRegionsData.features.filter(feature => {
            const id = feature.properties.id;
            return id && id.startsWith('FR') && id.length === 5;
        });
        
        const franceRegions = {
            type: 'FeatureCollection',
            features: allFrenchDepts
        };

        // Show all département boundaries
        const franceBoundaries = {
            type: 'FeatureCollection',
            features: mapContext.allBoundariesData.features.filter(feature => {
                const id = feature.properties.id;
                return id && id.startsWith('FR');
            })
        };

        console.log(`Found ${franceRegions.features.length} French départements`);
        console.log(`Found ${franceBoundaries.features.length} French boundaries`);

        // NUTS3: EPSG:3035 projected coordinates - use geoIdentity
        const projection = d3.geoIdentity()
            .reflectY(true); // Flip Y axis as EPSG:3035 has Y increasing northward

        // Create path generator
        const path = d3.geoPath().projection(projection);

        // Store in context
        mapContext.projection = projection;
        mapContext.path = path;

        // Fit the map to container - NUTS3 with geoIdentity
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

        // Clear existing regions and boundaries
        mapContext.regionsGroup.selectAll('*').remove();
        mapContext.boundariesGroup.selectAll('*').remove();
        mapContext.labelsGroup.selectAll('*').remove();

        // Reset zoom
        mapContext.svg.transition()
            .duration(750)
            .call(mapContext.zoom.transform, d3.zoomIdentity);

        franceRegions.features.forEach((feature, index) => {
            // Use teal color (#009c8c) with 60% opacity when showing dots
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

                    // Show tooltip with vaccination data
                    const regionName = d.properties.na || d.properties.id;
                    let tooltipContent = `
                        <strong style="color: #a78bfa;">${regionName}</strong><br/>
                        <span style="font-size: 12px; color: #c4b5fd;">Code: ${d.properties.id}</span>
                    `;
                    
                    // Add vaccination info if intensity > 0
                    if (intensity > 0) {
                        tooltipContent += `<br/>
                            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(167, 139, 250, 0.3);">
                                <span style="color: #ff7b8a; font-weight: bold;">${vaccineLabel}</span><br/>
                                <span style="font-size: 14px; color: #ffe6e6;">${intensity.toLocaleString()}</span> 
                                <span style="font-size: 11px; color: #c4b5fd;">vaccinations</span>
                            </div>
                        `;
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
                    // Reset region appearance
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

        // Draw boundaries for clearer distinction
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

        // Add labels only if showing few regions and not showing dots
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

        // Function to select a region
        function selectRegion(feature, element) {
            // Deselect all regions
            mapContext.regionsGroup.selectAll('path')
                .attr('opacity', 0.7)
                .attr('stroke-width', 1.5);

            // Highlight selected region
            d3.select(element)
                .attr('opacity', 1)
                .attr('stroke-width', 2);

            mapContext.selectedRegion = feature;
            
            // Log selection
            console.log('Selected region:', feature.properties.na || feature.properties.id);
            
            // Dispatch custom event for integration with other visualizations
            const event = new CustomEvent('regionSelected', {
                detail: {
                    regionId: feature.properties.id,
                    regionName: feature.properties.na,
                    feature: feature
                }
            });
            document.dispatchEvent(event);
        }

        // Render dot density visualization
        renderDotDensity(franceRegions, path);

        // Add map controls
        addMapControls(mapContext.svg, mapContext.zoom, mapContext.regionsGroup, mapContext.labelsGroup);

        console.log('France map rendered successfully');
    }
}

/**
 * Add map controls (zoom, toggle labels, etc.)
 */
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

/**
 * Get the currently selected region
 */
export function getSelectedRegion() {
    return mapContext.selectedRegion;
}

// Export for integration with other modules
export default {
    drawFranceMap,
    updateMapData,
    getSelectedRegion
};
