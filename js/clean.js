// Load CSV data asynchronously
export function CleanVaccin(){
    return d3.csv("data/vaccin.csv").then(function(data) {
        console.log(`Raw data loaded: ${data.length} rows`);
        
        // Convert YearWeekISO to Date (e.g., "2021-W02" + "-1" → Monday of that week)
        let successfulParses = 0;
        let failedParses = 0;
        
        data.forEach(function(row){
            if (row.YearWeekISO) {
                // Append "-1" for Monday (ISO week starts on Monday)
                row.Date = d3.timeParse("%Y-W%W-%w")(row.YearWeekISO + "-1");
                if (row.Date){
                    const year = row.Date.getFullYear();
                    const month = String(row.Date.getMonth()+1).padStart(2,'0');
                    row.YearMonth = `${year}-${month}`;
                    successfulParses++;
                } else {
                    failedParses++;
                }
            }
        });

        console.log(`Date parsing: ${successfulParses} successful, ${failedParses} failed`);
        
        // Sort by YearWeekISO
        data.sort(function(a, b) {
            return a.YearWeekISO.localeCompare(b.YearWeekISO);
        });
        
        console.log("Data loaded and cleaned:", data.length, "rows");
        console.log("Sample row:", data[0]);
        return data; // Return the data so it can be used
    }).catch(function(error) {
        console.error("Error loading data:", error);
        throw error;
    });
}



