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
        // Drag and Drop is not used by the corrected model templates, but kept for manual building
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
    }

    // --- (Keep existing setupEventListeners, setupDragAndDrop, and basic component creation methods) ---
    // The core changes are in the `loadDeploymentModel` and the `create...Model` functions below.
    // NOTE: The original `addComponent` and `create...` functions are fine for manual diagram building.
    // The new model-building functions will create components directly for precise layout control.

    loadDeploymentModel(model) {
        this.showLoading();
        this.currentModel = model;
        
        document.querySelectorAll('.model-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-model="${model}"]`).classList.add('active');

        setTimeout(() => {
            this.clearCanvas(); // Use the corrected clearCanvas method
            
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
    
    /**
     * Creates a visual representation of a route table, similar to the AWS documentation.
     * @param {number} x - The left position.
     * @param {number} y - The top position.
     * @param {string} title - The title of the route table.
     * @param {Array<Object>} routes - An array of route objects, e.g., [{ dest: '0.0.0.0/0', target: 'igw-id' }]
     */
    createRouteTable(x, y, title, routes) {
        const padding = 10;
        const lineHeight = 20;
        const titleHeight = 30;
        const width = 200;
        const height = titleHeight + (routes.length * lineHeight) + padding;

        const container = new fabric.Rect({
            left: x,
            top: y,
            width: width,
            height: height,
            fill: 'white',
            stroke: '#545B64',
            strokeWidth: 1,
            shadow: 'rgba(0,0,0,0.1) 2px 2px 5px'
        });

        const titleText = new fabric.Text(title, {
            left: x + width / 2,
            top: y + padding,
            fontSize: 14,
            fontWeight: 'bold',
            fill: '#000',
            textAlign: 'center',
            originX: 'center'
        });
        
        const headerLine = new fabric.Line([x, y + titleHeight, x + width, y + titleHeight], {
            stroke: '#545B64',
            strokeWidth: 1
        });
        
        const group = [container, titleText, headerLine];

        routes.forEach((route, index) => {
            const destText = new fabric.Text(route.dest, {
                left: x + padding,
                top: y + titleHeight + (index * lineHeight),
                fontSize: 12,
                fill: '#333'
            });
            const targetText = new fabric.Text(route.target, {
                left: x + width - padding,
                top: y + titleHeight + (index * lineHeight),
                fontSize: 12,
                fill: '#333',
                originX: 'right'
            });
            group.push(destText, targetText);
        });

        const routeGroup = new fabric.Group(group, { selectable: false, evented: false });
        this.canvas.add(routeGroup);
    }
    
    /**
     * Draws a labeled connection line between two points.
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @param {string} label - Text label for the line.
     */
    drawLabeledLine(x1, y1, x2, y2, label) {
        const line = new fabric.Line([x1, y1, x2, y2], {
            stroke: '#d9534f',
            strokeWidth: 2,
            selectable: false,
            evented: false,
        });

        const arrow = new fabric.Triangle({
            left: x2,
            top: y2,
            originX: 'center',
            originY: 'center',
            width: 8,
            height: 10,
            fill: '#d9534f',
            angle: 90 + Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI)
        });

        const text = new fabric.Text(label, {
            left: (x1 + x2) / 2,
            top: (y1 + y2) / 2 - 15,
            fontSize: 12,
            fill: '#000',
            backgroundColor: 'rgba(255, 255, 255, 0.7)'
        });
        
        this.canvas.add(line, arrow, text);
    }


    /**
     * Recreates the Decentralized/Distributed model from Figure 1 of the documentation.
     */
    createDecentralizedModel() {
        // Main Components
        this.addComponent('igw', 450, 50, { componentId: 'internet', scaleX: 1.5, scaleY: 1.5 });
        this.addComponent('vpc', 450, 300, { componentId: 'protected-vpc-a', width: 400, height: 450 });
        this.addComponent('subnet', 450, 220, { componentId: 'firewall-subnet-a', width: 300 });
        this.addComponent('subnet', 450, 400, { componentId: 'protected-subnet-a', width: 300 });
        this.addComponent('firewall', 450, 280, { componentId: 'firewall-endpoint' });
        
        [span_13](start_span)// Route Tables - Replicating Figure 1[span_13](end_span)
        this.createRouteTable(700, 50, "IGW Ingress Route Table", [
            { dest: '10.0.0.0/16', target: 'local' },
            { dest: '10.0.0.0/24', target: 'vpce-id' }
        ]);
        this.createRouteTable(700, 200, "Firewall Subnet Route Table", [
            { dest: '10.0.0.0/16', target: 'local' },
            { dest: '0.0.0.0/0', target: 'igw-id' }
        ]);
        this.createRouteTable(700, 350, "Protected Subnet Route Table", [
            { dest: '10.0.0.0/16', target: 'local' },
            { dest: '0.0.0.0/0', target: 'vpce-id' }
        ]);

        [span_14](start_span)// Traffic Flow Lines[span_14](end_span)
        this.drawLabeledLine(450, 100, 450, 250, '5. Ingress Traffic'); // Internet to Firewall
        this.drawLabeledLine(450, 310, 450, 370, '1. Egress Traffic'); // Workload to Firewall
        this.drawLabeledLine(450, 450, 200, 450, '8. Workload'); // Workload in subnet
        this.drawLabeledLine(450, 250, 650, 100, '4. Traffic to IGW'); // Firewall to IGW RT
        
        const title = new fabric.Text('Decentralized Model (based on Figure 1)', {
            left: 50, top: 20, fontSize: 18, fontWeight: 'bold'
        });
        this.canvas.add(title);
    }
    
    /**
     * Recreates the Centralized model for East-West traffic from Figure 7.
     */
    createCentralizedModel() {
        // Main Components
        this.addComponent('vpc', 200, 250, { componentId: 'spoke-vpc-a', width: 250, height: 150 });
        this.addComponent('vpc', 700, 250, { componentId: 'spoke-vpc-b', width: 250, height: 150 });
        this.addComponent('vpc', 450, 500, { componentId: 'inspection-vpc', width: 350, height: 200 });
        this.addComponent('tgw', 450, 100, { componentId: 'transit-gateway' });
        this.addComponent('firewall', 450, 550, { componentId: 'firewall-endpoint' });
        
        [span_15](start_span)// TGW Route Tables[span_15](end_span)
        this.createRouteTable(150, 20, "TGW: Spoke Route Table", [
            { dest: '0.0.0.0/0', target: 'Inspect VPC' }
        ]);
        this.createRouteTable(550, 20, "TGW: Firewall Route Table", [
            { dest: 'VPC A CIDR', target: 'VPC A Attach' },
            { dest: 'VPC B CIDR', target: 'VPC B Attach' }
        ]);

        // Connections
        this.drawLabeledLine(200, 200, 400, 130, 'VPC A -> TGW');
        this.drawLabeledLine(700, 200, 500, 130, 'VPC B -> TGW');
        this.drawLabeledLine(450, 150, 450, 450, 'TGW -> Inspect');
        
        const title = new fabric.Text('Centralized East-West Inspection (based on Figure 7)', {
            left: 50, top: 650, fontSize: 18, fontWeight: 'bold'
        });
        this.canvas.add(title);
    }

    /**
     * Recreates the Combined model from Figure 12.
     */
    createCombinedModel() {
        [span_16](start_span)// Central components[span_16](end_span)
        this.addComponent('vpc', 500, 550, { componentId: 'inspection-vpc', width: 400, height: 150 });
        this.addComponent('tgw', 500, 450, { componentId: 'transit-gateway' });

        // Spoke VPC A (Centralized Egress)
        this.addComponent('vpc', 200, 200, { componentId: 'spoke-vpc-a', width: 250, height: 150 });
        this.drawLabeledLine(200, 280, 450, 480, 'East/West Traffic');

        [span_17](start_span)// Spoke VPC B (Local IGW)[span_17](end_span)
        this.addComponent('vpc', 800, 200, { componentId: 'spoke-vpc-b', width: 250, height: 250 });
        this.addComponent('igw', 800, 50, { componentId: 'local-igw' });
        this.addComponent('firewall', 800, 150, { componentId: 'local-firewall' });
        this.drawLabeledLine(800, 100, 800, 130, 'Local Internet'); // IGW to Firewall
        this.drawLabeledLine(800, 280, 550, 480, 'East/West Traffic'); // VPC B to TGW
        
        const title = new fabric.Text('Combined Deployment Model (based on Figure 12)', {
            left: 50, top: 20, fontSize: 18, fontWeight: 'bold'
        });
        this.canvas.add(title);
    }

    clearCanvas() {
        this.canvas.clear();
        this.connections = [];
        this.componentCounter = { vpc: 0, firewall: 0, subnet: 0, igw: 0, tgw: 0, nat: 0 };
        this.selectedComponents = [];
        this.currentModel = null;
        this.canvas.backgroundColor = '#ffffff'; // Reset background
        this.updateRouteInfo();
        document.querySelectorAll('.model-btn').forEach(btn => btn.classList.remove('active'));
        this.updateStatus('Canvas cleared');
    }

    // --- (Keep remaining helper functions: addComponent, createVPC, createFirewall, etc.) ---
    // --- (Keep event handlers: onObjectSelected, updateRouteInfo, saveCanvas, exportCanvas, zoom, etc.) ---
    // The existing generateRoutingRules can also be kept for manual mode, but the new functions
    // in app.py provide a better summary for the pre-built models.
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // You might need to adjust the instantiation if you've wrapped it
    // For Electron, this is generally correct.
    new NetworkFirewallSimulator();
});
