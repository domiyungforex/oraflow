"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:flex-1 bg-primary flex-col justify-between p-12">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-primary font-bold text-lg">OF</span>
            </div>
            <span className="text-2xl font-bold text-white">OrderFlow</span>
          </Link>
        </div>

        <div className="text-white">
          <h2 className="text-3xl font-bold mb-4">
            Turn customer conversations into completed orders
          </h2>
          <p className="text-lg text-white/80">
            OrderFlow automates orders, payments, inventory and fulfillment so your business can operate with less manual work.
          </p>
        </div>

        <div className="text-white/60 text-sm">
          © 2024 OrderFlow. All rights reserved.
        </div>
      </div>

      {/* Right side - Sign In Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">OF</span>
              </div>
              <span className="text-2xl font-bold">OrderFlow</span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-muted-foreground mt-1">
              Sign in to your OrderFlow account
            </p>
          </div>

          <SignIn
            routing="hash"
            appearance={{
              elements: {
                formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
                card: "shadow-none border",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: "border",
                dividerLine: "bg-border",
                formFieldInput: "border-input",
              },
            }}
          />

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="text-primary hover:underline">
              Start free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
