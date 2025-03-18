// Connect to the WebSocket server
const socket = io();
let espSocketId = null;

// Handle connection status
socket.on('connect', () => {
    console.log('Connected to server');
});

// Handle ESP IP address
socket.on('esp_ip', (ip) => {
    console.log('Received ESP IP:', ip);
    document.getElementById('robot_ip').textContent = ip;
});

// Handle robot data
socket.on('robot_data', (data) => {
    console.log('Received robot data:', data);
    
    // Update the status display
    document.getElementById('robot_status').textContent = 'online';
    
    // Update light status
    document.getElementById('robot_light').textContent = data.light ? 'on' : 'off';
    
    // Add battery info if available
    if (data.battery !== undefined) {
        // Create battery element if it doesn't exist
        if (!document.getElementById('robot_battery')) {
            const batteryDiv = document.createElement('div');
            batteryDiv.innerHTML = 'battery: <span id="robot_battery">0</span>%';
            document.querySelector('.robot_data').appendChild(batteryDiv);
        }
        document.getElementById('robot_battery').textContent = data.battery;
    }
    
    // Display the raw data in the textarea
    document.getElementById('output').value = JSON.stringify(data, null, 2);
});

// Function to toggle the light
function toggleLight() {
      //socket.emit('toggle_light');
      console.log("Light toggle requested");
      if (espSocketId) {
        console.log("ESP Socket ID found, sending command to ESP");
        socket.to(espSocketId).emit("command", "toggleLight");
      } else {
        console.log("ESP Socket ID not found, broadcasting command");
        socket.emit("command", "toggleLight"); // Fallback to broadcast
      }
}
