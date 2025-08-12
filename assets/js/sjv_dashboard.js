// map
var facilityData = {'coords':[37.63946, -121.35232],
                    'hoverText': 'Hypothetical DACS Facility'
                };

var injectionData = {'coords': [37.63599, -121.29550],
                    'hoverText': 'Class VI Injection Well'
                };

var gasData = {'coords': [37.79906, -121.60090],
                'hoverText': 'Gas Plant with CCS'
                };

var windData = {'coords':[37.82738, -121.67811],
                    'hoverText': "Hypothetical wind farm for DACS plant : 200 acres"
                }
                
var solarFarms = [
    {coords: [38.3192, -120.97456], hoverText: "100 Acres Solar"},
    {coords: [37.8369, -120.793611], hoverText: "50 Acres Solar"},
    {coords: [37.57725, -120.32086], hoverText: "50 Acres Soalr"},
    {coords: [37.65622, -121.43980], hoverText: "50 Acres Solar"},
    {coords: [37.9876, -120.93408], hoverText: "Hypothertical 50 Acres Solar Farm"},
    {coords: [37.8641, -121.64269], hoverText: "40 Acres Solar Developed by DACS Company"}
];

var map = L.map('map').setView(facilityData.coords, 8);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// custom icons
var LeafIcon = L.Icon.extend({
    options: {
        iconSize:     [64, 64], // size of the icon
        // shadowSize:   [50, 64], // size of the shadow
        iconAnchor:   [32, 58], // point of the icon which will correspond to marker's location
        // shadowAnchor: [4, 62],  // the same for the shadow
        popupAnchor:  [-3, -54] // point from which the popup should open relative to the iconAnchor
    }
});

var facilityIcon = new LeafIcon({iconUrl: '../assets/icons/facilityIcon.png'}),
    gasIcon = new LeafIcon({iconUrl: '../assets/icons/gasIcon.png'}),
    windIcon = new LeafIcon({iconUrl: '../assets/icons/windIcon.png'});

// Show markers
addMarkers(facilityData, facilityIcon);
addMarkers(gasData, gasIcon);

// need to make new solar marker
solarFarms.forEach(d => addMarkers(d, windIcon));

L.marker(injectionData.coords).addTo(map).bindPopup(injectionData.hoverText);

var pipeline = new L.Polyline([facilityData.coords, injectionData.coords], {
    color: 'blue',
    weight: 5,
    opacity: 0.75,
    smoothFactor: 1
})

var ccsPipeline = new L.Polyline([gasData.coords, injectionData.coords], {
    color: 'blue',
    weight: 5,
    opacity: 0.75,
    smoothFactor: 1
})

map.addLayer(pipeline.bindPopup('Pipeline from Facility to Injection Site'))
map.addLayer(ccsPipeline.bindPopup('Pipeline from Gas Plant to Injection Site'))

function addMarkers(data, custom_icon) {
    L.marker(data.coords, {icon: custom_icon})
        .addTo(map)
        .bindPopup(data.hoverText)
}

// aire quality data
const airQualityData = [
  { site: 'Little Manila, Stockton',    coords: [37.9607, -121.2990], aqi: 30 },
  { site: 'Brookside, Stockton',        coords: [37.9621, -121.2578], aqi: 42 },
  { site: 'Modesto (Shackelford)',      coords: [37.6608, -120.9906], aqi: 72 },  // Moderate
  { site: 'West Merced',                coords: [37.3070, -120.4760], aqi: 38 },
  { site: 'Manteca',                    coords: [37.7974, -121.2161], aqi: 48 },
  { site: 'Tracy',                      coords: [37.7397, -121.4252], aqi: 65 }   // Moderate
];

// 2. AirNow AQI → hex color
function getAQIColor(aqi) {
  if (aqi <= 50)  return '#00e400'; // Good
  if (aqi <= 100) return '#ffff00'; // Moderate
  if (aqi <= 150) return '#ff7e00'; // Unhealthy for Sensitive
  if (aqi <= 200) return '#ff0000'; // Unhealthy
  if (aqi <= 300) return '#8f3f97'; // Very Unhealthy
  return '#7e0023';                // Hazardous
}

// 3. Add bubbles to the map
airQualityData.forEach(({ site, coords, aqi }) => {
  L.circleMarker(coords, {
    radius: 10,
    fillColor: getAQIColor(aqi),
    color: '#000',       // outline
    weight: 1,
    fillOpacity: 0.8
  })
    .bindPopup(`<strong>${site}</strong><br>AQI: ${aqi}`)
    .addTo(map);
});


const legend = L.control({ position: 'bottomright' });
legend.onAdd = () => {
  const div = L.DomUtil.create('div', 'info legend');
  // inline container styles
  Object.assign(div.style, {
    background: 'white',
    padding: '6px 8px',
    boxShadow: '0 0 15px rgba(0,0,0,0.2)',
    borderRadius: '5px',
    lineHeight: '18px',
    color: '#555'
  });

  const grades = [0, 51, 101, 151, 201, 301];
  const labels = ['Good', 'Moderate', 'Unhealthy-SG', 'Unhealthy', 'Very Unhealthy', 'Hazardous'];

  grades.forEach((g, i) => {
    // inline box styles
    const colorBox = `<i style="
      background:${getAQIColor(g+1)};
      width:18px;
      height:18px;
      display:inline-block;
      margin-right:8px;
      opacity:0.7;
    "></i>`;
    div.innerHTML += `${colorBox} ${labels[i]} (${g}${i < grades.length - 1 ? '–' + (grades[i+1]-1) : '+'})<br>`;
  });
  return div;
};
legend.addTo(map);


// control charts

// This allows to find the closest X index of the mouse:
var bisectDate = d3.bisector(d => d.date).left;

const parseDate = d3.timeParse('%Y-%m-%d')

d3.json('data/simulated_sjv_data.json').then(function(data) {
        data.forEach(function(d) {
            d.date = parseDate(d.date)
        })

        // hard coded ids for control chart section
        let controlChartInfo = [{id: "#facilityBeforeAfter",
                            location: 'facility'},
                            {id: "#littleManilaBeforeAfter",
                            location: 'little manila'},
                            {id: "#TracyBeforeAfter",
                            location: 'tracy'},
                            {id: "#ModestoBeforeAfter",
                            location: 'modesto'}
                            ]
        
        const uniqueKeys = new Set(data.flatMap(d => Object.keys(d)))
        var yKeys = [...uniqueKeys].filter(d => !['date', 'phase', 'location'].includes(d))


        // create buttons for each key
        buttonDiv = d3.select('#controlChartButtons')
        buttonDiv.selectAll('button')
            .data(yKeys)
            .enter()
            .append('button')
            .text(d => d)
            .attr('value', d => d)
            .on('click', function(event, button) {
                console.log('button clicked', button)
                controlChartInfo.forEach(d => {
                    location_data = data.filter(item => item.location == d.location)

                    // Get control means and limits for each key during preconstruction
                    var preconstruction_data = location_data.filter(d => d.phase === "pre-construction")
                    var controlLimits = {}

                    yKeys.forEach(key => {
                        let keyMean = d3.mean(preconstruction_data, d => d[key]);
                        controlLimits[key] = {'mean': d3.mean(preconstruction_data, d => d[key]),
                                                'UCL': keyMean + 3 * d3.deviation(preconstruction_data, d => d[key]),
                                                }
                    });

                    console.log(d.location, 'limits', controlLimits)

                    buildControlChart(location_data, button, controlLimits, d.id)
                })
            })

        console.log(uniqueKeys)

        console.log(data)
        
        controlChartInfo.forEach(d => {
            location_data = data.filter(item => item.location == d.location)

            // Get control means and limits for each key during preconstruction
            var preconstruction_data = location_data.filter(d => d.phase === "pre-construction")
            var controlLimits = {}

            yKeys.forEach(key => {
                let keyMean = d3.mean(preconstruction_data, d => d[key]);
                controlLimits[key] = {'mean': d3.mean(preconstruction_data, d => d[key]),
                                        'UCL': keyMean + 3 * d3.deviation(preconstruction_data, d => d[key]),
                                        }
            });

            console.log(d.location, 'limits', controlLimits)

            buildControlChart(location_data, 'air quality index', controlLimits, d.id)
        })

    }).catch(function(error) {
        console.error('Error', error)
    })


// function to build control chart
function buildControlChart(data, y_variable, controlLimits, divId) {
    // clear any previous charts
    d3.select(divId).selectAll('svg').remove()

    // Chart size
    // set the dimensions and margins of the graph
    var margin = {top: 10, right: 30, bottom: 30, left: 50},
        width = 800 - margin.left - margin.right,
        height = 250 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    const controlSVG = d3.select(divId)
    .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
    .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // initialize X axis
    var x = d3.scaleTime().range([0, width]);
    var xAxis = d3.axisBottom().scale(x);

    controlSVG.append('g')
            .attr('transform', `translate(0,${height})`)
            .attr('class', 'myXaxis')

    // initialze y axis
    var y = d3.scaleLinear().range([height, 0]);
    var yAxis = d3.axisLeft().scale(y);

    controlSVG.append('g')
            .attr('class', 'myYaxis')

    // tooltip
    var tooltip = d3.select('#beforeAfter')
    .append('div')
        .attr('class', 'tooltip')
        // d3.selectAll('line').remove()
        // d3.selectAll('.ccAnnotation').remove()

        x.domain(d3.extent(data, d => d.date));
        controlSVG.selectAll('.myXaxis')
            .transition()
            .duration(3000)
            .call(xAxis);

        console.log(xAxis)

        console.log(d3.extent(data, d => d.date))

        y.domain(d3.extent(data, d => d[y_variable]));
        controlSVG.selectAll('.myYaxis')
            .transition()
            .duration(3000)
            .call(yAxis);

    // marking the phase of the project
    let preconstruction_data = data.filter(d => d.phase === "pre-construction");
    let construction_data = data.filter(d => d.phase === "facility construction")

    console.log(y_variable, preconstruction_data)

    controlSVG.append('line')
        .attr('x1', x(d3.max(preconstruction_data, d => d.date)))
        .attr('x2', x(d3.max(preconstruction_data, d => d.date)))
        .attr('y1', y(d3.min(data, d => d[y_variable])))
        .attr('y2', 0)
        .style("stroke", "black") // Set line color
        .style("stroke-width", 1); // Set line thickness

    controlSVG.append('line')
        .attr('x1', x(d3.max(construction_data, d => d.date)))
        .attr('x2', x(d3.max(construction_data, d => d.date)))
        .attr('y1', y(d3.min(data, d => d[y_variable])))
        .attr('y2', 0)
        .style("stroke", "black") // Set line color
        .style("stroke-width", 1); // Set line thickness

    // reference lines for control chart
    console.log('reference', y_variable, controlLimits[y_variable], controlLimits[y_variable]['mean'], y(controlLimits[y_variable]['mean']))
    var meanReference = controlSVG.append('line');
    meanReference
        .attr('x1', 0)
        .attr('x2', x(d3.max(data, d => d.date)))
        .attr('y1', y(controlLimits[y_variable]['mean']))
        .attr('y2', y(controlLimits[y_variable]['mean']))
        .style("stroke-dasharray", "5,5") // 5 pixels on, 5 pixels off
        .style("stroke", "black") // Set line color
        .style("stroke-width", 2); // Set line thickness

    // annotation for pre construction mean
    controlSVG.append('text')
        .attr('class', 'ccAnnotation')
        .attr('x', width - 150)
        .attr('y', y(controlLimits[y_variable]['mean']) + 20)
        .attr("dy", "0.35em") // Adjust vertical alignment of text
        .text(`Preconstruction Mean: ${Math.round(controlLimits[y_variable]['mean'] * 100) / 100}`) // The actual text content
        .attr("font-family", "sans-serif")
        .attr("font-size", "10px")
        .attr("fill", "black");

    // create update selection and bind new data
    var u = controlSVG.selectAll('.cclines')
        .data([data], d => d.date)

    u.join('path')
        .attr('class', 'cclines')
        .attr('d', d3.line()
            .x(d => x(d.date))
            .y(d => y(d[y_variable])))
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .attr('stroke-width', 2.5)
            .on("mouseover",  () => tooltip.style("opacity", 1))
            .on("mousemove", (event, dataArray) => {
                // definitely used AI for this part LOL
                // 1) find mouse position, invert to a date
                const [mx] = d3.pointer(event);
                const x0 = x.invert(mx);
                // 2) find insertion point in the sorted array
                const i  = bisectDate(dataArray, x0, 1);
                const d0 = dataArray[i - 1];
                const d1 = dataArray[i];
                // 3) pick the closer of the two
                const dClosest = (x0 - d0.date > d1.date - x0) ? d1 : d0;

                console.log('closest', dClosest)
                // 4) now display exactly the fields you want:
                tooltip
                .html(`
                    <strong>${d3.timeFormat("%b %Y")(dClosest.date)}</strong><br/>
                    Location: ${dClosest.location}<br/>
                    Project Phase: ${dClosest.phase}<br/>
                    ${y_variable}: ${dClosest[y_variable]}
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top",  (event.pageY - 20) + "px");
            })
            .on("mouseleave", () => tooltip.style("opacity", 0))
            .transition()
            .duration(3000);
}

// resource chart
d3.json('data/simulated_dac_stockton_operation.json').then(function(data) {
        data.forEach(function(d) {
            d.date = parseDate(d.date)
        })

        // get unique values in metric column
        uniqueMetrics = [...new Set(data.map(d => d.metric))]
        console.log('area', uniqueMetrics)
        // create buttons for each key
        buttonDiv = d3.select('#facilityChartButtons')
        buttonDiv.selectAll('button')
            .data(uniqueMetrics)
            .enter()
            .append('button')
            .text(d => d)
            .attr('value', d => d)
            .on('click', function(event, d) {
                console.log('button clicked', d)
                buildAreaChart(data, d)
            })
        // populate chart
        buildAreaChart(data, 'CO2')

    }).catch(function(error) {
        console.error('Error', error)
    })

function buildAreaChart(data, metric) {
    // clear previous chart
    d3.selectAll('#facilityChart > *').remove();

    // filter data for metric
    data_filtered = data.filter(d => d.metric == metric);

    // set dimensions
    const margin = {top: 20, right: 30, bottom: 60, left: 75},
        width = 800 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    const svg = d3.select("#facilityChart")
    .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
    .append("g")
        .attr("transform",
            `translate(${margin.left}, ${margin.top})`);


    const myGroups = [...new Set(data_filtered.map(d => d.sub_metric))]

    const stackedData = d3.stack()
            .keys(d3.union(data_filtered.map(d => d.sub_metric)))
            .value(([,group], key) => group.get(key).value)
            (d3.index(data_filtered, d => d.date, d => d.sub_metric))

    console.log('stacked data', stackedData)
    // initialize X axis
    var x = d3.scaleTime()
                .domain(d3.extent(data_filtered, d => d.date))
                .range([0, width]);
            svg.append("g")
                .attr("transform", `translate(0, ${height})`)
                .call(d3.axisBottom(x).ticks(5))

    // Add Y axis
    var y = d3.scaleLinear()
                .domain([0, d3.max(stackedData, d => d3.max(d, d => d[1]))])
                .range([ height, 0 ]);
            svg.append("g")
                .call(d3.axisLeft(y));

    // color
    switch (metric) {
        case 'energy':
            colorRange = ['#f6d575ff', '#4a4a4aff', '#e758e7ff']
            yLabel = 'Energy Use (MWhr)'
            break;
        case 'water':
            colorRange = ['#12086f', '#4cc9f0']
            yLabel = 'Water Use (m3)'
            break;
        case 'CO2':
            colorRange = ['#2A6A9E']
            yLabel = 'Tonnes CO2 Removed'
            break;
    }

    var color = d3.scaleOrdinal()
        .domain(myGroups)
        .range(colorRange);

    const area = d3.area()
        .x(d => x(d.data[0]))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]));

    // tooltip
    // var tooltip = d3.select('#facilityMonitoring')
    // .append('div')
    //     .attr('class', 'tooltip')

    svg.append('g')
        .selectAll()
        .data(stackedData)
        .join('path')
            .attr('fill', d => color(d.key))
            .attr('d', area)
            .style('fill-opacity', 0.9)
        .append('title')
            .text(d => d.key)

    // x label
    svg.append("text")
        .attr("class", "x label") // Optional: for styling with CSS
        .attr("text-anchor", "middle") // Centers the text horizontally
        .attr("x", width / 2) // Positions in the middle of the chart width
        .attr("y", height + margin.bottom) // Adjust 'y' based on your margins and desired position
        .text("Date");

    // y label
    svg.append("text")
        .attr("class", "y label") // Optional: for styling with CSS
        .attr("text-anchor", "middle") // Centers the text vertically after rotation
        .attr("transform", "rotate(-90)") // Rotates the text for vertical display
        .attr("y", -margin.left / 1.5) // Adjust 'y' based on your margins and desired position (after rotation)
        .attr("x", -height / 2) // Adjust 'x' based on your margins and desired position (after rotation)
        .text(yLabel);

    // legend
    // Create legend container
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(x, y)"); // Adjust position as needed

    // Create legend items
    const legendItems = legend.selectAll(".legend-item")
        .data(myGroups)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`); // Position items vertically

    // Add color swatches (e.g., rectangles)
    legendItems.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", d => color(d))
        .attr('stroke', 'black');

    // Add text labels
    legendItems.append("text")
        .attr("x", 15) // Offset from the rectangle
        .attr("y", 9) // Vertically align with the rectangle
        .text(d => d);
    
}