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