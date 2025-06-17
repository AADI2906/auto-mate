import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  systemMetrics,
  SystemMetrics,
  NetworkFlow,
  ProcessInfo,
} from "@/services/SystemMetrics";
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Activity,
  Monitor,
  Thermometer,
  Zap,
  Server,
  Wifi,
  Download,
  Upload,
  Eye,
  Settings,
  RefreshCw,
  Gauge,
  BarChart3,
} from "lucide-react";

interface MetricHistory {
  timestamp: number;
  cpu: number;
  memory: number;
  network: number;
  disk: number;
}

export const RealTimeSystemDashboard: React.FC = () => {
  const [currentMetrics, setCurrentMetrics] = useState<SystemMetrics | null>(
    null,
  );
  const [networkFlows, setNetworkFlows] = useState<NetworkFlow[]>([]);
  const [metricHistory, setMetricHistory] = useState<MetricHistory[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [isConnected, setIsConnected] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    // Subscribe to real-time metrics
    const unsubscribeMetrics = systemMetrics.subscribe((metrics) => {
      setCurrentMetrics(metrics);
      setIsConnected(true);

      // Add to history (keep last 60 data points = 1 minute at 1sec intervals)
      setMetricHistory((prev) => {
        const newHistory = [
          ...prev,
          {
            timestamp: metrics.timestamp,
            cpu: metrics.cpu.usage,
            memory: metrics.memory.percentage,
            network:
              (metrics.network.bytesReceived + metrics.network.bytesSent) /
              1000000, // MB
            disk: metrics.disk.usage,
          },
        ].slice(-60);
        return newHistory;
      });
    });

    // Subscribe to network flows
    const unsubscribeFlows = systemMetrics.subscribeToNetworkFlows((flows) => {
      setNetworkFlows(flows);
    });

    return () => {
      unsubscribeMetrics();
      unsubscribeFlows();
    };
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(Math.round(num));
  };

  const getStatusColor = (value: number, thresholds = [70, 90]) => {
    if (value >= thresholds[1]) return "text-red-400";
    if (value >= thresholds[0]) return "text-yellow-400";
    return "text-green-400";
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{`Time: ${new Date(label).toLocaleTimeString()}`}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-sm"
              style={{ color: entry.color }}
            >{`${entry.dataKey}: ${entry.value.toFixed(1)}${entry.dataKey === "network" ? " MB" : "%"}`}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!currentMetrics) {
    return (
      <Card className="p-8 bg-background/50 backdrop-blur border-border/50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Initializing System Monitor
          </h3>
          <p className="text-muted-foreground">
            Collecting real-time system metrics...
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-background/50 backdrop-blur border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Monitor className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold">Real-Time System Monitor</h2>
              <p className="text-sm text-muted-foreground">
                Live system metrics and network flows
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`}
              />
              <span className="text-xs text-muted-foreground">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw
                className={`h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`}
              />
              <span className="ml-2 hidden sm:inline">
                {autoRefresh ? "Auto" : "Manual"}
              </span>
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* System Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <Cpu className="h-5 w-5 text-blue-400" />
              <Badge variant="outline" className="text-xs">
                {currentMetrics.cpu.cores} cores
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">CPU Usage</span>
                <span
                  className={`text-sm font-bold ${getStatusColor(currentMetrics.cpu.usage)}`}
                >
                  {currentMetrics.cpu.usage.toFixed(1)}%
                </span>
              </div>
              <Progress value={currentMetrics.cpu.usage} className="h-2" />
            </div>
          </Card>

          <Card className="p-4 bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <Memory className="h-5 w-5 text-green-400" />
              <Badge variant="outline" className="text-xs">
                RAM
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Memory</span>
                <span
                  className={`text-sm font-bold ${getStatusColor(currentMetrics.memory.percentage)}`}
                >
                  {currentMetrics.memory.percentage.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={currentMetrics.memory.percentage}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">
                {formatBytes(currentMetrics.memory.used)} /{" "}
                {formatBytes(currentMetrics.memory.total)}
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <Network className="h-5 w-5 text-purple-400" />
              <Badge variant="outline" className="text-xs">
                {currentMetrics.network.connectionType || "Unknown"}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Network</span>
                <div className="flex items-center gap-1">
                  <Download className="h-3 w-3 text-green-400" />
                  <span className="text-xs">
                    {formatBytes(currentMetrics.network.bytesReceived)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Upload</span>
                <div className="flex items-center gap-1">
                  <Upload className="h-3 w-3 text-blue-400" />
                  <span className="text-xs">
                    {formatBytes(currentMetrics.network.bytesSent)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <HardDrive className="h-5 w-5 text-orange-400" />
              <Badge variant="outline" className="text-xs">
                Storage
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Disk Usage</span>
                <span
                  className={`text-sm font-bold ${getStatusColor(currentMetrics.disk.usage)}`}
                >
                  {currentMetrics.disk.usage.toFixed(1)}%
                </span>
              </div>
              <Progress value={currentMetrics.disk.usage} className="h-2" />
              <div className="text-xs text-muted-foreground">
                R: {formatBytes(currentMetrics.disk.readBytes)} | W:{" "}
                {formatBytes(currentMetrics.disk.writeBytes)}
              </div>
            </div>
          </Card>
        </div>
      </Card>

      {/* Detailed Metrics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="processes">Processes</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="gpu">Hardware</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Performance Chart */}
            <Card className="p-6 bg-background/50 backdrop-blur border-border/50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Performance (Real-time)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metricHistory}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="timestamp"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) =>
                        new Date(value).toLocaleTimeString().slice(0, 5)
                      }
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="cpu"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      name="CPU"
                    />
                    <Line
                      type="monotone"
                      dataKey="memory"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      name="Memory"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Network Activity */}
            <Card className="p-6 bg-background/50 backdrop-blur border-border/50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                Network Activity
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metricHistory}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="timestamp"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) =>
                        new Date(value).toLocaleTimeString().slice(0, 5)
                      }
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="network"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="processes" className="space-y-6">
          <Card className="p-6 bg-background/50 backdrop-blur border-border/50">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Server className="h-5 w-5" />
              Running Processes
            </h3>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {currentMetrics.processes
                  .sort((a, b) => b.cpuUsage - a.cpuUsage)
                  .map((process) => (
                    <div
                      key={process.pid}
                      className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            process.status === "running"
                              ? "bg-green-400"
                              : process.status === "sleeping"
                                ? "bg-yellow-400"
                                : "bg-red-400"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">
                              {process.name}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              PID: {process.pid}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Status: {process.status}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-right">
                          <div
                            className={`font-medium ${getStatusColor(process.cpuUsage, [50, 80])}`}
                          >
                            {process.cpuUsage.toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            CPU
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {formatBytes(process.memoryUsage * 1024 * 1024)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            RAM
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="network" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Network Flows */}
            <Card className="p-6 bg-background/50 backdrop-blur border-border/50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Network className="h-5 w-5" />
                Active Network Flows
              </h3>
              <ScrollArea className="h-80">
                <div className="space-y-2">
                  {networkFlows.slice(0, 20).map((flow, index) => (
                    <div
                      key={index}
                      className="p-3 bg-muted/20 rounded-lg text-sm"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            flow.direction === "outbound"
                              ? "text-blue-400 border-blue-400/50"
                              : "text-green-400 border-green-400/50"
                          }`}
                        >
                          {flow.protocol} {flow.direction}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(flow.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <code className="text-xs">
                            {flow.sourceIP}:{flow.sourcePort}
                          </code>
                          <span className="mx-2 text-muted-foreground">→</span>
                          <code className="text-xs">
                            {flow.destIP}:{flow.destPort}
                          </code>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatBytes(flow.bytes)} | {flow.packets} packets
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>

            {/* Network Statistics */}
            <Card className="p-6 bg-background/50 backdrop-blur border-border/50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Network Statistics
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-400">
                      {formatNumber(currentMetrics.network.packetsReceived)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Packets Received
                    </div>
                  </div>
                  <div className="text-center p-3 bg-muted/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-400">
                      {formatNumber(currentMetrics.network.packetsSent)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Packets Sent
                    </div>
                  </div>
                </div>

                {currentMetrics.network.rtt && (
                  <div className="text-center p-3 bg-muted/20 rounded-lg">
                    <div className="text-xl font-bold text-yellow-400">
                      {currentMetrics.network.rtt}ms
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Round Trip Time
                    </div>
                  </div>
                )}

                {currentMetrics.network.downlink && (
                  <div className="text-center p-3 bg-muted/20 rounded-lg">
                    <div className="text-xl font-bold text-purple-400">
                      {currentMetrics.network.downlink} Mbps
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Effective Bandwidth
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="gpu" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* GPU Information */}
            <Card className="p-6 bg-background/50 backdrop-blur border-border/50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Graphics Hardware
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">
                    Vendor:
                  </label>
                  <div className="font-medium">{currentMetrics.gpu.vendor}</div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Renderer:
                  </label>
                  <div className="font-medium text-sm break-all">
                    {currentMetrics.gpu.renderer}
                  </div>
                </div>
                {currentMetrics.gpu.usage && (
                  <div>
                    <label className="text-sm text-muted-foreground">
                      GPU Usage:
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress
                        value={currentMetrics.gpu.usage}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium">
                        {currentMetrics.gpu.usage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
                {currentMetrics.gpu.temperature && (
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-orange-400" />
                    <span className="text-sm">
                      Temperature: {currentMetrics.gpu.temperature}°C
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* System Information */}
            <Card className="p-6 bg-background/50 backdrop-blur border-border/50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                System Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">
                    CPU Cores:
                  </label>
                  <div className="font-medium">{currentMetrics.cpu.cores}</div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Platform:
                  </label>
                  <div className="font-medium">{navigator.platform}</div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    User Agent:
                  </label>
                  <div className="font-medium text-xs break-all">
                    {navigator.userAgent}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Language:
                  </label>
                  <div className="font-medium">{navigator.language}</div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Online:
                  </label>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${navigator.onLine ? "bg-green-400" : "bg-red-400"}`}
                    />
                    <span className="font-medium">
                      {navigator.onLine ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
