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

robot_data = {
    'ip': None,
    'online': False,
    'light_status': False
}

# Überprüft regelmäßig, ob der Roboter noch erreichbar ist
def check_robot_status():
    while True:
        if robot_data['ip']:
            try:
                response = requests.get(f"http://{robot_data['ip']}/status", timeout=2)
                robot_data['online'] = response.status_code == 200
            except requests.exceptions.RequestException:
                robot_data['online'] = False
        else:
            robot_data['online'] = False
        time.sleep(10)  # Alle 10 Sekunden prüfen

# Starte die Hintergrundüberprüfung
threading.Thread(target=check_robot_status, daemon=True).start()

@app.route('/register', methods=['POST'])
def register_robot():
    robot_data['ip'] = request.remote_addr  # Speichert die IP des ESP32
    return jsonify({"status": "success", "message": f"Roboter registriert mit IP {robot_data['ip']}"}), 200

@app.route('/toggle_light', methods=['POST'])
def toggle_light():
    if not robot_data['ip'] or not robot_data['online']:
        return jsonify({"status": "error", "message": "Roboter nicht erreichbar"}), 400

    robot_data['light_status'] = not robot_data['light_status']  # Lichtstatus umschalten
    command = "light_on" if robot_data['light_status'] else "light_off"

    try:
        response = requests.post(f"http://{robot_data['ip']}/command", json={"command": command}, timeout=2)
        if response.status_code == 200:
            return jsonify({"status": "success", "light_status": robot_data['light_status']}), 200
        else:
            return jsonify({"status": "error", "message": "Fehler beim Schalten"}), 500
    except requests.exceptions.RequestException:
        return jsonify({"status": "error", "message": "Roboter nicht erreichbar"}), 500

@app.route('/')
def index():
    return render_template('index.html', robot_data=robot_data)

if __name__ == '__main__':
    app.run(debug=True)