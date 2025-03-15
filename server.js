const express = require("express");
const app = express();

let gpsData = { lat: 0, lon: 0 }; // Última localização
let routeHistory = []; // Histórico da rota

app.get("/", (req, res) => {
  res.send(`
        <html>
            <head>
                <title>Localização da Ambulância</title>
                <meta http-equiv="refresh" content="5">
                <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
                <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
                <script>
                    var map;
                    var marker;
                    var polyline;

                    function initMap() {
                        var location = { lat: ${gpsData.lat}, lng: ${gpsData.lon} };
                        var routeHistory = ${JSON.stringify(routeHistory)}; // Histórico da rota

                        // Inicializa o mapa
                        map = L.map('map').setView(location, 15);

                        // Usa o OpenStreetMap como camada base
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        }).addTo(map);

                        // Se o marcador já existir, remova-o
                        if (marker) {
                            marker.remove();
                        }

                        // Adiciona um marcador no mapa
                        marker = L.marker(location).addTo(map)
                            .bindPopup("<b>Localização Atual da Ambulância</b>")
                            .openPopup();

                        // Desenha a rota se houver histórico
                        if (routeHistory.length > 1) {
                            polyline = L.polyline(routeHistory, { color: 'red' }).addTo(map);
                        }
                    }

                    // Chama a função de inicialização do mapa assim que a página carregar
                    window.onload = initMap;
                </script>
            </head>
            <body>
                <h1>Localização Atual</h1>
                <p>Latitude: ${gpsData.lat}</p>
                <p>Longitude: ${gpsData.lon}</p>
                <a href="https://www.openstreetmap.org/?mlat=${gpsData.lat}&mlon=${gpsData.lon}#map=15/${gpsData.lat}/${gpsData.lon}" target="_blank">Abrir no OpenStreetMap</a>
                <div id="map" style="width: 100%; height: 500px;"></div>
            </body>
        </html>
    `);
});

app.get("/update", (req, res) => {
  if (req.query.lat && req.query.lon) {
    let lat = parseFloat(req.query.lat);
    let lon = parseFloat(req.query.lon);
    
    gpsData = { lat, lon }; // Atualiza a posição atual
    routeHistory.push([lat, lon]); // Armazena no histórico da rota

    console.log(`Nova localização: ${lat}, ${lon}`);
    res.send("Localização atualizada e armazenada na rota!");
  } else {
    res.send("Erro: Passe os parâmetros lat e lon.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
