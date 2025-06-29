// Network Firewall Architecture Simulator - Renderer Process
class NetworkFirewallSimulator {
    constructor() {
        this.canvas = null;
        this.connections = [];
        this.componentCounter = { vpc: 0, firewall: 0, subnet: 0, igw: 0, tgw: 0, nat: 0 };
        this.selectedComponents = [];
        this.currentModel = null;
        this.zoom = 1;
        this.activeComponents = {}; // To easily find components by ID
        
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
        const id = customProps.componentId || `${type}-${this.componentCounter[type]}`;
        
        let component;
        const commonProps = {
            left: x,
            top: y,
            originX: 'center', // Center components on their coordinates for easier layout
            originY: 'center',
            componentType: type,
            componentId: id,
            hasControls: true,
            hasBorders: true,
            lockUniScaling: true,
            ...customProps,
            // Add a shadow for the "2.5D" effect
            shadow: 'rgba(0,0,0,0.25) 4px 4px 8px'
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
            this.activeComponents[id] = component; // Store component by ID
            this.canvas.renderAll();
            this.updateStatus(`Added ${type.toUpperCase()} component: ${id}`);
        }

        return component;
    }

    createVPC(props) {
        const isProtected = props.componentId.includes('protected') || props.componentId.includes('vpc');
        const width = props.width || 280;
        const height = props.height || 200;
        
        const group = new fabric.Group([
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
            new fabric.Rect({
                width: width - 20,
                height: 30,
                fill: isProtected ? '#4CAF50' : '#f39c12',
                left: -width/2 + 10,
                top: -height/2 + 5,
                rx: 4,
                ry: 4
            }),
            new fabric.Text('🏛️', {
                fontSize: 18,
                left: -width/2 + 25,
                top: -height/2 + 10,
                fill: 'white'
            }),
            new fabric.Text(props.componentId.toUpperCase(), {
                fontSize: 14,
                fontWeight: 'bold',
                fill: 'white',
                left: -width/2 + 50,
                top: -height/2 + 12,
                textAlign: 'left'
            }),
            new fabric.Text(isProtected ? this.generateCIDR(props.componentId) : '', {
                fontSize: 12,
                fill: isProtected ? '#4CAF50' : '#f39c12',
                left: 0,
                top: -height/2 + 45,
                textAlign: 'center',
                originX: 'center'
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
            new fabric.Circle({
                radius: size/2,
                fill: 'rgba(244, 67, 54, 0.1)',
                stroke: '#F44336',
                strokeWidth: 2.5
            }),
            new fabric.Circle({
                radius: size/2 - 8,
                fill: '#F44336',
            }),
            new fabric.Text('🛡️', {
                fontSize: 24,
                fill: 'white',
                originX: 'center',
                originY: 'center',
                top: 0,
                left: 0
            }),
            new fabric.Text('Firewall Endpoint', {
                fontSize: 10,
                fontWeight: 'bold',
                fill: '#F44336',
                top: size/2 + 10,
                originX: 'center'
            })
        ], {
            ...props,
            selectable: true,
            hasControls: true
        });
        
        return group;
    }

    createSubnet(props) {
        const width = props.width || 220;
        const height = props.height || 100;
        
        const group = new fabric.Group([
            new fabric.Rect({
                width: width,
                height: height,
                fill: 'rgba(158, 158, 158, 0.15)',
                stroke: '#9E9E9E',
                strokeWidth: 1.5,
                rx: 4,
                ry: 4
            }),
            new fabric.Text(this.formatSubnetLabel(props.componentId), {
                fontSize: 14,
                fontWeight: 'bold',
                fill: '#616161',
                left: 0,
                top: -height/2 + 15,
                originX: 'center',
            }),
            new fabric.Text(this.generateSubnetCIDR(props.componentId), {
                fontSize: 12,
                fill: '#616161',
                left: 0,
                top: -height/2 + 35,
                originX: 'center',
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
            const group = new fabric.Group([
                new fabric.Ellipse({ rx: 50, ry: 30, fill: '#E3F2FD', stroke: '#2196F3', strokeWidth: 2.5 }),
                new fabric.Circle({ radius: 18, left: -25, top: -12, fill: '#E3F2FD', stroke: '#2196F3', strokeWidth: 2.5 }),
                new fabric.Circle({ radius: 15, left: 20, top: -18, fill: '#E3F2FD', stroke: '#2196F3', strokeWidth: 2.5 }),
                new fabric.Text('☁', { fontSize: 30, fill: '#2196F3', originX: 'center', originY: 'center' })
            ], { ...props });
            return group;
        } else {
            const group = new fabric.Group([
                new fabric.Circle({ radius: 30, fill: 'rgba(46, 204, 113, 0.1)', stroke: '#2ecc71', strokeWidth: 2.5 }),
                new fabric.Text('IGW', { fontSize: 14, fontWeight: 'bold', fill: '#2ecc71', originX: 'center', originY: 'center' })
            ], { ...props });
            return group;
        }
    }

    createTransitGateway(props) {
        const group = new fabric.Group([
            new fabric.Polygon([
                {x: 0, y: -35}, {x: 30, y: -17}, {x: 30, y: 17}, 
                {x: 0, y: 35}, {x: -30, y: 17}, {x: -30, y: -17}
            ], {
                fill: 'rgba(52, 73, 94, 0.1)',
                stroke: '#34495e',
                strokeWidth: 2.5
            }),
            new fabric.Text('TGW', { fontSize: 14, fontWeight: 'bold', fill: '#34495e', originX: 'center', originY: 'center' })
        ], { ...props });
        
        return group;
    }

    createNATGateway(props) {
        const group = new fabric.Group([
            new fabric.Rect({ width: 70, height: 45, fill: 'rgba(149, 165, 166, 0.1)', stroke: '#95a5a6', strokeWidth: 2.5, rx: 5, ry: 5 }),
            new fabric.Text('NAT', { fontSize: 14, fontWeight: 'bold', fill: '#95a5a6', originX: 'center', originY: 'center' })
        ], { ...props });
        
        return group;
    }

    loadDeploymentModel(model) {
        this.showLoading();
        this.currentModel = model;
        
        document.querySelectorAll('.model-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-model="${model}"]`).classList.add('active');

        setTimeout(() => {
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
        }, 500);
    }
    
    createDecentralizedModel() {
        this.clearCanvas(false); 

        const title = new fabric.Text('Decentralized Model: Internet Egress', {
            left: 20, top: 20, fontSize: 18, fontWeight: 'bold'
        });
        this.canvas.add(title);
        
        const vpc = this.addComponent('vpc', 450, 350, { componentId: 'protected-vpc', width: 450, height: 500, fill: 'rgba(76, 175, 80, 0.05)', stroke: '#4CAF50' });
        this.addComponent('subnet', 450, 450, { componentId: 'protected-subnet-a', width: 350, height: 150 });
        this.addComponent('subnet', 450, 250, { componentId: 'firewall-subnet-a', width: 350, height: 150 });
        this.addComponent('firewall', 450, 150, { componentId: 'firewall-endpoint' });
        this.addComponent('igw', 450, 60, { componentId: 'internet', scaleX: 1.2, scaleY: 1.2 });
        
        const workloadRect = new fabric.Rect({ width: 100, height: 70, fill: '#337ab7', rx: 5, ry: 5 });
        const workloadLabel = new fabric.Text('Workload\n(10.0.0.10)', { fontSize: 12, fill: 'white', textAlign: 'center', originX: 'center', originY: 'center' });
        const workloadGroup = new fabric.Group([workloadRect, workloadLabel], { left: 450, top: 450, originX: 'center', originY: 'center', componentId: 'workload' });
        this.canvas.add(workloadGroup);
        this.activeComponents['workload'] = workloadGroup;
        
        this.canvas.sendToBack(vpc);
        this.updateStatus('Loaded Decentralized Model');
        this.canvas.setActiveObject(this.activeComponents['protected-subnet-a']).renderAll();
        this.onObjectSelected({target: this.activeComponents['protected-subnet-a']});
    }

    createCentralizedModel() {
        this.clearCanvas(false);
        const title = new fabric.Text('Centralized Model: East-West Inspection', {
            left: 20, top: 20, fontSize: 18, fontWeight: 'bold'
        });
        this.canvas.add(title);

        this.addComponent('vpc', 200, 250, { componentId: 'spoke-vpc-a', width: 300, height: 200 });
        this.addComponent('vpc', 750, 250, { componentId: 'spoke-vpc-b', width: 300, height: 200 });
        this.addComponent('vpc', 475, 550, { componentId: 'inspection-vpc', width: 450, height: 200 });
        this.addComponent('tgw', 475, 100, { componentId: 'transit-gateway' });
        this.addComponent('firewall', 475, 550, { componentId: 'firewall-endpoint' });
        this.updateStatus('Loaded Centralized Model');
    }

    createCombinedModel() {
        this.clearCanvas(false);
        const title = new fabric.Text('Combined Model: Central East-West & Local Internet', {
            left: 20, top: 20, fontSize: 18, fontWeight: 'bold'
        });
        this.canvas.add(title);
        
        this.addComponent('vpc', 500, 600, { componentId: 'inspection-vpc', width: 400, height: 150 });
        this.addComponent('tgw', 500, 480, { componentId: 'transit-gateway' });
        this.addComponent('vpc', 200, 250, { componentId: 'spoke-vpc-a', width: 300, height: 200 });
        
        const vpcB = this.addComponent('vpc', 800, 250, { componentId: 'spoke-vpc-b', width: 300, height: 300 });
        const igwB = this.addComponent('igw', 800, 80, { componentId: 'local-igw-b' });
        const firewallB = this.addComponent('firewall', 800, 180, { componentId: 'local-firewall-b' });

        this.updateStatus('Loaded Combined Model');
    }

    displayRouteTable(component) {
        const panel = document.getElementById('routeInfoPanel');
        if (!component || !component.componentId) {
            panel.innerHTML = '<p>Select a component to inspect its routes.</p>';
            document.getElementById('animationControls').innerHTML = '';
            return;
        }

        let title = `Routes for ${component.componentId}`;
        let routes = [];
        let description = '';
        let animationPath = null;
        let model = this.currentModel;

        const componentId = component.componentId;

        if (model === 'decentralized') {
            switch(componentId) {
                case 'protected-subnet-a':
                    [span_0](start_span)description = "Routes all outbound internet traffic to the firewall endpoint.[span_0](end_span)";
                    routes = [ { dest: '10.0.0.0/16', target: 'local' }, { dest: '0.0.0.0/0', target: 'vpce-id' } ];
                    animationPath = ['workload', 'firewall-endpoint', 'internet'];
                    break;
                case 'firewall-subnet-a':
                    [span_1](start_span)description = "Receives traffic from the firewall and routes it to the Internet Gateway.[span_1](end_span)";
                    routes = [ { dest: '10.0.0.0/16', target: 'local' }, { dest: '0.0.0.0/0', target: 'igw-id' } ];
                    break;
                case 'internet':
                    [span_2](start_span)description = "The IGW Ingress Route Table forces return traffic back through the firewall for symmetric routing.[span_2](end_span)";
                    routes = [ { dest: '10.0.0.0/24', target: 'vpce-id' } ];
                    break;
                default:
                    description = "This component does not have a dedicated route table in this view.";
            }
        } else if (model === 'centralized') {
            // Add logic for centralized model route tables
            description = 'Routing information for the centralized model.';
        } else if (model === 'combined') {
            // Add logic for combined model route tables
            description = 'Routing information for the combined model.';
        }
        
        let html = `<h4>${title}</h4><p>${description}</p>`;
        if(routes.length > 0) {
            html += '<table class="route-table"><thead><tr><th>Destination</th><th>Target</th></tr></thead><tbody>';
            routes.forEach(route => {
                html += `<tr><td>${route.dest}</td><td>${route.target}</td></tr>`;
            });
            html += '</tbody></table>';
        }
        panel.innerHTML = html;

        const animationDiv = document.getElementById('animationControls');
        if (animationPath) {
            const button = document.createElement('button');
            button.innerText = '▶️ Simulate Egress Traffic';
            button.className = 'simulate-btn';
            button.onclick = () => this.animateTraffic(animationPath);
            animationDiv.innerHTML = '';
            animationDiv.appendChild(button);
        } else {
            animationDiv.innerHTML = '';
        }
    }
    
    onObjectSelected(e) {
        const activeObject = e.target || e.selected[0];
        if (activeObject && activeObject.componentType) {
            this.displayRouteTable(activeObject);
        }
    }
    
    onSelectionCleared() {
        this.displayRouteTable(null);
    }
    
    animateTraffic(pathIds) {
        const path = pathIds.map(id => this.activeComponents[id]).filter(Boolean);
        if (path.length < 2) {
            console.error("Animation path is too short or components not found.");
            return;
        }

        const packet = new fabric.Circle({
            radius: 8,
            fill: '#ffc107',
            stroke: 'black',
            strokeWidth: 2,
            originX: 'center',
            originY: 'center',
            left: path[0].left,
            top: path[0].top,
            shadow: 'rgba(0,0,0,0.5) 3px 3px 5px'
        });
        this.canvas.add(packet);
        packet.bringToFront();

        let currentStep = 0;
        const movePacket = () => {
            if (currentStep >= path.length - 1) {
                this.canvas.remove(packet);
                return;
            }

            const endNode = path[currentStep + 1];
            
            packet.animate({ left: endNode.left, top: endNode.top }, {
                duration: 1500,
                onChange: this.canvas.renderAll.bind(this.canvas),
                onComplete: () => {
                    currentStep++;
                    movePacket();
                }
            });
        };
        
        movePacket();
    }

    clearCanvas(updateStatusText = true) {
        this.canvas.clear();
        this.activeComponents = {};
        this.connections = [];
        this.componentCounter = { vpc: 0, firewall: 0, subnet: 0, igw: 0, tgw: 0, nat: 0 };
        this.selectedComponents = [];
        this.currentModel = null;
        this.canvas.backgroundColor = '#ffffff';
        this.addGrid();
        this.displayRouteTable(null);
        document.querySelectorAll('.model-btn').forEach(btn => btn.classList.remove('active'));
        if (updateStatusText) {
            this.updateStatus('Canvas cleared');
        }
    }

    // --- (Keep existing utility functions: saveCanvas, exportCanvas, zoomCanvas, resetZoom, updateConfiguration, showLoading, hideLoading, updateStatus, generateCIDR, generateSubnetCIDR, formatSubnetLabel) ---
    // The original utility functions below this point do not need changes.
    // ...

    updateMouseCoordinates(e) {
        const pointer = this.canvas.getPointer(e.e);
        const coords = document.getElementById('coordinates');
        if (coords) {
            coords.textContent = `X: ${Math.round(pointer.x)}, Y: ${Math.round(pointer.y)}`;
        }
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
            
            setTimeout(() => {
                statusText.textContent = 'Ready - Drag components to canvas or select a deployment model';
            }, 5000);
        }
    }

    generateCIDR(componentId) {
        if (componentId.includes('vpc-a') || componentId.includes('A')) return '(10.0.0.0/16)';
        if (componentId.includes('vpc-b') || componentId.includes('B')) return '(10.1.0.0/16)';
        if (componentId.includes('vpc-c') || componentId.includes('C')) return '(10.2.0.0/16)';
        if (componentId.includes('vpc-d') || componentId.includes('D')) return '(10.3.0.0/16)';
        if (componentId.includes('inspection')) return '(100.64.0.0/16)';
        if (componentId.includes('egress')) return '(192.168.2.0/24)';
        if (componentId.includes('protected-vpc-a')) return '(10.0.0.0/16)';
        if (componentId.includes('protected-vpc-b')) return '(10.1.0.0/16)';
        if (componentId.includes('protected-vpc-c')) return '(10.2.0.0/16)';
        if (componentId.includes('protected-vpc-d')) return '(10.3.0.0/16)';
        return '(10.0.0.0/16)';
    }

    generateSubnetCIDR(componentId) {
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
