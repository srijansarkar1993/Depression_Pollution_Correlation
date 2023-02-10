var selectedRegion = "Asia";

//Extracting the PollutionDepression main data
d3.csv("data/Depression_Pollution_Data.csv", d => {

  return {
    countryName: d.countries,
    countryCode: d.countryCode,
    countryId: d.countryID,
    region: d.region,
    subregion: d.subregion,
    case: d.cases,
    countryArea: d.area,
    density: d.density,
    densityMi: d.densityMi,
    densityRank: d.densityRank,
    population: d.pop2023,
    growthRate: d.growthRate,
    particlePollution: d.particlePollution,
    particlePollutionRank: d.particlePollutionRank,
    depressionPrevalence: d.prevalence,
    depressionPrevalenceRank: d.prevalenceRank,
    pollutionDepressionRatio: d.particlePollution / d.prevalence,
    year: 2023
  }
}).then(csvData => {
  mainCsvData = csvData.filter(data => data.region == selectedRegion);

  //getting the unique regions from the data
  const uniqueRegions = [...new Set(csvData.map(item => item.region))];
  //adding the options to the region selection dropdown
  d3.select("#filterRegion")
    .selectAll('myOptions')
    .data(uniqueRegions)
    .enter()
    .append('option')
    .text(function (d) { return d; }) // text showed in the menu
    .attr("value", function (d) { return d; }) // corresponding value returned by the button

  //Extracting the data and creating the stacked bars
  d3.csv("data/StackedBarData.csv", d => {
    return {
      countries: d.countries,
      Depression: d.Depression,
      Pollution: d.Pollution,
    }
  }).then(data => {
    stackBarData = data;
    createStackedBars(stackBarData, mainCsvData)
  })

  d3.select("#filterRegion").on("change", function (d) {
    //console.log(selectedRegion)
    // recover the region that has been chosen
    selectedOption = d3.select(this).property("value");
    selectedRegion = selectedOption;
    // filter the countries data with this selected region
    mainCsvData = csvData.filter(data => data.region == selectedRegion);
    createStackedBars(stackBarData, mainCsvData);
  })

})


function createStackedBars(data, mainCsvData) {

  //filtering the data as per the region selected
  let filteredResult = data.filter(obj1 => {
    return mainCsvData.some(obj2 => obj2.countryName === obj1.countries);
  });
  filteredResult.columns = data.columns;
  data = filteredResult;

  // Set the dimensions and margins of the graph
  const width = 900, height = 400;
  const margin = { top: 10, right: 30, bottom: 80, left: 20 };

  // Create the SVG container
  const svg = d3.select("#bar").html("")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
      "translate(" + margin.left + "," + margin.top + ")");

  // List of subgroups are the header of the csv files(depression and pollution)
  var subgroups = data.columns.slice(1)
  // List of groups are the countries = value of the first column called countries
  var groups = data.map(d => d.countries);

  // Add X axis
  var x = d3.scaleBand()
    .domain(groups)
    .range([0, width])
    .padding([0.2])
  svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x).tickSizeOuter(0))
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-65)");

  // Add Y axis
  var y = d3.scaleLinear()
    .domain([0, 4.0])
    .range([height, 0]);
  svg.append("g")
    .call(d3.axisLeft(y));

  // Create the color scales for depression and pollution based on area and density
  var depressionColor = d3.scaleLinear()
    .domain([d3.min(mainCsvData, d => +d.depressionPrevalence), d3.max(mainCsvData, d => +d.depressionPrevalence)])
    .range(["#CBC3E3", "#301934"]);
  var pollutionColor = d3.scaleLinear()
    .domain([d3.min(mainCsvData, d => +d.particlePollution), d3.max(mainCsvData, d => +d.particlePollution)])
    .range(["#90EE90", "#023020"]);


  //stack the data --> stack per subgroup
  var stackedData = d3.stack().keys(subgroups)(data)

  // create stacked bars
  let bars = svg.append("g")
    .selectAll("g")
    // Enter in the stack data = loop key per key = group per group
    .data(stackedData)
    .enter().append("g")
    .selectAll("rect")
    // enter a second time = loop subgroup per subgroup to add all rectangles
    .data(function (d, i) {
      return d;
    })
    .enter().append("rect")
    .style("fill", function (d, i) {

      var country = d.data.countries;
      var countryData = mainCsvData.filter(function (m) { return m.countryName === country; })[0];
      if (countryData) {

        if (d[0] == 0) {
          //console.log(countryData.countryName,countryData.depressionPrevalence,`depression color: ${depressionColor(countryData.depressionPrevalence)}`);
          color = depressionColor(countryData.depressionPrevalence);
        } else {
          // console.log(countryData.countryName,countryData.particlePollution,`pollution color: ${pollutionColor(countryData.particlePollution)}`);
          color = pollutionColor(countryData.particlePollution);
        }
      } else {
        //console.log(`No data found for country: ${country}`);
        color = "lightgrey";
      }
      return color;
    })
    .attr("x", function (d) { return x(d.data.countries); })
    .attr("y", function (d) { return y(d[1]); })
    .attr("height", function (d) { return y(d[0]) - y(d[1]); })
    .attr("width", x.bandwidth())


  // //Loop through each subgroup of bars
  // bars.each(function (d, i) {
  //   var bar = d3.select(this);
  //   //console.log("Bar " + i + ":", bar.style("fill"));
  // });
}










