#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include "secrets.h"

//aa
//Serial Pins
#define RX1 15
#define TX1 16

unsigned long int lastMessageSent = 0;  //timer für nachrichten  DEBUG 
int messageinterval = 4000;             //intervall in ms	 DEBUG

/*Variablen*/
String messageFromMega = ""; 
String messageToMega  = ""; 


// WLAN-Zugangsdaten
const char* ssid = "DEINE_SSID";
const char* password = "DEIN_PASSWORT";

// Webserver-Adresse und Port
const char* serverURL = "http://<SERVER_IP>:5000/data";

void setup() {
  Serial.begin(115200);   //Verbindung zum Computer
  Serial1.begin(9600);    //Verbindungs zum Mega
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

void sendMessage(String message) {
  Serial1.println(message);
  Serial.print("ESP sendet an Mega: ");                     //debug
  Serial.println(message);                                  //debug
}

String receiveMessage() {
  if (Serial1.available()) {
    String message = Serial1.readStringUntil('\n');
    Serial.print("Esp empfängt von Mega: ");                //debug
    Serial.println(message);                                //debug
    return message;
  }
  return "";
}