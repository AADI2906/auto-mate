import React, { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Bot,
  User,
  Loader2,
  Brain,
  Zap,
  Copy,
  CheckCircle,
} from "lucide-react";

interface Message {
  id: string;
  type: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isFromLlama?: boolean;
}

export const SimpleAIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      type: "assistant",
      content: `🤖 **Llama 3.1:8b AI Assistant**

I'm your local AI assistant powered by Llama 3.1:8b. I can help you with:

• **Technical Support** - Network issues, system troubleshooting, CLI commands
• **Code Assistance** - Programming help, debugging, best practices
• **Security Analysis** - Threat assessment, security recommendations
• **System Administration** - Server management, configuration, monitoring
• **General Questions** - Information, explanations, guidance

**Environment Status:** ${window.location.hostname === "localhost" ? "🟢 Local (Real Llama Available)" : "🟡 Hosted (Simulated Responses)"}

Ask me anything! I'll provide detailed, practical responses.`,
      timestamp: new Date(),
    },
  ]);
  const [currentInput, setCurrentInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "unknown" | "connected" | "disconnected"
  >("unknown");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check Llama connection status on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { LlamaAPI } = await import("@/services/LlamaAPI");
        const connectionInfo = LlamaAPI.getConnectionInfo();
        setConnectionStatus(
          connectionInfo.canConnect ? "connected" : "disconnected",
        );
      } catch {
        setConnectionStatus("disconnected");
      }
    };
    checkConnection();
  }, []);

  const handleSendMessage = async () => {
    if (!currentInput.trim() || isProcessing) return;

    const userMessage: Message = {
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
    const streamingMessage: Message = {
      id: streamingMessageId,
      type: "assistant",
      content: "",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, streamingMessage]);

    try {
      // Import and use LlamaAPI
      const { LlamaAPI } = await import("@/services/LlamaAPI");

      console.log("Sending query to LlamaAPI:", originalQuery);
      let responseReceived = false;

      const result = await LlamaAPI.sendQuery(
        originalQuery,
        // onStream callback - update message content in real-time
        (chunk: string) => {
          responseReceived = true;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamingMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg,
            ),
          );
        },
        // onComplete callback
        (fullResponse: string, parsedSolution) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamingMessageId
                ? {
                    ...msg,
                    content: fullResponse,
                    isFromLlama: result?.isFromLlama ?? false,
                  }
                : msg,
            ),
          );
        },
        // onError callback
        (errorMessage: string) => {
          const errorNotification: Message = {
            id: `error-${Date.now()}`,
            type: "system",
            content: `⚠️ **Connection Issue:** ${errorMessage}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorNotification]);
        },
      );

      // If no streaming response was received, use the final response
      if (!responseReceived && result?.response) {
        console.log("Using final response:", result.response);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === streamingMessageId
              ? {
                  ...msg,
                  content: result.response,
                  isFromLlama: result.isFromLlama,
                }
              : msg,
          ),
        );
      } else if (!responseReceived) {
        // If no response at all, show a fallback message
        console.log("No response received, showing fallback");
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === streamingMessageId
              ? {
                  ...msg,
                  content: `I received your message: "${originalQuery}"\n\nHowever, I'm having trouble generating a response right now. This could be due to:\n\n• Llama service not running locally\n• Network connectivity issues\n• API response format issues\n\nPlease try:\n1. Check if Ollama is running: \`ollama serve\`\n2. Verify Llama 3.1:8b is installed: \`ollama pull llama3.1:8b\`\n3. Try asking a simpler question\n\nI'm here to help once the connection is established!`,
                  isFromLlama: false,
                }
              : msg,
          ),
        );
      }
    } catch (error) {
      // Remove the streaming message and add error
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== streamingMessageId),
      );

      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: "assistant",
        content: `❌ **Error Processing Request**

I encountered an error while processing your request: ${error instanceof Error ? error.message : "Unknown error"}

**Troubleshooting:**
• Make sure Ollama is running: \`ollama serve\`
• Verify Llama 3.1:8b is installed: \`ollama pull llama3.1:8b\`
• Check if the service is accessible: \`curl http://localhost:11434/api/tags\`

Please try again or rephrase your question.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "text-green-400";
      case "disconnected":
        return "text-yellow-400";
      default:
        return "text-gray-400";
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "Llama Connected";
      case "disconnected":
        return "Simulated Mode";
      default:
        return "Checking...";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <Card className="p-4 bg-background/50 backdrop-blur border-border/50 rounded-b-none border-b-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold">AI Assistant</h3>
              <p className="text-xs text-muted-foreground">
                Powered by Llama 3.1:8b
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs ${getConnectionStatusColor()}`}
            >
              <div
                className={`w-2 h-2 rounded-full mr-2 ${
                  connectionStatus === "connected"
                    ? "bg-green-400"
                    : connectionStatus === "disconnected"
                      ? "bg-yellow-400"
                      : "bg-gray-400"
                }`}
              />
              {getConnectionStatusText()}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Messages */}
      <Card className="flex-1 flex flex-col bg-background/50 backdrop-blur border-border/50 rounded-t-none">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.type !== "user" && (
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mt-1 flex-shrink-0 ${
                      message.type === "assistant"
                        ? "bg-primary/20"
                        : "bg-muted/50"
                    }`}
                  >
                    {message.type === "assistant" ? (
                      <Bot className="h-4 w-4 text-primary" />
                    ) : (
                      <Zap className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-lg p-4 ${
                    message.type === "user"
                      ? "bg-primary text-primary-foreground"
                      : message.type === "system"
                        ? "bg-muted/50 text-muted-foreground"
                        : "bg-muted"
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/20">
                    <div className="flex items-center gap-2">
                      <span className="text-xs opacity-70">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                      {message.isFromLlama !== undefined && (
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            message.isFromLlama
                              ? "text-green-400 bg-green-400/10"
                              : "text-yellow-400 bg-yellow-400/10"
                          }`}
                        >
                          {message.isFromLlama ? "Real Llama" : "Simulated"}
                        </Badge>
                      )}
                    </div>

                    {message.type === "assistant" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(message.content)}
                        className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
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
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-border/50">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about tech, coding, security, or administration..."
                disabled={isProcessing}
                className="pr-4"
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!currentInput.trim() || isProcessing}
              size="sm"
              className="h-10"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Ready
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
