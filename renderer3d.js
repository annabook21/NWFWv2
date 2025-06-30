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

// Global array to track all subnet meshes for hover
const allSubnetMeshes = [];

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
        // Open-top, open-front house: four thin side walls and a floor
        const vpcWidth = 12;
        const vpcDepth = 9;
        const vpcHeight = 3;
        const wallThickness = 0.3;
        const wallHeight = 2.5;
        // Floor
        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(vpcWidth, wallThickness, vpcDepth),
            new THREE.MeshStandardMaterial({ color, roughness: 0.5, opacity: 1, transparent: false })
        );
        floor.position.set(x, y + wallThickness / 2, z);
        // Left wall
        const leftWall = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness, wallHeight, vpcDepth),
            new THREE.MeshStandardMaterial({ color, roughness: 0.5, opacity: 1, transparent: false })
        );
        leftWall.position.set(x - vpcWidth / 2 + wallThickness / 2, y + wallHeight / 2, z);
        // Right wall
        const rightWall = leftWall.clone();
        rightWall.position.set(x + vpcWidth / 2 - wallThickness / 2, y + wallHeight / 2, z);
        // Back wall
        const backWall = new THREE.Mesh(
            new THREE.BoxGeometry(vpcWidth, wallHeight, wallThickness),
            new THREE.MeshStandardMaterial({ color, roughness: 0.5, opacity: 1, transparent: false })
        );
        backWall.position.set(x, y + wallHeight / 2, z - vpcDepth / 2 + wallThickness / 2);
        // Front wall (short, just a rim at the bottom for context)
        const frontWall = new THREE.Mesh(
            new THREE.BoxGeometry(vpcWidth, wallThickness, wallThickness),
            new THREE.MeshStandardMaterial({ color, roughness: 0.5, opacity: 1, transparent: false })
        );
        frontWall.position.set(x, y + wallThickness / 2, z + vpcDepth / 2 - wallThickness / 2);
        // Label
        const vpcLabel = createLabel(label, "#fff");
        vpcLabel.position.set(x, y + wallHeight + 1.2, z);
        // Group
        const group = new THREE.Group();
        group.add(floor, leftWall, rightWall, backWall, frontWall, vpcLabel);

        // --- Interactivity: click house to show VPC route table
        group.cursor = "pointer";
        group.onClick = () => showRouteTablePanel(group, vpcRouteTable, label);

        // --- Rooms (subnets) ---
        rooms.forEach((room, idx) => {
            // Room as a box inside the house
            const roomBox = new THREE.Mesh(
                new THREE.BoxGeometry(3.5, 1.5, 3.5),
                new THREE.MeshStandardMaterial({ color: room.color, opacity: 0.7, transparent: true })
            );
            // Arrange rooms in a grid inside the house (spread out for new VPC size)
            const rx = x + (idx === 0 ? -3 : 3);
            const rz = z;
            roomBox.position.set(rx, y + 1.5, rz);

            // Room label
            const roomLabel = createLabel(room.label, "#222");
            roomLabel.position.set(rx, y + 3.2, rz);

            // Interactivity: click room to show subnet route table
            roomBox.cursor = "pointer";
            roomBox.onClick = () => showRouteTablePanel(roomBox, room.subnetRouteTable, room.label);

            // --- HOVER EFFECT ---
            const origColor = room.color;
            const hoverColor = 0x333366;
            roomBox.onPointerOver = () => {
                roomBox.material.color.setHex(hoverColor);
                roomBox.material.opacity = 0.95;
            };
            roomBox.onPointerOut = () => {
                roomBox.material.color.set(origColor);
                roomBox.material.opacity = 0.7;
            };

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

            // Add to global subnet mesh array for hover
            allSubnetMeshes.push(roomBox);
        });

        scene.add(group);
        return group;
    }

    // --- Route Table HTML ---
    const inspVpcRouteTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Inspection VPC Route Table</div>
        <table class="route-table">
            <thead><tr><th>Destination</th><th>Target</th></tr></thead>
            <tbody>
                <tr><td>0.0.0.0/0</td><td>Firewall Subnet (subnet-0abc1234)</td></tr>
                <tr><td>10.1.0.0/16</td><td>TGW (tgw-0def5678)</td></tr>
            </tbody>
        </table>
    `;
    const firewallSubnetRouteTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Firewall Subnet Route Table</div>
        <table class="route-table">
            <thead><tr><th>Destination</th><th>Target</th></tr></thead>
            <tbody>
                <tr><td>0.0.0.0/0</td><td>Firewall Endpoint (vpce-a)</td></tr>
                <tr><td>10.1.0.0/16</td><td>TGW (tgw-0def5678)</td></tr>
            </tbody>
        </table>
    `;
    const firewallEndpointTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Firewall Endpoint</div>
        <ul style="margin:0 0 0 16px;padding:0;">
            <li>Stateful/Stateless Rules</li>
            <li>HOME_NET: All VPC CIDRs</li>
            <li>Inspects all traffic between VPCs and to/from internet</li>
        </ul>
    `;
    const spokeVpcRouteTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Spoke VPC Route Table</div>
        <table class="route-table">
            <thead><tr><th>Destination</th><th>Target</th></tr></thead>
            <tbody>
                <tr><td>0.0.0.0/0</td><td>TGW (tgw-0def5678)</td></tr>
                <tr><td>10.2.0.0/16</td><td>local</td></tr>
            </tbody>
        </table>
    `;
    const workloadSubnetTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Workload Subnet Route Table</div>
        <table class="route-table">
            <thead><tr><th>Destination</th><th>Target</th></tr></thead>
            <tbody>
                <tr><td>0.0.0.0/0</td><td>TGW (tgw-0def5678)</td></tr>
                <tr><td>10.2.0.0/16</td><td>local</td></tr>
            </tbody>
        </table>
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

function buildDecentralizedModel() {
    clearScene();

    // --- Helper: House (VPC) ---
    function createHouseVPC({x, y, z, color, label, vpcRouteTable, rooms}) {
        // Open-top, open-front house: four thin side walls and a floor
        const vpcWidth = 12;
        const vpcDepth = 9;
        const vpcHeight = 3;
        const wallThickness = 0.3;
        const wallHeight = 2.5;
        // Floor
        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(vpcWidth, wallThickness, vpcDepth),
            new THREE.MeshStandardMaterial({ color, roughness: 0.5, opacity: 1, transparent: false })
        );
        floor.position.set(x, y + wallThickness / 2, z);
        // Left wall
        const leftWall = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness, wallHeight, vpcDepth),
            new THREE.MeshStandardMaterial({ color, roughness: 0.5, opacity: 1, transparent: false })
        );
        leftWall.position.set(x - vpcWidth / 2 + wallThickness / 2, y + wallHeight / 2, z);
        // Right wall
        const rightWall = leftWall.clone();
        rightWall.position.set(x + vpcWidth / 2 - wallThickness / 2, y + wallHeight / 2, z);
        // Back wall
        const backWall = new THREE.Mesh(
            new THREE.BoxGeometry(vpcWidth, wallHeight, wallThickness),
            new THREE.MeshStandardMaterial({ color, roughness: 0.5, opacity: 1, transparent: false })
        );
        backWall.position.set(x, y + wallHeight / 2, z - vpcDepth / 2 + wallThickness / 2);
        // Front wall (short, just a rim at the bottom for context)
        const frontWall = new THREE.Mesh(
            new THREE.BoxGeometry(vpcWidth, wallThickness, wallThickness),
            new THREE.MeshStandardMaterial({ color, roughness: 0.5, opacity: 1, transparent: false })
        );
        frontWall.position.set(x, y + wallThickness / 2, z + vpcDepth / 2 - wallThickness / 2);
        // Label
        const vpcLabel = createLabel(label, "#fff");
        vpcLabel.position.set(x, y + wallHeight + 1.2, z);
        // Group
        const group = new THREE.Group();
        group.add(floor, leftWall, rightWall, backWall, frontWall, vpcLabel);

        // --- Interactivity: click house to show VPC route table
        group.cursor = "pointer";
        group.onClick = () => showRouteTablePanel(group, vpcRouteTable, label);

        // --- Rooms (subnets) ---
        rooms.forEach((room, idx) => {
            // Room as a box inside the house
            const roomBox = new THREE.Mesh(
                new THREE.BoxGeometry(3.5, 1.5, 3.5),
                new THREE.MeshStandardMaterial({ color: room.color, opacity: 0.7, transparent: true })
            );
            // Arrange rooms in a grid inside the house (spread out for new VPC size)
            const rx = x + (idx === 0 ? -3 : 3);
            const rz = z;
            roomBox.position.set(rx, y + 1.5, rz);

            // Room label
            const roomLabel = createLabel(room.label, "#222");
            roomLabel.position.set(rx, y + 3.2, rz);

            // Interactivity: click room to show subnet route table
            roomBox.cursor = "pointer";
            roomBox.onClick = () => showRouteTablePanel(roomBox, room.subnetRouteTable, room.label);

            // --- HOVER EFFECT ---
            const origColor = room.color;
            const hoverColor = 0x333366;
            roomBox.onPointerOver = () => {
                roomBox.material.color.setHex(hoverColor);
                roomBox.material.opacity = 0.95;
            };
            roomBox.onPointerOut = () => {
                roomBox.material.color.set(origColor);
                roomBox.material.opacity = 0.7;
            };

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

            // Add to global subnet mesh array for hover
            allSubnetMeshes.push(roomBox);
        });

        scene.add(group);
        return group;
    }

    // --- Route Table HTML for Decentralized Model (detailed, PDF-style) ---
    const igwRouteTable = `
        <div style="margin-bottom:8px;font-weight:bold;">IGW Ingress Route Table</div>
        <table class="route-table">
            <thead><tr><th>Destination</th><th>Target</th></tr></thead>
            <tbody>
                <tr><td>10.0.0.0/16</td><td>local</td></tr>
                <tr><td>10.0.0.0/24</td><td>vpce-id</td></tr>
            </tbody>
        </table>
    `;
    const firewallSubnetRouteTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Firewall Subnet Route Table</div>
        <table class="route-table">
            <thead><tr><th>Destination</th><th>Target</th></tr></thead>
            <tbody>
                <tr><td>10.0.0.0/16</td><td>local</td></tr>
                <tr><td>0.0.0.0/0</td><td>igw-id</td></tr>
            </tbody>
        </table>
    `;
    // Example for AZ A; in a real multi-AZ, you'd show per-AZ tables
    const protectedSubnetRouteTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Protected Subnet Route Table</div>
        <table class="route-table">
            <thead><tr><th>Destination</th><th>Target</th></tr></thead>
            <tbody>
                <tr><td>10.0.0.0/16</td><td>local</td></tr>
                <tr><td>0.0.0.0/0</td><td>vpce-id</td></tr>
            </tbody>
        </table>
    `;
    const firewallEndpointTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Firewall Endpoint</div>
        <ul style="margin:0 0 0 16px;padding:0;">
            <li>Stateful/Stateless Rules</li>
            <li>HOME_NET: Protected Subnet CIDR</li>
            <li>Inspect inbound/outbound traffic</li>
        </ul>
    `;

    // --- Decentralized Model Layout ---
    // Internet/Cloud at the top
    const internet = new THREE.Mesh(
        new THREE.SphereGeometry(2, 32, 32),
        new THREE.MeshStandardMaterial({ color: 0x90caf9, transparent: true, opacity: 0.8 })
    );
    internet.position.set(0, 8, 0);
    scene.add(internet);
    const internetLabel = createLabel("Internet", "#2196f3");
    internetLabel.position.set(0, 11, 0);
    scene.add(internetLabel);

    // Protected VPCs (each with their own firewall)
    const vpcPositions = [
        { x: -15, y: 0, z: -8, color: 0x4caf50, label: "Protected VPC A" },
        { x: 15, y: 0, z: -8, color: 0x2196f3, label: "Protected VPC B" },
        { x: -15, y: 0, z: 8, color: 0xff9800, label: "Protected VPC C" },
        { x: 15, y: 0, z: 8, color: 0x9c27b0, label: "Protected VPC D" }
    ];

    vpcPositions.forEach((vpc, idx) => {
        createHouseVPC({
            x: vpc.x, y: vpc.y, z: vpc.z,
            color: vpc.color,
            label: vpc.label,
            vpcRouteTable: protectedSubnetRouteTable, // Show protected subnet table for house click
            rooms: [
                { 
                    label: "Protected Subnet (10.0.0.0/24)", 
                    color: 0xfff9c4, 
                    hasFirewall: false, 
                    subnetRouteTable: protectedSubnetRouteTable 
                },
                { 
                    label: "Firewall Subnet (10.0.1.0/28)", 
                    color: 0xffcdd2, 
                    hasFirewall: true, 
                    subnetRouteTable: firewallSubnetRouteTable, 
                    firewallRouteTable: firewallEndpointTable 
                }
            ]
        });

        // IGW for each VPC
        const igw = new THREE.Mesh(
            new THREE.SphereGeometry(0.8, 32, 32),
            new THREE.MeshStandardMaterial({ color: 0x90caf9 })
        );
        igw.position.set(vpc.x, 2, vpc.z);
        igw.cursor = "pointer";
        igw.onClick = () => showRouteTablePanel(igw, igwRouteTable, "Internet Gateway");
        scene.add(igw);

        const igwLabel = createLabel("IGW", "#2196f3");
        igwLabel.position.set(vpc.x, 4, vpc.z);
        scene.add(igwLabel);

        // Connections: Internet to IGW to VPC
        addConnection([0, 8, 0], [vpc.x, 2, vpc.z], 0x2196f3); // Internet to IGW
        addConnection([vpc.x, 2, vpc.z], [vpc.x, 1.5, vpc.z], 0x4caf50); // IGW to VPC
    });

    // Add title
    const title = createLabel("Decentralized: Each VPC has its own firewall", "#fff");
    title.position.set(0, -8, 0);
    scene.add(title);
}

function buildCombinedModel() {
    clearScene();

    // --- Helper: House (VPC) ---
    function createHouseVPC({x, y, z, color, label, vpcRouteTable, rooms}) {
        // Open-top, open-front house: four thin side walls and a floor
        const vpcWidth = 12;
        const vpcDepth = 9;
        const vpcHeight = 3;
        const wallThickness = 0.3;
        const wallHeight = 2.5;
        // Floor
        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(vpcWidth, wallThickness, vpcDepth),
            new THREE.MeshStandardMaterial({ color, roughness: 0.5, opacity: 1, transparent: false })
        );
        floor.position.set(x, y + wallThickness / 2, z);
        // Left wall
        const leftWall = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness, wallHeight, vpcDepth),
            new THREE.MeshStandardMaterial({ color, roughness: 0.5, opacity: 1, transparent: false })
        );
        leftWall.position.set(x - vpcWidth / 2 + wallThickness / 2, y + wallHeight / 2, z);
        // Right wall
        const rightWall = leftWall.clone();
        rightWall.position.set(x + vpcWidth / 2 - wallThickness / 2, y + wallHeight / 2, z);
        // Back wall
        const backWall = new THREE.Mesh(
            new THREE.BoxGeometry(vpcWidth, wallHeight, wallThickness),
            new THREE.MeshStandardMaterial({ color, roughness: 0.5, opacity: 1, transparent: false })
        );
        backWall.position.set(x, y + wallHeight / 2, z - vpcDepth / 2 + wallThickness / 2);
        // Front wall (short, just a rim at the bottom for context)
        const frontWall = new THREE.Mesh(
            new THREE.BoxGeometry(vpcWidth, wallThickness, wallThickness),
            new THREE.MeshStandardMaterial({ color, roughness: 0.5, opacity: 1, transparent: false })
        );
        frontWall.position.set(x, y + wallThickness / 2, z + vpcDepth / 2 - wallThickness / 2);
        // Label
        const vpcLabel = createLabel(label, "#fff");
        vpcLabel.position.set(x, y + wallHeight + 1.2, z);
        // Group
        const group = new THREE.Group();
        group.add(floor, leftWall, rightWall, backWall, frontWall, vpcLabel);

        // --- Interactivity: click house to show VPC route table
        group.cursor = "pointer";
        group.onClick = () => showRouteTablePanel(group, vpcRouteTable, label);

        // --- Rooms (subnets) ---
        rooms.forEach((room, idx) => {
            // Room as a box inside the house
            const roomBox = new THREE.Mesh(
                new THREE.BoxGeometry(3.5, 1.5, 3.5),
                new THREE.MeshStandardMaterial({ color: room.color, opacity: 0.7, transparent: true })
            );
            // Arrange rooms in a grid inside the house (spread out for new VPC size)
            const rx = x + (idx === 0 ? -3 : 3);
            const rz = z;
            roomBox.position.set(rx, y + 1.5, rz);

            // Room label
            const roomLabel = createLabel(room.label, "#222");
            roomLabel.position.set(rx, y + 3.2, rz);

            // Interactivity: click room to show subnet route table
            roomBox.cursor = "pointer";
            roomBox.onClick = () => showRouteTablePanel(roomBox, room.subnetRouteTable, room.label);

            // --- HOVER EFFECT ---
            const origColor = room.color;
            const hoverColor = 0x333366;
            roomBox.onPointerOver = () => {
                roomBox.material.color.setHex(hoverColor);
                roomBox.material.opacity = 0.95;
            };
            roomBox.onPointerOut = () => {
                roomBox.material.color.set(origColor);
                roomBox.material.opacity = 0.7;
            };

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

            // Add to global subnet mesh array for hover
            allSubnetMeshes.push(roomBox);
        });

        scene.add(group);
        return group;
    }

    // --- Route Table HTML for Combined Model ---
    const centralVpcRouteTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Central Inspection VPC Route Table</div>
        <table class="route-table">
            <thead><tr><th>Destination</th><th>Target</th></tr></thead>
            <tbody>
                <tr><td>0.0.0.0/0</td><td>Firewall Subnet (subnet-0abc1234)</td></tr>
                <tr><td>10.1.0.0/16</td><td>TGW (tgw-0def5678)</td></tr>
            </tbody>
        </table>
    `;
    const spokeVpcRouteTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Spoke VPC Route Table</div>
        <table class="route-table">
            <thead><tr><th>Destination</th><th>Target</th></tr></thead>
            <tbody>
                <tr><td>0.0.0.0/0</td><td>TGW (tgw-0def5678)</td></tr>
                <tr><td>10.2.0.0/16</td><td>local</td></tr>
            </tbody>
        </table>
    `;
    const spokeWithLocalRouteTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Spoke VPC Route Table (with local IGW)</div>
        <table class="route-table">
            <thead><tr><th>Destination</th><th>Target</th></tr></thead>
            <tbody>
                <tr><td>0.0.0.0/0</td><td>Local Firewall (vpce-b)</td></tr>
                <tr><td>10.3.0.0/16</td><td>TGW (tgw-0def5678)</td></tr>
                <tr><td>10.3.0.0/16</td><td>local</td></tr>
            </tbody>
        </table>
    `;
    const centralFirewallSubnetTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Central Firewall Subnet Route Table</div>
        <table class="route-table">
            <thead><tr><th>Destination</th><th>Target</th></tr></thead>
            <tbody>
                <tr><td>0.0.0.0/0</td><td>Firewall Endpoint (vpce-a)</td></tr>
                <tr><td>10.1.0.0/16</td><td>TGW (tgw-0def5678)</td></tr>
            </tbody>
        </table>
    `;
    const localFirewallSubnetTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Local Firewall Subnet Route Table</div>
        <table class="route-table">
            <thead><tr><th>Destination</th><th>Target</th></tr></thead>
            <tbody>
                <tr><td>0.0.0.0/0</td><td>Internet Gateway (igw-0a1b2c3d)</td></tr>
                <tr><td>10.3.0.0/16</td><td>local</td></tr>
            </tbody>
        </table>
    `;
    const centralFirewallTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Central Firewall Endpoint</div>
        <ul style="margin:0 0 0 16px;padding:0;">
            <li>Stateful/Stateless Rules</li>
            <li>HOME_NET: All VPC CIDRs</li>
            <li>Inspect East-West traffic</li>
        </ul>
    `;
    const localFirewallTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Local Firewall Endpoint</div>
        <ul style="margin:0 0 0 16px;padding:0;">
            <li>Stateful/Stateless Rules</li>
            <li>HOME_NET: Local VPC CIDR</li>
            <li>Inspect North-South traffic</li>
        </ul>
    `;
    const workloadSubnetTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Workload Subnet Route Table</div>
        <table class="route-table">
            <thead><tr><th>Destination</th><th>Target</th></tr></thead>
            <tbody>
                <tr><td>0.0.0.0/0</td><td>TGW (tgw-0def5678)</td></tr>
                <tr><td>10.2.0.0/16</td><td>local</td></tr>
            </tbody>
        </table>
    `;
    const protectedSubnetTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Protected Subnet Route Table</div>
        <table class="route-table">
            <thead><tr><th>Destination</th><th>Target</th></tr></thead>
            <tbody>
                <tr><td>0.0.0.0/0</td><td>Local Firewall Endpoint (vpce-b)</td></tr>
                <tr><td>10.3.0.0/16</td><td>local</td></tr>
            </tbody>
        </table>
    `;

    // --- Combined Model Layout ---
    // Central Inspection VPC (center)
    createHouseVPC({
        x: 0, y: 0, z: 0,
        color: 0x4caf50,
        label: "Central Inspection VPC",
        vpcRouteTable: centralVpcRouteTable,
        rooms: [
            { 
                label: "Firewall Subnet A", 
                color: 0xfff9c4, 
                hasFirewall: true, 
                subnetRouteTable: centralFirewallSubnetTable, 
                firewallRouteTable: centralFirewallTable 
            },
            { 
                label: "Firewall Subnet B", 
                color: 0xfff9c4, 
                hasFirewall: true, 
                subnetRouteTable: centralFirewallSubnetTable, 
                firewallRouteTable: centralFirewallTable 
            }
        ]
    });

    // Spoke VPC A (left) - Centralized only
    createHouseVPC({
        x: -18, y: 0, z: -10,
        color: 0x2196f3,
        label: "Spoke VPC A (Centralized)",
        vpcRouteTable: spokeVpcRouteTable,
        rooms: [
            { 
                label: "Workload Subnet", 
                color: 0xbbdefb, 
                hasFirewall: false, 
                subnetRouteTable: workloadSubnetTable 
            }
        ]
    });

    // Spoke VPC B (right) - Combined (has local firewall)
    createHouseVPC({
        x: 18, y: 0, z: -10,
        color: 0xff9800,
        label: "Spoke VPC B (Combined)",
        vpcRouteTable: spokeWithLocalRouteTable,
        rooms: [
            { 
                label: "Protected Subnet", 
                color: 0xfff9c4, 
                hasFirewall: false, 
                subnetRouteTable: protectedSubnetTable 
            },
            { 
                label: "Local Firewall Subnet", 
                color: 0xffcdd2, 
                hasFirewall: true, 
                subnetRouteTable: localFirewallSubnetTable, 
                firewallRouteTable: localFirewallTable 
            }
        ]
    });

    // Central IGW (for central inspection)
    const centralIgw = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 32, 32),
        new THREE.MeshStandardMaterial({ color: 0x90caf9 })
    );
    centralIgw.position.set(0, 2, 12);
    scene.add(centralIgw);
    const centralIgwLabel = createLabel("Central IGW", "#2196f3");
    centralIgwLabel.position.set(0, 4, 12);
    scene.add(centralIgwLabel);

    // Local IGW (for Spoke VPC B)
    const localIgw = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 32, 32),
        new THREE.MeshStandardMaterial({ color: 0x90caf9 })
    );
    localIgw.position.set(18, 2, 12);
    scene.add(localIgw);
    const localIgwLabel = createLabel("Local IGW", "#2196f3");
    localIgwLabel.position.set(18, 4, 12);
    scene.add(localIgwLabel);

    // TGW (roundabout) - for East-West traffic
    const tgw = new THREE.Mesh(
        new THREE.TorusGeometry(2, 0.4, 16, 100),
        new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
    );
    tgw.position.set(0, 1, 6);
    scene.add(tgw);
    const tgwLabel = createLabel("TGW", "#666");
    tgwLabel.position.set(0, 3, 6);
    scene.add(tgwLabel);

    // Connections
    // Central IGW to TGW
    addConnection([0, 2, 12], [0, 1, 6], 0x2196f3);
    // TGW to Central Inspection VPC
    addConnection([0, 1, 6], [0, 1.5, 0], 0x4caf50);
    // TGW to Spoke VPC A (East-West)
    addConnection([0, 1, 6], [-18, 1.5, -10], 0x2196f3);
    // TGW to Spoke VPC B (East-West)
    addConnection([0, 1, 6], [18, 1.5, -10], 0x2196f3);
    // Local IGW to Spoke VPC B (North-South)
    addConnection([18, 2, 12], [18, 1.5, -10], 0xff9800);

    // Add traffic flow labels
    const eastWestLabel = createLabel("East-West Traffic", "#4caf50");
    eastWestLabel.position.set(-8, 5, 0);
    scene.add(eastWestLabel);

    const northSouthLabel = createLabel("North-South Traffic", "#ff5722");
    northSouthLabel.position.set(18, 5, 0);
    scene.add(northSouthLabel);

    // Add title
    const title = createLabel("Combined: Central East-West + Local North-South", "#fff");
    title.position.set(0, -8, 0);
    scene.add(title);
}

function buildNorthSouthIngressModel() {
    clearScene();

    // --- Helper: House (VPC) ---
    function createHouseVPC({x, y, z, color, label, vpcRouteTable, rooms}) {
        // Open-top, open-front house: four thin side walls and a floor
        const vpcWidth = 12;
        const vpcDepth = 9;
        const vpcHeight = 3;
        const wallThickness = 0.3;
        const wallHeight = 2.5;
        // Floor
        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(vpcWidth, wallThickness, vpcDepth),
            new THREE.MeshStandardMaterial({ color, roughness: 0.5, opacity: 1, transparent: false })
        );
        floor.position.set(x, y + wallThickness / 2, z);
        // Left wall
        const leftWall = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness, wallHeight, vpcDepth),
            new THREE.MeshStandardMaterial({ color, roughness: 0.5, opacity: 1, transparent: false })
        );
        leftWall.position.set(x - vpcWidth / 2 + wallThickness / 2, y + wallHeight / 2, z);
        // Right wall
        const rightWall = leftWall.clone();
        rightWall.position.set(x + vpcWidth / 2 - wallThickness / 2, y + wallHeight / 2, z);
        // Back wall
        const backWall = new THREE.Mesh(
            new THREE.BoxGeometry(vpcWidth, wallHeight, wallThickness),
            new THREE.MeshStandardMaterial({ color, roughness: 0.5, opacity: 1, transparent: false })
        );
        backWall.position.set(x, y + wallHeight / 2, z - vpcDepth / 2 + wallThickness / 2);
        // Front wall (short, just a rim at the bottom for context)
        const frontWall = new THREE.Mesh(
            new THREE.BoxGeometry(vpcWidth, wallThickness, wallThickness),
            new THREE.MeshStandardMaterial({ color, roughness: 0.5, opacity: 1, transparent: false })
        );
        frontWall.position.set(x, y + wallThickness / 2, z + vpcDepth / 2 - wallThickness / 2);
        // Label
        const vpcLabel = createLabel(label, "#fff");
        vpcLabel.position.set(x, y + wallHeight + 1.2, z);
        // Group
        const group = new THREE.Group();
        group.add(floor, leftWall, rightWall, backWall, frontWall, vpcLabel);

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

            // Add to global subnet mesh array for hover
            allSubnetMeshes.push(roomBox);
        });

        scene.add(group);
        return group;
    }

    // --- Route Table HTML for North-South Ingress Model ---
    const edgeVpcRouteTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Edge (Ingress) VPC Route Table</div>
        <table class="route-table">
            <thead><tr><th>Destination</th><th>Target</th></tr></thead>
            <tbody>
                <tr><td>0.0.0.0/0</td><td>Firewall Subnet (subnet-0abc1234)</td></tr>
                <tr><td>10.1.0.0/16</td><td>TGW (tgw-0def5678)</td></tr>
            </tbody>
        </table>
    `;
    const spokeVpcRouteTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Spoke VPC Route Table</div>
        <table class="route-table">
            <thead><tr><th>Destination</th><th>Target</th></tr></thead>
            <tbody>
                <tr><td>0.0.0.0/0</td><td>TGW (tgw-0def5678)</td></tr>
                <tr><td>10.2.0.0/16</td><td>local</td></tr>
            </tbody>
        </table>
    `;
    const firewallSubnetTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Firewall Subnet Route Table</div>
        <table class="route-table">
            <thead><tr><th>Destination</th><th>Target</th></tr></thead>
            <tbody>
                <tr><td>0.0.0.0/0</td><td>Firewall Endpoint (vpce-c)</td></tr>
                <tr><td>10.1.0.0/16</td><td>TGW (tgw-0def5678)</td></tr>
            </tbody>
        </table>
    `;
    const firewallEndpointTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Firewall Endpoint</div>
        <ul style="margin:0 0 0 16px;padding:0;">
            <li>Stateful/Stateless Rules</li>
            <li>HOME_NET: Spoke VPC CIDRs</li>
            <li>Inspect inbound/outbound traffic</li>
        </ul>
    `;
    const igwRouteTable = `
        <div style="margin-bottom:8px;font-weight:bold;">IGW Route Table</div>
        <table class="route-table">
            <thead><tr><th>Destination</th><th>Target</th></tr></thead>
            <tbody>
                <tr><td>0.0.0.0/0</td><td>Firewall Endpoint (vpce-c)</td></tr>
            </tbody>
        </table>
    `;

    // --- North-South Ingress Model Layout ---
    // Internet/Cloud at the top
    const internet = new THREE.Mesh(
        new THREE.SphereGeometry(2, 32, 32),
        new THREE.MeshStandardMaterial({ color: 0x90caf9, transparent: true, opacity: 0.8 })
    );
    internet.position.set(0, 12, 0);
    scene.add(internet);
    const internetLabel = createLabel("Internet", "#2196f3");
    internetLabel.position.set(0, 15, 0);
    scene.add(internetLabel);

    // Edge (Ingress) VPC (top center)
    createHouseVPC({
        x: 0, y: 6, z: 0,
        color: 0xff5722,
        label: "Edge (Ingress) VPC",
        vpcRouteTable: edgeVpcRouteTable,
        rooms: [
            { 
                label: "Firewall Subnet A", 
                color: 0xfff9c4, 
                hasFirewall: true, 
                subnetRouteTable: firewallSubnetTable, 
                firewallRouteTable: firewallEndpointTable 
            },
            { 
                label: "Firewall Subnet B", 
                color: 0xfff9c4, 
                hasFirewall: true, 
                subnetRouteTable: firewallSubnetTable, 
                firewallRouteTable: firewallEndpointTable 
            }
        ]
    });

    // IGW (for ingress traffic)
    const igw = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 32, 32),
        new THREE.MeshStandardMaterial({ color: 0x90caf9 })
    );
    igw.position.set(0, 9, 0);
    igw.cursor = "pointer";
    igw.onClick = () => showRouteTablePanel(igw, igwRouteTable, "Internet Gateway");
    scene.add(igw);
    const igwLabel = createLabel("IGW", "#2196f3");
    igwLabel.position.set(0, 11, 0);
    scene.add(igwLabel);

    // TGW (roundabout) - distributes inspected traffic
    const tgw = new THREE.Mesh(
        new THREE.TorusGeometry(2, 0.4, 16, 100),
        new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
    );
    tgw.position.set(0, 3, 0);
    scene.add(tgw);
    const tgwLabel = createLabel("TGW", "#666");
    tgwLabel.position.set(0, 5, 0);
    scene.add(tgwLabel);

    // Spoke VPCs (bottom)
    const spokePositions = [
        { x: -15, y: 0, z: -8, color: 0x4caf50, label: "Spoke VPC A" },
        { x: 15, y: 0, z: -8, color: 0x2196f3, label: "Spoke VPC B" },
        { x: -15, y: 0, z: 8, color: 0xff9800, label: "Spoke VPC C" },
        { x: 15, y: 0, z: 8, color: 0x9c27b0, label: "Spoke VPC D" }
    ];

    spokePositions.forEach((spoke, idx) => {
        createHouseVPC({
            x: spoke.x, y: spoke.y, z: spoke.z,
            color: spoke.color,
            label: spoke.label,
            vpcRouteTable: spokeVpcRouteTable,
            rooms: [
                { 
                    label: "Workload Subnet", 
                    color: 0xbbdefb, 
                    hasFirewall: false, 
                    subnetRouteTable: workloadSubnetTable 
                }
            ]
        });

        // Connection from TGW to Spoke VPC
        addConnection([0, 3, 0], [spoke.x, 1.5, spoke.z], 0x4caf50);
    });

    // Connections
    // Internet to IGW
    addConnection([0, 12, 0], [0, 9, 0], 0x2196f3);
    // IGW to Edge VPC
    addConnection([0, 9, 0], [0, 7.5, 0], 0xff5722);
    // Edge VPC to TGW
    addConnection([0, 4.5, 0], [0, 3, 0], 0xaaaaaa);

    // Add traffic flow labels
    const inboundLabel = createLabel("Inbound Traffic", "#ff5722");
    inboundLabel.position.set(0, 8, 0);
    scene.add(inboundLabel);

    const outboundLabel = createLabel("Outbound Traffic", "#4caf50");
    outboundLabel.position.set(0, 1, 0);
    scene.add(outboundLabel);

    // Add title
    const title = createLabel("North-South Ingress: Centralized Inbound Inspection", "#fff");
    title.position.set(0, -8, 0);
    scene.add(title);
}

function buildCentralizedDedicatedModel() {
    clearScene();

    // --- Helper: House (VPC) ---
    function createHouseVPC({x, y, z, color, label, vpcRouteTable, rooms}) {
        // Open-top, open-front house: four thin side walls and a floor
        const vpcWidth = 12;
        const vpcDepth = 9;
        const vpcHeight = 3;
        const wallThickness = 0.3;
        const wallHeight = 2.5;
        // Floor
        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(vpcWidth, wallThickness, vpcDepth),
            new THREE.MeshStandardMaterial({ color, roughness: 0.5, opacity: 1, transparent: false })
        );
        floor.position.set(x, y + wallThickness / 2, z);
        // Left wall
        const leftWall = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness, wallHeight, vpcDepth),
            new THREE.MeshStandardMaterial({ color, roughness: 0.5, opacity: 1, transparent: false })
        );
        leftWall.position.set(x - vpcWidth / 2 + wallThickness / 2, y + wallHeight / 2, z);
        // Right wall
        const rightWall = leftWall.clone();
        rightWall.position.set(x + vpcWidth / 2 - wallThickness / 2, y + wallHeight / 2, z);
        // Back wall
        const backWall = new THREE.Mesh(
            new THREE.BoxGeometry(vpcWidth, wallHeight, wallThickness),
            new THREE.MeshStandardMaterial({ color, roughness: 0.5, opacity: 1, transparent: false })
        );
        backWall.position.set(x, y + wallHeight / 2, z - vpcDepth / 2 + wallThickness / 2);
        // Front wall (short, just a rim at the bottom for context)
        const frontWall = new THREE.Mesh(
            new THREE.BoxGeometry(vpcWidth, wallThickness, wallThickness),
            new THREE.MeshStandardMaterial({ color, roughness: 0.5, opacity: 1, transparent: false })
        );
        frontWall.position.set(x, y + wallThickness / 2, z + vpcDepth / 2 - wallThickness / 2);
        // Label
        const vpcLabel = createLabel(label, "#fff");
        vpcLabel.position.set(x, y + wallHeight + 1.2, z);
        // Group
        const group = new THREE.Group();
        group.add(floor, leftWall, rightWall, backWall, frontWall, vpcLabel);

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

            // Add to global subnet mesh array for hover
            allSubnetMeshes.push(roomBox);
        });

        scene.add(group);
        return group;
    }

    // --- Route Table HTML for Centralized Dedicated Model ---
    const inspectionVpcRouteTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Inspection VPC Route Table</div>
        <table class="route-table">
            <thead><tr><th>Destination</th><th>Target</th></tr></thead>
            <tbody>
                <tr><td>0.0.0.0/0</td><td>Firewall Subnet (subnet-0abc1234)</td></tr>
                <tr><td>10.1.0.0/16</td><td>TGW (tgw-0def5678)</td></tr>
            </tbody>
        </table>
    `;
    const egressVpcRouteTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Egress VPC Route Table</div>
        <table class="route-table">
            <thead><tr><th>Destination</th><th>Target</th></tr></thead>
            <tbody>
                <tr><td>0.0.0.0/0</td><td>Firewall Subnet (subnet-0abc1234)</td></tr>
                <tr><td>10.1.0.0/16</td><td>TGW (tgw-0def5678)</td></tr>
            </tbody>
        </table>
    `;
    const spokeVpcRouteTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Spoke VPC Route Table</div>
        <table class="route-table">
            <thead><tr><th>Destination</th><th>Target</th></tr></thead>
            <tbody>
                <tr><td>0.0.0.0/0</td><td>TGW (tgw-0def5678)</td></tr>
                <tr><td>10.2.0.0/16</td><td>local</td></tr>
            </tbody>
        </table>
    `;
    const inspectionFirewallSubnetTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Inspection Firewall Subnet Route Table</div>
        <table class="route-table">
            <thead><tr><th>Destination</th><th>Target</th></tr></thead>
            <tbody>
                <tr><td>0.0.0.0/0</td><td>Firewall Endpoint (vpce-d)</td></tr>
                <tr><td>10.1.0.0/16</td><td>TGW (tgw-0def5678)</td></tr>
            </tbody>
        </table>
    `;
    const egressFirewallSubnetTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Egress Firewall Subnet Route Table</div>
        <table class="route-table">
            <thead><tr><th>Destination</th><th>Target</th></tr></thead>
            <tbody>
                <tr><td>0.0.0.0/0</td><td>Firewall Endpoint (vpce-e)</td></tr>
                <tr><td>10.1.0.0/16</td><td>TGW (tgw-0def5678)</td></tr>
            </tbody>
        </table>
    `;
    const inspectionFirewallTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Inspection Firewall Endpoint</div>
        <ul style="margin:0 0 0 16px;padding:0;">
            <li>Stateful/Stateless Rules</li>
            <li>HOME_NET: All VPC CIDRs</li>
            <li>Dedicated East-West inspection</li>
            <li>Inter-VPC traffic analysis</li>
        </ul>
    `;
    const egressFirewallTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Egress Firewall Endpoint</div>
        <ul style="margin:0 0 0 16px;padding:0;">
            <li>Stateful/Stateless Rules</li>
            <li>HOME_NET: All VPC CIDRs</li>
            <li>Dedicated North-South inspection</li>
            <li>Internet traffic analysis</li>
        </ul>
    `;
    const workloadSubnetTable = `
        <div style="margin-bottom:8px;font-weight:bold;">Workload Subnet Route Table</div>
        <table class="route-table">
            <thead><tr><th>Destination</th><th>Target</th></tr></thead>
            <tbody>
                <tr><td>0.0.0.0/0</td><td>TGW (tgw-0def5678)</td></tr>
                <tr><td>10.2.0.0/16</td><td>local</td></tr>
            </tbody>
        </table>
    `;
    const natGatewayTable = `
        <div style="margin-bottom:8px;font-weight:bold;">NAT Gateway Route Table</div>
        <table class="route-table">
            <thead><tr><th>Destination</th><th>Target</th></tr></thead>
            <tbody>
                <tr><td>0.0.0.0/0</td><td>Internet Gateway (igw-0a1b2c3d)</td></tr>
                <tr><td>10.2.0.0/16</td><td>local</td></tr>
            </tbody>
        </table>
    `;

    // --- Centralized Dedicated Model Layout ---
    // Internet/Cloud at the top
    const internet = new THREE.Mesh(
        new THREE.SphereGeometry(2, 32, 32),
        new THREE.MeshStandardMaterial({ color: 0x90caf9, transparent: true, opacity: 0.8 })
    );
    internet.position.set(0, 12, 0);
    scene.add(internet);
    const internetLabel = createLabel("Internet", "#2196f3");
    internetLabel.position.set(0, 15, 0);
    scene.add(internetLabel);

    // Inspection VPC (left) - dedicated East-West inspection
    createHouseVPC({
        x: -15, y: 6, z: 0,
        color: 0x4caf50,
        label: "Inspection VPC",
        vpcRouteTable: inspectionVpcRouteTable,
        rooms: [
            { 
                label: "Firewall Subnet A", 
                color: 0xfff9c4, 
                hasFirewall: true, 
                subnetRouteTable: inspectionFirewallSubnetTable, 
                firewallRouteTable: inspectionFirewallTable 
            },
            { 
                label: "Firewall Subnet B", 
                color: 0xfff9c4, 
                hasFirewall: true, 
                subnetRouteTable: inspectionFirewallSubnetTable, 
                firewallRouteTable: inspectionFirewallTable 
            }
        ]
    });

    // Egress VPC (right) - dedicated North-South egress
    createHouseVPC({
        x: 15, y: 6, z: 0,
        color: 0xff5722,
        label: "Egress VPC",
        vpcRouteTable: egressVpcRouteTable,
        rooms: [
            { 
                label: "Firewall Subnet A", 
                color: 0xffcdd2, 
                hasFirewall: true, 
                subnetRouteTable: egressFirewallSubnetTable, 
                firewallRouteTable: egressFirewallTable 
            },
            { 
                label: "Public Subnet", 
                color: 0xbbdefb, 
                hasFirewall: false, 
                subnetRouteTable: workloadSubnetTable 
            }
        ]
    });

    // IGW (for egress traffic)
    const igw = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 32, 32),
        new THREE.MeshStandardMaterial({ color: 0x90caf9 })
    );
    igw.position.set(15, 9, 0);
    igw.cursor = "pointer";
    igw.onClick = () => showRouteTablePanel(igw, natGatewayTable, "Internet Gateway");
    scene.add(igw);
    const igwLabel = createLabel("IGW", "#2196f3");
    igwLabel.position.set(15, 11, 0);
    scene.add(igwLabel);

    // NAT Gateway (in egress VPC)
    const nat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.8, 1.5, 32),
        new THREE.MeshStandardMaterial({ color: 0x9e9e9e })
    );
    nat.position.set(15, 4.5, 0);
    nat.cursor = "pointer";
    nat.onClick = () => showRouteTablePanel(nat, natGatewayTable, "NAT Gateway");
    scene.add(nat);
    const natLabel = createLabel("NAT", "#666");
    natLabel.position.set(15, 6.5, 0);
    scene.add(natLabel);

    // TGW (roundabout) - connects all VPCs
    const tgw = new THREE.Mesh(
        new THREE.TorusGeometry(2, 0.4, 16, 100),
        new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
    );
    tgw.position.set(0, 3, 0);
    scene.add(tgw);
    const tgwLabel = createLabel("TGW", "#666");
    tgwLabel.position.set(0, 5, 0);
    scene.add(tgwLabel);

    // Spoke VPCs (bottom)
    const spokePositions = [
        { x: -20, y: 0, z: -8, color: 0x2196f3, label: "Spoke VPC A" },
        { x: 20, y: 0, z: -8, color: 0xff9800, label: "Spoke VPC B" },
        { x: -20, y: 0, z: 8, color: 0x9c27b0, label: "Spoke VPC C" },
        { x: 20, y: 0, z: 8, color: 0x607d8b, label: "Spoke VPC D" }
    ];

    spokePositions.forEach((spoke, idx) => {
        createHouseVPC({
            x: spoke.x, y: spoke.y, z: spoke.z,
            color: spoke.color,
            label: spoke.label,
            vpcRouteTable: spokeVpcRouteTable,
            rooms: [
                { 
                    label: "Workload Subnet", 
                    color: 0xbbdefb, 
                    hasFirewall: false, 
                    subnetRouteTable: workloadSubnetTable 
                }
            ]
        });

        // Connection from TGW to Spoke VPC
        addConnection([0, 3, 0], [spoke.x, 1.5, spoke.z], 0x4caf50);
    });

    // Connections
    // Internet to IGW
    addConnection([0, 12, 0], [15, 9, 0], 0x2196f3);
    // IGW to Egress VPC
    addConnection([15, 9, 0], [15, 7.5, 0], 0xff5722);
    // Egress VPC to TGW
    addConnection([15, 4.5, 0], [0, 3, 0], 0xaaaaaa);
    // Inspection VPC to TGW
    addConnection([-15, 4.5, 0], [0, 3, 0], 0xaaaaaa);

    // Add traffic flow labels
    const eastWestLabel = createLabel("East-West Traffic", "#4caf50");
    eastWestLabel.position.set(-15, 8, 0);
    scene.add(eastWestLabel);

    const northSouthLabel = createLabel("North-South Traffic", "#ff5722");
    northSouthLabel.position.set(15, 8, 0);
    scene.add(northSouthLabel);

    // Add title
    const title = createLabel("Centralized Dedicated: Separate East-West & North-South Firewalls", "#fff");
    title.position.set(0, -8, 0);
    scene.add(title);
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

// --- Add raycaster for hover effect on subnets ---
const pointer = new THREE.Vector2();
let lastHovered = null;
renderer.domElement.addEventListener('mousemove', (event) => {
    pointer.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    pointer.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(allSubnetMeshes, true);
    let found = false;
    for (let i = 0; i < intersects.length; i++) {
        const obj = intersects[i].object;
        if (obj.onPointerOver) {
            if (lastHovered && lastHovered !== obj && lastHovered.onPointerOut) lastHovered.onPointerOut();
            obj.onPointerOver();
            lastHovered = obj;
            found = true;
            break;
        }
    }
    if (!found && lastHovered && lastHovered.onPointerOut) {
        lastHovered.onPointerOut();
        lastHovered = null;
    }
});

// ================= Model Selector Hook =================

// On page load, show the default model
buildCentralizedModel();

// On model selector change, load the selected model
document.getElementById('modelSelect').addEventListener('change', (e) => {
    const model = e.target.value;
    if (model === 'centralized') buildCentralizedModel();
    else if (model === 'decentralized') buildDecentralizedModel();
    else if (model === 'combined') buildCombinedModel();
    else if (model === 'north-south-ingress') buildNorthSouthIngressModel();
    else if (model === 'centralized-dedicated') buildCentralizedDedicatedModel();
    // Add more models as you implement them
});

// ================= Animation Loop =================
function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    renderer.render(scene, camera);
}
animate();