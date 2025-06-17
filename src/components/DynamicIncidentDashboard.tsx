import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  ScatterChart,
  Scatter,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  IncidentContext,
  TelemetryData,
  CorrelationResult,
  TimelineEvent,
  Asset,
} from "@/types/nlp";
import {
  Clock,
  TrendingUp,
  AlertTriangle,
  Server,
  Network,
  Eye,
  Target,
  Activity,
  MapPin,
  Users,
  Shield,
  Zap,
  GitBranch,
  Search,
  Download,
  Share,
  RefreshCw,
} from "lucide-react";

interface DynamicIncidentDashboardProps {
  context: IncidentContext;
  onRefresh: () => void;
}

export const DynamicIncidentDashboard: React.FC<
  DynamicIncidentDashboardProps
> = ({ context, onRefresh }) => {
  const [selectedTimelineEvent, setSelectedTimelineEvent] =
    useState<TimelineEvent | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const handleExport = () => {
    const reportData = {
      incidentId: context.id,
      query: context.query.originalQuery,
      severity: context.severity,
      status: context.status,
      agentTasks: context.agentTasks.length,
      correlations: context.correlations.length,
      affectedAssets: context.affectedAssets.length,
      timeline: context.timeline.length,
      exportTime: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident-report-${context.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const shareData = {
      title: `Security Incident: ${context.id}`,
      text: `Incident analysis for: ${context.query.originalQuery}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback to copying URL to clipboard
        await navigator.clipboard.writeText(window.location.href);
        alert('Incident URL copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // Fallback to copying URL
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Incident URL copied to clipboard!');
      } catch (clipboardError) {
        console.error('Clipboard error:', clipboardError);
        alert('Unable to share or copy URL');
      }
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-400 bg-red-400/10 border-red-400/20";
      case "high":
        return "text-orange-400 bg-orange-400/10 border-orange-400/20";
      case "medium":
        return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "low":
        return "text-green-400 bg-green-400/10 border-green-400/20";
      default:
        return "text-gray-400 bg-gray-400/10 border-gray-400/20";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "investigating":
        return "text-blue-400 bg-blue-400/10";
      case "identified":
        return "text-yellow-400 bg-yellow-400/10";
      case "remediating":
        return "text-orange-400 bg-orange-400/10";
      case "resolved":
        return "text-green-400 bg-green-400/10";
      default:
        return "text-gray-400 bg-gray-400/10";
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  // Prepare timeline data for visualization
  const timelineChartData = context.timeline
    .slice()
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    .map((event, index) => ({
      timestamp: event.timestamp.getTime(),
      time: event.timestamp.toLocaleTimeString().slice(0, 5),
      value: index + 1,
      type: event.type,
      severity: event.severity || "low",
      description: event.description,
    }));

  // Prepare correlation strength data
  const correlationData = context.correlations.map((corr, index) => ({
    name: corr.pattern,
    strength: Math.round(corr.strength * 100),
    type: corr.type,
    events: corr.events.length,
  }));

  // Prepare asset impact data
  const assetImpactData = context.affectedAssets.reduce(
    (acc, asset) => {
      acc[asset.impact] = (acc[asset.impact] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const assetPieData = Object.entries(assetImpactData).map(
    ([impact, count]) => ({
      name: impact,
      value: count,
      color:
        {
          none: "#6b7280",
          low: "#22c55e",
          medium: "#f59e0b",
          high: "#ef4444",
        }[impact as keyof typeof assetImpactData] || "#6b7280",
    }),
  );

  // Event distribution over time
  const eventDistribution = context.agentTasks
    .filter((task) => task.result)
    .flatMap((task) => task.result!.data)
    .reduce(
      (acc, event) => {
        const hour = event.timestamp.getHours();
        const key = `${hour.toString().padStart(2, "0")}:00`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

  const eventDistributionData = Object.entries(eventDistribution).map(
    ([time, count]) => ({
      time,
      events: count,
    }),
  );

  const getCorrelationIcon = (type: string) => {
    switch (type) {
      case "temporal":
        return Clock;
      case "causal":
        return GitBranch;
      case "spatial":
        return MapPin;
      case "behavioral":
        return Activity;
      default:
        return Target;
    }
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "server":
        return Server;
      case "workstation":
        return Users;
      case "network_device":
        return Network;
      case "service":
        return Shield;
      default:
        return Server;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <Card className="p-4 lg:p-6 bg-background/50 backdrop-blur border-border/50 flex-shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Eye className="h-5 w-5 lg:h-6 lg:w-6 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <h2 className="text-lg lg:text-xl font-bold">Incident Analysis</h2>
                <p className="text-xs lg:text-sm text-muted-foreground truncate">
                  {context.query.originalQuery}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className={getSeverityColor(context.severity)}>
                {context.severity.toUpperCase()}
              </Badge>
              <Badge className={getStatusColor(context.status)}>
                {context.status.toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={handleExport} className="hidden sm:flex">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare} className="hidden sm:flex">
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <div className="text-center p-2 lg:p-0">
            <div className="text-xl lg:text-2xl font-bold text-primary">
              {context.agentTasks.length}
            </div>
            <div className="text-xs lg:text-sm text-muted-foreground">Agents Deployed</div>
          </div>
          <div className="text-center p-2 lg:p-0">
            <div className="text-xl lg:text-2xl font-bold text-orange-400">
              {context.correlations.length}
            </div>
            <div className="text-xs lg:text-sm text-muted-foreground">Correlations</div>
          </div>
          <div className="text-center p-2 lg:p-0">
            <div className="text-xl lg:text-2xl font-bold text-red-400">
              {context.affectedAssets.length}
            </div>
            <div className="text-xs lg:text-sm text-muted-foreground">Affected Assets</div>
          </div>
          <div className="text-center p-2 lg:p-0">
            <div className="text-xl lg:text-2xl font-bold text-green-400">
              {context.timeline.length}
            </div>
            <div className="text-xs lg:text-sm text-muted-foreground">Timeline Events</div>
          </div>
        </div>
      </Card>

      {/* Tabs for different views */}
      <div className="flex-1 flex flex-col min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <TabsList className="grid w-full grid-cols-5 flex-shrink-0">
            <TabsTrigger value="overview" className="text-xs lg:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs lg:text-sm">Timeline</TabsTrigger>
            <TabsTrigger value="correlations" className="text-xs lg:text-sm">Correlations</TabsTrigger>
            <TabsTrigger value="assets" className="text-xs lg:text-sm">Assets</TabsTrigger>
            <TabsTrigger value="telemetry" className="text-xs lg:text-sm">Telemetry</TabsTrigger>
          </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Event Timeline Chart */}
            <Card className="p-6 bg-background/50 backdrop-blur border-border/50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Investigation Timeline
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineChartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="time"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip
                      content={({ payload, label }) => {
                        if (payload && payload.length > 0) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-card/95 backdrop-blur border border-border rounded-lg p-3 shadow-lg">
                              <p className="text-sm font-medium">{label}</p>
                              <p className="text-sm text-muted-foreground">
                                {data.description}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Asset Impact Distribution */}
            <Card className="p-6 bg-background/50 backdrop-blur border-border/50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Server className="h-5 w-5" />
                Asset Impact Distribution
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetPieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {assetPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Event Distribution */}
            <Card className="p-6 bg-background/50 backdrop-blur border-border/50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Event Distribution by Hour
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={eventDistributionData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="time"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="events"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Correlation Strength */}
            <Card className="p-6 bg-background/50 backdrop-blur border-border/50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Correlation Strength
              </h3>
              <div className="space-y-3">
                {correlationData.map((corr, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{corr.name}</span>
                      <Badge variant="outline">{corr.strength}%</Badge>
                    </div>
                    <div className="w-full bg-muted/20 rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all duration-300"
                        style={{ width: `${corr.strength}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{corr.type}</span>
                      <span>{corr.events} events</span>
                    </div>
                  </div>
                ))}
                {correlationData.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No correlations detected</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <Card className="p-6 bg-background/50 backdrop-blur border-border/50">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Investigation Timeline
            </h3>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {context.timeline
                  .slice()
                  .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                  .map((event, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/20 transition-colors ${
                        selectedTimelineEvent === event
                          ? "bg-primary/10 border-primary/20"
                          : ""
                      }`}
                      onClick={() => setSelectedTimelineEvent(event)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              event.type === "alert"
                                ? "bg-red-400"
                                : event.type === "correlation"
                                  ? "bg-orange-400"
                                  : event.type === "action"
                                    ? "bg-blue-400"
                                    : "bg-green-400"
                            }`}
                          />
                          <Badge variant="outline" className="text-xs">
                            {event.type}
                          </Badge>
                          {event.severity && (
                            <Badge className={getSeverityColor(event.severity)}>
                              {event.severity}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(event.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm">{event.description}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>Source: {event.source}</span>
                        {event.data && (
                          <span>• Data: {JSON.stringify(event.data)}</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="correlations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {context.correlations.map((correlation, index) => {
              const CorrelationIcon = getCorrelationIcon(correlation.type);
              return (
                <Card
                  key={index}
                  className="p-6 bg-background/50 backdrop-blur border-border/50"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CorrelationIcon className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">{correlation.pattern}</h3>
                    </div>
                    <Badge
                      className={
                        correlation.strength > 0.8
                          ? "bg-red-500/10 text-red-400"
                          : correlation.strength > 0.5
                            ? "bg-orange-500/10 text-orange-400"
                            : "bg-blue-500/10 text-blue-400"
                      }
                    >
                      {Math.round(correlation.strength * 100)}%
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {correlation.description}
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Type:</span>
                      <span className="capitalize">{correlation.type}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Events:</span>
                      <span>{correlation.events.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Strength:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted/20 rounded-full h-2">
                          <div
                            className="bg-primary rounded-full h-2"
                            style={{
                              width: `${correlation.strength * 100}%`,
                            }}
                          />
                        </div>
                        <span>{Math.round(correlation.strength * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
            {context.correlations.length === 0 && (
              <Card className="p-6 bg-background/50 backdrop-blur border-border/50 col-span-full">
                <div className="text-center py-8 text-muted-foreground">
                  <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-semibold mb-2">No Correlations Found</h3>
                  <p>
                    The correlation engine hasn't detected any significant
                    patterns yet.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="assets" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {context.affectedAssets.map((asset) => {
              const AssetIcon = getAssetIcon(asset.type);
              return (
                <Card
                  key={asset.id}
                  className={`p-4 bg-background/50 backdrop-blur border-border/50 cursor-pointer hover:bg-muted/20 transition-colors ${
                    selectedAsset === asset
                      ? "border-primary/50 bg-primary/5"
                      : ""
                  }`}
                  onClick={() => setSelectedAsset(asset)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <AssetIcon className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">{asset.name}</h3>
                    </div>
                    <Badge
                      className={
                        asset.status === "healthy"
                          ? "text-green-400 bg-green-400/10"
                          : asset.status === "degraded"
                            ? "text-yellow-400 bg-yellow-400/10"
                            : "text-red-400 bg-red-400/10"
                      }
                    >
                      {asset.status}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="capitalize">{asset.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IP:</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {asset.ipAddress}
                      </code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Impact:</span>
                      <Badge
                        variant="outline"
                        className={
                          asset.impact === "high"
                            ? "text-red-400 border-red-400/50"
                            : asset.impact === "medium"
                              ? "text-yellow-400 border-yellow-400/50"
                              : asset.impact === "low"
                                ? "text-blue-400 border-blue-400/50"
                                : "text-gray-400 border-gray-400/50"
                        }
                      >
                        {asset.impact}
                      </Badge>
                    </div>
                  </div>
                </Card>
              );
            })}
            {context.affectedAssets.length === 0 && (
              <Card className="p-6 bg-background/50 backdrop-blur border-border/50 col-span-full">
                <div className="text-center py-8 text-muted-foreground">
                  <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-semibold mb-2">No Affected Assets</h3>
                  <p>
                    No assets have been identified as affected by this incident.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="telemetry" className="space-y-6">
          <div className="space-y-4">
            {context.agentTasks.map((task) => (
              <Card
                key={task.id}
                className="p-6 bg-background/50 backdrop-blur border-border/50"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">
                      {task.agentType.replace("_agent", "").toUpperCase()}
                    </h3>
                  </div>
                  <Badge
                    className={
                      task.status === "completed"
                        ? "text-green-400 bg-green-400/10"
                        : task.status === "running"
                          ? "text-blue-400 bg-blue-400/10"
                          : task.status === "failed"
                            ? "text-red-400 bg-red-400/10"
                            : "text-gray-400 bg-gray-400/10"
                    }
                  >
                    {task.status}
                  </Badge>
                </div>

                {task.result && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        Events Found:
                      </span>
                      <div className="text-lg font-bold">
                        {task.result.metadata.count}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Query Time:</span>
                      <div className="text-lg font-bold">
                        {Math.round(task.result.metadata.queryTime)}ms
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Correlations:
                      </span>
                      <div className="text-lg font-bold">
                        {task.result.correlations?.length || 0}
                      </div>
                    </div>
                  </div>
                )}

                {task.error && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Error</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {task.error}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};