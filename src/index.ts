import {connectToSocket} from "./socket.js"
import {update, initializeVisualization, finalizeVisualization, executeCommand} from "./visualization.js";

import "../style.css"
import {InitializationData, SimulationData, VisualizationCommand} from "./data";
import {initializeInteraction} from "./interaction";


function initialize(data: InitializationData) {
    initializeVisualization(data)
    initializeInteraction()
}

function updateData(data: SimulationData | VisualizationCommand) {
    if ("command" in data) {
        executeCommand(data)
    } else {
        update(data)
    }
}

function finalize() {
    finalizeVisualization()
}

connectToSocket(initialize, updateData, finalize).catch((_e) => console.error("Error connecting to socket"))
