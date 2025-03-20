// Connect to the WebSocket server
const socket = io();

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
    //console.log('Received robot data:', data);
    
    // Update the status display
    document.getElementById('robot_status').textContent = 'online';
    
    // Update light status
    document.getElementById('robot_light').textContent = data.light ? 'on' : 'off';
    
    // Update last seen timestamp
    const now = new Date();
    document.getElementById('robot_last_seen').textContent = now.toLocaleTimeString();
    
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
    socket.emit("command", "toggleLight");
}

socket.on('disconnect', () => {
    document.getElementById('robot_status').textContent = 'offline';
});
