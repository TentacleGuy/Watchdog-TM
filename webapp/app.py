from flask import Flask, render_template, request, jsonify
from flask_talisman import Talisman
import requests


# Éinstellungen für "externe" Scripts und frames etc.
csp = {
    'default-src': "'self' https://maschinenraum-duisburg.de",
    'frame-ancestors': "'self' https://maschinenraum-duisburg.de",
    'script-src': "'self' https://maschinenraum-duisburg.de",
    'media-src': "'self' https://maschinenraum-duisburg.de"
}
#Variablen definieren
robot_data = {
    'ip': None
}

app = Flask(__name__)
Talisman(app, content_security_policy=csp)

#Startseite
@app.route('/')
def index():
    global robot_data
    return render_template('index.html', robot_data=robot_data)

#Anmelden des ESP an  Server
@app.route('/register', methods=['POST'])
def register_robot():
    global robot_data
    robot_data = request.remote_addr  # Hole die IP des ESP32 aus der Anfrage
    return jsonify({"status": "success", "message": f"Roboter registriert mit IP {robot_ip}"}), 200
if __name__ == '__main__':
    app.run(debug=True)
