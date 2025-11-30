// Load and clean COVID data
export async function CleanCovid() {
    const data = await d3.csv('data/covid.csv', d => ({
        location: d.location,
        date: d.date,
        total_cases: +d.total_cases || 0,
        new_cases: +d.new_cases || 0,
        total_deaths: +d.total_deaths || 0,
        new_deaths: +d.new_deaths || 0,
        weekly_cases: +d.weekly_cases || 0,
        weekly_deaths: +d.weekly_deaths || 0
    }));
    
    return data;
}
