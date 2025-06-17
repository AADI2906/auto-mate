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
  History,
  Bookmark,
  Share,
  Download,
  Settings,
  Mic,
  MicOff,
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
        "Hello! I'm your AI Security Assistant. I can help you investigate network issues, analyze security incidents, and provide automated remediation. Try asking me questions like 'Why is VPN failing for user 10.1.1.10?' or 'Check posture compliance for device aa:bb:cc:dd:ee:ff'.",
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
    setCurrentInput("");
    setIsProcessing(true);

    try {
      // Parse the query using LLM
      const parsedQuery = await LLMQueryProcessor.simulateLLMProcessing(
        userMessage.content,
      );

      // Add parsing confirmation message
      const parsingMessage: ConversationMessage = {
        id: `parsing-${Date.now()}`,
        type: "system",
        content: `🧠 Analyzing query... Intent: ${parsedQuery.intent}, Confidence: ${Math.round(parsedQuery.confidence * 100)}%`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, parsingMessage]);

      // Orchestrate investigation
      const context =
        await AgentOrchestrator.orchestrateInvestigation(parsedQuery);

      setActiveContext(context);
      onContextChange?.(context);

      // Generate response based on analysis
      const response = generateResponseFromContext(context, parsedQuery);

      const assistantMessage: ConversationMessage = {
        id: `response-${Date.now()}`,
        type: "assistant",
        content: response,
        timestamp: new Date(),
        context,
        attachments: [
          {
            type: "dashboard",
            title: "Incident Analysis",
            data: context,
          },
        ],
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Auto-show dashboard for incident contexts
      if (context.agentTasks.length > 0 || context.correlations.length > 0) {
        setShowDashboard(true);
      }

      // Show remediation if we have suggested actions
      if (shouldShowRemediation(context)) {
        setShowRemediation(true);
      }
    } catch (error) {
      const errorMessage: ConversationMessage = {
        id: `error-${Date.now()}`,
        type: "assistant",
        content: `❌ I encountered an error while processing your request: ${error instanceof Error ? error.message : "Unknown error"}. Please try rephrasing your question.`,
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

  const [voiceRetryCount, setVoiceRetryCount] = useState(0);
  const [showVoiceError, setShowVoiceError] = useState(false);

  const checkNetworkConnectivity = async (): Promise<boolean> => {
    try {
      const response = await fetch('/ping', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch {
      // Fallback check using a reliable external service
      try {
        await fetch('https://www.google.com/favicon.ico', {
          mode: 'no-cors',
          cache: 'no-cache',
          signal: AbortSignal.timeout(3000)
        });
        return true;
      } catch {
        return navigator.onLine;
      }
    }
  };

  const handleVoiceInput = async () => {
    // Reset error state
    setShowVoiceError(false);

    // Check if speech recognition is supported
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari for voice input, or type your query manually.");
      return;
    }

    // Check network connectivity
    const isOnline = await checkNetworkConnectivity();
    if (!isOnline) {
      alert("Voice input requires an internet connection. Please check your network and try again, or type your query manually.");
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    // Configure recognition with better settings
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceRetryCount(0);
      console.log("🎤 Voice input started - speak now");

      // Add visual feedback
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
      console.log("🎤 Voice input ended");
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      console.error("Voice input error:", event.error);

      let errorMessage = "";
      let shouldRetry = false;

      switch (event.error) {
        case "no-speech":
          errorMessage = "No speech detected. Please try speaking again or type your query.";
          shouldRetry = voiceRetryCount < 2;
          break;
        case "network":
          errorMessage = "Network connection issue detected. Voice recognition requires internet access. Please check your connection or type your query manually.";
          shouldRetry = voiceRetryCount < 1;
          break;
        case "not-allowed":
          errorMessage = "Microphone access denied. Please allow microphone access in your browser settings, or type your query manually.";
          break;
        case "service-not-allowed":
          errorMessage = "Speech recognition service not available. Please type your query manually.";
          break;
        case "bad-grammar":
          errorMessage = "Speech recognition grammar error. Please try speaking more clearly or type your query.";
          break;
        case "language-not-supported":
          errorMessage = "Language not supported. Please type your query manually.";
          break;
        default:
          errorMessage = `Voice input temporarily unavailable (${event.error}). Please type your query manually.`;
          shouldRetry = voiceRetryCount < 1;
      }

      // Add error message to chat
      const errorChatMessage: ConversationMessage = {
        id: `voice-error-${Date.now()}`,
        type: "system",
        content: `❌ ${errorMessage}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorChatMessage]);

      // Auto-retry for certain errors
      if (shouldRetry && (event.error === "no-speech" || event.error === "network")) {
        setTimeout(() => {
          setVoiceRetryCount(prev => prev + 1);
          console.log(`Retrying voice input (attempt ${voiceRetryCount + 2})`);
          handleVoiceInput();
        }, 1500);
      } else {
        setShowVoiceError(true);
        // Focus on input field as fallback
        inputRef.current?.focus();
      }
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;

      setCurrentInput(transcript);
      console.log("🎤 Voice input result:", transcript, "Confidence:", confidence);

      // Add success message to chat
      const successMessage: ConversationMessage = {
        id: `voice-success-${Date.now()}`,
        type: "system",
        content: `✅ Voice input captured: "${transcript}" (${Math.round(confidence * 100)}% confidence)`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMessage]);

      // Auto-focus input field and optionally auto-submit if confidence is high
      inputRef.current?.focus();

      if (confidence > 0.8 && transcript.length > 10) {
        // Auto-submit if we're confident in the transcription
        setTimeout(() => {
          handleSendMessage();
        }, 500);
      }
    };

    try {
      recognition.start();
    } catch (error) {
      console.error("Failed to start voice recognition:", error);
      setIsListening(false);

      const fallbackMessage: ConversationMessage = {
        id: `voice-fallback-${Date.now()}`,
        type: "system",
        content: "❌ Voice input failed to start. Please type your query manually.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, fallbackMessage]);

      // Focus on input as fallback
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
                Powered by LLM + Multi-Agent System
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
            {/* Mobile menu for smaller screens */}
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
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                onClick={() => setShowDashboard(true)}
                                className="mr-2"
                              >
                                <Search className="h-3 w-3 mr-1" />
                                {attachment.title}
                              </Button>
                            ))}
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
                    {!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window) && (
                      <div className="text-xs text-muted-foreground mt-1">
                        💡 Voice input not supported in this browser. Use Chrome, Edge, or Safari for voice features.
                      </div>
                    )}
                  </div>
                    >
                      {isListening ? (
                        <div className="relative">
                          <Mic className="h-4 w-4" />
                          <div className="absolute inset-0 animate-ping">
                            <Mic className="h-4 w-4 opacity-30" />
                          </div>
                        </div>
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
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
                        // Re-run investigation with fresh data
                        setIsProcessing(true);
                        try {
                          const refreshedContext = await AgentOrchestrator.orchestrateInvestigation(activeContext.query);
                          setActiveContext(refreshedContext);
                          onContextChange?.(refreshedContext);

                          // Add refresh message
                          const refreshMessage: ConversationMessage = {
                            id: `refresh-${Date.now()}`,
                            type: "system",
                            content: "🔄 Context refreshed with latest telemetry data. Updated analysis available.",
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