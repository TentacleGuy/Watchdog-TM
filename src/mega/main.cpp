#include <Arduino.h>
#include "settings.h"
#include <L298N.h>


unsigned long int lastMessageSent = 0;  //timer für nachrichten  DEBUG 
int messageInterval = 3000;             //intervall in ms	 DEBUG

unsigned long int lastMotorCommand = 0;  //timer für nachrichten  DEBUG 
int motorInterval = 100;             //intervall in ms	 DEBUG

/*Variablen*/
String messageFromESP = ""; 
String messageToESP  = ""; 

L298N motorL(L_PWM, L_IN1, L_IN2);
L298N motorR(R_PWM, R_IN1, R_IN2);


void sendMessage(String message) {
  Serial1.println(message);
  Serial.print("Mega sendet an ESP: ");                     //debug
  Serial.println(message);                                  //debug
}

int* parseCommand(String command, int numValues) {
  static int commandValues[10];
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

void motorcommand(String values) {
  int* parsedValues = parseCommand(values, 4);
  int leftMotorDirection = parsedValues[0];
  int leftMotorSpeed = parsedValues[1];
  int rightMotorDirection = parsedValues[2];
  int rightMotorSpeed = parsedValues[3];

  motorL.setSpeed(leftMotorSpeed);
  motorR.setSpeed(rightMotorSpeed);


  if (rightMotorDirection == 1) {
    motorR.forward();
  } else if (rightMotorDirection == -1) {
    motorR.backward();
  } else {  // Stopp oder ungültiger Wert
    motorR.stop();
  }
  
  if (leftMotorDirection == 1) {
    motorL.forward();
  } else if (leftMotorDirection == -1) {
    motorL.backward();
  } else {  // Stopp oder ungültiger Wert
    motorL.stop();
  }

  Serial.print("motor links:" );
  Serial.print(leftMotorDirection);
  Serial.print(" ");
  Serial.println(leftMotorSpeed);
  Serial.print(" motor rechts:" );
  Serial.print(rightMotorDirection);
  Serial.print(" ");
  Serial.println(rightMotorSpeed);
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

void setup() {
  Serial.begin(115200);   //Verbindung zum Computer
  Serial1.begin(9600);    //Verbindung zum ESP
  Serial.println("Mega ist Startklar");//debug
  motorcommand("0,0,0,0");
}

void loop() {
  /*-TESTSendungen start-
  if(millis() - lastMessageSent > messageInterval){
    lastMessageSent = millis(); 
    unsigned long int elapsedTime = lastMessageSent/1000;
    messageToESP  = "Hi ESP32, I started " + String(elapsedTime) + " seconds ago";
    sendMessage(messageToESP);  
  }
  //-TESTSendungen ende- */
  receiveMessage();
}
