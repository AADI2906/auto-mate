import { CommandExecutor } from "@/utils/CommandExecutor";

export interface RealSystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    frequency: number;
    temperature?: number;
    model?: string;
  };
  memory: {
    used: number;
    total: number;
    available: number;
    percentage: number;
    swap?: {
      used: number;
      total: number;
    };
  };
  disk: {
    total: number;
    used: number;
    available: number;
    percentage: number;
    readBytes: number;
    writeBytes: number;
  };
  network: {
    interfaces: NetworkInterface[];
    connections: NetworkConnection[];
    bytesReceived: number;
    bytesSent: number;
  };
  system: {
    uptime: number;
    loadAverage: number[];
    platform: string;
    hostname: string;
    kernel: string;
  };
  processes: RealProcessInfo[];
  timestamp: number;
}

export interface NetworkInterface {
  name: string;
  ip: string;
  mac?: string;
  status: "up" | "down";
  bytesReceived: number;
  bytesSent: number;
}

export interface NetworkConnection {
  protocol: string;
  localAddress: string;
  localPort: number;
  remoteAddress: string;
  remotePort: number;
  state: string;
  process?: string;
}

export interface RealProcessInfo {
  pid: number;
  name: string;
  cpuUsage: number;
  memoryUsage: number;
  memoryPercent: number;
  status: string;
  user?: string;
  command?: string;
}

class RealSystemMetricsCollector {
  private updateInterval: number = 2000; // 2 seconds
  private intervalId: NodeJS.Timeout | null = null;
  private subscribers: ((metrics: RealSystemMetrics) => void)[] = [];
  private currentMetrics: RealSystemMetrics | null = null;
  private platform: string = "unknown";

  constructor() {
    this.detectPlatform();
    this.startCollection();
  }

  private async detectPlatform() {
    try {
      const result = await CommandExecutor.executeCommand(
        "uname -s || echo Windows",
      );
      const output = result.output?.trim().toLowerCase() || "";

      if (output.includes("darwin")) {
        this.platform = "macos";
      } else if (output.includes("linux")) {
        this.platform = "linux";
      } else if (
        output.includes("windows") ||
        result.output?.includes("Windows")
      ) {
        this.platform = "windows";
      }
    } catch (error) {
      // Try Windows command
      try {
        await CommandExecutor.executeCommand("ver");
        this.platform = "windows";
      } catch {
        this.platform = "unknown";
      }
    }
  }

  private async getCPUInfo(): Promise<{
    usage: number;
    cores: number;
    frequency: number;
    model?: string;
  }> {
    try {
      let usage = 0;
      let cores = 1;
      let frequency = 0;
      let model = "";

      if (this.platform === "macos") {
        // CPU usage on macOS
        const topResult = await CommandExecutor.executeCommand(
          'top -l 1 -n 0 | grep "CPU usage"',
        );
        const cpuMatch = topResult.output?.match(/(\d+\.\d+)% user/);
        if (cpuMatch) {
          usage = parseFloat(cpuMatch[1]);
        }

        // CPU cores
        const coresResult =
          await CommandExecutor.executeCommand("sysctl -n hw.ncpu");
        cores = parseInt(coresResult.output?.trim() || "1") || 1;

        // CPU frequency (in Hz, convert to MHz)
        const freqResult = await CommandExecutor.executeCommand(
          "sysctl -n hw.cpufrequency_max",
        );
        frequency =
          Math.round(parseInt(freqResult.output?.trim() || "0") / 1000000) || 0;

        // CPU model
        const modelResult = await CommandExecutor.executeCommand(
          "sysctl -n machdep.cpu.brand_string",
        );
        model = modelResult.output?.trim() || "";
      } else if (this.platform === "linux") {
        // CPU usage on Linux
        const topResult = await CommandExecutor.executeCommand(
          'top -bn1 | grep "Cpu(s)"',
        );
        const cpuMatch = topResult.output?.match(/(\d+\.\d+)%us/);
        if (cpuMatch) {
          usage = parseFloat(cpuMatch[1]);
        }

        // CPU cores
        const coresResult = await CommandExecutor.executeCommand("nproc");
        cores = parseInt(coresResult.output?.trim() || "1") || 1;

        // CPU frequency
        const freqResult = await CommandExecutor.executeCommand(
          'cat /proc/cpuinfo | grep "cpu MHz" | head -1',
        );
        const freqMatch = freqResult.output?.match(/(\d+\.\d+)/);
        if (freqMatch) {
          frequency = Math.round(parseFloat(freqMatch[1]));
        }

        // CPU model
        const modelResult = await CommandExecutor.executeCommand(
          'cat /proc/cpuinfo | grep "model name" | head -1',
        );
        const modelMatch = modelResult.output?.match(/model name\s*:\s*(.+)/);
        if (modelMatch) {
          model = modelMatch[1].trim();
        }
      } else if (this.platform === "windows") {
        // CPU usage on Windows
        const cpuResult = await CommandExecutor.executeCommand(
          "wmic cpu get loadpercentage /value",
        );
        const cpuMatch = cpuResult.output?.match(/LoadPercentage=(\d+)/);
        if (cpuMatch) {
          usage = parseInt(cpuMatch[1]);
        }

        // CPU cores
        const coresResult = await CommandExecutor.executeCommand(
          "wmic cpu get NumberOfCores /value",
        );
        const coresMatch = coresResult.output?.match(/NumberOfCores=(\d+)/);
        if (coresMatch) {
          cores = parseInt(coresMatch[1]);
        }

        // CPU frequency
        const freqResult = await CommandExecutor.executeCommand(
          "wmic cpu get MaxClockSpeed /value",
        );
        const freqMatch = freqResult.output?.match(/MaxClockSpeed=(\d+)/);
        if (freqMatch) {
          frequency = parseInt(freqMatch[1]);
        }

        // CPU model
        const modelResult = await CommandExecutor.executeCommand(
          "wmic cpu get Name /value",
        );
        const modelMatch = modelResult.output?.match(/Name=(.+)/);
        if (modelMatch) {
          model = modelMatch[1].trim();
        }
      }

      return { usage, cores, frequency, model };
    } catch (error) {
      console.error("Error getting CPU info:", error);
      return { usage: 0, cores: 1, frequency: 0 };
    }
  }

  private async getMemoryInfo(): Promise<{
    used: number;
    total: number;
    available: number;
    percentage: number;
    swap?: { used: number; total: number };
  }> {
    try {
      let used = 0;
      let total = 0;
      let available = 0;
      let swap = undefined;

      if (this.platform === "macos") {
        // Memory info on macOS
        const vmResult = await CommandExecutor.executeCommand("vm_stat");
        const pageSize = 4096; // 4KB pages on macOS

        const pagesMatch = vmResult.output?.match(/Pages free:\s+(\d+)/);
        const wiredMatch = vmResult.output?.match(/Pages wired down:\s+(\d+)/);
        const activeMatch = vmResult.output?.match(/Pages active:\s+(\d+)/);
        const inactiveMatch = vmResult.output?.match(/Pages inactive:\s+(\d+)/);

        if (pagesMatch && wiredMatch && activeMatch && inactiveMatch) {
          const freePages = parseInt(pagesMatch[1]);
          const wiredPages = parseInt(wiredMatch[1]);
          const activePages = parseInt(activeMatch[1]);
          const inactivePages = parseInt(inactiveMatch[1]);

          total =
            (freePages + wiredPages + activePages + inactivePages) * pageSize;
          available = freePages * pageSize;
          used = total - available;
        }
      } else if (this.platform === "linux") {
        // Memory info on Linux
        const memResult =
          await CommandExecutor.executeCommand("cat /proc/meminfo");
        const totalMatch = memResult.output?.match(/MemTotal:\s+(\d+)\s+kB/);
        const availableMatch = memResult.output?.match(
          /MemAvailable:\s+(\d+)\s+kB/,
        );
        const swapTotalMatch = memResult.output?.match(
          /SwapTotal:\s+(\d+)\s+kB/,
        );
        const swapFreeMatch = memResult.output?.match(/SwapFree:\s+(\d+)\s+kB/);

        if (totalMatch) total = parseInt(totalMatch[1]) * 1024;
        if (availableMatch) available = parseInt(availableMatch[1]) * 1024;
        used = total - available;

        if (swapTotalMatch && swapFreeMatch) {
          const swapTotal = parseInt(swapTotalMatch[1]) * 1024;
          const swapFree = parseInt(swapFreeMatch[1]) * 1024;
          swap = { used: swapTotal - swapFree, total: swapTotal };
        }
      } else if (this.platform === "windows") {
        // Memory info on Windows
        const memResult = await CommandExecutor.executeCommand(
          "wmic OS get TotalVisibleMemorySize,FreePhysicalMemory /value",
        );
        const totalMatch = memResult.output?.match(
          /TotalVisibleMemorySize=(\d+)/,
        );
        const freeMatch = memResult.output?.match(/FreePhysicalMemory=(\d+)/);

        if (totalMatch) total = parseInt(totalMatch[1]) * 1024;
        if (freeMatch) available = parseInt(freeMatch[1]) * 1024;
        used = total - available;
      }

      const percentage = total > 0 ? (used / total) * 100 : 0;
      return { used, total, available, percentage, swap };
    } catch (error) {
      console.error("Error getting memory info:", error);
      return { used: 0, total: 0, available: 0, percentage: 0 };
    }
  }

  private async getDiskInfo(): Promise<{
    total: number;
    used: number;
    available: number;
    percentage: number;
    readBytes: number;
    writeBytes: number;
  }> {
    try {
      let total = 0;
      let used = 0;
      let available = 0;
      let readBytes = 0;
      let writeBytes = 0;

      if (this.platform === "macos" || this.platform === "linux") {
        // Disk usage
        const dfResult =
          await CommandExecutor.executeCommand("df -h / | tail -1");
        const dfMatch = dfResult.output?.match(
          /\s+(\d+(?:\.\d+)?[KMGT]?)\s+(\d+(?:\.\d+)?[KMGT]?)\s+(\d+(?:\.\d+)?[KMGT]?)\s+(\d+)%/,
        );

        if (dfMatch) {
          total = this.parseSize(dfMatch[1]);
          used = this.parseSize(dfMatch[2]);
          available = this.parseSize(dfMatch[3]);
        }

        // Disk I/O (Linux only)
        if (this.platform === "linux") {
          const ioResult = await CommandExecutor.executeCommand(
            "cat /proc/diskstats | head -1",
          );
          const ioMatch = ioResult.output?.match(
            /\s+(\d+)\s+\d+\s+(\d+)\s+\d+\s+\d+\s+(\d+)\s+(\d+)/,
          );
          if (ioMatch) {
            readBytes = parseInt(ioMatch[3]) * 512; // sectors to bytes
            writeBytes = parseInt(ioMatch[4]) * 512;
          }
        }
      } else if (this.platform === "windows") {
        // Disk usage on Windows
        const diskResult = await CommandExecutor.executeCommand(
          'wmic logicaldisk where caption="C:" get Size,FreeSpace /value',
        );
        const sizeMatch = diskResult.output?.match(/Size=(\d+)/);
        const freeMatch = diskResult.output?.match(/FreeSpace=(\d+)/);

        if (sizeMatch) total = parseInt(sizeMatch[1]);
        if (freeMatch) available = parseInt(freeMatch[1]);
        used = total - available;
      }

      const percentage = total > 0 ? (used / total) * 100 : 0;
      return { total, used, available, percentage, readBytes, writeBytes };
    } catch (error) {
      console.error("Error getting disk info:", error);
      return {
        total: 0,
        used: 0,
        available: 0,
        percentage: 0,
        readBytes: 0,
        writeBytes: 0,
      };
    }
  }

  private parseSize(sizeStr: string): number {
    const match = sizeStr.match(/(\d+(?:\.\d+)?)([KMGT]?)/);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2];

    switch (unit) {
      case "K":
        return value * 1024;
      case "M":
        return value * 1024 * 1024;
      case "G":
        return value * 1024 * 1024 * 1024;
      case "T":
        return value * 1024 * 1024 * 1024 * 1024;
      default:
        return value;
    }
  }

  private async getSystemInfo(): Promise<{
    uptime: number;
    loadAverage: number[];
    platform: string;
    hostname: string;
    kernel: string;
  }> {
    try {
      let uptime = 0;
      let loadAverage: number[] = [];
      let hostname = "";
      let kernel = "";

      if (this.platform === "macos" || this.platform === "linux") {
        // Uptime
        const uptimeResult = await CommandExecutor.executeCommand("uptime");
        const uptimeMatch = uptimeResult.output?.match(
          /up\s+(\d+)\s+days?,?\s*(\d+):(\d+)/,
        );
        if (uptimeMatch) {
          const days = parseInt(uptimeMatch[1]) || 0;
          const hours = parseInt(uptimeMatch[2]) || 0;
          const minutes = parseInt(uptimeMatch[3]) || 0;
          uptime = days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60;
        }

        // Load average
        const loadMatch = uptimeResult.output?.match(
          /load averages?:\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/,
        );
        if (loadMatch) {
          loadAverage = [
            parseFloat(loadMatch[1]),
            parseFloat(loadMatch[2]),
            parseFloat(loadMatch[3]),
          ];
        }

        // Hostname
        const hostnameResult = await CommandExecutor.executeCommand("hostname");
        hostname = hostnameResult.output?.trim() || "unknown";

        // Kernel
        const kernelResult = await CommandExecutor.executeCommand("uname -r");
        kernel = kernelResult.output?.trim() || "unknown";
      } else if (this.platform === "windows") {
        // Uptime on Windows
        const uptimeResult = await CommandExecutor.executeCommand(
          "wmic os get LastBootUpTime /value",
        );
        const bootMatch = uptimeResult.output?.match(/LastBootUpTime=(\d{14})/);
        if (bootMatch) {
          const bootTime = new Date(
            parseInt(bootMatch[1].substr(0, 4)),
            parseInt(bootMatch[1].substr(4, 2)) - 1,
            parseInt(bootMatch[1].substr(6, 2)),
            parseInt(bootMatch[1].substr(8, 2)),
            parseInt(bootMatch[1].substr(10, 2)),
            parseInt(bootMatch[1].substr(12, 2)),
          );
          uptime = Math.floor((Date.now() - bootTime.getTime()) / 1000);
        }

        // Hostname
        const hostnameResult = await CommandExecutor.executeCommand("hostname");
        hostname = hostnameResult.output?.trim() || "unknown";

        // Kernel version
        const kernelResult = await CommandExecutor.executeCommand("ver");
        kernel = kernelResult.output?.trim() || "unknown";
      }

      return {
        uptime,
        loadAverage,
        platform: this.platform,
        hostname,
        kernel,
      };
    } catch (error) {
      console.error("Error getting system info:", error);
      return {
        uptime: 0,
        loadAverage: [],
        platform: this.platform,
        hostname: "unknown",
        kernel: "unknown",
      };
    }
  }

  private async getProcessInfo(): Promise<RealProcessInfo[]> {
    try {
      const processes: RealProcessInfo[] = [];

      if (this.platform === "macos" || this.platform === "linux") {
        const psResult = await executeCommand("ps aux | head -20");
        const lines = psResult.output.split("\n").slice(1); // Skip header

        for (const line of lines) {
          if (!line.trim()) continue;

          const parts = line.trim().split(/\s+/);
          if (parts.length >= 11) {
            processes.push({
              pid: parseInt(parts[1]) || 0,
              name: parts[10] || "unknown",
              cpuUsage: parseFloat(parts[2]) || 0,
              memoryUsage: parseFloat(parts[5]) || 0, // RSS in KB
              memoryPercent: parseFloat(parts[3]) || 0,
              status: parts[7] || "unknown",
              user: parts[0] || "unknown",
              command: parts.slice(10).join(" "),
            });
          }
        }
      } else if (this.platform === "windows") {
        const taskResult = await executeCommand("tasklist /fo csv | head -20");
        const lines = taskResult.output.split("\n").slice(1); // Skip header

        for (const line of lines) {
          if (!line.trim()) continue;

          const parts = line.split(",").map((part) => part.replace(/"/g, ""));
          if (parts.length >= 5) {
            processes.push({
              pid: parseInt(parts[1]) || 0,
              name: parts[0] || "unknown",
              cpuUsage: 0, // Not available in tasklist
              memoryUsage: parseInt(parts[4]?.replace(/[^\d]/g, "")) || 0,
              memoryPercent: 0,
              status: parts[3] || "unknown",
            });
          }
        }
      }

      return processes.slice(0, 10); // Return top 10 processes
    } catch (error) {
      console.error("Error getting process info:", error);
      return [];
    }
  }

  private async getNetworkInfo(): Promise<{
    interfaces: NetworkInterface[];
    connections: NetworkConnection[];
    bytesReceived: number;
    bytesSent: number;
  }> {
    try {
      const interfaces: NetworkInterface[] = [];
      const connections: NetworkConnection[] = [];
      let bytesReceived = 0;
      let bytesSent = 0;

      if (this.platform === "macos" || this.platform === "linux") {
        // Network interfaces
        const ifconfigResult = await executeCommand("ifconfig");
        // Parse ifconfig output (simplified)

        // Network connections
        const netstatResult = await executeCommand("netstat -an | head -20");
        const netstatLines = netstatResult.output.split("\n");

        for (const line of netstatLines) {
          if (line.includes("LISTEN") || line.includes("ESTABLISHED")) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 4) {
              const localAddr = parts[3].split(":");
              const remoteAddr = parts[4].split(":");

              connections.push({
                protocol: parts[0] || "unknown",
                localAddress: localAddr[0] || "",
                localPort: parseInt(localAddr[1]) || 0,
                remoteAddress: remoteAddr[0] || "",
                remotePort: parseInt(remoteAddr[1]) || 0,
                state: parts[5] || "unknown",
              });
            }
          }
        }
      } else if (this.platform === "windows") {
        // Network connections on Windows
        const netstatResult = await executeCommand(
          "netstat -an | findstr LISTENING",
        );
        const netstatLines = netstatResult.output.split("\n");

        for (const line of netstatLines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 4) {
            const localAddr = parts[1].split(":");

            connections.push({
              protocol: parts[0] || "unknown",
              localAddress: localAddr[0] || "",
              localPort: parseInt(localAddr[localAddr.length - 1]) || 0,
              remoteAddress: "",
              remotePort: 0,
              state: parts[3] || "unknown",
            });
          }
        }
      }

      return {
        interfaces,
        connections: connections.slice(0, 10),
        bytesReceived,
        bytesSent,
      };
    } catch (error) {
      console.error("Error getting network info:", error);
      return {
        interfaces: [],
        connections: [],
        bytesReceived: 0,
        bytesSent: 0,
      };
    }
  }

  private async collectMetrics(): Promise<void> {
    try {
      const [cpu, memory, disk, system, processes, network] = await Promise.all(
        [
          this.getCPUInfo(),
          this.getMemoryInfo(),
          this.getDiskInfo(),
          this.getSystemInfo(),
          this.getProcessInfo(),
          this.getNetworkInfo(),
        ],
      );

      this.currentMetrics = {
        cpu,
        memory,
        disk,
        network,
        system,
        processes,
        timestamp: Date.now(),
      };

      // Notify all subscribers
      this.subscribers.forEach((callback) => callback(this.currentMetrics!));
    } catch (error) {
      console.error("Error collecting metrics:", error);
    }
  }

  private startCollection(): void {
    // Collect metrics immediately
    this.collectMetrics();

    // Then collect at regular intervals
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, this.updateInterval);
  }

  public subscribe(callback: (metrics: RealSystemMetrics) => void): () => void {
    this.subscribers.push(callback);

    // Send current metrics immediately if available
    if (this.currentMetrics) {
      callback(this.currentMetrics);
    }

    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  public getCurrentMetrics(): RealSystemMetrics | null {
    return this.currentMetrics;
  }

  public setUpdateInterval(interval: number): void {
    this.updateInterval = interval;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.startCollection();
    }
  }

  public destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.subscribers = [];
  }
}

// Singleton instance
export const realSystemMetrics = new RealSystemMetricsCollector();
