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
        this.sendMotorCommand(0, 0, null, null);
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

        // v negativ, damit "nach oben" gezeichnet wird, wenn Y positiv ist
        const v = -normalizedY * this.MAX_SPEED;
        // Drehgeschwindigkeit unverändert
        const omega = normalizedX * this.MAX_TURN_RATE;

        // Motorwerte (Differentialantrieb)
        const leftMotor = v - omega * (this.WHEEL_BASE / 2);
        const rightMotor = v + omega * (this.WHEEL_BASE / 2);

        // Zeichne die Pfade (Bögen) für linkes (blau) und rechtes (grün) Rad
        this.drawTurningPaths(v, omega);

        // (Optional) Berechnung von Pfadradien – hier nicht weiter benötigt
        let leftPfad = null, rightPfad = null;
        if (Math.abs(omega) > 0.01) {
            const R_center = Math.abs(v / omega);
            const icrX = (omega > 0)
                ? this.robotX + R_center * this.canvasScale
                : this.robotX - R_center * this.canvasScale;
            const icrY = this.robotY;
            const leftWheelX = this.robotX - (this.WHEEL_BASE / 2) * this.canvasScale;
            const leftWheelY = this.robotY;
            const rightWheelX = this.robotX + (this.WHEEL_BASE / 2) * this.canvasScale;
            const rightWheelY = this.robotY;
            leftPfad = Math.hypot(leftWheelX - icrX, leftWheelY - icrY) / this.canvasScale;
            rightPfad = Math.hypot(rightWheelX - icrX, rightWheelY - icrY) / this.canvasScale;
        }

        // Sende den Befehl im Arduino-kompatiblen Format
        this.sendMotorCommand(leftMotor, rightMotor, leftPfad, rightPfad);
    }

    drawTurningPaths(v, omega) {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Roboter als gelber Punkt am unteren Rand
        this.ctx.fillStyle = 'yellow';
        this.ctx.beginPath();
        this.ctx.arc(this.robotX, this.robotY, 5, 0, 2 * Math.PI);
        this.ctx.fill();

        // Bei gerader Fahrt -> eine gerade Linie nach oben
        if (Math.abs(omega) < 0.01) {
            this.ctx.strokeStyle = 'gray';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(this.robotX, this.robotY);
            this.ctx.lineTo(this.robotX, this.robotY - 80);
            this.ctx.stroke();
            return;
        }

        // Bestimme den Drehkreis des Roboterzentrums
        const R_center = Math.abs(v / omega);
        const icrX = (omega > 0)
            ? this.robotX + R_center * this.canvasScale
            : this.robotX - R_center * this.canvasScale;
        const icrY = this.robotY;

        // Positionen der Räder
        const leftWheelX = this.robotX - (this.WHEEL_BASE / 2) * this.canvasScale;
        const leftWheelY = this.robotY;
        const rightWheelX = this.robotX + (this.WHEEL_BASE / 2) * this.canvasScale;
        const rightWheelY = this.robotY;

        // Startwinkel der Bögen (vom ICR zu den Rädern)
        const leftStartAngle = Math.atan2(leftWheelY - icrY, leftWheelX - icrX);
        const rightStartAngle = Math.atan2(rightWheelY - icrY, rightWheelX - icrX);
        const leftEndAngle = (omega > 0)
            ? leftStartAngle - this.arcAngle
            : leftStartAngle + this.arcAngle;
        const rightEndAngle = (omega > 0)
            ? rightStartAngle - this.arcAngle
            : rightStartAngle + this.arcAngle;
        const anticlockwise = (omega < 0);

        // Zeichne linken Bogen (blau)
        this.ctx.strokeStyle = 'blue';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(
            icrX, icrY,
            Math.hypot(leftWheelX - icrX, leftWheelY - icrY),
            leftStartAngle, leftEndAngle,
            anticlockwise
        );
        this.ctx.stroke();

        // Zeichne rechten Bogen (grün)
        this.ctx.strokeStyle = 'green';
        this.ctx.beginPath();
        this.ctx.arc(
            icrX, icrY,
            Math.hypot(rightWheelX - icrX, rightWheelY - icrY),
            rightStartAngle, rightEndAngle,
            anticlockwise
        );
        this.ctx.stroke();
    }

    sendMotorCommand(leftMotor, rightMotor, leftPfad, rightPfad) {
        // Konvertiere die berechneten Motorwerte in Richtung und Geschwindigkeit für Arduino.
        // Wir gehen davon aus, dass leftMotor und rightMotor im Bereich [-MAX_SPEED, MAX_SPEED] liegen.
        // Bei vorwaerts: positiver Wert, bei rueckwaerts: negativer Wert.
        let directionLeft, speedLeft, message;
        if (leftMotor > 0) {
            directionLeft = "1";
            speedLeft = Math.min(Math.round(Math.abs(leftMotor) * 255 / this.MAX_SPEED), 255);
        } else if (leftMotor < 0) {
            directionLeft = "-1";
            speedLeft = Math.min(Math.round(Math.abs(leftMotor) * 255 / this.MAX_SPEED), 255);
        } else {
            directionLeft = "0";
            speedLeft = 0;
        }

        let directionRight, speedRight;
        if (rightMotor > 0) {
            directionRight = "1";
            speedRight = Math.min(Math.round(Math.abs(rightMotor) * 255 / this.MAX_SPEED), 255);
        } else if (rightMotor < 0) {
            directionRight = "-1";
            speedRight = Math.min(Math.round(Math.abs(rightMotor) * 255 / this.MAX_SPEED), 255);
        } else {
            directionRight = "0";
            speedRight = 0;
        }
        // Create an array with the 4 values
        const motors = directionLeft + "," + speedLeft + "," + directionRight + "," + speedRight;
            
        // Send the array with a more specific event name
        this.socket.emit('motorcommand', motors);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AnalogStick();
});
