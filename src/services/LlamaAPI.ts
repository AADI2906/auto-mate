interface LlamaResponse {
  content: string;
  done: boolean;
  model: string;
  created_at: string;
  context?: number[];
}

interface LlamaRequest {
  model: string;
  prompt: string;
  stream: boolean;
  system?: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
}

interface ParsedSolution {
  diagnosis: string;
  cliCommands: string[];
  explanations: string[];
  severity: "low" | "medium" | "high" | "critical";
  category: "network" | "security" | "system" | "application";
  estimatedTime: string;
  riskLevel: "safe" | "caution" | "dangerous";
}

export class LlamaAPI {
  private static baseUrl = "http://localhost:11434";
  private static model = "llama3.1:8b";

  // System prompt optimized for IT/security operations
  private static systemPrompt = `You are an expert IT security and network operations assistant. Your responses should be:

1. PRECISE: Give specific, actionable solutions
2. CLI-FOCUSED: Prefer command-line solutions when applicable
3. SECURE: Always consider security implications
4. STRUCTURED: Format responses clearly with diagnosis, commands, and explanations

For any technical issue:
- Start with a brief diagnosis
- Provide specific CLI commands or fixes
- Explain what each command does
- Indicate the severity level (low/medium/high/critical)
- Estimate time to resolution
- Note any risks or precautions

Common scenarios:
- VPN issues: Check logs, restart services, verify configs
- Network problems: Use ping, traceroute, netstat, ss
- Security incidents: Analyze logs, check processes, review connections
- Performance issues: Monitor CPU, memory, disk, network

Always provide multiple solutions when possible, starting with the safest approach.`;

  static async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      return response.ok;
    } catch (error) {
      console.warn("Llama API not available:", error);
      return false;
    }
  }

  static async sendQuery(
    query: string,
    onStream?: (chunk: string) => void,
    onComplete?: (fullResponse: string, parsed: ParsedSolution) => void,
  ): Promise<{ response: string; solution: ParsedSolution }> {
    // Check if Llama is available, fallback to mock if not
    const isAvailable = await this.isAvailable();
    if (!isAvailable) {
      return this.mockResponse(query, onStream, onComplete);
    }

    const request: LlamaRequest = {
      model: this.model,
      prompt: `User Query: ${query}\n\nPlease provide a technical solution with CLI commands and clear explanations.`,
      stream: true,
      system: this.systemPrompt,
      temperature: 0.3,
      top_p: 0.9,
      max_tokens: 2000,
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Llama API error: ${response.status}`);
      }

      let fullResponse = "";
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            try {
              const parsed: LlamaResponse = JSON.parse(line);
              if (parsed.content) {
                fullResponse += parsed.content;
                onStream?.(parsed.content);
              }
              if (parsed.done) {
                break;
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }

      const solution = this.parseSolution(fullResponse, query);
      onComplete?.(fullResponse, solution);

      return { response: fullResponse, solution };
    } catch (error) {
      console.error("Llama API error:", error);
      // Fallback to mock response
      return this.mockResponse(query, onStream, onComplete);
    }
  }

  private static async mockResponse(
    query: string,
    onStream?: (chunk: string) => void,
    onComplete?: (fullResponse: string, parsed: ParsedSolution) => void,
  ): Promise<{ response: string; solution: ParsedSolution }> {
    const mockResponses = this.generateMockResponse(query);
    let fullResponse = "";

    // Simulate streaming
    for (const chunk of mockResponses) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      fullResponse += chunk;
      onStream?.(chunk);
    }

    const solution = this.parseSolution(fullResponse, query);
    onComplete?.(fullResponse, solution);

    return { response: fullResponse, solution };
  }

  private static generateMockResponse(query: string): string[] {
    const queryLower = query.toLowerCase();

    if (queryLower.includes("vpn")) {
      return [
        "**VPN Connection Issue Diagnosis**\n\n",
        "**Root Cause Analysis:**\n",
        "VPN connection failures typically stem from authentication issues, network connectivity problems, or service configuration errors.\n\n",
        "**Immediate CLI Solutions:**\n\n",
        "1. **Check VPN service status:**\n",
        "```bash\n",
        "sudo systemctl status openvpn\n",
        "sudo systemctl status strongswan\n",
        "```\n\n",
        "2. **Restart VPN services:**\n",
        "```bash\n",
        "sudo systemctl restart openvpn\n",
        "sudo systemctl restart strongswan\n",
        "```\n\n",
        "3. **Check network connectivity:**\n",
        "```bash\n",
        "ping 8.8.8.8\n",
        "nslookup your-vpn-server.com\n",
        "```\n\n",
        "4. **Verify VPN configuration:**\n",
        "```bash\n",
        "sudo cat /etc/openvpn/client.conf\n",
        "sudo journalctl -u openvpn -f\n",
        "```\n\n",
        "5. **Test port connectivity:**\n",
        "```bash\n",
        "telnet vpn-server 1194\n",
        "nc -zv vpn-server 443\n",
        "```\n\n",
        "**Severity:** Medium | **Category:** Network | **Risk:** Safe | **ETA:** 5-10 minutes",
      ];
    }

    if (queryLower.includes("slow") || queryLower.includes("performance")) {
      return [
        "**Network Performance Issue Analysis**\n\n",
        "**Diagnosis:**\n",
        "Performance degradation requires systematic analysis of network, CPU, memory, and disk utilization.\n\n",
        "**Performance Monitoring Commands:**\n\n",
        "1. **Network throughput analysis:**\n",
        "```bash\n",
        "iftop -i eth0\n",
        "nethogs\n",
        "ss -tuln\n",
        "```\n\n",
        "2. **System resource monitoring:**\n",
        "```bash\n",
        "htop\n",
        "iostat -x 1 5\n",
        "vmstat 1 5\n",
        "```\n\n",
        "3. **Network latency testing:**\n",
        "```bash\n",
        "ping -c 10 target-server\n",
        "traceroute target-server\n",
        "mtr --report target-server\n",
        "```\n\n",
        "4. **Bandwidth testing:**\n",
        "```bash\n",
        "iperf3 -c server-ip\n",
        "speedtest-cli\n",
        "```\n\n",
        "**Severity:** Medium | **Category:** System | **Risk:** Safe | **ETA:** 10-15 minutes",
      ];
    }

    if (queryLower.includes("auth") || queryLower.includes("login")) {
      return [
        "**Authentication Issue Resolution**\n\n",
        "**Diagnosis:**\n",
        "Authentication failures can be caused by credential issues, service problems, or policy violations.\n\n",
        "**Authentication Troubleshooting:**\n\n",
        "1. **Check authentication logs:**\n",
        "```bash\n",
        "sudo tail -f /var/log/auth.log\n",
        "sudo journalctl -u ssh -f\n",
        "```\n\n",
        "2. **Verify user account status:**\n",
        "```bash\n",
        "sudo passwd -S username\n",
        "sudo chage -l username\n",
        "id username\n",
        "```\n\n",
        "3. **Test authentication mechanisms:**\n",
        "```bash\n",
        "ssh -v username@server\n",
        "ldapsearch -x -b 'dc=company,dc=com' '(uid=username)'\n",
        "```\n\n",
        "4. **Reset authentication if needed:**\n",
        "```bash\n",
        "sudo passwd username\n",
        "sudo systemctl restart ssh\n",
        "```\n\n",
        "**Severity:** High | **Category:** Security | **Risk:** Caution | **ETA:** 5-10 minutes",
      ];
    }

    // Default response for other queries
    return [
      "**General IT Issue Analysis**\n\n",
      "**Initial Diagnosis:**\n",
      "Based on your query, I'll provide general troubleshooting steps.\n\n",
      "**Basic Diagnostic Commands:**\n\n",
      "1. **System status check:**\n",
      "```bash\n",
      "systemctl status\n",
      "uptime\n",
      "df -h\n",
      "```\n\n",
      "2. **Network connectivity:**\n",
      "```bash\n",
      "ip addr show\n",
      "ip route show\n",
      "ping 8.8.8.8\n",
      "```\n\n",
      "3. **Log analysis:**\n",
      "```bash\n",
      "sudo journalctl -xe\n",
      "sudo dmesg | tail\n",
      "```\n\n",
      "**Severity:** Medium | **Category:** System | **Risk:** Safe | **ETA:** 5-15 minutes",
    ];
  }

  private static parseSolution(
    response: string,
    originalQuery: string,
  ): ParsedSolution {
    const queryLower = originalQuery.toLowerCase();

    // Extract CLI commands from the response
    const cliCommands: string[] = [];
    const codeBlocks = response.match(/```bash\n([\s\S]*?)\n```/g);
    if (codeBlocks) {
      codeBlocks.forEach((block) => {
        const commands = block
          .replace(/```bash\n|\n```/g, "")
          .split("\n")
          .filter((cmd) => cmd.trim());
        cliCommands.push(...commands);
      });
    }

    // Extract explanations
    const explanations = response
      .split("\n")
      .filter(
        (line) =>
          line.trim() && !line.startsWith("```") && !line.startsWith("#"),
      )
      .slice(0, 5);

    // Determine category and severity
    let category: ParsedSolution["category"] = "system";
    let severity: ParsedSolution["severity"] = "medium";

    if (queryLower.includes("vpn") || queryLower.includes("network")) {
      category = "network";
    } else if (
      queryLower.includes("auth") ||
      queryLower.includes("security") ||
      queryLower.includes("hack")
    ) {
      category = "security";
      severity = "high";
    } else if (
      queryLower.includes("critical") ||
      queryLower.includes("down") ||
      queryLower.includes("fail")
    ) {
      severity = "critical";
    } else if (
      queryLower.includes("slow") ||
      queryLower.includes("performance")
    ) {
      severity = "medium";
    }

    // Determine risk level
    let riskLevel: ParsedSolution["riskLevel"] = "safe";
    if (
      cliCommands.some(
        (cmd) =>
          cmd.includes("rm ") ||
          cmd.includes("delete") ||
          cmd.includes("format"),
      )
    ) {
      riskLevel = "dangerous";
    } else if (
      cliCommands.some(
        (cmd) =>
          cmd.includes("restart") ||
          cmd.includes("stop") ||
          cmd.includes("kill"),
      )
    ) {
      riskLevel = "caution";
    }

    return {
      diagnosis: response.split("\n")[0] || "Technical issue analysis",
      cliCommands,
      explanations,
      severity,
      category,
      estimatedTime:
        severity === "critical"
          ? "2-5 minutes"
          : severity === "high"
            ? "5-10 minutes"
            : severity === "medium"
              ? "10-15 minutes"
              : "15-30 minutes",
      riskLevel,
    };
  }

  static async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export type { ParsedSolution, LlamaResponse, LlamaRequest };
