import * as THREE from 'three'
// @ts-ignore
import { MapControls } from 'three/addons/controls/MapControls.js';
import {InitializationData, SimulationData} from "./data";

let vehicles: THREE.Mesh[] = [];
let scene: THREE.Scene = null;
let renderer: THREE.Renderer = null;
let camera: THREE.PerspectiveCamera = null;

const statusElement = document.getElementById("status") as HTMLPreElement;
const trackedElement = document.getElementById("tracked") as HTMLPreElement;

/**
 * Creates the 3D scatter plot
 */
export function initializeVisualization(data: InitializationData) {
    // Set up the scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({
        antialias: true
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const sceneWidth = data.x_range[1] - data.x_range[0];
    const sceneHeight = data.y_range[1] - data.y_range[0];
    const sceneCenterX = (data.x_range[1] + data.x_range[0]) / 2;
    const sceneCenterY = (data.y_range[1] + data.y_range[0]) / 2;


    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(
        sceneWidth,
        sceneHeight,
        20,
        20);
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x888888, side: THREE.DoubleSide, wireframe: true });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = Math.PI / 2; // Make the ground horizontal
    scene.add(ground);

    // Set the camera position
    camera.position.set(sceneCenterX + sceneWidth/2, 10, sceneCenterY + sceneHeight/2);
    camera.lookAt(new THREE.Vector3(sceneCenterX, 0, sceneCenterY));

    // Create OrbitControls
    const controls = new MapControls(camera, renderer.domElement);
    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;


    // Create vehicles on the ground
    const vehicleGeometry = new THREE.SphereGeometry(0.1, 32, 32);
    const vehicleMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

    for (const _node of data.nodes) {
        const vehicle = new THREE.Mesh(vehicleGeometry, vehicleMaterial);
        vehicle.position.x = 0; // Random x position on the ground
        vehicle.position.y = 0; // Height above the ground
        vehicle.position.z = 0; // Random z position on the ground
        scene.add(vehicle);
        vehicles.push(vehicle);
    }

    // Animation function
    const animate = () => {
        if (scene == null) {
            return
        }
        requestAnimationFrame(animate);
        controls.update(); // Update controls

        renderer.render(scene, camera);
    };

    // Handle window resize
    window.addEventListener('resize', () => {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;

        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(newWidth, newHeight);
    });

    // Start the animation loop
    animate();
}

function formatTime(time: number) {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 1000);

    const formattedMinutes = minutes.toLocaleString(undefined, {minimumIntegerDigits: 2})
    const formattedSeconds = seconds.toLocaleString(undefined, {minimumIntegerDigits: 2})
    return `${formattedMinutes}:${formattedSeconds}:${milliseconds}`
}


/**
 * Animates the plot with new data
 */
export function update(data: SimulationData) {
    if (scene == null) {
        return
    }

    // Update the vehicle positions
    for (let i = 0; i < vehicles.length; i++) {
        const pos = data.positions[i];
        vehicles[i].position.x = pos[0];
        vehicles[i].position.y = pos[2];
        vehicles[i].position.z = pos[1];
    }

    let trackedVariableStrings = "------------------------\n"

    let index = 0;
    for (const tracked of data.tracked_variables) {
        trackedVariableStrings += `Node ${index}\n${JSON.stringify(tracked, undefined, 2)}\n\n`
        trackedVariableStrings += "------------------------\n"
        index++
    }

    // Update the status text
    statusElement.innerText =
`Simulation time: ${formatTime(data.simulation_time)}
Real time: ${formatTime(data.real_time)}`

    trackedElement.innerText = `Tracked variables:\n${trackedVariableStrings}`

}

export function finalizeVisualization() {
    vehicles = []
    scene?.clear()
    renderer?.render(scene, camera)

    renderer?.domElement.remove()

    renderer = null
    camera = null
    scene = null
}