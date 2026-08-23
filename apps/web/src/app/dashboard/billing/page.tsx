"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardLayout, useDashboardHeader } from "@/components/layout/dashboard-layout";
import { formatCurrency } from "@/lib/utils";
import { useBusiness } from "@/hooks/use-api";
import { CreditCard, Check, Crown, ArrowRight } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: 10000,
    interval: "monthly",
    features: [
      "Up to 100 orders/month",
      "WhatsApp integration",
      "Basic analytics",
      "1 team member",
      "Email support",
    ],
    popular: false,
  },
  {
    name: "Professional",
    price: 25000,
    interval: "monthly",
    features: [
      "Unlimited orders",
      "WhatsApp integration",
      "AI-powered ordering",
      "Analytics dashboard",
      "Team collaboration",
      "Priority support",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: 75000,
    interval: "monthly",
    features: [
      "Everything in Professional",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
      "Advanced API access",
      "White-label options",
    ],
    popular: false,
  },
];

export default function BillingPage() {
  const { data: businessData, isLoading } = useBusiness();
  const business = businessData?.data;

  return (
    <DashboardLayout
      title="Billing"
      description="Manage your subscription and payments"
    >
      {/* Current Plan */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                {isLoading ? (
                  <div className="h-6 skeleton rounded w-48" />
                ) : (
                  `Plan: ${business?.subscription?.planId || "Free Trial"}`
                )}
              </CardTitle>
              <CardDescription>
                Manage your subscription and billing
              </CardDescription>
            </div>
            <Badge variant="success">
              <Check className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">Subscription management coming soon</p>
            <p className="text-sm mb-4">
              Choose a plan below to get started with OrderFlow
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Choose Your Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <Card key={plan.name} className={plan.popular ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.popular && <Badge>Popular</Badge>}
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{formatCurrency(plan.price)}</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.popular ? "default" : "outline"}
                  className="w-full"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Payment Method */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <CreditCard className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              Payment method setup will be available when you choose a plan
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No invoices yet</p>
            <p className="text-xs mt-1">Invoices will appear here after your first payment</p>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
