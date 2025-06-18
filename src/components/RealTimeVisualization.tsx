import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ChartDataPoint,
  NetworkTopology,
  ParsedMetrics,
  RealTimeDataParser,
} from "@/utils/RealTimeDataParser";
import {
  Activity,
  Network,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Zap,
  Wifi,
  Server,
  Globe,
  AlertTriangle,
  CheckCircle,
  Clock,
  Expand,
  Minimize,
} from "lucide-react";

interface RealTimeVisualizationProps {
  metadata: {
    data_type: string;
    expected_output: string;
    key_metrics: string[];
  };
  commandResults: Array<{
    command: string;
    output: string;
    stderr?: string;
    returncode?: number;
  }>;
}

export const RealTimeVisualization: React.FC<RealTimeVisualizationProps> = ({
  metadata,
  commandResults,
}) => {
  const [parsedData, setParsedData] = useState<{
    metrics: ChartDataPoint[];
    topology?: NetworkTopology;
    rawData: ParsedMetrics;
  }>({ metrics: [], rawData: {} });

  const [selectedChart, setSelectedChart] = useState<
    "line" | "bar" | "pie" | "area"
  >("line");
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Parse command results when they change
  useEffect(() => {
    if (commandResults.length > 0) {
      const validResults = commandResults.filter(
        (r) => r.returncode === 0 && r.output,
      );
      const parsed = RealTimeDataParser.parseByDataType(
        metadata.data_type,
        validResults,
      );
      setParsedData(parsed);
    }
  }, [commandResults, metadata.data_type]);

  // Auto-refresh data every 5 seconds (if enabled)
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Re-parse existing data to simulate real-time updates
      if (commandResults.length > 0) {
        const validResults = commandResults.filter(
          (r) => r.returncode === 0 && r.output,
        );
        const parsed = RealTimeDataParser.parseByDataType(
          metadata.data_type,
          validResults,
        );
        setParsedData(parsed);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, commandResults, metadata.data_type]);

  const getDataTypeIcon = (dataType: string) => {
    switch (dataType) {
      case "network_diagnostics":
        return Network;
      case "system_info":
        return Server;
      case "performance_metrics":
        return Activity;
      default:
        return BarChart3;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "good":
        return "text-green-400 bg-green-400/10 border-green-400/20";
      case "warning":
        return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "critical":
        return "text-red-400 bg-red-400/10 border-red-400/20";
      default:
        return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    }
  };

  const chartColors = {
    primary: "#1f8fff",
    secondary: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    accent: "#8b5cf6",
  };

  const renderNetworkTopology = () => {
    if (!parsedData.topology) return null;

    const { nodes, edges } = parsedData.topology;

    return (
      <Card className="p-4 bg-background/50 backdrop-blur border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <Network className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm">Network Topology</h4>
        </div>

        <div className="relative h-64 bg-muted/20 rounded-lg overflow-hidden">
          <svg width="100%" height="100%" viewBox="0 0 400 200">
            {/* Render edges */}
            {edges.map((edge, index) => {
              const fromNode = nodes.find((n) => n.id === edge.from);
              const toNode = nodes.find((n) => n.id === edge.to);
              if (!fromNode || !toNode) return null;

              const fromX =
                (nodes.indexOf(fromNode) + 1) * (400 / (nodes.length + 1));
              const toX =
                (nodes.indexOf(toNode) + 1) * (400 / (nodes.length + 1));
              const fromY = 100;
              const toY = 100;

              return (
                <g key={index}>
                  <line
                    x1={fromX}
                    y1={fromY}
                    x2={toX}
                    y2={toY}
                    stroke="#4ade80"
                    strokeWidth="2"
                    className="opacity-60"
                  />
                  {edge.label && (
                    <text
                      x={(fromX + toX) / 2}
                      y={(fromY + toY) / 2 - 10}
                      fill="#9ca3af"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Render nodes */}
            {nodes.map((node, index) => {
              const x = (index + 1) * (400 / (nodes.length + 1));
              const y = 100;
              const NodeIcon =
                node.type === "router"
                  ? Wifi
                  : node.type === "internet"
                    ? Globe
                    : Server;

              return (
                <g key={node.id}>
                  <circle
                    cx={x}
                    cy={y}
                    r="20"
                    fill={node.status === "online" ? "#10b981" : "#ef4444"}
                    className="opacity-20"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r="15"
                    fill={node.status === "online" ? "#10b981" : "#ef4444"}
                  />
                  <text
                    x={x}
                    y={y + 35}
                    fill="#e5e7eb"
                    fontSize="10"
                    textAnchor="middle"
                  >
                    {node.label}
                  </text>
                  {node.ip && (
                    <text
                      x={x}
                      y={y + 47}
                      fill="#9ca3af"
                      fontSize="8"
                      textAnchor="middle"
                    >
                      {node.ip}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </Card>
    );
  };

  const renderChart = () => {
    if (parsedData.metrics.length === 0) return null;

    const chartData = parsedData.metrics.map((metric, index) => ({
      ...metric,
      id: index,
    }));

    const commonProps = {
      width: "100%",
      height: isExpanded ? 400 : 200,
      data: chartData,
    };

    switch (selectedChart) {
      case "line":
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="name"
                stroke="#9ca3af"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "6px",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={chartColors.primary}
                strokeWidth={2}
                dot={{ fill: chartColors.primary, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case "bar":
        return (
          <ResponsiveContainer {...commonProps}>
            <BarChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="name"
                stroke="#9ca3af"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "6px",
                }}
              />
              <Bar dataKey="value" fill={chartColors.primary} />
            </BarChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer {...commonProps}>
            <AreaChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="name"
                stroke="#9ca3af"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "6px",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={chartColors.primary}
                fill={chartColors.primary}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer {...commonProps}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, unit }) =>
                  `${name}: ${value}${unit || ""}`
                }
                outerRadius={isExpanded ? 120 : 80}
                fill={chartColors.primary}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      Object.values(chartColors)[
                        index % Object.values(chartColors).length
                      ]
                    }
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  const renderMetricCards = () => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {parsedData.metrics.slice(0, 4).map((metric, index) => (
          <Card
            key={index}
            className="p-3 bg-background/50 backdrop-blur border-border/50"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground truncate">
                  {metric.name}
                </p>
                <p className="text-lg font-bold">
                  {metric.value}
                  {metric.unit}
                </p>
              </div>
              <div
                className={`w-2 h-2 rounded-full ${
                  metric.status === "good"
                    ? "bg-green-400"
                    : metric.status === "warning"
                      ? "bg-yellow-400"
                      : metric.status === "critical"
                        ? "bg-red-400"
                        : "bg-blue-400"
                }`}
              />
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const DataTypeIcon = getDataTypeIcon(metadata.data_type);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4 bg-background/50 backdrop-blur border-border/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DataTypeIcon className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">
              Real-Time Data Visualization
            </h3>
            <Badge variant="outline" className="text-xs">
              {metadata.data_type.replace("_", " ")}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`h-7 px-2 text-xs ${autoRefresh ? "text-green-400" : "text-muted-foreground"}`}
            >
              <Clock className="h-3 w-3 mr-1" />
              {autoRefresh ? "Live" : "Paused"}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 w-7 p-0"
            >
              {isExpanded ? (
                <Minimize className="h-3 w-3" />
              ) : (
                <Expand className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          {metadata.expected_output}
        </p>

        <div className="flex flex-wrap gap-1">
          {metadata.key_metrics.map((metric, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {metric}
            </Badge>
          ))}
        </div>
      </Card>

      {/* Metric Cards */}
      {parsedData.metrics.length > 0 && renderMetricCards()}

      {/* Network Topology */}
      {metadata.data_type === "network_diagnostics" && renderNetworkTopology()}

      {/* Chart Controls */}
      {parsedData.metrics.length > 0 && (
        <Card className="p-4 bg-background/50 backdrop-blur border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-sm">Data Charts</h4>

            <div className="flex items-center gap-1">
              {[
                { type: "line" as const, icon: LineChartIcon },
                { type: "bar" as const, icon: BarChart3 },
                { type: "area" as const, icon: Activity },
                { type: "pie" as const, icon: PieChartIcon },
              ].map(({ type, icon: Icon }) => (
                <Button
                  key={type}
                  variant={selectedChart === type ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedChart(type)}
                  className="h-7 w-7 p-0"
                >
                  <Icon className="h-3 w-3" />
                </Button>
              ))}
            </div>
          </div>

          <div className="bg-muted/20 rounded-lg p-4">{renderChart()}</div>
        </Card>
      )}

      {/* Raw Data */}
      {Object.keys(parsedData.rawData).length > 0 && (
        <Card className="p-4 bg-background/50 backdrop-blur border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-sm">Parsed Data</h4>
          </div>

          <div className="bg-black/20 rounded p-3 max-h-40 overflow-y-auto">
            <pre className="text-xs text-green-300 font-mono">
              {JSON.stringify(parsedData.rawData, null, 2)}
            </pre>
          </div>
        </Card>
      )}
    </div>
  );
};
