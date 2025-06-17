// Platform detection and command execution utilities
export class CommandExecutor {
  // Detect the user's operating system
  static detectPlatform(): "windows" | "macos" | "linux" | "unknown" {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();

    if (userAgent.includes("win") || platform.includes("win")) {
      return "windows";
    } else if (userAgent.includes("mac") || platform.includes("mac")) {
      return "macos";
    } else if (userAgent.includes("linux") || platform.includes("linux")) {
      return "linux";
    }

    return "unknown";
  }

  // Get appropriate terminal command for the platform
  static getTerminalCommand(command: string): string {
    const platform = this.detectPlatform();

    switch (platform) {
      case "windows":
        // For Windows, use cmd or PowerShell
        return `cmd /c "${command}"`;

      case "macos":
        // For macOS, use Terminal app
        return `osascript -e 'tell application "Terminal" to do script "${command.replace(/"/g, '\\"')}"'`;

      case "linux":
        // For Linux, try common terminal emulators
        return `gnome-terminal -- bash -c "${command}; read -p 'Press Enter to close...'"`;

      default:
        return command;
    }
  }

  // Create a downloadable script file for the commands
  static createExecutableScript(commands: string[]): {
    blob: Blob;
    filename: string;
  } {
    const platform = this.detectPlatform();
    let scriptContent: string;
    let filename: string;

    switch (platform) {
      case "windows":
        // Create batch file for Windows
        scriptContent = [
          "@echo off",
          "echo Running CLI commands...",
          "echo.",
          ...commands.map((cmd) => `echo Executing: ${cmd}`),
          ...commands.map((cmd) => cmd),
          "echo.",
          "echo Commands completed!",
          "pause",
        ].join("\r\n");
        filename = "commands.bat";
        break;

      case "macos":
      case "linux":
        // Create shell script for Unix-like systems
        scriptContent = [
          "#!/bin/bash",
          'echo "Running CLI commands..."',
          "echo",
          ...commands.map((cmd) => `echo "Executing: ${cmd}"`),
          ...commands.map((cmd) => cmd),
          "echo",
          'echo "Commands completed!"',
          'read -p "Press Enter to close..."',
        ].join("\n");
        filename = "commands.sh";
        break;

      default:
        scriptContent = commands.join("\n");
        filename = "commands.txt";
    }

    const blob = new Blob([scriptContent], { type: "text/plain" });
    return { blob, filename };
  }

  // Execute command using various methods
  static async executeCommand(
    command: string,
  ): Promise<{ success: boolean; method: string; error?: string }> {
    const platform = this.detectPlatform();

    try {
      // Method 1: Try to use custom protocol handler (if available)
      if (await this.tryProtocolHandler(command)) {
        return { success: true, method: "protocol" };
      }

      // Method 2: Try to open in system terminal
      if (await this.trySystemTerminal(command)) {
        return { success: true, method: "terminal" };
      }

      // Method 3: Copy to clipboard and show instructions
      await this.copyToClipboard(command);
      return { success: true, method: "clipboard" };
    } catch (error) {
      return {
        success: false,
        method: "none",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Try custom protocol handler (works if user has configured it)
  private static async tryProtocolHandler(command: string): Promise<boolean> {
    try {
      const platform = this.detectPlatform();
      let protocolUrl: string;

      switch (platform) {
        case "windows":
          protocolUrl = `ms-terminal:${encodeURIComponent(command)}`;
          break;
        case "macos":
          protocolUrl = `terminal://${encodeURIComponent(command)}`;
          break;
        case "linux":
          protocolUrl = `terminal://${encodeURIComponent(command)}`;
          break;
        default:
          return false;
      }

      window.location.href = protocolUrl;
      return true;
    } catch {
      return false;
    }
  }

  // Try to open system terminal (limited by browser security)
  private static async trySystemTerminal(command: string): Promise<boolean> {
    try {
      const platform = this.detectPlatform();

      if (platform === "windows") {
        // Try Windows Terminal or cmd
        const terminalCommand = `wt.exe cmd /k "${command}"`;
        window.open(`ms-terminal:${encodeURIComponent(terminalCommand)}`);
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  // Copy command to clipboard
  private static async copyToClipboard(command: string): Promise<void> {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(command);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = command;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  }

  // Get platform-specific instructions for running commands
  static getPlatformInstructions(): string {
    const platform = this.detectPlatform();

    switch (platform) {
      case "windows":
        return "Open Command Prompt (cmd) or PowerShell and paste the command";
      case "macos":
        return "Open Terminal (Applications > Utilities > Terminal) and paste the command";
      case "linux":
        return "Open your terminal emulator (Ctrl+Alt+T) and paste the command";
      default:
        return "Open your system terminal and paste the command";
    }
  }

  // Get platform emoji for UI
  static getPlatformEmoji(): string {
    const platform = this.detectPlatform();

    switch (platform) {
      case "windows":
        return "🪟";
      case "macos":
        return "🍎";
      case "linux":
        return "🐧";
      default:
        return "💻";
    }
  }
}

export default CommandExecutor;
