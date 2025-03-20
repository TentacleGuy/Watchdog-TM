const express = require("express");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

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
    console.log("A client connected with ID:", socket.id);
    console.log("New connection from:", socket.handshake.address);
    console.log("Socket ID:", socket.id);
    console.log("Headers:", JSON.stringify(socket.handshake.headers, null, 2));

    // Log all incoming events
    if (debugMode) {
        const originalOnEvent = socket.onevent;
        socket.onevent = function(packet) {
            console.log("Received event:", packet.data[0]);
            console.log("Event data:", JSON.stringify(packet.data[1], null, 2));
            originalOnEvent.call(this, packet);
        };
    }

    console.log("Current ESP Socket ID:", espSocketId);


   // Handle ESP connection - ensure this is working
    socket.on("connect_esp", () => {
        console.log("ESP connected with ID:", socket.id);
        espSocketId = socket.id;
        console.log("Updated ESP Socket ID:", espSocketId);
        
        // Store the ESP's IP address
        const espIP = socket.handshake.address;
        console.log("ESP IP:", espIP);
        // Broadcast the ESP's IP to all clients
        io.emit("esp_ip", espIP);
    });
    
    // Handle robot data from ESP
    socket.on("message", (data) => {
        console.log("Data received:", data);    });

    // Add a direct command handler to handle different event formats
    socket.on("command", (data) => {
        console.log("Direct command received:", data);
        if (espSocketId) {
            io.to(espSocketId).emit("command", data);
        } else {
            io.emit("command", data);
        }
    });
    
   // Track disconnections more carefully
   socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        // If the ESP disconnects, reset its socket ID
        if (socket.id === espSocketId) {
            console.log("ESP has disconnected, resetting ESP Socket ID");
            espSocketId = null;
        }
    });
});

// Add this to catch raw WebSocket messages
io.engine.on("connection", (rawSocket) => {
    rawSocket.on("data", (data) => {
      console.log("Raw socket data:", data.toString());
    });
  });
  

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
