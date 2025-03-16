const express = require("express");
const fs = require("fs");
const axios = require("axios");
const app = express();

app.use(express.urlencoded({ extended: true })); // Para processar dados do formulário

let gpsData = { lat: 0, lon: 0, name: "Desconhecido" }; // Última localização com nome
let routeHistory = []; // Histórico da rota
let destination = null; // Destino definido pelo usuário
let routeToDestination = []; // Rota calculada pela API

const ORS_API_KEY = "API_KEY"; 

function loadRouteHistory() {
  try {
    if (fs.existsSync("routeHistory.json")) {
      const data = fs.readFileSync("routeHistory.json", "utf8");
      routeHistory = JSON.parse(data);
      console.log("Histórico de rotas carregado do arquivo.");
    }
  } catch (error) {
    console.error("Erro ao carregar o histórico de rotas:", error);
  }
}

function saveRouteHistory() {
  try {
    fs.writeFileSync("routeHistory.json", JSON.stringify(routeHistory, null, 2), "utf8");
    console.log("Histórico de rotas salvo no arquivo.");
  } catch (error) {
    console.error("Erro ao salvar o histórico de rotas:", error);
  }
}

loadRouteHistory();

app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Localização da Ambulância</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          h1, h2 {
            color: #2E8B57;
            margin-bottom: 10px;
          }
          p {
            color: #4682B4;
            margin: 5px 0;
          }
          a {
            color: #2E8B57;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          form {
            margin-top: 20px;
          }
          label {
            display: block;
            margin-bottom: 10px;
            color: #333;
          }
          input[type="text"] {
            padding: 8px;
            width: 100%;
            max-width: 300px;
            border: 1px solid #ccc;
            border-radius: 5px;
          }
          button {
            padding: 10px 20px;
            background-color: #2E8B57;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
          }
          button:hover {
            background-color: #256d44;
          }
          #map {
            width: 100%;
            height: 500px;
            margin-top: 20px;
            border-radius: 10px;
          }
        </style>
        <script>
          var map, marker, polylineHistory, polylineRoute;

          function initMap() {
            map = L.map('map').setView([${gpsData.lat}, ${gpsData.lon}], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
            updateMap(); // Chama a atualização inicial
          }

          function updateMap() {
            fetch('/data')
              .then(response => response.json())
              .then(data => {
                // Atualiza o nome do local e coordenadas na interface
                document.getElementById('locationName').textContent = data.gpsData.name;
                document.getElementById('lat').textContent = data.gpsData.lat;
                document.getElementById('lon').textContent = data.gpsData.lon;

                // Atualiza o marcador da localização atual
                if (marker) marker.remove();
                marker = L.marker([data.gpsData.lat, data.gpsData.lon]).addTo(map)
                  .bindPopup("<b>Localização Atual: " + data.gpsData.name + "</b>").openPopup();
                map.setView([data.gpsData.lat, data.gpsData.lon], 15);

                // Atualiza o histórico da rota
                if (data.routeHistory.length > 1) {
                  if (polylineHistory) polylineHistory.remove();
                  polylineHistory = L.polyline(data.routeHistory, { color: 'red' }).addTo(map);
                }

                // Atualiza a rota para o destino
                if (data.routeToDestination.length > 0) {
                  if (polylineRoute) polylineRoute.remove();
                  polylineRoute = L.polyline(data.routeToDestination, { color: 'blue' }).addTo(map);
                }

                // Atualiza o marcador do destino
                if (data.destination) {
                  if (!L.DomUtil.get('dest-marker')) {
                    L.marker([data.destination.lat, data.destination.lon], { id: 'dest-marker' })
                      .addTo(map)
                      .bindPopup("<b>Destino</b>").openPopup();
                  }
                }
              })
              .catch(error => console.error('Erro ao atualizar mapa:', error));
          }

          window.onload = function() {
            initMap();
            setInterval(updateMap, 5000); // Atualiza a cada 5 segundos
          };
        </script>
      </head>
      <body>
        <div class="container">
          <h1>Localização Atual</h1>
          <p><strong>Local:</strong> <span id="locationName">${gpsData.name}</span></p>
          <p><strong>Coordenadas:</strong> Lat: <span id="lat">${gpsData.lat}</span>, Lon: <span id="lon">${gpsData.lon}</span></p>
          <a href="https://www.openstreetmap.org/?mlat=${gpsData.lat}&mlon=${gpsData.lon}#map=15/${gpsData.lat}/${gpsData.lon}" target="_blank">Abrir no OpenStreetMap</a>
          <h2>Definir Destino</h2>
          <form action="/set-destination" method="POST">
            <label>Local de Destino: <input type="text" name="destinationName" placeholder="Ex.: Avenida Paulista, São Paulo" required></label>
            <button type="submit">Traçar Rota</button>
          </form>
          <div id="map"></div>
        </div>
      </body>
    </html>
  `);
});

app.get("/data", (req, res) => {
  res.json({
    gpsData,
    routeHistory,
    destination,
    routeToDestination
  });
});

app.get("/update", async (req, res) => {
  if (req.query.lat && req.query.lon) {
    let lat = parseFloat(req.query.lat);
    let lon = parseFloat(req.query.lon);

    try {
      // Geocodificação reversa com Nominatim para obter o nome do local
      const geoResponse = await axios.get(
        "https://nominatim.openstreetmap.org/reverse",
        {
          params: {
            lat: lat,
            lon: lon,
            format: "json"
          },
          headers: {
            "User-Agent": "AmbulanceTracker/1.0 (seu-email@example.com)" // Substitua pelo seu e-mail
          }
        }
      );

      const name = geoResponse.data.display_name || "Desconhecido";
      gpsData = { lat, lon, name };
      console.log(Nova localização: ${lat}, ${lon} - ${name});
    } catch (error) {
      console.error("Erro na geocodificação reversa:", error.message);
      gpsData = { lat, lon, name: "Desconhecido" }; // Fallback
    }

    routeHistory.push([lat, lon]);
    if (routeHistory.length > 100) routeHistory.shift();
    saveRouteHistory();

    res.send("Localização atualizada e armazenada na rota!");
  } else {
    res.send("Erro: Passe os parâmetros lat e lon.");
  }
});

app.post("/set-destination", async (req, res) => {
  const destinationName = req.body.destinationName;

  if (!destinationName || typeof destinationName !== "string" || destinationName.trim() === "") {
    return res.send("Erro: Forneça um nome de local válido.");
  }

  try {
    // Passo 1: Geocodificação com Nominatim para o destino
    console.log("Buscando coordenadas para:", destinationName);
    const geoResponse = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q: destinationName,
          format: "json",
          limit: 1
        },
        headers: {
          "User-Agent": "AmbulanceTracker/1.0 (seu-email@example.com)" // Substitua pelo seu e-mail
        }
      }
    );

    if (!geoResponse.data || geoResponse.data.length === 0) {
      throw new Error("Nenhum resultado encontrado para o local especificado.");
    }

    const destLat = parseFloat(geoResponse.data[0].lat);
    const destLon = parseFloat(geoResponse.data[0].lon);
    destination = { lat: destLat, lon: destLon };
    console.log(Coordenadas encontradas: lat=${destLat}, lon=${destLon});

    // Passo 2: Calcular a rota com ORS
    console.log(Calculando rota de [${gpsData.lon}, ${gpsData.lat}] para [${destLon}, ${destLat}]);
    const routeResponse = await axios.post(
      "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
      {
        coordinates: [
          [gpsData.lon, gpsData.lat], // Origem: [lon, lat]
          [destLon, destLat]          // Destino: [lon, lat]
        ]
      },
      {
        headers: {
          "Authorization": ORS_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    routeToDestination = routeResponse.data.features[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
    console.log("Rota calculada com sucesso:", routeToDestination.length, "pontos");
    res.redirect("/");
  } catch (error) {
    const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error("Erro ao processar o destino:", errorMsg);
    res.send("Erro ao processar o destino: " + errorMsg);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(Servidor rodando na porta ${PORT}));
