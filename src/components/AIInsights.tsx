import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Zap,
  Clock,
  Bot,
  Sparkles,
  Target,
  Activity,
} from "lucide-react";

interface AIInsight {
  id: string;
  type: "threat" | "performance" | "recommendation" | "prediction";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  confidence: number;
  timestamp: Date;
  status: "new" | "acknowledged" | "resolved";
  actionable: boolean;
  autoRemediate?: boolean;
}

interface AIAnalysis {
  overallHealth: number;
  threatLevel: "low" | "medium" | "high" | "critical";
  recommendations: number;
  automatedActions: number;
  insights: AIInsight[];
}

const generateMockInsights = (): AIInsight[] => [
  {
    id: "1",
    type: "threat",
    severity: "high",
    title: "Suspicious Network Activity Detected",
    description:
      "Anomalous traffic patterns detected from 10.0.1.45 to database server. Pattern matches known data exfiltration techniques.",
    confidence: 87,
    timestamp: new Date(Date.now() - 300000),
    status: "new",
    actionable: true,
    autoRemediate: true,
  },
  {
    id: "2",
    type: "performance",
    severity: "medium",
    title: "Web Server Performance Degradation",
    description:
      "CPU utilization on web-srv-01 has increased 45% over baseline. Root cause analysis suggests memory leak in application process.",
    confidence: 92,
    timestamp: new Date(Date.now() - 600000),
    status: "acknowledged",
    actionable: true,
  },
  {
    id: "3",
    type: "recommendation",
    severity: "low",
    title: "Firewall Rule Optimization",
    description:
      "15 unused firewall rules detected. Removing these could improve performance by 12% and reduce attack surface.",
    confidence: 78,
    timestamp: new Date(Date.now() - 900000),
    status: "new",
    actionable: true,
  },
  {
    id: "4",
    type: "prediction",
    severity: "medium",
    title: "Potential DDoS Attack Predicted",
    description:
      "ML model predicts 73% probability of DDoS attack in next 2 hours based on current traffic patterns and threat intelligence.",
    confidence: 73,
    timestamp: new Date(Date.now() - 120000),
    status: "new",
    actionable: true,
    autoRemediate: false,
  },
  {
    id: "5",
    type: "threat",
    severity: "critical",
    title: "Privilege Escalation Attempt",
    description:
      "User account 'jdoe' attempting privilege escalation on srv-db-01. Multiple failed sudo attempts detected.",
    confidence: 95,
    timestamp: new Date(Date.now() - 60000),
    status: "new",
    actionable: true,
    autoRemediate: true,
  },
];

const getInsightIcon = (type: AIInsight["type"]) => {
  switch (type) {
    case "threat":
      return AlertTriangle;
    case "performance":
      return TrendingUp;
    case "recommendation":
      return CheckCircle;
    case "prediction":
      return Target;
    default:
      return Activity;
  }
};

const getSeverityColor = (severity: AIInsight["severity"]) => {
  switch (severity) {
    case "low":
      return "text-green-400 bg-green-400/10";
    case "medium":
      return "text-yellow-400 bg-yellow-400/10";
    case "high":
      return "text-orange-400 bg-orange-400/10";
    case "critical":
      return "text-red-400 bg-red-400/10";
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
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

export const AIInsights: React.FC = () => {
  const [insights, setInsights] = useState<AIInsight[]>(generateMockInsights());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("all");

  const [analysis, setAnalysis] = useState<AIAnalysis>({
    overallHealth: 78,
    threatLevel: "medium",
    recommendations: insights.filter((i) => i.type === "recommendation").length,
    automatedActions: insights.filter((i) => i.autoRemediate).length,
    insights,
  });

  // Update analysis when insights change
  useEffect(() => {
    setAnalysis((prev) => ({
      ...prev,
      recommendations: insights.filter((i) => i.type === "recommendation")
        .length,
      automatedActions: insights.filter((i) => i.autoRemediate).length,
      insights,
    }));
  }, [insights]);

  const filteredInsights =
    selectedType === "all"
      ? insights
      : insights.filter((insight) => insight.type === selectedType);

  const handleAutoRemediate = async (insightId: string) => {
    const insight = insights.find((i) => i.id === insightId);
    if (!insight) return;

    // Update insight status to show it's being processed
    setInsights((prev) =>
      prev.map((i) =>
        i.id === insightId ? { ...i, status: "acknowledged" as const } : i,
      ),
    );

    // Simulate auto-remediation process
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulate different outcomes based on insight type
    const success = Math.random() > 0.2; // 80% success rate

    setInsights((prev) =>
      prev.map((i) =>
        i.id === insightId
          ? {
              ...i,
              status: success
                ? ("resolved" as const)
                : ("acknowledged" as const),
              description: success
                ? i.description +
                  " [AUTO-RESOLVED: Remediation completed successfully]"
                : i.description +
                  " [AUTO-REMEDIATION FAILED: Manual intervention required]",
            }
          : i,
      ),
    );

    // Add a new insight about the remediation action
    const remediationInsight: AIInsight = {
      id: Date.now().toString(),
      type: "recommendation",
      severity: success ? "low" : "medium",
      title: success
        ? "Auto-Remediation Successful"
        : "Auto-Remediation Failed",
      description: success
        ? `Successfully auto-remediated: ${insight.title}. System health improved.`
        : `Auto-remediation failed for: ${insight.title}. Security team notification sent.`,
      confidence: 95,
      timestamp: new Date(),
      status: "new",
      actionable: false,
    };

    setInsights((prev) => [remediationInsight, ...prev]);

    // Update overall health based on success
    if (success) {
      setAnalysis((prev) => ({
        ...prev,
        overallHealth: Math.min(100, prev.overallHealth + 5),
      }));
    }
  };

  const handleAcknowledge = (insightId: string) => {
    setInsights((prev) =>
      prev.map((insight) =>
        insight.id === insightId
          ? { ...insight, status: "acknowledged" as const }
          : insight,
      ),
    );
  };

  const runFullAnalysis = () => {
    setIsAnalyzing(true);

    // Generate multiple new insights
    setTimeout(() => {
      const newInsights: AIInsight[] = [
        {
          id: Date.now().toString(),
          type: "threat",
          severity: "high",
          title: "Advanced Persistent Threat Detected",
          description:
            "ML models detected sophisticated attack patterns indicating APT group activity. Multiple compromised endpoints identified with lateral movement attempts.",
          confidence: 92,
          timestamp: new Date(),
          status: "new",
          actionable: true,
          autoRemediate: false,
        },
        {
          id: (Date.now() + 1).toString(),
          type: "performance",
          severity: "medium",
          title: "Network Congestion Anomaly",
          description:
            "Unusual traffic patterns detected on core switches. Bandwidth utilization 340% above normal baseline during off-peak hours.",
          confidence: 88,
          timestamp: new Date(),
          status: "new",
          actionable: true,
          autoRemediate: true,
        },
        {
          id: (Date.now() + 2).toString(),
          type: "recommendation",
          severity: "low",
          title: "Zero Trust Architecture Enhancement",
          description:
            "Analysis suggests implementing additional zero trust controls could reduce attack surface by 67% and improve compliance posture.",
          confidence: 79,
          timestamp: new Date(),
          status: "new",
          actionable: true,
        },
        {
          id: (Date.now() + 3).toString(),
          type: "prediction",
          severity: "critical",
          title: "Imminent System Failure Predicted",
          description:
            "Predictive models indicate 89% probability of critical infrastructure failure within next 4 hours based on current degradation patterns.",
          confidence: 89,
          timestamp: new Date(),
          status: "new",
          actionable: true,
          autoRemediate: true,
        },
      ];

      setInsights((prev) => [...newInsights, ...prev]);
      setIsAnalyzing(false);

      // Update analysis metrics
      setAnalysis((prev) => ({
        ...prev,
        overallHealth: Math.max(45, prev.overallHealth - 15),
        threatLevel: "high" as const,
        recommendations: prev.recommendations + 2,
        automatedActions: prev.automatedActions + 2,
      }));
    }, 3000);
  };

  // Simulate real-time insights
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.9) {
        // 10% chance every 5 seconds
        const types: AIInsight["type"][] = [
          "threat",
          "performance",
          "recommendation",
          "prediction",
        ];
        const severities: AIInsight["severity"][] = [
          "low",
          "medium",
          "high",
          "critical",
        ];

        const newInsight: AIInsight = {
          id: Date.now().toString(),
          type: types[Math.floor(Math.random() * types.length)],
          severity: severities[Math.floor(Math.random() * severities.length)],
          title: "Real-time Analysis Update",
          description: "AI has detected a new pattern requiring attention.",
          confidence: Math.floor(Math.random() * 40) + 60,
          timestamp: new Date(),
          status: "new",
          actionable: true,
          autoRemediate: Math.random() > 0.7,
        };

        setInsights((prev) => [newInsight, ...prev.slice(0, 9)]);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="h-full flex flex-col bg-background/50 backdrop-blur border-border/50">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">AI Analysis Engine</h3>
            <div className="flex items-center gap-1 ml-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
          </div>

          <Button
            onClick={runFullAnalysis}
            disabled={isAnalyzing}
            size="sm"
            className="flex items-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Full Analysis
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-400" />
              <span className="text-sm text-muted-foreground">Health</span>
            </div>
            <div className="text-2xl font-bold text-green-400">
              {analysis.overallHealth}%
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              <span className="text-sm text-muted-foreground">
                Threat Level
              </span>
            </div>
            <Badge
              className={`capitalize ${getSeverityColor(analysis.threatLevel)}`}
            >
              {analysis.threatLevel}
            </Badge>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-muted-foreground">
                Recommendations
              </span>
            </div>
            <div className="text-2xl font-bold">{analysis.recommendations}</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" />
              <span className="text-sm text-muted-foreground">
                Auto Actions
              </span>
            </div>
            <div className="text-2xl font-bold">
              {analysis.automatedActions}
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {["all", "threat", "performance", "recommendation", "prediction"].map(
            (type) => (
              <Button
                key={type}
                variant={selectedType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(type)}
                className="capitalize"
              >
                {type}
              </Button>
            ),
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {filteredInsights.map((insight, index) => {
            const Icon = getInsightIcon(insight.type);
            return (
              <div key={insight.id}>
                <Card className="p-4 bg-card/50 border-border/50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <Badge
                        className={`text-xs ${getSeverityColor(insight.severity)}`}
                      >
                        {insight.severity}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {insight.type}
                      </Badge>
                      {insight.status !== "new" && (
                        <Badge
                          variant={
                            insight.status === "resolved"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {insight.status}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(insight.timestamp)}
                    </div>
                  </div>

                  <h4 className="font-semibold mb-2">{insight.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {insight.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Bot className="h-3 w-3 text-primary" />
                        <span className="text-xs text-muted-foreground">
                          Confidence: {insight.confidence}%
                        </span>
                      </div>
                      {insight.autoRemediate && (
                        <Badge
                          variant="outline"
                          className="text-xs text-green-400 border-green-400/50"
                        >
                          Auto-fixable
                        </Badge>
                      )}
                    </div>

                    {insight.status === "new" && insight.actionable && (
                      <div className="flex gap-2">
                        {insight.autoRemediate && (
                          <Button
                            size="sm"
                            onClick={() => handleAutoRemediate(insight.id)}
                            className="text-xs"
                          >
                            Auto-Fix
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAcknowledge(insight.id)}
                          className="text-xs"
                        >
                          Acknowledge
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
                {index < filteredInsights.length - 1 && (
                  <Separator className="my-2 opacity-20" />
                )}
              </div>
            );
          })}

          {filteredInsights.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No insights for the selected category</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
