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
  private static model = "llama3.1:8b"; // Specifically using Llama 3.1 8B model

  // Environment detection to avoid CORS issues
  private static isHostedEnvironment(): boolean {
    try {
      // Check if we're in a hosted environment (not localhost)
      const hostname = window.location.hostname;
      return (
        hostname !== "localhost" &&
        hostname !== "127.0.0.1" &&
        !hostname.startsWith("192.168.")
      );
    } catch {
      return true; // Assume hosted if we can't determine
    }
  }

  private static canAccessLocalhost(): boolean {
    return !this.isHostedEnvironment();
  }

  // Ultra-precise CLI command generator system prompt
  private static systemPrompt = `You are a CLI command generator. Your ONLY job is to provide executable CLI commands in EXACT ORDER for any technical issue.

STRICT RULES:
1. NO explanations, advice, or generic text
2. ONLY return CLI commands in bash code blocks
3. Commands MUST be in LOGICAL EXECUTION ORDER
4. Include diagnostic commands FIRST, then fix commands
5. For real-time data queries, return JSON format after commands
6. NO unnecessary or redundant commands
7. Commands must be copy-pasteable and immediately executable

MANDATORY FORMAT:
\`\`\`bash
# Diagnostic commands first (in order)
command1
command2
# Fix/action commands second (in order)
command3
command4
\`\`\`

FOR REAL-TIME DATA QUERIES, ADD JSON:
\`\`\`json
{
  "data_type": "network_status|system_info|process_info|etc",
  "expected_output": "description of what the commands will show",
  "key_metrics": ["metric1", "metric2", "metric3"]
}
\`\`\`

COMMAND CATEGORIES (in execution order):
- Network: ping → ip addr → systemctl status → netstat → traceroute
- System: ps aux → top → systemctl status → journalctl → dmesg
- Services: systemctl status → systemctl restart → systemctl enable
- Files: ls -la → find → chmod → chown → df -h
- Performance: free -h → htop → iostat → vmstat → sar
- Security: ss -tulpn → netstat -an → ps aux → lsof → iptables -L

EXAMPLE - "Network not working":
\`\`\`bash
ping 8.8.8.8
ip addr show
systemctl status NetworkManager
netstat -rn
sudo systemctl restart NetworkManager
sudo dhclient -r && sudo dhclient
\`\`\`

\`\`\`json
{
  "data_type": "network_diagnostics",
  "expected_output": "connectivity status, IP configuration, routing table",
  "key_metrics": ["ping_response", "ip_address", "gateway_status", "dns_resolution"]
}
\`\`\`

ZERO TOLERANCE for explanations or advice. COMMANDS ONLY.`;

  static async isAvailable(): Promise<{ available: boolean; error?: string }> {
    // Skip fetch entirely in hosted environments to avoid CORS errors
    if (!this.canAccessLocalhost()) {
      return {
        available: false,
        error:
          "Running in hosted environment - localhost access blocked by CORS policy",
      };
    }

    try {
      // Add timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        mode: "cors", // Explicitly set CORS mode
      });

      clearTimeout(timeoutId);
      return { available: response.ok };
    } catch (error) {
      let errorMessage = "Unknown error";

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "Connection timeout - Ollama may not be running";
        } else if (
          error.message.includes("CORS") ||
          error.message.includes("fetch")
        ) {
          errorMessage =
            "CORS/Network error - Cannot connect to localhost:11434";
        } else if (error.message.includes("Failed to fetch")) {
          errorMessage =
            "Network error - Ollama server may not be running or accessible";
        } else {
          errorMessage = error.message;
        }
      }

      console.warn("Llama API not available:", errorMessage);
      return { available: false, error: errorMessage };
    }
  }

  static async sendQuery(
    query: string,
    onStream?: (chunk: string) => void,
    onComplete?: (fullResponse: string, parsed: ParsedSolution) => void,
    onError?: (error: string) => void,
  ): Promise<{
    response: string;
    solution: ParsedSolution;
    isFromLlama: boolean;
    error?: string;
  }> {
    // Skip entirely in hosted environments to avoid CORS errors
    if (!this.canAccessLocalhost()) {
      const error = "Running in hosted environment - using simulated responses";
      onError?.(error);
      const result = await this.mockResponse(query, onStream, onComplete);
      return { ...result, isFromLlama: false, error };
    }

    // Check if Llama is available, fallback to mock if not
    const availabilityCheck = await this.isAvailable();
    if (!availabilityCheck.available) {
      onError?.(availabilityCheck.error || "Llama not available");
      const result = await this.mockResponse(query, onStream, onComplete);
      return { ...result, isFromLlama: false, error: availabilityCheck.error };
    }

    try {
      // **Step 1: Send instruction prompt first**
      const instructionPrompt =
        "You are a CLI command generator. For any technical issue, respond with ONLY executable CLI commands in bash code blocks in LOGICAL ORDER: diagnostic commands first, then fix commands. NO explanations. NO advice. COMMANDS ONLY in proper execution sequence. Ready to generate ordered command sequences?";

      console.log("Step 1: Sending instruction prompt...");
      const instructionResponse = await this.chatWithLlama(instructionPrompt);
      console.log("Instruction Response:", instructionResponse);

      // **Step 2: Wait briefly and then send actual sentence**
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay

      console.log("Step 2: Sending actual query...");
      const finalResponse = await this.chatWithLlama(query, onStream);

      const solution = this.parseSolution(finalResponse, query);
      onComplete?.(finalResponse, solution);

      return { response: finalResponse, solution, isFromLlama: true };
    } catch (error) {
      let errorMessage = "Unknown error";

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "Request timeout - Generation took too long";
        } else if (
          error.message.includes("CORS") ||
          error.message.includes("fetch")
        ) {
          errorMessage =
            "CORS/Network error - Cannot connect to Ollama from this environment";
        } else {
          errorMessage = error.message;
        }
      }

      console.error("Llama API error:", errorMessage);
      onError?.(errorMessage);

      // Fallback to mock response
      const result = await this.mockResponse(query, onStream, onComplete);
      return { ...result, isFromLlama: false, error: errorMessage };
    }
  }

  // Private method that mimics the Python chat_with_llama function
  private static async chatWithLlama(
    prompt: string,
    onStream?: (chunk: string) => void,
  ): Promise<string> {
    const request: LlamaRequest = {
      model: this.model,
      prompt: prompt,
      stream: true,
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 2000,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
      mode: "cors",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Llama API error: ${response.status} ${response.statusText}`,
      );
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
            const jsonData = JSON.parse(line);
            const responseChunk = jsonData.response || "";
            if (responseChunk) {
              fullResponse += responseChunk;
              // Only stream for the actual user query, not the instruction
              if (onStream) {
                onStream(responseChunk);
              }
            }
            if (jsonData.done) {
              break;
            }
          } catch (e) {
            // Skip invalid JSON lines
            continue;
          }
        }
      }
    }

    return fullResponse.trim(); // Return cleaned response
  }

  private static async mockResponse(
    query: string,
    onStream?: (chunk: string) => void,
    onComplete?: (fullResponse: string, parsed: ParsedSolution) => void,
  ): Promise<{ response: string; solution: ParsedSolution }> {
    // Generate a simple, direct response
    let fullResponse = "";

    const isHosted = this.isHostedEnvironment();
    const mockPrefix = isHosted
      ? "🟡 **Simulated Response** (Running in hosted environment)\n\n"
      : "🔄 **Simulated Response** (Llama not available locally)\n\n";

    onStream?.(mockPrefix);
    fullResponse += mockPrefix;

    // Generate contextual response based on query
    const response = this.generateSimpleResponse(query);

    // Simulate streaming by sending chunks
    const chunks = response.match(/.{1,30}/g) || [response];
    for (const chunk of chunks) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      fullResponse += chunk;
      onStream?.(chunk);
    }

    const solution = this.parseSolution(fullResponse, query);
    onComplete?.(fullResponse, solution);

    return { response: fullResponse, solution };
  }

  private static generateSimpleResponse(query: string): string {
    const queryLower = query.toLowerCase();

    // Network-related issues
    if (
      queryLower.includes("network") ||
      queryLower.includes("connection") ||
      queryLower.includes("internet") ||
      queryLower.includes("wifi") ||
      queryLower.includes("ethernet")
    ) {
      return `Network troubleshooting commands for "${query}":

\`\`\`bash
ping 8.8.8.8
ping google.com
ip addr show
ip route show
systemctl status NetworkManager
systemctl restart NetworkManager
sudo dhclient -r
sudo dhclient
netstat -tuln
ss -tuln
traceroute 8.8.8.8
nslookup google.com
sudo systemctl restart systemd-resolved
\`\`\``;
    }

    // System/performance issues
    if (
      queryLower.includes("slow") ||
      queryLower.includes("performance") ||
      queryLower.includes("cpu") ||
      queryLower.includes("memory") ||
      queryLower.includes("disk")
    ) {
      return `System performance diagnostic commands:

\`\`\`bash
htop
top
ps aux --sort=-%cpu | head -10
free -h
df -h
iostat -x 1 5
vmstat 1 5
systemctl --failed
journalctl -xe
dmesg | tail -20
\`\`\``;
    }

    // Service/process issues
    if (
      queryLower.includes("service") ||
      queryLower.includes("restart") ||
      queryLower.includes("start") ||
      queryLower.includes("stop") ||
      queryLower.includes("daemon")
    ) {
      return `Service management commands:

\`\`\`bash
systemctl --failed
systemctl list-units --failed
systemctl status service-name
systemctl restart service-name
systemctl enable service-name
systemctl disable service-name
journalctl -u service-name -f
ps aux | grep service-name
\`\`\``;
    }

    // Error/troubleshooting
    if (
      queryLower.includes("error") ||
      queryLower.includes("bug") ||
      queryLower.includes("fix") ||
      queryLower.includes("troubleshoot") ||
      queryLower.includes("problem")
    ) {
      return `General troubleshooting commands:

\`\`\`bash
journalctl -xe
dmesg | tail -20
systemctl --failed
ps aux
netstat -tuln
lsof -i
tail -f /var/log/syslog
systemctl status
uptime
uname -a
\`\`\``;
    }

    // File/directory issues
    if (
      queryLower.includes("file") ||
      queryLower.includes("directory") ||
      queryLower.includes("permission") ||
      queryLower.includes("access")
    ) {
      return `File system diagnostic commands:

\`\`\`bash
ls -la
pwd
df -h
du -sh *
find / -name "filename" 2>/dev/null
chmod 755 filename
chown user:group filename
stat filename
lsof | grep filename
\`\`\``;
    }

    // Security-related
    if (
      queryLower.includes("security") ||
      queryLower.includes("firewall") ||
      queryLower.includes("port") ||
      queryLower.includes("blocked")
    ) {
      return `Security diagnostic commands:

\`\`\`bash
sudo ufw status
sudo iptables -L -n
netstat -tuln
ss -tuln
lsof -i
ps aux
who
last
sudo journalctl -u ssh
nmap localhost
\`\`\``;
    }

    // Default technical response - always includes commands
    return `Diagnostic commands for "${query}":

\`\`\`bash
systemctl status
ps aux
netstat -tuln
df -h
free -h
uptime
journalctl -xe
dmesg | tail
ip addr show
ping 8.8.8.8
\`\`\``;
  }

  private static generateMockResponse(query: string): string[] {
    // Generate dynamic response based on the actual query
    const queryLower = query.toLowerCase();
    const responseChunks: string[] = [];

    // Analyze the query to understand the user's intent and generate appropriate response
    const intentKeywords = this.analyzeQueryIntent(queryLower);

    // Generate contextual diagnosis
    responseChunks.push("**DIAGNOSIS:**\n");
    responseChunks.push(this.generateDiagnosis(query, intentKeywords) + "\n\n");

    // Generate CLI commands section
    responseChunks.push("**CLI COMMANDS:**\n");
    responseChunks.push("```bash\n");

    const commands = this.generateRelevantCommands(queryLower, intentKeywords);
    commands.forEach((cmd) => {
      responseChunks.push(cmd + "\n");
    });

    responseChunks.push("```\n\n");

    // Generate explanations
    responseChunks.push("**EXPLANATIONS:**\n");
    const explanations = this.generateExplanations(commands, intentKeywords);
    explanations.forEach((exp, idx) => {
      responseChunks.push(`${idx + 1}. ${exp}\n`);
    });
    responseChunks.push("\n");

    // Add metadata
    const metadata = this.generateMetadata(intentKeywords, commands.length);
    responseChunks.push(`**SEVERITY:** ${metadata.severity}\n`);
    responseChunks.push(`**CATEGORY:** ${metadata.category}\n`);
    responseChunks.push(`**RISK LEVEL:** ${metadata.riskLevel}\n`);
    responseChunks.push(`**ESTIMATED TIME:** ${metadata.estimatedTime}\n`);

    return responseChunks;
  }

  private static analyzeQueryIntent(queryLower: string): string[] {
    const keywords: string[] = [];

    // Network-related keywords
    if (
      queryLower.match(
        /network|internet|connectivity|connection|ping|dns|ip|routing|interface/,
      )
    ) {
      keywords.push("network");
    }
    if (queryLower.match(/reset|restart|reload|refresh|renew/)) {
      keywords.push("reset");
    }
    if (queryLower.match(/slow|performance|lag|latency|speed|bandwidth/)) {
      keywords.push("performance");
    }
    if (queryLower.match(/vpn|tunnel|openvpn|wireguard/)) {
      keywords.push("vpn");
    }
    if (queryLower.match(/wifi|wireless|wlan|access.?point/)) {
      keywords.push("wifi");
    }
    if (queryLower.match(/firewall|port|blocked|iptables|ufw/)) {
      keywords.push("firewall");
    }
    if (queryLower.match(/auth|login|password|credential|ssh|certificate/)) {
      keywords.push("auth");
    }
    if (queryLower.match(/dns|domain|resolve|nslookup|dig/)) {
      keywords.push("dns");
    }
    if (queryLower.match(/service|daemon|systemctl|process|running|stopped/)) {
      keywords.push("service");
    }
    if (queryLower.match(/log|debug|troubleshoot|diagnose|check|status/)) {
      keywords.push("diagnostic");
    }

    return keywords.length > 0 ? keywords : ["general"];
  }

  private static generateDiagnosis(query: string, keywords: string[]): string {
    if (keywords.includes("reset") && keywords.includes("network")) {
      return "Network connectivity issues requiring a complete reset of network configurations, services, and routing tables to restore normal operation.";
    }
    if (keywords.includes("performance")) {
      return "Performance degradation detected. Analysis requires monitoring network throughput, latency, and system resource utilization to identify bottlenecks.";
    }
    if (keywords.includes("vpn")) {
      return "VPN connectivity problems likely caused by service configuration, authentication failures, or network routing issues.";
    }
    if (keywords.includes("dns")) {
      return "DNS resolution failure preventing domain name lookups. Requires cache clearing and DNS server configuration verification.";
    }
    if (keywords.includes("firewall")) {
      return "Network traffic blocked by firewall rules. Port accessibility and rule configuration need examination.";
    }
    if (keywords.includes("wifi")) {
      return "Wireless connectivity issues requiring driver verification, interface configuration, and signal analysis.";
    }
    if (keywords.includes("auth")) {
      return "Authentication mechanism failure. User credentials, service status, and access policies require investigation.";
    }

    return `Technical issue analysis for: "${query}". Systematic diagnostic approach needed to identify root cause and implement solution.`;
  }

  private static generateRelevantCommands(
    queryLower: string,
    keywords: string[],
  ): string[] {
    const commands: string[] = [];

    // Network reset commands
    if (keywords.includes("reset") && keywords.includes("network")) {
      commands.push(
        "sudo systemd-resolve --flush-caches",
        "sudo ip link set eth0 down && sudo ip link set eth0 up",
        "sudo systemctl restart NetworkManager",
        "sudo dhclient -r && sudo dhclient",
        "sudo ip neigh flush all",
        "ip addr show",
        "ping -c 3 8.8.8.8",
      );
    }
    // Performance analysis
    else if (keywords.includes("performance")) {
      commands.push(
        "ping -c 10 8.8.8.8",
        "traceroute 8.8.8.8",
        "iftop -i eth0",
        "ss -tuln",
        "htop",
        "iostat -x 1 5",
      );
    }
    // VPN troubleshooting
    else if (keywords.includes("vpn")) {
      commands.push(
        "sudo systemctl status openvpn",
        "sudo systemctl restart openvpn",
        "sudo journalctl -u openvpn -f",
        "ping 8.8.8.8",
        "ip route show",
      );
    }
    // DNS issues
    else if (keywords.includes("dns")) {
      commands.push(
        "sudo systemd-resolve --flush-caches",
        "nslookup google.com 8.8.8.8",
        "dig @1.1.1.1 google.com",
        "cat /etc/resolv.conf",
        "sudo systemctl restart systemd-resolved",
      );
    }
    // Firewall issues
    else if (keywords.includes("firewall")) {
      commands.push(
        "sudo ufw status verbose",
        "sudo iptables -L -n",
        "sudo netstat -tulpn",
        "nc -zv target-server 80",
        "sudo ufw allow ssh",
      );
    }
    // WiFi issues
    else if (keywords.includes("wifi")) {
      commands.push(
        "iwconfig",
        "sudo iwlist scan | head -20",
        "nmcli dev wifi list",
        "sudo systemctl restart NetworkManager",
        "ping -c 3 8.8.8.8",
      );
    }
    // Authentication issues
    else if (keywords.includes("auth")) {
      commands.push(
        "sudo tail -f /var/log/auth.log",
        "sudo journalctl -u ssh -f",
        "id $USER",
        "ssh -v username@server",
        "sudo systemctl restart ssh",
      );
    }
    // Service management
    else if (keywords.includes("service")) {
      commands.push(
        "systemctl --failed",
        "sudo systemctl status service-name",
        "sudo systemctl restart service-name",
        "sudo journalctl -u service-name -f",
        "ps aux | grep service-name",
      );
    }
    // General diagnostic
    else {
      commands.push(
        "ip addr show",
        "ip route show",
        "ping -c 5 8.8.8.8",
        "nslookup google.com",
        "sudo systemctl status NetworkManager",
        "sudo journalctl -xe",
      );
    }

    return commands;
  }

  private static generateExplanations(
    commands: string[],
    keywords: string[],
  ): string[] {
    const explanations: string[] = [];

    commands.forEach((cmd) => {
      if (cmd.includes("systemd-resolve --flush-caches")) {
        explanations.push(
          "Clears DNS resolver cache to force fresh DNS lookups",
        );
      } else if (cmd.includes("ip link set") && cmd.includes("down")) {
        explanations.push(
          "Brings network interface down and back up to reset connection",
        );
      } else if (cmd.includes("systemctl restart NetworkManager")) {
        explanations.push(
          "Restarts network management service to reload configurations",
        );
      } else if (cmd.includes("dhclient")) {
        explanations.push("Releases and renews DHCP IP address lease");
      } else if (cmd.includes("ping")) {
        explanations.push(
          "Tests network connectivity to verify connection is working",
        );
      } else if (cmd.includes("traceroute")) {
        explanations.push("Traces network path to identify routing issues");
      } else if (cmd.includes("journalctl")) {
        explanations.push(
          "Views system logs to identify error messages and issues",
        );
      } else if (cmd.includes("systemctl status")) {
        explanations.push(
          "Checks service status and displays current operational state",
        );
      } else if (cmd.includes("iptables -L")) {
        explanations.push(
          "Lists current firewall rules to identify blocking policies",
        );
      } else if (cmd.includes("iwconfig")) {
        explanations.push(
          "Displays wireless interface configuration and signal information",
        );
      } else {
        explanations.push(
          `Executes ${cmd.split(" ")[0]} command for system analysis`,
        );
      }
    });

    return explanations.slice(0, 6); // Limit to 6 explanations
  }

  private static generateMetadata(
    keywords: string[],
    commandCount: number,
  ): {
    severity: string;
    category: string;
    riskLevel: string;
    estimatedTime: string;
  } {
    let severity = "medium";
    let category = "system";
    let riskLevel = "safe";

    // Determine category
    if (
      keywords.includes("network") ||
      keywords.includes("dns") ||
      keywords.includes("vpn") ||
      keywords.includes("wifi")
    ) {
      category = "network";
    } else if (keywords.includes("auth") || keywords.includes("firewall")) {
      category = "security";
      severity = "high";
    }

    // Determine severity
    if (
      keywords.includes("reset") ||
      keywords.some((k) => k.includes("critical"))
    ) {
      severity = "high";
    } else if (
      keywords.includes("performance") ||
      keywords.includes("diagnostic")
    ) {
      severity = "medium";
    }

    // Determine risk level
    if (keywords.includes("reset") || commandCount > 6) {
      riskLevel = "caution";
    }

    // Estimate time based on complexity
    let estimatedTime = "5-10 minutes";
    if (severity === "high" || commandCount > 8) {
      estimatedTime = "10-15 minutes";
    } else if (commandCount <= 3) {
      estimatedTime = "2-5 minutes";
    }

    return { severity, category, riskLevel, estimatedTime };
  }

  private static parseSolution(
    response: string,
    originalQuery: string,
  ): ParsedSolution {
    // Extract CLI commands from bash code blocks
    const cliCommands: string[] = [];
    const codeBlocks = response.match(
      /```(?:bash|shell|sh)?\n([\s\S]*?)\n```/gi,
    );
    if (codeBlocks) {
      codeBlocks.forEach((block) => {
        const commands = block
          .replace(/```(?:bash|shell|sh)?\n|\n```/gi, "")
          .split("\n")
          .filter((cmd) => {
            const trimmed = cmd.trim();
            return (
              trimmed &&
              !trimmed.startsWith("#") &&
              !trimmed.startsWith("//") &&
              trimmed.length > 1
            );
          })
          .map((cmd) => cmd.trim());
        cliCommands.push(...commands);
      });
    }

    // Also extract inline commands with backticks
    const inlineCommands = response.match(/`([^`]+)`/g);
    if (inlineCommands) {
      inlineCommands.forEach((cmd) => {
        const cleanCmd = cmd.replace(/`/g, "").trim();
        // Only add if it looks like a command (contains common CLI keywords)
        if (
          cleanCmd.match(
            /^(sudo|systemctl|ip|ping|curl|wget|ssh|netstat|ps|top|grep|cat|echo|ls|cd|mkdir|chmod|chown|service|ufw|iptables|nslookup|dig|traceroute|mtr|tcpdump|ss|lsof|dmesg|journalctl|fdisk|mount|umount|crontab|tar|gzip|docker|kubectl|npm|yarn|git)/,
          )
        ) {
          cliCommands.push(cleanCmd);
        }
      });
    }

    // Extract diagnosis from response
    let diagnosis = "Technical analysis";
    const diagnosisMatch = response.match(
      /\*\*DIAGNOSIS:\*\*\s*\n?(.*?)(?:\n\*\*|$)/is,
    );
    if (diagnosisMatch) {
      diagnosis = diagnosisMatch[1].trim();
    } else {
      // Fallback: use first meaningful line
      const lines = response
        .split("\n")
        .filter((line) => line.trim() && !line.startsWith("```"));
      if (lines.length > 0) {
        diagnosis = lines[0].replace(/^\*+\s*/, "").trim();
      }
    }

    // Extract explanations (numbered or bulleted lists)
    const explanations: string[] = [];
    const explanationLines = response.split("\n").filter((line) => {
      const trimmed = line.trim();
      return (
        trimmed.match(/^(\d+\.|[•\-\*]|\*\*\d+\.|\*\*[•\-\*])\s+/) ||
        (trimmed.startsWith("**EXPLANATIONS:**") === false &&
          trimmed.length > 10 &&
          !trimmed.startsWith("```") &&
          !trimmed.startsWith("#") &&
          !trimmed.match(/^\*\*[A-Z\s]+:\*\*/))
      );
    });

    explanationLines.slice(0, 5).forEach((line) => {
      const cleaned = line
        .replace(/^(\d+\.|[•\-\*]|\*\*\d+\.|\*\*[•\-\*])\s*/, "")
        .trim();
      if (cleaned) {
        explanations.push(cleaned);
      }
    });

    // Dynamic severity extraction
    let severity: ParsedSolution["severity"] = "medium";
    const severityMatch = response.match(
      /\*\*SEVERITY:\*\*\s*(critical|high|medium|low)/i,
    );
    if (severityMatch) {
      severity = severityMatch[1].toLowerCase() as ParsedSolution["severity"];
    } else {
      // Analyze content for severity indicators
      const lowerResponse = response.toLowerCase();
      if (
        lowerResponse.includes("critical") ||
        lowerResponse.includes("urgent") ||
        lowerResponse.includes("immediate")
      ) {
        severity = "critical";
      } else if (
        lowerResponse.includes("high") ||
        lowerResponse.includes("important") ||
        lowerResponse.includes("security")
      ) {
        severity = "high";
      } else if (
        lowerResponse.includes("low") ||
        lowerResponse.includes("minor")
      ) {
        severity = "low";
      }
    }

    // Dynamic category extraction
    let category: ParsedSolution["category"] = "system";
    const categoryMatch = response.match(
      /\*\*CATEGORY:\*\*\s*(network|security|system|application)/i,
    );
    if (categoryMatch) {
      category = categoryMatch[1].toLowerCase() as ParsedSolution["category"];
    } else {
      // Analyze query and response for category
      const combined = (originalQuery + " " + response).toLowerCase();
      if (
        combined.match(
          /network|vpn|dns|ip|routing|ethernet|wifi|internet|connectivity/,
        )
      ) {
        category = "network";
      } else if (
        combined.match(
          /security|auth|login|firewall|vulnerability|hack|breach|malware/,
        )
      ) {
        category = "security";
      } else if (
        combined.match(/app|application|software|service|web|api|database/)
      ) {
        category = "application";
      }
    }

    // Dynamic risk level extraction
    let riskLevel: ParsedSolution["riskLevel"] = "safe";
    const riskMatch = response.match(
      /\*\*RISK LEVEL:\*\*\s*(safe|caution|dangerous)/i,
    );
    if (riskMatch) {
      riskLevel = riskMatch[1].toLowerCase() as ParsedSolution["riskLevel"];
    } else {
      // Analyze commands for risk
      const dangerousCommands =
        /rm\s+-.*[rf]|format|fdisk|mkfs|dd\s+if=.*of=|shred|wipefs/i;
      const cautionCommands =
        /restart|reboot|stop|kill|systemctl.*stop|service.*stop|iptables.*DROP|ufw.*deny/i;

      if (cliCommands.some((cmd) => dangerousCommands.test(cmd))) {
        riskLevel = "dangerous";
      } else if (cliCommands.some((cmd) => cautionCommands.test(cmd))) {
        riskLevel = "caution";
      }
    }

    // Dynamic time estimation
    let estimatedTime = "5-15 minutes";
    const timeMatch = response.match(/\*\*ESTIMATED TIME:\*\*\s*([^*\n]+)/i);
    if (timeMatch) {
      estimatedTime = timeMatch[1].trim();
    } else {
      // Estimate based on severity and command count
      const commandCount = cliCommands.length;
      if (severity === "critical") {
        estimatedTime = "2-5 minutes";
      } else if (severity === "high" || commandCount > 8) {
        estimatedTime = "5-10 minutes";
      } else if (severity === "medium" || commandCount > 4) {
        estimatedTime = "10-15 minutes";
      } else {
        estimatedTime = "15-30 minutes";
      }
    }

    return {
      diagnosis,
      cliCommands,
      explanations,
      severity,
      category,
      estimatedTime,
      riskLevel,
    };
  }

  static async testConnection(): Promise<{
    connected: boolean;
    error?: string;
  }> {
    // Skip fetch entirely in hosted environments
    if (!this.canAccessLocalhost()) {
      return {
        connected: false,
        error: "Running in hosted environment - localhost access not available",
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
        mode: "cors",
      });

      clearTimeout(timeoutId);
      return { connected: response.ok };
    } catch (error) {
      let errorMessage = "Connection failed";

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "Connection timeout";
        } else if (error.message.includes("CORS")) {
          errorMessage = "CORS policy blocks localhost access";
        } else if (error.message.includes("Failed to fetch")) {
          errorMessage = "Network error - Ollama may not be running";
        } else {
          errorMessage = error.message;
        }
      }

      return { connected: false, error: errorMessage };
    }
  }

  // Verify if the specific model is available
  static async verifyModel(): Promise<{
    available: boolean;
    installedModels: string[];
    error?: string;
  }> {
    if (!this.canAccessLocalhost()) {
      return {
        available: false,
        installedModels: [],
        error: "Cannot access localhost from hosted environment",
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
        mode: "cors",
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const installedModels = data.models?.map((m: any) => m.name) || [];
        const hasLlama31 = installedModels.some(
          (name: string) =>
            name.includes("llama3.1:8b") || name.includes("llama3.1"),
        );

        return {
          available: hasLlama31,
          installedModels,
          error: hasLlama31
            ? undefined
            : `Model ${this.model} not found. Available models: ${installedModels.join(", ")}`,
        };
      } else {
        return {
          available: false,
          installedModels: [],
          error: `Ollama API error: ${response.status}`,
        };
      }
    } catch (error) {
      return {
        available: false,
        installedModels: [],
        error:
          error instanceof Error ? error.message : "Failed to verify model",
      };
    }
  }

  // Helper method for UI to show connection status
  static getConnectionInfo(): {
    canConnect: boolean;
    environment: "local" | "hosted";
    message: string;
    model: string;
  } {
    const isHosted = this.isHostedEnvironment();

    if (isHosted) {
      return {
        canConnect: false,
        environment: "hosted",
        message: "Running in hosted environment - using simulated AI responses",
        model: this.model,
      };
    } else {
      return {
        canConnect: true,
        environment: "local",
        message: `Local environment detected - ${this.model} integration available`,
        model: this.model,
      };
    }
  }
}

export type { ParsedSolution, LlamaResponse, LlamaRequest };
