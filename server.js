const express = require("express");
const axios = require("axios");
const app = express();

let gpsData = { lat: 0, lon: 0 }; // Última localização
let routeHistory = []; // Histórico da rota
let destination = null; // Destino definido pelo usuário
let routePath = []; // Caminho calculado da rota

app.use(express.static("public"));
app.use(express.json());

app.get("/", (req, res) => {
  res.send(`
        <html>
            <head>
                <title>Localização da Ambulância</title>
                <meta http-equiv="refresh" content="5">
                <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
                <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
                <style>
                    body { font-family: Arial, sans-serif; display: flex; justify-content: space-between; padding: 20px; }
                    .info-container { width: 25%; padding: 20px; }
                    .map-container { width: 75%; height: 100vh; }
                    #map { width: 100%; height: 500px; }
                    .form-container { margin-top: 20px; }
                </style>
                <script>
                    var map;
                    var marker;
                    var polyline;
                    var destinationMarker;
                    var routePolyline;

                    function initMap() {
                        var location = { lat: ${gpsData.lat}, lng: ${gpsData.lon} };
                        var routeHistory = ${JSON.stringify(routeHistory)};
                        var destination = ${destination ? JSON.stringify(destination) : null};
                        var routePath = ${JSON.stringify(routePath)};

                        map = L.map('map').setView(location, 15);

                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        }).addTo(map);

                        if (marker) marker.remove();
                        marker = L.marker(location).addTo(map).bindPopup("<b>Localização Atual da Ambulância</b>").openPopup();

                        if (routeHistory.length > 1) {
                            polyline = L.polyline(routeHistory, { color: 'red' }).addTo(map);
                        }

                        if (destination) {
                            if (destinationMarker) destinationMarker.remove();
                            destinationMarker = L.marker(destination).addTo(map).bindPopup("<b>Destino</b>").openPopup();
                        }

                        if (routePath.length > 1) {
                            if (routePolyline) routePolyline.remove();
                            routePolyline = L.polyline(routePath, { color: 'blue', weight: 4 }).addTo(map);
                        }
                    }

                    window.onload = initMap;
                </script>
            </head>
            <body>
                <div class="info-container">
                    <h1>Localização Atual</h1>
                    <p>Latitude: ${gpsData.lat}</p>
                    <p>Longitude: ${gpsData.lon}</p>
                    <a href="https://www.openstreetmap.org/?mlat=${gpsData.lat}&mlon=${gpsData.lon}#map=15/${gpsData.lat}/${gpsData.lon}" target="_blank">Abrir no OpenStreetMap</a>
                    <div class="form-container">
                        <h2>Definir Destino</h2>
                        <form action="/destino" method="POST">
                            <label>Endereço: <input type="text" name="endereco" required></label>
                            <button type="submit">Definir</button>
                        </form>
                    </div>
                </div>
                <div class="map-container">
                    <div id="map"></div>
                </div>
            </body>
        </html>
    `);
});

app.get("/update", (req, res) => {
  if (req.query.lat && req.query.lon) {
    let lat = parseFloat(req.query.lat);
    let lon = parseFloat(req.query.lon);
    
    gpsData = { lat, lon };
    routeHistory.push([lat, lon]);

    console.log(`Nova localização: ${lat}, ${lon}`);
    res.send("Localização atualizada e armazenada na rota!");
  } else {
    res.send("Erro: Passe os parâmetros lat e lon.");
  }
});

app.post("/destino", express.urlencoded({ extended: true }), async (req, res) => {
  if (req.body.endereco) {
    try {
      const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
        params: {
          q: req.body.endereco,
          format: "json",
          limit: 1
        }
      });

      if (response.data.length > 0) {
        destination = { lat: parseFloat(response.data[0].lat), lon: parseFloat(response.data[0].lon) };
        console.log(`Destino definido: ${destination.lat}, ${destination.lon}`);
        
        const routeResponse = await axios.get("https://api.openrouteservice.org/v2/directions/driving-car", {
          params: {
            api_key: "API_KEY",
            start: `${gpsData.lon},${gpsData.lat}`,
            end: `${destination.lon},${destination.lat}`
          }
        });

        if (routeResponse.data.features) {
          routePath = routeResponse.data.features[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
        }
        
        res.redirect("/");
      } else {
        res.send("Erro: Endereço não encontrado.");
      }
    } catch (error) {
      res.send("Erro ao buscar o endereço ou calcular a rota.");
    }
  } else {
    res.send("Erro: Informe um endereço válido.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
