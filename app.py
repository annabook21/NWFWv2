from flask import Flask, render_template, request

app = Flask(__name__)

def centralized_deployment():
    return """
    <h4>Centralized Deployment Model Routing</h4>
    <p>Traffic is inspected through a central Inspection VPC using AWS Transit Gateway.</p>
    <b>AWS Transit Gateway Route Tables:</b><br>
    - [span_0](start_span)<b>Spoke Route Table:</b> Associates Spoke VPCs. Has a default route (0.0.0.0/0) pointing to the Inspection VPC attachment.[span_0](end_span)<br>
    - <b>Firewall Route Table:</b> Associates the Inspection VPC. [span_1](start_span)Has propagated routes for all Spoke VPCs to ensure a return path.[span_1](end_span)<br><br>
    <b>Inspection VPC Route Tables:</b><br>
    - [span_2](start_span)<b>TGW Attachment Subnet Route Table:</b> Default route (0.0.0.0/0) targets the Firewall Endpoint in the same AZ.[span_2](end_span)<br>
    - [span_3](start_span)<b>Firewall Subnet Route Table:</b> Default route (0.0.0.0/0) targets the Transit Gateway to return traffic after inspection.[span_3](end_span)<br><br>
    <b>Spoke VPC Route Table:</b><br>
    - Default route (0.0.0.0/0) targets the Transit Gateway.
    """

def decentralized_deployment():
    return """
    <h4>Decentralized Deployment Model Routing</h4>
    <p>Each VPC has its own AWS Network Firewall for local internet traffic inspection.</p>
    <b>Protected Subnet Route Table:</b><br>
    - Destination: 0.0.0.0/0 (Internet)<br>
    - [span_4](start_span)Target: Firewall Endpoint (vpce-id) in the same AZ.[span_4](end_span)<br><br>
    <b>Firewall Subnet Route Table:</b><br>
    - Destination: 0.0.0.0/0 (Internet)<br>
    - [span_5](start_span)[span_6](start_span)Target: Internet Gateway (igw-id).[span_5](end_span)[span_6](end_span)<br><br>
    <b>IGW Ingress Route Table:</b><br>
    - [span_7](start_span)Destination: IP range of the Protected Subnet (e.g., 10.0.0.0/24)[span_7](end_span)<br>
    - [span_8](start_span)Target: Firewall Endpoint (vpce-id) to ensure symmetric routing.[span_8](end_span)
    """

def combined_deployment():
    return """
    <h4>Combined Deployment Model Routing</h4>
    <p>A hybrid model using centralized inspection for East-West traffic and distributed (local) firewalls for North-South (Internet) traffic in specific VPCs.</p>
    <b>For East-West Traffic (VPC-to-VPC):</b><br>
    - [span_9](start_span)Follows the <b>Centralized Model</b> routing via Transit Gateway and an Inspection VPC.[span_9](end_span)<br><br>
    <b>For local North-South Traffic (in VPCs with an IGW):</b><br>
    - [span_10](start_span)Follows the <b>Decentralized Model</b> routing.[span_10](end_span)<br>
    - [span_11](start_span)[span_12](start_span)The Protected Subnet routes to a local Firewall Endpoint, which then routes to a local IGW.[span_11](end_span)[span_12](end_span)
    """

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/submit', methods=['POST'])
def submit():
    deployment = request.form['deployment']
    if deployment == 'centralized':
        output = centralized_deployment()
    elif deployment == 'decentralized':
        output = decentralized_deployment()
    elif deployment == 'combined':
        output = combined_deployment()
    else:
        output = "Invalid deployment model."
    return output

if __name__ == '__main__':
    app.run(debug=True)
