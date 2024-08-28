import * as THREE from 'three'
// @ts-ignore
import { MapControls } from 'three/addons/controls/MapControls.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import {InitializationData, SimulationData, VisualizationCommand} from "./data";

interface Node {
    mesh: THREE.Mesh;
    text: TextGeometry;
}

let nodes: string[] = [];
let vehicles: Record<string, Node> = {};
let scene: THREE.Scene = null;
let renderer: THREE.Renderer = null;
let camera: THREE.PerspectiveCamera = null;
let font = null;
let nodeSize = 0.1;

let resizeEvent: () => void = null;

const statusElement = document.getElementById("status") as HTMLPreElement;
const trackedElement = document.getElementById("tracked") as HTMLPreElement;
const colorForm = document.getElementById("color-form") as HTMLFormElement;
const environmentForm = document.getElementById("environment-form") as HTMLFormElement;
const nodeSelectElement= document.getElementById("nodes") as HTMLSelectElement;


colorForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const formData = new FormData(colorForm)
    const color = formData.get("node-color") as string
    const nodes = formData.getAll("nodes").map(n => n as string)

    for (const node of nodes) {
        vehicles[node].mesh.material = new THREE.MeshBasicMaterial({ color: color });

        localStorage.setItem(`${node}-color`, color)
    }
})

environmentForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = new FormData(environmentForm);
    const bgColor = formData.get("background-color") as string
    nodeSize = parseFloat(formData.get("node-size") as string)

    scene.background = new THREE.Color(bgColor)
    
    for (const vehicle of Object.values(vehicles)) {
        vehicle.mesh.geometry = new THREE.SphereGeometry(nodeSize, 32, 32);
    }

    localStorage.setItem("environment-background-color", bgColor)
    localStorage.setItem("environment-node-size", nodeSize.toString())
})

function loadStoredConfigs() {
    const bgColor = localStorage.getItem("environment-background-color")
    const nodeSizeStored = localStorage.getItem("environment-node-size")
    nodeSize = nodeSizeStored !== null ? parseFloat(nodeSizeStored) : null

    if (bgColor !== null) {
        scene.background = new THREE.Color(bgColor)
    }

    for(const node of nodes) {
        const color = localStorage.getItem(`${node}-color`)
        if (color != null) {
            vehicles[node].mesh.material = new THREE.MeshBasicMaterial({ color: color });

        }
        if (nodeSize != null) {
            vehicles[node].mesh.geometry = new THREE.SphereGeometry(nodeSize, 32, 32);
        }
    }
}


export function initializeVisualization(data: InitializationData) {
    nodes = data.nodes;

    let loader = new FontLoader();
    loader.load('node_modules/three/examples/fonts/helvetiker_regular.typeface.json', function (f) {
        font = f;
    })

    // Set up the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color("#39d7ff")
    const sceneSize = Math.max(data.x_range[1] - data.x_range[0],
        data.y_range[1] - data.y_range[0],
        data.z_range[1] - data.z_range[0]) * 2;
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, sceneSize);
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
    camera.position.set(sceneCenterX + sceneWidth/2, data.z_range[1], sceneCenterY + sceneHeight/2);
    camera.lookAt(new THREE.Vector3(sceneCenterX, 0, sceneCenterY));

    // Create OrbitControls
    const controls = new MapControls(camera, renderer.domElement);
    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;


    // Create vehicles on the ground
    const vehicleGeometry = new THREE.SphereGeometry(0.1, 32, 32);
    const vehicleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (const node of data.nodes) {
        const vehicleMesh = new THREE.Mesh(vehicleGeometry, vehicleMaterial);
        vehicleMesh.position.x = 0; // Random x position on the ground
        vehicleMesh.position.y = 0; // Height above the ground
        vehicleMesh.position.z = 0; // Random z position on the ground
        scene.add(vehicleMesh);
        vehicles[node] = {
            mesh: vehicleMesh,
            text: null
        };

        const selectOption = document.createElement("option")
        selectOption.value = node
        selectOption.innerText = node
        nodeSelectElement.appendChild(selectOption)
    }

    loadStoredConfigs()

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
    nodes.forEach((node, i) => {
        const pos = data.positions[i];
        vehicles[node].mesh.position.x = pos[0];
        vehicles[node].mesh.position.y = pos[2];
        vehicles[node].mesh.position.z = pos[1];

        if (vehicles[node].text != null) {
            const obj = vehicles[node].text;
            const height = pos[2] + (nodeSize *2);

            obj.position.x = pos[0];
            obj.position.y = height;
            obj.position.z = pos[1];
            
            obj.lookAt(camera.position.x, height, camera.position.z);

            const translation_vector_x = (camera.position.z - obj.position.z) * (-1);
            const translation_vector_z = (camera.position.x - obj.position.x) * (+1);

            const translation_vector = new THREE.Vector3(translation_vector_x, obj.position.y, translation_vector_z);
            console.log(obj.position);
            obj.translateOnAxis(translation_vector, +0.1);
            console.log(obj.position);

        }
    })

    let trackedVariableStrings = "------------------------\n"

    let index = 0;
    for (const tracked of data.tracked_variables) {
        trackedVariableStrings += `${nodes[index]}\n${JSON.stringify(tracked, undefined, 2)}\n\n`
        trackedVariableStrings += "------------------------\n"
        index++
    }

    // Update the status text
    statusElement.innerText =
`Simulation time: ${formatTime(data.simulation_time)}
Real time: ${formatTime(data.real_time)}`

    trackedElement.innerText = `Tracked variables:\n${trackedVariableStrings}`
}

export function executeCommand(command: VisualizationCommand) {
    console.log(command);
    if (command.command === "paint_node") {
        console.log(command.payload);
        console.log("paint_node");
        const {node_id, color, show_id} = command.payload;
        const node = nodes[node_id];
        const rgbColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`
        vehicles[node].mesh.material = new THREE.MeshBasicMaterial({ color: rgbColor });
        if (vehicles[node].text != null) {
            vehicles[node].text = show_id? vehicles[node].text : null;
        } else if (show_id){
            vehicles[node].text = new THREE.Mesh(
                new TextGeometry(node, {font: font, size: 1, height:1, depth: 0.5}),
                new THREE.MeshBasicMaterial({ color: 'rgb(0, 0, 0)'})
            );
            vehicles[node].text.lookAt( camera.position );
            scene.add(vehicles[node].text);
        }
    } else if (command.command === "paint_environment") {
        const {color} = command.payload;
        scene.background = new THREE.Color(...color)
    } else if (command.command === "resize_nodes") {
        const {size} = command.payload;
        for (const vehicle of Object.values(vehicles)) {
            vehicle.mesh.geometry = new THREE.SphereGeometry(size, 32, 32);
        }
    }
}

export function finalizeVisualization() {
    vehicles = {};
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

    nodes = [];

    renderer = null
    camera = null
    scene = null
}

export function configureInteractions() {

}
