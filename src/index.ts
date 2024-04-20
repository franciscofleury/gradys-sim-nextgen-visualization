import {connectToSocket} from "./socket.js"
import {update, initializeVisualization, finalizeVisualization} from "./visualization.js";

import "../style.css"
import {InitializationData, SimulationData} from "./data";
import {initializeInteraction} from "./interaction";


function initialize(data: InitializationData) {
    initializeVisualization(data)
    initializeInteraction()
}

function updateData(data: SimulationData) {
    update(data)
}

function finalize() {
    finalizeVisualization()
}

connectToSocket(initialize, updateData, finalize).catch((_e) => console.error("Error connecting to socket"))
