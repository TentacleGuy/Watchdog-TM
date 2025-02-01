#include <Arduino.h>

unsigned long int lastMessageSent = 0;  //timer für nachrichten  DEBUG 
int messageInterval = 3000;             //intervall in ms	 DEBUG

/*Variablen*/
String messageFromESP = ""; 
String messageToESP  = ""; 


void sendMessage(String message) {
  Serial1.println(message);
  Serial.print("Mega sendet an ESP: ");                     //debug
  Serial.println(message);                                  //debug
}

String receiveMessage() {
  if (Serial1.available()) {
    String message = Serial1.readStringUntil('\n');
    Serial.print("Mega empfängt von ESP: ");                //debug
    Serial.println(message);                                //debug
    return message;
  }
  return "";
}

void setup() {
  Serial.begin(115200);   //Verbindung zum Computer
  Serial1.begin(9600);    //Verbindung zum ESP
  Serial.println("Mega ist Startklar");//debug
}

void loop() {
  /*-TESTSendungen start-*/
  if(millis() - lastMessageSent > messageInterval){
    lastMessageSent = millis(); 
    unsigned long int elapsedTime = lastMessageSent/1000;
    messageToESP  = "Hi ESP32, I started " + String(elapsedTime) + " seconds ago";
    sendMessage(messageToESP);  
  }
  /*-TESTSendungen ende- */

  messageFromESP = receiveMessage();
}
