import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CommandExecutor from "@/utils/CommandExecutor";
import { RealTimeVisualization } from "@/components/RealTimeVisualization";
import {
  Play,
  Copy,
  Download,
  Terminal,
  CheckCircle,
  AlertTriangle,
  Info,
  ExternalLink,
  BarChart3,
  Eye,
  EyeOff,
} from "lucide-react";

interface CLICommandBlockProps {
  commands: string[];
  title?: string;
  description?: string;
  metadata?: {
    data_type: string;
    expected_output: string;
    key_metrics: string[];
  };
}

export const CLICommandBlock: React.FC<CLICommandBlockProps> = ({
  commands,
  title = "CLI Commands",
  description,
  metadata,
}) => {
  const [executionStatus, setExecutionStatus] = useState<{
    [key: string]: "idle" | "executing" | "success" | "error";
  }>({});
  const [lastExecutionMethod, setLastExecutionMethod] = useState<string>("");
  const [showInstructions, setShowInstructions] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(
    null,
  );

  const platform = CommandExecutor.detectPlatform();
  const platformEmoji = CommandExecutor.getPlatformEmoji();
  const platformInstructions = CommandExecutor.getPlatformInstructions();

  // Check backend health on component mount
  React.useEffect(() => {
    const checkBackend = async () => {
      const isHealthy = await CommandExecutor.checkBackendHealth();
      setBackendAvailable(isHealthy);
    };
    checkBackend();
  }, []);

  const [commandResults, setCommandResults] = useState<{
    [key: string]: { output?: string; stderr?: string; returncode?: number };
  }>({});

  const [showVisualization, setShowVisualization] = useState(false);
  const [executedCommands, setExecutedCommands] = useState<
    Array<{
      command: string;
      output: string;
      stderr?: string;
      returncode?: number;
    }>
  >([]);

  const executeCommand = async (command: string, index: number) => {
    setExecutionStatus((prev) => ({ ...prev, [index]: "executing" }));

    try {
      const result = await CommandExecutor.executeCommand(command);

      if (result.success) {
        setExecutionStatus((prev) => ({ ...prev, [index]: "success" }));
        setLastExecutionMethod(result.method);

        // Store command results for display
        if (result.method === "backend") {
          const commandResult = {
            output: result.output,
            stderr: result.stderr,
            returncode: result.returncode,
          };

          setCommandResults((prev) => ({
            ...prev,
            [index]: commandResult,
          }));

          // Add to executed commands for visualization
          setExecutedCommands((prev) => {
            const newCommand = {
              command: command,
              output: result.output || "",
              stderr: result.stderr,
              returncode: result.returncode,
            };

            // Replace existing command or add new one
            const filtered = prev.filter((cmd) => cmd.command !== command);
            return [...filtered, newCommand];
          });

          // Auto-show visualization for supported data types
          if (metadata && result.output) {
            setShowVisualization(true);
          }
        }

        if (result.method === "clipboard") {
          setShowInstructions(true);
        }

        // Reset status after 5 seconds for backend results (to show output)
        setTimeout(
          () => {
            setExecutionStatus((prev) => ({ ...prev, [index]: "idle" }));
          },
          result.method === "backend" ? 5000 : 3000,
        );
      } else {
        setExecutionStatus((prev) => ({ ...prev, [index]: "error" }));

        // Store error details
        setCommandResults((prev) => ({
          ...prev,
          [index]: {
            stderr: result.error,
            returncode: -1,
          },
        }));

        console.error("Command execution failed:", result.error);
      }
    } catch (error) {
      setExecutionStatus((prev) => ({ ...prev, [index]: "error" }));
      console.error("Command execution error:", error);
    }
  };

  const copyCommand = async (command: string) => {
    try {
      await navigator.clipboard.writeText(command);
    } catch (error) {
      console.error("Failed to copy command:", error);
    }
  };

  const copyAllCommands = async () => {
    const allCommands = commands.join("\n");
    try {
      await navigator.clipboard.writeText(allCommands);
    } catch (error) {
      console.error("Failed to copy commands:", error);
    }
  };

  const downloadScript = () => {
    const { blob, filename } = CommandExecutor.createExecutableScript(commands);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const executeAllInTerminal = async () => {
    try {
      setExecutionStatus((prev) => {
        const newStatus = { ...prev };
        commands.forEach((_, index) => {
          newStatus[index] = "executing";
        });
        return newStatus;
      });

      const result = await CommandExecutor.executeBatchInTerminal(commands);

      if (result.success) {
        setLastExecutionMethod("terminal_batch");

        // Mark all commands as success
        setExecutionStatus((prev) => {
          const newStatus = { ...prev };
          commands.forEach((_, index) => {
            newStatus[index] = "success";
          });
          return newStatus;
        });

        // Show success message
        setShowInstructions(true);

        setTimeout(() => {
          setExecutionStatus((prev) => {
            const newStatus = { ...prev };
            commands.forEach((_, index) => {
              newStatus[index] = "idle";
            });
            return newStatus;
          });
        }, 3000);
      } else {
        // Mark all as error
        setExecutionStatus((prev) => {
          const newStatus = { ...prev };
          commands.forEach((_, index) => {
            newStatus[index] = "error";
          });
          return newStatus;
        });

        console.error("Terminal batch execution failed:", result.error);
      }
    } catch (error) {
      console.error("Terminal execution error:", error);

      // Mark all as error
      setExecutionStatus((prev) => {
        const newStatus = { ...prev };
        commands.forEach((_, index) => {
          newStatus[index] = "error";
        });
        return newStatus;
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "executing":
        return <Play className="h-3 w-3 animate-spin" />;
      case "success":
        return <CheckCircle className="h-3 w-3 text-green-400" />;
      case "error":
        return <AlertTriangle className="h-3 w-3 text-red-400" />;
      default:
        return <Play className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "executing":
        return "bg-blue-500/10 text-blue-400 border-blue-400/20";
      case "success":
        return "bg-green-500/10 text-green-400 border-green-400/20";
      case "error":
        return "bg-red-500/10 text-red-400 border-red-400/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm">{title}</h4>
          <Badge variant="outline" className="text-xs">
            {platformEmoji} {platform}
          </Badge>
          <Badge
            variant="outline"
            className={`text-xs ${
              backendAvailable === true
                ? "text-green-400 bg-green-400/10 border-green-400/20"
                : backendAvailable === false
                  ? "text-red-400 bg-red-400/10 border-red-400/20"
                  : "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"
            }`}
          >
            {backendAvailable === true && "🐍 Backend Ready"}
            {backendAvailable === false && "⚠️ Backend Offline"}
            {backendAvailable === null && "🔄 Checking..."}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          {metadata && executedCommands.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVisualization(!showVisualization)}
              className={`h-7 px-2 text-xs ${showVisualization ? "text-blue-400 bg-blue-400/10" : ""}`}
              title="Toggle data visualization"
            >
              {showVisualization ? (
                <EyeOff className="h-3 w-3" />
              ) : (
                <BarChart3 className="h-3 w-3" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={executeAllInTerminal}
            className="h-7 px-2 text-xs"
            title="Run all commands in terminal"
          >
            <Terminal className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyAllCommands}
            className="h-7 px-2 text-xs"
            title="Copy all commands"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadScript}
            className="h-7 px-2 text-xs"
            title="Download as script"
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      {/* Instructions Alert */}
      {showInstructions && lastExecutionMethod === "clipboard" && (
        <Alert className="border-blue-400/20 bg-blue-400/5">
          <Info className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-blue-400">
            <strong>Command copied to clipboard!</strong>
            <br />
            {platformInstructions}
          </AlertDescription>
        </Alert>
      )}

      {showInstructions &&
        (lastExecutionMethod === "terminal_batch" ||
          lastExecutionMethod === "visible_terminal") && (
          <Alert className="border-green-400/20 bg-green-400/5">
            <Terminal className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-400">
              <strong>Terminal window opened!</strong>
              <br />
              Commands are running in a visible terminal window on your screen.
              You can see the real-time execution and output.
            </AlertDescription>
          </Alert>
        )}

      {/* Commands */}
      <div className="space-y-2">
        {commands.map((command, index) => {
          const status = executionStatus[index] || "idle";

          return (
            <div
              key={index}
              className={`border rounded-lg p-3 transition-all ${getStatusColor(status)}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {index + 1}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  Command
                </span>
              </div>

              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-background/50 p-2 rounded border font-mono break-all">
                  {command}
                </code>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyCommand(command)}
                    className="h-7 w-7 p-0"
                    title="Copy command"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => executeCommand(command, index)}
                    disabled={status === "executing"}
                    className={`h-7 w-7 p-0 ${getStatusColor(status)}`}
                    title="Run command"
                  >
                    {getStatusIcon(status)}
                  </Button>
                </div>
              </div>

              {/* Status message */}
              {status === "success" && lastExecutionMethod === "clipboard" && (
                <div className="mt-2 text-xs text-green-400">
                  ✓ Copied to clipboard - paste in your terminal
                </div>
              )}
              {status === "success" && lastExecutionMethod === "terminal" && (
                <div className="mt-2 text-xs text-green-400">
                  ✓ Opened in terminal
                </div>
              )}
              {status === "success" && lastExecutionMethod === "backend" && (
                <div className="mt-2 text-xs text-green-400">
                  ✓ Executed on your system via Python backend
                </div>
              )}
              {status === "success" &&
                lastExecutionMethod === "terminal_batch" && (
                  <div className="mt-2 text-xs text-green-400">
                    ✓ Opened in terminal window - commands are running visibly
                  </div>
                )}
              {status === "success" &&
                lastExecutionMethod === "visible_terminal" && (
                  <div className="mt-2 text-xs text-green-400">
                    ✓ Opened in terminal window - command is running visibly
                  </div>
                )}
              {status === "error" && (
                <div className="mt-2 text-xs text-red-400">
                  ✗ Failed to execute - try copying manually
                </div>
              )}

              {/* Command Results */}
              {commandResults[index] && (
                <div className="mt-3 space-y-2">
                  {commandResults[index].output && (
                    <div className="bg-black/20 border border-green-400/20 rounded p-2">
                      <div className="text-xs text-green-400 mb-1 font-medium">
                        ✅ Output:
                      </div>
                      <pre className="text-xs text-green-300 whitespace-pre-wrap font-mono">
                        {commandResults[index].output}
                      </pre>
                    </div>
                  )}

                  {commandResults[index].stderr && (
                    <div className="bg-black/20 border border-red-400/20 rounded p-2">
                      <div className="text-xs text-red-400 mb-1 font-medium">
                        ❌ Error:
                      </div>
                      <pre className="text-xs text-red-300 whitespace-pre-wrap font-mono">
                        {commandResults[index].stderr}
                      </pre>
                    </div>
                  )}

                  {commandResults[index].returncode !== undefined && (
                    <div className="text-xs text-muted-foreground">
                      Return code: {commandResults[index].returncode}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Metadata display */}
      {metadata && (
        <div className="text-xs bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-3 w-3 text-blue-400" />
            <span className="font-medium text-blue-400">Expected Results</span>
          </div>
          <div className="space-y-1 text-blue-300">
            <div>
              <strong>Data Type:</strong> {metadata.data_type}
            </div>
            <div>
              <strong>Output:</strong> {metadata.expected_output}
            </div>
            {metadata.key_metrics && metadata.key_metrics.length > 0 && (
              <div>
                <strong>Key Metrics:</strong> {metadata.key_metrics.join(", ")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Real-Time Data Visualization */}
      {showVisualization && metadata && executedCommands.length > 0 && (
        <div className="mt-4">
          <RealTimeVisualization
            metadata={metadata}
            commandResults={executedCommands}
          />
        </div>
      )}

      {/* Platform-specific help */}
      <div className="text-xs text-muted-foreground bg-muted/20 p-2 rounded border">
        <div className="flex items-center gap-1 mb-1">
          <ExternalLink className="h-3 w-3" />
          <span className="font-medium">
            Platform: {platform} {platformEmoji}
          </span>
        </div>
        <p>
          Commands will be copied to clipboard or opened in your system
          terminal.
          {metadata && executedCommands.length > 0 && (
            <span className="block mt-1 text-blue-400">
              Real-time data visualization available above.
            </span>
          )}
        </p>
      </div>
    </div>
  );
};
