from flask import Flask, render_template, request, jsonify
from flask_talisman import Talisman
import requests
import threading
import time


# Éinstellungen für "externe" Scripts und frames etc.
csp = {
    'default-src': "'self' https://maschinenraum-duisburg.de",
    'frame-ancestors': "'self' https://maschinenraum-duisburg.de",
    'script-src': "'self' https://maschinenraum-duisburg.de",
    'media-src': "'self' https://maschinenraum-duisburg.de",
    'img-src': "'self' http://maschinenraum-duisburg.de"
}

app = Flask(__name__)

# Heartbeat Intervall (Sekunden)
HEARTBEAT_INTERVAL = 5
# Nach wie vielen Intervallen der ESP als offline gilt
TIMEOUT_FACTOR = 2

robot_data = {
    'ip': None,
    'online': False,
    'light_status': False,
    'last_heartbeat': 0
}

def monitor_robot():
    global robot_data
    while True:
        if robot_data['last_heartbeat'] > 0:
            elapsed = time.time() - robot_data['last_heartbeat']
            if elapsed > HEARTBEAT_INTERVAL * TIMEOUT_FACTOR:
                robot_data['online'] = False
        time.sleep(1)

# Starte den Offline-Check im Hintergrund
threading.Thread(target=monitor_robot, daemon=True).start()

@app.route('/')
def index():
    return render_template('index.html', robot_data=robot_data)


@app.route('/heartbeat', methods=['POST'])
def heartbeat():
    global robot_data
    esp_ip = request.remote_addr    
    robot_data['ip'] = esp_ip
    robot_data['online'] = True
    robot_data['last_heartbeat'] = time.time()
    return jsonify({"status": "ok", "msg": f"Heartbeat von IP {esp_ip} empfangen"})

@app.route('/robot_status')
def robot_status():
    global robot_data
    # Kannst du per AJAX aufrufen, um IP & Online-Status abzufragen
    return jsonify({
        "ip": robot_data['ip'],
        "online": robot_data['online'],
        "light_status": robot_data['light_status']
    })

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)