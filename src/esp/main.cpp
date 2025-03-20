#include <Arduino.h>
#include <WiFi.h>
//#include <HTTPClient.h>
//#include <ESPAsyncWebServer.h>
//#include <AsyncTCP.h>
#include "settings.h"
#include <ArduinoJson.h>
#include <ArduinoWebsockets.h>


//Serielle kommunikation
#define RX1 19
#define TX1 20
String messageFromMega = ""; 
String messageToMega  = ""; 

//Timer
unsigned long int lastMessageSent = 0;  //timer für nachrichten  DEBUG 
const int messageInterval = 4000; //intervall in ms	 DEBUG

unsigned long lastHeartbeat = 0;
const int heartbeatInterval = 5000; // 5 Sekunden

unsigned long lastPing = 0;

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

//Kommunkations zwischen Mega und ESP
void sendToMega(String message) {
  Serial2.println(message);
  Serial.print("ESP sendet an Mega: ");                     //debug
  Serial.println(message);                                  //debug
}

String getFromMega() {
  if (Serial2.available()) {
    String message = Serial2.readStringUntil('\n');
    return message;
  }
  return "";
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

void sendToServer() {
  String jsonString;
  serializeJson(robotData, jsonString);
  String socketMessage = "42[\"message\",";
  socketMessage += jsonString;
  socketMessage += "]";
  client.send(socketMessage);
}

void onMessageCallback(WebsocketsMessage message) {
  String data = message.data();
  Serial.print("Got Message: ");
  Serial.println(data);
  
  // Handle Socket.IO ping (code 2)
  if (data == "2") {
    client.send("3");  // Send pong (code 3)
  }
  // Handle Socket.IO messages (code 42)
  else if (data.startsWith("42")) {
    Serial.println("Received Socket.IO message: " + data);
    // Check for command messages
    if (data.indexOf("command") > 0 && data.indexOf("toggleLight") > 0) {
      toggleLight();
      sendToServer();  // Update the server with new state
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
  Serial.println("neues events:");
  Serial.print("Data: ");
  Serial.println(data);

  if(event == WebsocketsEvent::ConnectionOpened) {
      Serial.println("Connnection Opened");
      needsReconnection = false;
  } else if(event == WebsocketsEvent::ConnectionClosed) {
      Serial.println("Connnection Closed");
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
    sendToServer();
  }

  messageFromMega = getFromMega();
  if (messageFromMega != "") {
    Serial.println("Nachricht von Mega empfangen: " + messageFromMega);
  }

}




