const express = require("express");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

//warteschlange
const MAX_CONTROLLER_TIME = 30 * 60 * 1000;
let controllerTimer = null;
let controllerStartTime = null;
let activeController = null;
let controllerQueue = []; // Warteschlange


const debugMode = true;
let espSocketId = null;

// Statische Dateien
app.use(express.static(path.join(__dirname, "public")));
  
// HTML-Seite
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});


// WebSockets
io.on("connection", (socket) => {

  // Log all incoming events
  if (debugMode) {
      const originalOnEvent = socket.onevent;
      socket.onevent = function(packet) {
          console.log("Received event:", packet.data[0]);
          console.log("Event data:", JSON.stringify(packet.data[1], null, 2));
          originalOnEvent.call(this, packet);
      };
  }

  console.log("A client connected with ID:", socket.id);
  socket.join("browserRoom");

  // Send initial queue status to new client
  if (activeController === socket.id) {
    socket.emit("controllerStatus", {
        isController: true,
        timeLeft: getControllerTimeLeft()
    });
  } else {
    socket.emit("controllerStatus", {
        isController: false,
        timeLeft: getControllerTimeLeft()
    });
    
    // Check if client is in queue
    const queuePosition = controllerQueue.findIndex(entry => entry.socketId === socket.id);
    if (queuePosition !== -1) {
        socket.emit("queuePosition", queuePosition + 1);
    }
  }
  
  socket.emit("queueTotal", controllerQueue.length);

  // Handle ESP connection - ensure this is working
  socket.on("connect_esp", () => {
    espSocketId = socket.id;
    console.log("ESP Socket ID:", espSocketId);

    socket.leave("browserRoom");
    socket.join("espRoom");
  });

  // Handle robot data from ESP
  socket.on("message", (data) => {
    console.log("Emitting data from ESP to browserRoom:", data);    
    // Only forward to browser clients, not back to ESP
    io.to("browserRoom").emit("robot_data", data);
  });

  // Add a direct command handler to handle different event formats
  socket.on("command", (data) => {
    console.log("Emitting data from " , socket.id , " to ESP:", data);

    if (socket.id !== activeController) {
      console.log("NICHT aktiver Controller - Command wird ignoriert");
      return;
    }
    if (espSocketId) {
      const socketMessage = `42["command","${data}"]`;
      io.to("espRoom").emit("message", socketMessage);
    }
  });

  //Controlle in Warteschlange enfügen, falls noch nicht vorhanden
  socket.on("joinQueue", () => {
    if (socket.id === activeController) {
      console.log(socket.id, "ist schon Controller.");
      socket.emit("controllerStatus", {
        isController: true,
        timeLeft: getControllerTimeLeft()
      });
      return;
    }
    if (controllerQueue.some(e => e.socketId === socket.id)) {
      console.log(socket.id, "ist bereits in Warteschlange.");
      return;
    }
    
    //Wenn es noch keinen Controller gibt, dann den User direkt als Controller eintragen
    if (!activeController) {
      activeController = socket.id;
      controllerStartTime = Date.now();
      console.log(`Controller wurde: ${socket.id}`);
      controllerTimer = setTimeout(() => {
        //Event nach abgelaufenen Timer -> Controller freigeben und user ans ende der Warteschlange hängen
        console.log("Zeit abgelaufen, verschiebe aktuellen Controller ans Ende.");
        controllerQueue.push({ socketId: activeController, joinedAt: new Date() });
        activeController = null;
        controllerTimer = null;
        controllerStartTime = null;
        assignNextController();
      }, MAX_CONTROLLER_TIME);
      
      socket.emit("controllerStatus", {
        isController: true,
        timeLeft: MAX_CONTROLLER_TIME / (60 * 1000) // Convert to minutes
      });
      
      broadcastQueueInfo();
    } else {
      //wenn bereits Controller vorhanden, user ans Ende der Warteschlange hängen
      controllerQueue.push({ socketId: socket.id, joinedAt: new Date() });
      console.log(`Socket ${socket.id} in Queue eingereiht.`);
      broadcastQueueInfo();
    }
  });

  socket.on("leaveQueue", () => {
    if (socket.id === activeController) {
      console.log("Active Controller verlässt die Queue:", socket.id);
      // Kontroller-Slot freigeben
      clearTimeout(controllerTimer);
      controllerTimer = null;
      activeController = null;
      controllerStartTime = null;
      // Danach den nächsten Controller aus der Queue
      assignNextController();
    } else {
      // Falls er in der Queue steht, entfernen
      removeFromQueue(socket.id);
      broadcastQueueInfo();
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);

    // Falls das der ESP war
    if (socket.id === espSocketId) {
      console.log("ESP hat getrennt");
      espSocketId = null;
    }

    // Falls das der aktive Controller war
    if (socket.id === activeController) {
      console.log("Aktiver Controller ist weg:", socket.id);
      clearTimeout(controllerTimer);
      controllerTimer = null;
      activeController = null;
      // Nächster
      assignNextController();
    } else {
      // Sonst nur aus der Queue entfernen
      removeFromQueue(socket.id);
      broadcastQueuePositions();
    }
  });
});


// Calculate time left for current controller
function getControllerTimeLeft() {
  if (!activeController || !controllerStartTime) return 0;
  
  const elapsedTime = Date.now() - controllerStartTime;
  const timeLeft = Math.max(0, Math.floor((MAX_CONTROLLER_TIME - elapsedTime) / (60 * 1000))); // Convert to minutes
  return timeLeft;
}

// Send queue updates to all clients
function broadcastQueueInfo() {
  // Send total queue size to all clients
  io.to("browserRoom").emit("queueTotal", controllerQueue.length);
  
  // Send individual positions
  controllerQueue.forEach((entry, index) => {
      const position = index + 1; // 1-based position
      io.to(entry.socketId).emit("queuePosition", position);
  });
  
  // Send controller status to all clients
  io.to("browserRoom").emit("controllerStatus", {
      isController: false,
      timeLeft: getControllerTimeLeft()
  });
  
  // Send special status to active controller
  if (activeController) {
      io.to(activeController).emit("controllerStatus", {
          isController: true,
          timeLeft: getControllerTimeLeft()
      });
  }
}

//Warteschlangenposition anzeigen
function broadcastQueuePositions() {
    controllerQueue.forEach((entry, index) => {
        const position = index + 1; // 1-basierte Anzeige
        io.to(entry.socketId).emit("queuePosition", position);
    });
}

function assignNextController() {
  if (controllerQueue.length === 0) {
      activeController = null;
      controllerTimer = null;
      controllerStartTime = null;
      broadcastQueueInfo();
      return;
  }

  // Nimmt den ersten aus der Queue
  const nextInLine = controllerQueue.shift();
  activeController = nextInLine.socketId;
  controllerStartTime = Date.now();
  console.log("Neuer aktiver Controller:", activeController);

  // Neues 30-Minuten-Zeitfenster starten
  controllerTimer = setTimeout(() => {
      console.log("Zeit abgelaufen, verschiebe aktuellen Controller ans Ende.");

      // Den alten Controller an das Ende der Queue hängen – falls er noch gar nicht disconnected ist:
      // (Normalerweise existiert er noch, aber bei Disconnect machen wir removeFromQueue)
      controllerQueue.push({ socketId: activeController, joinedAt: new Date() });

      activeController = null;
      controllerTimer = null;
      controllerStartTime = null;
      // Nächster in der Reihe
      assignNextController();
  }, MAX_CONTROLLER_TIME);

  // Benachrichtige den neuen Controller
  io.to(activeController).emit("controllerStatus", {
      isController: true,
      timeLeft: MAX_CONTROLLER_TIME / (60 * 1000) // Convert to minutes
  });

  // Queue-Positionen erneut senden
  broadcastQueueInfo();
}
  
//User aus Warteschlange entfernen
function removeFromQueue(socketId) {
  const idx = controllerQueue.findIndex(entry => entry.socketId === socketId);
  if (idx !== -1) {
      controllerQueue.splice(idx, 1);
      broadcastQueueInfo();
  }
}

// Periodically update time information
setInterval(() => {
  if (activeController) {
      broadcastQueueInfo();
  }
}, 60000); // Update every minute

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
