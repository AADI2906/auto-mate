import {
  ParsedQuery,
  AgentTask,
  AgentType,
  TelemetryQuery,
  IncidentContext,
  TimeRange,
  CorrelationResult,
  Asset,
  TimelineEvent,
} from "@/types/nlp";
import { TelemetryConnectors } from "@/services/TelemetryConnectors";

export class AgentOrchestrator {
  private static activeContext: IncidentContext | null = null;

  static async orchestrateInvestigation(
    parsedQuery: ParsedQuery,
  ): Promise<IncidentContext> {
    const context: IncidentContext = {
      id: `incident-${Date.now()}`,
      query: parsedQuery,
      agentTasks: [],
      correlations: [],
      timeline: [],
      affectedAssets: [],
      severity: "medium",
      status: "investigating",
    };

    this.activeContext = context;

    // Determine which agents to deploy based on intent and entities
    const requiredAgents = this.determineRequiredAgents(parsedQuery);

    // Create time range for queries (default to last 24 hours)
    const timeRange = this.createTimeRange(parsedQuery);

    // Generate telemetry queries for each agent
    const agentTasks = requiredAgents.map((agentType) =>
      this.createAgentTask(agentType, parsedQuery, timeRange),
    );

    context.agentTasks = agentTasks;

    // Add initial timeline event
    context.timeline.push({
      timestamp: new Date(),
      type: "action",
      description: `Investigation started: "${parsedQuery.originalQuery}"`,
      source: "orchestrator",
    });

    // Execute agent tasks concurrently
    await this.executeAgentTasks(context);

    // Perform correlation analysis
    await this.performCorrelationAnalysis(context);

    // Identify affected assets
    this.identifyAffectedAssets(context);

    // Determine incident severity
    this.calculateIncidentSeverity(context);

    // Update status
    context.status = "identified";

    return context;
  }

  private static determineRequiredAgents(
    parsedQuery: ParsedQuery,
  ): AgentType[] {
    const agents: Set<AgentType> = new Set();

    // Always include basic agents for comprehensive analysis
    agents.add("splunk_agent");
    agents.add("topology_agent");

    // Add agents based on intent
    switch (parsedQuery.intent) {
      case "root_cause_analysis":
        agents.add("snmp_agent");
        agents.add("netflow_agent");
        break;
      case "posture_validation":
        agents.add("ise_agent");
        break;
      case "security_investigation":
        agents.add("firewall_agent");
        agents.add("ise_agent");
        break;
      case "network_diagnostics":
        agents.add("netflow_agent");
        agents.add("snmp_agent");
        break;
    }

    // Add agents based on entities
    parsedQuery.entities.forEach((entity) => {
      switch (entity.type) {
        case "ip_address":
          agents.add("netflow_agent");
          agents.add("firewall_agent");
          break;
        case "user_id":
          agents.add("ise_agent");
          agents.add("secureclient_agent");
          break;
        case "protocol":
          agents.add("netflow_agent");
          agents.add("firewall_agent");
          break;
      }
    });

    // Check for VPN-related keywords
    if (
      parsedQuery.originalQuery.toLowerCase().includes("vpn") ||
      parsedQuery.originalQuery.toLowerCase().includes("anyconnect")
    ) {
      agents.add("secureclient_agent");
    }

    return Array.from(agents);
  }

  private static createTimeRange(parsedQuery: ParsedQuery): TimeRange {
    // Look for time entities in the query
    const timeEntity = parsedQuery.entities.find((e) => e.type === "timestamp");

    let start: Date;
    let end = new Date();

    if (timeEntity) {
      const timeValue = timeEntity.value.toLowerCase();

      if (timeValue.includes("last") || timeValue.includes("past")) {
        const match = timeValue.match(/(\d+)\s+(minute|hour|day|week|month)/);
        if (match) {
          const amount = parseInt(match[1]);
          const unit = match[2];
          start = this.subtractTime(end, amount, unit);
        } else {
          start = new Date(end.getTime() - 24 * 60 * 60 * 1000); // Default 24 hours
        }
      } else if (timeValue === "today") {
        start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      } else if (timeValue === "yesterday") {
        start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1);
        end = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      } else {
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000); // Default 24 hours
      }
    } else {
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000); // Default 24 hours
    }

    return { start, end };
  }

  private static subtractTime(date: Date, amount: number, unit: string): Date {
    const result = new Date(date);
    switch (unit) {
      case "minute":
        result.setMinutes(result.getMinutes() - amount);
        break;
      case "hour":
        result.setHours(result.getHours() - amount);
        break;
      case "day":
        result.setDate(result.getDate() - amount);
        break;
      case "week":
        result.setDate(result.getDate() - amount * 7);
        break;
      case "month":
        result.setMonth(result.getMonth() - amount);
        break;
    }
    return result;
  }

  private static createAgentTask(
    agentType: AgentType,
    parsedQuery: ParsedQuery,
    timeRange: TimeRange,
  ): AgentTask {
    const telemetryQuery: TelemetryQuery = {
      source: agentType.replace("_agent", ""),
      timeRange,
      filters: this.createFiltersFromEntities(parsedQuery.entities),
      fields: this.getRelevantFields(agentType),
      limit: 1000,
    };

    return {
      id: `task-${agentType}-${Date.now()}`,
      agentType,
      query: telemetryQuery,
      status: "pending",
      startTime: new Date(),
    };
  }

  private static createFiltersFromEntities(entities: any[]): any[] {
    return entities
      .map((entity) => {
        switch (entity.type) {
          case "ip_address":
            return [
              { field: "src_ip", operator: "equals", value: entity.value },
              { field: "dst_ip", operator: "equals", value: entity.value },
              { field: "client_ip", operator: "equals", value: entity.value },
            ];
          case "user_id":
            return [
              { field: "username", operator: "equals", value: entity.value },
              { field: "user_id", operator: "equals", value: entity.value },
            ];
          case "port":
            return [
              { field: "src_port", operator: "equals", value: entity.value },
              { field: "dst_port", operator: "equals", value: entity.value },
            ];
          case "protocol":
            return [
              { field: "protocol", operator: "equals", value: entity.value },
            ];
          default:
            return [];
        }
      })
      .flat();
  }

  private static getRelevantFields(agentType: AgentType): string[] {
    const fieldMappings: Record<AgentType, string[]> = {
      splunk_agent: [
        "timestamp",
        "host",
        "source",
        "event_type",
        "src_ip",
        "dst_ip",
        "status_code",
      ],
      netflow_agent: [
        "timestamp",
        "src_ip",
        "dst_ip",
        "src_port",
        "dst_port",
        "protocol",
        "bytes",
        "packets",
      ],
      ise_agent: [
        "timestamp",
        "username",
        "nas_ip",
        "auth_result",
        "policy_name",
        "posture_status",
      ],
      snmp_agent: [
        "timestamp",
        "device_ip",
        "interface",
        "cpu_utilization",
        "memory_utilization",
        "uptime",
      ],
      secureclient_agent: [
        "timestamp",
        "user_id",
        "client_ip",
        "vpn_gateway",
        "connection_status",
        "posture_check",
      ],
      firewall_agent: [
        "timestamp",
        "action",
        "src_ip",
        "dst_ip",
        "protocol",
        "rule_name",
        "threat_level",
      ],
      topology_agent: [
        "timestamp",
        "device_type",
        "device_ip",
        "interface",
        "neighbor",
        "status",
      ],
    };

    return fieldMappings[agentType] || ["timestamp", "message"];
  }

  private static async executeAgentTasks(context: IncidentContext) {
    const promises = context.agentTasks.map(async (task) => {
      task.status = "running";

      // Add timeline event
      context.timeline.push({
        timestamp: new Date(),
        type: "action",
        description: `Querying ${task.agentType.replace("_agent", "")} for telemetry data`,
        source: task.agentType,
      });

      try {
        const result = await TelemetryConnectors.queryTelemetrySource(
          task.agentType,
          task.query,
        );

        task.result = result;
        task.status = "completed";
        task.endTime = new Date();

        // Add correlations to context
        if (result.correlations) {
          context.correlations.push(...result.correlations);
        }

        // Add timeline events for significant findings
        if (result.data.length > 0) {
          context.timeline.push({
            timestamp: new Date(),
            type: "event",
            description: `Found ${result.data.length} events in ${task.agentType.replace("_agent", "")}`,
            source: task.agentType,
            data: { count: result.data.length },
          });
        }
      } catch (error) {
        task.status = "failed";
        task.error = error instanceof Error ? error.message : "Unknown error";
        task.endTime = new Date();

        context.timeline.push({
          timestamp: new Date(),
          type: "alert",
          description: `Failed to query ${task.agentType}: ${task.error}`,
          source: task.agentType,
          severity: "high",
        });
      }
    });

    await Promise.all(promises);
  }

  private static async performCorrelationAnalysis(context: IncidentContext) {
    // Cross-agent correlation analysis
    const allData = context.agentTasks
      .filter((task) => task.result)
      .flatMap((task) => task.result!.data);

    if (allData.length < 2) return;

    // Time-based correlation
    const timeCorrelations = this.findTimeBasedCorrelations(allData);
    context.correlations.push(...timeCorrelations);

    // Entity-based correlation
    const entityCorrelations = this.findEntityBasedCorrelations(
      allData,
      context.query.entities,
    );
    context.correlations.push(...entityCorrelations);

    // Pattern-based correlation
    const patternCorrelations = this.findPatternBasedCorrelations(allData);
    context.correlations.push(...patternCorrelations);

    // Add correlation timeline events
    context.correlations.forEach((correlation) => {
      context.timeline.push({
        timestamp: new Date(),
        type: "correlation",
        description: correlation.description,
        source: "correlation_engine",
        severity: correlation.strength > 0.8 ? "high" : "medium",
      });
    });
  }

  private static findTimeBasedCorrelations(data: any[]): CorrelationResult[] {
    // Group events by 5-minute windows and look for patterns
    const timeWindows: Record<string, any[]> = {};

    data.forEach((item) => {
      const windowKey = Math.floor(
        item.timestamp.getTime() / (5 * 60 * 1000),
      ).toString();
      if (!timeWindows[windowKey]) {
        timeWindows[windowKey] = [];
      }
      timeWindows[windowKey].push(item);
    });

    const correlations: CorrelationResult[] = [];

    Object.entries(timeWindows).forEach(([window, events]) => {
      if (events.length > 3) {
        correlations.push({
          type: "temporal",
          strength: Math.min(events.length / 20, 1),
          events,
          pattern: "event_cluster",
          description: `${events.length} events clustered in 5-minute window`,
        });
      }
    });

    return correlations;
  }

  private static findEntityBasedCorrelations(
    data: any[],
    entities: any[],
  ): CorrelationResult[] {
    const correlations: CorrelationResult[] = [];

    entities.forEach((entity) => {
      const relatedEvents = data.filter((item) =>
        this.eventContainsEntity(item, entity),
      );

      if (relatedEvents.length > 1) {
        correlations.push({
          type: "causal",
          strength: relatedEvents.length / data.length,
          events: relatedEvents,
          pattern: "entity_related",
          description: `${relatedEvents.length} events related to ${entity.type}: ${entity.value}`,
        });
      }
    });

    return correlations;
  }

  private static eventContainsEntity(event: any, entity: any): boolean {
    const eventStr = JSON.stringify(event.fields).toLowerCase();
    return eventStr.includes(entity.value.toLowerCase());
  }

  private static findPatternBasedCorrelations(
    data: any[],
  ): CorrelationResult[] {
    const correlations: CorrelationResult[] = [];

    // Look for failure patterns
    const failures = data.filter(
      (item) =>
        item.fields.status_code >= 400 ||
        item.fields.auth_result === "FAILURE" ||
        item.fields.connection_status === "DISCONNECTED" ||
        item.fields.action === "DENY",
    );

    if (failures.length > 2) {
      correlations.push({
        type: "behavioral",
        strength: failures.length / data.length,
        events: failures,
        pattern: "failure_pattern",
        description: `${failures.length} failure events detected across multiple systems`,
      });
    }

    return correlations;
  }

  private static identifyAffectedAssets(context: IncidentContext) {
    const assets: Set<string> = new Set();

    context.agentTasks.forEach((task) => {
      if (task.result) {
        task.result.data.forEach((item) => {
          // Extract IPs and hostnames
          Object.values(item.fields).forEach((value) => {
            if (typeof value === "string") {
              const ipMatch = value.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g);
              if (ipMatch) {
                ipMatch.forEach((ip) => assets.add(ip));
              }
            }
          });
        });
      }
    });

    context.affectedAssets = Array.from(assets).map((ip) => ({
      id: ip,
      type: this.determineAssetType(ip),
      name: `Asset-${ip}`,
      ipAddress: ip,
      status: this.determineAssetStatus(context, ip),
      impact: this.determineAssetImpact(context, ip),
    }));
  }

  private static determineAssetType(ip: string): Asset["type"] {
    // Simple heuristic based on IP patterns
    if (ip.startsWith("10.1.1.")) return "workstation";
    if (ip.startsWith("10.1.2.")) return "server";
    if (ip.startsWith("10.1.3.")) return "network_device";
    return "service";
  }

  private static determineAssetStatus(
    context: IncidentContext,
    ip: string,
  ): Asset["status"] {
    const hasFailures = context.correlations.some((corr) =>
      corr.events.some((event) => JSON.stringify(event.fields).includes(ip)),
    );
    return hasFailures ? "degraded" : "healthy";
  }

  private static determineAssetImpact(
    context: IncidentContext,
    ip: string,
  ): Asset["impact"] {
    const relatedEvents = context.agentTasks
      .flatMap((task) => task.result?.data || [])
      .filter((event) => JSON.stringify(event.fields).includes(ip));

    if (relatedEvents.length > 10) return "high";
    if (relatedEvents.length > 5) return "medium";
    if (relatedEvents.length > 0) return "low";
    return "none";
  }

  private static calculateIncidentSeverity(context: IncidentContext) {
    let score = 0;

    // Factor in number of affected assets
    score += context.affectedAssets.length * 10;

    // Factor in correlation strength
    const avgCorrelationStrength =
      context.correlations.reduce((sum, corr) => sum + corr.strength, 0) /
      Math.max(context.correlations.length, 1);
    score += avgCorrelationStrength * 50;

    // Factor in failure events
    const failureEvents = context.agentTasks
      .flatMap((task) => task.result?.data || [])
      .filter(
        (event) => event.severity === "high" || event.severity === "critical",
      );
    score += failureEvents.length * 5;

    if (score > 80) context.severity = "critical";
    else if (score > 60) context.severity = "high";
    else if (score > 30) context.severity = "medium";
    else context.severity = "low";
  }

  static getCurrentContext(): IncidentContext | null {
    return this.activeContext;
  }

  static clearContext() {
    this.activeContext = null;
  }
}
