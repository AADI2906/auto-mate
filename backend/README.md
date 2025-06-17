# CLI Command Executor Backend

A Python Flask backend that allows the web frontend to execute CLI commands directly on your laptop.

## 🚀 Quick Start

### Method 1: Automatic Setup

```bash
cd backend
python start_backend.py
```

### Method 2: Manual Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Start the server
python command_executor.py
```

## 🔧 Features

- **✅ Real Command Execution**: Runs CLI commands using subprocess
- **🛡️ Security**: Blocks dangerous commands (rm -rf, format, etc.)
- **🌐 Cross-Platform**: Works on Windows (cmd), macOS/Linux (bash)
- **📊 Real-Time Results**: Returns stdout, stderr, and return codes
- **⏱️ Timeout Protection**: Commands timeout after 30 seconds
- **📋 Batch Execution**: Run multiple commands in sequence
- **📜 Execution History**: Track all executed commands

## 🌐 API Endpoints

### Execute Single Command

```bash
POST http://localhost:5000/api/execute
Content-Type: application/json

{
  "command": "ping google.com",
  "timeout": 30
}
```

### Execute Multiple Commands

```bash
POST http://localhost:5000/api/execute-batch
Content-Type: application/json

{
  "commands": ["ping google.com", "systemctl status"],
  "timeout": 30,
  "stop_on_error": true
}
```

### Health Check

```bash
GET http://localhost:5000/api/health
```

### System Information

```bash
GET http://localhost:5000/api/system-info
```

### Execution History

```bash
GET http://localhost:5000/api/history?limit=50
```

## 🛡️ Security Features

### Blocked Commands

The following dangerous commands are automatically blocked:

- `rm -rf /` - Recursive delete
- `del /f /q` - Windows force delete
- `format` - Format drives
- `mkfs` - Make filesystem
- `dd if=` - Disk copy operations
- `shred` - Secure delete
- `rmdir /s` - Windows recursive delete
- `deltree` - Windows tree delete
- `fdisk` - Disk partitioning
- `parted` - Disk partitioning
- `wipefs` - Wipe filesystem

### Additional Safety

- 30-second timeout on all commands
- No shell injection (uses subprocess arrays)
- Command logging and history
- Error handling and validation

## 🔧 Configuration

### Default Settings

- **Host**: localhost (127.0.0.1)
- **Port**: 5000
- **Timeout**: 30 seconds
- **CORS**: Enabled for frontend communication

### Environment Variables

```bash
# Optional: Set custom port
export FLASK_PORT=5000

# Optional: Set debug mode
export FLASK_DEBUG=1
```

## 🐛 Troubleshooting

### Backend Not Starting

```bash
# Check Python version (3.7+ required)
python --version

# Install dependencies manually
pip install Flask Flask-CORS requests

# Run with debug info
python command_executor.py
```

### Frontend Cannot Connect

1. **Check backend is running**: Visit http://localhost:5000/api/health
2. **Check CORS**: Backend enables CORS automatically
3. **Check firewall**: Ensure port 5000 is not blocked
4. **Check browser**: Some browsers block localhost requests

### Commands Not Executing

1. **Check security blocks**: Dangerous commands are blocked
2. **Check permissions**: Some commands need admin/sudo
3. **Check timeout**: Commands timeout after 30 seconds
4. **Check syntax**: Ensure command syntax is correct for your platform

## 📊 Usage Examples

### Network Troubleshooting

```json
{
  "command": "ping -c 4 google.com"
}
```

### System Information

```json
{
  "command": "systemctl status NetworkManager"
}
```

### File Operations

```json
{
  "command": "ls -la /home"
}
```

### Process Management

```json
{
  "command": "ps aux | grep python"
}
```

## 🔄 Integration with Frontend

The frontend automatically:

1. Checks backend health on component load
2. Shows backend status (Ready/Offline/Checking)
3. Displays real command output and errors
4. Falls back to clipboard copy if backend unavailable

## 📝 Development

### Project Structure

```
backend/
├── command_executor.py    # Main Flask server
├── start_backend.py      # Automatic setup script
├── requirements.txt      # Python dependencies
└── README.md            # This file
```

### Adding New Features

1. Edit `command_executor.py`
2. Add new endpoints following Flask patterns
3. Update frontend `CommandExecutor.ts` to use new endpoints
4. Test with various platforms and commands

## ⚠️ Important Notes

- **Local Only**: Backend only accepts connections from localhost
- **No Remote Access**: For security, backend doesn't accept external connections
- **Command Logging**: All executed commands are logged for debugging
- **Platform Specific**: Commands are executed using platform-appropriate shells
- **No Persistence**: Command history is lost when backend restarts

Start the backend and enjoy real CLI command execution from your web interface! 🚀
