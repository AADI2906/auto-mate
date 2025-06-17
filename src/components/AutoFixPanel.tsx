import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ParsedSolution } from "@/services/LlamaAPI";
import {
  Terminal,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  Clock,
  Copy,
  Eye,
  Shield,
  Zap,
  AlertCircle,
} from "lucide-react";

interface AutoFixPanelProps {
  solution: ParsedSolution;
  onExecuteCommand?: (
    command: string,
  ) => Promise<{ success: boolean; output: string; error?: string }>;
  onReviewAll?: () => void;
}

interface CommandExecution {
  command: string;
  status: "pending" | "running" | "completed" | "failed";
  output?: string;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

export const AutoFixPanel: React.FC<AutoFixPanelProps> = ({
  solution,
  onExecuteCommand,
  onReviewAll,
}) => {
  const [executions, setExecutions] = useState<CommandExecution[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showOutput, setShowOutput] = useState<{ [key: string]: boolean }>({});

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

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "dangerous":
        return "text-red-400 bg-red-400/10";
      case "caution":
        return "text-yellow-400 bg-yellow-400/10";
      case "safe":
        return "text-green-400 bg-green-400/10";
      default:
        return "text-gray-400 bg-gray-400/10";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "security":
        return Shield;
      case "network":
        return Zap;
      case "system":
        return Terminal;
      case "application":
        return AlertCircle;
      default:
        return Terminal;
    }
  };

  const executeAllCommands = async () => {
    if (!onExecuteCommand || solution.cliCommands.length === 0) return;

    setIsExecuting(true);
    setCurrentStep(0);

    const newExecutions: CommandExecution[] = solution.cliCommands.map(
      (cmd) => ({
        command: cmd,
        status: "pending" as const,
      }),
    );

    setExecutions(newExecutions);

    for (let i = 0; i < solution.cliCommands.length; i++) {
      setCurrentStep(i);
      const command = solution.cliCommands[i];

      setExecutions((prev) =>
        prev.map((exec, idx) =>
          idx === i
            ? { ...exec, status: "running", startTime: new Date() }
            : exec,
        ),
      );

      try {
        const result = await onExecuteCommand(command);

        setExecutions((prev) =>
          prev.map((exec, idx) =>
            idx === i
              ? {
                  ...exec,
                  status: result.success ? "completed" : "failed",
                  output: result.output,
                  error: result.error,
                  endTime: new Date(),
                }
              : exec,
          ),
        );

        // Add delay between commands for safety
        if (i < solution.cliCommands.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        setExecutions((prev) =>
          prev.map((exec, idx) =>
            idx === i
              ? {
                  ...exec,
                  status: "failed",
                  error:
                    error instanceof Error ? error.message : "Unknown error",
                  endTime: new Date(),
                }
              : exec,
          ),
        );
      }
    }

    setIsExecuting(false);
  };

  const executeCommand = async (command: string, index: number) => {
    if (!onExecuteCommand) return;

    setExecutions((prev) => {
      const newExecs = [...prev];
      if (!newExecs[index]) {
        newExecs[index] = { command, status: "running", startTime: new Date() };
      } else {
        newExecs[index] = {
          ...newExecs[index],
          status: "running",
          startTime: new Date(),
        };
      }
      return newExecs;
    });

    try {
      const result = await onExecuteCommand(command);

      setExecutions((prev) =>
        prev.map((exec, idx) =>
          idx === index
            ? {
                ...exec,
                status: result.success ? "completed" : "failed",
                output: result.output,
                error: result.error,
                endTime: new Date(),
              }
            : exec,
        ),
      );
    } catch (error) {
      setExecutions((prev) =>
        prev.map((exec, idx) =>
          idx === index
            ? {
                ...exec,
                status: "failed",
                error: error instanceof Error ? error.message : "Unknown error",
                endTime: new Date(),
              }
            : exec,
        ),
      );
    }
  };

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
  };

  const toggleOutput = (index: number) => {
    setShowOutput((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const getProgress = () => {
    if (executions.length === 0) return 0;
    const completed = executions.filter(
      (e) => e.status === "completed" || e.status === "failed",
    ).length;
    return (completed / executions.length) * 100;
  };

  const CategoryIcon = getCategoryIcon(solution.category);

  return (
    <div className="space-y-4">
      {/* Solution Overview */}
      <Card className="p-4 bg-background/50 backdrop-blur border-border/50">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <CategoryIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">{solution.diagnosis}</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge className={getSeverityColor(solution.severity)}>
                {solution.severity} severity
              </Badge>
              <Badge className={getRiskColor(solution.riskLevel)}>
                {solution.riskLevel} risk
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {solution.estimatedTime}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {solution.category}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Risk Warning */}
      {solution.riskLevel !== "safe" && (
        <Alert className="border-yellow-400/20 bg-yellow-400/5">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-400">
            {solution.riskLevel === "dangerous"
              ? "These commands may cause system changes or data loss. Review carefully before execution."
              : "These commands may restart services or cause temporary disruption. Proceed with caution."}
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={executeAllCommands}
          disabled={isExecuting || solution.cliCommands.length === 0}
          className="flex-1 sm:flex-none"
        >
          {isExecuting ? (
            <>
              <Pause className="h-4 w-4 mr-2" />
              Executing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Auto-Fix All
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={onReviewAll}
          className="flex-1 sm:flex-none"
        >
          <Eye className="h-4 w-4 mr-2" />
          Review
        </Button>
      </div>

      {/* Execution Progress */}
      {executions.length > 0 && (
        <Card className="p-4 bg-background/50 backdrop-blur border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <Terminal className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Execution Progress</span>
            <Badge variant="outline" className="text-xs">
              {executions.filter((e) => e.status === "completed").length} /{" "}
              {executions.length}
            </Badge>
          </div>
          <Progress value={getProgress()} className="mb-3" />
          {isExecuting && (
            <div className="text-xs text-muted-foreground">
              Currently executing: {solution.cliCommands[currentStep]}
            </div>
          )}
        </Card>
      )}

      {/* CLI Commands */}
      <Card className="bg-background/50 backdrop-blur border-border/50">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">CLI Commands</h3>
            <Badge variant="outline" className="text-xs">
              {solution.cliCommands.length} commands
            </Badge>
          </div>
        </div>
        <ScrollArea className="max-h-96">
          <div className="p-4 space-y-3">
            {solution.cliCommands.map((command, index) => {
              const execution = executions[index];
              return (
                <div
                  key={index}
                  className="border border-border/50 rounded-lg overflow-hidden"
                >
                  <div className="p-3 bg-muted/20 border-b border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        Command {index + 1}
                      </span>
                      {execution && (
                        <Badge
                          className={
                            execution.status === "completed"
                              ? "bg-green-400/10 text-green-400"
                              : execution.status === "failed"
                                ? "bg-red-400/10 text-red-400"
                                : execution.status === "running"
                                  ? "bg-blue-400/10 text-blue-400"
                                  : "bg-gray-400/10 text-gray-400"
                          }
                        >
                          {execution.status === "completed" && (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          )}
                          {execution.status === "failed" && (
                            <AlertTriangle className="h-3 w-3 mr-1" />
                          )}
                          {execution.status}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-background/50 p-2 rounded border font-mono">
                        {command}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyCommand(command)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => executeCommand(command, index)}
                        disabled={isExecuting}
                        className="h-8 w-8 p-0"
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                      {execution && (execution.output || execution.error) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleOutput(index)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {execution &&
                    showOutput[index] &&
                    (execution.output || execution.error) && (
                      <div className="p-3 bg-background/30">
                        {execution.output && (
                          <div className="mb-2">
                            <div className="text-xs text-green-400 mb-1">
                              Output:
                            </div>
                            <pre className="text-xs text-green-300 bg-black/20 p-2 rounded overflow-x-auto">
                              {execution.output}
                            </pre>
                          </div>
                        )}
                        {execution.error && (
                          <div>
                            <div className="text-xs text-red-400 mb-1">
                              Error:
                            </div>
                            <pre className="text-xs text-red-300 bg-black/20 p-2 rounded overflow-x-auto">
                              {execution.error}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Card>

      {/* Explanations */}
      {solution.explanations.length > 0 && (
        <Card className="p-4 bg-background/50 backdrop-blur border-border/50">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Explanation
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            {solution.explanations.slice(0, 3).map((explanation, index) => (
              <p key={index} className="leading-relaxed">
                {explanation}
              </p>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
