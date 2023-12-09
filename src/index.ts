import {connectToSocket} from "./socket.js"
import {update, initializeVisualization, finalizeVisualization} from "./visualization.js";

import "../style.css"
import {InitializationData, SimulationData} from "./data";


function initialize(data: InitializationData) {
    initializeVisualization(data)
}

function updateData(data: SimulationData) {
    update(data)
}

function finalize() {
    finalizeVisualization()
}

connectToSocket(initialize, updateData, finalize);