#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include "secrets.h"  //optional

//Serial Pins
#define RX1 19
#define TX1 20

unsigned long int lastMessageSent = 0;  //timer für nachrichten  DEBUG 
int messageInterval = 4000;             //intervall in ms	 DEBUG

/*Variablen*/
String messageFromMega = ""; 
String messageToMega  = ""; 


// WLAN-Zugangsdaten
const char* ssid = WIFI_SSID;   //Hier die SSID(Netzwerkname) vom Router eintragen
const char* password = WIFI_PASSWORD; //Hier dein WLAN Passwort eintragen

// Webserver-Adresse und Port
const char* serverURL = "http://<SERVER_IP>:5000/data";


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


void setup() {
  Serial.begin(115200);   //Verbindung zum Computer
  Serial2.begin(9600);    //Verbindungs zum Mega
  connectToWiFi();
}

void loop() {
  /*-TESTSendungen start-*/
  if(millis() - lastMessageSent > messageInterval){
    lastMessageSent = millis(); 
    unsigned long int elapsedTime = lastMessageSent/1000;
    messageToMega  = "Hi ESP32, I started " + String(elapsedTime) + " seconds ago";
    sendMessage(messageToMega);  
  }
  /*-TESTSendungen ende- */
  messageFromMega = receiveMessage();
}




