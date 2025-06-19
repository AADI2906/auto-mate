
// Real-time data parser for extracting metrics from CLI command outputs
export interface ParsedMetrics {
    [key: string]: any;
  }
  
  export interface ChartDataPoint {
    name: string;
    value: number;
    timestamp: number;
    unit?: string;
    status?: "good" | "warning" | "critical";
  }
  
  export interface NetworkTopology {
    nodes: Array<{
      id: string;
      label: string;
      type: "device" | "router" | "server" | "internet";
      status: "online" | "offline" | "unknown";
      ip?: string;
    }>;
    edges: Array<{
      from: string;
      to: string;
      label?: string;
      latency?: number;
    }>;
  }
  
  export class RealTimeDataParser {
    // Parse ping command output
    static parsePingOutput(output: string): ChartDataPoint[] {
      const lines = output.split("\n");
      const pingData: ChartDataPoint[] = [];
  
      // Extract individual ping times
      const pingRegex = /time=(\d+\.?\d*)\s*ms/g;
      let match;
      let sequence = 1;
  
      while ((match = pingRegex.exec(output)) !== null) {
        const latency = parseFloat(match[1]);
        pingData.push({
          name: `Ping ${sequence}`,
          value: latency,
          timestamp: Date.now(),
          unit: "ms",
          status: latency < 50 ? "good" : latency < 200 ? "warning" : "critical",
        });
        sequence++;
      }
  
      // Extract packet loss
      const lossMatch = output.match(/(\d+)% packet loss/);
      if (lossMatch) {
        pingData.push({
          name: "Packet Loss",
          value: parseInt(lossMatch[1]),
          timestamp: Date.now(),
          unit: "%",
          status: parseInt(lossMatch[1]) === 0 ? "good" : "critical",
        });
      }
  
      return pingData;
    }
  
    // Parse ip addr show output
    static parseIpAddrOutput(output: string): ParsedMetrics {
      const interfaces: any = {};
      const lines = output.split("\n");
      let currentInterface = null;
  
      for (const line of lines) {
        // Interface line: "2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP>"
        const ifaceMatch = line.match(/^\d+:\s+(\w+):\s+<([^>]+)>/);
        if (ifaceMatch) {
          currentInterface = ifaceMatch[1];
          const flags = ifaceMatch[2].split(",");
          interfaces[currentInterface] = {
            name: currentInterface,
            status: flags.includes("UP") ? "up" : "down",
            flags: flags,
            ipv4: [],
            ipv6: [],
          };
        }
  
        // IPv4 address: "inet 192.168.1.100/24"
        const ipv4Match = line.match(/inet\s+(\d+\.\d+\.\d+\.\d+)\/(\d+)/);
        if (ipv4Match && currentInterface) {
          interfaces[currentInterface].ipv4.push({
            address: ipv4Match[1],
            prefix: ipv4Match[2],
          });
        }
  
        // IPv6 address
        const ipv6Match = line.match(/inet6\s+([a-f0-9:]+)\/(\d+)/);
        if (ipv6Match && currentInterface) {
          interfaces[currentInterface].ipv6.push({
            address: ipv6Match[1],
            prefix: ipv6Match[2],
          });
        }
      }
  
      return { interfaces };
    }
  
    // Parse systemctl status output
    static parseSystemctlOutput(output: string): ParsedMetrics {
      const status: any = {};
  
      // Extract service status
      const activeMatch = output.match(/Active:\s+(\w+)\s+\(([^)]+)\)/);
      if (activeMatch) {
        status.active = activeMatch[1];
        status.state = activeMatch[2];
      }
  
      // Extract main PID
      const pidMatch = output.match(/Main PID:\s+(\d+)/);
      if (pidMatch) {
        status.pid = parseInt(pidMatch[1]);
      }
  
      // Extract memory usage
      const memoryMatch = output.match(/Memory:\s+(\d+\.?\d*)\s*(\w+)/);
      if (memoryMatch) {
        status.memory = {
          value: parseFloat(memoryMatch[1]),
          unit: memoryMatch[2],
        };
      }
  
      return status;
    }
  
    // Parse netstat/ss output for network connections
    static parseNetstatOutput(output: string): ChartDataPoint[] {
      const connections: ChartDataPoint[] = [];
      const lines = output.split("\n");
      const connectionCounts: { [key: string]: number } = {};
  
      for (const line of lines) {
        // TCP connections
        const tcpMatch = line.match(
          /tcp\s+\d+\s+\d+\s+[\d.]+:(\d+)\s+[\d.]+:\d+\s+(\w+)/,
        );
        if (tcpMatch) {
          const state = tcpMatch[2];
          connectionCounts[state] = (connectionCounts[state] || 0) + 1;
        }
      }
  
      Object.entries(connectionCounts).forEach(([state, count]) => {
        connections.push({
          name: state,
          value: count,
          timestamp: Date.now(),
          unit: "connections",
        });
      });
  
      return connections;
    }
  
    // Parse performance metrics (htop, ps, etc.)
    static parsePerformanceOutput(
      output: string,
      command: string,
    ): ChartDataPoint[] {
      const metrics: ChartDataPoint[] = [];
  
      if (command.includes("free")) {
        // Memory usage from 'free -h'
        const memMatch = output.match(
          /Mem:\s+(\d+\.?\d*\w?)\s+(\d+\.?\d*\w?)\s+(\d+\.?\d*\w?)/,
        );
        if (memMatch) {
          const total = this.parseMemoryValue(memMatch[1]);
          const used = this.parseMemoryValue(memMatch[2]);
          const percentage = (used / total) * 100;
  
          metrics.push({
            name: "Memory Usage",
            value: Math.round(percentage),
            timestamp: Date.now(),
            unit: "%",
            status:
              percentage < 70 ? "good" : percentage < 90 ? "warning" : "critical",
          });
        }
      }
  
      if (command.includes("df")) {
        // Disk usage from 'df -h'
        const lines = output.split("\n");
        for (const line of lines) {
          const diskMatch = line.match(
            /(\S+)\s+\S+\s+\S+\s+\S+\s+(\d+)%\s+(\S+)/,
          );
          if (diskMatch && diskMatch[3] !== "Mounted") {
            const usage = parseInt(diskMatch[2]);
            metrics.push({
              name: `Disk ${diskMatch[3]}`,
              value: usage,
              timestamp: Date.now(),
              unit: "%",
              status: usage < 80 ? "good" : usage < 95 ? "warning" : "critical",
            });
          }
        }
      }
  
      return metrics;
    }
  
    // Generate network topology from various network commands
    static generateNetworkTopology(
      pingOutput: string,
      routeOutput: string,
      interfaceOutput: string,
    ): NetworkTopology {
      const topology: NetworkTopology = {
        nodes: [],
        edges: [],
      };
  
      // Add local machine
      topology.nodes.push({
        id: "localhost",
        label: "Local Machine",
        type: "device",
        status: "online",
      });
  
      // Parse interface data for local IPs
      const interfaces = this.parseIpAddrOutput(interfaceOutput);
      Object.values(interfaces.interfaces || {}).forEach((iface: any) => {
        if (iface.ipv4.length > 0) {
          topology.nodes.push({
            id: `interface-${iface.name}`,
            label: `${iface.name} (${iface.ipv4[0]?.address})`,
            type: "device",
            status: iface.status === "up" ? "online" : "offline",
            ip: iface.ipv4[0]?.address,
          });
  
          topology.edges.push({
            from: "localhost",
            to: `interface-${iface.name}`,
            label: iface.name,
          });
        }
      });
  
      // Parse route output for gateway
      const gatewayMatch = routeOutput.match(/default\s+via\s+([\d.]+)/);
      if (gatewayMatch) {
        topology.nodes.push({
          id: "gateway",
          label: `Gateway (${gatewayMatch[1]})`,
          type: "router",
          status: "online",
          ip: gatewayMatch[1],
        });
  
        topology.edges.push({
          from: "localhost",
          to: "gateway",
          label: "default route",
        });
      }
  
      // Add internet node if ping was successful
      if (pingOutput.includes("64 bytes from")) {
        topology.nodes.push({
          id: "internet",
          label: "Internet",
          type: "internet",
          status: "online",
        });
  
        topology.edges.push({
          from: "gateway",
          to: "internet",
          label: "WAN",
        });
      }
  
      return topology;
    }
  
    // Parse data based on metadata type
    static parseByDataType(
      dataType: string,
      commandResults: Array<{ command: string; output: string; stderr?: string }>,
    ): {
      metrics: ChartDataPoint[];
      topology?: NetworkTopology;
      rawData: ParsedMetrics;
    } {
      const metrics: ChartDataPoint[] = [];
      let topology: NetworkTopology | undefined;
      const rawData: ParsedMetrics = {};
  
      commandResults.forEach(({ command, output }) => {
        if (command.includes("ping")) {
          const pingMetrics = this.parsePingOutput(output);
          metrics.push(...pingMetrics);
          rawData.ping = pingMetrics;
        }
  
        if (command.includes("ip addr") || command.includes("ifconfig")) {
          const interfaceData = this.parseIpAddrOutput(output);
          rawData.interfaces = interfaceData;
        }
  
        if (command.includes("systemctl status")) {
          const serviceData = this.parseSystemctlOutput(output);
          rawData.services = serviceData;
        }
  
        if (command.includes("netstat") || command.includes("ss")) {
          const connectionMetrics = this.parseNetstatOutput(output);
          metrics.push(...connectionMetrics);
          rawData.connections = connectionMetrics;
        }
  
        if (command.includes("free") || command.includes("df")) {
          const perfMetrics = this.parsePerformanceOutput(output, command);
          metrics.push(...perfMetrics);
        }
      });
  
      // Generate topology for network diagnostics
      if (dataType === "network_diagnostics") {
        const pingResult = commandResults.find((r) => r.command.includes("ping"));
        const routeResult = commandResults.find(
          (r) => r.command.includes("route") || r.command.includes("netstat -rn"),
        );
        const interfaceResult = commandResults.find(
          (r) => r.command.includes("ip addr") || r.command.includes("ifconfig"),
        );
  
        if (pingResult && routeResult && interfaceResult) {
          topology = this.generateNetworkTopology(
            pingResult.output,
            routeResult.output,
            interfaceResult.output,
          );
        }
      }
  
      return { metrics, topology, rawData };
    }
  
    // Helper function to parse memory values
    private static parseMemoryValue(value: string): number {
      const match = value.match(/(\d+\.?\d*)(\w?)/);
      if (!match) return 0;
  
      const num = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
  
      switch (unit) {
        case "k":
          return num * 1024;
        case "m":
          return num * 1024 * 1024;
        case "g":
          return num * 1024 * 1024 * 1024;
        default:
          return num;
      }
    }
  }
  