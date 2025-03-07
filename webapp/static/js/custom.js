function pollRobotStatus() {
    fetch('/robot_status') 
      .then(response => response.json())
      .then(data => {
        // data = { ip: "...", online: true/false, light_status: true/false }
        document.getElementById('robot_ip').textContent = data.ip || 'unbekannt';
        
        // Online-Status
        if (data.online) {
          document.getElementById('robot_status').textContent = 'online';
        } else {
          document.getElementById('robot_status').textContent = 'offline';
        }
        
        // Lichtstatus
        if (data.light_status) {
          document.getElementById('robot_light').textContent = 'on';
        } else {
          document.getElementById('robot_light').textContent = 'off';
        }
      })
      .catch(err => {
        console.error('Fehler beim Abfragen des Roboterstatus:', err);
        // Falls der Fetch scheitert, kann man "OFFLINE" anzeigen:
        document.getElementById('robot_status').textContent = 'OFFLINE';
      });
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    pollRobotStatus();
    setInterval(pollRobotStatus, 5000);
  });
  
