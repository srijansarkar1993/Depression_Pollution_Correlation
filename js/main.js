var selectedRegion = "All";
var countrySelectedonMap;
let map;
let scatterPlotView = "landarea";
var selectedSortingOrder = "depressionAscending"


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
  // console.log((d3.max(csvData, d => +d.pollutionDepressionRatio)).toFixed(0));
  countryDataforMap = csvData;
  if (selectedRegion != "All")
    mainCsvData = csvData.filter(data => data.region == selectedRegion);
  else mainCsvData = csvData;

  // Calculate the correlation coefficient for each country and add it as a new property to the data
  mainCsvData.forEach(d => {
    const depression_std = (d.depressionPrevalence - d3.mean(mainCsvData, d => d.depressionPrevalence)) / d3.deviation(mainCsvData, d => d.depressionPrevalence);
    const pollution_std = (d.particlePollution - d3.mean(mainCsvData, d => d.particlePollution)) / d3.deviation(mainCsvData, d => d.particlePollution);
    const correlation = correlationCoefficient([depression_std, pollution_std], mainCsvData.map(d => d.population));

    d.correlation = correlation;
  });
  createScatterPlot(mainCsvData, scatterPlotView);

  //extract the values of the depression and pollution variables in arrays
  var depressionVa

  var info = "<h3>Countries in " + selectedRegion + " sorted as per depression</h3>";
  var counter = 0;
  mainCsvData.sort(function (a, b) {
    return a.depressionPrevalence - b.depressionPrevalence;
  });
  mainCsvData.forEach(function (element) {
    info = info !== undefined ? info + "<br>" + counter + ". " + element.countryName : "";
    counter++;
  })
  d3.select("#info").html(info);


  //getting the unique regions from the data
  const uniqueRegions = [...new Set(csvData.map(item => item.region))];
  uniqueRegions.unshift("All");
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
    createStackedBars(stackBarData, mainCsvData, selectedSortingOrder)
  })

  d3.select("#filterRegion").on("change", function (d) {
    // recover the region that has been chosen
    selectedOption = d3.select(this).property("value");
    selectedRegion = selectedOption;
    // filter the countries data with this selected region
    mainCsvData = selectedRegion != "All" ? csvData.filter(data => data.region == selectedRegion) : csvData;
    // Calculate the correlation coefficient for each country and add it as a new property to the data
    mainCsvData.forEach(d => {
      const depression_std = (d.depressionPrevalence - d3.mean(mainCsvData, d => d.depressionPrevalence)) / d3.deviation(mainCsvData, d => d.depressionPrevalence);
      const pollution_std = (d.particlePollution - d3.mean(mainCsvData, d => d.particlePollution)) / d3.deviation(mainCsvData, d => d.particlePollution);
      const correlation = correlationCoefficient([depression_std, pollution_std], mainCsvData.map(d => d.population));

      d.correlation = correlation;
    });
    createScatterPlot(mainCsvData, scatterPlotView);
    createStackedBars(stackBarData, mainCsvData, selectedSortingOrder);

    map.selectAll("path").style("fill", "#ccc");
    var allCountriesInThisRegion = countryDataforMap
      .filter(function (d) { return d.region === selectedRegion; })
      .map(function (d) { return d.countryName; });
    // Loop through the array of countries and update the stroke color in map
    allCountriesInThisRegion.forEach(function (c) {
      updateStrokeColor(map, c);
    })
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
  map = d3.select("#mapcontainer")
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
    //.style("fill", "#ccc")
    .style("fill", function (d, i) {
      var clickedCountry = d.properties.ADMIN == "United States of America" ? "United States" : d.properties.ADMIN;
      //checking if the clicked country exists in our csv data
      var result = countryDataforMap.find(d => d.countryName == clickedCountry);
      if (result !== undefined) {
        //to color the selected rgion orange on load
        if (selectedRegion == result.region)
          return "orange";
        else return "#ccc";
      } else return "#ccc";
    })
    .style("stroke", "#fff")
    .style("stroke-width", "1.5");

  d3.select(".loader").style("display", "none");

  var currentSelection = null;
  // Add interactivity to the map
  map.selectAll("path")
    .on("mouseover", function () {
      if (this !== currentSelection && d3.select(this).style("fill") !== "orange" && d3.select(this).style("fill") !== "red") {
        d3.select(this).style("fill", "darkgrey");
      }
    })
    .on("mouseout", function () {
      if (this !== currentSelection && d3.select(this).style("fill") !== "orange" && d3.select(this).style("fill") !== "red") {
        d3.select(this).style("fill", "#ccc");
      }
    })
    .on("click", function (d, i) {
      currentSelection = this;
      var clickedCountry = i.properties.ADMIN == "United States of America" ? "United States" : i.properties.ADMIN;
      countrySelectedonMap = clickedCountry;
      //checking if the clicked country exists in our csv data
      var result = countryDataforMap.find(d => d.countryName == clickedCountry);
      if (result !== undefined) {
        d3.selectAll("path").style("fill", "#ccc");
        d3.select(this).style("fill", "red");
        //if the clicked country exists take its region
        var clickedRegion = result.region;
        //setting the global variable with this region
        selectedRegion = clickedRegion;
        //fetching and highlighting all countries of this region on the map
        var allCountriesInThisRegion = countryDataforMap
          .filter(function (d) { return d.region === selectedRegion; })
          .map(function (d) { return d.countryName; });
        // Loop through the array of countries and update the stroke color in map
        allCountriesInThisRegion.forEach(function (c) {
          updateStrokeColor(map, c, clickedCountry);
        });

        //updating and triggering the region dropdown
        let regionDropdown = d3.select("#filterRegion");
        regionDropdown.property("value", selectedRegion)
          .dispatch("change");
      } else {
        console.log("cant find this country in our data");
        d3.selectAll("path").style("fill", "#ccc");
      }

      // recover the region that has been chosen
      // selectedOption = d3.select(this).property("value");
      // selectedRegion = selectedOption;
      // // filter the countries data with this selected region
      // mainCsvData = csvData.filter(data => data.region == selectedRegion);

    })
    .on("mouseleave")
});



function createScatterPlot(data, scatterPlotView) {
  var margin = { top: 50, right: 90, bottom: 100, left: 40 },
    width = 700 - margin.left - margin.right,
    height = 450 - margin.top - margin.bottom;

  var viewMode = "area"; // default view mode is "area"

  // calculate the line of best fit using linear regression
  //This code calculates the mean of the pollution and depression values. 
  //It then uses these means to calculate the slope (m) and y-intercept (b) of the line
  var n = data.length;
  var x_mean = d3.mean(data, d => d.particlePollution);

  var y_mean = d3.mean(data, d => d.depressionPrevalence);
  var num = d3.sum(data, d => (d.particlePollution - x_mean) * (d.depressionPrevalence - y_mean));
  var den = d3.sum(data, d => Math.pow(d.particlePollution - x_mean, 2));
  var m = num / den;
  var b = y_mean - m * x_mean;

  // define the x and y scales
  var maxValue = Math.max.apply(null, data.map(function (d) {
    return d.particlePollution;
  }).filter(function (value) {
    return !isNaN(value);
  }));
  var minValue = Math.min.apply(null, data.map(function (d) {
    return d.particlePollution;
  }).filter(function (value) {
    return !isNaN(value);
  }));
  var x = d3.scaleLinear()
    .domain([0, maxValue + 20])
    .range([0, width]);


  var y = d3.scaleLinear()
    .domain([0, d3.max(data, function (d) { return d.depressionPrevalence; })])
    .range([height, 0]);

  // define the line generator for the best-fit line using mean and y-intercept
  var line = d3.line()
    .x(d => x(d.particlePollution))
    .y(d => y(m * d.particlePollution + b));

  // create the svg element
  var svg = d3.select("#scatter").html("").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var color = d3.scaleLinear()
    .domain([-0.5, 0.5])
    .range(["#003399", "#b3d9ff"]);

  var tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .text("");;

  // add the best-fit line to the svg
  svg.append("path")
    .datum(data)
    .attr("fill", "red")
    .attr("stroke", "black")
    .attr("d", line);

  // add the data points to the svg
  svg.selectAll(".dot")
    .data(data)
    .enter().append("circle")
    .attr("class", "dot")
    .attr("cx", d => x(d.particlePollution))
    .attr("cy", d => y(d.depressionPrevalence))
    // .attr("r", 5)
    .attr("r", function (d) {
      if (scatterPlotView == "landarea")
        return Math.sqrt(d.countryArea) / 100;
      else if (scatterPlotView == "population")
        return Math.sqrt(d.population) / 1000;
    }) // map population data to circle size
    .style("fill", function (d) {
      var distance = d.depressionPrevalence - (m * d.particlePollution + b);
      //console.log();
      return color(Math.abs(distance));
    })
    .attr("opacity", 0.5)
    .attr("country", d => d.countryName)
    // .append("title")
    // .html(d => d.countryName, d => d.population);
    .on("mouseover", function (d, i) {
      if (scatterPlotView == "landarea")
        tooltip.html("<li>Country: " + i.countryName + "</li><li>Land Area:" + i.countryArea + "</li>");
      else if (scatterPlotView == "population")
        tooltip.html("<li>Country: " + i.countryName + "</li><li>Population: " + i.population + "</li>");
      tooltip.style("visibility", "visible");
    })
    .on("mousemove", function (d) {
      tooltip.style("top", (d.clientY - 10) + "px").style("left", (d.clientX + 10) + "px");
    })
    .on("mouseout", function (d) {
      tooltip.style("visibility", "hidden");
    });

  // svg.selectAll(".text")
  //   .data(data)
  //   .enter().append("text")
  //   .text(d => d.countryName)
  //   .attr("x", d => x(d.particlePollution) + 5)
  //   .attr("y", d => y(d.depressionPrevalence) - 5)
  //   .style("font-size", "10px")
  //   .style("fill", "red");


  // add the x and y axis to the svg
  svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));

  svg.append("g")
    .call(d3.axisLeft(y));


  // add x-axis label
  svg.append("text")
    .attr("transform", "translate(" + (width / 2) + " ," + (height + margin.top + 20) + ")")
    .style("text-anchor", "middle")
    .text("Particle Pollution");

  // add y-axis label
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Depression Prevalence");
}

































// Sort the data based on depression prevalence in ascending order
function sortByDepressionAscending(data) {
  data.sort(function (a, b) {
    return d3.ascending(+a.depressionPrevalence, +b.depressionPrevalence);
  });
}

// Sort the data based on depression prevalence in descending order
function sortByDepressionDescending(data) {
  data.sort(function (a, b) {
    return d3.descending(+a.depressionPrevalence, +b.depressionPrevalence);
  });
}

// Sort the data based on particle pollution in ascending order
function sortByPollutionAscending(data) {
  data.sort(function (a, b) {
    return d3.ascending(+a.particlePollution, +b.particlePollution);
  });
}

// Sort the data based on particle pollution in descending order
function sortByPollutionDescending(data) {
  data.sort(function (a, b) {
    return d3.descending(+a.particlePollution, +b.particlePollution);
  });
}





















function createStackedBars(data, mainCsvData, sortingOrder) {
  switch (sortingOrder) {
    case "depressionAscending":
      console.log("sortByDepressionAscending");
      sortByDepressionAscending(mainCsvData);
      break;

    case "depressionDescending":
      console.log("sortByDepressionDescending");
      sortByDepressionDescending(mainCsvData);
      break;
    case "pollutionAscending":
      console.log("sortByPollutionAscending");
      sortByPollutionAscending(mainCsvData);
      break;
    case "pollutionDescending":
      console.log("sortByPollutionDescending");
      sortByPollutionDescending(mainCsvData);
      break;
    default:
      console.log("sortByDepressionAscending");
      sortByDepressionAscending(mainCsvData);
      
  }
  // mainCsvData.sort(function (a, b) {
  //   return d3.descending(+a.particlePollution, +b.particlePollution);
  // });
  // console.log(mainCsvData)


  //filtering the data as per the region selected
  let filteredResult = data.filter(obj1 => {
    return mainCsvData.some(obj2 => obj2.countryName === obj1.countries);
  });
  filteredResult.columns = data.columns;
  data = filteredResult;

  // Set the dimensions and margins of the graph
  const width = 1400, height = 400;
  const margin = { top: 10, right: 30, bottom: 80, left: 50 };

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

  // Sort the groups array according to the order of countries in mainCsvdata
  groups.sort(function (a, b) {
    return mainCsvData.findIndex(c => c.countryName === a) - mainCsvData.findIndex(c => c.countryName === b);
  });

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
        return "red";
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
  // svg.append("g")
  //   .call(d3.axisLeft(y));

  // Add y-axis label
  svg.append("text")
    .attr("text-anchor", "middle")
    .attr("transform", "translate(" + (-margin.left / 2) + "," + (height / 2) + ")rotate(-90)")
    .text("Correlation Coefficient")
    .style("font-size", "14px")
  //.attr("y", 5);



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

  // Create the new y-axis
  const yCircles = d3.scaleLinear()
    .domain([-1, 1])
    .range([height, 0]);
  const yAxisCircles = d3.axisLeft(yCircles);

  // Append the new y-axis to the SVG element
  svg.append("g")
    .attr("class", "y-axis-circles")
    .call(yAxisCircles);

  // Hide the original y-axis
  svg.selectAll(".y-axis path, .y-axis line, .y-axis .tick line")
    .style("display", "none");
  // ----------------
  // Create yellow circle
  // ----------------

  const correlationScale = d3.scaleLinear()
    .domain([-1, 1])
    .range([height, 0]);

  mainCsvData.forEach(function (d, i) {
    svg.append("circle")
      .attr("cx", x(d.countryName) + x.bandwidth() / 2)
      // .attr("cy", y((d.correlation)))
      .attr("cy", yCircles(d.correlation))
      .attr("r", 10)
      .style("fill", function (d, i) {
        return "yellow"
      })
      .on("mouseover", function (i) {
        tooltip
          .html("<h3>correlation coefficient = " + (d.correlation) + "</h3>")
          .style("opacity", 1)
          .style("background-color", "white")
      })
      .on("mousemove", mousemove)
      .on("mouseleave", mouseleave);
    // svg.append("text")
    //   .attr("x", x(d.countryName) + x.bandwidth() / 2)
    //   .attr("y", correlationScale(d.correlation) + 5)
    //   .text((d.correlation))
    //   .style("text-anchor", "middle")
    //   .style("fill", "black")
    //   .style("font-size", "12px")
    //   .on("mouseover", function (i) {
    //     tooltip
    //       .html("<h3>Pearson's correlation coefficient: " + (d.correlation) + "</h3>")
    //       .style("opacity", 1)
    //       .style("background-color", "white")
    //   })
    //   .on("mousemove", mousemove)
    //   .on("mouseleave", mouseleave);
  });




}

// Change the stroke color for specific countries
var updateStrokeColor = function (map, country, selectedCountry) {
  map.selectAll("path")
    .filter(function (d) {
      return d.properties.ADMIN === country;
    })
    .style("fill", function (d, i) {
      if (d.properties.ADMIN === selectedCountry) {
        console.log(d.properties.ADMIN);
        return "red";
      }

      else return "orange"
    });
};

// Define a function to calculate the correlation coefficient between two variables
function correlationCoefficient(x, y) {
  const n = x.length;
  const x_mean = d3.mean(x);
  const y_mean = d3.mean(y);
  const x_dev = x.map(d => d - x_mean);
  const y_dev = y.map(d => d - y_mean);
  const numerator = d3.sum(x_dev.map((d, i) => d * y_dev[i]));
  const denominator = Math.sqrt(d3.sum(x_dev.map(d => d ** 2)) * d3.sum(y_dev.map(d => d ** 2)));
  return numerator / denominator;
}

// function toggleScatterPlot(){
d3.selectAll('input[name="toggle"]')
  .on("change", function () {
    scatterPlotView = this.value;
    createScatterPlot(mainCsvData, this.value)
  });

d3.select("#sortDropdown").on("change", function (d) {
  // recover the region that has been chosen
  selectedOption = d3.select(this).property("value");
  selectedSortingOrder = selectedOption;
  createStackedBars(stackBarData, mainCsvData, selectedOption);
});