"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronRight, Store, Package, MessageSquare, CreditCard } from "lucide-react";

const steps = [
  { id: 1, name: "Business Info", icon: Store },
  { id: 2, name: "Add Products", icon: Package },
  { id: 3, name: "Connect WhatsApp", icon: MessageSquare },
  { id: 4, name: "Payment Setup", icon: CreditCard },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [businessData, setBusinessData] = useState({
    name: "",
    industry: "",
    country: "NG",
    currency: "NGN",
    timezone: "Africa/Lagos",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useUser();
  const router = useRouter();

  const handleBusinessInfoSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Create business via API
      const response = await fetch("/api/v1/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(businessData),
      });

      if (response.ok) {
        setCurrentStep(2);
      }
    } catch (error) {
      console.error("Failed to create business:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipToDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">OF</span>
            </div>
            <span className="text-xl font-bold">OrderFlow</span>
          </div>
          <Button variant="ghost" onClick={handleSkipToDashboard}>
            Skip for now
          </Button>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentStep > step.id
                        ? "bg-green-500 text-white"
                        : currentStep === step.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <step.icon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium hidden sm:inline ${
                      currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Tell us about your business</CardTitle>
                <CardDescription>
                  This helps us customize OrderFlow for your needs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Business Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Adaeze's Fresh Mart"
                    value={businessData.name}
                    onChange={(e) =>
                      setBusinessData({ ...businessData, name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    placeholder="e.g., Food & Beverage, Electronics, Fashion"
                    value={businessData.industry}
                    onChange={(e) =>
                      setBusinessData({ ...businessData, industry: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={businessData.country}
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      value={businessData.currency}
                      disabled
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={handleBusinessInfoSubmit}
                    disabled={!businessData.name || isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? "Creating..." : "Continue"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Add your first products</CardTitle>
                <CardDescription>
                  Add products so customers can order them. You can also do this later.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Add products manually</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add products one by one with name, price, and stock.
                  </p>
                  <Button onClick={() => setCurrentStep(3)}>
                    Add Products
                  </Button>
                </div>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">or</p>
                  <Button variant="outline" onClick={() => setCurrentStep(3)}>
                    Skip for now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Connect WhatsApp</CardTitle>
                <CardDescription>
                  Allow customers to order via WhatsApp messages.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">WhatsApp Business Cloud API</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect your WhatsApp Business account to receive and respond to customer messages.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Receive customer orders automatically</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>AI-powered order understanding</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Send order confirmations</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => setCurrentStep(4)} className="flex-1">
                    Connect WhatsApp
                  </Button>
                  <Button variant="outline" onClick={() => setCurrentStep(4)}>
                    Skip
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Setup</CardTitle>
                <CardDescription>
                  Connect a payment provider to receive payments.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Paystack</h4>
                        <p className="text-sm text-muted-foreground">
                          Accept payments via card, bank transfer, and USSD
                        </p>
                      </div>
                    </div>
                    <Badge variant="success">Recommended</Badge>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSkipToDashboard} className="flex-1">
                    Connect Paystack
                  </Button>
                  <Button variant="outline" onClick={handleSkipToDashboard}>
                    Skip for now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
