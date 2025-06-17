#!/usr/bin/env python3
"""
Startup script for the CLI Command Executor Backend
"""

import subprocess
import sys
import os
import platform

def install_requirements():
    """Install required packages"""
    print("📦 Installing required packages...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Requirements installed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install requirements: {e}")
        return False

def start_server():
    """Start the Flask server"""
    print("🚀 Starting CLI Command Executor Backend...")
    try:
        # Change to backend directory
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        os.chdir(backend_dir)
        
        # Start the server
        subprocess.run([sys.executable, "command_executor.py"])
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")

def main():
    print("🔧 CLI Command Executor Backend Setup")
    print("=" * 50)
    print(f"🖥️  Platform: {platform.system()}")
    print(f"🐍 Python: {sys.version}")
    print(f"📂 Directory: {os.getcwd()}")
    print()
    
    # Install requirements
    if install_requirements():
        print()
        start_server()
    else:
        print("❌ Setup failed. Please install requirements manually.")
        sys.exit(1)

if __name__ == "__main__":
    main()
