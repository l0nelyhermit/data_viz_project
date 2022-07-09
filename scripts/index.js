// Create functions to process CSV Dataset
function processCSV(csv, direction) {
  return csv.map((d) => {
    const date = d.month;
    const name = d.countries;
    const value = d.value === "na" ? null : +d.value;
    const code = d.country_code;
    return {
      date,
      name,
      value,
      code,
      direction,
    };
  });
}

function processDataset(csvs) {
  const data = [
    ...processCSV(csvs[0], "arrivals"),
    ...processCSV(csvs[1], "departures"),
  ];
  return data;
}

// Promise to get data and parse it to render visualizations
Promise.all([
  d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json"),
  d3.csv("dataset/arrivals(countries).csv"),
  d3.csv("dataset/departures(countries).csv"),
])
  .then(([worldMap, ...csvs]) => {
    const data = processDataset(csvs);
    renderMap(worldMap, data);
    renderSlopeChart(data);
  })
  .catch((error) => {
    console.log(error);
  });
