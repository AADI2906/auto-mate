import React, { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ConversationMessage,
  IncidentContext,
  RemediationAction,
  AuditLogEntry,
  ParsedQuery,
} from "@/types/nlp";
import { ParsedSolution } from "@/services/LlamaAPI";
import { AutoFixPanel } from "./AutoFixPanel";
import { LLMQueryProcessor } from "./LLMQueryProcessor";
import { AgentOrchestrator } from "./AgentOrchestrator";
import { DynamicIncidentDashboard } from "./DynamicIncidentDashboard";
import { RemediationWorkflow } from "./RemediationWorkflow";
import {
  Send,
  Brain,
  User,
  Bot,
  Loader2,
  Lightbulb,
  Search,
  Settings,
  Mic,
  Zap,
} from "lucide-react";

interface NaturalLanguageInterfaceProps {
  onContextChange?: (context: IncidentContext | null) => void;
}

export const NaturalLanguageInterface: React.FC<
  NaturalLanguageInterfaceProps
> = ({ onContextChange }) => {
  const [messages, setMessages] = useState<ConversationMessage[]>([
    {
      id: "welcome",
      type: "assistant",
      content:
        '🤖 **Welcome to NeuroSecure AI Assistant**\n\nPowered by **Llama 3.1:8b** running locally on your machine, I provide real-time analysis and automated CLI-based solutions.\n\n**I can help you with:**\n• Network troubleshooting (VPN, connectivity, performance)\n• Security incident analysis and response\n• System performance optimization\n• Automated remediation with CLI commands\n\n**Try asking:**\n• "VPN not working"\n• "Network is slow"\n• "Authentication issues"\n• "Check system performance"\n\nI\'ll provide instant responses with specific CLI commands and auto-fix options! 🚀',
      timestamp: new Date(),
    },
  ]);
  const [currentInput, setCurrentInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeContext, setActiveContext] = useState<IncidentContext | null>(
    null,
  );
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showRemediation, setShowRemediation] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!currentInput.trim() || isProcessing) return;

    const userMessage: ConversationMessage = {
      id: `msg-${Date.now()}`,
      type: "user",
      content: currentInput.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const originalQuery = currentInput.trim();
    setCurrentInput("");
    setIsProcessing(true);

    // Create streaming message placeholder
    const streamingMessageId = `stream-${Date.now()}`;
    const streamingMessage: ConversationMessage = {
      id: streamingMessageId,
      type: "assistant",
      content: "",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, streamingMessage]);

    try {
      // Import LlamaAPI
      const { LlamaAPI } = await import("@/services/LlamaAPI");

      // Get real-time response from local Llama
      const {
        response,
        solution,
        isFromLlama,
        error: llamaError,
      } = await LlamaAPI.sendQuery(
        originalQuery,
        // onStream callback - update message content in real-time
        (chunk: string) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamingMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg,
            ),
          );
        },
        // onComplete callback - add auto-fix capabilities
        (fullResponse: string, parsedSolution) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamingMessageId
                ? {
                    ...msg,
                    content: fullResponse,
                    solution: parsedSolution,
                    attachments: [
                      {
                        type: "autofix",
                        title: "Auto-Fix Available",
                        data: parsedSolution,
                      },
                      {
                        type: "dashboard",
                        title: "Real-Time Analysis",
                        data: {
                          solution: parsedSolution,
                          query: originalQuery,
                        },
                      },
                    ],
                  }
                : msg,
            ),
          );

          // Generate incident context for compatibility
          const mockContext: IncidentContext = {
            id: `llama-${Date.now()}`,
            query: {
              originalQuery,
              intent: parsedSolution.category,
              entities: [],
              confidence: 0.9,
              timestamp: new Date(),
            },
            agentTasks: [],
            correlations: [],
            affectedAssets: [],
            severity: parsedSolution.severity,
            status: "active",
            timeline: [
              {
                timestamp: new Date(),
                event: "AI Analysis Complete",
                source: "Llama 3.1:8b",
                severity: "info",
              },
            ],
            createdAt: new Date(),
            lastUpdated: new Date(),
          };

          setActiveContext(mockContext);
          onContextChange?.(mockContext);

          // Auto-show panels based on solution
          if (parsedSolution.cliCommands.length > 0) {
            setShowRemediation(true);
          }
          setShowDashboard(true);
        },
        // onError callback - handle connection issues
        (errorMessage: string) => {
          const errorNotification: ConversationMessage = {
            id: `error-notify-${Date.now()}`,
            type: "system",
            content: `⚠️ **Connection Warning:** ${errorMessage}\n\nFalling back to simulated responses...`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorNotification]);
        },
      );

      // Add system message with analysis summary
      const analysisMessage: ConversationMessage = {
        id: `analysis-${Date.now()}`,
        type: "system",
        content: `${isFromLlama ? "🤖 **Llama 3.1:8b Analysis Complete**" : "🔄 **Simulated Analysis Complete**"}

${!isFromLlama && llamaError ? `⚠️ **Connection Issue:** ${llamaError}\n` : ""}
✅ **Category:** ${solution.category}
⚡ **Severity:** ${solution.severity}
🛡️ **Risk Level:** ${solution.riskLevel}
⏱️ **Estimated Fix Time:** ${solution.estimatedTime}
🔧 **CLI Commands Available:** ${solution.cliCommands.length}

${solution.cliCommands.length > 0 ? "Auto-fix and review buttons are now available!" : "No automated fixes available for this query."}

${!isFromLlama ? "\n💡 **Note:** Using simulated responses. To enable real Llama analysis, ensure Ollama is running locally and accessible." : ""}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, analysisMessage]);
    } catch (error) {
      // Remove the streaming message and add error
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== streamingMessageId),
      );

      const errorMessage: ConversationMessage = {
        id: `error-${Date.now()}`,
        type: "assistant",
        content: `❌ **Llama Connection Error**

I couldn't connect to your local Llama 3.1:8b instance. This could be because:

• Ollama is not running on localhost:11434
• Llama 3.1:8b model is not installed
• Network connectivity issues

**Quick fixes:**
\`\`\`bash
# Start Ollama (if not running)
ollama serve

# Pull Llama 3.1:8b model (if not installed)
ollama pull llama3.1:8b

# Check if Ollama is running
curl http://localhost:11434/api/tags
\`\`\`

You can still use the dashboard and analysis features. Please check your Ollama setup and try again.

**Error details:** ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateResponseFromContext = (
    context: IncidentContext,
    query: ParsedQuery,
  ): string => {
    const { agentTasks, correlations, affectedAssets, severity } = context;

    let response = `I've analyzed your query about "${query.originalQuery}" and here's what I found:\n\n`;

    // Summary of investigation
    response += `📊 **Investigation Summary:**\n`;
    response += `• Deployed ${agentTasks.length} specialized agents\n`;
    response += `• Found ${correlations.length} correlations across systems\n`;
    response += `• Identified ${affectedAssets.length} affected assets\n`;
    response += `• Incident severity: ${severity.toUpperCase()}\n\n`;

    // Key findings
    if (correlations.length > 0) {
      response += `🔍 **Key Findings:**\n`;
      correlations.slice(0, 3).forEach((corr, index) => {
        response += `${index + 1}. ${corr.description} (${Math.round(corr.strength * 100)}% confidence)\n`;
      });
      response += "\n";
    }

    // Affected assets
    if (affectedAssets.length > 0) {
      response += `🎯 **Affected Assets:**\n`;
      affectedAssets.slice(0, 5).forEach((asset) => {
        response += `• ${asset.name} (${asset.ipAddress}) - ${asset.status} - ${asset.impact} impact\n`;
      });
      if (affectedAssets.length > 5) {
        response += `• ... and ${affectedAssets.length - 5} more assets\n`;
      }
      response += "\n";
    }

    // Agent results summary
    const completedTasks = agentTasks.filter((t) => t.status === "completed");
    if (completedTasks.length > 0) {
      response += `📡 **Telemetry Analysis:**\n`;
      completedTasks.forEach((task) => {
        const eventCount = task.result?.metadata.count || 0;
        response += `• ${task.agentType.replace("_agent", "").toUpperCase()}: ${eventCount} events analyzed\n`;
      });
      response += "\n";
    }

    // Next steps
    response += `🚀 **Next Steps:**\n`;
    response += `• Review the detailed analysis in the dashboard\n`;
    if (shouldShowRemediation(context)) {
      response += `• Consider the automated remediation options\n`;
    }
    response += `• Ask follow-up questions for deeper analysis\n`;

    return response;
  };

  const shouldShowRemediation = (context: IncidentContext): boolean => {
    // Show remediation for certain types of incidents
    const query = context.query.originalQuery.toLowerCase();
    return (
      query.includes("fail") ||
      query.includes("slow") ||
      query.includes("auth") ||
      query.includes("vpn") ||
      context.severity === "high" ||
      context.severity === "critical"
    );
  };

  const handleSuggestionClick = (suggestion: string) => {
    setCurrentInput(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRemediationExecuted = (action: RemediationAction) => {
    const message: ConversationMessage = {
      id: `remediation-${Date.now()}`,
      type: "system",
      content: `✅ Executed remediation action: ${action.title} - Status: ${action.status}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
  };

  const handleAuditLog = (entry: AuditLogEntry) => {
    setAuditLog((prev) => [entry, ...prev]);
  };

  const handleVoiceInput = () => {
    // Check browser compatibility first
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      const message: ConversationMessage = {
        id: `voice-unsupported-${Date.now()}`,
        type: "system",
        content:
          "❌ Voice input not supported in this browser. Please use Chrome, Edge, or Safari, or type your query manually.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, message]);
      inputRef.current?.focus();
      return;
    }

    // Check if online
    if (!navigator.onLine) {
      const message: ConversationMessage = {
        id: `voice-offline-${Date.now()}`,
        type: "system",
        content:
          "❌ Voice input requires internet connection. Please check your network or type your query manually.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, message]);
      inputRef.current?.focus();
      return;
    }

    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    // Configure recognition
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      const message: ConversationMessage = {
        id: `voice-start-${Date.now()}`,
        type: "system",
        content: "🎤 Listening... Speak your security query now.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, message]);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);

      let errorMessage = "";
      switch (event.error) {
        case "network":
          errorMessage =
            "❌ Network error: Voice recognition service unavailable. Please check your internet connection and try again, or type your query manually.";
          break;
        case "not-allowed":
          errorMessage =
            "❌ Microphone access denied. Please allow microphone access in browser settings, or type your query manually.";
          break;
        case "no-speech":
          errorMessage =
            "❌ No speech detected. Please try again or type your query manually.";
          break;
        default:
          errorMessage = `❌ Voice input error: ${event.error}. Please type your query manually.`;
      }

      const message: ConversationMessage = {
        id: `voice-error-${Date.now()}`,
        type: "system",
        content: errorMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, message]);
      inputRef.current?.focus();
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setCurrentInput(transcript);

      const message: ConversationMessage = {
        id: `voice-success-${Date.now()}`,
        type: "system",
        content: `✅ Voice input: "${transcript}"`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, message]);

      inputRef.current?.focus();
    };

    try {
      recognition.start();
    } catch (error) {
      setIsListening(false);
      const message: ConversationMessage = {
        id: `voice-failed-${Date.now()}`,
        type: "system",
        content:
          "❌ Failed to start voice recognition. Please type your query manually.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, message]);
      inputRef.current?.focus();
    }
  };

  const suggestions = LLMQueryProcessor.generateQuerySuggestions();

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <Card className="p-4 bg-background/50 backdrop-blur border-border/50 rounded-b-none border-b-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold">AI Security Assistant</h3>
              <p className="text-xs text-muted-foreground">
                Powered by Llama 3.1:8b + Real-Time CLI Solutions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDashboard(!showDashboard)}
              disabled={!activeContext}
              className="hidden sm:flex"
            >
              <Search className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRemediation(!showRemediation)}
              disabled={!activeContext || !shouldShowRemediation(activeContext)}
              className="hidden sm:flex"
            >
              <Lightbulb className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Remediation</span>
            </Button>
            <div className="flex sm:hidden gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDashboard(!showDashboard)}
                disabled={!activeContext}
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRemediation(!showRemediation)}
                disabled={
                  !activeContext || !shouldShowRemediation(activeContext)
                }
              >
                <Lightbulb className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {activeContext && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border/20">
            <Badge variant="outline" className="text-xs">
              Active Investigation: {activeContext.id}
            </Badge>
            <Badge className="text-orange-400 bg-orange-400/10 text-xs">
              {activeContext.status}
            </Badge>
            <Badge className="text-red-400 bg-red-400/10 text-xs">
              {activeContext.severity}
            </Badge>
          </div>
        )}
      </Card>

      <div className="flex flex-1 overflow-hidden">
        <div
          className={`flex ${showDashboard || showRemediation ? "flex-col lg:flex-row" : "flex-col"} flex-1 gap-4 p-4 overflow-hidden`}
        >
          {/* Chat Interface */}
          <div
            className={`${showDashboard || showRemediation ? "lg:flex-1" : "flex-1"} flex flex-col min-w-0`}
          >
            {/* Messages */}
            <Card className="flex-1 flex flex-col bg-background/50 backdrop-blur border-border/50">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.type === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      {message.type !== "user" && (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mt-1 flex-shrink-0">
                          {message.type === "assistant" ? (
                            <Bot className="h-4 w-4 text-primary" />
                          ) : (
                            <Brain className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      )}

                      <div
                        className={`max-w-[80%] ${
                          message.type === "user"
                            ? "bg-primary text-primary-foreground"
                            : message.type === "system"
                              ? "bg-muted/50 text-muted-foreground"
                              : "bg-muted"
                        } rounded-lg p-3`}
                      >
                        <div className="whitespace-pre-wrap text-sm">
                          {message.content}
                        </div>
                        <div className="text-xs opacity-70 mt-2">
                          {message.timestamp.toLocaleTimeString()}
                        </div>

                        {message.attachments && (
                          <div className="mt-3 pt-3 border-t border-border/20">
                            {message.attachments.map((attachment, index) => (
                              <div key={index} className="mb-2">
                                {attachment.type === "autofix" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowRemediation(true)}
                                    className="mr-2"
                                  >
                                    <Zap className="h-3 w-3 mr-1" />
                                    {attachment.title}
                                  </Button>
                                )}
                                {attachment.type === "dashboard" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowDashboard(true)}
                                    className="mr-2"
                                  >
                                    <Search className="h-3 w-3 mr-1" />
                                    {attachment.title}
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Auto-Fix Panel for messages with solutions */}
                        {(message as any).solution &&
                          message.type === "assistant" && (
                            <div className="mt-4">
                              <AutoFixPanel
                                solution={(message as any).solution}
                                onExecuteCommand={async (command: string) => {
                                  // Simulate command execution
                                  await new Promise((resolve) =>
                                    setTimeout(
                                      resolve,
                                      1000 + Math.random() * 2000,
                                    ),
                                  );

                                  // Mock execution results
                                  const isSuccess = Math.random() > 0.2; // 80% success rate
                                  const mockOutput = isSuccess
                                    ? `Command executed successfully:\n${command}\n\nProcess completed at ${new Date().toLocaleTimeString()}`
                                    : `Command failed with error:\nPermission denied or service unavailable`;

                                  return {
                                    success: isSuccess,
                                    output: isSuccess ? mockOutput : "",
                                    error: isSuccess ? undefined : mockOutput,
                                  };
                                }}
                                onReviewAll={() => {
                                  const reviewMessage: ConversationMessage = {
                                    id: `review-${Date.now()}`,
                                    type: "system",
                                    content: `📋 **Command Review Requested**

All commands have been copied to your clipboard for manual review. Please verify each command before execution in your terminal.

**Safety Reminder:**
• Test commands in a non-production environment first
• Ensure you have proper backups
• Review each command for your specific system configuration`,
                                    timestamp: new Date(),
                                  };
                                  setMessages((prev) => [
                                    ...prev,
                                    reviewMessage,
                                  ]);
                                }}
                              />
                            </div>
                          )}
                      </div>

                      {message.type === "user" && (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mt-1 flex-shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  ))}

                  {isProcessing && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Analyzing query and dispatching agents...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="p-4 border-t border-border/50">
                {/* Suggestions */}
                {messages.length <= 1 && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-2">
                      Try these examples:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.slice(0, 3).map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="text-xs"
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      ref={inputRef}
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask me about network issues, security incidents, or system performance..."
                      disabled={isProcessing}
                      className="pr-10"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleVoiceInput}
                      disabled={isProcessing || isListening}
                      className={`absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 transition-colors ${
                        isListening
                          ? "text-red-400 bg-red-400/10 animate-pulse"
                          : "text-muted-foreground hover:text-primary"
                      }`}
                      title={
                        isListening
                          ? "Listening..."
                          : "Click to use voice input"
                      }
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!currentInput.trim() || isProcessing}
                    size="sm"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Dynamic Panels */}
          {showDashboard && activeContext && (
            <div className="w-full lg:w-1/2 flex flex-col min-w-0">
              <Card className="flex-1 overflow-hidden bg-background/50 backdrop-blur border-border/50">
                <div className="p-3 lg:p-4 border-b border-border/50 flex items-center justify-between">
                  <h3 className="font-semibold text-sm lg:text-base">
                    Incident Dashboard
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDashboard(false)}
                    className="h-8 w-8 p-0"
                  >
                    ×
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-3 lg:p-4">
                    <DynamicIncidentDashboard
                      context={activeContext}
                      onRefresh={async () => {
                        setIsProcessing(true);
                        try {
                          const refreshedContext =
                            await AgentOrchestrator.orchestrateInvestigation(
                              activeContext.query,
                            );
                          setActiveContext(refreshedContext);
                          onContextChange?.(refreshedContext);

                          const refreshMessage: ConversationMessage = {
                            id: `refresh-${Date.now()}`,
                            type: "system",
                            content:
                              "🔄 Context refreshed with latest telemetry data. Updated analysis available.",
                            timestamp: new Date(),
                          };
                          setMessages((prev) => [...prev, refreshMessage]);
                        } catch (error) {
                          console.error("Refresh failed:", error);
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                    />
                  </div>
                </ScrollArea>
              </Card>
            </div>
          )}

          {showRemediation &&
            activeContext &&
            shouldShowRemediation(activeContext) && (
              <div className="w-full lg:w-1/2 flex flex-col min-w-0">
                <Card className="flex-1 overflow-hidden bg-background/50 backdrop-blur border-border/50">
                  <div className="p-3 lg:p-4 border-b border-border/50 flex items-center justify-between">
                    <h3 className="font-semibold text-sm lg:text-base">
                      Automated Remediation
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRemediation(false)}
                      className="h-8 w-8 p-0"
                    >
                      ×
                    </Button>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-3 lg:p-4">
                      <RemediationWorkflow
                        context={activeContext}
                        onActionExecuted={handleRemediationExecuted}
                        onAuditLog={handleAuditLog}
                      />
                    </div>
                  </ScrollArea>
                </Card>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
