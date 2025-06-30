// AWS Network Firewall Architecture Simulator
// Enhanced version with UI/UX improvements, educational features, and interactivity

class NetworkFirewallSimulator {
    constructor() {
        this.canvas = new fabric.Canvas('canvas', {
            backgroundColor: '#f8f9fa',
            selection: true,
            preserveObjectStacking: true
        });
        
        this.currentMode = 'design';
        this.currentModel = null;
        this.simulationRunning = false;
        this.trafficAnimations = [];
        this.components = [];
        this.routeTables = {};
        this.tooltips = {};
        
        this.initializeEventListeners();
        this.initializeCanvas();
        this.updateStatistics();
    }

    initializeCanvas() {
        // Set canvas size and viewport
        this.canvas.setDimensions({
            width: 2000,
            height: 1200
        });
        
        // Remove background for open roof concept
        this.canvas.setBackgroundColor('transparent', () => {
            this.canvas.renderAll();
        });
        
        // Add subtle grid for reference
        this.addGrid();
        
        // Set initial zoom and pan
        this.canvas.setZoom(0.8);
        this.canvas.setViewportTransform([0.8, 0, 0, 0.8, 100, 100]);
    }

    addGrid() {
        const gridSize = 50;
        const gridColor = 'rgba(52, 152, 219, 0.1)'; // Very subtle blue grid
        
        for (let x = 0; x <= 2000; x += gridSize) {
            const line = new fabric.Line([x, 0, x, 1200], {
                stroke: gridColor,
                strokeWidth: 1,
                selectable: false,
                evented: false
            });
            this.canvas.add(line);
        }
        
        for (let y = 0; y <= 1200; y += gridSize) {
            const line = new fabric.Line([0, y, 2000, y], {
                stroke: gridColor,
                strokeWidth: 1,
                selectable: false,
                evented: false
            });
            this.canvas.add(line);
        }
    }

    initializeEventListeners() {
        // Mode controls
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setMode(e.target.closest('.mode-btn').dataset.mode);
            });
        });

        // Model selection
        document.querySelectorAll('.model-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.loadDeploymentModel(e.target.closest('.model-btn').dataset.model);
            });
        });

        // Component library
        document.querySelectorAll('.component-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.addComponent(e.target.closest('.component-item').dataset.component);
            });
        });

        // Toolbar controls
        document.getElementById('zoomIn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOut').addEventListener('click', () => this.zoomOut());
        document.getElementById('resetView').addEventListener('click', () => this.resetView());
        document.getElementById('clearCanvas').addEventListener('click', () => this.clearCanvas());
        document.getElementById('exportImage').addEventListener('click', () => this.exportImage());
        document.getElementById('saveProject').addEventListener('click', () => this.saveProject());
        document.getElementById('helpBtn').addEventListener('click', () => this.showHelp());

        // Simulation controls
        document.getElementById('startSimulation').addEventListener('click', () => this.startSimulation());
        document.getElementById('stopSimulation').addEventListener('click', () => this.stopSimulation());
        document.getElementById('resetSimulation').addEventListener('click', () => this.resetSimulation());

        // Configuration changes
        document.getElementById('trafficType').addEventListener('change', (e) => {
            this.updateTrafficType(e.target.value);
        });
        document.getElementById('animationSpeed').addEventListener('change', (e) => {
            this.updateAnimationSpeed(e.target.value);
        });
        document.getElementById('showRouteTables').addEventListener('change', (e) => {
            this.toggleRouteTables(e.target.checked);
        });
        document.getElementById('showTrafficFlow').addEventListener('change', (e) => {
            this.toggleTrafficFlow(e.target.checked);
        });

        // Canvas events
        this.canvas.on('mouse:move', (e) => this.updateMousePosition(e));
        this.canvas.on('selection:created', (e) => this.onSelectionCreated(e));
        this.canvas.on('selection:cleared', () => this.onSelectionCleared());

        // Modal events
        document.querySelector('.close').addEventListener('click', () => this.hideHelp());
        document.querySelector('.close-route-btn').addEventListener('click', () => this.hideRouteTable());
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideHelp();
            }
        });
    }

    setMode(mode) {
        this.currentMode = mode;
        
        // Update UI
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
        
        // Update canvas behavior
        this.canvas.selection = mode === 'design';
        this.canvas.forEachObject(obj => {
            obj.selectable = mode === 'design';
            obj.evented = mode === 'design';
        });
        
        // Update information panel
        this.updateInfoPanel(mode);
    }

    updateInfoPanel(mode) {
        const infoContent = document.getElementById('infoContent');
        
        const modeInfo = {
            view: {
                title: 'View Mode',
                description: 'Explore and examine the current architecture. Click components to view details.',
                tips: [
                    'Click components to view detailed information',
                    'Use zoom and pan to navigate',
                    'View route tables and configurations'
                ]
            },
            design: {
                title: 'Design Mode',
                description: 'Build and modify your network architecture. Add components and configure settings.',
                tips: [
                    'Drag components from the library to add them',
                    'Click and drag to move components',
                    'Use the configuration panel to adjust settings'
                ]
            },
            simulate: {
                title: 'Simulation Mode',
                description: 'Test traffic flow and security scenarios. Watch how data moves through your architecture.',
                tips: [
                    'Start simulation to see traffic flow',
                    'Change traffic type to test different scenarios',
                    'Monitor statistics and performance'
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
        this.clearCanvas();
        
        // Load model
        setTimeout(() => {
            this.buildDeploymentModel(modelName);
            this.hideLoading();
            this.updateStatistics();
        }, 500);
    }

    buildDeploymentModel(modelName) {
        const models = {
            centralized: this.buildCentralizedModel.bind(this),
            decentralized: this.buildDecentralizedModel.bind(this),
            combined: this.buildCombinedModel.bind(this),
            'north-south-ingress': this.buildNorthSouthIngressModel.bind(this),
            'centralized-dedicated': this.buildCentralizedDedicatedModel.bind(this)
        };
        
        if (models[modelName]) {
            models[modelName]();
        }
    }

    buildCentralizedModel() {
        // Main VPC
        const mainVPC = this.createVPC(400, 300, 'Main VPC', '#3498db');
        
        // Public Subnet
        const publicSubnet = this.createSubnet(300, 200, 'Public Subnet', '#e74c3c', mainVPC);
        
        // Private Subnet
        const privateSubnet = this.createSubnet(500, 200, 'Private Subnet', '#27ae60', mainVPC);
        
        // Firewall
        const firewall = this.createFirewall(400, 250, 'Network Firewall');
        
        // Internet Gateway
        const igw = this.createInternetGateway(300, 150, 'Internet Gateway');
        
        // NAT Gateway
        const nat = this.createNATGateway(500, 150, 'NAT Gateway');
        
        // Connections
        this.createConnection(igw, firewall, '#f39c12');
        this.createConnection(firewall, publicSubnet, '#f39c12');
        this.createConnection(firewall, privateSubnet, '#f39c12');
        this.createConnection(nat, privateSubnet, '#9b59b6');
        
        // Route Tables
        this.createRouteTable(mainVPC, 'Main VPC Route Table', [
            { destination: '0.0.0.0/0', target: 'Internet Gateway', type: 'public' },
            { destination: '10.0.0.0/16', target: 'Local', type: 'local' }
        ]);
        
        this.createRouteTable(publicSubnet, 'Public Subnet Route Table', [
            { destination: '0.0.0.0/0', target: 'Internet Gateway', type: 'public' },
            { destination: '10.0.0.0/16', target: 'Local', type: 'local' }
        ]);
        
        this.createRouteTable(privateSubnet, 'Private Subnet Route Table', [
            { destination: '0.0.0.0/0', target: 'NAT Gateway', type: 'private' },
            { destination: '10.0.0.0/16', target: 'Local', type: 'local' }
        ]);
        
        this.canvas.renderAll();
    }

    buildDecentralizedModel() {
        // VPC 1
        const vpc1 = this.createVPC(300, 300, 'VPC 1', '#3498db');
        const subnet1 = this.createSubnet(300, 250, 'Subnet 1', '#e74c3c', vpc1);
        const firewall1 = this.createFirewall(300, 200, 'Firewall 1');
        
        // VPC 2
        const vpc2 = this.createVPC(600, 300, 'VPC 2', '#9b59b6');
        const subnet2 = this.createSubnet(600, 250, 'Subnet 2', '#f39c12', vpc2);
        const firewall2 = this.createFirewall(600, 200, 'Firewall 2');
        
        // Internet Gateway
        const igw = this.createInternetGateway(450, 150, 'Internet Gateway');
        
        // Connections
        this.createConnection(igw, firewall1, '#f39c12');
        this.createConnection(igw, firewall2, '#f39c12');
        this.createConnection(firewall1, subnet1, '#e74c3c');
        this.createConnection(firewall2, subnet2, '#f39c12');
        
        this.canvas.renderAll();
    }

    buildCombinedModel() {
        // Central VPC
        const centralVPC = this.createVPC(450, 200, 'Central VPC', '#3498db');
        const centralSubnet = this.createSubnet(450, 150, 'Central Subnet', '#e74c3c', centralVPC);
        const centralFirewall = this.createFirewall(450, 100, 'Central Firewall');
        
        // VPC 1
        const vpc1 = this.createVPC(300, 400, 'VPC 1', '#9b59b6');
        const subnet1 = this.createSubnet(300, 350, 'Subnet 1', '#f39c12', vpc1);
        const firewall1 = this.createFirewall(300, 300, 'Firewall 1');
        
        // VPC 2
        const vpc2 = this.createVPC(600, 400, 'VPC 2', '#27ae60');
        const subnet2 = this.createSubnet(600, 350, 'Subnet 2', '#e67e22', vpc2);
        const firewall2 = this.createFirewall(600, 300, 'Firewall 2');
        
        // Internet Gateway
        const igw = this.createInternetGateway(450, 50, 'Internet Gateway');
        
        // Connections
        this.createConnection(igw, centralFirewall, '#f39c12');
        this.createConnection(centralFirewall, centralSubnet, '#e74c3c');
        this.createConnection(centralFirewall, firewall1, '#9b59b6');
        this.createConnection(centralFirewall, firewall2, '#27ae60');
        this.createConnection(firewall1, subnet1, '#f39c12');
        this.createConnection(firewall2, subnet2, '#e67e22');
        
        this.canvas.renderAll();
    }

    buildNorthSouthIngressModel() {
        // Main VPC
        const mainVPC = this.createVPC(400, 300, 'Main VPC', '#3498db');
        
        // Public Subnet
        const publicSubnet = this.createSubnet(300, 200, 'Public Subnet', '#e74c3c', mainVPC);
        
        // Private Subnet
        const privateSubnet = this.createSubnet(500, 200, 'Private Subnet', '#27ae60', mainVPC);
        
        // Firewall
        const firewall = this.createFirewall(400, 150, 'Ingress Firewall');
        
        // Internet Gateway
        const igw = this.createInternetGateway(300, 100, 'Internet Gateway');
        
        // Load Balancer
        const lb = this.createLoadBalancer(400, 250, 'Load Balancer');
        
        // Connections
        this.createConnection(igw, firewall, '#f39c12');
        this.createConnection(firewall, lb, '#e74c3c');
        this.createConnection(lb, publicSubnet, '#e74c3c');
        this.createConnection(lb, privateSubnet, '#27ae60');
        
        this.canvas.renderAll();
    }

    buildCentralizedDedicatedModel() {
        // Firewall VPC
        const firewallVPC = this.createVPC(400, 200, 'Firewall VPC', '#e74c3c');
        const firewallSubnet = this.createSubnet(400, 150, 'Firewall Subnet', '#c0392b', firewallVPC);
        const firewall = this.createFirewall(400, 100, 'Dedicated Firewall');
        
        // Application VPC 1
        const appVPC1 = this.createVPC(250, 400, 'App VPC 1', '#3498db');
        const appSubnet1 = this.createSubnet(250, 350, 'App Subnet 1', '#2980b9', appVPC1);
        
        // Application VPC 2
        const appVPC2 = this.createVPC(550, 400, 'App VPC 2', '#9b59b6');
        const appSubnet2 = this.createSubnet(550, 350, 'App Subnet 2', '#8e44ad', appVPC2);
        
        // Internet Gateway
        const igw = this.createInternetGateway(400, 50, 'Internet Gateway');
        
        // Connections
        this.createConnection(igw, firewall, '#f39c12');
        this.createConnection(firewall, appSubnet1, '#3498db');
        this.createConnection(firewall, appSubnet2, '#9b59b6');
        
        this.canvas.renderAll();
    }

    createVPC(x, y, label, color) {
        const vpc = new fabric.Rect({
            left: x - 60,
            top: y - 40,
            width: 120,
            height: 80,
            fill: color,
            stroke: '#2c3e50',
            strokeWidth: 2,
            rx: 8,
            ry: 8,
            selectable: true,
            hasControls: true,
            hasBorders: true,
            data: { type: 'vpc', label, color }
        });
        
        const text = new fabric.Text(label, {
            left: x - 30,
            top: y + 50,
            fontSize: 14,
            fill: '#2c3e50',
            fontWeight: 'bold',
            selectable: false,
            textAlign: 'center'
        });
        
        this.canvas.add(vpc);
        this.canvas.add(text);
        this.components.push({ object: vpc, type: 'vpc', label });
        
        // Add click handler
        vpc.on('mousedown', () => this.showComponentInfo(vpc, 'VPC', this.getVPCInfo(label)));
        
        return vpc;
    }

    createSubnet(x, y, label, color, parentVPC) {
        const subnet = new fabric.Rect({
            left: x - 40,
            top: y - 25,
            width: 80,
            height: 50,
            fill: color,
            stroke: '#2c3e50',
            strokeWidth: 1,
            rx: 4,
            ry: 4,
            selectable: true,
            hasControls: true,
            hasBorders: true,
            data: { type: 'subnet', label, color, parentVPC }
        });
        
        const text = new fabric.Text(label, {
            left: x - 25,
            top: y + 30,
            fontSize: 12,
            fill: '#2c3e50',
            fontWeight: 'bold',
            selectable: false,
            textAlign: 'center'
        });
        
        this.canvas.add(subnet);
        this.canvas.add(text);
        this.components.push({ object: subnet, type: 'subnet', label });
        
        // Add click handler
        subnet.on('mousedown', () => this.showComponentInfo(subnet, 'Subnet', this.getSubnetInfo(label)));
        
        return subnet;
    }

    createFirewall(x, y, label) {
        const firewall = new fabric.Rect({
            left: x - 30,
            top: y - 20,
            width: 60,
            height: 40,
            fill: '#e74c3c',
            stroke: '#c0392b',
            strokeWidth: 2,
            rx: 6,
            ry: 6,
            selectable: true,
            hasControls: true,
            hasBorders: true,
            data: { type: 'firewall', label }
        });
        
        const text = new fabric.Text(label, {
            left: x - 25,
            top: y + 25,
            fontSize: 11,
            fill: '#2c3e50',
            fontWeight: 'bold',
            selectable: false,
            textAlign: 'center'
        });
        
        this.canvas.add(firewall);
        this.canvas.add(text);
        this.components.push({ object: firewall, type: 'firewall', label });
        
        // Add click handler
        firewall.on('mousedown', () => this.showComponentInfo(firewall, 'Firewall', this.getFirewallInfo(label)));
        
        return firewall;
    }

    createInternetGateway(x, y, label) {
        const igw = new fabric.Rect({
            left: x - 35,
            top: y - 15,
            width: 70,
            height: 30,
            fill: '#f39c12',
            stroke: '#e67e22',
            strokeWidth: 2,
            rx: 4,
            ry: 4,
            selectable: true,
            hasControls: true,
            hasBorders: true,
            data: { type: 'internet-gateway', label }
        });
        
        const text = new fabric.Text(label, {
            left: x - 30,
            top: y + 20,
            fontSize: 10,
            fill: '#2c3e50',
            fontWeight: 'bold',
            selectable: false,
            textAlign: 'center'
        });
        
        this.canvas.add(igw);
        this.canvas.add(text);
        this.components.push({ object: igw, type: 'internet-gateway', label });
        
        // Add click handler
        igw.on('mousedown', () => this.showComponentInfo(igw, 'Internet Gateway', this.getIGWInfo()));
        
        return igw;
    }

    createNATGateway(x, y, label) {
        const nat = new fabric.Rect({
            left: x - 35,
            top: y - 15,
            width: 70,
            height: 30,
            fill: '#9b59b6',
            stroke: '#8e44ad',
            strokeWidth: 2,
            rx: 4,
            ry: 4,
            selectable: true,
            hasControls: true,
            hasBorders: true,
            data: { type: 'nat-gateway', label }
        });
        
        const text = new fabric.Text(label, {
            left: x - 30,
            top: y + 20,
            fontSize: 10,
            fill: '#2c3e50',
            fontWeight: 'bold',
            selectable: false,
            textAlign: 'center'
        });
        
        this.canvas.add(nat);
        this.canvas.add(text);
        this.components.push({ object: nat, type: 'nat-gateway', label });
        
        // Add click handler
        nat.on('mousedown', () => this.showComponentInfo(nat, 'NAT Gateway', this.getNATInfo()));
        
        return nat;
    }

    createLoadBalancer(x, y, label) {
        const lb = new fabric.Rect({
            left: x - 40,
            top: y - 20,
            width: 80,
            height: 40,
            fill: '#27ae60',
            stroke: '#229954',
            strokeWidth: 2,
            rx: 6,
            ry: 6,
            selectable: true,
            hasControls: true,
            hasBorders: true,
            data: { type: 'load-balancer', label }
        });
        
        const text = new fabric.Text(label, {
            left: x - 35,
            top: y + 25,
            fontSize: 11,
            fill: '#2c3e50',
            fontWeight: 'bold',
            selectable: false,
            textAlign: 'center'
        });
        
        this.canvas.add(lb);
        this.canvas.add(text);
        this.components.push({ object: lb, type: 'load-balancer', label });
        
        // Add click handler
        lb.on('mousedown', () => this.showComponentInfo(lb, 'Load Balancer', this.getLBInfo()));
        
        return lb;
    }

    createConnection(from, to, color) {
        const fromCenter = from.getCenterPoint();
        const toCenter = to.getCenterPoint();
        
        const line = new fabric.Line([
            fromCenter.x, fromCenter.y,
            toCenter.x, toCenter.y
        ], {
            stroke: color,
            strokeWidth: 3,
            selectable: false,
            evented: false,
            data: { type: 'connection', from, to }
        });
        
        // Add arrow
        const angle = Math.atan2(toCenter.y - fromCenter.y, toCenter.x - fromCenter.x);
        const arrowLength = 15;
        const arrowAngle = Math.PI / 6;
        
        const arrow1 = new fabric.Line([
            toCenter.x - arrowLength * Math.cos(angle - arrowAngle),
            toCenter.y - arrowLength * Math.sin(angle - arrowAngle),
            toCenter.x,
            toCenter.y
        ], {
            stroke: color,
            strokeWidth: 3,
            selectable: false,
            evented: false
        });
        
        const arrow2 = new fabric.Line([
            toCenter.x - arrowLength * Math.cos(angle + arrowAngle),
            toCenter.y - arrowLength * Math.sin(angle + arrowAngle),
            toCenter.x,
            toCenter.y
        ], {
            stroke: color,
            strokeWidth: 3,
            selectable: false,
            evented: false
        });
        
        this.canvas.add(line);
        this.canvas.add(arrow1);
        this.canvas.add(arrow2);
    }

    createRouteTable(component, title, routes) {
        this.routeTables[component.data?.label || component.label] = {
            title,
            routes,
            component
        };
    }

    addComponent(componentType) {
        if (this.currentMode !== 'design') return;
        
        const center = this.canvas.getCenter();
        const x = center.left;
        const y = center.top;
        
        switch (componentType) {
            case 'vpc':
                this.createVPC(x, y, 'New VPC', '#3498db');
                break;
            case 'subnet':
                this.createSubnet(x, y, 'New Subnet', '#e74c3c');
                break;
            case 'firewall':
                this.createFirewall(x, y, 'New Firewall');
                break;
            case 'internet-gateway':
                this.createInternetGateway(x, y, 'New Internet Gateway');
                break;
            case 'nat-gateway':
                this.createNATGateway(x, y, 'New NAT Gateway');
                break;
            case 'load-balancer':
                this.createLoadBalancer(x, y, 'New Load Balancer');
                break;
        }
        
        this.canvas.renderAll();
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

    showComponentInfo(component, type, info) {
        const routeTable = this.routeTables[component.data?.label || component.label];
        
        let content = `
            <h4>${info.description}</h4>
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
        
        if (routeTable) {
            content += `
                <div class="info-section">
                    <h5>Route Table:</h5>
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
                                <tr>
                                    <td>${route.destination}</td>
                                    <td>${route.target}</td>
                                    <td>${route.type}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <button class="btn btn-primary" onclick="window.simulator.showRouteTable('${routeTable.title}')">
                        View Full Route Table
                    </button>
                </div>
            `;
        }
        
        // Update info panel
        document.getElementById('infoContent').innerHTML = content;
        
        // Show route table modal if it exists
        if (routeTable) {
            this.showRouteTable(routeTable);
        }
    }

    showRouteTable(routeTable) {
        const modal = document.getElementById('routeTableModal');
        const title = document.getElementById('routeTableTitle');
        const content = document.getElementById('routeTableContent');
        
        if (typeof routeTable === 'string') {
            // Find route table by title
            const found = Object.values(this.routeTables).find(rt => rt.title === routeTable);
            if (found) {
                routeTable = found;
            }
        }
        
        if (routeTable && routeTable.routes) {
            title.textContent = routeTable.title;
            content.innerHTML = `
                <table class="route-table-full">
                    <thead>
                        <tr>
                            <th>Destination</th>
                            <th>Target</th>
                            <th>Type</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${routeTable.routes.map(route => `
                            <tr>
                                <td>${route.destination}</td>
                                <td>${route.target}</td>
                                <td><span class="route-type ${route.type}">${route.type}</span></td>
                                <td><span class="status active">Active</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            modal.style.display = 'block';
        }
    }

    // Simulation methods
    startSimulation() {
        if (this.simulationRunning) return;
        
        this.simulationRunning = true;
        document.getElementById('startSimulation').disabled = true;
        document.getElementById('stopSimulation').disabled = false;
        
        this.animateTraffic();
    }

    stopSimulation() {
        this.simulationRunning = false;
        document.getElementById('startSimulation').disabled = false;
        document.getElementById('stopSimulation').disabled = true;
        
        // Clear existing animations
        this.trafficAnimations.forEach(anim => {
            if (anim.interval) clearInterval(anim.interval);
        });
        this.trafficAnimations = [];
    }

    resetSimulation() {
        this.stopSimulation();
        // Reset any simulation state
    }

    animateTraffic() {
        const connections = this.canvas.getObjects().filter(obj => obj.data?.type === 'connection');
        
        connections.forEach(connection => {
            const fromCenter = connection.data.from.getCenterPoint();
            const toCenter = connection.data.to.getCenterPoint();
            
            const packet = new fabric.Circle({
                left: fromCenter.x,
                top: fromCenter.y,
                radius: 3,
                fill: '#f39c12',
                selectable: false,
                evented: false
            });
            
            this.canvas.add(packet);
            
            const duration = 2000; // 2 seconds
            const startTime = Date.now();
            
            const animate = () => {
                if (!this.simulationRunning) return;
                
                const elapsed = Date.now() - startTime;
                const progress = elapsed / duration;
                
                if (progress >= 1) {
                    this.canvas.remove(packet);
                    if (this.simulationRunning) {
                        setTimeout(() => animate(), 1000);
                    }
                    return;
                }
                
                const x = fromCenter.x + (toCenter.x - fromCenter.x) * progress;
                const y = fromCenter.y + (toCenter.y - fromCenter.y) * progress;
                
                packet.set({ left: x, top: y });
                this.canvas.renderAll();
                
                requestAnimationFrame(animate);
            };
            
            animate();
        });
    }

    // Utility methods
    zoomIn() {
        const zoom = this.canvas.getZoom();
        this.canvas.setZoom(Math.min(zoom * 1.2, 3));
        this.canvas.renderAll();
    }

    zoomOut() {
        const zoom = this.canvas.getZoom();
        this.canvas.setZoom(Math.max(zoom / 1.2, 0.1));
        this.canvas.renderAll();
    }

    resetView() {
        this.canvas.setZoom(0.8);
        this.canvas.setViewportTransform([0.8, 0, 0, 0.8, 100, 100]);
        this.canvas.renderAll();
    }

    clearCanvas() {
        this.canvas.clear();
        this.addGrid();
        this.components = [];
        this.routeTables = {};
        this.updateStatistics();
    }

    exportImage() {
        const dataURL = this.canvas.toDataURL({
            format: 'png',
            quality: 1
        });
        
        const link = document.createElement('a');
        link.download = 'aws-network-firewall-architecture.png';
        link.href = dataURL;
        link.click();
    }

    saveProject() {
        const projectData = {
            components: this.components.map(comp => ({
                type: comp.type,
                label: comp.label,
                position: comp.object.getCenterPoint(),
                data: comp.object.data
            })),
            routeTables: this.routeTables,
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.download = 'aws-firewall-project.json';
        link.href = URL.createObjectURL(blob);
        link.click();
    }

    showHelp() {
        document.getElementById('helpModal').style.display = 'block';
    }

    hideHelp() {
        document.getElementById('helpModal').style.display = 'none';
    }

    hideRouteTable() {
        document.getElementById('routeTableModal').style.display = 'none';
    }

    updateMousePosition(e) {
        const pointer = this.canvas.getPointer(e.e);
        document.getElementById('mousePosition').textContent = 
            `X: ${Math.round(pointer.x)}, Y: ${Math.round(pointer.y)}`;
    }

    onSelectionCreated(e) {
        const selected = e.selected[0];
        if (selected) {
            this.showComponentInfo(selected, selected.data?.type || 'component', {
                description: selected.data?.label || 'Component',
                features: ['Click for more information'],
                bestPractices: ['Configure according to AWS best practices']
            });
        }
    }

    onSelectionCleared() {
        this.updateInfoPanel(this.currentMode);
    }

    updateTrafficType(type) {
        // Update traffic simulation behavior based on type
        console.log('Traffic type changed to:', type);
    }

    updateAnimationSpeed(speed) {
        // Update animation speed
        console.log('Animation speed changed to:', speed);
    }

    toggleRouteTables(show) {
        // Toggle route table visibility
        console.log('Route tables visibility:', show);
    }

    toggleTrafficFlow(show) {
        // Toggle traffic flow visibility
        console.log('Traffic flow visibility:', show);
    }

    updateStatistics() {
        const vpcs = this.components.filter(c => c.type === 'vpc').length;
        const firewalls = this.components.filter(c => c.type === 'firewall').length;
        const totalComponents = this.components.length;
        
        document.getElementById('componentCount').textContent = totalComponents;
        document.getElementById('vpcCount').textContent = vpcs;
        document.getElementById('firewallCount').textContent = firewalls;
        document.getElementById('trafficFlow').textContent = this.simulationRunning ? 'Active' : '0 packets/s';
    }

    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}

// Initialize the simulator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.simulator = new NetworkFirewallSimulator();
}); 