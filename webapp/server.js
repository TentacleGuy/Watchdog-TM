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

    // Handle ESP connection
    socket.on("connect_esp", () => {
        console.log("ESP connected with ID:", socket.id);
        espSocketId = socket.id;
        // Store the ESP's IP address
        const espIP = socket.handshake.address;
        console.log("ESP IP:", espIP);
        // Broadcast the ESP's IP to all clients
        io.emit("esp_ip", espIP);
    });
    
    // Handle robot data from ESP
    socket.on("message", (data) => {
        console.log("Data received:", data);
        // No need to parse, data is already an object
        //io.emit("robot_data", data);
    });

    // Handle light toggle command from web clients
    socket.on("toggle_light", () => {
        console.log("Light toggle requested");
        console.log(io.emit.data);
        io.emit("command", "toggleLight"); // Fallback to broadcast
    });
    
    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
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
