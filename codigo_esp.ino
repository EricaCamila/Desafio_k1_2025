#include <WiFi.h>
#include <HTTPClient.h>
#include <TinyGPS++.h>

// Configuração do Wi-Fi
const char* ssid = "rede";
const char* password = "senha";
const char* server1 = "url1"; // Primeiro servidor
const char* server2 = "url2"; // Segundo servidor

// Configuração do GPS
#define RXD2 16
#define TXD2 17
#define GPS_BAUD 9600
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

void setup() {
    Serial.begin(115200);
    gpsSerial.begin(GPS_BAUD, SERIAL_8N1, RXD2, TXD2);
    Serial.println("Serial 2 do GPS iniciada");

    WiFi.begin(ssid, password);
    Serial.print("Conectando ao Wi-Fi");

    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi Conectado!");
}

void loop() {
    unsigned long start = millis();
    bool newData = false;

    while (millis() - start < 1000) {
        while (gpsSerial.available() > 0) {
            if (gps.encode(gpsSerial.read())) {
                newData = true;
            }
        }
    }

    if (newData && gps.location.isValid()) {
        float lat = gps.location.lat();
        float lon = gps.location.lng();

        Serial.print("Latitude: "); Serial.println(lat, 6);
        Serial.print("Longitude: "); Serial.println(lon, 6);

        if (WiFi.status() == WL_CONNECTED) {
            // Envia para o primeiro servidor
            sendDataToServer(server1, lat, lon);

            // Envia para o segundo servidor
            sendDataToServer(server2, lat, lon);
        } else {
            Serial.println("Wi-Fi desconectado, tentando reconectar...");
            WiFi.begin(ssid, password);
        }
    } else {
        Serial.println("Aguardando coordenadas válidas do GPS...");
    }

    delay(5000);
}

void sendDataToServer(const char* server, float lat, float lon) {
    HTTPClient http;
    String url = String(server) + "/update?lat=" + String(lat, 6) + "&lon=" + String(lon, 6);

    http.begin(url);
    int httpCode = http.GET();
    http.end();

    if (httpCode > 0) {
        Serial.print("Localização enviada com sucesso para "); Serial.println(server);
    } else {
        Serial.print("Falha ao enviar a localização para "); Serial.println(server);
    }
}
