import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
} from "recharts";
import {
  Activity,
  Cpu,
  HardDrive,
  Network,
  Users,
  Globe,
  TrendingUp,
  TrendingDown,
  Minus,
  Server,
  MemoryStick,
  Wifi,
} from "lucide-react";
import {
  realSystemMetrics,
  RealSystemMetrics,
} from "@/services/RealSystemMetrics";

interface Metric {
  id: string;
  name: string;
  value: number;
  unit: string;
  change: number;
  status: "good" | "warning" | "critical";
  icon: React.ComponentType<{ className?: string }>;
}

interface TimeSeriesData {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  processes: number;
}

interface ProcessDistribution {
  name: string;
  value: number;
  color: string;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const getMetricIcon = (change: number) => {
  if (change > 0) return TrendingUp;
  if (change < 0) return TrendingDown;
  return Minus;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "good":
      return "text-green-400";
    case "warning":
      return "text-yellow-400";
    case "critical":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
};

export const MetricsDashboard: React.FC = () => {
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState("Live");
  const [systemMetrics, setSystemMetrics] = useState<RealSystemMetrics | null>(
    null,
  );
  const [previousMetrics, setPreviousMetrics] =
    useState<RealSystemMetrics | null>(null);

  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [processDistribution, setProcessDistribution] = useState<
    ProcessDistribution[]
  >([]);

  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getStatusFromValue = (
    value: number,
    type: string,
  ): "good" | "warning" | "critical" => {
    if (type === "cpu" || type === "memory" || type === "disk") {
      if (value > 90) return "critical";
      if (value > 70) return "warning";
      return "good";
    }
    return "good";
  };

  const updateMetricsFromSystem = (realMetrics: RealSystemMetrics) => {
    const cpuChange = previousMetrics
      ? calculateChange(realMetrics.cpu.usage, previousMetrics.cpu.usage)
      : 0;
    const memoryChange = previousMetrics
      ? calculateChange(
          realMetrics.memory.percentage,
          previousMetrics.memory.percentage,
        )
      : 0;
    const diskChange = previousMetrics
      ? calculateChange(
          realMetrics.disk.percentage,
          previousMetrics.disk.percentage,
        )
      : 0;

    const newMetrics: Metric[] = [
      {
        id: "cpu",
        name: "CPU Usage",
        value: realMetrics.cpu.usage,
        unit: "%",
        change: cpuChange,
        status: getStatusFromValue(realMetrics.cpu.usage, "cpu"),
        icon: Cpu,
      },
      {
        id: "memory",
        name: "Memory Usage",
        value: realMetrics.memory.percentage,
        unit: "%",
        change: memoryChange,
        status: getStatusFromValue(realMetrics.memory.percentage, "memory"),
        icon: MemoryStick,
      },
      {
        id: "disk",
        name: "Disk Usage",
        value: realMetrics.disk.percentage,
        unit: "%",
        change: diskChange,
        status: getStatusFromValue(realMetrics.disk.percentage, "disk"),
        icon: HardDrive,
      },
      {
        id: "cores",
        name: "CPU Cores",
        value: realMetrics.cpu.cores,
        unit: "cores",
        change: 0,
        status: "good",
        icon: Server,
      },
      {
        id: "processes",
        name: "Active Processes",
        value: realMetrics.processes.length,
        unit: "procs",
        change: previousMetrics
          ? realMetrics.processes.length - previousMetrics.processes.length
          : 0,
        status: "good",
        icon: Activity,
      },
      {
        id: "uptime",
        name: "System Uptime",
        value: realMetrics.system.uptime,
        unit: "sec",
        change: 0,
        status: "good",
        icon: Globe,
      },
    ];

    setMetrics(newMetrics);

    // Update process distribution
    const topProcesses = realMetrics.processes
      .sort((a, b) => b.cpuUsage - a.cpuUsage)
      .slice(0, 5);

    const colors = ["#ef4444", "#f59e0b", "#eab308", "#3b82f6", "#8b5cf6"];
    const newProcessDistribution = topProcesses.map((process, index) => ({
      name: process.name.split("/").pop() || process.name,
      value: process.cpuUsage,
      color: colors[index % colors.length],
    }));

    setProcessDistribution(newProcessDistribution);

    // Add new time series data point
    const newPoint: TimeSeriesData = {
      timestamp: new Date().toISOString().slice(11, 19),
      cpu: realMetrics.cpu.usage,
      memory: realMetrics.memory.percentage,
      disk: realMetrics.disk.percentage,
      processes: realMetrics.processes.length,
    };

    setTimeSeriesData((prev) => {
      const newData = [...prev, newPoint];
      // Keep only last 30 data points
      return newData.slice(-30);
    });

    // Store previous metrics for change calculation
    setPreviousMetrics(systemMetrics);
  };

  useEffect(() => {
    const unsubscribe = realSystemMetrics.subscribe((realMetrics) => {
      setSystemMetrics(realMetrics);
      updateMetricsFromSystem(realMetrics);
    });

    return () => {
      unsubscribe();
    };
  }, [systemMetrics, previousMetrics]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{`Time: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-sm"
              style={{ color: entry.color }}
            >{`${entry.dataKey}: ${entry.value}${entry.dataKey === "cpu" || entry.dataKey === "memory" ? "%" : entry.dataKey === "latency" ? "ms" : ""}`}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const TrendIcon = getMetricIcon(metric.change);
          return (
            <Card
              key={metric.id}
              className="p-4 bg-background/50 backdrop-blur border-border/50"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    {metric.name}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={`${getStatusColor(metric.status)} border-current`}
                >
                  {metric.status}
                </Badge>
              </div>
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">
                    {metric.id === "uptime"
                      ? formatUptime(metric.value)
                      : typeof metric.value === "number"
                        ? metric.value.toFixed(
                            metric.unit === "%" ||
                              metric.unit === "cores" ||
                              metric.unit === "procs"
                              ? 0
                              : 1,
                          )
                        : metric.value}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {metric.id === "uptime" ? "" : metric.unit}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-1 text-sm ${
                    metric.change > 0
                      ? "text-red-400"
                      : metric.change < 0
                        ? "text-green-400"
                        : "text-gray-400"
                  }`}
                >
                  <TrendIcon className="h-3 w-3" />
                  <span>{Math.abs(metric.change).toFixed(1)}%</span>
                </div>
              </div>
              {(metric.unit === "%" ||
                metric.id === "cpu" ||
                metric.id === "memory") && (
                <Progress value={metric.value} className="mt-2" />
              )}
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Performance Chart */}
        <Card className="p-6 bg-background/50 backdrop-blur border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              Real-Time System Performance
            </h3>
            <div className="flex gap-2">
              <Badge
                variant="outline"
                className="text-green-400 border-green-400"
              >
                Live Data
              </Badge>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="timestamp"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="cpu"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="CPU %"
                />
                <Line
                  type="monotone"
                  dataKey="memory"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="Memory %"
                />
                <Line
                  type="monotone"
                  dataKey="disk"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  name="Disk %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Process CPU Distribution */}
        <Card className="p-6 bg-background/50 backdrop-blur border-border/50">
          <h3 className="text-lg font-semibold mb-4">Top CPU Processes</h3>
          <div className="h-64">
            {processDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={processDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name} ${value.toFixed(1)}%`}
                    labelLine={false}
                  >
                    {processDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-card/95 backdrop-blur border border-border rounded-lg p-3 shadow-lg">
                            <p className="text-sm font-medium">{data.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {data.value.toFixed(2)}% CPU usage
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading process data...</p>
              </div>
            )}
          </div>
        </Card>

        {/* System Information */}
        <Card className="p-6 bg-background/50 backdrop-blur border-border/50">
          <h3 className="text-lg font-semibold mb-4">System Information</h3>
          <div className="space-y-4">
            {systemMetrics && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Platform
                  </span>
                  <span className="font-medium capitalize">
                    {systemMetrics.system.platform}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Hostname
                  </span>
                  <span className="font-medium">
                    {systemMetrics.system.hostname}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    CPU Model
                  </span>
                  <span className="font-medium text-right max-w-xs truncate">
                    {systemMetrics.cpu.model || "Unknown"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Total Memory
                  </span>
                  <span className="font-medium">
                    {formatBytes(systemMetrics.memory.total)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Available Memory
                  </span>
                  <span className="font-medium">
                    {formatBytes(systemMetrics.memory.available)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Total Disk
                  </span>
                  <span className="font-medium">
                    {formatBytes(systemMetrics.disk.total)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Available Disk
                  </span>
                  <span className="font-medium">
                    {formatBytes(systemMetrics.disk.available)}
                  </span>
                </div>
                {systemMetrics.system.loadAverage.length > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Load Average
                    </span>
                    <span className="font-medium">
                      {systemMetrics.system.loadAverage
                        .map((load) => load.toFixed(2))
                        .join(", ")}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {/* Process Activity */}
        <Card className="p-6 bg-background/50 backdrop-blur border-border/50">
          <h3 className="text-lg font-semibold mb-4">Process Activity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="timestamp"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="processes"
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
    </div>
  );
};
