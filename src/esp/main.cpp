#include <Arduino.h>
#include <WiFi.h>
#include "settings.h"
#include <ArduinoJson.h>
#include <ArduinoWebsockets.h>


//Serielle kommunikation
#define RX1 19
#define TX1 20
String messageFromMega = ""; 
String messageToMega  = ""; 

unsigned long lastHeartbeat = 0;
const int heartbeatInterval = 5000;

bool needsReconnection = false;
unsigned long lastReconnectionAttempt = 0;
const int reconnectionInterval = 5000;

// WLAN-Zugangsdaten
const char* ssid = WIFI_SSID;   
const char* password = WIFI_PASSWORD; 

//Server - Websockets
const char* serverURL = SERVER_URL; //Flask Server
const char* websockets_server_host = "217.76.56.254";
const int websockets_server_port = 3000;
const char* socketio_path = "/socket.io/?EIO=4&transport=websocket";
using namespace websockets;


WebsocketsClient client;

//Roboterdaten initialisieren / Objet erstellen
JsonDocument robotData;
void setupRobotData(){
  pinMode(LED_BUILTIN, OUTPUT);    //test licht
  digitalWrite(LED_BUILTIN, LOW);  //

  robotData["light"] =  false;
  robotData["battery"] =  34;
}

//Kommunkation zwischen Mega und ESP
void sendToMega(String message) {
  Serial2.println(message);
  Serial.print("ESP sendet an Mega: ");                     //debug
  Serial.println(message);                                  //debug
}


//WLAN-Verbindung herstellen
bool connectToWlan() {
  WiFi.begin(ssid, password);

  Serial.println("Verbinde mit WLAN...");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWLAN verbunden!");
    Serial.print("IP-Adresse: ");
    Serial.println(WiFi.localIP());
    return true;
  }
  return false;
}

bool toggleLight() {
  if (robotData["light"] == false) {
    digitalWrite(LED_BUILTIN, HIGH);
    robotData["light"] = true;
    return true;
  } else {
    digitalWrite(LED_BUILTIN, LOW);
    robotData["light"] = false;
  }
  return false;
}

void sendRobotData() {
  String jsonString;
  serializeJson(robotData, jsonString);
  String socketMessage = "42[\"message\",";
  socketMessage += jsonString;
  socketMessage += "]";
  client.send(socketMessage);
}

void onMessageCallback(WebsocketsMessage message) {

  String data = message.data();
  
  // Handle Socket.IO ping (code 2)
  if (data == "2") {
    client.send("3");  // Send pong (code 3)
    return;
  }
  // Handle Socket.IO messages (code 42)
  else  if (data.startsWith("42")) {
    Serial.println("Received Socket.IO message: " + data);
    
    // Extract event name and payload
    int firstBracket = data.indexOf('[');
    int firstComma = data.indexOf(',', firstBracket);
    
    if (firstBracket != -1 && firstComma != -1) {
      // Extract the event name
      String eventName = data.substring(firstBracket + 2, firstComma - 1);
      
      // Handle specific events directly
      if (eventName == "toggleLight") {
        Serial.println("Received toggleLight event");
        toggleLight();
        sendRobotData();  // Update the server with new state
      }
      else if (eventName == "motorcommand") {
        String payload = data.substring(firstComma + 1, data.lastIndexOf(']'));
        payload.replace("\"", "");
        sendToMega("motorcommand:" + payload);
      }

      else if (eventName == "command") {
        // Extract the payload
        String payload = data.substring(firstComma + 1, data.lastIndexOf(']'));
        // Remove quotes if present
        payload.replace("\"", "");

      }
    }
  }
}

bool connectToServer() {
  // Connect to server
  bool connected = client.connect(websockets_server_host, websockets_server_port, socketio_path);
  if(connected) {
      // Send Socket.IO handshake
      client.send("40");  // Socket.IO v4 connect packet
      // Identify as ESP
      client.send("42[\"connect_esp\",{}]");
      return true;
  } else {
    Serial.println("Not Connected!");
    return false;
  }
}


void onEventsCallback(WebsocketsEvent event, String data) {
  if(event == WebsocketsEvent::ConnectionOpened) {
      Serial.println("Connnection Opened");
      needsReconnection = false;
  } else if(event == WebsocketsEvent::ConnectionClosed) {
      Serial.println("Connnection Closed");
      sendToMega("motorcommand:0,0,0,0");
      needsReconnection = true;
  } else if(event == WebsocketsEvent::GotPing) {
      Serial.println("Got a Ping!");
  } else if(event == WebsocketsEvent::GotPong) {
      Serial.println("Got a Pong!");
  }
}

void setupWebsockets() {

  // run callback when messages are received
  client.onMessage(onMessageCallback);
  
  // run callback when events are occuring
  client.onEvent(onEventsCallback);

  // Connect to server
  connectToServer();

  // Send a ping
  client.ping();
};

void setup() {
  Serial.begin(115200);   //Verbindung zum Computer
  Serial2.begin(9600);    //Verbindungs zum Mega
  setupRobotData();
  connectToWlan();  
  setupWebsockets();
  sendToMega("motorcommand:0,0,0,0");
}

void receiveMegaMessage() {
  if (Serial2.available()) {
    String messageFromMega = Serial2.readStringUntil('\n');
  }
  if (messageFromMega != "") {
    Serial.println("Nachricht von Mega empfangen: " + messageFromMega);
  }
}

void loop() {
  client.poll();

  if (needsReconnection) {
    unsigned long currentTime = millis();
    if (currentTime - lastReconnectionAttempt >= reconnectionInterval) {
      lastReconnectionAttempt = currentTime;
      
      Serial.println("Attempting to reconnect...");
      if (connectToServer()) {
        Serial.println("Reconnected successfully!");
        needsReconnection = false;
      } else {
        Serial.println("Reconnection failed, will try again later");
      }
    }
  }

  if (millis() - lastHeartbeat >= heartbeatInterval) {
    lastHeartbeat = millis();
    sendRobotData();
  }
  receiveMegaMessage();
}




