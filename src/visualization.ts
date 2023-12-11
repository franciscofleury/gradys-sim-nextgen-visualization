import * as THREE from 'three'
// @ts-ignore
import { MapControls } from 'three/addons/controls/MapControls.js';
import {InitializationData, SimulationData} from "./data";

let vehicles: THREE.Mesh[] = [];
let scene: THREE.Scene = null;
let renderer: THREE.Renderer = null;
let camera: THREE.PerspectiveCamera = null;

let resizeEvent: () => void = null;

const statusElement = document.getElementById("status") as HTMLPreElement;
const trackedElement = document.getElementById("tracked") as HTMLPreElement;
const colorForm = document.getElementById("color-form") as HTMLFormElement;
const nodeSelectElement= document.getElementById("nodes") as HTMLSelectElement;


colorForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const formData = new FormData(colorForm)
    const color = formData.get("node-color") as string
    const nodes = formData.getAll("nodes").map(n => parseInt(n as string))

    for (const node of nodes) {
        vehicles[node].material = new THREE.MeshBasicMaterial({ color: color });
    }
})


export function initializeVisualization(data: InitializationData) {
    // Set up the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color("#39d7ff")
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
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide, wireframe: true });
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
    const vehicleGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const vehicleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (const node of data.nodes) {
        const vehicle = new THREE.Mesh(vehicleGeometry, vehicleMaterial);
        vehicle.position.x = 0; // Random x position on the ground
        vehicle.position.y = 0; // Height above the ground
        vehicle.position.z = 0; // Random z position on the ground
        scene.add(vehicle);
        vehicles.push(vehicle);

        const selectOption = document.createElement("option")
        selectOption.value = (vehicles.length - 1).toString()
        selectOption.innerText = node
        nodeSelectElement.appendChild(selectOption)
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

    resizeEvent = () => {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;

        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(newWidth, newHeight);
    }

    // Handle window resize
    window.addEventListener('resize', resizeEvent);

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
    while (scene?.children.length > 0) {
        // Dispose of the geometry and materials
        const mesh = scene.children[0] as THREE.Mesh;
        mesh?.geometry.dispose();
        const material = mesh?.material as THREE.Material;
        material.dispose();

        scene.remove(scene.children[0]);
    }
    renderer?.render(scene, camera)
    renderer?.domElement.remove()

    if (resizeEvent != null) {
        window.removeEventListener('resize', resizeEvent);
    }

    nodeSelectElement.innerHTML = ""

    renderer = null
    camera = null
    scene = null
}