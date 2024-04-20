import {socket} from "./socket";

interface VisualizationMessage {
    interaction: "pause/resume"
}

export function initializeInteraction () {
    const pauseButton = document.getElementById("pause") as HTMLButtonElement;
    pauseButton.addEventListener("click", () => {
        if (socket?.readyState === WebSocket.OPEN) {
            const message: VisualizationMessage = {
                interaction: "pause/resume"
            }
            socket.send(JSON.stringify(message))
        }
    })
}
