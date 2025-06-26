# 🔥 Network Firewall Architecture Simulator

**Version 2.0** - The Interactive Sequel to Network Firewall Route Planner

A modern Electron desktop application for designing and simulating AWS Network Firewall architectures with interactive, drag-and-drop components.

![Network Firewall Simulator](assets/icon.png)

## ✨ Features

### 🎨 Interactive Design Canvas
- **Drag & Drop Components**: VPCs, Firewalls, Subnets, Gateways, and more
- **Real-time Connections**: Visual routing between network components
- **Pre-built Templates**: Centralized, Decentralized, and Combined deployment models
- **Moveable Architecture**: Adjust your network design on the fly

### 🏗️ Network Components
- **VPC** - Virtual Private Clouds
- **🔥 Firewall** - AWS Network Firewall instances
- **Subnet** - Protected and firewall subnets
- **IGW** - Internet Gateways
- **TGW** - Transit Gateways
- **NAT** - NAT Gateways

### 📊 Smart Routing Information
- Component-specific routing rules
- Real-time connection tracking
- Architecture-aware route generation
- Interactive configuration panels

### 💾 Project Management
- Save/Load diagrams
- Export to PNG
- Zoom and pan controls
- Grid-based alignment

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- macOS, Windows, or Linux

### Installation

1. **Clone or download this project**
   ```bash
   cd NWFW-main
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   npm start
   ```

### Development Mode
```bash
npm run dev
```

### Building for Distribution
```bash
# Build for current platform
npm run build

# Platform-specific builds
npm run build-win    # Windows
npm run build-mac    # macOS
npm run build-linux  # Linux
```

## 🎯 How to Use

### 1. **Drag Components to Canvas**
   - Select components from the sidebar palette
   - Drag them onto the main canvas
   - Position them to design your architecture

### 2. **Create Connections**
   - Hold `Ctrl/Cmd` and click components to connect them
   - Visual arrows show traffic flow direction
   - Connection details appear in the side panel

### 3. **Use Pre-built Templates**
   - Click **Centralized**, **Decentralized**, or **Combined** buttons
   - Modify the auto-generated architecture as needed
   - Adjust AZ count and spoke VPC count in configuration

### 4. **Configure Settings**
   - Set number of Availability Zones (1-6)
   - Configure Spoke VPC count (0-10)
   - Toggle private subnets on/off

### 5. **Export Your Work**
   - Save diagrams locally for later editing
   - Export as PNG images for documentation
   - Use zoom controls for detailed work

## 🏛️ Architecture Models

### Centralized Deployment
- Central inspection VPC with AWS Network Firewall
- Transit Gateway for inter-VPC communication
- Spoke VPCs connect through TGW
- Single point of security control

### Decentralized Deployment
- Firewall deployed within individual VPCs
- Protected and firewall subnets per AZ
- IGW routing through firewall
- Distributed security model

### Combined Deployment
- Hybrid approach combining both models
- Central inspection + local firewall instances
- Maximum security coverage
- Complex but comprehensive routing

## 🔧 Technical Stack

- **Electron** - Cross-platform desktop framework
- **Fabric.js** - Interactive canvas library
- **HTML5/CSS3** - Modern web technologies
- **JavaScript ES6+** - Application logic

## 📋 Keyboard Shortcuts

- `Ctrl/Cmd + N` - New diagram
- `Ctrl/Cmd + S` - Save diagram
- `Ctrl/Cmd + Click` - Connect components
- `Mouse Wheel` - Zoom in/out
- `Drag` - Move components and pan canvas

## 🔗 Relationship to Original

This application is the **interactive sequel** to the original [Network Firewall Route Planner](app.py) which provided:
- Static route table generation
- Windows 95 themed interface
- Form-based architecture selection

The new simulator adds:
- ✅ Interactive visual design
- ✅ Drag-and-drop components
- ✅ Real-time connection drawing
- ✅ Modern desktop application
- ✅ Enhanced user experience

## 👩‍💻 About the Developer

**Created by Anna Booker © 2024**

- **GitHub**: [@annabook21](https://github.com/annabook21)
- **LinkedIn**: [annadbooker](https://linkedin.com/in/annadbooker)

## 📝 License

MIT License - See individual files for specific licensing terms.

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome! 

## 🐛 Known Issues

- Component text positioning may vary on different platforms
- Large diagrams may impact performance
- Canvas export limited to visible area

## 🎯 Future Enhancements

- [ ] Cloud formation template export
- [ ] Terraform configuration generation
- [ ] Advanced routing table visualization
- [ ] Component property editing
- [ ] Multi-tab diagram support
- [ ] Real AWS integration

---

*Transform your network security planning from static tables to interactive visual design!* 