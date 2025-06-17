export interface StreamingMessage {
  id: string;
  content: string;
  isComplete: boolean;
  timestamp: Date;
}

export interface LlamaMetrics {
  totalTokens: number;
  responseTime: number;
  modelUsed: string;
  temperature: number;
}

export interface RealTimeGraph {
  id: string;
  title: string;
  type: "line" | "bar" | "pie" | "area";
  data: any[];
  config: {
    xKey: string;
    yKey: string;
    color?: string;
    unit?: string;
  };
  severity: "low" | "medium" | "high" | "critical";
  category: "network" | "security" | "system" | "performance";
}

export interface AutoFixAction {
  id: string;
  title: string;
  description: string;
  commands: string[];
  riskLevel: "safe" | "caution" | "dangerous";
  estimatedTime: string;
  dependencies?: string[];
  rollbackCommands?: string[];
}

export interface LlamaResponse {
  content: string;
  metrics: LlamaMetrics;
  autoFix?: AutoFixAction[];
  graphs?: RealTimeGraph[];
  recommendations: string[];
}

export interface QueryContext {
  originalQuery: string;
  parsedIntent: string;
  entities: string[];
  confidence: number;
  category: "troubleshoot" | "analyze" | "monitor" | "secure";
}
