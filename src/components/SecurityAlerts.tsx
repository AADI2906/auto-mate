import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Shield,
  Eye,
  Clock,
  MapPin,
  User,
  Server,
  ExternalLink,
  CheckCircle,
  X,
  Filter,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface SecurityAlert {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  category:
    | "malware"
    | "intrusion"
    | "data_exfiltration"
    | "privilege_escalation"
    | "ddos"
    | "phishing";
  source: string;
  target: string;
  timestamp: Date;
  status: "active" | "investigating" | "resolved" | "false_positive";
  assignee?: string;
  iocs: string[];
  mitreId?: string;
  location: string;
}

const generateMockAlerts = (): SecurityAlert[] => [
  {
    id: "ALERT-001",
    title: "Malicious PowerShell Execution Detected",
    description:
      "Suspicious PowerShell script execution with encoded command detected on workstation WS-045",
    severity: "high",
    category: "malware",
    source: "192.168.1.45",
    target: "WS-045",
    timestamp: new Date(Date.now() - 180000),
    status: "active",
    assignee: "John Doe",
    iocs: ["powershell.exe", "encoded_command", "192.168.1.45"],
    mitreId: "T1059.001",
    location: "Building A - Floor 3",
  },
  {
    id: "ALERT-002",
    title: "Privilege Escalation Attempt",
    description:
      "User account 'intern01' attempting to access admin shares on file server",
    severity: "critical",
    category: "privilege_escalation",
    source: "192.168.1.78",
    target: "FILE-SRV-01",
    timestamp: new Date(Date.now() - 120000),
    status: "investigating",
    assignee: "Sarah Wilson",
    iocs: ["intern01", "admin$", "C$"],
    mitreId: "T1078",
    location: "Data Center",
  },
  {
    id: "ALERT-003",
    title: "Suspicious Data Transfer",
    description:
      "Large volume of data being transferred to external IP during off-hours",
    severity: "high",
    category: "data_exfiltration",
    source: "192.168.1.23",
    target: "45.33.32.156",
    timestamp: new Date(Date.now() - 300000),
    status: "active",
    iocs: ["45.33.32.156", "large_transfer", "off_hours"],
    mitreId: "T1041",
    location: "Building B - Floor 1",
  },
  {
    id: "ALERT-004",
    title: "DDoS Attack Detected",
    description:
      "High volume of requests from multiple IPs targeting web server",
    severity: "medium",
    category: "ddos",
    source: "Multiple External IPs",
    target: "WEB-SRV-01",
    timestamp: new Date(Date.now() - 60000),
    status: "active",
    assignee: "Mike Chen",
    iocs: ["high_request_volume", "multiple_ips"],
    location: "DMZ",
  },
  {
    id: "ALERT-005",
    title: "Phishing Email Delivered",
    description:
      "Malicious email with weaponized attachment delivered to multiple users",
    severity: "medium",
    category: "phishing",
    source: "external@suspicious-domain.com",
    target: "Multiple Users",
    timestamp: new Date(Date.now() - 900000),
    status: "resolved",
    assignee: "Lisa Park",
    iocs: ["suspicious-domain.com", "malicious_attachment.docx"],
    location: "Email Server",
  },
];

const getSeverityColor = (severity: SecurityAlert["severity"]) => {
  switch (severity) {
    case "low":
      return "text-green-400 bg-green-400/10 border-green-400/20";
    case "medium":
      return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
    case "high":
      return "text-orange-400 bg-orange-400/10 border-orange-400/20";
    case "critical":
      return "text-red-400 bg-red-400/10 border-red-400/20";
    default:
      return "text-gray-400 bg-gray-400/10 border-gray-400/20";
  }
};

const getStatusColor = (status: SecurityAlert["status"]) => {
  switch (status) {
    case "active":
      return "text-red-400 bg-red-400/10";
    case "investigating":
      return "text-yellow-400 bg-yellow-400/10";
    case "resolved":
      return "text-green-400 bg-green-400/10";
    case "false_positive":
      return "text-gray-400 bg-gray-400/10";
    default:
      return "text-gray-400 bg-gray-400/10";
  }
};

const getCategoryIcon = (category: SecurityAlert["category"]) => {
  switch (category) {
    case "malware":
      return AlertTriangle;
    case "intrusion":
      return Shield;
    case "data_exfiltration":
      return ExternalLink;
    case "privilege_escalation":
      return User;
    case "ddos":
      return Server;
    case "phishing":
      return Eye;
    default:
      return AlertTriangle;
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
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

export const SecurityAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>(generateMockAlerts());
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSeverity =
      filterSeverity === "all" || alert.severity === filterSeverity;
    const matchesStatus =
      filterStatus === "all" || alert.status === filterStatus;
    const matchesSearch =
      searchTerm === "" ||
      alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.target.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSeverity && matchesStatus && matchesSearch;
  });

  const alertCounts = {
    total: alerts.length,
    active: alerts.filter((a) => a.status === "active").length,
    critical: alerts.filter((a) => a.severity === "critical").length,
    investigating: alerts.filter((a) => a.status === "investigating").length,
  };

  const handleStatusChange = (
    alertId: string,
    newStatus: SecurityAlert["status"],
  ) => {
    const alert = alerts.find((a) => a.id === alertId);
    if (!alert) return;

    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: newStatus,
              assignee:
                newStatus === "investigating" ? "Security Admin" : a.assignee,
            }
          : a,
      ),
    );

    // Simulate different actions based on status change
    setTimeout(() => {
      let statusMessage = "";
      switch (newStatus) {
        case "investigating":
          statusMessage = `Investigation started for ${alert.title}. Forensic analysis in progress.`;
          break;
        case "resolved":
          statusMessage = `Alert resolved: ${alert.title}. Root cause identified and mitigated.`;
          break;
        case "false_positive":
          statusMessage = `Alert marked as false positive: ${alert.title}. Detection rules updated.`;
          break;
      }

      // Add status change log
      if (statusMessage) {
        const newAlert: SecurityAlert = {
          id: `STATUS-${Date.now()}`,
          title: "Alert Status Update",
          description: statusMessage,
          severity: "low",
          category: "intrusion",
          source: "Security Operations",
          target: "Alert Management",
          timestamp: new Date(),
          status: "resolved",
          iocs: [],
          location: "SOC",
        };

        setAlerts((prev) => [newAlert, ...prev.slice(0, 19)]);
      }
    }, 1000);
  };

  const handleAssign = (alertId: string, assignee: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, assignee } : alert,
      ),
    );
  };

  // Simulate real-time alerts
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.95) {
        // 5% chance every 3 seconds
        const categories: SecurityAlert["category"][] = [
          "malware",
          "intrusion",
          "data_exfiltration",
          "privilege_escalation",
          "ddos",
          "phishing",
        ];
        const severities: SecurityAlert["severity"][] = [
          "low",
          "medium",
          "high",
          "critical",
        ];

        const newAlert: SecurityAlert = {
          id: `ALERT-${Date.now()}`,
          title: "Real-time Threat Detected",
          description:
            "Automated threat detection system has identified suspicious activity",
          severity: severities[Math.floor(Math.random() * severities.length)],
          category: categories[Math.floor(Math.random() * categories.length)],
          source: `192.168.1.${Math.floor(Math.random() * 255)}`,
          target: `SRV-${Math.floor(Math.random() * 10)
            .toString()
            .padStart(2, "0")}`,
          timestamp: new Date(),
          status: "active",
          iocs: ["real_time_detection"],
          location: "Unknown",
        };

        setAlerts((prev) => [newAlert, ...prev.slice(0, 19)]); // Keep only last 20 alerts
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="h-full flex flex-col bg-background/50 backdrop-blur border-border/50">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-400" />
            <h3 className="text-lg font-semibold">Security Alerts</h3>
            <div className="flex items-center gap-1 ml-2">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              <span className="text-xs text-muted-foreground">Live</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">Total Alerts</span>
            <div className="text-2xl font-bold">{alertCounts.total}</div>
          </div>
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">Active</span>
            <div className="text-2xl font-bold text-red-400">
              {alertCounts.active}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">Critical</span>
            <div className="text-2xl font-bold text-orange-400">
              {alertCounts.critical}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">Investigating</span>
            <div className="text-2xl font-bold text-yellow-400">
              {alertCounts.investigating}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-md text-sm"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-md text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="false_positive">False Positive</option>
            </select>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {filteredAlerts.map((alert, index) => {
            const CategoryIcon = getCategoryIcon(alert.category);
            return (
              <div key={alert.id}>
                <Card
                  className={`p-4 security-alert-${alert.severity} border-l-4`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CategoryIcon className="h-4 w-4" />
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <Badge className={getStatusColor(alert.status)}>
                        {alert.status.replace("_", " ").toUpperCase()}
                      </Badge>
                      <span className="text-xs font-mono text-muted-foreground">
                        {alert.id}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(alert.timestamp)}
                    </div>
                  </div>

                  <h4 className="font-semibold mb-2">{alert.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {alert.description}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3 text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Server className="h-3 w-3" />
                        <span className="text-muted-foreground">Source:</span>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {alert.source}
                        </code>
                      </div>
                      <div className="flex items-center gap-2">
                        <Server className="h-3 w-3" />
                        <span className="text-muted-foreground">Target:</span>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {alert.target}
                        </code>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span className="text-muted-foreground">Location:</span>
                        <span className="text-xs">{alert.location}</span>
                      </div>
                      {alert.assignee && (
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          <span className="text-muted-foreground">
                            Assignee:
                          </span>
                          <span className="text-xs">{alert.assignee}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {alert.iocs.length > 0 && (
                    <div className="mb-3">
                      <span className="text-xs text-muted-foreground mb-1 block">
                        Indicators of Compromise:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {alert.iocs.map((ioc, idx) => (
                          <code
                            key={idx}
                            className="text-xs bg-muted px-2 py-1 rounded"
                          >
                            {ioc}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}

                  {alert.mitreId && (
                    <div className="mb-3">
                      <Badge variant="outline" className="text-xs">
                        MITRE ATT&CK: {alert.mitreId}
                      </Badge>
                    </div>
                  )}

                  {alert.status !== "resolved" &&
                    alert.status !== "false_positive" && (
                      <div className="flex gap-2 pt-2 border-t border-border/20">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleStatusChange(alert.id, "investigating")
                          }
                          disabled={alert.status === "investigating"}
                          className="text-xs"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Investigate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleStatusChange(alert.id, "resolved")
                          }
                          className="text-xs"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Resolve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleStatusChange(alert.id, "false_positive")
                          }
                          className="text-xs"
                        >
                          <X className="h-3 w-3 mr-1" />
                          False Positive
                        </Button>
                      </div>
                    )}
                </Card>
                {index < filteredAlerts.length - 1 && (
                  <Separator className="my-2 opacity-20" />
                )}
              </div>
            );
          })}

          {filteredAlerts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No security alerts match your filters</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
