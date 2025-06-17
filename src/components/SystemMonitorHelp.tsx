import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Monitor,
  Download,
  Terminal,
  CheckCircle,
  AlertTriangle,
  Info,
  ExternalLink,
  Copy,
  Shield,
  Zap,
  Activity,
} from "lucide-react";

export const SystemMonitorHelp: React.FC = () => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const installCommands = {
    linux: `# Install Python dependencies
sudo apt-get update
sudo apt-get install python3 python3-pip

# Download and run installer
curl -O https://your-domain.com/scripts/install-agent.sh
chmod +x install-agent.sh
./install-agent.sh`,

    mac: `# Install Python using Homebrew
brew install python3

# Download and run installer
curl -O https://your-domain.com/scripts/install-agent.sh
chmod +x install-agent.sh
./install-agent.sh`,

    windows: `# Install Python from python.org
# Download PowerShell installer script
Invoke-WebRequest -Uri "https://your-domain.com/scripts/install-agent.ps1" -OutFile "install-agent.ps1"
PowerShell -ExecutionPolicy Bypass -File install-agent.ps1`,
  };

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card className="p-6 bg-background/50 backdrop-blur border-border/50">
        <div className="flex items-center gap-3 mb-4">
          <Monitor className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">Real-Time System Monitoring</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-400" />
              Browser Mode (Active)
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>CPU core count and basic usage</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>JavaScript memory usage (Chrome)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Network connection information</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>GPU vendor and renderer details</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Storage estimates and platform info</span>
              </div>
            </div>
            <Badge className="mt-3 bg-green-500/10 text-green-400">
              ✓ Ready - No setup required
            </Badge>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-400" />
              Enhanced Mode (Local Agent)
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-400" />
                <span>Real CPU usage per core</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-400" />
                <span>Physical RAM and swap usage</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-400" />
                <span>Live network flows and connections</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-400" />
                <span>Process monitor with PID details</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-400" />
                <span>GPU usage and temperature (NVIDIA)</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-400" />
                <span>Disk I/O and temperature monitoring</span>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Badge className="mt-3 bg-orange-500/10 text-orange-400 cursor-pointer hover:bg-orange-500/20">
                  ⚡ Requires Local Agent
                </Badge>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-4xl max-h-[80vh]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Install Local Monitoring Agent
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-4">
                      <p>
                        Install the local Python agent to unlock full system
                        monitoring capabilities including real CPU usage,
                        physical memory, network flows, and process monitoring.
                      </p>

                      <div className="bg-muted/20 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Shield className="h-4 w-4 text-green-400" />
                          Security Information
                        </h4>
                        <ul className="text-sm space-y-1">
                          <li>• Agent runs locally on your machine</li>
                          <li>• WebSocket connection to localhost:8765 only</li>
                          <li>• No data sent to external servers</li>
                          <li>• Full source code available for review</li>
                        </ul>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold">Installation Steps:</h4>

                        <div className="space-y-3">
                          <div>
                            <h5 className="font-medium mb-2">
                              1. Download Installation Files
                            </h5>
                            <div className="bg-muted/20 p-3 rounded text-sm font-mono">
                              <div className="flex items-center justify-between">
                                <span>install-agent.sh</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    copyToClipboard(installCommands.linux)
                                  }
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h5 className="font-medium mb-2">
                              2. Run Installation
                            </h5>
                            <div className="bg-muted/20 p-3 rounded text-sm font-mono">
                              chmod +x install-agent.sh
                              <br />
                              ./install-agent.sh
                            </div>
                          </div>

                          <div>
                            <h5 className="font-medium mb-2">
                              3. Start Monitoring Agent
                            </h5>
                            <div className="bg-muted/20 p-3 rounded text-sm font-mono">
                              ./start-agent.sh
                            </div>
                          </div>

                          <div>
                            <h5 className="font-medium mb-2">
                              4. Verify Connection
                            </h5>
                            <p className="text-sm text-muted-foreground">
                              The dashboard will automatically detect and
                              connect to your local agent. Look for the green
                              "Connected" indicator in the System Monitor.
                            </p>
                          </div>
                        </div>

                        <Separator />

                        <div>
                          <h4 className="font-semibold mb-2">
                            Platform-Specific Instructions:
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {Object.entries(installCommands).map(
                              ([platform, commands]) => (
                                <div
                                  key={platform}
                                  className="bg-muted/20 p-3 rounded"
                                >
                                  <h5 className="font-medium mb-2 capitalize">
                                    {platform}
                                  </h5>
                                  <pre className="text-xs overflow-x-auto">
                                    {commands}
                                  </pre>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 w-full"
                                    onClick={() => copyToClipboard(commands)}
                                  >
                                    <Copy className="h-3 w-3 mr-2" />
                                    Copy
                                  </Button>
                                </div>
                              ),
                            )}
                          </div>
                        </div>

                        <div className="bg-yellow-500/10 p-4 rounded-lg">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-400" />
                            Requirements
                          </h4>
                          <ul className="text-sm space-y-1">
                            <li>• Python 3.7 or later</li>
                            <li>
                              • Administrator/root access for system metrics
                            </li>
                            <li>
                              • Port 8765 available (not blocked by firewall)
                            </li>
                            <li>
                              • Optional: NVIDIA drivers for GPU monitoring
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Close</AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button
                      onClick={() =>
                        window.open(
                          "https://github.com/yourusername/neurosecure-agent",
                          "_blank",
                        )
                      }
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on GitHub
                    </Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </Card>

      {/* Quick Start */}
      <Card className="p-6 bg-background/50 backdrop-blur border-border/50">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          Quick Start Guide
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">Browser Mode (Current)</h4>
            <div className="space-y-2 text-sm">
              <p>
                You're currently viewing real-time metrics collected through
                browser APIs. This includes:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>CPU core count from navigator.hardwareConcurrency</li>
                <li>Memory usage from performance.memory (Chrome)</li>
                <li>Network info from navigator.connection</li>
                <li>GPU details from WebGL context</li>
                <li>Storage estimates from navigator.storage</li>
              </ul>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Enhanced Mode Benefits</h4>
            <div className="space-y-2 text-sm">
              <p>Installing the local agent provides:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Real CPU usage percentages per core</li>
                <li>Physical RAM usage and swap information</li>
                <li>Live network connections and traffic flows</li>
                <li>Detailed process list with resource usage</li>
                <li>GPU temperature and utilization (NVIDIA)</li>
                <li>Disk I/O operations and performance</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Troubleshooting */}
      <Card className="p-6 bg-background/50 backdrop-blur border-border/50">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Info className="h-5 w-5" />
          Troubleshooting
        </h3>

        <ScrollArea className="h-64">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">
                Dashboard shows "Disconnected"
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Ensure the local agent is running on port 8765</li>
                <li>• Check firewall settings for localhost connections</li>
                <li>• Verify Python dependencies are installed</li>
                <li>• Try restarting the agent with ./start-agent.sh</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">
                Agent fails to start with "Permission denied"
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  • Run with sudo (Linux/Mac) or as Administrator (Windows)
                </li>
                <li>• Check that port 8765 is not in use by another service</li>
                <li>• Ensure Python has permission to access system APIs</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">
                Missing GPU information or temperatures
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Install pynvml for NVIDIA GPU support</li>
                <li>• Ensure GPU drivers are properly installed</li>
                <li>• Check that the agent has hardware access permissions</li>
                <li>• AMD/Intel GPU support requires additional libraries</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">
                High CPU usage from monitoring
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Increase update interval in the agent configuration</li>
                <li>• Reduce the number of processes being monitored</li>
                <li>• Disable unused metric collection modules</li>
                <li>
                  • Monitor fewer network connections if causing performance
                  issues
                </li>
              </ul>
            </div>
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
};
