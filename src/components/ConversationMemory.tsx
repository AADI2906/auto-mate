import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  AuditLogEntry,
  ConversationMessage,
  IncidentContext,
} from "@/types/nlp";
import {
  History,
  Search,
  Download,
  Filter,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  FileText,
  Settings,
  Calendar,
  Eye,
} from "lucide-react";

interface ConversationMemoryProps {
  auditLog: AuditLogEntry[];
  conversations: ConversationMessage[];
  incidents: IncidentContext[];
  onExport?: () => void;
}

export const ConversationMemory: React.FC<ConversationMemoryProps> = ({
  auditLog,
  conversations,
  incidents,
  onExport,
}) => {
  const [activeTab, setActiveTab] = useState<
    "audit" | "conversations" | "incidents"
  >("audit");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  const filteredAuditLog = auditLog.filter((entry) => {
    const matchesSearch =
      searchTerm === "" ||
      entry.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.user.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterType === "all" || entry.result === filterType;

    return matchesSearch && matchesFilter;
  });

  const filteredConversations = conversations.filter(
    (msg) =>
      searchTerm === "" ||
      msg.content.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredIncidents = incidents.filter(
    (incident) =>
      searchTerm === "" ||
      incident.query.originalQuery
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      incident.id.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getResultIcon = (result: string) => {
    switch (result) {
      case "success":
        return CheckCircle;
      case "failure":
        return XCircle;
      case "pending":
        return Loader2;
      default:
        return AlertTriangle;
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case "success":
        return "text-green-400";
      case "failure":
        return "text-red-400";
      case "pending":
        return "text-yellow-400";
      default:
        return "text-gray-400";
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

  return (
    <Card className="h-full flex flex-col bg-background/50 backdrop-blur border-border/50">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">System Memory</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4">
          {[
            { id: "audit", label: "Audit Log", count: auditLog.length },
            {
              id: "conversations",
              label: "Conversations",
              count: conversations.length,
            },
            { id: "incidents", label: "Incidents", count: incidents.length },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab.id as any)}
              className="flex items-center gap-2"
            >
              {tab.label}
              <Badge variant="secondary" className="text-xs">
                {tab.count}
              </Badge>
            </Button>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {activeTab === "audit" && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-md text-sm"
            >
              <option value="all">All Results</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="pending">Pending</option>
            </select>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {activeTab === "audit" && (
            <div className="space-y-3">
              {filteredAuditLog.map((entry) => {
                const ResultIcon = getResultIcon(entry.result);
                const resultColor = getResultColor(entry.result);
                return (
                  <Card
                    key={entry.id}
                    className="p-4 bg-card/50 border-border/50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <ResultIcon
                          className={`h-4 w-4 ${resultColor} ${
                            entry.result === "pending" ? "animate-spin" : ""
                          }`}
                        />
                        <h4 className="font-medium">{entry.action}</h4>
                        <Badge
                          variant="outline"
                          className={`text-xs ${resultColor}`}
                        >
                          {entry.result}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(entry.timestamp)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">User:</span>
                        <span className="ml-2 font-mono">{entry.user}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Target:</span>
                        <span className="ml-2">{entry.target}</span>
                      </div>
                    </div>

                    {Object.keys(entry.details).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/20">
                        <span className="text-xs text-muted-foreground">
                          Details:
                        </span>
                        <pre className="text-xs bg-muted/50 p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(entry.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </Card>
                );
              })}

              {filteredAuditLog.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No audit entries match your search</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "conversations" && (
            <div className="space-y-3">
              {filteredConversations.map((message) => (
                <Card
                  key={message.id}
                  className="p-4 bg-card/50 border-border/50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          message.type === "user"
                            ? "default"
                            : message.type === "assistant"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {message.type}
                      </Badge>
                      {message.context && (
                        <Badge variant="outline" className="text-xs">
                          {message.context.id}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content.length > 200
                      ? `${message.content.substring(0, 200)}...`
                      : message.content}
                  </p>
                  {message.attachments && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {message.attachments.map((attachment, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs"
                        >
                          {attachment.type}: {attachment.title}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card>
              ))}

              {filteredConversations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No conversations match your search</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "incidents" && (
            <div className="space-y-3">
              {filteredIncidents.map((incident) => (
                <Card
                  key={incident.id}
                  className="p-4 bg-card/50 border-border/50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{incident.id}</h4>
                      <Badge
                        className={
                          incident.severity === "critical"
                            ? "bg-red-500/10 text-red-400"
                            : incident.severity === "high"
                              ? "bg-orange-500/10 text-orange-400"
                              : incident.severity === "medium"
                                ? "bg-yellow-500/10 text-yellow-400"
                                : "bg-green-500/10 text-green-400"
                        }
                      >
                        {incident.severity}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          incident.status === "resolved"
                            ? "text-green-400"
                            : incident.status === "remediating"
                              ? "text-orange-400"
                              : "text-blue-400"
                        }
                      >
                        {incident.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(incident.query.timestamp)}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">
                    {incident.query.originalQuery}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Agents:</span>
                      <div className="font-bold">
                        {incident.agentTasks.length}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Correlations:
                      </span>
                      <div className="font-bold">
                        {incident.correlations.length}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Assets:</span>
                      <div className="font-bold">
                        {incident.affectedAssets.length}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Events:</span>
                      <div className="font-bold">
                        {incident.timeline.length}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/20">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Intent: {incident.query.intent} | Confidence:{" "}
                        {Math.round(incident.query.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </Card>
              ))}

              {filteredIncidents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No incidents match your search</p>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
