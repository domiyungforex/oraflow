"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardLayout, useDashboardHeader } from "@/components/layout/dashboard-layout";
import { Zap, Bell, MessageSquare, Package, ArrowRight, Plus } from "lucide-react";

export default function AutomationsPage() {
  return (
    <DashboardLayout
      title="Automations"
      description="Automate repetitive business tasks"
      actions={
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Automation
        </Button>
      }
    >
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Automations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Runs (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Time Saved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 hours</div>
          </CardContent>
        </Card>
      </div>

      {/* Automation Templates */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Quick Start Templates</CardTitle>
          <CardDescription>Set up common automations in seconds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Button variant="outline" className="justify-start h-auto py-4 flex-col items-start">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4" />
                <span className="font-medium">Order Confirmation</span>
              </div>
              <span className="text-xs text-muted-foreground">Auto-notify on new orders</span>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-4 flex-col items-start">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4" />
                <span className="font-medium">Payment Follow-up</span>
              </div>
              <span className="text-xs text-muted-foreground">Remind for unpaid orders</span>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-4 flex-col items-start">
              <div className="flex items-center gap-2 mb-1">
                <Bell className="h-4 w-4" />
                <span className="font-medium">Low Stock Alert</span>
              </div>
              <span className="text-xs text-muted-foreground">Get notified when stock is low</span>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-4 flex-col items-start">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-4 w-4" />
                <span className="font-medium">Delivery Update</span>
              </div>
              <span className="text-xs text-muted-foreground">Auto-notify on delivery status</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Automations */}
      <Card>
        <CardHeader>
          <CardTitle>Your Automations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No automations yet</p>
            <p className="text-sm mb-4">
              Create your first automation to save time on repetitive tasks
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Automation
            </Button>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
