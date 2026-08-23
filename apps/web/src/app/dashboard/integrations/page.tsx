"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardLayout, useDashboardHeader } from "@/components/layout/dashboard-layout";
import { MessageSquare, CreditCard, Mail, Truck, Calculator, ExternalLink } from "lucide-react";

const availableIntegrations = [
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Receive and respond to customer orders via WhatsApp",
    icon: MessageSquare,
    category: "Messaging",
    docsUrl: "https://developers.facebook.com/docs/whatsapp",
  },
  {
    id: "paystack",
    name: "Paystack",
    description: "Accept payments via card, bank transfer, and USSD",
    icon: CreditCard,
    category: "Payments",
    docsUrl: "https://paystack.com/docs",
  },
  {
    id: "email",
    name: "Email Notifications",
    description: "Send order confirmations and updates via email",
    icon: Mail,
    category: "Notifications",
    docsUrl: "#",
  },
  {
    id: "delivery",
    name: "Delivery Service",
    description: "Integrate with local delivery partners",
    icon: Truck,
    category: "Logistics",
    docsUrl: "#",
  },
  {
    id: "accounting",
    name: "Accounting Software",
    description: "Sync transactions with your accounting system",
    icon: Calculator,
    category: "Finance",
    docsUrl: "#",
  },
];

const categories = ["All", "Messaging", "Payments", "Notifications", "Logistics", "Finance"];

export default function IntegrationsPage() {
  return (
    <DashboardLayout
      title="Integrations"
      description="Connect OrderFlow with your favorite tools"
    >
      {/* Category Filters */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto">
        {categories.map((category, index) => (
          <Button
            key={category}
            variant={index === 0 ? "default" : "outline"}
            size="sm"
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Available Integrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableIntegrations.map((integration) => {
          const Icon = integration.icon;
          return (
            <Card key={integration.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{integration.name}</CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        {integration.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {integration.description}
                </p>
                <div className="flex gap-2">
                  <Button className="flex-1">
                    Connect
                  </Button>
                  <Button variant="ghost" size="icon" asChild>
                    <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
