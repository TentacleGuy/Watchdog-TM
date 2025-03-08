#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>
#include "settings.h"  

//Serial Pins
#define RX1 19
#define TX1 20
//Serielle kommunikation
String messageFromMega = ""; 
String messageToMega  = ""; 

//Timer
unsigned long int lastMessageSent = 0;  //timer für nachrichten  DEBUG 
const int messageInterval = 4000;             //intervall in ms	 DEBUG

unsigned long lastHeartbeat = 0;
const int heartbeatInterval = 5000; // 5 Sekunden

//Status-variablen
bool lightOn = false;
int batteryLevel = 34;


// WLAN-Zugangsdaten
const char* ssid = WIFI_SSID;   
const char* password = WIFI_PASSWORD; 

//Server
const char* serverURL = SERVER_URL; //Flask Server
const String heartbeatURL = String(SERVER_URL) + "/heartbeat";  //Flask heartbeat endpoint 
String robotDataJson = 
                String("{\"light_on\":") + (lightOn ? "true" : "false") 
              + String(", \"battery\":") + batteryLevel 
              + String("}");  //JSON-String der Daten für übermittlung an flask vorbereiten

AsyncWebServer server(8080);  //Server auf ESP für das Empfangen von Befehlen

void sendMessage(String message) {
  Serial2.println(message);
  Serial.print("ESP sendet an Mega: ");                     //debug
  Serial.println(message);                                  //debug
}

String receiveMessage() {
  if (Serial2.available()) {
    String message = Serial2.readStringUntil('\n');
    Serial.print("Esp empfängt von Mega: ");                //debug
    Serial.println(message);                                //debug
    return message;
  }
  return "";
}

//WLAN-Verbindung herstellen
bool connectToWiFi() {
  WiFi.begin(ssid, password);
  Serial.println("Verbinde mit WLAN...");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.println("\nWLAN verbunden!");
    Serial.print("IP-Adresse: ");
    Serial.println(WiFi.localIP());
    return true;
  }
  return false;
}

void sendHeartbeat() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(heartbeatURL);
    http.addHeader("Content-Type", "application/json");
    int httpCode = http.POST(robotDataJson); //robotData mit Heartbeat senden
    if (httpCode > 0) {
      /*DEBUG
      Serial.println("Heartbeat an Server, Code: " + httpCode);
      String response = http.getString();
      Serial.println("Serverantwort: " + response); 
      */
    } else {
      Serial.println("Fehler beim Heartbeat: " + httpCode);
    }
    http.end();
  }
}

void startServer() {
  server.begin();
}

void endpoints(){
  server.on("/command", HTTP_POST, [](AsyncWebServerRequest* request){
    Serial.println("Empf. Befehl: " + request->getParam("command", true)->value());
    if (request->hasParam("command", true)) {
      String cmd = request->getParam("command", true)->value();
      Serial.println("Empf. Befehl: " + cmd);

      if(cmd == "light_on"){
        digitalWrite(LED_BUILTIN, HIGH);
        lightOn = true;
        request->send(200, "application/json", "{\"message\":\"Licht an\"}");
      }
      else if(cmd == "light_off"){
        digitalWrite(LED_BUILTIN, LOW);
        lightOn = false;
        request->send(200, "application/json", "{\"message\":\"Licht aus\"}");
      }
      else {
        request->send(400, "application/json", "{\"message\":\"Unbekannter Befehl\"}");
      }
    } else {
      request->send(400, "application/json", "{\"message\":\"Kein command\"}");
    }
  });

  server.begin();
}

void setup() {
  Serial.begin(115200);   //Verbindung zum Computer
  Serial2.begin(9600);    //Verbindungs zum Mega
  
  pinMode(LED_BUILTIN, OUTPUT);    //test lich
  digitalWrite(LED_BUILTIN, LOW);  //

  connectToWiFi();

  startServer();

  endpoints();
}

void loop() {
  /*-TESTSendungen start-
  if(millis() - lastMessageSent > messageInterval){
    lastMessageSent = millis(); 
    unsigned long int elapsedTime = lastMessageSent/1000;
    messageToMega  = "Hi ESP32, I started " + String(elapsedTime) + " seconds ago";
    sendMessage(messageToMega);  
  }
  //-TESTSendungen ende-*/
  if (millis() - lastHeartbeat >= heartbeatInterval) {
    lastHeartbeat = millis();
    sendHeartbeat();
  }
  messageFromMega = receiveMessage();
}




