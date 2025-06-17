import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, Home, ArrowLeft, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="p-8 text-center bg-background/50 backdrop-blur border-border/50">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-primary" />
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-2">404</h1>
          <h2 className="text-xl font-semibold mb-4">Sector Not Found</h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            The network sector you're looking for is either secured,
            quarantined, or doesn't exist in our security perimeter.
          </p>

          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link to="/" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Return to Security Dashboard
              </Link>
            </Button>

            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t border-border/20">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>NeuroSecure Security Platform</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default NotFound;
