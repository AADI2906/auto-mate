import {
  ParsedQuery,
  QueryIntent,
  TaskType,
  ExtractedEntity,
  EntityType,
} from "@/types/nlp";

export class LLMQueryProcessor {
  private static intentPatterns: Record<string, QueryIntent> = {
    "why.*fail|failing|failed|broken|down|not work": "root_cause_analysis",
    "posture|compliance|policy|compliant": "posture_validation",
    "slow|performance|latency|speed|throughput": "performance_troubleshoot",
    "security|threat|attack|breach|suspicious": "security_investigation",
    "network|connection|routing|ping|trace": "network_diagnostics",
    "compliance|audit|regulation|standard": "compliance_check",
  };

  private static taskTypePatterns: Record<string, TaskType> = {
    "diagnose|check|test|verify": "diagnostic",
    "investigate|analyze|examine|research": "investigative",
    "fix|repair|resolve|remediate": "remediation",
    "monitor|watch|track|observe": "monitoring",
    "report|summary|status|overview": "reporting",
  };

  private static entityPatterns: Record<string, EntityType> = {
    "\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b":
      "ip_address",
    "\\b[a-zA-Z0-9]([a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?\\.[a-zA-Z]{2,}\\b":
      "hostname",
    "\\b(?:tcp|udp|icmp|http|https|ftp|ssh|telnet|snmp)\\b": "protocol",
    "\\b(?:port\\s+)?(\\d{1,5})\\b": "port",
    "\\b(?:user|username)\\s+([a-zA-Z0-9._-]+)": "user_id",
    "\\b[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}\\b":
      "device_id",
    "\\berror\\s+(\\d+)\\b": "error_code",
    "\\b(?:service|daemon)\\s+([a-zA-Z0-9._-]+)": "service_name",
  };

  static parseQuery(query: string): ParsedQuery {
    const intent = this.extractIntent(query);
    const taskType = this.extractTaskType(query);
    const entities = this.extractEntities(query);
    const confidence = this.calculateConfidence(intent, taskType, entities);

    return {
      intent,
      entities,
      taskType,
      confidence,
      originalQuery: query,
      timestamp: new Date(),
      timeRange: { start: new Date(), end: new Date() },
    };
  }

  private static extractIntent(query: string): QueryIntent {
    const lowerQuery = query.toLowerCase();

    for (const [pattern, intent] of Object.entries(this.intentPatterns)) {
      if (new RegExp(pattern, "i").test(lowerQuery)) {
        return intent;
      }
    }

    // Default based on keywords
    if (lowerQuery.includes("why")) return "root_cause_analysis";
    if (lowerQuery.includes("security")) return "security_investigation";
    if (lowerQuery.includes("network")) return "network_diagnostics";

    return "root_cause_analysis"; // Default fallback
  }

  private static extractTaskType(query: string): TaskType {
    const lowerQuery = query.toLowerCase();

    for (const [pattern, taskType] of Object.entries(this.taskTypePatterns)) {
      if (new RegExp(pattern, "i").test(lowerQuery)) {
        return taskType;
      }
    }

    // Infer from intent patterns
    if (lowerQuery.includes("why") || lowerQuery.includes("fail"))
      return "investigative";
    if (lowerQuery.includes("fix") || lowerQuery.includes("resolve"))
      return "remediation";

    return "diagnostic"; // Default fallback
  }

  private static extractEntities(query: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    for (const [pattern, entityType] of Object.entries(this.entityPatterns)) {
      const regex = new RegExp(pattern, "gi");
      let match;

      while ((match = regex.exec(query)) !== null) {
        const value = match[1] || match[0];
        const confidence = this.calculateEntityConfidence(entityType, value);

        entities.push({
          type: entityType,
          value: value.trim(),
          confidence,
          context: this.getEntityContext(query, match.index, match[0].length),
        });
      }
    }

    // Special handling for timestamps
    const timeEntities = this.extractTimeEntities(query);
    entities.push(...timeEntities);

    return this.deduplicateEntities(entities);
  }

  private static extractTimeEntities(query: string): ExtractedEntity[] {
    const timePatterns = [
      {
        pattern: /\b(?:last|past)\s+(\d+)\s+(minute|hour|day|week|month)s?\b/gi,
        type: "timestamp" as EntityType,
      },
      {
        pattern: /\b(yesterday|today|now)\b/gi,
        type: "timestamp" as EntityType,
      },
      {
        pattern: /\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})\b/gi,
        type: "timestamp" as EntityType,
      },
      {
        pattern: /\b(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?)\b/gi,
        type: "timestamp" as EntityType,
      },
    ];

    const entities: ExtractedEntity[] = [];

    timePatterns.forEach(({ pattern, type }) => {
      let match;
      while ((match = pattern.exec(query)) !== null) {
        entities.push({
          type,
          value: match[0],
          confidence: 0.9,
          context: this.getEntityContext(query, match.index, match[0].length),
        });
      }
    });

    return entities;
  }

  private static getEntityContext(
    query: string,
    startIndex: number,
    length: number,
  ): string {
    const contextStart = Math.max(0, startIndex - 20);
    const contextEnd = Math.min(query.length, startIndex + length + 20);
    return query.slice(contextStart, contextEnd);
  }

  private static calculateEntityConfidence(
    entityType: EntityType,
    value: string,
  ): number {
    switch (entityType) {
      case "ip_address":
        return this.isValidIP(value) ? 0.95 : 0.7;
      case "protocol":
        return this.isKnownProtocol(value) ? 0.9 : 0.6;
      case "port":
        const port = parseInt(value);
        return port > 0 && port <= 65535 ? 0.9 : 0.5;
      default:
        return 0.8;
    }
  }

  private static isValidIP(ip: string): boolean {
    const parts = ip.split(".");
    if (parts.length !== 4) return false;
    return parts.every((part) => {
      const num = parseInt(part);
      return num >= 0 && num <= 255;
    });
  }

  private static isKnownProtocol(protocol: string): boolean {
    const knownProtocols = [
      "tcp",
      "udp",
      "icmp",
      "http",
      "https",
      "ftp",
      "ssh",
      "telnet",
      "snmp",
    ];
    return knownProtocols.includes(protocol.toLowerCase());
  }

  private static calculateConfidence(
    intent: QueryIntent,
    taskType: TaskType,
    entities: ExtractedEntity[],
  ): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence based on entities found
    if (entities.length > 0) {
      const avgEntityConfidence =
        entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length;
      confidence += avgEntityConfidence * 0.3;
    }

    // Boost for specific entity types that are highly valuable
    const hasIP = entities.some((e) => e.type === "ip_address");
    const hasTimestamp = entities.some((e) => e.type === "timestamp");
    const hasUserOrDevice = entities.some(
      (e) => e.type === "user_id" || e.type === "device_id",
    );

    if (hasIP) confidence += 0.1;
    if (hasTimestamp) confidence += 0.1;
    if (hasUserOrDevice) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private static deduplicateEntities(
    entities: ExtractedEntity[],
  ): ExtractedEntity[] {
    const seen = new Set<string>();
    return entities.filter((entity) => {
      const key = `${entity.type}:${entity.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  static async simulateLLMProcessing(query: string): Promise<ParsedQuery> {
    try {
      // Try to call local Llama 3.1 first
      const llamaResponse = await this.callLocalLlama(query);
      return this.parseLlamaResponse(llamaResponse, query);
    } catch (error) {
      console.warn('Local Llama API failed, falling back to local processing:', error);
      return this.parseQueryLocally(query);
    }
  }

  private static async callLocalLlama(query: string): Promise<any> {
    // Default Ollama/Llama endpoints - adjust port if needed
    const llamaEndpoints = [
      'http://localhost:11434/api/generate',  // Ollama default
      'http://localhost:8080/v1/chat/completions',  // llama.cpp server
      'http://localhost:5000/api/generate',  // Custom endpoint
    ];

    const systemPrompt = `You are a security operations AI assistant. Analyze the user query and extract information in JSON format.

Extract:
1. intent: (investigation, remediation, monitoring, analysis, etc.)
2. entities: array of IPs, usernames, devices, ports, etc. mentioned
3. timeRange: if mentioned, otherwise null
4. confidence: your confidence level (0.0-1.0)

Example response:
{
  "intent": "investigation",
  "entities": ["10.1.1.10", "VPN"],
  "timeRange": null,
  "confidence": 0.9
}

User query: ${query}

Respond only with valid JSON:`;

    for (const endpoint of llamaEndpoints) {
      try {
        let requestBody;
        let headers = { 'Content-Type': 'application/json' };

        if (endpoint.includes('ollama') || endpoint.includes('11434')) {
          // Ollama format
          requestBody = {
            model: 'llama3.1',
            prompt: systemPrompt,
            stream: false,
            options: {
              temperature: 0.3,
              top_p: 0.9,
            }
          };
        } else if (endpoint.includes('chat/completions')) {
          // OpenAI-compatible format (llama.cpp server)
          requestBody = {
            model: 'llama3.1',
            messages: [
              {
                role: 'system',
                content: 'You are a security operations AI assistant. Extract query information as JSON.'
              },
              {
                role: 'user',
                content: systemPrompt
              }
            ],
            temperature: 0.3,
            max_tokens: 500,
          };
        } else {
          // Generic format
          requestBody = {
            prompt: systemPrompt,
            max_tokens: 500,
            temperature: 0.3,
          };
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Connected to Llama at:', endpoint);
          return { data, endpoint };
        }
      } catch (error) {
        console.log(`❌ Failed to connect to ${endpoint}:`, error.message);
        continue;
      }
    }

    throw new Error('All Llama endpoints failed');
  }

  private static parseLlamaResponse(llamaResponse: any, originalQuery: string): ParsedQuery {
    try {
      let responseText = '';
      
      // Extract response text based on endpoint format
      if (llamaResponse.endpoint.includes('ollama')) {
        responseText = llamaResponse.data.response;
      } else if (llamaResponse.endpoint.includes('chat/completions')) {
        responseText = llamaResponse.data.choices[0]?.message?.content;
      } else {
        responseText = llamaResponse.data.text || llamaResponse.data.response;
      }

      // Clean up the response and extract JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Llama response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        originalQuery,
        intent: parsed.intent || 'investigation',
        entities: Array.isArray(parsed.entities) ? parsed.entities : [],
        timeRange: parsed.timeRange || { 
          start: new Date(Date.now() - 24 * 60 * 60 * 1000), 
          end: new Date() 
        },
        confidence: Math.min(Math.max(parsed.confidence || 0.8, 0.0), 1.0),
        taskType: this.extractTaskType(originalQuery),
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to parse Llama response:', error);
      console.log('Raw Llama response:', llamaResponse);
      return this.parseQueryLocally(originalQuery);
    }
  }

  private static parseQueryLocally(query: string): ParsedQuery {
    console.log('🔄 Using local parsing fallback');
    const parsed = this.parseQuery(query);
    
    // Add some randomization to simulate uncertainty
    if (Math.random() < 0.1) {
      parsed.confidence *= 0.8;
    }
    
    return parsed;
  }

  static generateQuerySuggestions(): string[] {
    return [
      "Why is VPN failing for user 10.1.1.10?",
      "Check posture compliance for device aa:bb:cc:dd:ee:ff",
      "Investigate slow performance on port 443",
      "Why can't user john.doe authenticate to ISE?",
      "Analyze suspicious traffic from 192.168.1.100",
      "Check firewall logs for blocked connections",
      "Investigate DNS resolution failures",
      "Why is switch interface down?",
      "Check bandwidth utilization on core network",
      "Analyze failed login attempts last 24 hours",
    ];
  }
}
