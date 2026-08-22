import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">OF</span>
          </div>
          <span className="text-xl font-bold">OrderFlow</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Features
          </Link>
          <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link href="/sign-in" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Start free
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center px-6 py-24 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          Turn customer conversations into completed orders
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
          OrderFlow automates orders, payments, inventory and fulfillment so your business can operate with less manual work.
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="/sign-up"
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Start free
          </Link>
          <Link
            href="#how-it-works"
            className="border border-border px-6 py-3 rounded-lg font-medium hover:bg-muted transition-colors"
          >
            See how it works
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-20 bg-muted/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything you need to automate your business
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              title="WhatsApp Ordering"
              description="Customers send orders via WhatsApp. OrderFlow understands natural language and creates orders automatically."
              icon="💬"
            />
            <FeatureCard
              title="AI-Powered"
              description="Understands product names, quantities, and delivery instructions. Resolves spelling mistakes and product aliases."
              icon="🤖"
            />
            <FeatureCard
              title="Payment Processing"
              description="Integrated with Paystack. Send payment requests, verify payments, and track transaction history."
              icon="💳"
            />
            <FeatureCard
              title="Inventory Management"
              description="Track stock levels, get low-stock alerts, and automatically update inventory when orders are fulfilled."
              icon="📦"
            />
            <FeatureCard
              title="Order Management"
              description="Full order lifecycle from creation to fulfillment. Review, approve, and track every order."
              icon="📋"
            />
            <FeatureCard
              title="Analytics"
              description="Revenue tracking, top products, customer insights, and business intelligence dashboards."
              icon="📊"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            How OrderFlow works
          </h2>
          <div className="space-y-8">
            <HowItWorksStep
              number={1}
              title="Customer sends a message"
              description='Customer texts: "I need 20 cartons of Malt and 5 bags of Rice delivered tomorrow."'
            />
            <HowItWorksStep
              number={2}
              title="OrderFlow understands"
              description="AI extracts products, quantities, and delivery details. It resolves product names and checks availability."
            />
            <HowItWorksStep
              number={3}
              title="You review and approve"
              description="Review the generated order in your dashboard. Make adjustments if needed, then approve."
            />
            <HowItWorksStep
              number={4}
              title="Payment is processed"
              description="Customer receives a payment link. Payment is verified automatically through Paystack."
            />
            <HowItWorksStep
              number={5}
              title="Order is fulfilled"
              description="Inventory is updated, fulfillment is tracked, and the customer is notified at every step."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to automate your business?
          </h2>
          <p className="text-lg opacity-90 mb-8">
            Start for free. No credit card required.
          </p>
          <Link
            href="/sign-up"
            className="bg-white text-primary px-6 py-3 rounded-lg font-medium hover:bg-white/90 transition-colors inline-block"
          >
            Start free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            © 2024 OrderFlow. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="bg-card p-6 rounded-xl border border-border hover:shadow-md transition-shadow">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function HowItWorksStep({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold shrink-0">
        {number}
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
