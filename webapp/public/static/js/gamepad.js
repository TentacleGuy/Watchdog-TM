window.addEventListener("gamepadconnected", (e) => {
    requestAnimationFrame(updateGamepad);
});

function updateGamepad() {
    const gamepad = navigator.getGamepads()[0];
    if (gamepad) {
        const analogStick = document.querySelector('.analog-stick');
        const xAxis = gamepad.axes[0];
        const yAxis = gamepad.axes[1];
        
        // Update stick position based on controller input
        analogStick.style.left = `${50 + (xAxis * 50)}%`;
        analogStick.style.top = `${50 + (yAxis * 50)}%`;
    }
    requestAnimationFrame(updateGamepad);
}
