import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NetworkCanvas } from "@/components/NetworkCanvas";
import { AIInsights } from "@/components/AIInsights";
import { SecurityAlerts } from "@/components/SecurityAlerts";
import { MetricsDashboard } from "@/components/MetricsDashboard";
import { NaturalLanguageInterface } from "@/components/NaturalLanguageInterface";
import { IncidentContext } from "@/types/nlp";
import {
  Shield,
  Brain,
  Activity,
  Network,
  AlertTriangle,
  Bell,
  Settings,
  Search,
  Menu,
  Zap,
  Eye,
  TrendingUp,
  Globe,
  Users,
  Server,
  MessageSquare,
} from "lucide-react";

const Index = () => {
  const [activeView, setActiveView] = useState("chat");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeIncident, setActiveIncident] = useState<IncidentContext | null>(
    null,
  );

  const quickStats = [
    {
      title: "Network Health",
      value: "87%",
      change: "+2.3%",
      trend: "up",
      icon: Activity,
      color: "text-green-400",
    },
    {
      title: "Active Threats",
      value: "23",
      change: "+5",
      trend: "up",
      icon: AlertTriangle,
      color: "text-red-400",
    },
    {
      title: "AI Insights",
      value: "147",
      change: "+12",
      trend: "up",
      icon: Brain,
      color: "text-blue-400",
    },
    {
      title: "Connected Assets",
      value: "1,247",
      change: "+8",
      trend: "up",
      icon: Server,
      color: "text-purple-400",
    },
  ];

  const recentEvents = [
    {
      id: 1,
      type: "threat",
      message: "Malware detected on workstation WS-045",
      time: "2 min ago",
      severity: "high",
    },
    {
      id: 2,
      type: "performance",
      message: "Database server CPU spike detected",
      time: "5 min ago",
      severity: "medium",
    },
    {
      id: 3,
      type: "ai",
      message: "AI recommends firewall rule optimization",
      time: "8 min ago",
      severity: "low",
    },
    {
      id: 4,
      type: "network",
      message: "New device connected to VLAN 10",
      time: "12 min ago",
      severity: "info",
    },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-400 bg-red-400/10";
      case "medium":
        return "text-yellow-400 bg-yellow-400/10";
      case "low":
        return "text-blue-400 bg-blue-400/10";
      case "info":
        return "text-green-400 bg-green-400/10";
      default:
        return "text-gray-400 bg-gray-400/10";
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "threat":
        return Shield;
      case "performance":
        return TrendingUp;
      case "ai":
        return Brain;
      case "network":
        return Network;
      default:
        return Activity;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 lg:px-6 py-4">
          <div className="flex items-center gap-2 lg:gap-4 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="lg:hidden flex-shrink-0"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg lg:text-xl font-bold">NeuroSecure</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  AI-Powered Security Operations Platform
                </p>
                {activeIncident && (
                  <div className="flex flex-wrap items-center gap-1 lg:gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      Active: {activeIncident.id}
                    </Badge>
                    <Badge
                      className={`text-xs ${
                        activeIncident.severity === "critical"
                          ? "bg-red-500/10 text-red-400"
                          : activeIncident.severity === "high"
                            ? "bg-orange-500/10 text-orange-400"
                            : activeIncident.severity === "medium"
                              ? "bg-yellow-500/10 text-yellow-400"
                              : "bg-green-500/10 text-green-400"
                      }`}
                    >
                      {activeIncident.severity}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search networks, alerts, insights..."
                className="pl-10 pr-4 py-2 bg-background/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64 xl:w-80"
              />
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="relative flex-shrink-0"
            >
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center p-0">
                3
              </Badge>
            </Button>

            <Button variant="ghost" size="sm" className="flex-shrink-0">
              <Settings className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2 pl-2 lg:pl-4 border-l border-border">
              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="hidden md:block min-w-0">
                <p className="text-sm font-medium">Security Admin</p>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarCollapsed ? "w-16" : "w-64"
          } bg-background/50 backdrop-blur border-r border-border/50 transition-all duration-300 hidden lg:block flex-shrink-0`}
        >
          <nav className="p-3 lg:p-4 space-y-2">
            {[
              {
                id: "chat",
                label: "AI Assistant",
                icon: MessageSquare,
                badge: activeIncident ? "1" : null,
              },
              {
                id: "overview",
                label: "Overview",
                icon: Activity,
                badge: null,
              },
              {
                id: "network",
                label: "Network Topology",
                icon: Network,
                badge: null,
              },
              {
                id: "security",
                label: "Security Alerts",
                icon: Shield,
                badge: "23",
              },
              {
                id: "ai",
                label: "AI Insights",
                icon: Brain,
                badge: "12",
              },
              {
                id: "metrics",
                label: "Metrics",
                icon: TrendingUp,
                badge: null,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeView === item.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {!sidebarCollapsed && (
                    <>
                      <span className="font-medium">{item.label}</span>
                      {item.badge && (
                        <Badge className="ml-auto bg-red-500 text-white">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-hidden">
          {activeView === "chat" && (
            <div className="h-full">
              <NaturalLanguageInterface onContextChange={setActiveIncident} />
            </div>
          )}

          {activeView === "overview" && (
            <div className="p-6 space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickStats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <Card
                      key={index}
                      className="p-6 bg-background/50 backdrop-blur border-border/50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {stat.title}
                          </p>
                          <p className="text-2xl font-bold mt-1">
                            {stat.value}
                          </p>
                          <p
                            className={`text-sm mt-1 ${
                              stat.trend === "up"
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {stat.change} from last hour
                          </p>
                        </div>
                        <Icon className={`h-8 w-8 ${stat.color}`} />
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Main Dashboard Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">
                <div className="lg:col-span-2">
                  <NetworkCanvas />
                </div>
                <div>
                  <Card className="h-full bg-background/50 backdrop-blur border-border/50">
                    <div className="p-4 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-400" />
                        <h3 className="font-semibold">Recent Events</h3>
                        <Badge variant="outline" className="ml-auto">
                          Live
                        </Badge>
                      </div>
                    </div>
                    <ScrollArea className="h-80">
                      <div className="p-4 space-y-3">
                        {recentEvents.map((event) => {
                          const Icon = getEventIcon(event.type);
                          return (
                            <div
                              key={event.id}
                              className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
                            >
                              <Icon className="h-4 w-4 mt-0.5 text-primary" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium leading-tight">
                                  {event.message}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-muted-foreground">
                                    {event.time}
                                  </span>
                                  <Badge
                                    className={`text-xs ${getSeverityColor(event.severity)}`}
                                  >
                                    {event.severity}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </Card>
                </div>
              </div>

              {/* AI Insights Preview */}
              <div className="h-96">
                <AIInsights />
              </div>
            </div>
          )}

          {activeView === "network" && (
            <div className="p-6 h-full">
              <NetworkCanvas />
            </div>
          )}

          {activeView === "security" && (
            <div className="p-6 h-full">
              <SecurityAlerts />
            </div>
          )}

          {activeView === "ai" && (
            <div className="p-6 h-full">
              <AIInsights />
            </div>
          )}

          {activeView === "metrics" && (
            <div className="p-6">
              <MetricsDashboard />
            </div>
          )}
        </main>
      </div>

      {/* Status Bar */}
      <footer className="border-t border-border/50 bg-background/80 backdrop-blur px-6 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>System Status: Operational</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-3 w-3" />
              <span>Global Threat Level: Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="h-3 w-3" />
              <span>24/7 Monitoring Active</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span>Last Updated: {new Date().toLocaleTimeString()}</span>
            <span>Version 2.1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
