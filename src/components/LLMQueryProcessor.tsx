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

  static async simulateLLMProcessing(query: string): Promise<ParsedQuery> {
    // Simulate LLM processing time
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 1000 + 500),
    );

    const parsed = this.parseQuery(query);

    // Add some randomization to simulate LLM uncertainty
    if (Math.random() < 0.1) {
      parsed.confidence *= 0.8; // Sometimes reduce confidence
    }

    return parsed;
  }
}
