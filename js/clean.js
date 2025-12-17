
export function CleanVaccin(){
    return d3.csv("data/vaccin.csv").then(function(data) {
        console.log(`Raw data loaded: ${data.length} rows`);
        
        let successfulParses = 0;
        let failedParses = 0;
        
        data.forEach(function(row){
            if (row.YearWeekISO) {
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
        
        data.sort(function(a, b) {
            return a.YearWeekISO.localeCompare(b.YearWeekISO);
        });
        
        console.log("Data loaded and cleaned:", data.length, "rows");
        console.log("Sample row:", data[0]);
        return data; 
    }).catch(function(error) {
        console.error("Error loading data:", error);
        throw error;
    });
}



