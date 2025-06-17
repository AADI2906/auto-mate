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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for generation

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

      return { response: fullResponse, solution, isFromLlama: true };
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

  private static async mockResponse(
    query: string,
    onStream?: (chunk: string) => void,
    onComplete?: (fullResponse: string, parsed: ParsedSolution) => void,
  ): Promise<{ response: string; solution: ParsedSolution }> {
    const mockResponses = this.generateMockResponse(query);
    let fullResponse = "";

    // Add a note that this is a mock response
    const mockPrefix = "🔄 **Simulated Response** (Llama not available)\n\n";
    onStream?.(mockPrefix);
    fullResponse += mockPrefix;

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

    // Network Reset Commands
    if (
      queryLower.includes("network reset") ||
      queryLower.includes("reset network") ||
      queryLower.includes("restart network") ||
      queryLower.includes("network restart")
    ) {
      return [
        "**Complete Network Reset Procedure**\n\n",
        "**Diagnosis:**\n",
        "Network reset will flush all network configurations, restart services, and re-establish connections.\n\n",
        "**Network Reset Commands (Step-by-Step):**\n\n",
        "1. **Flush DNS cache:**\n",
        "```bash\n",
        "sudo systemd-resolve --flush-caches\n",
        "sudo resolvectl flush-caches\n",
        "```\n\n",
        "2. **Reset network interface:**\n",
        "```bash\n",
        "sudo ip link set eth0 down\n",
        "sudo ip link set eth0 up\n",
        "sudo dhclient -r && sudo dhclient\n",
        "```\n\n",
        "3. **Restart network services:**\n",
        "```bash\n",
        "sudo systemctl restart NetworkManager\n",
        "sudo systemctl restart networking\n",
        "sudo systemctl restart systemd-networkd\n",
        "```\n\n",
        "4. **Clear ARP table:**\n",
        "```bash\n",
        "sudo ip neigh flush all\n",
        "arp -d -a\n",
        "```\n\n",
        "5. **Reset routing table:**\n",
        "```bash\n",
        "sudo ip route flush table main\n",
        "sudo systemctl restart NetworkManager\n",
        "```\n\n",
        "6. **Verify reset:**\n",
        "```bash\n",
        "ip addr show\n",
        "ip route show\n",
        "ping 8.8.8.8\n",
        "nslookup google.com\n",
        "```\n\n",
        "**Severity:** Medium | **Category:** Network | **Risk:** Caution | **ETA:** 3-5 minutes",
      ];
    }

    // IP Configuration Reset
    if (
      queryLower.includes("ip reset") ||
      queryLower.includes("reset ip") ||
      queryLower.includes("ip config")
    ) {
      return [
        "**IP Configuration Reset**\n\n",
        "**Diagnosis:**\n",
        "Resetting IP configuration to resolve addressing and connectivity issues.\n\n",
        "**IP Reset Commands:**\n\n",
        "1. **Release current IP:**\n",
        "```bash\n",
        "sudo dhclient -r\n",
        "sudo ip addr flush dev eth0\n",
        "```\n\n",
        "2. **Renew IP address:**\n",
        "```bash\n",
        "sudo dhclient eth0\n",
        "sudo systemctl restart dhcpcd\n",
        "```\n\n",
        "3. **Set static IP (if needed):**\n",
        "```bash\n",
        "sudo ip addr add 192.168.1.100/24 dev eth0\n",
        "sudo ip route add default via 192.168.1.1\n",
        "```\n\n",
        "4. **Verify IP configuration:**\n",
        "```bash\n",
        "ip addr show eth0\n",
        "ip route show\n",
        "ping -c 3 8.8.8.8\n",
        "```\n\n",
        "**Severity:** Low | **Category:** Network | **Risk:** Safe | **ETA:** 2-3 minutes",
      ];
    }

    // DNS Issues
    if (
      queryLower.includes("dns") ||
      queryLower.includes("domain") ||
      queryLower.includes("resolve")
    ) {
      return [
        "**DNS Resolution Issues Fix**\n\n",
        "**Diagnosis:**\n",
        "DNS resolution problems prevent domain name lookups and internet connectivity.\n\n",
        "**DNS Troubleshooting Commands:**\n\n",
        "1. **Flush DNS cache:**\n",
        "```bash\n",
        "sudo systemd-resolve --flush-caches\n",
        "sudo resolvectl flush-caches\n",
        "```\n\n",
        "2. **Test DNS servers:**\n",
        "```bash\n",
        "nslookup google.com 8.8.8.8\n",
        "dig @1.1.1.1 google.com\n",
        "```\n\n",
        "3. **Check DNS configuration:**\n",
        "```bash\n",
        "cat /etc/resolv.conf\n",
        "systemd-resolve --status\n",
        "```\n\n",
        "4. **Set reliable DNS servers:**\n",
        "```bash\n",
        "echo 'nameserver 8.8.8.8' | sudo tee /etc/resolv.conf\n",
        "echo 'nameserver 1.1.1.1' | sudo tee -a /etc/resolv.conf\n",
        "```\n\n",
        "5. **Restart DNS services:**\n",
        "```bash\n",
        "sudo systemctl restart systemd-resolved\n",
        "sudo systemctl restart NetworkManager\n",
        "```\n\n",
        "**Severity:** Medium | **Category:** Network | **Risk:** Safe | **ETA:** 3-5 minutes",
      ];
    }

    // Firewall Issues
    if (
      queryLower.includes("firewall") ||
      queryLower.includes("blocked") ||
      queryLower.includes("port")
    ) {
      return [
        "**Firewall and Port Issues**\n\n",
        "**Diagnosis:**\n",
        "Firewall rules may be blocking network traffic or specific ports.\n\n",
        "**Firewall Troubleshooting:**\n\n",
        "1. **Check firewall status:**\n",
        "```bash\n",
        "sudo ufw status verbose\n",
        "sudo iptables -L -n\n",
        "```\n\n",
        "2. **Test port connectivity:**\n",
        "```bash\n",
        "sudo netstat -tulpn | grep :80\n",
        "sudo ss -tulpn | grep :443\n",
        "nc -zv target-server 80\n",
        "```\n\n",
        "3. **Temporarily disable firewall (testing only):**\n",
        "```bash\n",
        "sudo ufw disable\n",
        "sudo systemctl stop iptables\n",
        "```\n\n",
        "4. **Allow specific ports:**\n",
        "```bash\n",
        "sudo ufw allow 80/tcp\n",
        "sudo ufw allow 443/tcp\n",
        "sudo ufw allow ssh\n",
        "```\n\n",
        "5. **Re-enable firewall:**\n",
        "```bash\n",
        "sudo ufw enable\n",
        "sudo systemctl start iptables\n",
        "```\n\n",
        "**Severity:** High | **Category:** Security | **Risk:** Caution | **ETA:** 5-10 minutes",
      ];
    }

    // VPN Issues
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

    // Performance Issues
    if (
      queryLower.includes("slow") ||
      queryLower.includes("performance") ||
      queryLower.includes("lag")
    ) {
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

    // Authentication Issues
    if (
      queryLower.includes("auth") ||
      queryLower.includes("login") ||
      queryLower.includes("password")
    ) {
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

    // WiFi Issues
    if (
      queryLower.includes("wifi") ||
      queryLower.includes("wireless") ||
      queryLower.includes("wlan")
    ) {
      return [
        "**WiFi Connection Troubleshooting**\n\n",
        "**Diagnosis:**\n",
        "WiFi connectivity issues require checking wireless adapter, drivers, and connection settings.\n\n",
        "**WiFi Diagnostic Commands:**\n\n",
        "1. **Check wireless interface:**\n",
        "```bash\n",
        "iwconfig\n",
        "ip link show\n",
        "lspci | grep -i wireless\n",
        "```\n\n",
        "2. **Scan for networks:**\n",
        "```bash\n",
        "sudo iwlist scan | grep ESSID\n",
        "nmcli dev wifi list\n",
        "```\n\n",
        "3. **Restart wireless services:**\n",
        "```bash\n",
        "sudo systemctl restart NetworkManager\n",
        "sudo modprobe -r iwlwifi && sudo modprobe iwlwifi\n",
        "```\n\n",
        "4. **Connect to WiFi:**\n",
        "```bash\n",
        "nmcli dev wifi connect 'SSID' password 'password'\n",
        "sudo wpa_supplicant -B -i wlan0 -c /etc/wpa_supplicant.conf\n",
        "```\n\n",
        "5. **Check connection status:**\n",
        "```bash\n",
        "iwconfig wlan0\n",
        "ping -c 3 8.8.8.8\n",
        "```\n\n",
        "**Severity:** Medium | **Category:** Network | **Risk:** Safe | **ETA:** 5-8 minutes",
      ];
    }

    // Default response for other queries
    return [
      "**General Network Diagnostic Analysis**\n\n",
      "**Initial Diagnosis:**\n",
      "I'll provide comprehensive network troubleshooting steps for your query.\n\n",
      "**Essential Network Commands:**\n\n",
      "1. **Network interface status:**\n",
      "```bash\n",
      "ip addr show\n",
      "ip link show\n",
      "ifconfig -a\n",
      "```\n\n",
      "2. **Connectivity testing:**\n",
      "```bash\n",
      "ping -c 5 8.8.8.8\n",
      "ping -c 5 google.com\n",
      "traceroute 8.8.8.8\n",
      "```\n\n",
      "3. **DNS and routing:**\n",
      "```bash\n",
      "nslookup google.com\n",
      "ip route show\n",
      "cat /etc/resolv.conf\n",
      "```\n\n",
      "4. **Port and service checking:**\n",
      "```bash\n",
      "netstat -tulpn\n",
      "ss -tulpn\n",
      "systemctl status NetworkManager\n",
      "```\n\n",
      "5. **Network logs:**\n",
      "```bash\n",
      "sudo journalctl -u NetworkManager -f\n",
      "dmesg | grep -i network\n",
      "```\n\n",
      "**Severity:** Medium | **Category:** Network | **Risk:** Safe | **ETA:** 5-10 minutes",
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

  // Helper method for UI to show connection status
  static getConnectionInfo(): {
    canConnect: boolean;
    environment: "local" | "hosted";
    message: string;
  } {
    const isHosted = this.isHostedEnvironment();

    if (isHosted) {
      return {
        canConnect: false,
        environment: "hosted",
        message: "Running in hosted environment - using simulated AI responses",
      };
    } else {
      return {
        canConnect: true,
        environment: "local",
        message:
          "Local environment detected - real Llama integration available",
      };
    }
  }
}

export type { ParsedSolution, LlamaResponse, LlamaRequest };
