from flask import Flask, render_template, request

app = Flask(__name__)

def centralized_deployment():
    return """Centralized Deployment Model<br>
              Route Tables:<br>
              - Spoke VPC Route Tables: Route to Firewall<br>
              - Inspection VPC Route Table: Route to Firewall<br>
              - Firewall Route Table: Route to Spoke VPCs and Inspection VPC"""

def decentralized_deployment(private_subnets_exist):
    output = "Decentralized Deployment Model<br>Route Tables:<br>"
    output += "- Protected Subnet Route Tables: Route to Firewall<br>"
    output += "- IGW Ingress Route Tables: Route to Firewall<br>"
    output += "- Firewall Subnet Route Tables: Route to Protected Subnets and IGW<br>"
    if private_subnets_exist:
        output += "- Private Subnet Route Table: Route to Firewall"
    return output

def combined_deployment(private_subnets_exist):
    output = "Combined Deployment Model<br>Route Tables:<br>"
    output += "- Spoke VPC Route Tables: Route to Firewall<br>"
    output += "- Inspection VPC Route Table: Route to Firewall<br>"
    output += "- Protected Subnet Route Tables: Route to Firewall<br>"
    output += "- IGW Ingress Route Tables: Route to Firewall<br>"
    output += "- Firewall Route Table: Route to Spoke VPCs, Inspection VPC, Protected Subnets, and IGW<br>"
    if private_subnets_exist:
        output += "- Private Subnet Route Table: Route to Firewall"
    return output

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/submit', methods=['POST'])
def submit():
    deployment = request.form['deployment']
    private_subnets = 'private_subnets' in request.form
    if deployment == 'centralized':
        output = centralized_deployment()
    elif deployment == 'decentralized':
        output = decentralized_deployment(private_subnets)
    elif deployment == 'combined':
        output = combined_deployment(private_subnets)
    else:
        output = "Invalid deployment model."
    return output

if __name__ == '__main__':
    app.run(debug=True)

