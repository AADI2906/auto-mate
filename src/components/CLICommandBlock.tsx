import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CommandExecutor from "@/utils/CommandExecutor";
import {
  Play,
  Copy,
  Download,
  Terminal,
  CheckCircle,
  AlertTriangle,
  Info,
  ExternalLink,
} from "lucide-react";

interface CLICommandBlockProps {
  commands: string[];
  title?: string;
  description?: string;
}

export const CLICommandBlock: React.FC<CLICommandBlockProps> = ({
  commands,
  title = "CLI Commands",
  description,
}) => {
  const [executionStatus, setExecutionStatus] = useState<{
    [key: string]: "idle" | "executing" | "success" | "error";
  }>({});
  const [lastExecutionMethod, setLastExecutionMethod] = useState<string>("");
  const [showInstructions, setShowInstructions] = useState(false);

  const platform = CommandExecutor.detectPlatform();
  const platformEmoji = CommandExecutor.getPlatformEmoji();
  const platformInstructions = CommandExecutor.getPlatformInstructions();

  const executeCommand = async (command: string, index: number) => {
    setExecutionStatus((prev) => ({ ...prev, [index]: "executing" }));

    try {
      const result = await CommandExecutor.executeCommand(command);

      if (result.success) {
        setExecutionStatus((prev) => ({ ...prev, [index]: "success" }));
        setLastExecutionMethod(result.method);

        if (result.method === "clipboard") {
          setShowInstructions(true);
        }

        // Reset status after 3 seconds
        setTimeout(() => {
          setExecutionStatus((prev) => ({ ...prev, [index]: "idle" }));
        }, 3000);
      } else {
        setExecutionStatus((prev) => ({ ...prev, [index]: "error" }));
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
        </div>

        <div className="flex items-center gap-1">
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
              {status === "error" && (
                <div className="mt-2 text-xs text-red-400">
                  ✗ Failed to execute - try copying manually
                </div>
              )}
            </div>
          );
        })}
      </div>

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
        </p>
      </div>
    </div>
  );
};
