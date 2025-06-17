#!/usr/bin/env python3
"""
Local System Monitoring Agent
Provides real-time system metrics via WebSocket for NeuroSecure dashboard

Requirements:
- Python 3.7+
- psutil: pip install psutil
- websockets: pip install websockets
- netifaces: pip install netifaces

Usage:
python system-monitor-agent.py

This agent will:
1. Collect real system metrics (CPU, Memory, GPU, Network, Disk)
2. Monitor network flows and connections
3. Track running processes
4. Stream data to the web dashboard via WebSocket

Security Note:
This agent provides system-level access. Only run on trusted networks.
Consider adding authentication for production use.
"""

import asyncio
import json
import time
import websockets
import psutil
import platform
import socket
from datetime import datetime
from typing import Dict, List, Any, Optional

class SystemMonitor:
    def __init__(self):
        self.clients = set()
        self.running = True
        
    async def get_system_metrics(self) -> Dict[str, Any]:
        """Collect comprehensive system metrics"""
        try:
            # CPU Information
            cpu_percent = psutil.cpu_percent(interval=0.1)
            cpu_freq = psutil.cpu_freq()
            cpu_count = psutil.cpu_count()
            
            # Memory Information
            memory = psutil.virtual_memory()
            
            # Disk Information
            disk_usage = psutil.disk_usage('/')
            disk_io = psutil.disk_io_counters()
            
            # Network Information
            network_io = psutil.net_io_counters()
            network_connections = len(psutil.net_connections())
            
            # GPU Information (requires specialized libraries)
            gpu_info = await self.get_gpu_info()
            
            # Process Information
            processes = await self.get_top_processes()
            
            # Network Flows
            network_flows = await self.get_network_flows()
            
            metrics = {
                "cpu": {
                    "usage": cpu_percent,
                    "cores": cpu_count,
                    "frequency": cpu_freq.current if cpu_freq else 0,
                    "temperature": await self.get_cpu_temperature()
                },
                "memory": {
                    "used": memory.used,
                    "total": memory.total,
                    "available": memory.available,
                    "percentage": memory.percent
                },
                "gpu": gpu_info,
                "network": {
                    "bytesReceived": network_io.bytes_recv,
                    "bytesSent": network_io.bytes_sent,
                    "packetsReceived": network_io.packets_recv,
                    "packetsSent": network_io.packets_sent,
                    "connections": network_connections
                },
                "disk": {
                    "readBytes": disk_io.read_bytes if disk_io else 0,
                    "writeBytes": disk_io.write_bytes if disk_io else 0,
                    "usage": disk_usage.percent
                },
                "processes": processes,
                "timestamp": int(time.time() * 1000)
            }
            
            return metrics
            
        except Exception as e:
            print(f"Error collecting metrics: {e}")
            return {}
    
    async def get_gpu_info(self) -> Dict[str, Any]:
        """Get GPU information (requires nvidia-ml-py for NVIDIA GPUs)"""
        try:
            # Try to get NVIDIA GPU info
            try:
                import pynvml
                pynvml.nvmlInit()
                handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                
                name = pynvml.nvmlDeviceGetName(handle).decode('utf-8')
                memory_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
                utilization = pynvml.nvmlDeviceGetUtilizationRates(handle)
                temperature = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
                
                return {
                    "usage": utilization.gpu,
                    "memory": memory_info.used,
                    "temperature": temperature,
                    "vendor": "NVIDIA",
                    "renderer": name
                }
            except ImportError:
                pass
            except Exception:
                pass
            
            # Fallback to basic GPU info
            return {
                "vendor": "Unknown",
                "renderer": "Unknown"
            }
            
        except Exception as e:
            return {"vendor": "Error", "renderer": str(e)}
    
    async def get_cpu_temperature(self) -> Optional[float]:
        """Get CPU temperature if available"""
        try:
            if hasattr(psutil, 'sensors_temperatures'):
                temps = psutil.sensors_temperatures()
                if temps:
                    for name, entries in temps.items():
                        if entries:
                            return entries[0].current
            return None
        except Exception:
            return None
    
    async def get_top_processes(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top processes by CPU usage"""
        try:
            processes = []
            for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_info', 'status']):
                try:
                    info = proc.info
                    if info['cpu_percent'] is not None:
                        processes.append({
                            "pid": info['pid'],
                            "name": info['name'],
                            "cpuUsage": info['cpu_percent'],
                            "memoryUsage": info['memory_info'].rss if info['memory_info'] else 0,
                            "status": info['status']
                        })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            
            # Sort by CPU usage and return top processes
            processes.sort(key=lambda x: x['cpuUsage'], reverse=True)
            return processes[:limit]
            
        except Exception as e:
            print(f"Error getting processes: {e}")
            return []
    
    async def get_network_flows(self) -> List[Dict[str, Any]]:
        """Get active network connections as flows"""
        try:
            flows = []
            connections = psutil.net_connections(kind='inet')
            
            for conn in connections[:20]:  # Limit to 20 most recent
                if conn.laddr and conn.raddr:
                    flows.append({
                        "sourceIP": conn.laddr.ip,
                        "destIP": conn.raddr.ip,
                        "sourcePort": conn.laddr.port,
                        "destPort": conn.raddr.port,
                        "protocol": "TCP" if conn.type == socket.SOCK_STREAM else "UDP",
                        "bytes": 0,  # Not available in psutil
                        "packets": 0,  # Not available in psutil
                        "timestamp": int(time.time() * 1000),
                        "direction": "outbound" if conn.status == "ESTABLISHED" else "inbound"
                    })
            
            return flows
            
        except Exception as e:
            print(f"Error getting network flows: {e}")
            return []
    
    async def register_client(self, websocket):
        """Register a new WebSocket client"""
        self.clients.add(websocket)
        print(f"Client connected. Total clients: {len(self.clients)}")
    
    async def unregister_client(self, websocket):
        """Unregister a WebSocket client"""
        self.clients.discard(websocket)
        print(f"Client disconnected. Total clients: {len(self.clients)}")
    
    async def broadcast_metrics(self):
        """Broadcast metrics to all connected clients"""
        if not self.clients:
            return
        
        try:
            metrics = await self.get_system_metrics()
            if metrics:
                message = {
                    "type": "metrics",
                    "payload": metrics
                }
                
                # Send to all connected clients
                disconnected = set()
                for client in self.clients:
                    try:
                        await client.send(json.dumps(message))
                    except websockets.exceptions.ConnectionClosed:
                        disconnected.add(client)
                    except Exception as e:
                        print(f"Error sending to client: {e}")
                        disconnected.add(client)
                
                # Remove disconnected clients
                for client in disconnected:
                    self.clients.discard(client)
                    
        except Exception as e:
            print(f"Error broadcasting metrics: {e}")
    
    async def broadcast_network_flows(self):
        """Broadcast network flows to all connected clients"""
        if not self.clients:
            return
        
        try:
            flows = await self.get_network_flows()
            if flows:
                message = {
                    "type": "network_flows",
                    "payload": flows
                }
                
                # Send to all connected clients
                disconnected = set()
                for client in self.clients:
                    try:
                        await client.send(json.dumps(message))
                    except websockets.exceptions.ConnectionClosed:
                        disconnected.add(client)
                    except Exception as e:
                        print(f"Error sending flows to client: {e}")
                        disconnected.add(client)
                
                # Remove disconnected clients
                for client in disconnected:
                    self.clients.discard(client)
                    
        except Exception as e:
            print(f"Error broadcasting flows: {e}")
    
    async def handle_client(self, websocket, path):
        """Handle WebSocket client connection"""
        await self.register_client(websocket)
        try:
            # Send initial metrics
            await self.broadcast_metrics()
            await self.broadcast_network_flows()
            
            # Keep connection alive and handle messages
            async for message in websocket:
                try:
                    data = json.loads(message)
                    if data.get("type") == "get_metrics":
                        await self.broadcast_metrics()
                    elif data.get("type") == "get_flows":
                        await self.broadcast_network_flows()
                except json.JSONDecodeError:
                    print("Invalid JSON received from client")
                except Exception as e:
                    print(f"Error handling client message: {e}")
                    
        except websockets.exceptions.ConnectionClosed:
            pass
        except Exception as e:
            print(f"Error in client handler: {e}")
        finally:
            await self.unregister_client(websocket)
    
    async def start_monitoring(self):
        """Start the monitoring loop"""
        print("Starting system monitoring...")
        
        while self.running:
            try:
                # Broadcast metrics every second
                await self.broadcast_metrics()
                
                # Broadcast network flows every 2 seconds
                if int(time.time()) % 2 == 0:
                    await self.broadcast_network_flows()
                
                await asyncio.sleep(1)
                
            except Exception as e:
                print(f"Error in monitoring loop: {e}")
                await asyncio.sleep(1)
    
    async def start_server(self, host="localhost", port=8765):
        """Start the WebSocket server"""
        print(f"Starting WebSocket server on {host}:{port}")
        
        # Start the WebSocket server
        server = await websockets.serve(
            self.handle_client,
            host,
            port,
            ping_interval=30,
            ping_timeout=10
        )
        
        print(f"System monitoring agent running on ws://{host}:{port}")
        print("Collecting system metrics...")
        print(f"Platform: {platform.system()} {platform.release()}")
        print(f"CPU Cores: {psutil.cpu_count()}")
        print(f"Memory: {psutil.virtual_memory().total / (1024**3):.1f} GB")
        
        # Start monitoring loop
        monitoring_task = asyncio.create_task(self.start_monitoring())
        
        try:
            await asyncio.gather(server.wait_closed(), monitoring_task)
        except KeyboardInterrupt:
            print("\nShutting down system monitor...")
            self.running = False
            monitoring_task.cancel()
            server.close()
            await server.wait_closed()

def main():
    """Main entry point"""
    print("NeuroSecure System Monitoring Agent")
    print("===================================")
    
    monitor = SystemMonitor()
    
    try:
        asyncio.run(monitor.start_server())
    except KeyboardInterrupt:
        print("\nAgent stopped by user")
    except Exception as e:
        print(f"Error starting agent: {e}")

if __name__ == "__main__":
    main()
