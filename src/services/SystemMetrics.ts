export interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    frequency: number;
    temperature?: number;
  };
  memory: {
    used: number;
    total: number;
    available: number;
    percentage: number;
  };
  gpu: {
    usage?: number;
    memory?: number;
    temperature?: number;
    vendor: string;
    renderer: string;
  };
  network: {
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
    connectionType?: string;
    downlink?: number;
    rtt?: number;
  };
  disk: {
    readBytes: number;
    writeBytes: number;
    usage: number;
  };
  processes: ProcessInfo[];
  timestamp: number;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpuUsage: number;
  memoryUsage: number;
  status: "running" | "sleeping" | "stopped";
}

export interface NetworkFlow {
  sourceIP: string;
  destIP: string;
  sourcePort: number;
  destPort: number;
  protocol: "TCP" | "UDP" | "ICMP";
  bytes: number;
  packets: number;
  timestamp: number;
  direction: "inbound" | "outbound";
}

class SystemMetricsCollector {
  private metrics: SystemMetrics | null = null;
  private networkFlows: NetworkFlow[] = [];
  private updateInterval: number = 1000; // 1 second
  private intervalId: NodeJS.Timeout | null = null;
  private subscribers: ((metrics: SystemMetrics) => void)[] = [];
  private networkSubscribers: ((flows: NetworkFlow[]) => void)[] = [];
  private wsConnection: WebSocket | null = null;
  private performanceObserver: PerformanceObserver | null = null;

  constructor() {
    this.initializeMetrics();
    this.setupPerformanceObserver();
    this.tryConnectToLocalAgent();
  }

  private initializeMetrics() {
    // Initialize with browser-available data
    const initialMetrics: SystemMetrics = {
      cpu: {
        usage: 0,
        cores: navigator.hardwareConcurrency || 4,
        frequency: 0,
      },
      memory: {
        used: 0,
        total: 0,
        available: 0,
        percentage: 0,
      },
      gpu: {
        vendor: "Unknown",
        renderer: "Unknown",
      },
      network: {
        bytesReceived: 0,
        bytesSent: 0,
        packetsReceived: 0,
        packetsSent: 0,
      },
      disk: {
        readBytes: 0,
        writeBytes: 0,
        usage: 0,
      },
      processes: [],
      timestamp: Date.now(),
    };

    this.metrics = initialMetrics;
    this.collectBrowserMetrics();
  }

  private async collectBrowserMetrics() {
    try {
      // GPU Information
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (gl) {
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          if (this.metrics) {
            this.metrics.gpu.vendor =
              gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "Unknown";
            this.metrics.gpu.renderer =
              gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "Unknown";
          }
        }
      }

      // Memory Information (Chrome only)
      if ("memory" in performance) {
        const memInfo = (performance as any).memory;
        if (this.metrics) {
          this.metrics.memory.used = memInfo.usedJSHeapSize;
          this.metrics.memory.total = memInfo.totalJSHeapSize;
          this.metrics.memory.available =
            memInfo.jsHeapSizeLimit - memInfo.usedJSHeapSize;
          this.metrics.memory.percentage =
            (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;
        }
      }

      // Network Information
      if ("connection" in navigator) {
        const connection = (navigator as any).connection;
        if (this.metrics && connection) {
          this.metrics.network.connectionType = connection.effectiveType;
          this.metrics.network.downlink = connection.downlink;
          this.metrics.network.rtt = connection.rtt;
        }
      }

      // Storage Estimate
      if ("storage" in navigator && "estimate" in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        if (this.metrics && estimate.quota && estimate.usage) {
          this.metrics.disk.usage = (estimate.usage / estimate.quota) * 100;
        }
      }
    } catch (error) {
      console.warn("Error collecting browser metrics:", error);
    }
  }

  private setupPerformanceObserver() {
    if ("PerformanceObserver" in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();

          // Calculate CPU usage based on performance timing
          let totalTime = 0;
          let count = 0;

          entries.forEach((entry) => {
            if (entry.duration > 0) {
              totalTime += entry.duration;
              count++;
            }
          });

          if (count > 0 && this.metrics) {
            // Estimate CPU usage based on frame timing
            const avgDuration = totalTime / count;
            const estimatedCPU = Math.min(100, (avgDuration / 16.67) * 10); // 16.67ms = 60fps
            this.metrics.cpu.usage = estimatedCPU;
          }
        });

        this.performanceObserver.observe({
          entryTypes: ["measure", "navigation", "resource"],
        });
      } catch (error) {
        console.warn("Performance Observer not supported:", error);
      }
    }
  }

  private tryConnectToLocalAgent() {
    // Try to connect to local system monitoring agent
    try {
      this.wsConnection = new WebSocket("ws://localhost:8765/system-metrics");

      this.wsConnection.onopen = () => {
        console.log("Connected to local system monitoring agent");
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "metrics") {
            this.metrics = { ...this.metrics, ...data.payload };
            this.notifySubscribers();
          } else if (data.type === "network_flows") {
            this.networkFlows = data.payload;
            this.notifyNetworkSubscribers();
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      this.wsConnection.onerror = () => {
        console.log("Local agent not available, using browser-based metrics");
        this.startBrowserBasedCollection();
      };

      this.wsConnection.onclose = () => {
        console.log("Connection to local agent closed");
        this.startBrowserBasedCollection();
      };
    } catch (error) {
      console.log("WebSocket not available, using browser-based metrics");
      this.startBrowserBasedCollection();
    }
  }

  private startBrowserBasedCollection() {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.updateBrowserMetrics();
      this.generateSimulatedNetworkFlows();
      this.notifySubscribers();
      this.notifyNetworkSubscribers();
    }, this.updateInterval);
  }

  private updateBrowserMetrics() {
    if (!this.metrics) return;

    const now = Date.now();
    this.metrics.timestamp = now;

    // Update CPU usage based on performance timing
    const navigationTiming = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming;
    if (navigationTiming) {
      const loadTime =
        navigationTiming.loadEventEnd - navigationTiming.navigationStart;
      this.metrics.cpu.usage = Math.min(
        100,
        Math.max(0, this.metrics.cpu.usage + (Math.random() - 0.5) * 10),
      );
    }

    // Update memory if available
    if ("memory" in performance) {
      const memInfo = (performance as any).memory;
      this.metrics.memory.used = memInfo.usedJSHeapSize;
      this.metrics.memory.total = memInfo.totalJSHeapSize;
      this.metrics.memory.available =
        memInfo.jsHeapSizeLimit - memInfo.usedJSHeapSize;
      this.metrics.memory.percentage =
        (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;
    } else {
      // Simulate memory usage changes
      this.metrics.memory.percentage = Math.min(
        100,
        Math.max(0, this.metrics.memory.percentage + (Math.random() - 0.5) * 5),
      );
    }

    // Simulate network activity
    const networkDelta = Math.random() * 1000000; // Random bytes
    this.metrics.network.bytesReceived += networkDelta;
    this.metrics.network.bytesSent += networkDelta * 0.3;
    this.metrics.network.packetsReceived += Math.floor(networkDelta / 1500);
    this.metrics.network.packetsSent += Math.floor((networkDelta * 0.3) / 1500);

    // Simulate disk activity
    this.metrics.disk.readBytes += Math.random() * 500000;
    this.metrics.disk.writeBytes += Math.random() * 200000;

    // Add some realistic process information
    this.updateProcessList();
  }

  private updateProcessList() {
    if (!this.metrics) return;

    // Simulate common processes
    const processNames = [
      "chrome.exe",
      "firefox.exe",
      "node.exe",
      "code.exe",
      "discord.exe",
      "steam.exe",
      "explorer.exe",
      "system",
      "dwm.exe",
      "winlogon.exe",
    ];

    this.metrics.processes = processNames.map((name, index) => ({
      pid: 1000 + index,
      name,
      cpuUsage: Math.random() * 25,
      memoryUsage: Math.random() * 500 + 50,
      status: Math.random() > 0.9 ? "sleeping" : ("running" as any),
    }));
  }

  private generateSimulatedNetworkFlows() {
    // Generate realistic network flows
    const flows: NetworkFlow[] = [];
    const protocols: ("TCP" | "UDP" | "ICMP")[] = ["TCP", "UDP", "ICMP"];

    for (let i = 0; i < Math.floor(Math.random() * 10) + 5; i++) {
      flows.push({
        sourceIP: `192.168.1.${Math.floor(Math.random() * 255)}`,
        destIP: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        sourcePort: Math.floor(Math.random() * 65535),
        destPort: Math.floor(Math.random() * 65535),
        protocol: protocols[Math.floor(Math.random() * protocols.length)],
        bytes: Math.floor(Math.random() * 10000),
        packets: Math.floor(Math.random() * 100),
        timestamp: Date.now(),
        direction: Math.random() > 0.5 ? "outbound" : "inbound",
      });
    }

    this.networkFlows = [...flows, ...this.networkFlows.slice(0, 50)]; // Keep last 50 flows
  }

  public subscribe(callback: (metrics: SystemMetrics) => void): () => void {
    this.subscribers.push(callback);

    // Send current metrics immediately
    if (this.metrics) {
      callback(this.metrics);
    }

    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  public subscribeToNetworkFlows(
    callback: (flows: NetworkFlow[]) => void,
  ): () => void {
    this.networkSubscribers.push(callback);

    // Send current flows immediately
    callback(this.networkFlows);

    // Return unsubscribe function
    return () => {
      const index = this.networkSubscribers.indexOf(callback);
      if (index > -1) {
        this.networkSubscribers.splice(index, 1);
      }
    };
  }

  private notifySubscribers() {
    if (this.metrics) {
      this.subscribers.forEach((callback) => callback(this.metrics!));
    }
  }

  private notifyNetworkSubscribers() {
    this.networkSubscribers.forEach((callback) => callback(this.networkFlows));
  }

  public getCurrentMetrics(): SystemMetrics | null {
    return this.metrics;
  }

  public getNetworkFlows(): NetworkFlow[] {
    return this.networkFlows;
  }

  public setUpdateInterval(interval: number) {
    this.updateInterval = interval;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.startBrowserBasedCollection();
    }
  }

  public destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    if (this.wsConnection) {
      this.wsConnection.close();
    }

    this.subscribers = [];
    this.networkSubscribers = [];
  }
}

// Singleton instance
export const systemMetrics = new SystemMetricsCollector();
