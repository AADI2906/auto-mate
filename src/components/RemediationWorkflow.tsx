import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  IncidentContext,
  RemediationAction,
  RemediationStep,
  RemediationType,
  AuditLogEntry,
} from "@/types/nlp";
import {
  Wrench,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Pause,
  AlertTriangle,
  Shield,
  RefreshCw,
  Terminal,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Zap,
  FileText,
  User,
  Calendar,
} from "lucide-react";

interface RemediationWorkflowProps {
  context: IncidentContext;
  onActionExecuted: (action: RemediationAction) => void;
  onAuditLog: (entry: AuditLogEntry) => void;
}

export const RemediationWorkflow: React.FC<RemediationWorkflowProps> = ({
  context,
  onActionExecuted,
  onAuditLog,
}) => {
  const [suggestedActions, setSuggestedActions] = useState<RemediationAction[]>(
    [],
  );
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedAction, setSelectedAction] =
    useState<RemediationAction | null>(null);
  const [executingActions, setExecutingActions] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    generateRemediationActions();
  }, [context]);

  const generateRemediationActions = () => {
    const actions: RemediationAction[] = [];

    // Analyze context to generate appropriate remediation actions
    const correlations = context.correlations;
    const affectedAssets = context.affectedAssets;
    const queryText = context.query.originalQuery.toLowerCase();

    // VPN-related remediations
    if (queryText.includes("vpn") || queryText.includes("anyconnect")) {
      actions.push({
        id: `remediation-vpn-${Date.now()}`,
        type: "restart_service",
        title: "Restart VPN Service",
        description:
          "Restart the VPN service on the affected gateway to resolve connection issues",
        steps: [
          {
            id: "step-1",
            description: "Stop VPN service gracefully",
            command: "systemctl stop vpn-service",
            expectedResult: "Service stopped successfully",
            status: "pending",
          },
          {
            id: "step-2",
            description: "Clear VPN session cache",
            command: "rm -rf /var/cache/vpn/sessions/*",
            expectedResult: "Cache cleared",
            status: "pending",
          },
          {
            id: "step-3",
            description: "Start VPN service",
            command: "systemctl start vpn-service",
            expectedResult: "Service started successfully",
            status: "pending",
          },
          {
            id: "step-4",
            description: "Verify service status",
            command: "systemctl status vpn-service",
            expectedResult: "Service active and running",
            status: "pending",
          },
        ],
        riskLevel: "low",
        estimatedTime: 5,
        requiredApproval: false,
        automatable: true,
        status: "suggested",
      });

      actions.push({
        id: `remediation-tunnel-${Date.now()}`,
        type: "reset_connection",
        title: "Reset User VPN Tunnel",
        description:
          "Reset the specific user's VPN tunnel to resolve authentication or connectivity issues",
        steps: [
          {
            id: "step-1",
            description: "Identify active user sessions",
            command: "show vpn-sessiondb anyconnect",
            expectedResult: "User sessions listed",
            status: "pending",
          },
          {
            id: "step-2",
            description: "Terminate user session",
            command: "vpn-sessiondb logoff name [username]",
            expectedResult: "Session terminated",
            status: "pending",
          },
          {
            id: "step-3",
            description: "Clear user authentication cache",
            command: "clear aaa-server statistics",
            expectedResult: "Cache cleared",
            status: "pending",
          },
        ],
        riskLevel: "low",
        estimatedTime: 3,
        requiredApproval: false,
        automatable: true,
        status: "suggested",
      });
    }

    // Authentication-related remediations
    if (
      queryText.includes("auth") ||
      queryText.includes("login") ||
      correlations.some((c) => c.pattern.includes("failure"))
    ) {
      actions.push({
        id: `remediation-auth-${Date.now()}`,
        type: "reset_credentials",
        title: "Reset User Credentials",
        description:
          "Reset user credentials and force password change to resolve authentication issues",
        steps: [
          {
            id: "step-1",
            description: "Disable user account temporarily",
            command: "net user [username] /active:no",
            expectedResult: "Account disabled",
            status: "pending",
          },
          {
            id: "step-2",
            description: "Reset user password",
            command: "net user [username] [temp_password]",
            expectedResult: "Password reset",
            status: "pending",
          },
          {
            id: "step-3",
            description: "Force password change at next login",
            command: "net user [username] /logonpasswordchg:yes",
            expectedResult: "Password change required",
            status: "pending",
          },
          {
            id: "step-4",
            description: "Re-enable user account",
            command: "net user [username] /active:yes",
            expectedResult: "Account enabled",
            status: "pending",
          },
        ],
        riskLevel: "medium",
        estimatedTime: 10,
        requiredApproval: true,
        automatable: false,
        status: "suggested",
      });
    }

    // Performance-related remediations
    if (
      queryText.includes("slow") ||
      queryText.includes("performance") ||
      queryText.includes("latency")
    ) {
      actions.push({
        id: `remediation-perf-${Date.now()}`,
        type: "clear_cache",
        title: "Clear System Cache",
        description:
          "Clear system caches to improve performance and resolve slow response times",
        steps: [
          {
            id: "step-1",
            description: "Clear DNS cache",
            command: "ipconfig /flushdns",
            expectedResult: "DNS cache cleared",
            status: "pending",
          },
          {
            id: "step-2",
            description: "Clear ARP cache",
            command: "arp -d *",
            expectedResult: "ARP cache cleared",
            status: "pending",
          },
          {
            id: "step-3",
            description: "Restart network interface",
            command: "interface reset",
            expectedResult: "Interface restarted",
            status: "pending",
          },
        ],
        riskLevel: "low",
        estimatedTime: 2,
        requiredApproval: false,
        automatable: true,
        status: "suggested",
      });
    }

    // Security-related remediations
    if (queryText.includes("security") || queryText.includes("threat")) {
      actions.push({
        id: `remediation-security-${Date.now()}`,
        type: "quarantine_device",
        title: "Quarantine Suspicious Device",
        description:
          "Isolate the suspicious device to prevent potential security threats from spreading",
        steps: [
          {
            id: "step-1",
            description: "Identify device MAC address",
            command: "show mac address-table | include [ip_address]",
            expectedResult: "MAC address identified",
            status: "pending",
          },
          {
            id: "step-2",
            description: "Apply quarantine VLAN",
            command: "configure device quarantine vlan 666",
            expectedResult: "Device moved to quarantine VLAN",
            status: "pending",
          },
          {
            id: "step-3",
            description: "Block internet access",
            command: "apply acl quarantine-block",
            expectedResult: "Internet access blocked",
            status: "pending",
          },
          {
            id: "step-4",
            description: "Notify security team",
            command: "send alert security-team",
            expectedResult: "Security team notified",
            status: "pending",
          },
        ],
        riskLevel: "high",
        estimatedTime: 15,
        requiredApproval: true,
        automatable: false,
        status: "suggested",
      });

      actions.push({
        id: `remediation-firewall-${Date.now()}`,
        type: "update_acl",
        title: "Update Firewall Rules",
        description:
          "Update firewall ACL to block suspicious traffic patterns identified in the analysis",
        steps: [
          {
            id: "step-1",
            description: "Backup current firewall configuration",
            command: "copy running-config backup-config",
            expectedResult: "Configuration backed up",
            status: "pending",
          },
          {
            id: "step-2",
            description: "Add blocking rule for suspicious IP",
            command: "access-list 100 deny ip [suspicious_ip] any",
            expectedResult: "Blocking rule added",
            status: "pending",
          },
          {
            id: "step-3",
            description: "Apply ACL to interface",
            command: "interface [interface] ip access-group 100 in",
            expectedResult: "ACL applied",
            status: "pending",
          },
          {
            id: "step-4",
            description: "Save configuration",
            command: "write memory",
            expectedResult: "Configuration saved",
            status: "pending",
          },
        ],
        riskLevel: "medium",
        estimatedTime: 8,
        requiredApproval: true,
        automatable: false,
        status: "suggested",
      });
    }

    // Network connectivity remediations
    if (
      queryText.includes("connection") ||
      queryText.includes("network") ||
      queryText.includes("interface")
    ) {
      actions.push({
        id: `remediation-network-${Date.now()}`,
        type: "restart_interface",
        title: "Restart Network Interface",
        description:
          "Restart the affected network interface to resolve connectivity issues",
        steps: [
          {
            id: "step-1",
            description: "Shutdown interface",
            command: "interface [interface] shutdown",
            expectedResult: "Interface down",
            status: "pending",
          },
          {
            id: "step-2",
            description: "Wait for interface to settle",
            command: "sleep 5",
            expectedResult: "Wait completed",
            status: "pending",
          },
          {
            id: "step-3",
            description: "Bring interface up",
            command: "interface [interface] no shutdown",
            expectedResult: "Interface up",
            status: "pending",
          },
          {
            id: "step-4",
            description: "Verify interface status",
            command: "show interface [interface]",
            expectedResult: "Interface operational",
            status: "pending",
          },
        ],
        riskLevel: "medium",
        estimatedTime: 3,
        requiredApproval: false,
        automatable: true,
        status: "suggested",
      });
    }

    setSuggestedActions(actions);
  };

  const handleActionApproval = (action: RemediationAction) => {
    if (action.requiredApproval) {
      setSelectedAction(action);
      setShowApprovalDialog(true);
    } else {
      executeAction(action);
    }
  };

  const executeAction = async (action: RemediationAction) => {
    setExecutingActions((prev) => new Set([...prev, action.id]));

    // Update action status
    const updatedAction = { ...action, status: "executing" as const };

    // Create audit log entry
    const auditEntry: AuditLogEntry = {
      id: `audit-${Date.now()}`,
      timestamp: new Date(),
      user: "security-admin",
      action: "execute_remediation",
      target: action.title,
      details: {
        actionId: action.id,
        type: action.type,
        riskLevel: action.riskLevel,
        estimatedTime: action.estimatedTime,
      },
      result: "pending",
    };

    onAuditLog(auditEntry);

    // Execute steps sequentially
    for (let i = 0; i < updatedAction.steps.length; i++) {
      const step = updatedAction.steps[i];
      step.status = "running";

      // Simulate step execution time
      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * 2000 + 1000),
      );

      // Simulate step result
      const success = Math.random() > 0.1; // 90% success rate

      if (success) {
        step.status = "completed";
        step.output = step.expectedResult;
      } else {
        step.status = "failed";
        step.output = "Step failed - see logs for details";
        updatedAction.status = "failed";
        auditEntry.result = "failure";
        break;
      }
    }

    if (updatedAction.status !== "failed") {
      updatedAction.status = "completed";
      auditEntry.result = "success";
    }

    // Update audit log
    onAuditLog({ ...auditEntry, result: auditEntry.result });

    setExecutingActions((prev) => {
      const newSet = new Set(prev);
      newSet.delete(action.id);
      return newSet;
    });

    // Update the action in the list
    setSuggestedActions((prev) =>
      prev.map((a) => (a.id === action.id ? updatedAction : a)),
    );

    onActionExecuted(updatedAction);
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "low":
        return "text-green-400 bg-green-400/10 border-green-400/20";
      case "medium":
        return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "high":
        return "text-red-400 bg-red-400/10 border-red-400/20";
      default:
        return "text-gray-400 bg-gray-400/10 border-gray-400/20";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "suggested":
        return "text-blue-400 bg-blue-400/10";
      case "approved":
        return "text-green-400 bg-green-400/10";
      case "executing":
        return "text-orange-400 bg-orange-400/10";
      case "completed":
        return "text-green-400 bg-green-400/10";
      case "failed":
        return "text-red-400 bg-red-400/10";
      default:
        return "text-gray-400 bg-gray-400/10";
    }
  };

  const getStepProgress = (action: RemediationAction) => {
    const completedSteps = action.steps.filter(
      (step) => step.status === "completed",
    ).length;
    return (completedSteps / action.steps.length) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-background/50 backdrop-blur border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold">Automated Remediation</h2>
          </div>
          <Badge variant="outline">
            {suggestedActions.length} actions suggested
          </Badge>
        </div>
        <p className="text-muted-foreground">
          AI-generated remediation actions based on the incident analysis.
          Review and approve actions before execution.
        </p>
      </Card>

      {/* Actions List */}
      <div className="space-y-4">
        {suggestedActions.map((action) => (
          <Card
            key={action.id}
            className="p-6 bg-background/50 backdrop-blur border-border/50"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold">{action.title}</h3>
                  <Badge className={getRiskColor(action.riskLevel)}>
                    {action.riskLevel} risk
                  </Badge>
                  <Badge className={getStatusColor(action.status)}>
                    {action.status}
                  </Badge>
                  {action.automatable && (
                    <Badge variant="outline" className="text-green-400">
                      <Zap className="h-3 w-3 mr-1" />
                      Auto
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mb-3">
                  {action.description}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>~{action.estimatedTime} minutes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Terminal className="h-4 w-4" />
                    <span>{action.steps.length} steps</span>
                  </div>
                  {action.requiredApproval && (
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>Approval required</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {action.status === "suggested" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleActionApproval(action)}
                      disabled={executingActions.has(action.id)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Execute
                    </Button>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                  </>
                )}
                {action.status === "executing" && (
                  <Button variant="outline" size="sm" disabled>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Executing...
                  </Button>
                )}
                {action.status === "completed" && (
                  <Button variant="outline" size="sm" disabled>
                    <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                    Completed
                  </Button>
                )}
                {action.status === "failed" && (
                  <Button variant="outline" size="sm">
                    <XCircle className="h-4 w-4 mr-2 text-red-400" />
                    Retry
                  </Button>
                )}
              </div>
            </div>

            {/* Progress bar for executing actions */}
            {action.status === "executing" && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(getStepProgress(action))}%
                  </span>
                </div>
                <Progress value={getStepProgress(action)} className="h-2" />
              </div>
            )}

            {/* Steps */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium mb-2">Execution Steps:</h4>
              {action.steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`p-3 rounded-lg border border-border/30 ${
                    step.status === "running"
                      ? "bg-blue-500/5 border-blue-500/20"
                      : step.status === "completed"
                        ? "bg-green-500/5 border-green-500/20"
                        : step.status === "failed"
                          ? "bg-red-500/5 border-red-500/20"
                          : "bg-muted/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {index + 1}. {step.description}
                    </span>
                    <div className="flex items-center gap-2">
                      {step.status === "pending" && (
                        <Clock className="h-4 w-4 text-gray-400" />
                      )}
                      {step.status === "running" && (
                        <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
                      )}
                      {step.status === "completed" && (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      )}
                      {step.status === "failed" && (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                  </div>
                  {step.command && (
                    <code className="text-xs bg-muted/50 px-2 py-1 rounded block mb-1">
                      {step.command}
                    </code>
                  )}
                  {step.output && (
                    <div className="text-xs text-muted-foreground">
                      Output: {step.output}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}

        {suggestedActions.length === 0 && (
          <Card className="p-8 bg-background/50 backdrop-blur border-border/50">
            <div className="text-center text-muted-foreground">
              <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-2">No Remediation Actions</h3>
              <p>
                No automated remediation actions are available for this
                incident. Manual investigation may be required.
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Approval Dialog */}
      <AlertDialog
        open={showApprovalDialog}
        onOpenChange={setShowApprovalDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              Approve Remediation Action
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedAction && (
                <div className="space-y-3">
                  <p>
                    You are about to execute:{" "}
                    <strong>{selectedAction.title}</strong>
                  </p>
                  <p>{selectedAction.description}</p>
                  <div className="bg-muted/20 p-3 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Risk Level:
                        </span>
                        <Badge
                          className={getRiskColor(selectedAction.riskLevel)}
                        >
                          {selectedAction.riskLevel}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Est. Time:
                        </span>
                        <span className="ml-2">
                          {selectedAction.estimatedTime} min
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This action will execute {selectedAction.steps.length} steps
                    and may impact system availability.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedAction) {
                  executeAction(selectedAction);
                }
                setShowApprovalDialog(false);
                setSelectedAction(null);
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              Approve & Execute
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
