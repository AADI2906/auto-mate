import React, { useEffect, useRef, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  AlertTriangle,
  Shield,
  Server,
  Wifi,
} from "lucide-react";

interface NetworkNode {
  id: string;
  x: number;
  y: number;
  type: "server" | "router" | "switch" | "firewall" | "endpoint";
  status: "healthy" | "warning" | "critical" | "offline";
  label: string;
  connections: string[];
  metrics: {
    cpu: number;
    memory: number;
    network: number;
  };
  threats: number;
}

interface NetworkConnection {
  from: string;
  to: string;
  status: "normal" | "suspicious" | "blocked";
  bandwidth: number;
}

const generateMockNodes = (): NetworkNode[] => [
  {
    id: "fw-1",
    x: 400,
    y: 100,
    type: "firewall",
    status: "healthy",
    label: "Main Firewall",
    connections: ["sw-1", "sw-2"],
    metrics: { cpu: 45, memory: 67, network: 78 },
    threats: 3,
  },
  {
    id: "sw-1",
    x: 200,
    y: 250,
    type: "switch",
    status: "warning",
    label: "Core Switch A",
    connections: ["fw-1", "srv-1", "srv-2", "ep-1"],
    metrics: { cpu: 82, memory: 71, network: 95 },
    threats: 1,
  },
  {
    id: "sw-2",
    x: 600,
    y: 250,
    type: "switch",
    status: "healthy",
    label: "Core Switch B",
    connections: ["fw-1", "srv-3", "ep-2", "ep-3"],
    metrics: { cpu: 34, memory: 45, network: 67 },
    threats: 0,
  },
  {
    id: "srv-1",
    x: 100,
    y: 400,
    type: "server",
    status: "healthy",
    label: "Database Server",
    connections: ["sw-1"],
    metrics: { cpu: 23, memory: 89, network: 34 },
    threats: 0,
  },
  {
    id: "srv-2",
    x: 200,
    y: 450,
    type: "server",
    status: "critical",
    label: "Web Server",
    connections: ["sw-1"],
    metrics: { cpu: 96, memory: 91, network: 88 },
    threats: 5,
  },
  {
    id: "srv-3",
    x: 600,
    y: 400,
    type: "server",
    status: "healthy",
    label: "App Server",
    connections: ["sw-2"],
    metrics: { cpu: 67, memory: 56, network: 45 },
    threats: 0,
  },
  {
    id: "ep-1",
    x: 150,
    y: 350,
    type: "endpoint",
    status: "healthy",
    label: "Workstation 1",
    connections: ["sw-1"],
    metrics: { cpu: 45, memory: 67, network: 23 },
    threats: 0,
  },
  {
    id: "ep-2",
    x: 650,
    y: 350,
    type: "endpoint",
    status: "warning",
    label: "Workstation 2",
    connections: ["sw-2"],
    metrics: { cpu: 78, memory: 45, network: 56 },
    threats: 2,
  },
  {
    id: "ep-3",
    x: 700,
    y: 300,
    type: "endpoint",
    status: "healthy",
    label: "Workstation 3",
    connections: ["sw-2"],
    metrics: { cpu: 34, memory: 23, network: 12 },
    threats: 0,
  },
];

const getNodeIcon = (type: NetworkNode["type"]) => {
  switch (type) {
    case "server":
      return Server;
    case "firewall":
      return Shield;
    case "router":
      return Wifi;
    case "switch":
      return Wifi;
    case "endpoint":
      return Server;
    default:
      return Server;
  }
};

const getStatusColor = (status: NetworkNode["status"]) => {
  switch (status) {
    case "healthy":
      return "#22c55e";
    case "warning":
      return "#f59e0b";
    case "critical":
      return "#ef4444";
    case "offline":
      return "#6b7280";
    default:
      return "#6b7280";
  }
};

export const NetworkCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<NetworkNode[]>(generateMockNodes());
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const drawNode = useCallback(
    (ctx: CanvasRenderingContext2D, node: NetworkNode) => {
      const x = (node.x + offset.x) * scale;
      const y = (node.y + offset.y) * scale;
      const radius = 20 * scale;

      // Node circle
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = getStatusColor(node.status);
      ctx.fill();

      // Node border
      ctx.strokeStyle = selectedNode?.id === node.id ? "#0ea5e9" : "#374151";
      ctx.lineWidth = selectedNode?.id === node.id ? 3 : 1;
      ctx.stroke();

      // Threat indicator
      if (node.threats > 0) {
        ctx.beginPath();
        ctx.arc(x + radius * 0.7, y - radius * 0.7, 8 * scale, 0, 2 * Math.PI);
        ctx.fillStyle = "#ef4444";
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = `${10 * scale}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(
          node.threats.toString(),
          x + radius * 0.7,
          y - radius * 0.7 + 3 * scale,
        );
      }

      // Node label
      ctx.fillStyle = "#e5e7eb";
      ctx.font = `${12 * scale}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(node.label, x, y + radius + 15 * scale);
    },
    [selectedNode, scale, offset],
  );

  const drawConnection = useCallback(
    (ctx: CanvasRenderingContext2D, from: NetworkNode, to: NetworkNode) => {
      const fromX = (from.x + offset.x) * scale;
      const fromY = (from.y + offset.y) * scale;
      const toX = (to.x + offset.x) * scale;
      const toY = (to.y + offset.y) * scale;

      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.strokeStyle = "#4b5563";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Connection status indicator
      const midX = (fromX + toX) / 2;
      const midY = (fromY + toY) / 2;

      ctx.beginPath();
      ctx.arc(midX, midY, 4 * scale, 0, 2 * Math.PI);
      ctx.fillStyle = "#22c55e";
      ctx.fill();
    },
    [scale, offset],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connections
    nodes.forEach((node) => {
      node.connections.forEach((connectionId) => {
        const connectedNode = nodes.find((n) => n.id === connectionId);
        if (connectedNode) {
          drawConnection(ctx, node, connectedNode);
        }
      });
    });

    // Draw nodes
    nodes.forEach((node) => drawNode(ctx, node));
  }, [nodes, drawNode, drawConnection]);

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / scale - offset.x;
      const y = (event.clientY - rect.top) / scale - offset.y;

      const clickedNode = nodes.find((node) => {
        const distance = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
        return distance <= 20;
      });

      setSelectedNode(clickedNode || null);
    },
    [nodes, scale, offset],
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (event.button === 1 || event.ctrlKey) {
        // Middle mouse or Ctrl+click for panning
        setIsDragging(true);
        setDragStart({
          x: event.clientX - offset.x,
          y: event.clientY - offset.y,
        });
      }
    },
    [offset],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (isDragging) {
        setOffset({
          x: event.clientX - dragStart.x,
          y: event.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleZoom = useCallback((direction: "in" | "out") => {
    setScale((prev) => {
      const newScale = direction === "in" ? prev * 1.2 : prev / 1.2;
      const clampedScale = Math.max(0.1, Math.min(3, newScale));

      // Show feedback for zoom limits
      if (clampedScale === 3 && direction === "in") {
        console.log("Maximum zoom level reached");
      } else if (clampedScale === 0.1 && direction === "out") {
        console.log("Minimum zoom level reached");
      }

      return clampedScale;
    });
  }, []);

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setSelectedNode(null);
    console.log("View reset to default");
  }, []);

  const toggleFullscreen = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!document.fullscreenElement) {
      canvas.parentElement?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        draw();
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => window.removeEventListener("resize", resizeCanvas);
  }, [draw]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setNodes((prev) =>
        prev.map((node) => ({
          ...node,
          metrics: {
            cpu: Math.max(
              0,
              Math.min(100, node.metrics.cpu + (Math.random() - 0.5) * 10),
            ),
            memory: Math.max(
              0,
              Math.min(100, node.metrics.memory + (Math.random() - 0.5) * 5),
            ),
            network: Math.max(
              0,
              Math.min(100, node.metrics.network + (Math.random() - 0.5) * 15),
            ),
          },
        })),
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="h-full flex flex-col bg-background/50 backdrop-blur border-border/50">
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Network Topology</h3>
          <Badge variant="outline" className="ml-2">
            {nodes.length} nodes
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleZoom("out")}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleZoom("in")}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={resetView}>
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair network-grid"
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {selectedNode && (
          <div className="absolute top-4 right-4 w-64">
            <Card className="p-4 bg-card/95 backdrop-blur border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: getStatusColor(selectedNode.status),
                    }}
                  />
                  <h4 className="font-semibold">{selectedNode.label}</h4>
                </div>
                {selectedNode.threats > 0 && (
                  <Badge
                    variant="destructive"
                    className="flex items-center gap-1"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {selectedNode.threats}
                  </Badge>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="capitalize">{selectedNode.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CPU:</span>
                  <span>{selectedNode.metrics.cpu.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Memory:</span>
                  <span>{selectedNode.metrics.memory.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network:</span>
                  <span>{selectedNode.metrics.network.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Connections:</span>
                  <span>{selectedNode.connections.length}</span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Card>
  );
};
