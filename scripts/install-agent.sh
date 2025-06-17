#!/bin/bash

# NeuroSecure System Monitoring Agent Installer
# This script installs the local system monitoring agent for real-time metrics

echo "=================================================="
echo "NeuroSecure System Monitoring Agent Installer"
echo "=================================================="

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    echo "Please install Python 3.7 or later and try again."
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "✅ Python $PYTHON_VERSION detected"

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is required but not installed."
    echo "Please install pip3 and try again."
    exit 1
fi

echo "✅ pip3 detected"

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install required packages
echo "📦 Installing dependencies..."
pip install psutil websockets netifaces

# Try to install optional GPU monitoring (NVIDIA)
echo "🎮 Installing optional GPU monitoring (NVIDIA)..."
pip install pynvml || echo "⚠️  NVIDIA GPU monitoring not available (optional)"

# Create requirements.txt
echo "📝 Creating requirements.txt..."
cat > requirements.txt << EOF
psutil>=5.8.0
websockets>=10.0
netifaces>=0.11.0
pynvml>=11.0.0
EOF

# Make the agent executable
chmod +x system-monitor-agent.py

echo ""
echo "=================================================="
echo "✅ Installation completed successfully!"
echo "=================================================="
echo ""
echo "To start the system monitoring agent:"
echo ""
echo "1. Activate the virtual environment:"
echo "   source venv/bin/activate"
echo ""
echo "2. Run the agent:"
echo "   python system-monitor-agent.py"
echo ""
echo "3. The agent will start on ws://localhost:8765"
echo ""
echo "📝 Security Notes:"
echo "   - This agent provides system-level access"
echo "   - Only run on trusted networks"
echo "   - Consider adding authentication for production"
echo ""
echo "🌐 Web Dashboard Connection:"
echo "   - Open your NeuroSecure dashboard"
echo "   - Navigate to the Real-Time System Monitor"
echo "   - The dashboard will automatically connect to the agent"
echo ""
echo "🔧 Troubleshooting:"
echo "   - Ensure port 8765 is not blocked by firewall"
echo "   - Check that the web browser can access localhost:8765"
echo "   - For remote access, modify the host setting in the agent"
echo ""

# Create a startup script
echo "📜 Creating startup script..."
cat > start-agent.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
source venv/bin/activate
python system-monitor-agent.py
EOF

chmod +x start-agent.sh

echo "📜 Created start-agent.sh for easy startup"
echo ""
echo "Quick start: ./start-agent.sh"
echo ""
