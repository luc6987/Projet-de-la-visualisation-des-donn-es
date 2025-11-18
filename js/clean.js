
export function CleanVaccin(){
    return d3.csv("data/vaccin.csv").then(function(data) {
        // Convert YearWeekISO to Date (e.g., "2021-W02" + "-1" → Monday of that week)
        data.forEach(function(row){
            if (row.YearWeekISO) {
                row.Date = d3.timeParse("%Y-W%W-%w")(row.YearWeekISO + "-1");
                if (row.Date){
                    const year = row.Date.getFullYear();
                    const month = String(row.Date.getMonth()+1).padStart(2,'0');
                    row.YearMonth = `${year}-${month}`;
                       
                }


            }
        });

        data.sort(function(a, b) {
            return a.YearWeekISO.localeCompare(b.YearWeekISO);
        });
        
        console.log("Data loaded:", data);
        return data; 
    }).catch(function(error) {
        console.error("Error loading data:", error);
        throw error;
    });
}



