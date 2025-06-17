# Real-Time System Monitoring

NeuroSecure now includes comprehensive real-time system monitoring capabilities that collect and display live system metrics directly from your PC.

## 🚀 Features

### Browser-Based Metrics (Always Available)

- **CPU Information**: Core count, usage estimation
- **Memory Usage**: JavaScript heap usage (Chrome only)
- **Network Info**: Connection type, bandwidth, RTT
- **GPU Details**: Vendor, renderer information
- **Storage**: Disk usage estimates
- **Platform Info**: OS, browser, language details

### Local Agent Metrics (Enhanced Mode)

- **Real CPU Usage**: Actual CPU utilization per core
- **System Memory**: Physical RAM usage and availability
- **GPU Monitoring**: NVIDIA GPU usage, memory, temperature
- **Network Flows**: Active connections, packet flows, traffic
- **Process Monitor**: Running processes with CPU/memory usage
- **Disk I/O**: Read/write operations and performance
- **Temperature**: CPU and GPU temperature monitoring

## 📊 Dashboard Components

### 1. System Overview Cards

- **CPU Usage**: Real-time CPU utilization with core count
- **Memory Usage**: RAM consumption with total/available
- **Network Activity**: Upload/download speeds and statistics
- **Disk Usage**: Storage utilization and I/O operations

### 2. Performance Charts

- **Real-time Line Charts**: CPU, memory, and network over time
- **Network Flow Visualization**: Active connections and traffic
- **Process Monitor**: Top processes by resource usage
- **Hardware Information**: Detailed system specifications

### 3. Network Analysis

- **Active Flows**: Live network connections with protocols
- **Traffic Statistics**: Packet counts and bandwidth usage
- **Connection Monitoring**: TCP/UDP connections and states

## 🔧 Installation & Setup

### Quick Start (Browser Only)

The dashboard works immediately with browser-available metrics:

1. Navigate to "System Monitor" in NeuroSecure
2. View real-time browser metrics and simulated data
3. No additional setup required

### Enhanced Mode (Local Agent)

For full system access, install the local monitoring agent:

#### Prerequisites

- Python 3.7 or later
- pip3 package manager
- Admin/root access for system metrics

#### Installation Steps

1. **Navigate to scripts directory:**

   ```bash
   cd scripts/
   ```

2. **Run the installer:**

   ```bash
   chmod +x install-agent.sh
   ./install-agent.sh
   ```

3. **Start the agent:**
   ```bash
   ./start-agent.sh
   ```

#### Manual Installation

If the automated installer doesn't work:

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install psutil websockets netifaces pynvml

# Run the agent
python system-monitor-agent.py
```

## 🌐 How It Works

### Architecture

```
Web Dashboard (Browser)
       ↕ WebSocket
Local Agent (Python)
       ↕ System APIs
Operating System
```

### Data Flow

1. **Local Agent** collects system metrics using Python libraries
2. **WebSocket Connection** streams data to the web dashboard
3. **Browser Dashboard** displays real-time visualizations
4. **Fallback Mode** uses browser APIs when agent unavailable

### Browser Security Model

Web browsers restrict direct system access for security. Our solution:

- **Browser APIs**: Limited but secure access to hardware info
- **Local Agent**: Full system access via optional Python service
- **WebSocket Bridge**: Secure connection between agent and browser
- **Graceful Fallback**: Works with or without local agent

## 📈 Metrics Collected

### CPU Metrics

- **Usage Percentage**: Real-time CPU utilization
- **Core Count**: Number of physical/logical cores
- **Frequency**: Current CPU frequency (when available)
- **Temperature**: CPU temperature monitoring

### Memory Metrics

- **Used Memory**: Currently allocated RAM
- **Total Memory**: Total system RAM
- **Available Memory**: Free RAM available
- **Usage Percentage**: Memory utilization ratio

### Network Metrics

- **Bytes Sent/Received**: Network traffic counters
- **Packets Sent/Received**: Packet transmission counts
- **Active Connections**: Live TCP/UDP connections
- **Connection Type**: WiFi, Ethernet, cellular
- **Bandwidth**: Effective network speed
- **RTT**: Round-trip time latency

### Disk Metrics

- **Read/Write Bytes**: Disk I/O operations
- **Disk Usage**: Storage space utilization
- **I/O Operations**: Read/write operation counts

### Process Information

- **Process List**: Running applications and services
- **CPU Usage**: Per-process CPU consumption
- **Memory Usage**: Per-process RAM usage
- **Process Status**: Running, sleeping, stopped states

### GPU Information

- **Vendor/Model**: Graphics card identification
- **GPU Usage**: Graphics processing utilization
- **GPU Memory**: Video memory usage
- **Temperature**: GPU temperature monitoring

## 🔒 Security Considerations

### Browser Security

- Limited to browser-provided APIs
- No direct file system access
- Sandboxed execution environment
- Cross-origin restrictions apply

### Local Agent Security

- **System Access**: Requires elevated permissions
- **Network Binding**: Listens on localhost:8765
- **Authentication**: No built-in auth (localhost only)
- **Firewall**: May require firewall configuration

### Production Recommendations

1. **Network Security**: Use HTTPS/WSS for remote access
2. **Authentication**: Add token-based authentication
3. **Access Control**: Restrict to authorized users only
4. **Monitoring**: Log all agent connections and activities
5. **Updates**: Keep dependencies updated for security

## 🐛 Troubleshooting

### Common Issues

#### Agent Won't Start

```
Error: Permission denied
Solution: Run with appropriate permissions or check port availability
```

#### Dashboard Shows "Disconnected"

```
Issue: WebSocket connection failed
Solutions:
- Ensure agent is running on localhost:8765
- Check firewall settings
- Verify Python dependencies installed
```

#### Missing GPU Information

```
Issue: GPU metrics unavailable
Solutions:
- Install pynvml for NVIDIA GPUs: pip install pynvml
- Check GPU driver compatibility
- Run agent with appropriate permissions
```

#### High CPU Usage

```
Issue: Monitoring causing performance impact
Solutions:
- Increase update interval in agent
- Reduce number of monitored processes
- Check for memory leaks in long-running sessions
```

### Performance Optimization

#### Reduce Update Frequency

Modify the agent's update interval:

```python
# In system-monitor-agent.py
await asyncio.sleep(2)  # Change from 1 to 2 seconds
```

#### Limit Process Monitoring

Reduce the number of processes monitored:

```python
# In get_top_processes method
return processes[:5]  # Monitor top 5 instead of 10
```

## 🔧 Configuration

### Agent Configuration

Edit `system-monitor-agent.py` to customize:

```python
# WebSocket server settings
HOST = "localhost"  # Change for remote access
PORT = 8765        # Change port if needed

# Update intervals
METRICS_INTERVAL = 1    # Seconds between metric updates
FLOWS_INTERVAL = 2      # Seconds between network flow updates

# Process limits
MAX_PROCESSES = 10      # Number of processes to monitor
```

### Dashboard Configuration

Update intervals in the web dashboard:

```typescript
// In SystemMetrics.ts
private updateInterval: number = 1000; // Milliseconds

// Change to reduce update frequency
systemMetrics.setUpdateInterval(2000); // 2 seconds
```

## 📚 API Reference

### WebSocket Messages

#### Metrics Update

```json
{
  "type": "metrics",
  "payload": {
    "cpu": { "usage": 45.2, "cores": 8, "frequency": 3200 },
    "memory": { "used": 8589934592, "total": 17179869184, "percentage": 50.0 },
    "network": { "bytesReceived": 1048576, "bytesSent": 524288 },
    "timestamp": 1640995200000
  }
}
```

#### Network Flows Update

```json
{
  "type": "network_flows",
  "payload": [
    {
      "sourceIP": "192.168.1.100",
      "destIP": "172.217.16.110",
      "sourcePort": 54321,
      "destPort": 443,
      "protocol": "TCP",
      "direction": "outbound",
      "bytes": 2048,
      "packets": 15
    }
  ]
}
```

### Browser API Usage

#### Performance Memory (Chrome)

```javascript
if ("memory" in performance) {
  const memory = performance.memory;
  console.log("Used:", memory.usedJSHeapSize);
  console.log("Total:", memory.totalJSHeapSize);
}
```

#### Network Information

```javascript
if ("connection" in navigator) {
  const connection = navigator.connection;
  console.log("Type:", connection.effectiveType);
  console.log("Downlink:", connection.downlink);
}
```

## 🚀 Future Enhancements

### Planned Features

- **Historical Data**: Long-term metric storage and analysis
- **Alerting**: Threshold-based notifications
- **Remote Monitoring**: Multi-machine monitoring
- **Custom Metrics**: User-defined monitoring scripts
- **Machine Learning**: Anomaly detection and prediction

### Integration Opportunities

- **SIEM Integration**: Send metrics to security platforms
- **Cloud Monitoring**: Upload to cloud monitoring services
- **Container Support**: Docker and Kubernetes monitoring
- **IoT Devices**: Extend to network-connected devices

## 📞 Support

### Getting Help

1. **Check Logs**: Review browser console and agent output
2. **Verify Setup**: Ensure all dependencies are installed
3. **Test Connection**: Verify WebSocket connectivity
4. **Performance**: Monitor resource usage impact

### Contributing

The monitoring system is designed to be extensible:

- Add new metric collectors in the Python agent
- Create custom visualizations in the React dashboard
- Extend WebSocket protocol for new data types
- Contribute platform-specific enhancements

---

**Note**: This monitoring system provides deep system insights while maintaining security through proper architecture and optional local agent installation.
