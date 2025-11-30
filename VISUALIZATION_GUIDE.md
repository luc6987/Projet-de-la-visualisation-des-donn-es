# COVID-19 Vaccination Dashboard - Visualization Guide

## Overview
This dashboard provides comprehensive visualizations of COVID-19 vaccination data across different countries, allowing users to compare vaccination progress, distribution patterns, and temporal trends.

---

## 1. Interactive Map Visualization

### Description
An interactive choropleth map displaying vaccination uptake percentages across European countries.

### Features
- **Color Scale**: Cool gradient (cyan to magenta) representing vaccination uptake from low to high
- **Hover Interaction**: Hover over any country to see detailed vaccination statistics
- **Country Highlighting**: Selected countries are highlighted with glowing cyan (Country 1) or magenta (Country 2) borders
- **Legend**: Shows the color scale corresponding to vaccination uptake percentages

### What It Shows
- Geographic distribution of vaccination rates across Europe
- Visual comparison of vaccination progress between countries
- Quick identification of high vs. low vaccination uptake regions

### Use Case
Identify which countries have achieved higher vaccination rates and spot regional patterns in vaccination adoption.

---

## 2. Pyramid Bar Chart (Vaccination Doses by Year)

### Description
A dual-sided horizontal bar chart comparing vaccination doses between two selected countries across different years (2020-2023).

### Features
- **Dual Comparison**: Left side shows Country 1, right side shows Country 2
- **Color-Coded Doses**: 
  - Cyan `#00d4ff` - First dose
  - Magenta `#ff00ff` - Second dose
  - Purple `#a855f7` - Additional doses
  - Orange `#ff6b35` - Booster doses
  - Lime `#00ff88` - Other doses
- **Yearly Breakdown**: Each row represents a different year
- **Hover Tooltips**: Shows exact values and percentages for each dose type

### What It Shows
- Year-by-year comparison of vaccination doses administered
- Distribution of different dose types (1st, 2nd, boosters, etc.)
- Relative vaccination pace between two countries
- Total vaccination volumes per year

### Use Case
Compare vaccination rollout strategies and pace between countries, identify which country administered more doses during specific years, and understand the evolution of vaccination campaigns over time.

---

## 3. Time Series Line Chart (Vaccination Uptake Over Time)

### Description
Multi-line chart showing cumulative vaccination uptake trends across multiple countries over time.

### Features
- **Multiple Lines**: Each line represents a different country with vibrant colors
- **Interactive Dose Type Selector**: Dropdown menu to switch between:
  - First Dose
  - Primary Course (2 doses)
  - First Booster (Additional dose 1)
- **Zoom & Pan**: Interactive x-axis for exploring specific time periods
- **Grid Lines**: Subtle white grid lines (rgba(165,180,252,0.15)) for easier value reading
- **Hover Tooltips**: Display exact uptake percentages and dates
- **White Axes & Labels**: High contrast for visibility on dark background

### Color Scheme
- Vibrant rainbow colors for different countries
- Cyan, Magenta, Lime, Orange, Purple, Yellow - each country gets a unique color
- All colors designed to stand out against the dark space background

### What It Shows
- Vaccination progress over time for selected dose type
- Rate of change in vaccination campaigns
- Temporal patterns (e.g., acceleration periods, plateaus)
- Cross-country comparisons of vaccination speed
- When countries reached specific uptake milestones

### Use Case
Track vaccination campaign momentum, identify when vaccination rates increased or slowed down, compare the timeline of different countries' vaccination rollouts, and understand which countries vaccinated their populations faster.

---

## 4. Kernel Density Plot (Vaccine Distribution Comparison)

### Description
A ridgeline plot showing smooth probability density distributions of vaccination rates across different time periods or categories for two countries.

### Features
- **Smooth Curves**: Kernel density estimation creates smooth distribution curves
- **Dual Country Comparison**: 
  - Country 1: Cyan `#00d4ff` with semi-transparent fill
  - Country 2: Magenta `#ff00ff` with semi-transparent fill
- **Overlapping Distributions**: Allows direct visual comparison of distribution shapes
- **White Grid Lines**: Subtle vertical grid for reference
- **White Axes & Labels**: Clear labeling for all elements

### What It Shows
- Distribution patterns of vaccination rates over time
- Comparison of vaccination distribution shapes between countries
- Peak vaccination periods for each country
- Spread and variability of vaccination rates
- Whether vaccination was concentrated in certain periods or spread evenly

### Use Case
Understand vaccination distribution patterns, identify peak vaccination periods, compare the consistency of vaccination efforts between countries, and spot differences in campaign strategies (steady vs. burst vaccination).

---

## 5. Heatmap (Vaccination by Age Group - Quarterly)

### Description
A color-encoded matrix showing vaccination intensity across different age groups and quarterly time periods.

### Features
- **Purple Gradient Color Scale**: Uses D3's interpolatePurples (dark purple for low, light purple for high)
- **Grid Layout**: 
  - Rows: Different age groups (0-17, 18-24, 25-49, 50-59, 60-69, 70-79, 80+, etc.)
  - Columns: Quarterly time periods (Q1 2020, Q2 2020, etc.)
- **White Text & Axes**: Clear labeling for readability
- **Color Bar Legend**: Shows the mapping between colors and vaccination counts/percentages
- **Rotated X-axis Labels**: Prevents label overlap for readability

### What It Shows
- Vaccination coverage patterns across age groups over time
- Which age groups were prioritized in different quarters
- Temporal progression of age-based vaccination strategies
- Hotspots of high vaccination activity by age group
- Seasonal or quarterly patterns in vaccination campaigns

### Use Case
Quickly identify which age groups were vaccinated first (e.g., elderly prioritization), spot periods of high vaccination activity for specific demographics, understand age-based vaccination strategies, and detect shifts in vaccination priorities over time.

---

## Interactive Controls

### Global Country Selection
Located in the header, these controls affect multiple visualizations simultaneously:
- **Country 1 Dropdown**: Select first country for comparison
- **Country 2 Dropdown**: Select second country for comparison
- **Synchronized Updates**: Bar chart, kernel density plot, and statistics update when countries change

### Dose Type Selection (Time Series)
- **Dropdown Menu**: Located above the time series chart
- **Options**:
  - First Dose: People who received their initial dose
  - Primary Course (2 doses): Fully vaccinated (selected by default)
  - First Booster: People who received their first additional/booster dose
- **Dynamic Chart Update**: Chart immediately updates to show selected dose type

### Toggle Button (Vaccination & COVID Analysis)
- **Navigation Control**: Switch between vaccination dashboard and COVID analysis page
- **Icon**: 📊 Statistical chart icon
- **Functionality**: Redirects to `index_covid.html`

---

## Statistics Panel

### Location
Located to the right of the interactive map within the map container.

### Country Comparison Cards
Each country card displays detailed statistics:
- **Total Vaccinations**: Cumulative number of doses administered
- **First Dose**: Number of people who received their first dose
- **Fully Vaccinated**: People who completed their primary vaccination series
- **Booster Doses**: Number of booster/additional doses administered
- **Population Coverage**: Percentage of population vaccinated

### Color Coding
- Country 1: Cyan border and accent `#00d4ff`
- Country 2: Magenta border and accent `#ff00ff`

### Dynamic Updates
- Updates in real-time when hovering over map countries
- Shows "Select countries to view statistics" when no country is selected
- Live region (aria-live="polite") for screen reader accessibility

---

## Design Features

### Space Theme
- **Animated Star Background**: 3-layer 3D parallax starfield with depth perception
- **Shooting Stars/Comets**: 4 animated comets with gradient tails moving across the screen
- **Transparent Containers**: All chart backgrounds are transparent (`background: transparent`) to showcase the cosmic theme
- **Dark Semi-Transparent Panels**: Visualization panels use `rgba(10, 14, 39, 0.7)` for subtle separation
- **Vibrant Colors**: Cyan `#00d4ff`, Magenta `#ff00ff`, Purple `#a855f7` color palette for high contrast
- **Glowing Effects**: Text shadows and neon-style glows on interactive elements and country labels

### Accessibility Features
- **High Contrast**: White/light text `#e0e7ff` on dark backgrounds
- **Clear Labels**: All axes, legends, and data points clearly labeled
- **Tooltips**: Detailed information appears on hover for all interactive elements
- **ARIA Labels**: Semantic HTML with role attributes and aria-label descriptions
- **Responsive Design**: Adapts to different screen sizes with flexible layouts
- **No Motion on Hover**: Static visualizations (hover lift effects removed) for stability

### Typography
- **Primary Text**: Light indigo `#e0e7ff` for main content
- **Secondary Text**: Lighter indigo `#a5b4fc` for less prominent labels
- **Headers**: Large, bold titles with subtle text shadows
- **Tooltips**: Clear, readable text with dark backgrounds and white text

---

## Data Insights You Can Gain

1. **Geographic Patterns**: Which regions of Europe vaccinated faster? Are there clusters of high or low vaccination rates?

2. **Temporal Trends**: When did vaccination campaigns accelerate or plateau? What was the timeline from rollout to mass vaccination?

3. **Dose Distribution**: How were first doses, second doses, and boosters distributed over time? Did countries prioritize first doses or complete vaccination series?

4. **Country Comparison**: How do two countries compare in vaccination strategy and coverage? Which country vaccinated faster or more comprehensively?

5. **Age-Based Strategies**: Which age groups were prioritized? Did countries follow WHO recommendations for elderly-first vaccination?

6. **Coverage Intensity**: Which time periods (quarters) saw the highest vaccination activity? Were there seasonal patterns?

7. **Distribution Patterns**: Was vaccination steady over time or concentrated in bursts? How consistent were vaccination efforts?

8. **Year-over-Year Progress**: How did vaccination volumes change from 2020 to 2023? When did booster campaigns begin?

---

## Technical Details

### Data Sources
- **Vaccination Data**: European Centre for Disease Prevention and Control (ECDC)
- **Geographic Data**: GeoJSON files for European country boundaries
- **Population Data**: NUTS3 level population density data

### Data Format
- **CSV Files**: 
  - `vaccin.csv` - Vaccination records with dates, countries, vaccine types, dose types
  - `covid.csv` - COVID-19 case and death statistics
  - `pop_density_nuts3.csv` - Population density by region
- **GeoJSON Files**:
  - `europe.geojson` - European country boundaries
  - `nutsbn.geojson`, `nutsrg.geojson` - NUTS region boundaries
  - `cntbn.geojson`, `cntrg.geojson` - Country boundaries

### Technologies Used
- **D3.js v7**: All visualizations and data manipulation
- **Vanilla JavaScript (ES6 Modules)**: Dashboard logic and interactivity
- **CSS3**: Animations (keyframes for stars and comets), gradients, and styling
- **HTML5**: Semantic structure with ARIA accessibility attributes

### Visualization Libraries & Techniques
- **D3 Scales**: scaleLinear, scaleTime, scaleBand, scaleSequential
- **D3 Color Schemes**: interpolateCool (map), interpolatePurples (heatmap)
- **D3 Geo**: geoMercator projection for European map
- **D3 Axes**: axisBottom, axisLeft with custom styling
- **D3 Shapes**: area, line generators for time series and kernel plots
- **Kernel Density Estimation**: Custom KDE implementation for smooth distributions

### Performance Optimizations
- Efficient data processing with D3 data joins and enter/update/exit pattern
- Optimized rendering for large datasets using D3's efficient DOM manipulation
- Smooth animations at 60fps using CSS transforms
- Cached computations for faster chart updates
- Cache-busting query parameters (`?v=X`) for JavaScript and CSS files
- Event delegation for interactive elements

### File Structure
```
js/
  ├── main_vaccin.js (v=37)     - Main orchestration and data loading
  ├── barPlot.js (v=4)          - Pyramid bar chart implementation
  ├── tsPlot.js (v=2)           - Time series visualization
  ├── kernelPlot.js (v=3)       - Kernel density plot
  ├── heatmap.js (v=6)          - Age group heatmap (imported in main)
  ├── map.js (v=5)              - Interactive choropleth map
  └── d3.v7.min.js              - D3 library

css/
  ├── index_vaccin.css (v=43)   - Main dashboard styling
  └── map.css (v=22)            - Map-specific styles

data/
  ├── vaccin.csv                - Vaccination data
  ├── covid.csv                 - COVID statistics
  ├── europe.geojson            - Geographic boundaries
  └── [other data files]
```

### Browser Compatibility
- Modern browsers with ES6 module support
- Chrome, Firefox, Safari, Edge (latest versions)
- Requires JavaScript enabled
- Best viewed on screens 1280px+ wide for full experience

---

## Usage Instructions

### Getting Started
1. Open `index_vaccin.html` in a modern web browser
2. Select two countries from the dropdown menus in the header
3. Explore the visualizations - hover for details, scroll to see all charts
4. Use the dose type selector on the time series chart to switch between different vaccination phases

### Comparing Countries
1. Choose Country 1 and Country 2 from global dropdowns
2. Bar chart and kernel density plot update automatically
3. Statistics panel shows detailed comparison metrics
4. Map highlights selected countries with colored borders

### Analyzing Time Periods
1. Examine the heatmap to see quarterly vaccination patterns by age group
2. Use the time series chart to track daily/cumulative progress
3. Identify acceleration or deceleration in vaccination campaigns

### Understanding Distributions
1. Kernel density plot shows the "shape" of vaccination over time
2. Wider distributions = more spread out vaccination efforts
3. Narrow peaks = concentrated vaccination campaigns
4. Compare shapes between countries to understand different strategies

### Navigation
- **To COVID Analysis**: Click the "Vaccin & COVID Analysis" button in the header
- **Tooltips**: Hover over any visualization element for detailed information
- **Statistics**: Hover over map countries to update the statistics panel

---

## Troubleshooting

### Charts Not Updating
- **Hard refresh**: Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+F5` (Windows/Linux)
- **Clear cache**: Browser cache may prevent seeing updates
- **Check console**: Open browser DevTools (F12) and check for errors

### Colors Not Visible
- Ensure you're viewing on a screen with good color depth
- Dark space theme requires screens that can display deep blacks
- Text should be white/light colored - if it's dark, hard refresh needed

### Performance Issues
- Close other browser tabs to free memory
- Disable browser extensions that might interfere
- Try a different browser (Chrome recommended for best D3.js performance)

### Data Not Loading
- Ensure all data files are in the `data/` directory
- Check browser console for 404 errors
- Verify file paths are correct (case-sensitive on some servers)
- If running locally, use a local server (not file:// protocol)

### Local Server Setup
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (with http-server package)
npx http-server -p 8000
```
Then navigate to `http://localhost:8000/index_vaccin.html`

---

## Future Enhancements

Potential additions and improvements:
- Export functionality for charts (PNG, SVG, PDF)
- Date range filtering for all visualizations
- Additional dose type comparisons
- Vaccine brand breakdowns per country
- Animation showing vaccination progress over time
- Comparison of 3+ countries simultaneously
- Mobile-responsive optimizations
- Data table views alongside visualizations

---

## Credits

**Data Source**: European Centre for Disease Prevention and Control (ECDC)  
**Visualization**: D3.js v7  
**Design**: Custom space theme with animated background  
**License**: See LICENSE file in repository

---

## Contact & Support

For questions, issues, or suggestions:
- **Repository**: luc6987/Projet-de-la-visualisation-des-donn-es
- **Branch**: hok
- **File**: index_vaccin.html

Last Updated: November 27, 2025
