import {
  AgentType,
  TelemetryQuery,
  AgentResult,
  TelemetryData,
  CorrelationResult,
  TimeRange,
} from "@/types/nlp";

export class TelemetryConnectors {
  private static generateMockData(
    source: string,
    timeRange: TimeRange,
    count: number = 10,
  ): TelemetryData[] {
    const data: TelemetryData[] = [];
    const timeSpan = timeRange.end.getTime() - timeRange.start.getTime();

    for (let i = 0; i < count; i++) {
      const timestamp = new Date(
        timeRange.start.getTime() + Math.random() * timeSpan,
      );
      data.push({
        timestamp,
        source,
        fields: this.generateMockFields(source),
        severity: this.getRandomSeverity(),
        category: this.getCategoryForSource(source),
      });
    }

    return data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private static generateMockFields(source: string): Record<string, any> {
    switch (source) {
      case "splunk":
        return {
          host: `host-${Math.floor(Math.random() * 100)}`,
          index: "network_logs",
          event_type: "connection_event",
          src_ip: `10.1.1.${Math.floor(Math.random() * 255)}`,
          dest_ip: `10.1.2.${Math.floor(Math.random() * 255)}`,
          port: Math.floor(Math.random() * 65535),
          bytes_transferred: Math.floor(Math.random() * 1000000),
          status_code: this.getRandomStatusCode(),
        };

      case "netflow":
        return {
          src_ip: `10.1.1.${Math.floor(Math.random() * 255)}`,
          dst_ip: `10.1.2.${Math.floor(Math.random() * 255)}`,
          src_port: Math.floor(Math.random() * 65535),
          dst_port: Math.floor(Math.random() * 65535),
          protocol: Math.random() > 0.5 ? "TCP" : "UDP",
          bytes: Math.floor(Math.random() * 100000),
          packets: Math.floor(Math.random() * 1000),
          flow_duration: Math.floor(Math.random() * 300),
        };

      case "ise":
        return {
          username: `user${Math.floor(Math.random() * 1000)}`,
          nas_ip: `10.1.3.${Math.floor(Math.random() * 255)}`,
          calling_station_id: this.generateMacAddress(),
          auth_result: Math.random() > 0.2 ? "SUCCESS" : "FAILURE",
          policy_name: `Policy_${Math.floor(Math.random() * 10)}`,
          endpoint_profile: "Corporate-Device",
          posture_status: Math.random() > 0.3 ? "COMPLIANT" : "NON_COMPLIANT",
        };

      case "snmp":
        return {
          device_ip: `10.1.4.${Math.floor(Math.random() * 255)}`,
          oid: `1.3.6.1.2.1.${Math.floor(Math.random() * 100)}`,
          value: Math.floor(Math.random() * 100),
          interface: `GigabitEthernet0/${Math.floor(Math.random() * 24)}`,
          cpu_utilization: Math.floor(Math.random() * 100),
          memory_utilization: Math.floor(Math.random() * 100),
          uptime: Math.floor(Math.random() * 1000000),
        };

      case "secureclient":
        return {
          user_id: `user${Math.floor(Math.random() * 1000)}`,
          client_ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
          vpn_gateway: `vpn-gw-${Math.floor(Math.random() * 5)}`,
          connection_status:
            Math.random() > 0.15 ? "CONNECTED" : "DISCONNECTED",
          tunnel_protocol: "IKEv2",
          encryption: "AES-256",
          dns_resolution: Math.random() > 0.1 ? "SUCCESS" : "FAILURE",
          posture_check: Math.random() > 0.2 ? "PASS" : "FAIL",
        };

      case "firewall":
        return {
          action: Math.random() > 0.3 ? "ALLOW" : "DENY",
          src_ip: `10.1.1.${Math.floor(Math.random() * 255)}`,
          dst_ip: `10.1.2.${Math.floor(Math.random() * 255)}`,
          src_port: Math.floor(Math.random() * 65535),
          dst_port: Math.floor(Math.random() * 65535),
          protocol: Math.random() > 0.5 ? "TCP" : "UDP",
          rule_name: `Rule_${Math.floor(Math.random() * 100)}`,
          threat_level: this.getRandomSeverity(),
          bytes: Math.floor(Math.random() * 10000),
        };

      default:
        return {
          message: "Generic telemetry data",
          value: Math.random() * 100,
        };
    }
  }

  private static generateMacAddress(): string {
    return Array.from({ length: 6 }, () =>
      Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, "0"),
    ).join(":");
  }

  private static getRandomStatusCode(): number {
    const codes = [200, 201, 400, 401, 403, 404, 500, 502, 503];
    return codes[Math.floor(Math.random() * codes.length)];
  }

  private static getRandomSeverity(): "low" | "medium" | "high" | "critical" {
    const severities = ["low", "medium", "high", "critical"] as const;
    return severities[Math.floor(Math.random() * severities.length)];
  }

  private static getCategoryForSource(source: string): string {
    const categories: Record<string, string> = {
      splunk: "system_logs",
      netflow: "network_traffic",
      ise: "authentication",
      snmp: "device_monitoring",
      secureclient: "vpn_connection",
      firewall: "security_policy",
    };
    return categories[source] || "general";
  }

  static async queryTelemetrySource(
    agentType: AgentType,
    query: TelemetryQuery,
  ): Promise<AgentResult> {
    // Simulate network delay
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 2000 + 500),
    );

    const source = agentType.replace("_agent", "");
    const data = this.generateMockData(source, query.timeRange, query.limit);

    // Generate correlations based on the data
    const correlations = this.generateCorrelations(data);

    return {
      data,
      metadata: {
        count: data.length,
        timeRange: query.timeRange,
        source,
        queryTime: Math.random() * 1000 + 100,
      },
      correlations,
    };
  }

  private static generateCorrelations(
    data: TelemetryData[],
  ): CorrelationResult[] {
    const correlations: CorrelationResult[] = [];

    // Temporal correlation - events happening close in time
    if (data.length > 1) {
      const timeGroups = this.groupByTime(data, 60000); // 1 minute windows
      timeGroups.forEach((group) => {
        if (group.length > 2) {
          correlations.push({
            type: "temporal",
            strength: Math.min(group.length / 10, 1),
            events: group,
            pattern: "burst_activity",
            description: `${group.length} events occurred within 1 minute window`,
          });
        }
      });
    }

    // Causal correlation - specific patterns
    const failedEvents = data.filter(
      (d) =>
        d.fields.status_code >= 400 ||
        d.fields.auth_result === "FAILURE" ||
        d.fields.connection_status === "DISCONNECTED",
    );

    if (failedEvents.length > 0) {
      correlations.push({
        type: "causal",
        strength: failedEvents.length / data.length,
        events: failedEvents,
        pattern: "failure_cascade",
        description: `${failedEvents.length} failure events detected, indicating potential system issue`,
      });
    }

    return correlations;
  }

  private static groupByTime(
    data: TelemetryData[],
    windowMs: number,
  ): TelemetryData[][] {
    const groups: TelemetryData[][] = [];
    let currentGroup: TelemetryData[] = [];
    let windowStart = 0;

    data.forEach((item) => {
      const itemTime = item.timestamp.getTime();

      if (windowStart === 0) {
        windowStart = itemTime;
        currentGroup = [item];
      } else if (itemTime - windowStart <= windowMs) {
        currentGroup.push(item);
      } else {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        windowStart = itemTime;
        currentGroup = [item];
      }
    });

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  static getAvailableSources(): AgentType[] {
    return [
      "splunk_agent",
      "netflow_agent",
      "ise_agent",
      "snmp_agent",
      "secureclient_agent",
      "firewall_agent",
      "topology_agent",
    ];
  }

  static getSourceCapabilities(agentType: AgentType): string[] {
    const capabilities: Record<AgentType, string[]> = {
      splunk_agent: [
        "log_analysis",
        "event_correlation",
        "search_queries",
        "alerting",
      ],
      netflow_agent: [
        "traffic_analysis",
        "bandwidth_monitoring",
        "flow_correlation",
        "anomaly_detection",
      ],
      ise_agent: [
        "authentication_logs",
        "posture_assessment",
        "policy_evaluation",
        "endpoint_profiling",
      ],
      snmp_agent: [
        "device_monitoring",
        "performance_metrics",
        "interface_status",
        "threshold_alerting",
      ],
      secureclient_agent: [
        "vpn_connections",
        "client_status",
        "tunnel_health",
        "dns_resolution",
      ],
      firewall_agent: [
        "traffic_filtering",
        "threat_detection",
        "policy_enforcement",
        "connection_tracking",
      ],
      topology_agent: [
        "network_discovery",
        "device_relationships",
        "path_analysis",
        "topology_changes",
      ],
    };

    return capabilities[agentType] || [];
  }
}
