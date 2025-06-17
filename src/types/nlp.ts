export interface ParsedQuery {
  intent: QueryIntent;
  entities: ExtractedEntity[];
  taskType: TaskType;
  confidence: number;
  originalQuery: string;
  timestamp: Date;
}

export type QueryIntent =
  | "root_cause_analysis"
  | "posture_validation"
  | "performance_troubleshoot"
  | "security_investigation"
  | "network_diagnostics"
  | "compliance_check";

export type TaskType =
  | "diagnostic"
  | "investigative"
  | "remediation"
  | "monitoring"
  | "reporting";

export interface ExtractedEntity {
  type: EntityType;
  value: string;
  confidence: number;
  context?: string;
}

export type EntityType =
  | "ip_address"
  | "hostname"
  | "protocol"
  | "port"
  | "timestamp"
  | "user_id"
  | "device_id"
  | "error_code"
  | "service_name";

export interface AgentTask {
  id: string;
  agentType: AgentType;
  query: TelemetryQuery;
  status: TaskStatus;
  result?: AgentResult;
  startTime: Date;
  endTime?: Date;
  error?: string;
}

export type AgentType =
  | "splunk_agent"
  | "netflow_agent"
  | "ise_agent"
  | "snmp_agent"
  | "secureclient_agent"
  | "firewall_agent"
  | "topology_agent";

export type TaskStatus = "pending" | "running" | "completed" | "failed";

export interface TelemetryQuery {
  source: string;
  timeRange: TimeRange;
  filters: QueryFilter[];
  fields: string[];
  limit?: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface QueryFilter {
  field: string;
  operator: "equals" | "contains" | "gt" | "lt" | "in";
  value: string | number | string[];
}

export interface AgentResult {
  data: TelemetryData[];
  metadata: ResultMetadata;
  correlations?: CorrelationResult[];
}

export interface TelemetryData {
  timestamp: Date;
  source: string;
  fields: Record<string, any>;
  severity?: "low" | "medium" | "high" | "critical";
  category?: string;
}

export interface ResultMetadata {
  count: number;
  timeRange: TimeRange;
  source: string;
  queryTime: number;
}

export interface CorrelationResult {
  type: CorrelationType;
  strength: number;
  events: TelemetryData[];
  pattern: string;
  description: string;
}

export type CorrelationType = "temporal" | "causal" | "spatial" | "behavioral";

export interface IncidentContext {
  id: string;
  query: ParsedQuery;
  agentTasks: AgentTask[];
  correlations: CorrelationResult[];
  timeline: TimelineEvent[];
  affectedAssets: Asset[];
  severity: "low" | "medium" | "high" | "critical";
  status: "investigating" | "identified" | "remediating" | "resolved";
}

export interface TimelineEvent {
  timestamp: Date;
  type: "event" | "alert" | "action" | "correlation";
  description: string;
  source: string;
  severity?: "low" | "medium" | "high" | "critical";
  data?: any;
}

export interface Asset {
  id: string;
  type: "server" | "workstation" | "network_device" | "service";
  name: string;
  ipAddress: string;
  status: "healthy" | "degraded" | "failed";
  impact: "none" | "low" | "medium" | "high";
}

export interface RemediationAction {
  id: string;
  type: RemediationType;
  title: string;
  description: string;
  steps: RemediationStep[];
  riskLevel: "low" | "medium" | "high";
  estimatedTime: number; // minutes
  requiredApproval: boolean;
  automatable: boolean;
  status: "suggested" | "approved" | "executing" | "completed" | "failed";
}

export type RemediationType =
  | "restart_service"
  | "reset_connection"
  | "update_policy"
  | "clear_cache"
  | "reset_credentials"
  | "quarantine_device"
  | "update_acl"
  | "restart_interface";

export interface RemediationStep {
  id: string;
  description: string;
  command?: string;
  expectedResult?: string;
  status: "pending" | "running" | "completed" | "failed";
  output?: string;
}

export interface ConversationMessage {
  id: string;
  type: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  context?: IncidentContext;
  actions?: RemediationAction[];
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  type: "dashboard" | "chart" | "table" | "topology";
  title: string;
  data: any;
  config?: any;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  target: string;
  details: Record<string, any>;
  result: "success" | "failure" | "pending";
}
