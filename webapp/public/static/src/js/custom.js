// Constants
const MAX_CONTROLLER_TIME = 30; // 30 minutes
let inQueue = false;
let isController = false;
let queuePosition = 0;
let totalInQueue = 0;
let controllerTimeLeft = 0;
let controllerTimeInterval = null;
let estimatedWaitTime = 0;

// Connect to the WebSocket server
window.sharedSocket = io();

// Handle connection status
window.sharedSocket.on('connect', () => {
    console.log('Connected to server');
});

// Handle ESP IP address
window.sharedSocket.on('esp_ip', (ip) => {
    console.log('Received ESP IP:', ip);
    document.getElementById('robot_ip').textContent = ip;
});


// Handle ESP status updates
window.sharedSocket.on('esp_status', (status) => {
    console.log("esp_status:", status);
    updateOnlineStatus(status.online);
});


// Handle robot data
window.sharedSocket.on('robot_data', (data) => {
    //console.log('Received robot data:', data);
    
    // Update the status display
    updateOnlineStatus(true);
    
    // Update light status
    updateLightStatus(data.light);


    // Update last seen timestamp
    const now = new Date();
    document.getElementById('robot_last_seen').textContent = now.toLocaleTimeString();
    
    // Update battery if available
    if (data.battery !== undefined) {
        updateBatteryDisplay(data.battery);
    }
    
    // Display the raw data in the textarea
    document.getElementById('output').value = JSON.stringify(data, null, 2);
});

// Handle queue position updates
window.sharedSocket.on('queuePosition', (position) => {
    console.log('Queue position:', position);
    inQueue = true;
    queuePosition = position;
    updateQueueDisplay();
});

// Handle queue total updates
window.sharedSocket.on('queueTotal', (total) => {
    console.log('Queue total:', total);
    totalInQueue = total;
    updateQueueDisplay();
});

// Handle controller status
window.sharedSocket.on('controllerStatus', (status) => {
    console.log('Controller status:', status);
    isController = status.isController;
    controllerTimeLeft = status.timeLeft;
    
    if (status.isController) {
        inQueue = false;
    }
    
    updateQueueDisplay();
    startControllerTimeCountdown();
    
    // Calculate estimated wait time
    if (inQueue && !isController) {
        estimatedWaitTime = Math.max(0, (queuePosition - 1) * MAX_CONTROLLER_TIME + controllerTimeLeft);
        updateQueueDisplay();
    }
});

// Handle disconnect
window.sharedSocket.on('disconnect', () => {
    updateOnlineStatus(false);
    
    // Clear intervals
    if (controllerTimeInterval) {
        clearInterval(controllerTimeInterval);
        controllerTimeInterval = null;
    }
});

// Join queue
function joinQueue() {
    window.sharedSocket.emit("joinQueue");
    inQueue = true;
    updateQueueDisplay();
}

// Leave queue
function leaveQueue() {
    window.sharedSocket.emit("motorcommand", "0,0,0,0");
    window.sharedSocket.emit("leaveQueue");
    inQueue = false;
    updateQueueDisplay();
}

// Function to toggle the light
function toggleLight(event) {
    if (event) {
        event.stopPropagation(); // Prevent event from bubbling up
    }
    window.sharedSocket.emit("toggleLight");
}
// Update battery display
function updateBatteryDisplay(level) {
    const batteryText = document.getElementById('battery-text');
    const batteryIndicator = document.getElementById('battery-indicator');
    batteryText.textContent = `${level}%`;
    
    // Set color based on level
    let color;
    if (level <= 20) {
        color = '#f0506e'; // Red - UIkit danger
    } else if (level <= 50) {
        color = '#faa05a'; // Orange - UIkit warning
    } else {
        color = '#32d296'; // Green - UIkit success
    }
    
    batteryIndicator.style.color = color;
}

// Update light status
function updateLightStatus(isOn) {
    const lightToggle = document.getElementById('light-toggle');
    if (isOn) {
        lightToggle.classList.remove('light-off');
        lightToggle.classList.add('light-on');
    } else {
        lightToggle.classList.remove('light-on');
        lightToggle.classList.add('light-off');
    }
}

// Update online status
function updateOnlineStatus(isOnline) {
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('robot_status');
    
    if (isOnline) {
        statusIndicator.style.color = '#32d296'; 
        statusText.textContent = 'online';
    } else {
        statusIndicator.style.color = '#f0506e';
        statusText.textContent = 'offline';
    }
}

// Update queue display
function updateQueueDisplay() {
    const queuePositionElement = document.getElementById('queue-position');
    const positionElement = document.getElementById('position');
    const totalQueueElement = document.getElementById('total-queue');
    const controllerStatusElement = document.getElementById('controller-status');
    const joinQueueBtn = document.getElementById('join-queue-btn');
    const leaveQueueBtn = document.getElementById('leave-queue-btn');
    const controllerTimeElement = document.getElementById('current-controller-time');
    const waitTimeElement = document.getElementById('estimated-wait-time');
    
    if (isController) {
        controllerStatusElement.textContent = 'You are in control';
        controllerStatusElement.style.color = '#32d296'; // Green
        queuePositionElement.classList.add('hidden');
        joinQueueBtn.classList.add('hidden');
        leaveQueueBtn.classList.remove('hidden');
        controllerTimeElement.classList.remove('hidden');
        waitTimeElement.classList.add('hidden');
    } else if (inQueue) {
        controllerStatusElement.textContent = 'You are in queue';
        controllerStatusElement.style.color = '#faa05a'; // Orange
        queuePositionElement.classList.remove('hidden');
        positionElement.textContent = queuePosition;
        totalQueueElement.textContent = totalInQueue;
        joinQueueBtn.classList.add('hidden');
        leaveQueueBtn.classList.remove('hidden');
        controllerTimeElement.classList.remove('hidden');
        waitTimeElement.classList.remove('hidden');
        document.getElementById('wait-time').textContent = estimatedWaitTime;
    } else {
        controllerStatusElement.textContent = 'You are not in control';
        controllerStatusElement.style.color = '#999'; // Gray
        queuePositionElement.classList.add('hidden');
        joinQueueBtn.classList.remove('hidden');
        leaveQueueBtn.classList.add('hidden');
        controllerTimeElement.classList.remove('hidden');
        waitTimeElement.classList.add('hidden');
    }
    
    // Always show controller time left
    document.getElementById('controller-time-left').textContent = controllerTimeLeft;
}

// Start controller time countdown
function startControllerTimeCountdown() {
    if (controllerTimeInterval) {
        clearInterval(controllerTimeInterval);
    }
    
    controllerTimeInterval = setInterval(() => {
        if (controllerTimeLeft > 0) {
            controllerTimeLeft--;
            updateQueueDisplay();
            
            // Update estimated wait time
            if (inQueue && !isController) {
                estimatedWaitTime = Math.max(0, (queuePosition - 1) * MAX_CONTROLLER_TIME + controllerTimeLeft);
                updateQueueDisplay();
            }
        }
    }, 60000); // Update every minute
}

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Set up queue button event listeners
    document.getElementById('join-queue-btn').addEventListener('click', joinQueue);
    document.getElementById('leave-queue-btn').addEventListener('click', leaveQueue);
    document.getElementById('light-toggle').addEventListener('click', (event) => {
        toggleLight(event);
    });    
    // Initialize displays
    updateOnlineStatus(false);
    updateBatteryDisplay(0);
    updateLightStatus(false);
    updateQueueDisplay();
});