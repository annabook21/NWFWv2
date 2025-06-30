import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class NetworkFirewall3DSimulator {
    constructor() {
        try {
            this.initializeAsync();
        } catch (error) {
            console.error('Failed to initialize 3D scene:', error);
            this.showFallbackMessage();
        }
    }

    async initializeAsync() {
        await this.initialize3DScene();
        
        // Add tooltip functionality after initialization
        if (!document.getElementById('component-tooltip')) {
            const tooltip = document.createElement('div');
            tooltip.id = 'component-tooltip';
            tooltip.style.position = 'fixed';
            tooltip.style.pointerEvents = 'none';
            tooltip.style.background = 'white';
            tooltip.style.color = '#222';
            tooltip.style.padding = '6px 14px';
            tooltip.style.borderRadius = '6px';
            tooltip.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)';
            tooltip.style.fontWeight = 'bold';
            tooltip.style.fontSize = '15px';
            tooltip.style.zIndex = 9999;
            tooltip.style.display = 'none';
            document.body.appendChild(tooltip);
        }

        this.renderer.domElement.addEventListener('mousemove', (event) => {
            const tooltip = document.getElementById('component-tooltip');
            const rect = this.renderer.domElement.getBoundingClientRect();
            const mouse = {
                x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
                y: -((event.clientY - rect.top) / rect.height) * 2 + 1
            };
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.camera);
            const intersects = raycaster.intersectObjects(this.scene.children, true);
            let found = false;
            for (const intersect of intersects) {
                let obj = intersect.object;
                while (obj && !obj.userData.label && obj.parent) obj = obj.parent;
                if (obj && obj.userData && obj.userData.label) {
                    tooltip.textContent = obj.userData.label;
                    tooltip.style.left = event.clientX + 16 + 'px';
                    tooltip.style.top = event.clientY + 8 + 'px';
                    tooltip.style.display = 'block';
                    found = true;
                    break;
                }
            }
            if (!found) {
                tooltip.style.display = 'none';
            }
        });
        
        this.renderer.domElement.addEventListener('mouseleave', () => {
            const tooltip = document.getElementById('component-tooltip');
            tooltip.style.display = 'none';
        });
    }

    async initialize3DScene() {
        this.updateLoadingProgress(10, 'Initializing 3D scene...');
        await this.delay(200);
        
        this.container = document.getElementById('canvas-3d');
        if (!this.container) {
            throw new Error('Canvas container not found');
        }

        this.updateLoadingProgress(20, 'Setting up scene...');
        await this.delay(200);
        this.scene = new THREE.Scene();
        // Open roof concept - transparent background
        this.scene.background = null;
        
        this.updateLoadingProgress(30, 'Configuring camera...');
        await this.delay(200);
        this.camera = new THREE.PerspectiveCamera(60, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.camera.position.set(40, 40, 40);
        
        this.updateLoadingProgress(40, 'Initializing renderer...');
        await this.delay(200);
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true // Enable transparency
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0x000000, 0); // Transparent background
        this.container.appendChild(this.renderer.domElement);
        
        this.updateLoadingProgress(50, 'Setting up controls...');
        await this.delay(200);
        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.target.set(0, 0, 0);
        this.controls.enablePan = true;
        this.controls.enableZoom = true;
        this.controls.enableRotate = true;
        
        this.updateLoadingProgress(60, 'Adding lighting...');
        await this.delay(200);
        // Lights
        this.setupLights();
        
        this.updateLoadingProgress(70, 'Setting up helpers...');
        await this.delay(200);
        // Helpers
        this.setupHelpers();
        
        this.updateLoadingProgress(80, 'Initializing state...');
        await this.delay(200);
        // State
        this.currentMode = 'design';
        this.currentModel = null;
        this.simulationRunning = false;
        this.trafficAnimations = [];
        this.components = [];
        this.routeTables = {};
        this.wireframeMode = false;
        this.selectedObject = null;
        
        this.updateLoadingProgress(90, 'Setting up event listeners...');
        await this.delay(200);
        // Initialize
        this.initializeEventListeners();
        
        this.updateLoadingProgress(95, 'Starting animation loop...');
        await this.delay(200);
        this.animate();
        this.updateStatistics();
        
        this.updateLoadingProgress(100, 'Ready!');
        // Hide loading overlay after a short delay
        setTimeout(() => {
            this.hideLoading();
        }, 500);
    }

    updateLoadingProgress(percent, message) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const loadingText = document.getElementById('loadingText');
        
        if (progressFill) progressFill.style.width = percent + '%';
        if (progressText) progressText.textContent = percent + '%';
        if (loadingText) loadingText.textContent = message;
    }

    showFallbackMessage() {
        const container = document.getElementById('canvas-3d');
        if (container) {
            container.innerHTML = `
                <div style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: white;
                    text-align: center;
                    padding: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 10px;
                ">
                    <h2>🚧 3D Renderer Unavailable</h2>
                    <p>There was an issue loading the 3D components. Please try refreshing the page.</p>
                    <button onclick="location.reload()" style="
                        background: #3498db;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        margin-top: 10px;
                    ">Refresh Page</button>
                </div>
            `;
        }
        this.hideLoading();
    }

    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(20, 40, 20);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);
        
        // Point lights for better 3D effect
        const pointLight1 = new THREE.PointLight(0x3498db, 0.5, 50);
        pointLight1.position.set(30, 30, 30);
        this.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0xe74c3c, 0.3, 50);
        pointLight2.position.set(-30, 30, -30);
        this.scene.add(pointLight2);
    }

    setupHelpers() {
        // Subtle grid for open roof concept
        const grid = new THREE.GridHelper(100, 20, 0x3498db, 0x2980b9);
        grid.material.opacity = 0.3;
        grid.material.transparent = true;
        this.scene.add(grid);
        
        // Axes helper (optional)
        const axes = new THREE.AxesHelper(10);
        axes.material.opacity = 0.5;
        axes.material.transparent = true;
        this.scene.add(axes);
    }

    initializeEventListeners() {
        // Mode switching
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.closest('.mode-btn').dataset.mode;
                this.setMode(mode);
            });
        });

        // Model selection
        document.querySelectorAll('.model-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const model = e.target.closest('.model-btn').dataset.model;
                this.loadDeploymentModel(model);
            });
        });

        // Component library
        document.querySelectorAll('.component-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const componentType = e.target.closest('.component-item').dataset.component;
                this.addComponent(componentType);
            });
        });

        // Toolbar buttons
        document.getElementById('zoomIn')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOut')?.addEventListener('click', () => this.zoomOut());
        document.getElementById('resetView')?.addEventListener('click', () => this.resetView());
        document.getElementById('toggleWireframe')?.addEventListener('click', () => this.toggleWireframe());
        document.getElementById('clearCanvas')?.addEventListener('click', () => this.clearScene());
        document.getElementById('exportImage')?.addEventListener('click', () => this.exportImage());
        document.getElementById('saveProject')?.addEventListener('click', () => this.saveProject());
        document.getElementById('helpBtn')?.addEventListener('click', () => this.showHelp());

        // Simulation controls
        document.getElementById('startSimulation')?.addEventListener('click', () => this.startSimulation());
        document.getElementById('stopSimulation')?.addEventListener('click', () => this.stopSimulation());
        document.getElementById('resetSimulation')?.addEventListener('click', () => this.resetSimulation());

        // Configuration controls
        document.getElementById('trafficType')?.addEventListener('change', (e) => this.updateTrafficType(e.target.value));
        document.getElementById('animationSpeed')?.addEventListener('change', (e) => this.updateAnimationSpeed(e.target.value));
        document.getElementById('showRouteTables')?.addEventListener('change', (e) => this.toggleRouteTables(e.target.checked));
        document.getElementById('showTrafficFlow')?.addEventListener('change', (e) => this.toggleTrafficFlow(e.target.checked));

        // Sidebar toggle buttons
        document.getElementById('leftSidebarToggle')?.addEventListener('click', () => this.toggleSidebar('left'));
        document.getElementById('rightSidebarToggle')?.addEventListener('click', () => this.toggleSidebar('right'));

        // Modal controls
        document.querySelector('.close')?.addEventListener('click', () => this.hideHelp());
        document.querySelector('.close-route-btn')?.addEventListener('click', () => {
            document.getElementById('routeTablePanel').style.display = 'none';
        });

        // Canvas interaction
        this.renderer.domElement.addEventListener('click', (event) => this.onMouseClick(event));
        this.renderer.domElement.addEventListener('mousemove', (event) => this.onMouseMove(event));

        // Window resize
        window.addEventListener('resize', () => this.onWindowResize());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        this.saveProject();
                        break;
                    case 'e':
                        e.preventDefault();
                        this.exportImage();
                        break;
                    case 'h':
                        e.preventDefault();
                        this.showHelp();
                        break;
                }
            }
        });
    }

    toggleSidebar(side) {
        const sidebar = document.querySelector(`.${side}-sidebar`);
        const toggleBtn = document.getElementById(`${side}SidebarToggle`);
        const icon = toggleBtn.querySelector('i');
        
        if (sidebar.classList.contains('collapsed')) {
            // Expand
            sidebar.classList.remove('collapsed');
            sidebar.classList.add('expanded');
            if (side === 'left') {
                icon.className = 'fas fa-chevron-left';
            } else {
                icon.className = 'fas fa-chevron-right';
            }
        } else if (sidebar.classList.contains('expanded')) {
            // Collapse
            sidebar.classList.remove('expanded');
            sidebar.classList.add('collapsed');
            if (side === 'left') {
                icon.className = 'fas fa-chevron-right';
            } else {
                icon.className = 'fas fa-chevron-left';
            }
        } else {
            // Default to expanded
            sidebar.classList.add('expanded');
            if (side === 'left') {
                icon.className = 'fas fa-chevron-left';
            } else {
                icon.className = 'fas fa-chevron-right';
            }
        }
        
        // Trigger resize to adjust canvas
        setTimeout(() => {
            this.onWindowResize();
        }, 300);
    }

    setMode(mode) {
        this.currentMode = mode;
        
        // Update UI
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
        
        // Update information panel
        this.updateInfoPanel(mode);
    }

    updateInfoPanel(mode) {
        const infoContent = document.getElementById('infoContent');
        
        const modeInfo = {
            view: {
                title: '3D View Mode',
                description: 'Explore and examine the current 3D architecture. Click components to view details.',
                tips: [
                    'Click 3D components to view detailed information',
                    'Drag to rotate, scroll to zoom, right-click to pan',
                    'View route tables and configurations in 3D space'
                ]
            },
            design: {
                title: '3D Design Mode',
                description: 'Build and modify your 3D network architecture. Add components and configure settings.',
                tips: [
                    'Use the 3D component library to add AWS resources',
                    'Position components in 3D space for optimal layout',
                    'Use the configuration panel to adjust 3D settings'
                ]
            },
            simulate: {
                title: '3D Simulation Mode',
                description: 'Test 3D traffic flow and security scenarios. Watch how data moves through your architecture.',
                tips: [
                    'Start 3D simulation to see traffic flow',
                    'Change traffic type to test different scenarios',
                    'Monitor 3D statistics and performance'
                ]
            }
        };
        
        const info = modeInfo[mode];
        infoContent.innerHTML = `
            <h4>${info.title}</h4>
            <p>${info.description}</p>
            <ul>
                ${info.tips.map(tip => `<li>${tip}</li>`).join('')}
            </ul>
        `;
    }

    loadDeploymentModel(modelName) {
        this.showLoading();
        
        // Update UI
        document.querySelectorAll('.model-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-model="${modelName}"]`).classList.add('active');
        
        document.getElementById('currentModel').textContent = modelName.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        // Clear existing components
        this.clearScene();
        
        // Load model
        setTimeout(() => {
            this.buildDeploymentModel(modelName);
            this.hideLoading();
            this.updateStatistics();
        }, 500);
    }

    buildDeploymentModel(modelName) {
        console.log('Building deployment model:', modelName);
        
        // Clear route tables before building new model
        this.routeTables = {};
        
        switch (modelName) {
            case 'centralized':
                this.buildCentralizedModel();
                break;
            case 'decentralized':
                this.buildDecentralizedModel();
                break;
            case 'combined':
                this.buildCombinedModel();
                break;
            case 'north-south-ingress':
                this.buildNorthSouthIngressModel();
                break;
            case 'centralized-dedicated':
                this.buildCentralizedDedicatedModel();
                break;
            default:
                console.warn('Unknown deployment model:', modelName);
                return;
        }
        
        // Update route tables display after building model
        setTimeout(() => {
            this.updateRouteTablesDisplay();
        }, 100);
        
        this.updateStatistics();
        console.log('Deployment model built successfully');
    }

    buildCentralizedModel() {
        // Clear existing components
        this.clearScene();
        
        // CENTRALIZED MODEL: Single Inspection VPC with TGW
        // Based on official AWS documentation
        
        // Create Transit Gateway (required for centralized model)
        const tgw = this.createTransitGateway(0, 0, 0, 'Transit Gateway');
        
        // Create Inspection VPC (dedicated for firewall endpoints)
        const inspectionVPC = this.createVPC(0, 0, 10, 'Inspection VPC (100.64.0.0/16)', '#e74c3c');
        
        // Inspection VPC subnets per AZ (TGW attachment + Firewall)
        const tgwSubnetA = this.createSubnet(-2, 0, 10, 'TGW Subnet AZ-A', '#9b59b6', inspectionVPC);
        const firewallSubnetA = this.createSubnet(2, 0, 10, 'Firewall Subnet AZ-A', '#e74c3c', inspectionVPC);
        const firewallEndpointA = this.createFirewall(2, 2, 10, 'Firewall Endpoint AZ-A');
        
        // Create Spoke VPCs (application VPCs)
        const spokeVPC1 = this.createVPC(-15, 0, 0, 'Spoke VPC A (10.1.0.0/16)', '#3498db');
        const workloadSubnet1 = this.createSubnet(-15, 0, 0, 'Workload Subnet', '#27ae60', spokeVPC1);
        
        const spokeVPC2 = this.createVPC(15, 0, 0, 'Spoke VPC B (10.2.0.0/16)', '#f39c12');
        const workloadSubnet2 = this.createSubnet(15, 0, 0, 'Workload Subnet', '#27ae60', spokeVPC2);
        
        // Connections
        this.createConnection(tgw, inspectionVPC, '#e74c3c');
        this.createConnection(tgw, spokeVPC1, '#3498db');
        this.createConnection(tgw, spokeVPC2, '#f39c12');
        
        // Route Tables per AWS documentation
        this.createRouteTable(tgw, 'Spoke Route Table', [
            { destination: '0.0.0.0/0', target: 'TGW-Attachment_Inspection_VPC', type: 'inspection' }
        ]);
        
        this.createRouteTable(inspectionVPC, 'Firewall Route Table', [
            { destination: '10.1.0.0/16', target: 'TGW-Attachment_Spoke_A', type: 'spoke' },
            { destination: '10.2.0.0/16', target: 'TGW-Attachment_Spoke_B', type: 'spoke' }
        ]);
        
        this.createRouteTable(firewallSubnetA, 'Inspection VPC Subnet RT', [
            { destination: '0.0.0.0/0', target: 'Firewall_Endpoint_AZ', type: 'endpoint' }
        ]);
        
        this.createRouteTable(firewallEndpointA, 'Inspection Return RT', [
            { destination: '0.0.0.0/0', target: 'tgw-id', type: 'transit' }
        ]);
    }

    buildDecentralizedModel() {
        // Clear existing components
        this.clearScene();
        
        // DISTRIBUTED MODEL: Each VPC has its own firewall
        // Based on official AWS documentation
        
        // Create Internet Gateway
        const igw = this.createInternetGateway(0, 0, 15, 'Internet Gateway');
        
        // VPC 1 with distributed firewall
        const vpc1 = this.createVPC(-15, 0, 0, 'Protected VPC A (10.0.0.0/16)', '#3498db');
        const workloadSubnet1 = this.createSubnet(-17, 0, 0, 'Workload Subnet (public)', '#27ae60', vpc1);
        const firewallSubnet1 = this.createSubnet(-13, 0, 0, 'Firewall Subnet', '#e74c3c', vpc1);
        const firewallEndpoint1 = this.createFirewall(-13, 2, 0, 'Firewall Endpoint');
        
        // VPC 2 with distributed firewall
        const vpc2 = this.createVPC(0, 0, 0, 'Protected VPC B (10.1.0.0/16)', '#9b59b6');
        const workloadSubnet2 = this.createSubnet(-2, 0, 0, 'Workload Subnet (public)', '#27ae60', vpc2);
        const firewallSubnet2 = this.createSubnet(2, 0, 0, 'Firewall Subnet', '#e74c3c', vpc2);
        const firewallEndpoint2 = this.createFirewall(2, 2, 0, 'Firewall Endpoint');
        
        // VPC 3 with distributed firewall
        const vpc3 = this.createVPC(15, 0, 0, 'Protected VPC C (10.2.0.0/16)', '#f39c12');
        const workloadSubnet3 = this.createSubnet(13, 0, 0, 'Workload Subnet (public)', '#27ae60', vpc3);
        const firewallSubnet3 = this.createSubnet(17, 0, 0, 'Firewall Subnet', '#e74c3c', vpc3);
        const firewallEndpoint3 = this.createFirewall(17, 2, 0, 'Firewall Endpoint');
        
        // Connections (each VPC connects to IGW through its firewall)
        this.createConnection(igw, vpc1, '#3498db');
        this.createConnection(igw, vpc2, '#9b59b6');
        this.createConnection(igw, vpc3, '#f39c12');
        
        // Route Tables per AWS documentation for distributed model
        
        // VPC 1 Route Tables
        this.createRouteTable(workloadSubnet1, 'Workload Subnet RT', [
            { destination: '0.0.0.0/0', target: 'Firewall_Endpoint_AZ', type: 'endpoint' }
        ]);
        
        this.createRouteTable(firewallSubnet1, 'Firewall Subnet RT', [
            { destination: '0.0.0.0/0', target: 'igw-id', type: 'public' }
        ]);
        
        this.createRouteTable(igw, 'IGW Ingress RT (VPC A)', [
            { destination: '10.0.0.0/24', target: 'Firewall_Endpoint_AZ', type: 'endpoint' }
        ]);
        
        // VPC 2 Route Tables
        this.createRouteTable(workloadSubnet2, 'Workload Subnet RT', [
            { destination: '0.0.0.0/0', target: 'Firewall_Endpoint_AZ', type: 'endpoint' }
        ]);
        
        this.createRouteTable(firewallSubnet2, 'Firewall Subnet RT', [
            { destination: '0.0.0.0/0', target: 'igw-id', type: 'public' }
        ]);
        
        // VPC 3 Route Tables
        this.createRouteTable(workloadSubnet3, 'Workload Subnet RT', [
            { destination: '0.0.0.0/0', target: 'Firewall_Endpoint_AZ', type: 'endpoint' }
        ]);
        
        this.createRouteTable(firewallSubnet3, 'Firewall Subnet RT', [
            { destination: '0.0.0.0/0', target: 'igw-id', type: 'public' }
        ]);
    }

    buildCombinedModel() {
        // Clear existing components
        this.clearScene();
        
        // COMBINED MODEL: Centralized East-West + Distributed Internet access
        // Based on official AWS documentation
        
        // Create Transit Gateway for East-West traffic
        const tgw = this.createTransitGateway(0, 0, 0, 'Transit Gateway');
        
        // Create Inspection VPC for East-West traffic
        const inspectionVPC = this.createVPC(0, 0, 10, 'Inspection VPC (100.64.0.0/16)', '#e74c3c');
        const tgwSubnet = this.createSubnet(-2, 0, 10, 'TGW Subnet', '#9b59b6', inspectionVPC);
        const firewallSubnet = this.createSubnet(2, 0, 10, 'Firewall Subnet', '#e74c3c', inspectionVPC);
        const firewallEndpoint = this.createFirewall(2, 2, 10, 'Firewall Endpoint');
        
        // Create Internet Gateway
        const igw = this.createInternetGateway(0, 0, 15, 'Internet Gateway');
        
        // Spoke VPC with local IGW (combined approach)
        const spokeVPC1 = this.createVPC(-15, 0, 0, 'Spoke VPC A (10.1.0.0/16)', '#3498db');
        const publicSubnet1 = this.createSubnet(-17, 0, 0, 'Public Subnet', '#27ae60', spokeVPC1);
        const localFirewallSubnet1 = this.createSubnet(-13, 0, 0, 'Local Firewall Subnet', '#e74c3c', spokeVPC1);
        const localFirewall1 = this.createFirewall(-13, 2, 0, 'Local Firewall');
        
        // Spoke VPC with TGW only (centralized approach)
        const spokeVPC2 = this.createVPC(15, 0, 0, 'Spoke VPC B (10.2.0.0/16)', '#f39c12');
        const privateSubnet2 = this.createSubnet(15, 0, 0, 'Private Subnet', '#27ae60', spokeVPC2);
        
        // Connections
        this.createConnection(tgw, inspectionVPC, '#e74c3c');
        this.createConnection(tgw, spokeVPC1, '#3498db');
        this.createConnection(tgw, spokeVPC2, '#f39c12');
        this.createConnection(igw, spokeVPC1, '#3498db'); // Direct IGW connection
        
        // Route Tables for Combined Model
        
        // East-West traffic through centralized inspection
        this.createRouteTable(tgw, 'Spoke RT (East-West)', [
            { destination: '10.0.0.0/8', target: 'TGW-Attachment_Inspection_VPC', type: 'inspection' }
        ]);
        
        this.createRouteTable(inspectionVPC, 'Firewall RT (East-West)', [
            { destination: '10.1.0.0/16', target: 'TGW-Attachment_Spoke_A', type: 'spoke' },
            { destination: '10.2.0.0/16', target: 'TGW-Attachment_Spoke_B', type: 'spoke' }
        ]);
        
        // Local Internet access for Spoke VPC A
        this.createRouteTable(publicSubnet1, 'Public Subnet RT', [
            { destination: '0.0.0.0/0', target: 'Local_Firewall_Endpoint', type: 'endpoint' },
            { destination: '10.0.0.0/8', target: 'tgw-id', type: 'transit' }
        ]);
        
        this.createRouteTable(localFirewallSubnet1, 'Local Firewall Subnet RT', [
            { destination: '0.0.0.0/0', target: 'igw-id', type: 'public' }
        ]);
        
        // Centralized egress for Spoke VPC B
        this.createRouteTable(privateSubnet2, 'Private Subnet RT', [
            { destination: '0.0.0.0/0', target: 'tgw-id', type: 'transit' }
        ]);
    }

    buildNorthSouthIngressModel() {
        // Clear existing components
        this.clearScene();
        
        // NORTH-SOUTH INGRESS MODEL: Firewall for ingress traffic control
        // Based on AWS documentation for ingress filtering
        
        // Main VPC (10.0.0.0/16)
        const mainVPC = this.createVPC(0, 0, 0, 'Main VPC (10.0.0.0/16)', '#3498db');
        
        // Public Subnet for ALB/NLB
        const publicSubnet = this.createSubnet(-2, 0, 2, 'Public Subnet (10.0.1.0/24)', '#e74c3c', mainVPC);
        
        // Private Subnet for workloads
        const privateSubnet = this.createSubnet(2, 0, -2, 'Private Subnet (10.0.2.0/24)', '#27ae60', mainVPC);
        
        // Firewall Subnet
        const firewallSubnet = this.createSubnet(0, 0, 0, 'Firewall Subnet (10.0.3.0/28)', '#e74c3c', mainVPC);
        
        // Firewall Endpoint
        const firewall = this.createFirewall(0, 2, 0, 'Ingress Firewall Endpoint');
        
        // Internet Gateway
        const igw = this.createInternetGateway(0, 0, 15, 'Internet Gateway');
        
        // Load Balancer
        const lb = this.createLoadBalancer(-2, 2, 2, 'Application Load Balancer');
        
        // Connections
        this.createConnection(igw, mainVPC, '#f39c12');
        this.createConnection(publicSubnet, lb, '#e74c3c');
        this.createConnection(lb, privateSubnet, '#27ae60');
        
        // Create route tables for North-South Ingress model
        
        // IGW Ingress Route Table (for incoming traffic)
        this.createRouteTable(igw, 'IGW Ingress Route Table', [
            { destination: '10.0.1.0/24', target: 'Firewall_Endpoint_AZ', type: 'endpoint' },
            { destination: '10.0.0.0/16', target: 'local', type: 'local' }
        ]);
        
        // Public Subnet Route Table
        this.createRouteTable(publicSubnet, 'Public Subnet Route Table', [
            { destination: '10.0.0.0/16', target: 'local', type: 'local' },
            { destination: '0.0.0.0/0', target: 'Firewall_Endpoint_AZ', type: 'endpoint' }
        ]);
        
        // Firewall Subnet Route Table
        this.createRouteTable(firewallSubnet, 'Firewall Subnet Route Table', [
            { destination: '10.0.0.0/16', target: 'local', type: 'local' },
            { destination: '0.0.0.0/0', target: 'igw-id', type: 'public' }
        ]);
        
        // Private Subnet Route Table
        this.createRouteTable(privateSubnet, 'Private Subnet Route Table', [
            { destination: '10.0.0.0/16', target: 'local', type: 'local' },
            { destination: '0.0.0.0/0', target: 'nat-gw-id', type: 'private' }
        ]);
        
        // Firewall Endpoint Route Table
        this.createRouteTable(firewall, 'Firewall Endpoint Route Table', [
            { destination: '10.0.1.0/24', target: 'ALB_ENI', type: 'endpoint' },
            { destination: '10.0.2.0/24', target: 'Private_Subnet', type: 'local' },
            { destination: '0.0.0.0/0', target: 'igw-id', type: 'public' }
        ]);
        
        // Load Balancer Route Table
        this.createRouteTable(lb, 'ALB Target Route Table', [
            { destination: '10.0.2.0/24', target: 'Private_Subnet_Targets', type: 'local' },
            { destination: '10.0.0.0/16', target: 'local', type: 'local' }
        ]);
    }

    buildCentralizedDedicatedModel() {
        // Clear existing components
        this.clearScene();
        
        // CENTRALIZED DEDICATED MODEL: Dedicated firewall VPC with application VPCs
        // Based on AWS documentation for dedicated firewall architecture
        
        // Dedicated Firewall VPC (100.64.0.0/16)
        const firewallVPC = this.createVPC(0, 0, 0, 'Firewall VPC (100.64.0.0/16)', '#e74c3c');
        const firewallSubnet = this.createSubnet(0, 0, 0, 'Firewall Subnet (100.64.1.0/28)', '#c0392b', firewallVPC);
        const firewall = this.createFirewall(0, 2, 0, 'Dedicated Firewall Endpoint');
        
        // Application VPC 1 (10.1.0.0/16)
        const appVPC1 = this.createVPC(-20, 0, 0, 'App VPC 1 (10.1.0.0/16)', '#3498db');
        const appSubnet1 = this.createSubnet(-20, 0, 0, 'App Subnet 1 (10.1.1.0/24)', '#2980b9', appVPC1);
        
        // Application VPC 2 (10.2.0.0/16)
        const appVPC2 = this.createVPC(20, 0, 0, 'App VPC 2 (10.2.0.0/16)', '#9b59b6');
        const appSubnet2 = this.createSubnet(20, 0, 0, 'App Subnet 2 (10.2.1.0/24)', '#8e44ad', appVPC2);
        
        // Transit Gateway for connecting VPCs
        const tgw = this.createTransitGateway(0, 0, -15, 'Transit Gateway');
        
        // Internet Gateway
        const igw = this.createInternetGateway(0, 0, 15, 'Internet Gateway');
        
        // Connections
        this.createConnection(igw, firewallVPC, '#f39c12');
        this.createConnection(tgw, firewallVPC, '#e74c3c');
        this.createConnection(tgw, appVPC1, '#3498db');
        this.createConnection(tgw, appVPC2, '#9b59b6');
        
        // Create route tables for Centralized Dedicated model
        
        // IGW Ingress Route Table
        this.createRouteTable(igw, 'IGW Ingress Route Table', [
            { destination: '100.64.0.0/16', target: 'local', type: 'local' },
            { destination: '10.1.0.0/16', target: 'Firewall_Endpoint_AZ', type: 'endpoint' },
            { destination: '10.2.0.0/16', target: 'Firewall_Endpoint_AZ', type: 'endpoint' }
        ]);
        
        // Firewall VPC Route Tables
        this.createRouteTable(firewallSubnet, 'Firewall Subnet Route Table', [
            { destination: '100.64.0.0/16', target: 'local', type: 'local' },
            { destination: '10.1.0.0/16', target: 'tgw-id', type: 'transit' },
            { destination: '10.2.0.0/16', target: 'tgw-id', type: 'transit' },
            { destination: '0.0.0.0/0', target: 'igw-id', type: 'public' }
        ]);
        
        this.createRouteTable(firewall, 'Dedicated Firewall Route Table', [
            { destination: '100.64.0.0/16', target: 'local', type: 'local' },
            { destination: '10.1.0.0/16', target: 'TGW_Attachment_App_VPC_1', type: 'transit' },
            { destination: '10.2.0.0/16', target: 'TGW_Attachment_App_VPC_2', type: 'transit' },
            { destination: '0.0.0.0/0', target: 'igw-id', type: 'public' }
        ]);
        
        // Transit Gateway Route Tables
        this.createRouteTable(tgw, 'TGW Route Table (Firewall)', [
            { destination: '10.1.0.0/16', target: 'TGW_Attachment_App_VPC_1', type: 'spoke' },
            { destination: '10.2.0.0/16', target: 'TGW_Attachment_App_VPC_2', type: 'spoke' },
            { destination: '0.0.0.0/0', target: 'TGW_Attachment_Firewall_VPC', type: 'inspection' }
        ]);
        
        // Application VPC 1 Route Tables
        this.createRouteTable(appVPC1, 'App VPC 1 Route Table', [
            { destination: '10.1.0.0/16', target: 'local', type: 'local' },
            { destination: '0.0.0.0/0', target: 'tgw-id', type: 'transit' }
        ]);
        
        this.createRouteTable(appSubnet1, 'App Subnet 1 Route Table', [
            { destination: '10.1.0.0/16', target: 'local', type: 'local' },
            { destination: '10.2.0.0/16', target: 'tgw-id', type: 'transit' },
            { destination: '0.0.0.0/0', target: 'tgw-id', type: 'transit' }
        ]);
        
        // Application VPC 2 Route Tables
        this.createRouteTable(appVPC2, 'App VPC 2 Route Table', [
            { destination: '10.2.0.0/16', target: 'local', type: 'local' },
            { destination: '0.0.0.0/0', target: 'tgw-id', type: 'transit' }
        ]);
        
        this.createRouteTable(appSubnet2, 'App Subnet 2 Route Table', [
            { destination: '10.2.0.0/16', target: 'local', type: 'local' },
            { destination: '10.1.0.0/16', target: 'tgw-id', type: 'transit' },
            { destination: '0.0.0.0/0', target: 'tgw-id', type: 'transit' }
        ]);
    }

    createNumberedFlow(from, to, number) {
        // Create arrow with number for traffic flow visualization
        const direction = new THREE.Vector3()
            .subVectors(to.position, from.position)
            .normalize();
        
        const arrowGeometry = new THREE.ConeGeometry(0.5, 2, 8);
        const arrowMaterial = new THREE.MeshStandardMaterial({ color: 0xff6b6b });
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        
        const midpoint = new THREE.Vector3()
            .addVectors(from.position, to.position)
            .multiplyScalar(0.5);
        
        arrow.position.copy(midpoint);
        arrow.lookAt(to.position);
        arrow.rotateX(Math.PI / 2);
        
        // Add number label
        const numberGeometry = new THREE.PlaneGeometry(1, 1);
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, 64, 64);
        context.fillStyle = '#000000';
        context.font = '32px Arial';
        context.textAlign = 'center';
        context.fillText(number, 32, 40);
        
        const numberTexture = new THREE.CanvasTexture(canvas);
        const numberMaterial = new THREE.MeshBasicMaterial({ 
            map: numberTexture, 
            transparent: true 
        });
        const numberMesh = new THREE.Mesh(numberGeometry, numberMaterial);
        numberMesh.position.copy(midpoint);
        numberMesh.position.y += 3;
        numberMesh.lookAt(this.camera.position);
        
        this.scene.add(arrow);
        this.scene.add(numberMesh);
        
        return { arrow, numberMesh };
    }

    createTransitGateway(x, y, z, label) {
        const group = new THREE.Group();
        
        // Main body - distinctive transit gateway shape
        const geometry = new THREE.CylinderGeometry(2, 2, 1, 6);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x9b59b6, 
            metalness: 0.7, 
            roughness: 0.3 
        });
        const body = new THREE.Mesh(geometry, material);
        body.castShadow = true;
        body.receiveShadow = true;
        
        // Connection points for multiple VPCs
        const pointGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const pointMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff, 
            metalness: 0.8, 
            roughness: 0.2 
        });
        
        for (let i = 0; i < 6; i++) {
            const point = new THREE.Mesh(pointGeometry, pointMaterial);
            const angle = (i / 6) * Math.PI * 2;
            point.position.set(Math.cos(angle) * 2.2, 0, Math.sin(angle) * 2.2);
            group.add(point);
        }
        
        group.add(body);
        group.position.set(x, y, z);
        group.userData = { type: 'transit-gateway', label };
        
        this.scene.add(group);
        this.components.push({ object: group, type: 'transit-gateway', label });
        
        return group;
    }

    createVPC(x, y, z, label, color = '#3498db') {
        const group = new THREE.Group();
        
        // Create VPC as a larger transparent box
        const geometry = new THREE.BoxGeometry(8, 4, 8);
        const material = new THREE.MeshStandardMaterial({ 
            color: color, 
            transparent: true, 
            opacity: 0.3,
            metalness: 0.1,
            roughness: 0.8
        });
        const vpc = new THREE.Mesh(geometry, material);
        vpc.castShadow = true;
        vpc.receiveShadow = true;
        
        // Add wireframe
        const wireframe = new THREE.WireframeGeometry(geometry);
        const wireMaterial = new THREE.LineBasicMaterial({ color: color, linewidth: 2 });
        const wireObject = new THREE.LineSegments(wireframe, wireMaterial);
        
        group.add(vpc);
        group.add(wireObject);
        group.position.set(x, y, z);
        group.userData = { type: 'vpc', label };
        
        this.scene.add(group);
        this.components.push({ object: group, type: 'vpc', label });
        this.updateStatistics();
        
        return group;
    }

    createSubnet(x, y, z, label, color = '#e74c3c', parent = null) {
        const group = new THREE.Group();
        
        // Subnet as smaller box inside VPC
        const geometry = new THREE.BoxGeometry(3, 1.5, 3);
        const material = new THREE.MeshStandardMaterial({ 
            color: color, 
            transparent: true, 
            opacity: 0.6,
            metalness: 0.2,
            roughness: 0.6
        });
        const subnet = new THREE.Mesh(geometry, material);
        subnet.castShadow = true;
        subnet.receiveShadow = true;
        
        group.add(subnet);
        group.position.set(x, y, z);
        group.userData = { type: 'subnet', label, parent };
        
        this.scene.add(group);
        this.components.push({ object: group, type: 'subnet', label });
        this.updateStatistics();
        
        return group;
    }

    createFirewall(x, y, z, label) {
        const group = new THREE.Group();
        
        // Main firewall body
        const geometry = new THREE.CylinderGeometry(1, 1, 3, 8);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xe74c3c, 
            metalness: 0.7, 
            roughness: 0.3 
        });
        const body = new THREE.Mesh(geometry, material);
        body.castShadow = true;
        body.receiveShadow = true;
        
        // Firewall shield symbol
        const shieldGeometry = new THREE.RingGeometry(0.5, 1.2, 8);
        const shieldMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.8 
        });
        const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
        shield.rotation.x = Math.PI / 2;
        shield.position.y = 2;
        
        group.add(body);
        group.add(shield);
        group.position.set(x, y, z);
        group.userData = { type: 'firewall', label };
        
        this.scene.add(group);
        this.components.push({ object: group, type: 'firewall', label });
        this.updateStatistics();
        
        return group;
    }

    createInternetGateway(x, y, z, label) {
        const group = new THREE.Group();
        
        // IGW as a distinctive gateway shape
        const geometry = new THREE.BoxGeometry(4, 2, 1);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xf39c12, 
            metalness: 0.8, 
            roughness: 0.2 
        });
        const body = new THREE.Mesh(geometry, material);
        body.castShadow = true;
        body.receiveShadow = true;
        
        // Add cloud symbol for internet
        const cloudGeometry = new THREE.SphereGeometry(1, 8, 6);
        const cloudMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xecf0f1, 
            transparent: true, 
            opacity: 0.8 
        });
        const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
        cloud.position.y = 2;
        
        group.add(body);
        group.add(cloud);
        group.position.set(x, y, z);
        group.userData = { type: 'gateway', label };
        
        this.scene.add(group);
        this.components.push({ object: group, type: 'gateway', label });
        this.updateStatistics();
        
        return group;
    }

    createNATGateway(x, y, z, label) {
        const group = new THREE.Group();
        
        // Main body
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xf39c12, 
            metalness: 0.5, 
            roughness: 0.4 
        });
        const body = new THREE.Mesh(geometry, material);
        body.castShadow = true;
        body.receiveShadow = true;
        
        // Arrow icon
        const arrowGeometry = new THREE.ConeGeometry(0.3, 0.8, 8);
        const arrowMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xe67e22, 
            metalness: 0.7, 
            roughness: 0.2 
        });
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrow.rotation.z = Math.PI / 2;
        arrow.position.x = 0.5;
        
        group.add(body, arrow);
        group.position.set(x, y, z);
        group.userData = { type: 'nat-gateway', label };
        
        this.scene.add(group);
        this.components.push({ object: group, type: 'nat-gateway', label });
        
        return group;
    }

    createLoadBalancer(x, y, z, label) {
        const group = new THREE.Group();
        
        // Main body
        const geometry = new THREE.BoxGeometry(3, 1.5, 2);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x9b59b6, 
            metalness: 0.6, 
            roughness: 0.3 
        });
        const body = new THREE.Mesh(geometry, material);
        body.castShadow = true;
        body.receiveShadow = true;
        
        // Balance icon
        const balanceGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1, 8);
        const balanceMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8e44ad, 
            metalness: 0.8, 
            roughness: 0.1 
        });
        const balance = new THREE.Mesh(balanceGeometry, balanceMaterial);
        balance.position.y = 0.5;
        
        group.add(body, balance);
        group.position.set(x, y, z);
        group.userData = { type: 'load-balancer', label };
        
        this.scene.add(group);
        this.components.push({ object: group, type: 'load-balancer', label });
        
        return group;
    }

    createConnection(from, to, color) {
        const fromPos = from.position;
        const toPos = to.position;
        
        const points = [fromPos, toPos];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: color, linewidth: 3 });
        const line = new THREE.Line(geometry, material);
        
        this.scene.add(line);
    }

    createRouteTable(component, title, routes) {
        // Always use component.userData.label as the key
        const key = component.userData?.label;
        this.routeTables[key] = {
            title,
            routes,
            component
        };
        console.log('Route table created for:', key, this.routeTables[key]);
        
        // Update the route tables display panel
        this.updateRouteTablesDisplay();
    }

    updateRouteTablesDisplay() {
        const routeTablesContainer = document.querySelector('#routeTablesContent');
        if (!routeTablesContainer) {
            console.warn('Route tables container not found');
            return;
        }
        
        let content = '';
        
        if (Object.keys(this.routeTables).length === 0) {
            content = '<p>No route tables configured for this deployment model.</p>';
        } else {
            Object.entries(this.routeTables).forEach(([key, routeTable]) => {
                content += `
                    <div class="route-table-section">
                        <h4>${routeTable.title}</h4>
                        <div class="component-label">${key}</div>
                        <table class="route-table">
                            <thead>
                                <tr>
                                    <th>Destination</th>
                                    <th>Target</th>
                                    <th>Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${routeTable.routes.map(route => `
                                    <tr class="route-${route.type}">
                                        <td>${route.destination}</td>
                                        <td>${route.target}</td>
                                        <td><span class="route-type-badge route-type-${route.type}">${route.type}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            });
        }
        
        routeTablesContainer.innerHTML = content;
        console.log('Route tables display updated with', Object.keys(this.routeTables).length, 'tables');
    }

    showComponentInfo(component, type, info) {
        // Log the label and available route table keys
        const label = component.userData?.label || component.name;
        console.log('Clicked component label:', label);
        console.log('Available route table keys:', Object.keys(this.routeTables));
        const routeTable = this.routeTables[label];
        
        let content = `
            <h4>${info.description}</h4>
            <div class="info-section">
                <h5>Component Details:</h5>
                <ul>
                    <li><strong>Type:</strong> ${type}</li>
                    <li><strong>Label:</strong> ${label}</li>
                    <li><strong>Position:</strong> (${component.position.x.toFixed(1)}, ${component.position.y.toFixed(1)}, ${component.position.z.toFixed(1)})</li>
                </ul>
            </div>
            <div class="info-section">
                <h5>Features:</h5>
                <ul>
                    ${info.features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
            </div>
            <div class="info-section">
                <h5>Best Practices:</h5>
                <ul>
                    ${info.bestPractices.map(practice => `<li>${practice}</li>`).join('')}
                </ul>
            </div>
        `;
        
        if (routeTable && routeTable.routes && routeTable.routes.length > 0) {
            content += `
                <div class="info-section">
                    <h5>Associated Route Table: ${routeTable.title}</h5>
                    <table class="route-table">
                        <thead>
                            <tr>
                                <th>Destination</th>
                                <th>Target</th>
                                <th>Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${routeTable.routes.map(route => `
                                <tr class="route-${route.type}">
                                    <td>${route.destination}</td>
                                    <td>${route.target}</td>
                                    <td><span class="route-type-badge route-type-${route.type}">${route.type}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            content += `<div class='info-section'><em>No route table associated with this component.</em></div>`;
        }
        
        document.getElementById('infoContent').innerHTML = content;
    }

    // Simulation methods
    startSimulation() {
        this.simulationRunning = true;
        document.getElementById('startSimulation').disabled = true;
        document.getElementById('stopSimulation').disabled = false;
        
        // Start traffic animation
        this.animateTraffic();
        
        // Update statistics
        this.updateStatistics();
    }

    stopSimulation() {
        this.simulationRunning = false;
        document.getElementById('startSimulation').disabled = false;
        document.getElementById('stopSimulation').disabled = true;
        
        // Clear existing traffic particles
        this.trafficAnimations.forEach(anim => {
            if (anim.particle) {
                this.scene.remove(anim.particle);
            }
        });
        this.trafficAnimations = [];
        
        // Update statistics
        this.updateStatistics();
    }

    resetSimulation() {
        this.stopSimulation();
        // Reset any simulation state
    }

    animateTraffic() {
        if (!this.simulationRunning) return;
        
        // Get all connections (lines between components)
        const connections = this.components.filter(comp => 
            comp.type === 'connection' || comp.object.userData?.type === 'connection'
        );
        
        connections.forEach(connection => {
            const from = connection.object?.userData?.from || connection.from;
            const to = connection.object?.userData?.to || connection.to;
            
            if (from && to) {
                // Create traffic particle
                const particleGeometry = new THREE.SphereGeometry(0.3, 8, 8);
                const particleMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0xf39c12,
                    transparent: true,
                    opacity: 0.8
                });
                const particle = new THREE.Mesh(particleGeometry, particleMaterial);
                
                // Position at start
                particle.position.copy(from.position);
                this.scene.add(particle);
                
                // Animate to destination
                const duration = 3000; // 3 seconds
                const startTime = Date.now();
                const startPos = from.position.clone();
                const endPos = to.position.clone();
                
                const animate = () => {
                    if (!this.simulationRunning) {
                        this.scene.remove(particle);
                        return;
                    }
                    
                    const elapsed = Date.now() - startTime;
                    const progress = elapsed / duration;
                    
                    if (progress >= 1) {
                        // Remove particle when it reaches destination
                        this.scene.remove(particle);
                        
                        // Create new particle after delay
                        if (this.simulationRunning) {
                            setTimeout(() => {
                                if (this.simulationRunning) {
                                    this.animateTraffic();
                                }
                            }, 1000);
                        }
                        return;
                    }
                    
                    // Interpolate position
                    particle.position.lerpVectors(startPos, endPos, progress);
                    
                    // Add some bobbing motion
                    particle.position.y += Math.sin(progress * Math.PI * 4) * 0.2;
                    
                    // Scale particle based on progress
                    const scale = 0.5 + progress * 0.5;
                    particle.scale.set(scale, scale, scale);
                    
                    requestAnimationFrame(animate);
                };
                
                animate();
                
                // Store animation reference
                this.trafficAnimations.push({
                    particle,
                    startTime: Date.now(),
                    duration
                });
            }
        });
        
        // If no connections, create some demo traffic between components
        if (connections.length === 0) {
            const components = this.components.filter(comp => 
                comp.type !== 'connection' && comp.object && comp.object.position
            );
            
            if (components.length > 1) {
                for (let i = 0; i < Math.min(3, components.length - 1); i++) {
                    const from = components[i].object;
                    const to = components[i + 1].object;
                    
                    // Create traffic particle
                    const particleGeometry = new THREE.SphereGeometry(0.3, 8, 8);
                    const particleMaterial = new THREE.MeshBasicMaterial({ 
                        color: 0xe74c3c,
                        transparent: true,
                        opacity: 0.8
                    });
                    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
                    
                    particle.position.copy(from.position);
                    this.scene.add(particle);
                    
                    const duration = 4000;
                    const startTime = Date.now();
                    const startPos = from.position.clone();
                    const endPos = to.position.clone();
                    
                    const animate = () => {
                        if (!this.simulationRunning) {
                            this.scene.remove(particle);
                            return;
                        }
                        
                        const elapsed = Date.now() - startTime;
                        const progress = elapsed / duration;
                        
                        if (progress >= 1) {
                            this.scene.remove(particle);
                            if (this.simulationRunning) {
                                setTimeout(() => {
                                    if (this.simulationRunning) {
                                        this.animateTraffic();
                                    }
                                }, 2000);
                            }
                            return;
                        }
                        
                        particle.position.lerpVectors(startPos, endPos, progress);
                        particle.position.y += Math.sin(progress * Math.PI * 3) * 0.3;
                        
                        const scale = 0.3 + progress * 0.7;
                        particle.scale.set(scale, scale, scale);
                        
                        requestAnimationFrame(animate);
                    };
                    
                    animate();
                    
                    this.trafficAnimations.push({
                        particle,
                        startTime: Date.now(),
                        duration
                    });
                }
            }
        }
    }

    // Utility methods
    zoomIn() {
        this.camera.position.multiplyScalar(0.9);
        this.controls.update();
    }

    zoomOut() {
        this.camera.position.multiplyScalar(1.1);
        this.controls.update();
    }

    resetView() {
        this.camera.position.set(40, 40, 40);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    toggleWireframe(show = null) {
        if (show !== null) {
            this.wireframeMode = show;
        } else {
            this.wireframeMode = !this.wireframeMode;
        }
        
        this.scene.traverse((object) => {
            if (object.isMesh && object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(mat => {
                        mat.wireframe = this.wireframeMode;
                    });
                } else {
                    object.material.wireframe = this.wireframeMode;
                }
            }
        });
    }

    clearScene() {
        // Remove all existing components from scene except lights
        const objectsToRemove = [];
        this.scene.traverse((child) => {
            if (!child.isLight && !child.isCamera && child !== this.scene) {
                objectsToRemove.push(child);
            }
        });
        
        objectsToRemove.forEach((obj) => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(mat => mat.dispose());
                } else {
                    obj.material.dispose();
                }
            }
            if (obj.parent) {
                obj.parent.remove(obj);
            }
        });
        
        // Clear components array
        this.components = [];
        this.routeTables = {};
        
        // Update statistics
        this.updateStatistics();
    }

    exportImage() {
        this.renderer.render(this.scene, this.camera);
        const dataURL = this.renderer.domElement.toDataURL('image/png');
        
        const link = document.createElement('a');
        link.download = 'aws-network-firewall-3d-architecture.png';
        link.href = dataURL;
        link.click();
    }

    saveProject() {
        const projectData = {
            components: this.components.map(comp => ({
                type: comp.type,
                label: comp.label,
                position: comp.object.position.toArray(),
                userData: comp.object.userData
            })),
            routeTables: this.routeTables,
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.download = 'aws-firewall-3d-project.json';
        link.href = URL.createObjectURL(blob);
        link.click();
    }

    showHelp() {
        document.getElementById('helpModal').style.display = 'block';
    }

    hideHelp() {
        document.getElementById('helpModal').style.display = 'none';
    }

    onMouseClick(event) {
        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
        mouse.y = -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        
        const intersects = raycaster.intersectObjects(this.scene.children, true);
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            const component = this.components.find(comp => comp.object === object || comp.object.children.includes(object));
            
            if (component) {
                this.showComponentInfo(component.object, component.type, this.getComponentInfo(component.type, component.label));
            }
        }
    }

    onMouseMove(event) {
        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
        mouse.y = -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;
        
        document.getElementById('mousePosition').textContent = 
            `3D View: X: ${mouse.x.toFixed(2)}, Y: ${mouse.y.toFixed(2)}`;
    }

    getComponentInfo(type, label) {
        const infoMap = {
            'vpc': this.getVPCInfo.bind(this),
            'subnet': this.getSubnetInfo.bind(this),
            'firewall': this.getFirewallInfo.bind(this),
            'internet-gateway': this.getIGWInfo.bind(this),
            'nat-gateway': this.getNATInfo.bind(this),
            'load-balancer': this.getLBInfo.bind(this)
        };
        
        return infoMap[type] ? infoMap[type](label) : {
            description: `${type} - ${label}`,
            features: ['3D component'],
            bestPractices: ['Configure according to AWS best practices']
        };
    }

    updateTrafficType(type) {
        console.log('Traffic type changed to:', type);
    }

    updateAnimationSpeed(speed) {
        console.log('Animation speed changed to:', speed);
    }

    toggleRouteTables(show) {
        const routeTablesPanel = document.querySelector('.route-tables');
        if (routeTablesPanel) {
            routeTablesPanel.style.display = show ? 'block' : 'none';
        }
        
        // Update the display when toggled on
        if (show) {
            this.updateRouteTablesDisplay();
        }
        
        console.log('Route tables visibility:', show);
    }

    toggleTrafficFlow(show) {
        console.log('Traffic flow visibility:', show);
    }

    updateStatistics() {
        // Count different component types
        const counts = {
            vpcs: 0,
            firewalls: 0,
            subnets: 0,
            gateways: 0,
            transitGateways: 0
        };
        
        this.components.forEach(comp => {
            if (comp.type === 'vpc') counts.vpcs++;
            else if (comp.type === 'firewall') counts.firewalls++;
            else if (comp.type === 'subnet') counts.subnets++;
            else if (comp.type === 'gateway') counts.gateways++;
            else if (comp.type === 'transit-gateway') counts.transitGateways++;
        });
        
        // Update UI statistics
        const statsElement = document.querySelector('.stats-content');
        if (statsElement) {
            statsElement.innerHTML = `
                <div class="stat-item">
                    <span class="stat-label">VPCs</span>
                    <span class="stat-value">${counts.vpcs}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Firewalls</span>
                    <span class="stat-value">${counts.firewalls}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Subnets</span>
                    <span class="stat-value">${counts.subnets}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Gateways</span>
                    <span class="stat-value">${counts.gateways + counts.transitGateways}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">3D Traffic Flow</span>
                    <span class="stat-value">0 packets/s</span>
                </div>
            `;
        }
    }

    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoading() {
        console.log('Hiding loading overlay');
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    addComponent(componentType) {
        if (this.currentMode !== 'design') return;
        
        const center = new THREE.Vector3(0, 0, 0);
        const x = center.x + (Math.random() - 0.5) * 20;
        const y = center.y + (Math.random() - 0.5) * 20;
        const z = center.z + (Math.random() - 0.5) * 20;
        
        switch (componentType) {
            case 'vpc':
                this.createVPC(x, y, z, 'New VPC', '#3498db');
                break;
            case 'subnet':
                this.createSubnet(x, y, z, 'New Subnet', '#e74c3c');
                break;
            case 'firewall':
                this.createFirewall(x, y, z, 'New Firewall');
                break;
            case 'internet-gateway':
                this.createInternetGateway(x, y, z, 'New Internet Gateway');
                break;
            case 'nat-gateway':
                this.createNATGateway(x, y, z, 'New NAT Gateway');
                break;
            case 'load-balancer':
                this.createLoadBalancer(x, y, z, 'New Load Balancer');
                break;
        }
        
        this.updateStatistics();
    }

    // Information methods
    getVPCInfo(label) {
        return {
            description: `Virtual Private Cloud (VPC) - ${label}`,
            features: [
                'Isolated network environment',
                'Custom IP address ranges',
                'Subnet configuration',
                'Route table management',
                'Security group association'
            ],
            bestPractices: [
                'Use private subnets for sensitive resources',
                'Implement proper route table configurations',
                'Use security groups for traffic control',
                'Consider VPC peering for multi-VPC architectures'
            ]
        };
    }

    getSubnetInfo(label) {
        return {
            description: `Subnet - ${label}`,
            features: [
                'Logical subdivision of VPC',
                'Availability Zone placement',
                'Route table association',
                'Network ACL configuration',
                'Security group assignment'
            ],
            bestPractices: [
                'Use public subnets for internet-facing resources',
                'Use private subnets for internal resources',
                'Distribute subnets across multiple AZs',
                'Use appropriate CIDR blocks'
            ]
        };
    }

    getFirewallInfo(label) {
        return {
            description: `Network Firewall - ${label}`,
            features: [
                'Stateful packet inspection',
                'Intrusion prevention system',
                'Web filtering capabilities',
                'Threat intelligence integration',
                'High availability deployment'
            ],
            bestPractices: [
                'Deploy in multiple AZs for high availability',
                'Configure proper rule sets',
                'Monitor firewall logs regularly',
                'Update threat intelligence feeds',
                'Test firewall rules in staging environment'
            ]
        };
    }

    getIGWInfo() {
        return {
            description: 'Internet Gateway',
            features: [
                'Provides internet connectivity',
                'One per VPC',
                'Automatically scales',
                'Highly available',
                'No additional charges'
            ],
            bestPractices: [
                'Attach to VPC for internet access',
                'Use with public subnets',
                'Configure route tables properly',
                'Monitor for unauthorized access'
            ]
        };
    }

    getNATInfo() {
        return {
            description: 'NAT Gateway',
            features: [
                'Network Address Translation',
                'Outbound internet access',
                'High availability',
                'Automatic scaling',
                'Per-hour and data processing charges'
            ],
            bestPractices: [
                'Deploy in public subnets',
                'Use for private subnet internet access',
                'Configure proper route tables',
                'Monitor costs and usage'
            ]
        };
    }

    getLBInfo() {
        return {
            description: 'Load Balancer',
            features: [
                'Distributes incoming traffic',
                'Health checks',
                'SSL/TLS termination',
                'Session affinity',
                'Auto scaling integration'
            ],
            bestPractices: [
                'Deploy across multiple AZs',
                'Configure health checks',
                'Use appropriate load balancer type',
                'Monitor performance metrics',
                'Implement proper security groups'
            ]
        };
    }
}

// Initialize the 3D simulator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Show loading overlay
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
    
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
        console.warn('Loading timeout reached, showing fallback');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
        const container = document.getElementById('canvas-3d');
        if (container && !window.simulator3D) {
            container.innerHTML = `
                <div style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: white;
                    text-align: center;
                    padding: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 10px;
                ">
                    <h2>⏰ Loading Timeout</h2>
                    <p>The 3D renderer is taking longer than expected to load. Please try refreshing the page.</p>
                    <button onclick="location.reload()" style="
                        background: #3498db;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        margin-top: 10px;
                    ">Refresh Page</button>
                </div>
            `;
        }
    }, 10000); // 10 second timeout
    
    try {
        window.simulator3D = new NetworkFirewall3DSimulator();
        clearTimeout(loadingTimeout); // Clear timeout if successful
    } catch (error) {
        console.error('Failed to create 3D simulator:', error);
        clearTimeout(loadingTimeout);
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
});