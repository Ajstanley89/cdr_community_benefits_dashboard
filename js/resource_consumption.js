// Time series section
// set the dimensions and margins of the graph
var margin = {top: 70, right: 30, bottom: 30, left: 60},
    width = 600 - margin.left - margin.right,
    height = 300 - margin.top - margin.bottom;

// append the svg object to the body of the page
var svgResource = d3.select("#resourceConsumptionPlot")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// load geojson data
Promise.all([d3.json("data/resource_consumption.json")]).then(function(data) {
    resource_data = data[0]

    console.log("Load Data")
    console.log('Resource: ', resource_data)

    //get unique pollutants
    var resource_options = new Set;
   
    Object.keys(resource_data).forEach(d => {if (d !== 'month') resource_options.add(d)});

    console.log(resource_options)


    //populate selection menu
    d3.select("#resourceSelection")
        .selectAll('option')
        .data(resource_options)
        .enter()
        .append('option')
        .attr('value', d => d)
        .text(d => d)

    // the list of all dates in the moving average repeats for each entry. This is not efficient, so we can change that later
    var parseMonth = d3.timeParse("%M")
    data.month= data.month.map(function(d) { return parseMonth(d)})

    // event listener for dropdown
    d3.select('#pollutantSelection').on('change', function() {
        var pollutant = this.value


    })
    
}).catch(function (err) {
    console.log("Error Loading Data: ", err)
});

function build_resource_time_series(svg, data, resource) {
    // clear graph
    svg.selectAll('*').remove()

    // title
    svg.append("text")
        .attr("x", (width / 2))             
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")  
        .style("font-size", "16px") 
        .text(`${Resource} Consumption Over Time`);

    x_domain = d3.extent(data.month)
    // console.log(x_domain)
    xScale = d3.scaleTime()
        .domain(x_domain)
        .range([0, width])


    y_domain = d3.extent(data[resource])
    // console.log('y: ', y_domain)
    yScale = d3.scaleLinear()
        .domain(y_domain)
        .range([height, 0])

    svg.append('g')
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale))

    svg.append('g')
        .call(d3.axisLeft(yScale))

    // draw lines
    svg.append('path')
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2.5)
        .attr('d', d3.line()
            .x(function(d) {return xScale(d.month)})
            .y(function(d) {return yScale(d[resource])}))

}

