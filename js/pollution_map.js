// Following th e exmaple here: https://leafletjs.com/examples/quick-start/
var view_center = [37.961632, -121.275604];
var map = L.map('map').setView(view_center, 13);

// add tile layer
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 15,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

var marker = L.marker(view_center).addTo(map);

// display marker info on click
marker.bindPopup("Proposed DACS facility").openPopup();

// Time series section
// set the dimensions and margins of the graph
var margin = {top: 10, right: 30, bottom: 30, left: 60},
    width = 600 - margin.left - margin.right,
    height = 300 - margin.top - margin.bottom;

// append the svg object to the body of the page
var svgPollution = d3.select("#timeSeriesPlot")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Resource consumption
var svgResource = d3.select("#resourceConsumptionPlot")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// load geojson data
Promise.all([d3.json("data/pollution.json"), d3.json("data/pollution_locations.json"), d3.json("data/resource_consumption.json")]).then(function(data) {
    pollution_data = data[0]
    coordinates_data = data[1]
    resource_data = data[2]

    console.log("Load Data")
    console.log(pollution_data)
    console.log(coordinates_data)
    console.log(resource_data)

    //get unique pollutants
    var pollutant_types = new Set;
    //unique measurement locations
    var location_ids = new Set;

    pollution_data.features.forEach(d => {
        pollutant_types.add(d.properties.Pollutant)
        location_ids.add(d.properties.location_id)
    });


    // populate selection menu
    d3.select("#pollutantSelection")
        .selectAll('option')
        .data(pollutant_types)
        .enter()
        .append('option')
        .attr('value', d => d)
        .text(d => d)

    //get unique resources
    var resource_options = new Set;
   
    Object.keys(resource_data).forEach(d => {if (d !== 'month') resource_options.add(d)});

    console.log(resource_options)

    var parseMonth = d3.timeParse("%B")

    for (let key of Object.keys(resource_data)) {
        resource_data[key] = Object.values(resource_data[key])
    }

    for (let key of Object.keys(resource_data.month)) {
        resource_data.month[key] = parseMonth(resource_data.month[key]).setFullYear(2024)
    }
    console.log("aslkdfjh", resource_data.month)
    // resource_data.month = resource_data.month.map(function(d) { return parseMonth(d)})

    //populate selection menu
    d3.select("#resourceSelection")
        .selectAll('option')
        .data(resource_options)
        .enter()
        .append('option')
        .attr('value', d => d)
        .text(d => d)

    // build initial graph
    var initial_pollutant_selection = d3.select('#pollutantSelection').property('value')
    var window_size = d3.select('#mapSlider').property('value')
    var filtered_data = filter_by_pollutant(pollution_data, initial_pollutant_selection)
    var location_timeseries = reformat_timeseries(filtered_data, coordinates_data, location_ids, window_size)
    var heat_data = format_for_heat_layer(location_timeseries)

    var heatLayer = L.heatLayer(heat_data, {radius: 10}).addTo(map);

    heatLayer.on('mouseover', ev => {
        console.log('You touched the heatmap!')
        heat.openPopup();
    })

    build_pollution_time_series(svgPollution, location_timeseries, initial_pollutant_selection)

    var resource_selection = d3.select('#resourceSelection').property('value')
    console.log('asdklfjh', resource_data, resource_selection)
    build_resource_time_series(svgResource, resource_data, resource_selection)


    // event listener for dropdown
    d3.select('#pollutantSelection').on('change', function() {
        var pollutant = this.value

        var filtered_data = filter_by_pollutant(pollution_data, pollutant)

        // console.log('Pollutant: ', pollutant, filtered_data)

        var window_size = d3.select('#mapSlider').property('value')

        var location_timeseries = reformat_timeseries(filtered_data, coordinates_data, location_ids, window_size)
        //console.log(location_timeseries)

        heatLayer = build_heat_layer(location_timeseries, heatLayer)

        // rebuild time series
        build_pollution_time_series(svgPollution, location_timeseries, pollutant)

    })

    // event listener for slider
    d3.select("#mapSlider").on("input", function() {
        var window_size= this.value
        d3.select("#sliderValue").text(window_size + " Days")

        var pollutant = d3.select('#pollutantSelection').property('value')

        var filtered_data = filter_by_pollutant(pollution_data, pollutant)

        var location_timeseries = reformat_timeseries(filtered_data, coordinates_data, location_ids, window_size)

        heatLayer = build_heat_layer(location_timeseries, heatLayer)

        build_pollution_time_series(svgPollution, location_timeseries, pollutant)

    })


    
}).catch(function (err) {
    console.log("Error Loading Data: ", err)
});

function filter_by_pollutant(data, pollutant) {
    return data.features.filter(d => d.properties.Pollutant === pollutant)
}

function moving_average(data, window_size) {
    var moving_averages = [];

    for (let i=0; i < data.length - window_size; i++) {
        var window_mean = d3.mean(data.slice(i, i + window_size))
        moving_averages.push(window_mean)
    }

    return moving_averages
}

function reformat_timeseries(data, coordinates_data, location_ids, window_size) {
    // reformat as an array of dicts for each location, each measurement is in an array in the dict
    // this function must be hella slow. Way too many nested loops. I'm not a computer engineer LOL
    // assumes data is already sorted chronologically.
    var new_arr = [];
    
    location_ids.forEach(function(id) {
        location_dict = {'location_id': id,
            'geometry': coordinates_data.features[id].geometry,
            'pollutant_values': [],
            'dates': []
        };

        data.filter(d => d.properties.location_id === id)
            .forEach(function(d) {
                location_dict.pollutant_values.push(d.properties.Pollutant_amount)
                location_dict.dates.push(d.properties.Date)
            })

        // calculate moving averages
        location_dict['moving_average'] = moving_average(location_dict.pollutant_values, window_size)
        location_dict['moving_average_dates'] = location_dict.dates.slice(0, location_dict.moving_average.length)
        location_dict['window_size'] = window_size

        new_arr.push(location_dict)

    })

    return new_arr
}

function format_for_heat_layer(data) {

    var formatted_data = data.map(function(d) {
       return [d.geometry.coordinates[1], d.geometry.coordinates[0], d.moving_average[0]] // only show the latest moving average on the map
    })
    
    console.log('format_heat_layer: ', d3.extent(formatted_data, d => d[2]))

    // add color scale
    console.log(formatted_data)
    var pollutant_domain = d3.extent(formatted_data, d => d[2])
    console.log("extent", pollutant_domain)
    var heatmap_scale = d3.scaleLinear()
                            .domain(pollutant_domain)
                            .range([0, 100])

    return formatted_data.map(function(d) {
        return [d[0], d[1], heatmap_scale(d[2])]
    })
}

function build_heat_layer(data, old_heat_layer) {
    // leaflet needs data in [[lat, lon, intensity],...]
    map.removeLayer(old_heat_layer)
    var formatted_data = format_for_heat_layer(data)
    var max_val = d3.max(formatted_data, d => d[2])

    console.log(max_val)

    var legend = L.control({ position: 'bottomright' });

    var new_heat_layer = L.heatLayer(formatted_data, {radius: 10}).addTo(map)

    return new_heat_layer
}

function build_pollution_time_series(svg, data, pollutant) {
    // clear graph
    svg.selectAll('*').remove()

    // title
    svg.append("text")
        .attr("x", (width / 2))             
        .attr("y", 0 + (margin.top / 2))
        .attr("text-anchor", "middle")  
        .style("font-size", "16px") 
        .text(`${pollutant} Air Concentration Over Time`);

    var pollution_quantiles = get_MA_quantiles(data)
    console.log('quantiles: ', pollution_quantiles)

    x_domain = d3.extent(pollution_quantiles.map(d => d.date))
    // console.log(x_domain)
    xScale = d3.scaleTime()
        .domain(x_domain)
        .range([0, width])


    y_domain = [0, d3.max(pollution_quantiles, d => d.q95)]
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
        .datum(pollution_quantiles)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2.5)
        .attr('d', d3.line()
            .x(function(d) {return xScale(d.date)})
            .y(function(d) {return yScale(d['q50'])}))

    // Show confidence interval
    svg.append("path")
      .datum(pollution_quantiles)
      .attr("fill", "#cce5df")
      .attr("stroke", "none")
      .attr('opacity', 0.4)
      .attr("d", d3.area()
        .x(function(d) { return xScale(d.date) })
        .y0(function(d) { return yScale(d.q05) })
        .y1(function(d) { return yScale(d.q95) })
        )


    return svg
}

function get_MA_quantiles(data) {
    console.log('time series function: ', data[0])

    var outer_arr = [];

    for (let i=0; i<data[0].moving_average.length; i++) {
        var inner_arr = [];

        data.forEach(d => {inner_arr.push(d.moving_average[i])})

        outer_arr.push(inner_arr)
    }

    // the list of all dates in the moving average repeats for each entry. This is not efficient, so we can change that later
    var parseTime = d3.timeParse("%Y-%m-%d")
    var dates = data[0].moving_average_dates.map(function(d) { return parseTime(d)})


    // get quantiles
    let result = outer_arr.map(function(d, i) {
        return {'q05': d3.quantile(d, 0.05), 'q50': d3.quantile(d, 0.5), 'q95': d3.quantile(d, 0.95), 'date': dates[i]}
    })

    return result
}

function build_resource_time_series(svg, data, resource) {
    // clear graph
    svg.selectAll('*').remove()

    // title
    svg.append("text")
        .attr("x", (width / 2))             
        .attr("y", 0 + (margin.top * 2))
        .attr("text-anchor", "middle")  
        .style("font-size", "16px") 
        .text(`${resource} Per Month`);

    let x_domain = d3.extent(data.month)
    console.log(x_domain)
    let xScale = d3.scaleTime()
        .domain(x_domain)
        .range([0, width])


    let y_domain = d3.extent(data[resource])
    console.log('y: ', y_domain)
    let yScale = d3.scaleLinear()
        .domain(y_domain)
        .range([height, 0])

    svg.append('g')
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale))

    svg.append('g')
        .call(d3.axisLeft(yScale))

    // draw lines
    svg.selecteAll('path')
        .data([data])
        .enter()
        .append('path')
        .attr("fill", "none")
        .attr("stroke", "blue")
        .attr("stroke-width", 6)
        .attr('d', d3.line()
            .x(function(d) {return xScale(d.month)})
            .y(function(d) {return yScale(d[resource])}));

    return svg
}





