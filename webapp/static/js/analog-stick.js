class AnalogStick {
    constructor() {
        this.stick = document.querySelector('.analog-stick');
        this.bounds = document.querySelector('.analog-stick-bounds');
        this.isDragging = false;
        this.currentX = 0;
        this.currentY = 0;
        this.initialX = 0;
        this.initialY = 0;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Mouse events
        this.stick.addEventListener('mousedown', e => this.startDragging(e));
        document.addEventListener('mousemove', e => this.drag(e));
        document.addEventListener('mouseup', () => this.stopDragging());

        // Touch events for mobile
        this.stick.addEventListener('touchstart', e => this.startDragging(e));
        document.addEventListener('touchmove', e => this.drag(e));
        document.addEventListener('touchend', () => this.stopDragging());

        // Keyboard controls
        document.addEventListener('keydown', e => this.handleKeyboard(e));
        document.addEventListener('keyup', () => this.reset());
    }

    startDragging(e) {
        this.isDragging = true;
        const rect = this.bounds.getBoundingClientRect();
        this.initialX = e.type === 'mousedown' ? e.clientX - rect.left : e.touches[0].clientX - rect.left;
        this.initialY = e.type === 'mousedown' ? e.clientY - rect.top : e.touches[0].clientY - rect.top;
    }

    drag(e) {
        if (!this.isDragging) return;
        e.preventDefault();

        const rect = this.bounds.getBoundingClientRect();
        const x = e.type === 'mousemove' ? e.clientX - rect.left : e.touches[0].clientX - rect.left;
        const y = e.type === 'mousemove' ? e.clientY - rect.top : e.touches[0].clientY - rect.top;

        this.updateStickPosition(x, y);
    }

    stopDragging() {
        this.isDragging = false;
        this.reset();
    }

    reset() {
        // Return to center
        this.stick.style.left = '50%';
        this.stick.style.top = '50%';
        this.currentX = 0;
        this.currentY = 0;
    }

    handleKeyboard(e) {
        const step = 10;
        const keys = {
            'ArrowUp': () => this.currentY -= step,
            'ArrowDown': () => this.currentY += step,
            'ArrowLeft': () => this.currentX -= step,
            'ArrowRight': () => this.currentX += step
        };

        if (keys[e.key]) {
            keys[e.key]();
            this.updateStickPosition(this.currentX, this.currentY);
        }
    }

    updateStickPosition(x, y) {
        const bounds = this.bounds.getBoundingClientRect();
        const radius = bounds.width / 2;
        
        // Calculate distance from center
        const dx = x - bounds.width / 2;
        const dy = y - bounds.height / 2;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Limit to bounds circle
        if (distance > radius) {
            const angle = Math.atan2(dy, dx);
            x = radius * Math.cos(angle) + bounds.width / 2;
            y = radius * Math.sin(angle) + bounds.height / 2;
        }

        this.stick.style.left = `${(x / bounds.width) * 100}%`;
        this.stick.style.top = `${(y / bounds.height) * 100}%`;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new AnalogStick();
});
