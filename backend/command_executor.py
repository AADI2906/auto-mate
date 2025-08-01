#!/usr/bin/env python3
"""
CLI Command Executor Backend
A Flask server that executes CLI commands safely using subprocess
"""

import subprocess
import platform
import os
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import threading
import queue
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

class CommandExecutor:
    def __init__(self):
        self.platform = platform.system().lower()
        self.execution_history = []

    def detect_shell(self):
        """Detect the appropriate shell/terminal for the platform"""
        if self.platform == "windows":
            return "cmd"
        elif self.platform == "darwin":  # macOS
            return "bash"
        elif self.platform == "linux":
            return "bash"
        else:
            return "bash"

    def prepare_command(self, command):
        """Prepare command based on platform"""
        shell = self.detect_shell()

        if self.platform == "windows":
            # For Windows, use cmd with /c flag
            return ["cmd", "/c", command]
        else:
            # For Unix-like systems, use bash with -c flag
            return ["bash", "-c", command]

    def execute_command_in_terminal(self, command, timeout=30):
        """Execute a command in a visible terminal window"""
        try:
            logger.info(f"Opening terminal for command: {command}")

            if self.platform == "windows":
                # Windows: Open cmd window
                terminal_cmd = [
                    "cmd", "/c", "start", "cmd", "/k",
                    f"echo Executing: {command} && {command} && echo. && echo Command completed! && pause"
                ]
            elif self.platform == "darwin":  # macOS
                # macOS: Open Terminal app
                script = f'''
                tell application "Terminal"
                    activate
                    do script "echo 'Executing: {command}' && {command} && echo && echo 'Command completed! Press any key to close...' && read -n 1"
                end tell
                '''
                terminal_cmd = ["osascript", "-e", script]
            else:  # Linux
                # Linux: Try different terminal emulators
                terminal_cmd = [
                    "gnome-terminal", "--", "bash", "-c",
                    f"echo 'Executing: {command}' && {command} && echo && echo 'Command completed! Press Enter to close...' && read"
                ]

            # Execute terminal opening command
            result = subprocess.run(
                terminal_cmd,
                capture_output=True,
                text=True,
                timeout=10,  # Short timeout for opening terminal
                shell=False
            )

            response = {
                "success": True,
                "command": command,
                "method": "visible_terminal",
                "returncode": result.returncode,
                "stdout": "Terminal opened successfully",
                "stderr": result.stderr,
                "platform": self.platform,
                "execution_time": time.time()
            }

            self.execution_history.append(response)
            logger.info(f"Terminal opened successfully for: {command}")

            return response

        except Exception as e:
            # Fallback to background execution
            logger.warning(f"Failed to open terminal, falling back to background execution: {str(e)}")
            return self.execute_command_background(command, timeout)

    def execute_command_background(self, command, timeout=30):
        """Execute a command in background (original method)"""
        try:
            logger.info(f"Executing command in background: {command}")

            # Prepare command for the platform
            cmd_array = self.prepare_command(command)

            # Execute command with timeout
            result = subprocess.run(
                cmd_array,
                capture_output=True,
                text=True,
                timeout=timeout,
                shell=False  # Use shell=False for security
            )

            # Prepare response
            response = {
                "success": True,
                "command": command,
                "method": "background",
                "returncode": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "platform": self.platform,
                "shell": self.detect_shell(),
                "execution_time": time.time()
            }

            # Log execution
            self.execution_history.append(response)

            if result.returncode == 0:
                logger.info(f"Command executed successfully: {command}")
            else:
                logger.warning(f"Command failed with code {result.returncode}: {command}")

            return response

        except subprocess.TimeoutExpired:
            error_response = {
                "success": False,
                "command": command,
                "error": f"Command timed out after {timeout} seconds",
                "error_type": "timeout",
                "platform": self.platform
            }
            logger.error(f"Command timeout: {command}")
            return error_response

        except subprocess.CalledProcessError as e:
            error_response = {
                "success": False,
                "command": command,
                "error": f"Command failed: {str(e)}",
                "error_type": "execution_error",
                "returncode": e.returncode,
                "platform": self.platform
            }
            logger.error(f"Command execution error: {command} - {str(e)}")
            return error_response

        except Exception as e:
            error_response = {
                "success": False,
                "command": command,
                "error": f"Unexpected error: {str(e)}",
                "error_type": "unknown",
                "platform": self.platform
            }
            logger.error(f"Unexpected error executing command: {command} - {str(e)}")
            return error_response

    def execute_command(self, command, timeout=30):
        """Main execute method - tries terminal first, falls back to background"""
        return self.execute_command_in_terminal(command, timeout)

# Global command executor instance
executor = CommandExecutor()

@app.route('/api/system-info', methods=['GET'])
def get_system_info():
    """Get system information"""
    return jsonify({
        "platform": platform.system(),
        "platform_release": platform.release(),
        "platform_version": platform.version(),
        "architecture": platform.machine(),
        "processor": platform.processor(),
        "shell": executor.detect_shell(),
        "python_version": platform.python_version(),
        "working_directory": os.getcwd()
    })

@app.route('/api/execute', methods=['POST'])
def execute_command():
    """Execute a single command"""
    try:
        data = request.get_json()

        if not data or 'command' not in data:
            return jsonify({
                "success": False,
                "error": "No command provided",
                "error_type": "invalid_request"
            }), 400

        command = data['command'].strip()
        timeout = data.get('timeout', 30)  # Default 30 second timeout
        execution_mode = data.get('mode', 'terminal')  # 'terminal' or 'background'

        if not command:
            return jsonify({
                "success": False,
                "error": "Empty command provided",
                "error_type": "invalid_request"
            }), 400

        # Security check - block dangerous commands
        dangerous_commands = [
            'rm -rf /', 'del /f /q', 'format', 'mkfs', 'dd if=', 'shred',
            'rmdir /s', 'deltree', 'fdisk', 'parted', 'wipefs'
        ]

        if any(dangerous in command.lower() for dangerous in dangerous_commands):
            return jsonify({
                "success": False,
                "error": "Dangerous command blocked for security",
                "error_type": "security_block",
                "command": command
            }), 403

        # Execute the command based on mode
        if execution_mode == 'background':
            result = executor.execute_command_background(command, timeout)
        else:
            result = executor.execute_command_in_terminal(command, timeout)

        return jsonify(result)

    except Exception as e:
        logger.error(f"API error: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"API error: {str(e)}",
            "error_type": "api_error"
        }), 500

@app.route('/api/execute-terminal-batch', methods=['POST'])
def execute_terminal_batch():
    """Execute multiple commands in a single terminal window"""
    try:
        data = request.get_json()

        if not data or 'commands' not in data:
            return jsonify({
                "success": False,
                "error": "No commands provided",
                "error_type": "invalid_request"
            }), 400

        commands = data['commands']
        if not isinstance(commands, list):
            return jsonify({
                "success": False,
                "error": "Commands must be a list",
                "error_type": "invalid_request"
            }), 400

        # Create a script that runs all commands in sequence
        command_sequence = " && ".join(commands)

        # Platform-specific terminal opening with multiple commands
        if executor.platform == "windows":
            # Windows: Create batch script and run in cmd
            script_content = f'''
@echo off
echo ========================================
echo Executing Command Sequence
echo ========================================
echo.
{chr(10).join([f"echo Executing: {cmd}" + chr(10) + cmd + chr(10) + "echo." for cmd in commands])}
echo.
echo ========================================
echo All commands completed!
echo ========================================
pause
'''
            # Write temp batch file
            import tempfile
            with tempfile.NamedTemporaryFile(mode='w', suffix='.bat', delete=False) as f:
                f.write(script_content)
                batch_file = f.name

            terminal_cmd = ["cmd", "/c", "start", "cmd", "/c", batch_file]

        elif executor.platform == "darwin":  # macOS
            # macOS: Create shell script for Terminal
            script_lines = []
            for cmd in commands:
                script_lines.extend([
                    f"echo 'Executing: {cmd}'",
                    cmd,
                    "echo"
                ])
            script_lines.extend([
                "echo 'All commands completed! Press any key to close...'",
                "read -n 1"
            ])

            script = f'''
            tell application "Terminal"
                activate
                do script "{'; '.join(script_lines)}"
            end tell
            '''
            terminal_cmd = ["osascript", "-e", script]

        else:  # Linux
            # Linux: Create shell script
            script_lines = []
            for cmd in commands:
                script_lines.extend([
                    f"echo 'Executing: {cmd}'",
                    cmd,
                    "echo"
                ])
            script_lines.extend([
                "echo 'All commands completed! Press Enter to close...'",
                "read"
            ])

            terminal_cmd = [
                "gnome-terminal", "--", "bash", "-c", "; ".join(script_lines)
            ]

        # Execute terminal opening
        result = subprocess.run(terminal_cmd, capture_output=True, text=True, timeout=10)

        return jsonify({
            "success": True,
            "method": "terminal_batch",
            "commands": commands,
            "platform": executor.platform,
            "message": f"Opened terminal with {len(commands)} commands"
        })

    except Exception as e:
        logger.error(f"Terminal batch error: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Terminal batch error: {str(e)}",
            "error_type": "api_error"
        }), 500

@app.route('/api/execute-batch', methods=['POST'])
def execute_batch_commands():
    """Execute multiple commands in sequence"""
    try:
        data = request.get_json()

        if not data or 'commands' not in data:
            return jsonify({
                "success": False,
                "error": "No commands provided",
                "error_type": "invalid_request"
            }), 400

        commands = data['commands']
        timeout = data.get('timeout', 30)
        stop_on_error = data.get('stop_on_error', True)

        if not isinstance(commands, list):
            return jsonify({
                "success": False,
                "error": "Commands must be a list",
                "error_type": "invalid_request"
            }), 400

        results = []

        for i, command in enumerate(commands):
            result = executor.execute_command(command.strip(), timeout)
            results.append(result)

            # Stop on first error if requested
            if stop_on_error and not result.get('success', False):
                break

        return jsonify({
            "success": True,
            "results": results,
            "total_commands": len(commands),
            "executed_commands": len(results)
        })

    except Exception as e:
        logger.error(f"Batch API error: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Batch API error: {str(e)}",
            "error_type": "api_error"
        }), 500

@app.route('/api/history', methods=['GET'])
def get_execution_history():
    """Get command execution history"""
    limit = request.args.get('limit', 50, type=int)
    return jsonify({
        "history": executor.execution_history[-limit:],
        "total": len(executor.execution_history)
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "platform": platform.system(),
        "timestamp": time.time()
    })

if __name__ == '__main__':
    print("🚀 Starting CLI Command Executor Backend...")
    print(f"📱 Platform: {platform.system()}")
    print(f"��� Shell: {executor.detect_shell()}")
    print(f"📂 Working Directory: {os.getcwd()}")
    print(f"🌐 Server will run on http://localhost:5000")
    print("⚠️  Security: Dangerous commands are blocked")
    print("💡 Use Ctrl+C to stop the server")

    # Run the Flask app
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        threaded=True
    )
