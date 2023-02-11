var selectedRegion = "Asia";
var countrySelectedonMap;


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
  console.log((d3.max(csvData, d => +d.pollutionDepressionRatio)).toFixed(0));
  countryDataforMap = csvData;
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
    // recover the region that has been chosen
    selectedOption = d3.select(this).property("value");
    selectedRegion = selectedOption;
    // filter the countries data with this selected region
    mainCsvData = csvData.filter(data => data.region == selectedRegion);
    createStackedBars(stackBarData, mainCsvData);
  })

})

//creating worldmap

// Define the map projection
var projection = d3.geoNaturalEarth1()
  .scale(153)
  .translate([300, 200]);

// Define the path generator
var path = d3.geoPath().projection(projection);

//Load the world map TopoJSON data
d3.json("data/countries.geojson").then(function (world) {
  // Convert TopoJSON to GeoJSON (for D3.js)
  // var countries = topojson.feature(world, world.objects.countries).features;

  // Create the map
  var map = d3.select("#mapcontainer")
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%");

  // Draw the countries on the map
  map.selectAll("path")
    .data(world.features)
    .enter().append("path")
    .attr("d", path)
    // .attr("id", function (d, i) {
    //   return "country" + d.properties.ADMIN;
    // })
    .style("fill", "#ccc")
    .style("stroke", "#fff")
    .style("stroke-width", "1.5");

  var currentSelection = null;
  // Add interactivity to the map
  map.selectAll("path")
    .on("mouseover", function () {
      if (this !== currentSelection) {
        d3.select(this).style("fill", "darkgrey");
      }
    })
    .on("mouseout", function () {
      if (this !== currentSelection) {
        d3.select(this).style("fill", "#ccc");
      }
    })
    .on("click", function (d, i) {
      if (currentSelection) {
        d3.select(currentSelection).style("fill", "#ccc");
      }
      d3.select(this).style("fill", "orange");
      currentSelection = this;
      var clickedCountry = i.properties.ADMIN == "United States of America" ? "United States" : i.properties.ADMIN;
      countrySelectedonMap = clickedCountry;
      //checking if the clicked country exists in our csv data
      var result = countryDataforMap.find(d => d.countryName == clickedCountry);
      if (result !== undefined) {
        //if the clicked country exists take its region
        var clickedRegion = result.region;
        //setting the global variable with this region
        selectedRegion = clickedRegion;
        let regionDropdown = d3.select("#filterRegion");
        regionDropdown.property("value", selectedRegion)
          .dispatch("change");
      }

      // recover the region that has been chosen
      // selectedOption = d3.select(this).property("value");
      // selectedRegion = selectedOption;
      // // filter the countries data with this selected region
      // mainCsvData = csvData.filter(data => data.region == selectedRegion);
      // createStackedBars(stackBarData, mainCsvData);

    })
    .on("mouseleave")
});

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
    .attr("transform", "rotate(-65)")
    .style("color", function (d, i) {
      if (d == countrySelectedonMap) {
        return "orange";
      }
    });

  //Add x-axis label
  svg.append("text")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom)
    .text("Countries");

  // Add Y axis
  var y = d3.scaleLinear()
    .domain([0, 20])
    .range([height, 0]);
  svg.append("g")
    .call(d3.axisLeft(y));

  // Add y-axis label
  svg.append("text")
    .attr("text-anchor", "middle")
    .attr("transform", "translate(" + (-margin.left / 2) + "," + (height / 2) + ")rotate(-90)")
    .text("Particle Pollution to Depression Prevalence ratio")
    .style("font-size", "14px")
    .attr("y", 10);

  // Create the color scales for depression and pollution based on area and density
  var depressionColor = d3.scaleLinear()
    .domain([d3.min(mainCsvData, d => +d.depressionPrevalence), d3.max(mainCsvData, d => +d.depressionPrevalence)])
    .range(["#D85A88", "#2F121C"]);
  var pollutionColor = d3.scaleLinear()
    .domain([d3.min(mainCsvData, d => +d.particlePollution), d3.max(mainCsvData, d => +d.particlePollution)])
    .range(["#4861AC", "#0C1331"]);


  //stack the data --> stack per subgroup
  var stackedData = d3.stack().keys(subgroups)(data)

  // ----------------
  // Create a tooltip
  // ----------------
  var tooltip = d3.select("#bar")
    .append("div")
    .style("opacity", 0)
    .attr("class", "tooltip")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "1px")
    .style("border-radius", "5px")
    .style("padding", "10px")
    .style("position", "absolute")

  // Three function that change the tooltip when user hover / move / leave a cell
  var mouseover = function (d, i) {
    var subgroupName = d3.select(this.parentNode).datum().key;
    var country = i.data.countries;
    var countryData = mainCsvData.filter(function (m) { return m.countryName === country; })[0];
    let htmlText;
    if (subgroupName == "Pollution") {
      htmlText = "<h3>" + subgroupName + " data for  " + countryData.countryName + "</h3><li>Particle Pollution : " + countryData.particlePollution + "</li><li>Global rank in particle pollution : " + countryData.particlePollutionRank + "</li><li>Region : " + countryData.region + " (" + countryData.subregion + ")</li>";
    } else {
      htmlText = "<h3>" + subgroupName + " Prevalence data for  " + countryData.countryName + "</h3><li>Depression Prevalence : " + countryData.depressionPrevalence + "</li><li>Global rank in prevalence of depression: " + countryData.depressionPrevalenceRank + "</li><li>Region : " + countryData.region + " (" + countryData.subregion + ")</li>"
    }
    tooltip
      .html(htmlText)
      .style("opacity", 1)
      .style("background-color", function (d, i, n) {
        if (country == countrySelectedonMap) return "orange";
        else return "white";
      })
  }

  var mousemove = function (d) {
    tooltip
      .style("left", (d3.pointer(d)[0] + 50) + "px")
      .style("top", (d3.pointer(d)[1] + 350) + "px")
  }
  var mouseleave = function (d) {
    tooltip
      .style("opacity", 0)
  }

  // ----------------
  // Create stacked bars
  // ----------------
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
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseleave", mouseleave)


  // //Loop through each subgroup of bars
  // bars.each(function (d, i) {
  //   var bar = d3.select(this);
  //   //console.log("Bar " + i + ":", bar.style("fill"));
  // });

  // ----------------
  // Create red circle
  // ----------------
  mainCsvData.forEach(function (d, i) {
    svg.append("circle")
      .attr("cx", x(d.countryName) + x.bandwidth() / 2)
      .attr("cy", y((d.pollutionDepressionRatio).toFixed(0)))
      .attr("r", 10)
      .style("fill", "yellow")
      .on("mouseover", function (i) {
        tooltip
          .html("<h3>Pollution : Depression = " + (d.pollutionDepressionRatio)+"</h3>")
          .style("opacity", 1)
          .style("background-color", "white")
      })
      .on("mousemove", mousemove)
      .on("mouseleave", mouseleave);
    svg.append("text")
      .attr("x", x(d.countryName) + x.bandwidth() / 2)
      .attr("y", y((d.pollutionDepressionRatio).toFixed(0)) + 5)
      .text((d.pollutionDepressionRatio).toFixed(0))
      .style("text-anchor", "middle")
      .style("fill", "black")
      .style("font-size", "12px")
      .on("mouseover", function (i) {
        tooltip
          .html("<h3>Pollution : Depression = " + (d.pollutionDepressionRatio)+"</h3>")
          .style("opacity", 1)
          .style("background-color", "white")
      })
      .on("mousemove", mousemove)
      .on("mouseleave", mouseleave);
  });

}










