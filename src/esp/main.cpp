#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>
#include "settings.h"  //optional

//Serial Pins
#define RX1 19
#define TX1 20
//Serielle kommunikation
String messageFromMega = ""; 
String messageToMega  = ""; 

//Timer
unsigned long int lastMessageSent = 0;  //timer für nachrichten  DEBUG 
int messageInterval = 4000;             //intervall in ms	 DEBUG

unsigned long lastHeartbeat = 0;
const unsigned long heartbeatInterval = 5000; // 5 Sekunden

bool lightOn = false;

// WLAN-Zugangsdaten
const char* ssid = WIFI_SSID;   //Hier die SSID(Netzwerkname) vom Router eintragen
const char* password = WIFI_PASSWORD; //Hier dein WLAN Passwort eintragen

//SEerver
const char* serverURL = SERVER_URL;
const String heartbeatURL = String(SERVER_URL) + "/heartbeat";
AsyncWebServer server(8080);

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
    // Wir senden nur einen leeren Body
    int httpCode = http.POST("");
    if (httpCode > 0) {
      Serial.printf("Heartbeat an Server, Code: %d\n", httpCode);
      String payload = http.getString();
      Serial.println(payload);
    } else {
      Serial.printf("Fehler beim Heartbeat: %d\n", httpCode);
    }
    http.end();
  }
}

void startServer() {
  server.begin();
}

void setup() {
  Serial.begin(115200);   //Verbindung zum Computer
  Serial2.begin(9600);    //Verbindungs zum Mega
  
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);  // Licht aus

  connectToWiFi();
  //registerWithServer();

  startServer();
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




