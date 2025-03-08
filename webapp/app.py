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
    robot_data['last_heartbeat'] = int(time.time() / 1000)
    data = request.get_json()

    return jsonify({"status": "ok", "msg": f"Heartbeat von IP {esp_ip} empfangen"})

@app.route('/robot_status')
#TODO: Schleife einbauen dass komplettes array zurückgegeben wird und nicht einzelnd aufgelistet werden muss
def robot_status():
    global robot_data
    # Kannst du per AJAX aufrufen, um IP & Online-Status abzufragen
    return jsonify({
        "ip": robot_data['ip'],
        "online": robot_data['online'],
        "light_status": robot_data['light_status']
    })


#TODO: Toggle Light funktion verkleinern -> command: toggle_light an ESP evtl Funktion umschreiben für send Command(command)....
@app.route("/send_command", methods=["POST"])
def send_command():
    global robot_data

    # 1. Prüfe, ob ESP erreichbar
    if not robot_data["online"] or not robot_data["ip"]:
        return jsonify({"status":"error","message":"Roboter offline"}), 400

    # Get command from request, default to toggle_light if not specified
    data = request.get_json()  # Use get_json() to properly parse JSON content
    if data is None:
        return jsonify({"status":"error","message":"Invalid JSON"}), 400
        
    command = data.get("command", "toggle_light")
    try:
        url = f"http://{robot_data['ip']}:8080/command"
        resp = requests.post(url, data={"command": command}, timeout=3)
        
        if resp.status_code == 200:
            try:
                response_data = resp.json()
                msg = response_data.get("message", "")
                
                # If we get updated light status back, update local state
                if "light_status" in response_data:
                    robot_data["light_status"] = response_data["light_status"]
                    
                return jsonify({"status":"success", "message":msg}), 200
            except:
                # If response cannot be parsed as JSON
                return jsonify({"status":"error","message":"Invalid response from ESP"}), 500
        else:
            return jsonify({"status":"error","message":"ESP-Fehler: " + resp.text}), 500
    except requests.exceptions.RequestException as e:
        return jsonify({"status":"error","message":str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)