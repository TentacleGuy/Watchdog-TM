#include <Arduino.h>
#include "settings.h"
#include <L298N.h>

unsigned long int lastESPMessageTime = 0;
const unsigned long ESP_TIMEOUT = 5000; // 5 Sekunden Timeout

/*Variablen*/
String messageFromESP = ""; 
String messageToESP  = ""; 
int initialized = 0;
int commandValues[10];

L298N motorL(L_PWM, L_IN1, L_IN2);
L298N motorR(R_PWM, R_IN1, R_IN2);

void sendMessage(String message) {
  Serial1.println(message);
  Serial.print("Mega sendet an ESP: ");                     //debug
  Serial.println(message);                                  //debug
}

int* parseCommand(String command, int numValues) {
  int index = 0;
  while (command.length() > 0 && index < numValues) {
    int commaIndex = command.indexOf(',');
    if (commaIndex == -1) {
      commandValues[index++] = command.toInt();
      break;
    }
    commandValues[index++] = command.substring(0, commaIndex).toInt();
    command = command.substring(commaIndex + 1);
  }
  return commandValues;
}

/*
  values = leftMotorDirection,leftMotorSpeed,rightMotorDirection,rightMotorSpeed   z.b. "1,122,-1,255"
  commandValues[0] = leftMotorDirection
  commandValues[1] = leftMotorSpeed
  commandValues[2] = rightMotorDirection
  commandValues[3] = rightMotorSpeed
*/
void motorcommand(String values) {
  initialized = 0;
  parseCommand(values, 4);

  motorL.setSpeed(commandValues[1]);
  motorR.setSpeed(commandValues[3]);

  if (commandValues[2] == 1) {
    motorR.forward();
  } else if (commandValues[2] == -1) {
    motorR.backward();
  } else {  // Stopp oder ungültiger Wert
    motorR.stop();
  }
  
  if (commandValues[0] == 1) {
    motorL.forward();
  } else if (commandValues[0] == -1) {
    motorL.backward();
  } else {  // Stopp oder ungültiger Wert
    motorL.stop();
  }
}

void handleCommand(String command, String values){
  if(command == "motorcommand"){
    motorcommand(values);
  }
  else {
    Serial.println("Ungültiger Befehl");
  }
}

void receiveMessage() {
  if (Serial1.available()) {
    String message = Serial1.readStringUntil('\n');
    lastESPMessageTime = millis();
    Serial.print("Mega empfängt von ESP: ");                //debug
    Serial.println(message);                                //debug
    int colonIndex = message.indexOf(':');
    Serial.println("Colon Index: " + String(colonIndex));
    if (colonIndex > 0){
      String command = message.substring(0,colonIndex);
      String value = message.substring(colonIndex + 1);
      handleCommand(command, value);
    }
    else if(colonIndex == 0){
      Serial.println (message);
    }
    else{
      Serial.println (">>> ungültiger Befehl <<<");
    }
    
  }
}

void initialize() {
  motorL.stop();
  motorR.stop();
  initialized =1;
}

// Neue Funktion zur Überprüfung der ESP-Kommunikation
void checkESPConnection() {
  if (millis() - lastESPMessageTime > ESP_TIMEOUT) {
    if(initialized == 0){
      Serial.println ("Zurücksetzen auf Initialzustand");
      initialize();
    }
  }
}

void setup() {
  Serial.begin(115200);   //Verbindung zum Computer
  Serial1.begin(9600);    //Verbindung zum ESP
  Serial.println("Mega ist Startklar");//debug
  initialize();
}

void loop() {
  receiveMessage();
  checkESPConnection(); 
}
