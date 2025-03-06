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

bool lightStatus = false;

// WLAN-Zugangsdaten
const char* ssid = WIFI_SSID;   //Hier die SSID(Netzwerkname) vom Router eintragen
const char* password = WIFI_PASSWORD; //Hier dein WLAN Passwort eintragen

//SEerver
const String serverURL = SERVER_URL;
const String registerURL = SERVER_URL + "/register";
AsyncWebServer server(80);


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

//Beim Webserver registrieren
void registerWithServer() {
  if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(registerURL);
      int httpResponseCode = http.POST("");
      if (httpResponseCode > 0) {
          Serial.println("IP-Adresse erfolgreich registriert");
          String response = http.getString();
          Serial.println(response);
      } else {
          Serial.println("Fehler beim Senden der IP-Adresse");
      }
      http.end();
  } else {
      Serial.println("WiFi nicht verbunden");
  }
}

void startServer() {
  server.on("/status", WebRequestMethod::HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(200, "application/json", "{\"status\": \"online\"}");
  });

  // Befehls-Endpunkt
  server.on("/command", WebRequestMethod::HTTP_POST, [](AsyncWebServerRequest *request){
    if (request->hasParam("command", true)) {
      String command = request->getParam("command", true)->value();
      Serial.println("Empfangener Befehl: " + command);

      if (command == "light_on") {
          digitalWrite(LED_BUILTIN, HIGH);
          lightStatus = true;
          request->send(200, "application/json", "{\"message\": \"Licht an\"}");
      } else if (command == "light_off") {
          digitalWrite(LED_BUILTIN, LOW);
          lightStatus = false;
          request->send(200, "application/json", "{\"message\": \"Licht aus\"}");
      } else {
          // Befehl an den Arduino Mega senden
          sendMessage(command);
          delay(100);  // Kurze Pause, damit der Mega antworten kann
          String response = receiveMessage();
          
          // Antwort an den Webserver senden
          if (response.length() > 0) {
              request->send(200, "application/json", "{\"message\": \"" + response + "\"}");
          } else {
              request->send(500, "application/json", "{\"message\": \"Keine Antwort vom Mega\"}");
          }
      }
    } else {
        request->send(400, "application/json", "{\"message\": \"Kein Befehl erhalten\"}");
    }
  });

  server.begin();
}

void setup() {
  Serial.begin(115200);   //Verbindung zum Computer
  Serial2.begin(9600);    //Verbindungs zum Mega
  
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);  // Licht aus

  connectToWiFi();
  registerWithServer();

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
  -TESTSendungen ende- */

  messageFromMega = receiveMessage();
}




