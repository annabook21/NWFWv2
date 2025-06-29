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

        this.canvas.on('selection:created', (e) => this.onObjectSelected(e));
        this.canvas.on('selection:updated', (e) => this.onObjectSelected(e));
        this.canvas.on('selection:cleared', () => this.onSelectionCleared());
        this.canvas.on('mouse:move', (e) => this.updateMouseCoordinates(e));
        this.addGrid();
    }

    addGrid() {
        const gridSize = 20;
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;

        for (let i = 0; i <= canvasWidth; i += gridSize) {
            const line = new fabric.Line([i, 0, i, canvasHeight], { stroke: 'rgba(200, 200, 200, 0.3)', strokeWidth: 1, selectable: false, evented: false });
            this.canvas.add(line);
            this.canvas.sendToBack(line);
        }
        for (let i = 0; i <= canvasHeight; i += gridSize) {
            const line = new fabric.Line([0, i, canvasWidth, i], { stroke: 'rgba(200, 200, 200, 0.3)', strokeWidth: 1, selectable: false, evented: false });
            this.canvas.add(line);
            this.canvas.sendToBack(line);
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.model-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.loadDeploymentModel(e.target.dataset.model));
        });
        document.getElementById('clearCanvas').addEventListener('click', () => this.clearCanvas());
        document.getElementById('saveCanvas').addEventListener('click', () => this.saveCanvas());
        document.getElementById('exportCanvas').addEventListener('click', () => this.exportCanvas());
        document.getElementById('zoomIn').addEventListener('click', () => this.zoomCanvas(1.2));
        document.getElementById('zoomOut').addEventListener('click', () => this.zoomCanvas(0.8));
        document.getElementById('resetZoom').addEventListener('click', () => this.resetZoom());
        document.getElementById('azCount').addEventListener('change', () => this.updateConfiguration());
        document.getElementById('spokeCount').addEventListener('change', () => this.updateConfiguration());
        document.getElementById('privateSubnets').addEventListener('change', () => this.updateConfiguration());
        if (document.querySelector('.close')) {
            document.querySelector('.close').addEventListener('click', () => {
                document.getElementById('aboutModal').style.display = 'none';
            });
        }
    }

    setupDragAndDrop() {
        const componentItems = document.querySelectorAll('.component-item');
        componentItems.forEach(item => {
            item.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', e.target.dataset.type));
        });
        const canvasElement = document.getElementById('canvas');
        canvasElement.addEventListener('dragover', (e) => e.preventDefault());
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
            left: x, top: y, originX: 'center', originY: 'center',
            componentType: type, componentId: id,
            hasControls: true, hasBorders: true, lockUniScaling: true,
            shadow: 'rgba(0,0,0,0.25) 4px 4px 8px', ...customProps
        };

        switch (type) {
            case 'vpc': component = this.createVPC(commonProps); break;
            case 'firewall': component = this.createFirewall(commonProps); break;
            case 'subnet': component = this.createSubnet(commonProps); break;
            case 'igw': component = this.createGateway(commonProps); break;
            case 'tgw': component = this.createTransitGateway(commonProps); break;
            case 'nat': component = this.createNATGateway(commonProps); break;
        }
        if (component) {
            this.canvas.add(component);
            this.activeComponents[id] = component;
            this.canvas.renderAll();
            this.updateStatus(`Added ${type.toUpperCase()} component: ${id}`);
        }
        return component;
    }

    createVPC(props) {
        const isProtected = props.componentId.includes('protected') || props.componentId.includes('vpc');
        const width = props.width || 280;
        const height = props.height || 200;
        return new fabric.Group([
            new fabric.Rect({ width: width, height: height, fill: isProtected ? 'rgba(76, 175, 80, 0.1)' : 'rgba(243, 156, 18, 0.1)', stroke: isProtected ? '#4CAF50' : '#f39c12', strokeWidth: 2, rx: 8, ry: 8, strokeDashArray: [10, 5] }),
            new fabric.Rect({ width: width - 20, height: 30, fill: isProtected ? '#4CAF50' : '#f39c12', left: -width/2 + 10, top: -height/2 + 5, rx: 4, ry: 4 }),
            new fabric.Text('🏛️', { fontSize: 18, left: -width/2 + 25, top: -height/2 + 10, fill: 'white' }),
            new fabric.Text(props.componentId.toUpperCase(), { fontSize: 14, fontWeight: 'bold', fill: 'white', left: -width/2 + 50, top: -height/2 + 12, textAlign: 'left' }),
            new fabric.Text(isProtected ? this.generateCIDR(props.componentId) : '', { fontSize: 12, fill: isProtected ? '#4CAF50' : '#f39c12', left: 0, top: -height/2 + 45, textAlign: 'center', originX: 'center' })
        ], { ...props });
    }

    createFirewall(props) {
        const size = 60;
        return new fabric.Group([
            new fabric.Circle({ radius: size/2, fill: 'rgba(244, 67, 54, 0.1)', stroke: '#F44336', strokeWidth: 2.5 }),
            new fabric.Circle({ radius: size/2 - 8, fill: '#F44336' }),
            new fabric.Text('🛡️', { fontSize: 24, fill: 'white', originX: 'center', originY: 'center', top: 0, left: 0 }),
            new fabric.Text('Firewall Endpoint', { fontSize: 10, fontWeight: 'bold', fill: '#F44336', top: size/2 + 10, originX: 'center' })
        ], { ...props });
    }

    createSubnet(props) {
        const width = props.width || 220;
        const height = props.height || 100;
        return new fabric.Group([
            new fabric.Rect({ width: width, height: height, fill: 'rgba(158, 158, 158, 0.15)', stroke: '#9E9E9E', strokeWidth: 1.5, rx: 4, ry: 4 }),
            new fabric.Text(this.formatSubnetLabel(props.componentId), { fontSize: 14, fontWeight: 'bold', fill: '#616161', left: 0, top: -height/2 + 15, originX: 'center' }),
            new fabric.Text(this.generateSubnetCIDR(props.componentId), { fontSize: 12, fill: '#616161', left: 0, top: -height/2 + 35, originX: 'center' })
        ], { ...props });
    }

    createGateway(props) {
        if (props.componentId.includes('internet')) {
            return new fabric.Group([
                new fabric.Ellipse({ rx: 50, ry: 30, fill: '#E3F2FD', stroke: '#2196F3', strokeWidth: 2.5 }),
                new fabric.Circle({ radius: 18, left: -25, top: -12, fill: '#E3F2FD', stroke: '#2196F3', strokeWidth: 2.5 }),
                new fabric.Circle({ radius: 15, left: 20, top: -18, fill: '#E3F2FD', stroke: '#2196F3', strokeWidth: 2.5 }),
                new fabric.Text('☁', { fontSize: 30, fill: '#2196F3', originX: 'center', originY: 'center' })
            ], { ...props });
        } else {
            return new fabric.Group([
                new fabric.Circle({ radius: 30, fill: 'rgba(46, 204, 113, 0.1)', stroke: '#2ecc71', strokeWidth: 2.5 }),
                new fabric.Text('IGW', { fontSize: 14, fontWeight: 'bold', fill: '#2ecc71', originX: 'center', originY: 'center' })
            ], { ...props });
        }
    }

    createTransitGateway(props) {
        return new fabric.Group([
            new fabric.Polygon([{x: 0, y: -35}, {x: 30, y: -17}, {x: 30, y: 17}, {x: 0, y: 35}, {x: -30, y: 17}, {x: -30, y: -17}], { fill: 'rgba(52, 73, 94, 0.1)', stroke: '#34495e', strokeWidth: 2.5 }),
            new fabric.Text('TGW', { fontSize: 14, fontWeight: 'bold', fill: '#34495e', originX: 'center', originY: 'center' })
        ], { ...props });
    }

    createNATGateway(props) {
        return new fabric.Group([
            new fabric.Rect({ width: 70, height: 45, fill: 'rgba(149, 165, 166, 0.1)', stroke: '#95a5a6', strokeWidth: 2.5, rx: 5, ry: 5 }),
            new fabric.Text('NAT', { fontSize: 14, fontWeight: 'bold', fill: '#95a5a6', originX: 'center', originY: 'center' })
        ], { ...props });
    }

    loadDeploymentModel(model) {
        this.showLoading();
        this.currentModel = model;
        document.querySelectorAll('.model-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-model="${model}"]`).classList.add('active');
        setTimeout(() => {
            switch (model) {
                case 'centralized': this.createCentralizedModel(); break;
                case 'decentralized': this.createDecentralizedModel(); break;
                case 'combined': this.createCombinedModel(); break;
            }
            this.hideLoading();
            this.updateStatus(`Loaded ${model} deployment model`);
        }, 500);
    }
    
    createDecentralizedModel() {
        this.clearCanvas(false);
        this.canvas.add(new fabric.Text('Decentralized Model: Internet Egress', { left: 20, top: 20, fontSize: 18, fontWeight: 'bold' }));
        const vpc = this.addComponent('vpc', 450, 350, { componentId: 'protected-vpc', width: 450, height: 500, fill: 'rgba(76, 175, 80, 0.05)', stroke: '#4CAF50' });
        this.addComponent('subnet', 450, 450, { componentId: 'protected-subnet', width: 350, height: 150 });
        this.addComponent('subnet', 450, 250, { componentId: 'firewall-subnet', width: 350, height: 150 });
        this.addComponent('firewall', 450, 150, { componentId: 'firewall-endpoint' });
        this.addComponent('igw', 450, 60, { componentId: 'internet', scaleX: 1.2, scaleY: 1.2 });
        const workloadGroup = new fabric.Group([
            new fabric.Rect({ width: 100, height: 70, fill: '#337ab7', rx: 5, ry: 5 }),
            new fabric.Text('Workload\n(10.0.0.10)', { fontSize: 12, fill: 'white', textAlign: 'center', originX: 'center', originY: 'center' })
        ], { left: 450, top: 450, originX: 'center', originY: 'center', componentId: 'workload' });
        this.canvas.add(workloadGroup);
        this.activeComponents['workload'] = workloadGroup;
        this.canvas.sendToBack(vpc);
        this.updateStatus('Loaded Decentralized Model');
        this.canvas.setActiveObject(this.activeComponents['protected-subnet']).renderAll();
        this.onObjectSelected({ target: this.activeComponents['protected-subnet'] });
    }

    createCentralizedModel() {
        this.clearCanvas(false);
        this.canvas.add(new fabric.Text('Centralized Model: East-West Inspection', { left: 20, top: 20, fontSize: 18, fontWeight: 'bold' }));
        const tgw = this.addComponent('tgw', 475, 150, { componentId: 'transit-gateway' });
        const inspectionVPC = this.addComponent('vpc', 475, 500, { componentId: 'inspection-vpc', width: 550, height: 200 });
        const fw = this.addComponent('firewall', 475, 500, { componentId: 'firewall-endpoint' });
        const vpcA = this.addComponent('vpc', 200, 300, { componentId: 'spoke-vpc-a', width: 300, height: 200 });
        const vpcB = this.addComponent('vpc', 750, 300, { componentId: 'spoke-vpc-b', width: 300, height: 200 });
        this.activeComponents['workload-a'] = new fabric.Group([new fabric.Rect({ width: 80, height: 50, fill: '#337ab7' }), new fabric.Text('Workload A', { fill: 'white', fontSize: 12, originX: 'center', originY: 'center' })], { left: 200, top: 300, originX: 'center', originY: 'center', componentId: 'workload-a' });
        this.activeComponents['workload-b'] = new fabric.Group([new fabric.Rect({ width: 80, height: 50, fill: '#337ab7' }), new fabric.Text('Workload B', { fill: 'white', fontSize: 12, originX: 'center', originY: 'center' })], { left: 750, top: 300, originX: 'center', originY: 'center', componentId: 'workload-b' });
        this.canvas.add(this.activeComponents['workload-a'], this.activeComponents['workload-b']);
        this.canvas.sendToBack(vpcA); this.canvas.sendToBack(vpcB); this.canvas.sendToBack(inspectionVPC);
        this.updateStatus('Loaded Centralized Model');
        this.canvas.setActiveObject(vpcA).renderAll();
        this.onObjectSelected({ target: vpcA });
    }

    createCombinedModel() {
        this.clearCanvas(false);
        this.canvas.add(new fabric.Text('Combined Model: Central East-West & Local Internet', { left: 20, top: 20, fontSize: 18, fontWeight: 'bold' }));
        const tgw = this.addComponent('tgw', 500, 480, { componentId: 'central-tgw' });
        const inspectionVPC = this.addComponent('vpc', 500, 600, { componentId: 'inspection-vpc', width: 400, height: 150 });
        const centralFW = this.addComponent('firewall', 500, 600, { componentId: 'central-firewall' });
        const vpcA = this.addComponent('vpc', 200, 300, { componentId: 'spoke-vpc-a', width: 300, height: 200 });
        const vpcB = this.addComponent('vpc', 800, 300, { componentId: 'spoke-vpc-b', width: 300, height: 350 });
        const localIGW = this.addComponent('igw', 800, 80, { componentId: 'local-internet' });
        const localFW = this.addComponent('firewall', 800, 180, { componentId: 'local-firewall' });
        this.activeComponents['workload-a'] = new fabric.Group([new fabric.Rect({ width: 80, height: 50, fill: '#337ab7' }), new fabric.Text('Workload A', { fill: 'white', fontSize: 12, originX: 'center', originY: 'center' })], { left: 200, top: 300, originX: 'center', originY: 'center', componentId: 'workload-a' });
        this.activeComponents['workload-b'] = new fabric.Group([new fabric.Rect({ width: 80, height: 50, fill: '#337ab7' }), new fabric.Text('Workload B', { fill: 'white', fontSize: 12, originX: 'center', originY: 'center' })], { left: 800, top: 300, originX: 'center', originY: 'center', componentId: 'workload-b' });
        this.canvas.add(this.activeComponents['workload-a'], this.activeComponents['workload-b']);
        this.canvas.sendToBack(vpcA); this.canvas.sendToBack(vpcB); this.canvas.sendToBack(inspectionVPC);
        this.updateStatus('Loaded Combined Model');
        this.canvas.setActiveObject(vpcB).renderAll();
        this.onObjectSelected({ target: vpcB });
    }

    displayRouteTable(component) {
        const panel = document.getElementById('routeInfoPanel');
        if (!component || !component.componentId) {
            panel.innerHTML = '<p>Select a component to inspect its routes.</p>';
            document.getElementById('animationControls').innerHTML = '';
            return;
        }

        let title = `Routes for ${component.componentId}`;
        let routes = [], description = '', animationButtons = [];
        const { componentId } = component;

        if (this.currentModel === 'decentralized') {
            switch(componentId) {
                case 'protected-subnet':
                    [span_0](start_span)description = "Routes all outbound internet traffic to the firewall endpoint.[span_0](end_span)";
                    routes = [ { dest: '10.0.0.0/16', target: 'local' }, { dest: '0.0.0.0/0', target: 'vpce-id' } ];
                    animationButtons.push({ label: '▶️ Simulate Egress Traffic', path: ['workload', 'firewall-endpoint', 'internet'] });
                    break;
                case 'firewall-subnet':
                    [span_1](start_span)description = "Receives traffic from the firewall and routes it to the Internet Gateway.[span_1](end_span)";
                    routes = [ { dest: '10.0.0.0/16', target: 'local' }, { dest: '0.0.0.0/0', target: 'igw-id' } ];
                    break;
                case 'internet':
                    [span_2](start_span)description = "The IGW Ingress Route Table forces return traffic back through the firewall for symmetry.[span_2](end_span)";
                    routes = [ { dest: '10.0.0.0/24', target: 'vpce-id' } ];
                    break;
                default: description = "No specific route table for this component in this view.";
            }
        } else if (this.currentModel === 'centralized') {
            switch(componentId) {
                case 'spoke-vpc-a':
                case 'spoke-vpc-b':
                    [span_3](start_span)description = "The subnet route table sends all non-local traffic to the Transit Gateway for inspection.[span_3](end_span)";
                    routes = [ { dest: 'local-CIDR', target: 'local' }, { dest: '0.0.0.0/0', target: 'tgw-id' } ];
                    animationButtons.push({ label: '▶️ Simulate VPC-A to VPC-B Traffic', path: ['workload-a', 'transit-gateway', 'firewall-endpoint', 'transit-gateway', 'workload-b'] });
                    break;
                case 'transit-gateway':
                    description = "The TGW uses two route tables to enforce inspection. [span_4](start_span)The Spoke Route Table sends traffic to the inspection VPC, and the Firewall Route Table sends it back to the correct spoke.[span_4](end_span)";
                    break;
                case 'inspection-vpc':
                    [span_5](start_span)[span_6](start_span)description = "The TGW attachment subnet routes to the firewall endpoint, which then routes back to the TGW after inspection.[span_5](end_span)[span_6](end_span)";
                    break;
                default: description = "No specific route table for this component in this view.";
            }
        } else if (this.currentModel === 'combined') {
            switch(componentId) {
                case 'spoke-vpc-b':
                    [span_7](start_span)description = "This VPC has split routing: local internet traffic goes to the local firewall, while traffic to other VPCs goes to the central Transit Gateway.[span_7](end_span)";
                    routes = [ { dest: '0.0.0.0/0', target: 'local-firewall-id' }, { dest: 'VPC-A-CIDR', target: 'central-tgw-id' } ];
                    animationButtons.push({ label: '▶️ Simulate Local Internet Egress', path: ['workload-b', 'local-firewall', 'local-internet'] });
                    animationButtons.push({ label: '▶️ Simulate Traffic to VPC-A', path: ['workload-b', 'central-tgw', 'central-firewall', 'central-tgw', 'workload-a'] });
                    break;
                case 'spoke-vpc-a':
                    description = "This VPC sends all non-local traffic to the central Transit Gateway.";
                    routes = [ { dest: '0.0.0.0/0', target: 'central-tgw-id' } ];
                    break;
                default: description = "No specific route table for this component in this view.";
            }
        }
        
        let html = `<h4>${title}</h4><p>${description}</p>`;
        if (routes.length > 0) {
            html += '<table class="route-table"><thead><tr><th>Destination</th><th>Target</th></tr></thead><tbody>';
            routes.forEach(route => { html += `<tr><td>${route.dest}</td><td>${route.target}</td></tr>`; });
            html += '</tbody></table>';
        }
        panel.innerHTML = html;

        const animationDiv = document.getElementById('animationControls');
        animationDiv.innerHTML = '';
        animationButtons.forEach(btnInfo => {
            const button = document.createElement('button');
            button.innerText = btnInfo.label;
            button.className = 'simulate-btn';
            button.style.marginTop = '5px';
            button.onclick = () => this.animateTraffic(btnInfo.path);
            animationDiv.appendChild(button);
        });
    }
    
    onObjectSelected(e) {
        const activeObject = e.target || e.selected[0];
        if (activeObject) this.displayRouteTable(activeObject);
    }
    
    onSelectionCleared() { this.displayRouteTable(null); }
    
    animateTraffic(pathIds) {
        const path = pathIds.map(id => this.activeComponents[id]).filter(Boolean);
        if (path.length < 2) { console.error("Animation path is too short or components not found."); return; }
        const packet = new fabric.Circle({
            radius: 8, fill: '#ffc107', stroke: 'black', strokeWidth: 2,
            originX: 'center', originY: 'center', left: path[0].left, top: path[0].top,
            shadow: 'rgba(0,0,0,0.5) 3px 3px 5px'
        });
        this.canvas.add(packet);
        packet.bringToFront();
        let currentStep = 0;
        const movePacket = () => {
            if (currentStep >= path.length - 1) { this.canvas.remove(packet); return; }
            const endNode = path[++currentStep];
            packet.animate({ left: endNode.left, top: endNode.top }, {
                duration: 1500,
                onChange: this.canvas.renderAll.bind(this.canvas),
                onComplete: movePacket
            });
        };
        movePacket();
    }

    clearCanvas(updateStatusText = true) {
        this.canvas.clear();
        this.activeComponents = {}; this.connections = [];
        this.componentCounter = { vpc: 0, firewall: 0, subnet: 0, igw: 0, tgw: 0, nat: 0 };
        this.selectedComponents = []; this.currentModel = null;
        this.canvas.backgroundColor = '#ffffff'; this.addGrid();
        this.displayRouteTable(null);
        document.querySelectorAll('.model-btn').forEach(btn => btn.classList.remove('active'));
        if (updateStatusText) this.updateStatus('Canvas cleared');
    }

    updateMouseCoordinates(e) {
        const pointer = this.canvas.getPointer(e.e);
        const coords = document.getElementById('coordinates');
        if (coords) coords.textContent = `X: ${Math.round(pointer.x)}, Y: ${Math.round(pointer.y)}`;
    }

    saveCanvas() {
        localStorage.setItem('firewall-diagram', JSON.stringify({
            canvas: JSON.stringify(this.canvas.toJSON()), model: this.currentModel, timestamp: new Date().toISOString()
        }));
        this.updateStatus('Diagram saved successfully');
    }

    exportCanvas() {
        const link = document.createElement('a');
        link.download = `firewall-architecture-${Date.now()}.png`;
        link.href = this.canvas.toDataURL('image/png');
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

    updateConfiguration() { if (this.currentModel) this.loadDeploymentModel(this.currentModel); }
    showLoading() { document.getElementById('loadingOverlay').style.display = 'flex'; }
    hideLoading() { document.getElementById('loadingOverlay').style.display = 'none'; }
    updateStatus(message) {
        const statusText = document.getElementById('statusText');
        if (statusText) {
            statusText.textContent = message;
            setTimeout(() => { statusText.textContent = 'Ready - Drag components to canvas or select a deployment model'; }, 5000);
        }
    }

    generateCIDR(componentId) {
        if (componentId.includes('vpc-a')) return '(10.1.0.0/16)';
        if (componentId.includes('vpc-b')) return '(10.2.0.0/16)';
        if (componentId.includes('inspection')) return '(100.64.0.0/16)';
        return '(10.0.0.0/16)';
    }

    generateSubnetCIDR(componentId) {
        if (componentId.includes('firewall')) return '(10.0.1.0/28)';
        if (componentId.includes('protected')) return '(10.0.0.0/24)';
        return '(Subnet CIDR)';
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

document.addEventListener('DOMContentLoaded', () => { new NetworkFirewallSimulator(); });
