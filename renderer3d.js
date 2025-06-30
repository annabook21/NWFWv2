import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const container = document.getElementById('canvas-3d');   // create this div in HTML
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a2a3a);

const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.set(40, 40, 40);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

// Controls
let controls;
try {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);
} catch (e) {
    console.warn('OrbitControls failed, falling back.', e);
}

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(20, 40, 20);
scene.add(dirLight);

// Helpers (grid & axes)
const grid = new THREE.GridHelper(100, 20, 0x444444, 0x222222);
scene.add(grid);
const axes = new THREE.AxesHelper(10);
scene.add(axes);

// ================= Utility Functions =================
function clearScene() {
    // Preserve camera, lights, grid, axes
    const preserve = new Set([grid.uuid, dirLight.uuid, axes.uuid]);
    scene.children.slice().forEach(obj => {
        if (!preserve.has(obj.uuid) && !(obj instanceof THREE.Camera) && obj !== grid && obj !== dirLight && obj !== axes) {
            scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        }
    });
}

function createBox(w, h, d, color) {
    const mat = new THREE.MeshStandardMaterial({ color });
    const geo = new THREE.BoxGeometry(w, h, d);
    return new THREE.Mesh(geo, mat);
}

function createCylinder(r, h, color) {
    const mat = new THREE.MeshStandardMaterial({ color });
    const geo = new THREE.CylinderGeometry(r, r, h, 32);
    return new THREE.Mesh(geo, mat);
}

function createSphere(r, color) {
    const mat = new THREE.MeshStandardMaterial({ color });
    const geo = new THREE.SphereGeometry(r, 32, 32);
    return new THREE.Mesh(geo, mat);
}

function createLabel(text, color = '#ffffff') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = '24px Arial';
    const textWidth = ctx.measureText(text).width;
    canvas.width = textWidth + 10;
    canvas.height = 32;
    ctx.font = '24px Arial';
    ctx.fillStyle = color;
    ctx.fillText(text, 5, 24);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(canvas.width / 20, canvas.height / 20, 1);
    return sprite;
}

function addConnection(p1, p2, color = 0xffff00) {
    const points = [new THREE.Vector3(...p1), new THREE.Vector3(...p2)];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
}

// ================= Model Builders =================
function buildCentralizedModel() {
    clearScene();

    // --- Helper: House (VPC) ---
    function createHouseVPC({x, y, z, color, label, vpcRouteTable, rooms}) {
        // House base
        const base = new THREE.Mesh(
            new THREE.BoxGeometry(8, 3, 6),
            new THREE.MeshStandardMaterial({ color, roughness: 0.5 })
        );
        base.position.set(x, y + 1.5, z);

        // Roof (triangular prism)
        const roofGeo = new THREE.ConeGeometry(5, 2, 4);
        const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: 0x8d5524 }));
        roof.position.set(x, y + 4, z);
        roof.rotation.y = Math.PI / 4;

        // Door
        const door = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1.5, 0.2),
            new THREE.MeshStandardMaterial({ color: 0xdeb887 })
        );
        door.position.set(x, y + 0.75, z + 3.1);

        // Windows
        const window1 = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.8, 0.1),
            new THREE.MeshStandardMaterial({ color: 0x87ceeb, transparent: true, opacity: 0.7 })
        );
        window1.position.set(x - 2, y + 2, z + 3.05);
        const window2 = window1.clone();
        window2.position.set(x + 2, y + 2, z + 3.05);

        // Label
        const vpcLabel = createLabel(label, "#fff");
        vpcLabel.position.set(x, y + 6, z);

        // Group
        const group = new THREE.Group();
        group.add(base, roof, door, window1, window2, vpcLabel);

        // --- Interactivity: click house to show VPC route table
        group.cursor = "pointer";
        group.onClick = () => showRouteTablePanel(group, vpcRouteTable, label);

        // --- Rooms (subnets) ---
        rooms.forEach((room, idx) => {
            // Room as a box inside the house
            const roomBox = new THREE.Mesh(
                new THREE.BoxGeometry(2.5, 1.5, 2.5),
                new THREE.MeshStandardMaterial({ color: room.color, opacity: 0.7, transparent: true })
            );
            // Arrange rooms in a grid inside the house
            const rx = x + (idx === 0 ? -2 : 2);
            const rz = z;
            roomBox.position.set(rx, y + 1.5, rz);

            // Room label
            const roomLabel = createLabel(room.label, "#222");
            roomLabel.position.set(rx, y + 3.2, rz);

            // Interactivity: click room to show subnet route table
            roomBox.cursor = "pointer";
            roomBox.onClick = () => showRouteTablePanel(roomBox, room.subnetRouteTable, room.label);

            group.add(roomBox, roomLabel);

            // --- Firewall endpoint (shield) ---
            if (room.hasFirewall) {
                // Shield: stylized 3D object
                const shield = new THREE.Group();
                const shieldBody = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.5, 1, 1.5, 32, 1, false, 0, Math.PI),
                    new THREE.MeshStandardMaterial({ color: 0xf44336, metalness: 0.6, roughness: 0.2 })
                );
                shieldBody.rotation.z = Math.PI;
                shieldBody.position.y = 0.75;
                const shieldFace = new THREE.Mesh(
                    new THREE.CircleGeometry(0.7, 32),
                    new THREE.MeshStandardMaterial({ color: 0xffe082, metalness: 0.8, roughness: 0.1 })
                );
                shieldFace.position.z = 0.01;
                shieldFace.position.y = 1.1;
                shield.add(shieldBody, shieldFace);
                shield.position.set(rx, y + 2.2, rz);
                shield.userData = { type: "firewall", label: "Firewall Endpoint", routeTable: room.firewallRouteTable };

                // Shield label
                const shieldLabel = createLabel("Firewall", "#f44336");
                shieldLabel.position.set(rx, y + 3.7, rz);

                // Interactivity: click shield to show firewall route table
                shield.cursor = "pointer";
                shield.onClick = () => showRouteTablePanel(shield, room.firewallRouteTable, "Firewall Endpoint");

                group.add(shield, shieldLabel);
            }
        });

        scene.add(group);
        return group;
    }

    // --- Route Table HTML ---
    const inspVpcRouteTable = `
        <b>Inspection VPC Route Table</b>
        <ul>
            <li>0.0.0.0/0 → Firewall Subnet</li>
            <li>Spoke VPC CIDRs → TGW</li>
        </ul>
    `;
    const firewallSubnetRouteTable = `
        <b>Firewall Subnet Route Table</b>
        <ul>
            <li>0.0.0.0/0 → Firewall Endpoint</li>
            <li>Spoke VPC CIDRs → TGW</li>
        </ul>
    `;
    const firewallEndpointTable = `
        <b>Firewall Endpoint</b>
        <ul>
            <li>Stateful/Stateless Rules</li>
            <li>HOME_NET: All VPC CIDRs</li>
        </ul>
    `;
    const spokeVpcRouteTable = `
        <b>Spoke VPC Route Table</b>
        <ul>
            <li>0.0.0.0/0 → TGW</li>
            <li>Local VPC CIDR → Local</li>
        </ul>
    `;
    const workloadSubnetTable = `
        <b>Workload Subnet Route Table</b>
        <ul>
            <li>0.0.0.0/0 → TGW</li>
            <li>Local VPC CIDR → Local</li>
        </ul>
    `;

    // --- Centralized Model Layout ---
    // Inspection VPC (center)
    createHouseVPC({
        x: 0, y: 0, z: 0,
        color: 0x4caf50,
        label: "Inspection VPC",
        vpcRouteTable: inspVpcRouteTable,
        rooms: [
            { label: "Firewall Subnet A", color: 0xfff9c4, hasFirewall: true, subnetRouteTable: firewallSubnetRouteTable, firewallRouteTable: firewallEndpointTable },
            { label: "Firewall Subnet B", color: 0xfff9c4, hasFirewall: true, subnetRouteTable: firewallSubnetRouteTable, firewallRouteTable: firewallEndpointTable }
        ]
    });

    // Spoke VPCs (left/right)
    createHouseVPC({
        x: -18, y: 0, z: -10,
        color: 0x2196f3,
        label: "Spoke VPC A",
        vpcRouteTable: spokeVpcRouteTable,
        rooms: [
            { label: "Workload Subnet", color: 0xbbdefb, hasFirewall: false, subnetRouteTable: workloadSubnetTable }
        ]
    });
    createHouseVPC({
        x: 18, y: 0, z: -10,
        color: 0xff9800,
        label: "Spoke VPC B",
        vpcRouteTable: spokeVpcRouteTable,
        rooms: [
            { label: "Workload Subnet", color: 0xffe0b2, hasFirewall: false, subnetRouteTable: workloadSubnetTable }
        ]
    });

    // IGW (satellite dish)
    const igw = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 32, 32),
        new THREE.MeshStandardMaterial({ color: 0x90caf9 })
    );
    igw.position.set(0, 2, 12);
    scene.add(igw);
    const igwLabel = createLabel("IGW", "#2196f3");
    igwLabel.position.set(0, 4, 12);
    scene.add(igwLabel);

    // TGW (roundabout)
    const tgw = new THREE.Mesh(
        new THREE.TorusGeometry(2, 0.4, 16, 100),
        new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
    );
    tgw.position.set(0, 1, 6);
    scene.add(tgw);
    const tgwLabel = createLabel("TGW", "#666");
    tgwLabel.position.set(0, 3, 6);
    scene.add(tgwLabel);

    // Connections (lines)
    addConnection([0, 2, 12], [0, 1, 6], 0x2196f3); // IGW to TGW
    addConnection([0, 1, 6], [0, 1.5, 0], 0x4caf50); // TGW to Inspection VPC
    addConnection([0, 1, 6], [-18, 1.5, -10], 0x2196f3); // TGW to Spoke A
    addConnection([0, 1, 6], [18, 1.5, -10], 0x2196f3); // TGW to Spoke B
}

// --- Route Table Panel Logic ---
function showRouteTablePanel(object, html, title) {
    const panel = document.getElementById('route-table-panel');
    panel.innerHTML = `<h3 style="margin-top:0">${title}</h3>${html}`;
    panel.style.display = 'block';

    // Project 3D position to 2D screen
    const pos = object.position || (object.parent && object.parent.position) || new THREE.Vector3();
    const vector = pos.clone().project(camera);
    const x = (vector.x * 0.5 + 0.5) * container.clientWidth;
    const y = (-vector.y * 0.5 + 0.5) * container.clientHeight;
    panel.style.left = `${x + 20}px`;
    panel.style.top = `${y - 20}px`;
}

// --- Interactivity: Raycaster for clicks ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
renderer.domElement.addEventListener('click', (event) => {
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    for (let i = 0; i < intersects.length; i++) {
        const obj = intersects[i].object;
        if (obj.onClick) {
            obj.onClick();
            return;
        }
        if (obj.parent && obj.parent.onClick) {
            obj.parent.onClick();
            return;
        }
    }
    // Clicked empty space: hide panel
    document.getElementById('route-table-panel').style.display = 'none';
});

// ================= Model Selector Hook =================

// On page load, show the default model
buildCentralizedModel();

// On model selector change, load the selected model
document.getElementById('modelSelect').addEventListener('change', (e) => {
    const model = e.target.value;
    if (model === 'centralized') buildCentralizedModel();
    // Add more models as you implement them
});

// ================= Animation Loop =================
function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    renderer.render(scene, camera);
}
animate();