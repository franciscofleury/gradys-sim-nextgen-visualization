import {InitializationData, SimulationData} from "./data";

let socket = null;

const panelElement = document.getElementById("panel");
const connectionElement = document.getElementById("connection");
function toggleUI(hide: boolean) {
    connectionElement.style.visibility = hide ? "visible" : "hidden";
    panelElement.style.visibility = !hide ? "visible" : "hidden";
}

toggleUI(true);

function socketConnectionFailed(
    initCallback: (data: InitializationData) => void,
    onDataCallback: (data: SimulationData) => void,
    onFinalizeCallback: () => void
) {
    if (socket != null) {
        socket.close();
    }
    socket = null;

    window.setTimeout(() => connectToSocket(initCallback, onDataCallback, onFinalizeCallback), 10)
}

export function connectToSocket(
    initCallback: (data: InitializationData) => void,
    onDataCallback: (data: SimulationData) => void,
    onFinalizeCallback: () => void
) {
    let firstMessage = false;
    socket = new WebSocket("ws://localhost:5678");
    socket.onopen = function (e) {
        console.log("[open] Connection established");
        toggleUI(false)
    };

    socket.onmessage = (event) => {
        const socketData = JSON.parse(event.data);
        if (!firstMessage) {
            firstMessage = true;
            initCallback(socketData)
            return
        }
        onDataCallback(socketData)
    };

    socket.onclose = (event) => {
        if (event.wasClean) {
            console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
        } else {
            console.log('[close] Connection died');
        }
        onFinalizeCallback()
        firstMessage = false;
        toggleUI(true);
        socketConnectionFailed(initCallback, onDataCallback, onFinalizeCallback)

    };

    socket.onerror = function (error) {
        console.log(`[error] ${error.message}`);
        socket.close()
    };
}