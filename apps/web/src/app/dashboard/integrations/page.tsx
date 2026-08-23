"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DashboardLayout,
  useDashboardHeader,
} from "@/components/layout/dashboard-layout";
import {
  MessageSquare,
  CreditCard,
  Mail,
  Truck,
  Calculator,
  ExternalLink,
  Check,
} from "lucide-react";

const availableIntegrations = [
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description:
      "Receive and respond to customer orders via WhatsApp",
    icon: MessageSquare,
    category: "Messaging",
    docsUrl: "https://developers.facebook.com/docs/whatsapp",
  },
  {
    id: "paystack",
    name: "Paystack",
    description:
      "Accept payments via card, bank transfer, and USSD",
    icon: CreditCard,
    category: "Payments",
    docsUrl: "https://paystack.com/docs",
  },
  {
    id: "email",
    name: "Email Notifications",
    description:
      "Send order confirmations and updates via email",
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
    description:
      "Sync transactions with your accounting system",
    icon: Calculator,
    category: "Finance",
    docsUrl: "#",
  },
];

const categories = [
  "All",
  "Messaging",
  "Payments",
  "Notifications",
  "Logistics",
  "Finance",
];

export default function IntegrationsPage() {
  const setHeader = useDashboardHeader();
  const [activeCategory, setActiveCategory] = useState("All");
  const [connected, setConnected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setHeader({
      title: "Integrations",
      description: "Connect OrderFlow with your favorite tools",
    });
    return () => setHeader({ title: undefined, description: undefined });
  }, [setHeader]);

  const filtered =
    activeCategory === "All"
      ? availableIntegrations
      : availableIntegrations.filter((i) => i.category === activeCategory);

  const handleConnect = (id: string) => {
    setConnected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <DashboardLayout>
      {/* Category Filters */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map((category) => (
          <Button
            key={category}
            variant={activeCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(category)}
            className="shrink-0"
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((integration) => {
          const Icon = integration.icon;
          const isConnected = connected[integration.id];
          return (
            <Card key={integration.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {integration.name}
                      </CardTitle>
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
                  <Button
                    className="flex-1"
                    variant={isConnected ? "outline" : "default"}
                    onClick={() => handleConnect(integration.id)}
                  >
                    {isConnected ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Connected
                      </>
                    ) : (
                      "Connect"
                    )}
                  </Button>
                  <a
                    href={integration.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="icon">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-2">No integrations found</p>
          <p className="text-sm">
            Try selecting a different category
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}
