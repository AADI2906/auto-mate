import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AIInsights } from "@/components/AIInsights";
import { SecurityAlerts } from "@/components/SecurityAlerts";

import { RealTimeSystemDashboard } from "@/components/RealTimeSystemDashboard";
import { SimpleAIAssistant } from "@/components/SimpleAIAssistant";
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
  const [activeView, setActiveView] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Track visited sections and new counts
  const [visitedSections, setVisitedSections] = useState<Set<string>>(
    new Set(),
  );
  const [newSecurityAlerts, setNewSecurityAlerts] = useState(0);
  const [newAIInsights, setNewAIInsights] = useState(0);

  // Initial counts (simulating existing alerts/insights)
  const [initialSecurityCount] = useState(23);
  const [initialAICount] = useState(12);
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

  // Handle section navigation and mark as visited
  const handleSectionClick = (sectionId: string) => {
    setActiveView(sectionId);

    // Mark section as visited and clear new counts
    if (!visitedSections.has(sectionId)) {
      setVisitedSections((prev) => new Set([...prev, sectionId]));

      // Clear new counts when first visiting
      if (sectionId === "security") {
        setNewSecurityAlerts(0);
      } else if (sectionId === "ai") {
        setNewAIInsights(0);
      }
    }
  };

  // Calculate badge count for each section
  const getBadgeCount = (sectionId: string) => {
    switch (sectionId) {
      case "security":
        if (!visitedSections.has("security")) {
          return initialSecurityCount.toString();
        }
        return newSecurityAlerts > 0 ? newSecurityAlerts.toString() : null;

      case "ai":
        if (!visitedSections.has("ai")) {
          return initialAICount.toString();
        }
        return newAIInsights > 0 ? newAIInsights.toString() : null;

      default:
        return null;
    }
  };

  // Simulate new alerts/insights coming in (for demonstration)
  const addNewSecurityAlert = () => {
    setNewSecurityAlerts((prev) => prev + 1);
  };

  const addNewAIInsight = () => {
    setNewAIInsights((prev) => prev + 1);
  };

  // Simulate new alerts/insights coming in periodically (optional - for demo)
  React.useEffect(() => {
    const interval = setInterval(() => {
      // Randomly add new alerts or insights (10% chance every 30 seconds)
      if (Math.random() < 0.1) {
        if (Math.random() < 0.5) {
          addNewSecurityAlert();
        } else {
          addNewAIInsight();
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 lg:px-6 py-4">
          <div className="flex items-center gap-2 lg:gap-4 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSidebarCollapsed(!sidebarCollapsed);
                setShowMobileMenu(!showMobileMenu);
                console.log("Mobile menu toggled:", !showMobileMenu);
              }}
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
                  Security Operations Platform
                </p>
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
              onClick={() => {
                // Show notifications panel
                alert(
                  "Notifications:\n• 2 Critical alerts require attention\n• 1 System update available\n• New threat intelligence received",
                );
              }}
            >
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center p-0">
                3
              </Badge>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="flex-shrink-0"
              onClick={() => {
                // Open settings
                alert(
                  "Settings:\n• Dark/Light theme toggle\n• Notification preferences\n• Agent configuration\n• Export/Import settings",
                );
              }}
            >
              <Settings className="h-5 w-5" />
            </Button>

            {/* Demo buttons for testing new alerts (can be removed in production) */}
            <Button
              variant="ghost"
              size="sm"
              className="flex-shrink-0 text-xs"
              onClick={addNewSecurityAlert}
              title="Simulate new security alert"
            >
              +🛡️
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="flex-shrink-0 text-xs"
              onClick={addNewAIInsight}
              title="Simulate new AI insight"
            >
              +🧠
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
                id: "overview",
                label: "Overview",
                icon: Activity,
              },
              {
                id: "ai-assistant",
                label: "AI Assistant",
                icon: MessageSquare,
              },
              {
                id: "security",
                label: "Security Alerts",
                icon: Shield,
              },
              {
                id: "ai",
                label: "AI Insights",
                icon: Brain,
              },
              {
                id: "system",
                label: "System Monitor",
                icon: Activity,
              },
            ].map((item) => {
              const Icon = item.icon;
              const badgeCount = getBadgeCount(item.id);

              return (
                <button
                  key={item.id}
                  onClick={() => handleSectionClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeView === item.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <>
                      <span className="font-medium truncate">{item.label}</span>
                      {badgeCount && (
                        <Badge className="ml-auto bg-red-500 text-white text-xs flex-shrink-0">
                          {badgeCount}
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
          {activeView === "ai-assistant" && (
            <div className="p-6 h-full">
              <SimpleAIAssistant />
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
                  <SecurityAlerts />
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

          {activeView === "system" && (
            <div className="p-6">
              <RealTimeSystemDashboard />
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
