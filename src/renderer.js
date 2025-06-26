// Network Firewall Architecture Simulator - Renderer Process
class NetworkFirewallSimulator {
    constructor() {
        this.canvas = null;
        this.connections = [];
        this.componentCounter = { vpc: 0, firewall: 0, subnet: 0, igw: 0, tgw: 0, nat: 0 };
        this.selectedComponents = [];
        this.currentModel = null;
        this.zoom = 1;
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.updateStatus('Network Firewall Simulator loaded successfully');
    }

    setupCanvas() {
        this.canvas = new fabric.Canvas('canvas', {
            backgroundColor: '#ffffff',
            selection: true,
            preserveObjectStacking: true
        });

        // Enable object controls
        this.canvas.on('selection:created', (e) => this.onObjectSelected(e));
        this.canvas.on('selection:updated', (e) => this.onObjectSelected(e));
        this.canvas.on('selection:cleared', () => this.onSelectionCleared());
        this.canvas.on('object:moving', (e) => this.onObjectMoving(e));
        this.canvas.on('object:moved', (e) => this.onObjectMoved(e));
        this.canvas.on('mouse:move', (e) => this.updateMouseCoordinates(e));

        // Add grid
        this.addGrid();
    }

    addGrid() {
        const gridSize = 20;
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;

        // Vertical lines
        for (let i = 0; i <= canvasWidth; i += gridSize) {
            const line = new fabric.Line([i, 0, i, canvasHeight], {
                stroke: 'rgba(200, 200, 200, 0.3)',
                strokeWidth: 1,
                selectable: false,
                evented: false
            });
            this.canvas.add(line);
            this.canvas.sendToBack(line);
        }

        // Horizontal lines
        for (let i = 0; i <= canvasHeight; i += gridSize) {
            const line = new fabric.Line([0, i, canvasWidth, i], {
                stroke: 'rgba(200, 200, 200, 0.3)',
                strokeWidth: 1,
                selectable: false,
                evented: false
            });
            this.canvas.add(line);
            this.canvas.sendToBack(line);
        }
    }

    setupEventListeners() {
        // Deployment model buttons
        document.querySelectorAll('.model-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.loadDeploymentModel(e.target.dataset.model);
            });
        });

        // Toolbar buttons
        document.getElementById('clearCanvas').addEventListener('click', () => this.clearCanvas());
        document.getElementById('saveCanvas').addEventListener('click', () => this.saveCanvas());
        document.getElementById('exportCanvas').addEventListener('click', () => this.exportCanvas());
        document.getElementById('zoomIn').addEventListener('click', () => this.zoomCanvas(1.2));
        document.getElementById('zoomOut').addEventListener('click', () => this.zoomCanvas(0.8));
        document.getElementById('resetZoom').addEventListener('click', () => this.resetZoom());

        // Configuration inputs
        document.getElementById('azCount').addEventListener('change', () => this.updateConfiguration());
        document.getElementById('spokeCount').addEventListener('change', () => this.updateConfiguration());
        document.getElementById('privateSubnets').addEventListener('change', () => this.updateConfiguration());

        // Modal handling
        if (document.querySelector('.close')) {
            document.querySelector('.close').addEventListener('click', () => {
                document.getElementById('aboutModal').style.display = 'none';
            });
        }
    }

    setupDragAndDrop() {
        const componentItems = document.querySelectorAll('.component-item');
        
        componentItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', e.target.dataset.type);
            });
        });

        const canvasElement = document.getElementById('canvas');
        canvasElement.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        canvasElement.addEventListener('drop', (e) => {
            e.preventDefault();
            const componentType = e.dataTransfer.getData('text/plain');
            if (componentType) {
                const rect = canvasElement.getBoundingClientRect();
                const x = e.clientX - rect.left - 20;
                const y = e.clientY - rect.top - 20;
                this.addComponent(componentType, x, y);
            }
        });
    }

    addComponent(type, x, y, customProps = {}) {
        this.componentCounter[type]++;
        const id = `${type}-${this.componentCounter[type]}`;
        
        let component;
        const commonProps = {
            left: x,
            top: y,
            componentType: type,
            componentId: id,
            hasControls: true,
            hasBorders: true,
            lockUniScaling: true,
            ...customProps
        };

        switch (type) {
            case 'vpc':
                component = this.createVPC(commonProps);
                break;
            case 'firewall':
                component = this.createFirewall(commonProps);
                break;
            case 'subnet':
                component = this.createSubnet(commonProps);
                break;
            case 'igw':
                component = this.createGateway(commonProps);
                break;
            case 'tgw':
                component = this.createTransitGateway(commonProps);
                break;
            case 'nat':
                component = this.createNATGateway(commonProps);
                break;
        }

        if (component) {
            this.canvas.add(component);
            this.canvas.renderAll();
            this.updateStatus(`Added ${type.toUpperCase()} component: ${id}`);
        }

        return component;
    }

    createVPC(props) {
        const isProtected = props.componentId.includes('protected') || props.componentId.includes('vpc');
        const width = 280;
        const height = 200;
        
        const group = new fabric.Group([
            // VPC container with AWS green styling
            new fabric.Rect({
                width: width,
                height: height,
                fill: isProtected ? 'rgba(76, 175, 80, 0.1)' : 'rgba(243, 156, 18, 0.1)',
                stroke: isProtected ? '#4CAF50' : '#f39c12',
                strokeWidth: 2,
                rx: 8,
                ry: 8,
                strokeDashArray: [10, 5]
            }),
            // VPC icon and label background
            new fabric.Rect({
                width: width - 20,
                height: 25,
                fill: isProtected ? '#4CAF50' : '#f39c12',
                left: -width/2 + 10,
                top: -height/2 + 5,
                rx: 4,
                ry: 4
            }),
            // VPC icon
            new fabric.Text('🏛️', {
                fontSize: 16,
                left: -width/2 + 20,
                top: -height/2 + 8,
                fill: 'white'
            }),
            // VPC label
            new fabric.Text(props.componentId.toUpperCase(), {
                fontSize: 12,
                fontWeight: 'bold',
                fill: 'white',
                left: -width/2 + 45,
                top: -height/2 + 12,
                textAlign: 'left'
            }),
            // CIDR range (if it's a protected VPC)
            new fabric.Text(isProtected ? this.generateCIDR(props.componentId) : '', {
                fontSize: 10,
                fill: isProtected ? '#4CAF50' : '#f39c12',
                left: 0,
                top: -height/2 + 40,
                textAlign: 'center'
            })
        ], {
            ...props,
            selectable: true,
            hasControls: true
        });
        
        return group;
    }

    createFirewall(props) {
        const size = 60;
        
        const group = new fabric.Group([
            // Outer circle (AWS Network Firewall style)
            new fabric.Circle({
                radius: size/2,
                fill: 'rgba(244, 67, 54, 0.1)',
                stroke: '#F44336',
                strokeWidth: 2
            }),
            // Inner circle with firewall icon
            new fabric.Circle({
                radius: size/2 - 8,
                fill: '#F44336',
                stroke: 'none'
            }),
            // AWS Network Firewall icon
            new fabric.Text('🛡️', {
                fontSize: 24,
                fill: 'white',
                top: -12,
                left: 0,
                textAlign: 'center'
            }),
            // Label
            new fabric.Text('Firewall endpoint', {
                fontSize: 9,
                fontWeight: 'bold',
                fill: '#F44336',
                top: size/2 + 10,
                textAlign: 'center'
            })
        ], {
            ...props,
            selectable: true,
            hasControls: true
        });
        
        return group;
    }

    createSubnet(props) {
        const isFirewall = props.componentId.includes('firewall') || props.componentId.includes('fw');
        const isProtected = props.componentId.includes('protected');
        const isPrivate = props.componentId.includes('private');
        
        let bgColor, strokeColor, icon, iconBg;
        
        if (isFirewall) {
            bgColor = 'rgba(158, 158, 158, 0.15)';
            strokeColor = '#9E9E9E';
            icon = '🛡️';
            iconBg = '#9E9E9E';
        } else if (isProtected) {
            bgColor = 'rgba(158, 158, 158, 0.15)';
            strokeColor = '#9E9E9E';
            icon = '💼';
            iconBg = '#9E9E9E';
        } else if (isPrivate) {
            bgColor = 'rgba(158, 158, 158, 0.15)';
            strokeColor = '#9E9E9E';
            icon = '🔒';
            iconBg = '#9E9E9E';
        } else {
            bgColor = 'rgba(158, 158, 158, 0.15)';
            strokeColor = '#9E9E9E';
            icon = '📦';
            iconBg = '#9E9E9E';
        }
        
        const width = 180;
        const height = 80;
        
        const group = new fabric.Group([
            // Subnet container
            new fabric.Rect({
                width: width,
                height: height,
                fill: bgColor,
                stroke: strokeColor,
                strokeWidth: 1.5,
                rx: 4,
                ry: 4
            }),
            // Icon background
            new fabric.Rect({
                width: 30,
                height: 20,
                fill: iconBg,
                left: -width/2 + 8,
                top: -height/2 + 4,
                rx: 2,
                ry: 2
            }),
            // Icon
            new fabric.Text(icon, {
                fontSize: 14,
                left: -width/2 + 20,
                top: -height/2 + 8,
                fill: 'white'
            }),
            // Subnet label
            new fabric.Text(this.formatSubnetLabel(props.componentId), {
                fontSize: 11,
                fontWeight: 'bold',
                fill: strokeColor,
                left: -width/2 + 45,
                top: -height/2 + 8,
                textAlign: 'left'
            }),
            // CIDR
            new fabric.Text(this.generateSubnetCIDR(props.componentId), {
                fontSize: 9,
                fill: '#666',
                left: 0,
                top: -height/2 + 30,
                textAlign: 'center'
            }),
            // Content/Workload indicator
            new fabric.Text(isFirewall ? 'Firewall endpoint' : 'Workload', {
                fontSize: 10,
                fill: '#666',
                left: 0,
                top: height/2 - 20,
                textAlign: 'center'
            })
        ], {
            ...props,
            selectable: true,
            hasControls: true
        });
        
        return group;
    }

    createGateway(props) {
        const isInternet = props.componentId.includes('internet');
        
        if (isInternet) {
            // Create cloud symbol for internet
            const group = new fabric.Group([
                // Cloud shape
                new fabric.Ellipse({
                    rx: 40,
                    ry: 25,
                    fill: '#E3F2FD',
                    stroke: '#2196F3',
                    strokeWidth: 2
                }),
                // Cloud details
                new fabric.Circle({
                    radius: 15,
                    left: -20,
                    top: -10,
                    fill: '#E3F2FD',
                    stroke: '#2196F3',
                    strokeWidth: 2
                }),
                new fabric.Circle({
                    radius: 12,
                    left: 15,
                    top: -15,
                    fill: '#E3F2FD',
                    stroke: '#2196F3',
                    strokeWidth: 2
                }),
                // Arrows for bidirectional traffic
                new fabric.Text('↕', {
                    fontSize: 20,
                    fill: '#2196F3',
                    fontWeight: 'bold',
                    top: -10,
                    textAlign: 'center'
                })
            ], {
                ...props,
                selectable: true,
                hasControls: true
            });
            return group;
        } else {
            // Regular IGW
            const group = new fabric.Group([
                new fabric.Circle({
                    radius: 30,
                    fill: 'rgba(46, 204, 113, 0.1)',
                    stroke: '#2ecc71',
                    strokeWidth: 2
                }),
                new fabric.Text('IGW', {
                    fontSize: 12,
                    fontWeight: 'bold',
                    fill: '#2ecc71',
                    top: -6,
                    textAlign: 'center'
                })
            ], {
                ...props,
                selectable: true,
                hasControls: true
            });
            return group;
        }
    }

    createTransitGateway(props) {
        const group = new fabric.Group([
            new fabric.Polygon([
                {x: 0, y: -30}, {x: 26, y: -15}, {x: 26, y: 15}, 
                {x: 0, y: 30}, {x: -26, y: 15}, {x: -26, y: -15}
            ], {
                fill: 'rgba(52, 73, 94, 0.1)',
                stroke: '#34495e',
                strokeWidth: 2
            }),
            new fabric.Text('TGW', {
                fontSize: 11,
                fontWeight: 'bold',
                fill: '#34495e',
                top: -6,
                textAlign: 'center'
            })
        ], {
            ...props
        });
        
        return group;
    }

    createNATGateway(props) {
        const group = new fabric.Group([
            new fabric.Rect({
                width: 60,
                height: 40,
                fill: 'rgba(149, 165, 166, 0.1)',
                stroke: '#95a5a6',
                strokeWidth: 2,
                rx: 5,
                ry: 5
            }),
            new fabric.Text('NAT', {
                fontSize: 11,
                fontWeight: 'bold',
                fill: '#95a5a6',
                top: -6,
                textAlign: 'center'
            })
        ], {
            ...props
        });
        
        return group;
    }

    loadDeploymentModel(model) {
        this.showLoading();
        this.currentModel = model;
        
        // Clear active button states
        document.querySelectorAll('.model-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-model="${model}"]`).classList.add('active');

        setTimeout(() => {
            this.clearCanvas();
            
            switch (model) {
                case 'centralized':
                    this.createCentralizedModel();
                    break;
                case 'decentralized':
                    this.createDecentralizedModel();
                    break;
                case 'combined':
                    this.createCombinedModel();
                    break;
            }
            
            this.hideLoading();
            this.updateStatus(`Loaded ${model} deployment model`);
        }, 1000);
    }

    createCentralizedModel() {
        // Layout based on AWS centralized deployment diagram
        
        // Internet Gateways at the top
        this.addComponent('igw', 300, 80, { componentId: 'inspection-igw' });
        this.addComponent('igw', 600, 80, { componentId: 'egress-igw' });
        
        // Inspection VPC (left side)
        this.addComponent('vpc', 300, 200, { componentId: 'inspection-vpc' });
        
        // Egress VPC (right side) 
        this.addComponent('vpc', 600, 200, { componentId: 'egress-vpc' });
        this.addComponent('subnet', 600, 240, { componentId: 'public-subnet' });
        this.addComponent('nat', 600, 280, { componentId: 'nat-gateway' });
        
        // Firewall endpoints in inspection VPC (horizontally spread)
        const azCount = parseInt(document.getElementById('azCount').value) || 3;
        for (let i = 0; i < azCount; i++) {
            const x = 250 + (i * 40);
            this.addComponent('firewall', x, 240, { componentId: `firewall-endpoint-${String.fromCharCode(97 + i)}` });
        }
        
        // Transit Gateway in the center (between inspection and spoke VPCs)
        this.addComponent('tgw', 450, 350, { componentId: 'transit-gateway' });
        
        // Spoke VPCs at the bottom (spread horizontally)
        const spokeCount = parseInt(document.getElementById('spokeCount').value) || 2;
        for (let i = 0; i < spokeCount; i++) {
            const x = 200 + (i * 300);
            const y = 500;
            this.addComponent('vpc', x, y, { componentId: `spoke-vpc-${String.fromCharCode(65 + i)}` });
            
            // Workload subnets in spoke VPCs
            this.addComponent('subnet', x, y + 50, { componentId: `workload-subnet-${String.fromCharCode(65 + i)}` });
        }
        
        // Add connection lines after components are created
        setTimeout(() => {
            this.addCentralizedConnections(spokeCount);
        }, 100);
    }
    
    addCentralizedConnections(spokeCount) {
        // Connection from Inspection IGW to Inspection VPC
        this.addConnectionLine(300, 110, 300, 170, '#2196F3');
        
        // Connection from Egress IGW to Egress VPC
        this.addConnectionLine(600, 110, 600, 170, '#2196F3');
        
        // Connection from Inspection VPC to Transit Gateway
        this.addConnectionLine(300, 230, 450, 320, '#FF9800');
        
        // Connection from Egress VPC to Transit Gateway
        this.addConnectionLine(600, 230, 450, 320, '#FF9800');
        
        // Connections from Transit Gateway to Spoke VPCs
        for (let i = 0; i < spokeCount; i++) {
            const spokeX = 200 + (i * 300);
            this.addConnectionLine(450, 380, spokeX, 470, '#4CAF50');
        }
        
        // Add labels for route tables
        this.addRouteTableLabels();
    }
    
    addConnectionLine(x1, y1, x2, y2, color) {
        const line = new fabric.Line([x1, y1, x2, y2], {
            stroke: color,
            strokeWidth: 3,
            selectable: false,
            evented: false,
            strokeDashArray: [8, 4]
        });
        
        // Add arrow head
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const arrowHead = new fabric.Triangle({
            left: x2 - 8,
            top: y2 - 6,
            width: 12,
            height: 12,
            fill: color,
            angle: (angle * 180 / Math.PI) + 90,
            selectable: false,
            evented: false
        });
        
        this.canvas.add(line);
        this.canvas.add(arrowHead);
        this.canvas.sendToBack(line);
        this.canvas.sendToBack(arrowHead);
    }
    
    addRouteTableLabels() {
        // Add route table labels as in AWS documentation
        const spokeLabel = new fabric.Text('Spoke Route Table\n(Default → Inspection VPC)', {
            left: 150,
            top: 400,
            fontSize: 10,
            fill: '#666',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            padding: 5,
            textAlign: 'center'
        });
        
        const firewallLabel = new fabric.Text('Firewall Route Table\n(Spoke Routes Propagated)', {
            left: 350,
            top: 400,
            fontSize: 10,
            fill: '#666',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            padding: 5,
            textAlign: 'center'
        });
        
        this.canvas.add(spokeLabel);
        this.canvas.add(firewallLabel);
    }

    createDecentralizedModel() {
        // Distributed deployment - AWS Network Firewall in each protected VPC
        // Layout matches Figure 2: AWS Network Firewall deployed in each protected VPC
        
        const vpcCount = Math.min(parseInt(document.getElementById('spokeCount').value) || 4, 4);
        const vpcNames = ['A', 'B', 'C', 'D'];
        
        // Internet/Cloud symbol at the top center
        this.addComponent('igw', 500, 50, { componentId: 'internet' });
        
        // Create region container text
        const regionLabel = new fabric.Text('Region', {
            left: 80,
            top: 100,
            fontSize: 14,
            fontWeight: 'bold',
            fill: '#2196F3',
            backgroundColor: '#E3F2FD',
            padding: 5,
            selectable: false,
            evented: false
        });
        this.canvas.add(regionLabel);
        
        // Create Protected VPCs (A, B, C, D) arranged horizontally with proper spacing
        for (let i = 0; i < vpcCount; i++) {
            const vpcName = vpcNames[i];
            const x = 150 + (i * 250); // More spacing between VPCs
            const y = 280;
            
            // Create VPC container
            this.addComponent('vpc', x, y, { componentId: `protected-vpc-${vpcName.toLowerCase()}` });
            
            // Add "Availability Zone A" label inside each VPC (positioned properly within VPC bounds)
            const azLabel = new fabric.Text('Availability Zone A', {
                left: x,
                top: y - 70,
                fontSize: 11,
                fill: '#2196F3',
                textAlign: 'center',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                padding: 3,
                selectable: false,
                evented: false
            });
            this.canvas.add(azLabel);
            
            // Firewall Subnet (top subnet in each VPC) - positioned above center
            this.addComponent('subnet', x, y - 30, { 
                componentId: `firewall-subnet-${vpcName.toLowerCase()}` 
            });
            
            // AWS Network Firewall endpoint inside firewall subnet - smaller, positioned within subnet
            this.addComponent('firewall', x, y - 30, { 
                componentId: `firewall-endpoint-${vpcName.toLowerCase()}` 
            });
            
            // Protected Subnet (bottom subnet in each VPC) - positioned below center  
            this.addComponent('subnet', x, y + 40, { 
                componentId: `protected-subnet-${vpcName.toLowerCase()}` 
            });
            
            // Add connection lines from Internet to each VPC with proper spacing
            this.addConnectionLine(500, 80, x, y - 120, '#2196F3');
        }
        
        // Add title matching the documentation
        const titleText = new fabric.Text('AWS Network Firewall deployed in each protected VPC', {
            left: 500,
            top: 450,
            fontSize: 14,
            fontWeight: 'bold',
            fill: '#333',
            textAlign: 'center',
            fontStyle: 'italic',
            selectable: false,
            evented: false
        });
        this.canvas.add(titleText);
    }

    createCombinedModel() {
        const azCount = parseInt(document.getElementById('azCount').value) || 3;
        const spokeCount = parseInt(document.getElementById('spokeCount').value) || 2;
        
        // Central Inspection VPC for East-West traffic (top center)
        this.addComponent('vpc', 450, 120, { componentId: 'inspection-vpc' });
        this.addComponent('tgw', 450, 200, { componentId: 'transit-gateway' });
        
        // Firewall endpoints in inspection VPC (spread horizontally)
        for (let i = 0; i < Math.min(azCount, 3); i++) {
            const x = 400 + (i * 40);
            this.addComponent('firewall', x, 150, { componentId: `central-firewall-${String.fromCharCode(97 + i)}` });
        }
        
        // Spoke VPCs at bottom - some with local firewall, some without
        for (let i = 0; i < spokeCount; i++) {
            const x = 200 + (i * 300);
            const y = 400;
            
            this.addComponent('vpc', x, y, { componentId: `spoke-vpc-${String.fromCharCode(65 + i)}` });
            
            // First spoke has local firewall for internet access
            if (i === 0) {
                // Local internet connectivity
                this.addComponent('igw', x, y - 80, { componentId: `local-igw-${String.fromCharCode(65 + i)}` });
                this.addComponent('firewall', x, y - 20, { componentId: `local-firewall-${String.fromCharCode(65 + i)}` });
                this.addComponent('subnet', x, y + 30, { componentId: `public-subnet-${String.fromCharCode(65 + i)}` });
                
                // Connections for local firewall
                this.addConnectionLine(x, y - 50, x, y - 40, '#2196F3');
                this.addConnectionLine(x, y + 10, x, y + 10, '#FF5722');
            } else {
                // Other spokes use centralized egress
                this.addComponent('subnet', x, y + 30, { componentId: `workload-subnet-${String.fromCharCode(65 + i)}` });
            }
            
            // Connect all spokes to central TGW for East-West traffic
            this.addConnectionLine(450, 230, x, y - 30, '#4CAF50');
        }
        
        // Centralized Egress VPC with dedicated firewall (right side)
        this.addComponent('vpc', 700, 280, { componentId: 'egress-vpc' });
        this.addComponent('igw', 700, 200, { componentId: 'egress-igw' });
        this.addComponent('firewall', 700, 250, { componentId: 'egress-firewall' });
        this.addComponent('nat', 700, 320, { componentId: 'central-nat-gateway' });
        this.addComponent('subnet', 700, 350, { componentId: 'egress-public-subnet' });
        
        // Connect egress VPC to TGW and IGW
        this.addConnectionLine(700, 170, 700, 230, '#2196F3');
        this.addConnectionLine(450, 200, 670, 280, '#FF9800');
        
        // Add explanatory labels
        setTimeout(() => {
            const eastWestLabel = new fabric.Text('East-West Traffic\n(via Central Inspection)', {
                left: 300,
                top: 250,
                fontSize: 10,
                fill: '#4CAF50',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                padding: 5,
                textAlign: 'center',
                selectable: false,
                evented: false
            });
            
            const northSouthLabel = new fabric.Text('North-South Traffic\n(Local or Central)', {
                left: 600,
                top: 380,
                fontSize: 10,
                fill: '#FF5722',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                padding: 5,
                textAlign: 'center',
                selectable: false,
                evented: false
            });
            
            this.canvas.add(eastWestLabel);
            this.canvas.add(northSouthLabel);
        }, 200);
    }

    onObjectSelected(e) {
        const activeObject = e.target || e.selected[0];
        if (activeObject && activeObject.componentType) {
            this.updateRouteInfo(activeObject);
        }
    }

    onSelectionCleared() {
        this.updateRouteInfo();
    }

    onObjectMoving(e) {
        // Update connections if needed
    }

    onObjectMoved(e) {
        this.updateRouteInfo();
    }

    updateRouteInfo(selectedComponent = null) {
        const routeInfo = document.getElementById('routeInfo');
        
        if (!selectedComponent) {
            routeInfo.innerHTML = '<p>Select components to see routing details</p>';
            return;
        }

        let info = `<h4>${selectedComponent.componentId}</h4>`;
        info += `<p><strong>Type:</strong> ${selectedComponent.componentType.toUpperCase()}</p>`;
        info += this.generateRoutingRules(selectedComponent);
        
        routeInfo.innerHTML = info;
    }

    generateRoutingRules(component) {
        let rules = '<p><strong>Routing Rules:</strong></p><ul>';
        
        const componentId = component.componentId;
        const modelType = this.currentModel;
        
        switch (component.componentType) {
            case 'firewall':
                rules += '<li><strong>Stateful & Stateless Rule Processing</strong></li>';
                rules += '<li>HOME_NET variable defines eligible source IPs</li>';
                if (modelType === 'centralized') {
                    rules += '<li>Inspect East-West traffic between spoke VPCs</li>';
                    rules += '<li>Inspect North-South traffic (VPC ↔ Internet/On-prem)</li>';
                } else if (modelType === 'decentralized') {
                    rules += '<li>Inspect inbound/outbound traffic for this VPC</li>';
                    rules += '<li>Process traffic within same AZ</li>';
                }
                rules += '<li>Apply IPS rules and domain filtering</li>';
                break;
                
            case 'vpc':
                if (componentId.includes('inspection')) {
                    rules += '<li><strong>Inspection VPC - cannot be traffic source/destination</strong></li>';
                    rules += '<li>Hosts AWS Network Firewall endpoints</li>';
                    rules += '<li>Routes processed traffic back to Transit Gateway</li>';
                } else if (componentId.includes('spoke')) {
                    rules += '<li><strong>Spoke VPC Route Table:</strong></li>';
                    rules += '<li>Default route (0.0.0.0/0) → TGW (Inspection VPC)</li>';
                    rules += '<li>Associated with TGW Spoke Route Table</li>';
                } else if (componentId.includes('egress')) {
                    rules += '<li><strong>Egress VPC Route Table:</strong></li>';
                    rules += '<li>Default route (0.0.0.0/0) → IGW</li>';
                    rules += '<li>Centralized internet egress point</li>';
                }
                break;
                
            case 'subnet':
                if (componentId.includes('firewall') || componentId.includes('fw')) {
                    rules += '<li><strong>Firewall Subnet Route Table:</strong></li>';
                    if (modelType === 'centralized') {
                        rules += '<li>Spoke VPC CIDRs → TGW</li>';
                        rules += '<li>Default route → TGW (Egress VPC)</li>';
                    } else {
                        rules += '<li>Protected subnet CIDRs → Local</li>';
                        rules += '<li>Default route → IGW</li>';
                    }
                } else if (componentId.includes('protected') || componentId.includes('public')) {
                    rules += '<li><strong>Protected Subnet Route Table:</strong></li>';
                    rules += '<li>Default route → AWS Network Firewall VPCE</li>';
                    rules += '<li>All traffic inspected before routing</li>';
                } else if (componentId.includes('private')) {
                    rules += '<li><strong>Private Subnet Route Table:</strong></li>';
                    rules += '<li>Default route → NAT Gateway</li>';
                    rules += '<li>Or route → Firewall VPCE then NAT</li>';
                } else if (componentId.includes('workload')) {
                    rules += '<li><strong>Workload Subnet Route Table:</strong></li>';
                    rules += '<li>Local VPC CIDR → Local</li>';
                    rules += '<li>Other VPCs → TGW</li>';
                }
                break;
                
            case 'tgw':
                if (componentId.includes('dx') || componentId.includes('vpn')) {
                    rules += '<li><strong>Direct Connect/VPN Attachment</strong></li>';
                    rules += '<li>Associated with Spoke Route Table</li>';
                    rules += '<li>Routes propagated to Firewall Route Table</li>';
                } else {
                    rules += '<li><strong>Transit Gateway Route Tables:</strong></li>';
                    rules += '<li><strong>Spoke Route Table:</strong> Default → Inspection VPC</li>';
                    rules += '<li><strong>Firewall Route Table:</strong> Spoke routes propagated</li>';
                    rules += '<li>Enables East-West traffic inspection</li>';
                }
                break;
                
            case 'igw':
                if (componentId.includes('egress')) {
                    rules += '<li><strong>Egress IGW Route Table:</strong></li>';
                    rules += '<li>All traffic routes normally to internet</li>';
                } else if (componentId.includes('inspection')) {
                    rules += '<li><strong>Inspection IGW Route Table:</strong></li>';
                    rules += '<li>Return traffic from internet</li>';
                } else {
                    rules += '<li><strong>IGW Ingress Route Table:</strong></li>';
                    rules += '<li>Subnet CIDRs → Firewall VPCE (by AZ)</li>';
                    rules += '<li>Forces inbound traffic through inspection</li>';
                }
                break;
                
            case 'nat':
                rules += '<li><strong>NAT Gateway Route Table:</strong></li>';
                rules += '<li>Enables outbound internet for private subnets</li>';
                if (modelType === 'centralized') {
                    rules += '<li>Located in central egress VPC</li>';
                    rules += '<li>Shared by multiple spoke VPCs</li>';
                } else {
                    rules += '<li>Local to VPC for direct egress</li>';
                }
                break;
        }
        
        // Add traffic flow information
        if (modelType === 'centralized') {
            rules += '<li><strong>Traffic Flow:</strong> Spoke → TGW → Inspection → TGW → Destination</li>';
        } else if (modelType === 'decentralized') {
            rules += '<li><strong>Traffic Flow:</strong> Source → Firewall → Destination (same VPC)</li>';
        } else if (modelType === 'combined') {
            rules += '<li><strong>East-West:</strong> Via central inspection VPC</li>';
            rules += '<li><strong>North-South:</strong> Via local or central firewall</li>';
        }
        
        rules += '</ul>';
        return rules;
    }

    updateMouseCoordinates(e) {
        const pointer = this.canvas.getPointer(e.e);
        const coords = document.getElementById('coordinates');
        if (coords) {
            coords.textContent = `X: ${Math.round(pointer.x)}, Y: ${Math.round(pointer.y)}`;
        }
    }

    clearCanvas() {
        this.canvas.clear();
        this.connections = [];
        this.componentCounter = { vpc: 0, firewall: 0, subnet: 0, igw: 0, tgw: 0, nat: 0 };
        this.selectedComponents = [];
        this.currentModel = null;
        
        // Remove all objects from canvas including text labels and lines
        this.canvas.getObjects().forEach(obj => {
            this.canvas.remove(obj);
        });
        
        this.addGrid();
        this.updateRouteInfo();
        document.querySelectorAll('.model-btn').forEach(btn => btn.classList.remove('active'));
        this.updateStatus('Canvas cleared');
    }

    saveCanvas() {
        const data = {
            canvas: JSON.stringify(this.canvas.toJSON()),
            model: this.currentModel,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('firewall-diagram', JSON.stringify(data));
        this.updateStatus('Diagram saved successfully');
    }

    exportCanvas() {
        const dataURL = this.canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `firewall-architecture-${Date.now()}.png`;
        link.href = dataURL;
        link.click();
        this.updateStatus('Diagram exported as PNG');
    }

    zoomCanvas(factor) {
        this.zoom *= factor;
        this.canvas.setZoom(this.zoom);
        this.canvas.renderAll();
        this.updateStatus(`Zoom level: ${Math.round(this.zoom * 100)}%`);
    }

    resetZoom() {
        this.zoom = 1;
        this.canvas.setZoom(1);
        this.canvas.renderAll();
        this.updateStatus('Zoom reset to 100%');
    }

    updateConfiguration() {
        if (this.currentModel) {
            this.loadDeploymentModel(this.currentModel);
        }
    }

    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.style.display = 'flex';
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    updateStatus(message) {
        const statusText = document.getElementById('statusText');
        if (statusText) {
            statusText.textContent = message;
            
            // Auto-clear status after 5 seconds
            setTimeout(() => {
                statusText.textContent = 'Ready - Drag components to canvas or select a deployment model';
            }, 5000);
        }
    }

    // Helper functions for AWS-style labeling
    generateCIDR(componentId) {
        // Match exact CIDRs from AWS documentation Figure 2
        if (componentId.includes('vpc-a') || componentId.includes('A')) return '(10.0.0.0/16)';
        if (componentId.includes('vpc-b') || componentId.includes('B')) return '(10.1.0.0/16)';
        if (componentId.includes('vpc-c') || componentId.includes('C')) return '(10.2.0.0/16)';
        if (componentId.includes('vpc-d') || componentId.includes('D')) return '(10.3.0.0/16)';
        if (componentId.includes('inspection')) return '(192.168.1.0/24)';
        if (componentId.includes('egress')) return '(192.168.2.0/24)';
        if (componentId.includes('protected-vpc-a')) return '(10.0.0.0/16)';
        if (componentId.includes('protected-vpc-b')) return '(10.1.0.0/16)';
        if (componentId.includes('protected-vpc-c')) return '(10.2.0.0/16)';
        if (componentId.includes('protected-vpc-d')) return '(10.3.0.0/16)';
        return '(10.0.0.0/16)';
    }

    generateSubnetCIDR(componentId) {
        // Match exact subnet CIDRs from AWS documentation Figure 2
        if (componentId.includes('firewall')) {
            if (componentId.includes('a')) return '(10.0.1.0/28)';
            if (componentId.includes('b')) return '(10.1.1.0/28)';
            if (componentId.includes('c')) return '(10.2.1.0/28)';
            if (componentId.includes('d')) return '(10.3.1.0/28)';
        }
        if (componentId.includes('protected')) {
            if (componentId.includes('a')) return '(10.0.0.0/24)';
            if (componentId.includes('b')) return '(10.1.0.0/24)';
            if (componentId.includes('c')) return '(10.2.0.0/24)';
            if (componentId.includes('d')) return '(10.3.0.0/24)';
        }
        return '(10.0.0.0/24)';
    }

    formatSubnetLabel(componentId) {
        if (componentId.includes('firewall')) return 'Firewall Subnet';
        if (componentId.includes('protected')) return 'Protected Subnet';
        if (componentId.includes('private')) return 'Private Subnet';
        if (componentId.includes('public')) return 'Public Subnet';
        if (componentId.includes('workload')) return 'Workload Subnet';
        return componentId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NetworkFirewallSimulator();
});
