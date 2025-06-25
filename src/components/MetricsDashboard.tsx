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
  Memory,
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
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>(
    generateTimeSeriesData(),
  );
  const [selectedTimeRange, setSelectedTimeRange] = useState("24h");

  const [metrics, setMetrics] = useState<Metric[]>([
    {
      id: "cpu",
      name: "CPU Usage",
      value: 67,
      unit: "%",
      change: 2.3,
      status: "warning",
      icon: Cpu,
    },
    {
      id: "memory",
      name: "Memory Usage",
      value: 78,
      unit: "%",
      change: -1.2,
      status: "good",
      icon: HardDrive,
    },
    {
      id: "network",
      name: "Network Throughput",
      value: 142,
      unit: "Mbps",
      change: 5.7,
      status: "good",
      icon: Network,
    },
    {
      id: "latency",
      name: "Avg Latency",
      value: 23,
      unit: "ms",
      change: -0.8,
      status: "good",
      icon: Activity,
    },
    {
      id: "active_users",
      name: "Active Users",
      value: 1247,
      unit: "",
      change: 12,
      status: "good",
      icon: Users,
    },
    {
      id: "threats_blocked",
      name: "Threats Blocked",
      value: 89,
      unit: "/hour",
      change: 15,
      status: "critical",
      icon: Globe,
    },
  ]);

  const updateMetrics = () => {
    setMetrics((prev) =>
      prev.map((metric) => ({
        ...metric,
        value: Math.max(
          0,
          metric.value + (Math.random() - 0.5) * (metric.value * 0.1),
        ),
        change: (Math.random() - 0.5) * 10,
      })),
    );
  };

  const addNewDataPoint = () => {
    const newPoint: TimeSeriesData = {
      timestamp: new Date().toISOString().slice(11, 16),
      cpu: Math.floor(Math.random() * 40) + 30,
      memory: Math.floor(Math.random() * 30) + 50,
      network: Math.floor(Math.random() * 50) + 25,
      threats: Math.floor(Math.random() * 10),
      latency: Math.floor(Math.random() * 50) + 10,
    };

    setTimeSeriesData((prev) => [...prev.slice(1), newPoint]);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      updateMetrics();
      addNewDataPoint();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

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
                    {typeof metric.value === "number"
                      ? metric.value.toFixed(metric.unit === "%" ? 0 : 1)
                      : metric.value}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {metric.unit}
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
            <h3 className="text-lg font-semibold">System Performance</h3>
            <div className="flex gap-2">
              {["1h", "6h", "24h", "7d"].map((range) => (
                <button
                  key={range}
                  onClick={() => setSelectedTimeRange(range)}
                  className={`px-3 py-1 rounded text-xs ${
                    selectedTimeRange === range
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {range}
                </button>
              ))}
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
                <Line
                  type="monotone"
                  dataKey="network"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  name="Network"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Threat Distribution */}
        <Card className="p-6 bg-background/50 backdrop-blur border-border/50">
          <h3 className="text-lg font-semibold mb-4">Threat Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={threatDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {threatDistribution.map((entry, index) => (
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
                            {data.value} incidents
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Network Latency */}
        <Card className="p-6 bg-background/50 backdrop-blur border-border/50">
          <h3 className="text-lg font-semibold mb-4">Network Latency</h3>
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
                  dataKey="latency"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Threat Timeline */}
        <Card className="p-6 bg-background/50 backdrop-blur border-border/50">
          <h3 className="text-lg font-semibold mb-4">Threat Timeline</h3>
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
                  dataKey="threats"
                  stroke="#ef4444"
                  fill="#ef4444"
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
