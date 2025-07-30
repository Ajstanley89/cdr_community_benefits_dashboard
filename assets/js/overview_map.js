// var map = L.map('map').setView([37.63946, -121.35232], 13);

// L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
// }).addTo(map);

var facilityPoint = [37.63946, -121.35232];
var faciliityMarker = L.marker(facilityPoint).bindPopup('Hypothetical DACS Facility');
var facilityGroup = L.layerGroup([faciliityMarker])

var ccsPoint = [37.79906, -121.60090];
var ccsMarker = L.circleMarker(ccsPoint, {
    radius: 8,
    fillColor: "#A9A9A9",
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
}).bindPopup("Hypothetical Natural Gas Power Plant that gets CCS added to it to provide C-free power to DAC facility. Storage of the captured CO2 would tie in the DAC storage");
var ccsGroup = L.layerGroup([ccsMarker]);

var windPoint = [37.82738, -121.67811];
var windMarker = L.circleMarker(windPoint, {
    radius: 8,
    fillColor: "#FF10F0",
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
}).bindPopup("Hypothetical wind farm for DACS plant : 200 acres");
var windGroup = L.layerGroup([windMarker]);

var solarFarms = [
    {coord: [38.3192, -120.97456], text: "100 Acres Solar"},
    {coord: [37.8369, -120.793611], text: "50 Acres Solar"},
    {coord: [37.57725, -120.32086], text: "50 Acres Soalr"},
    {coord: [37.65622, -121.43980], text: "50 Acres Solar"},
    {coord: [37.9876, -120.93408], text: "Hypothertical 50 Acres Solar Farm"},
    {coord: [37.8641, -121.64269], text: "40 Acres Solar Developed by DACS Company"}
];

var solarCircles = solarFarms.map(d => L.circleMarker(d.coord, {
    radius: 8,
    fillColor: "#ff7800",
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
}).bindPopup(d.text));

var solarMarkers = solarFarms.map(item => L.marker(item.coord).bindPopup(item.text))

var solarGroup = L.layerGroup(solarCircles)

var injectionPoint = [37.63599, -121.29550];
var injectionMarker = L.marker(injectionPoint).bindPopup('Hypothetical CO2 injection location')
var injectionGroup = L.layerGroup([injectionMarker]);

var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
});


var map = L.map('map', {
    center: facilityPoint,
    zoom: 8,
    layers: [osm, facilityGroup, solarGroup, windGroup, ccsGroup, injectionGroup]
});

var baseMaps = {
    "OpenStreetMap": osm,
};

var overlayMaps = {
    "Facility": facilityGroup,
    "Solar": solarGroup,
    "Wind": windGroup,
    "Gas with CCS": ccsGroup,
    "Injection Point": injectionGroup
};

var layerControl = L.control.layers(baseMaps, overlayMaps, {collapsed: false}).addTo(map);

// line from facility to injection site to simualte pipeline
var pipeline = L.polyline([facilityPoint, injectionPoint], {
        color: 'blue',
        weight: 5,
        opacity: 0.7
    }).bindPopup('Hypothertical Pipeline').addTo(map);