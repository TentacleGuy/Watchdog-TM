class AnalogStick {
    constructor() {
        // DOM-Elemente für den Analogstick
        this.stick = document.querySelector('.analog-stick');
        this.bounds = document.querySelector('.analog-stick-bounds');
        this.isDragging = false;
        this.lastSentTime = 0;
        this.updateInterval = 100; // Aktualisierung alle 100ms

        // Konstanten für die Berechnung
        this.MAX_SPEED = 1.0;        // Maximale Vorwärtsgeschwindigkeit (z. B. in m/s)
        this.MAX_TURN_RATE = 1.0;      // Maximale Drehgeschwindigkeit (z. B. in rad/s)
        this.WHEEL_BASE = 0.3;         // Abstand zwischen den Rädern (in m)
        this.canvasScale = 100;        // Pixel pro Meter für die Visualisierung
        this.arcAngle = Math.PI / 2;   // Länge der gezeichneten Bögen (hier 90°)

        // Canvas-Setup für die Visualisierung
        this.canvas = document.getElementById("turning-canvas");
        if (this.canvas) {
            this.ctx = this.canvas.getContext("2d");
            // Roboter am unteren Rand statt in der Mitte:
            this.robotX = this.canvas.width / 2;
            this.robotY = this.canvas.height - 50; // 50 px Abstand vom unteren Rand
        }

        // WebSocket-Verbindung
        this.socket = window.sharedSocket;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Maus-Events
        this.stick.addEventListener('mousedown', e => this.startDragging(e));
        this.stick.addEventListener('mousemove', e => this.drag(e));
        document.addEventListener('mouseup', () => this.stopDragging());

        // Touch-Events (für mobile Geräte)
        this.stick.addEventListener('touchstart', e => this.startDragging(e));
        this.stick.addEventListener('touchmove', e => this.drag(e));
        document.addEventListener('touchend', () => this.stopDragging());
    }

    startDragging(e) {
        this.isDragging = true;
        const rect = this.bounds.getBoundingClientRect();
        this.initialX = (e.type === 'mousedown' ? e.clientX : e.touches[0].clientX) - rect.left;
        this.initialY = (e.type === 'mousedown' ? e.clientY : e.touches[0].clientY) - rect.top;
    }

    drag(e) {
        if (!this.isDragging) return;
        e.preventDefault();
        const rect = this.bounds.getBoundingClientRect();
        let x = (e.type.startsWith('mouse') ? e.clientX : e.touches[0].clientX) - rect.left;
        let y = (e.type.startsWith('mouse') ? e.clientY : e.touches[0].clientY) - rect.top;
        this.updateStickPosition(x, y);
    }

    stopDragging() {
        if (this.isDragging) {
            this.isDragging = false;
            this.reset();
        }
    }

    reset() {
        // Stick wieder in die Mitte
        this.stick.style.left = '50%';
        this.stick.style.top = '50%';
        // Stop-Befehl senden
        this.sendMotorCommand(0, 0, 0, 0);
        // Canvas leeren
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    updateStickPosition(x, y) {
        const bounds = this.bounds.getBoundingClientRect();
        const radius = bounds.width / 2;
        const dx = x - bounds.width / 2;
        const dy = y - bounds.height / 2;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Begrenze den Stick auf den Kreisradius
        if (distance > radius) {
            const angle = Math.atan2(dy, dx);
            x = radius * Math.cos(angle) + bounds.width / 2;
            y = radius * Math.sin(angle) + bounds.height / 2;
        }
        this.stick.style.left = `${(x / bounds.width) * 100}%`;
        this.stick.style.top = `${(y / bounds.height) * 100}%`;

        // Normalisierte Werte zwischen -1 und 1
        const normalizedX = (x - bounds.width / 2) / radius;
        const normalizedY = (y - bounds.height / 2) / radius;

        // Berechne Motorwerte und zeichne
        this.calculateMotorValues(normalizedX, normalizedY);
    }

    calculateMotorValues(normalizedX, normalizedY) {
        const now = Date.now();
        if (now - this.lastSentTime < this.updateInterval) return;
        this.lastSentTime = now;
        
        // Berechne die Auslenkung (Distance) des Sticks
        const distance = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
        const DEADZONE = 0.1;
        if (distance < DEADZONE) {
            this.sendMotorCommand(0, 0);
            if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        }
        // Multiplier: 0 in der Mitte, 1 am Rand
        const multiplier = Math.min(distance, 1);
    
        // Winkel in Grad berechnen – 0° entspricht oben, Winkel steigt im Uhrzeigersinn
        let angleDeg = Math.atan2(normalizedX, -normalizedY) * (180 / Math.PI);
        if (angleDeg < 0) angleDeg += 360;
    
        let leftSpeed = 0;
        let rightSpeed = 0;
        const MAX = 255;
        const speedExponent = 2; // Hier kannst du den Exponenten anpassen
    
        if (angleDeg >= 0 && angleDeg < 90) {
            // Vorwärts, Rechtsabbiegen: linker Motor fest, rechter wird exponentiell von 255 (bei 0°) auf 0 (bei 90°) reduziert.
            leftSpeed = MAX;
            rightSpeed = MAX * Math.pow(1 - angleDeg / 90, speedExponent);
        } else if (angleDeg >= 90 && angleDeg < 180) {
            // Rückwärts, Rechtsabbiegen: linker Motor fest, rechter steigt exponentiell von 0 (bei 90°) auf 255 (bei 180°).
            leftSpeed = MAX;
            rightSpeed = MAX * Math.pow((angleDeg - 90) / 90, speedExponent);
            leftSpeed = -leftSpeed;
            rightSpeed = -rightSpeed;
        } else if (angleDeg >= 180 && angleDeg < 270) {
            // Rückwärts, Linksabbiegen: rechter Motor fest, linker wird exponentiell von 255 (bei 180°) auf 0 (bei 270°) reduziert.
            rightSpeed = MAX;
            leftSpeed = MAX * Math.pow(1 - (angleDeg - 180) / 90, speedExponent);
            leftSpeed = -leftSpeed;
            rightSpeed = -rightSpeed;
        } else if (angleDeg >= 270 && angleDeg < 360) {
            // Vorwärts, Linksabbiegen: rechter Motor fest, linker steigt exponentiell von 0 (bei 270°) auf 255 (bei 360°).
            rightSpeed = MAX;
            leftSpeed = MAX * Math.pow((angleDeg - 270) / 90, speedExponent);
        }
    
        // Skaliere mit dem Distanzmultiplikator (0 in der Mitte, 1 am Rand)
        leftSpeed *= multiplier;
        rightSpeed *= multiplier;
    
        this.sendMotorCommand(leftSpeed, rightSpeed);
    }
    
    
    

    drawRobotDirection(angle, distance) {
        if (!this.ctx) return;
        
        // Roboter als gelber Punkt am unteren Rand
        this.ctx.fillStyle = 'yellow';
        this.ctx.beginPath();
        this.ctx.arc(this.robotX, this.robotY, 5, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Zeichne eine Linie in Richtung des Winkels
        const lineLength = distance * 80; // Länge proportional zur Entfernung
        const targetX = this.robotX + Math.sin(angle) * lineLength;
        const targetY = this.robotY - Math.cos(angle) * lineLength;
        
        this.ctx.strokeStyle = 'gray';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.robotX, this.robotY);
        this.ctx.lineTo(targetX, targetY);
        this.ctx.stroke();
    }

    sendMotorCommand(leftSpeed, rightSpeed) {
        const MIN_MOTOR_SPEED = 50; // Mindestgeschwindigkeit (PWM), falls > 0
        const MAX_PWM = 255;       // Maximalwert für PWM
    
        // Linken Motor verarbeiten
        let leftDir = "0";
        let leftPWM = 0;
        if (leftSpeed !== 0) {
            leftDir = leftSpeed > 0 ? "1" : "-1";
            leftPWM = Math.min(Math.round(Math.abs(leftSpeed)), MAX_PWM);
            if (leftPWM < MIN_MOTOR_SPEED) leftPWM = MIN_MOTOR_SPEED;
        }
    
        // Rechten Motor verarbeiten
        let rightDir = "0";
        let rightPWM = 0;
        if (rightSpeed !== 0) {
            rightDir = rightSpeed > 0 ? "1" : "-1";
            rightPWM = Math.min(Math.round(Math.abs(rightSpeed)), MAX_PWM);
            if (rightPWM < MIN_MOTOR_SPEED) rightPWM = MIN_MOTOR_SPEED;
        }
    
        // Zusammensetzen des Befehls: z.B. "1,200,-1,150"
        const motors = `${leftDir},${leftPWM},${rightDir},${rightPWM}`;
        this.socket.emit('motorcommand', motors);
    }
    
    

}

document.addEventListener('DOMContentLoaded', () => {
    new AnalogStick();
});
