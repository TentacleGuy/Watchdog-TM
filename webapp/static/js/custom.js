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

  function toggleLight(){
    fetch('/send_command', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        command: 'toggle_light'
      })
    })
      .then(response => {
        // First check if the response is ok
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('Command response:', data);
        if(data.status === 'success'){
          updateUI(data.light_status);
        } else {
        console.error('Command failed:', data.message);
        }
      })
      .catch(err => console.error('Fehler:', err));
  }
  

  function updateUI(lightOn){
    const elem = document.getElementById('robot_light');
    elem.textContent = lightOn ? 'AN' : 'AUS';

    // Optional: Button-Farbe anpassen
    const btn = document.getElementById('light-btn');
    btn.style.backgroundColor = lightOn ? 'yellow' : 'inherit';
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    pollRobotStatus();
    setInterval(pollRobotStatus, 5000);
  });
  
