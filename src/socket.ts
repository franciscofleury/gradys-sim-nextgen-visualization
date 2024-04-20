import {InitializationData, SimulationData} from "./data";

export let socket: WebSocket | null = null;

const panelElement = document.getElementById("panel");
const connectionElement = document.getElementById("connection");
const colorElement = document.getElementById("color") as HTMLDivElement;
function toggleUI(hide: boolean) {
    connectionElement.style.visibility = hide ? "visible" : "hidden";
    panelElement.style.visibility = !hide ? "visible" : "hidden";
    colorElement.style.visibility = !hide ? "visible" : "hidden";
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

    window.setTimeout(() => connectToSocket(initCallback, onDataCallback, onFinalizeCallback), 0)
}

/**
 * Quickly ping the socket until it's up
 */
async function waitUntilUp() {
    let pingCount = 0

    while (true) {
        console.log(`Pinging socket ${pingCount}`)

        const timeoutController = new AbortController();
        const timeout = setTimeout(() => timeoutController.abort(), 200);
        try {
            await fetch("http://localhost:5678", {signal: timeoutController.signal, mode: 'no-cors'});
            clearTimeout(timeout);
            return;
        } catch (e) {
            clearTimeout(timeout);
            pingCount++
            await new Promise((resolve) => setTimeout(resolve, 200));
        }
    }
}

export async function connectToSocket(
    initCallback: (data: InitializationData) => void,
    onDataCallback: (data: SimulationData) => void,
    onFinalizeCallback: () => void
) {
    let firstMessage = false;

    await waitUntilUp();

    socket = new WebSocket("ws://localhost:5678");
    socket.onopen = function (_e) {
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

    socket.onerror = function () {
        console.log("[error]");
        socket.close()
    };
}
