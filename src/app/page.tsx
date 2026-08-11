import Link from "next/link";
import { ArrowRight, Shield } from "lucide-react";
import { BrandLockup } from "@/components/brand";
import { SignInButton } from "@/components/auth/sign-in-button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-accent/5">
      {/* Premium header with glass effect */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="TechNest Pharma" className="transition-opacity hover:opacity-90">
            <BrandLockup size="md" />
          </Link>
          <SignInButton size="sm" autoOpen />
        </div>
      </header>

      {/* Premium Hero Section - Mobile Optimized */}
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto w-full max-w-5xl text-center">
          {/* Premium Badge - Mobile Optimized */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border-2 border-primary/20 bg-primary/5 px-4 py-2 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm sm:mb-10 sm:gap-2.5 sm:px-6 sm:py-3">
            <Shield className="size-4 text-primary sm:size-5" strokeWidth={2.5} />
            <span className="text-xs font-bold tracking-tight text-primary sm:text-sm">
              Enterprise Pharmaceutical Sourcing Platform
            </span>
          </div>

          {/* Main Heading - Mobile Optimized */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:mb-8 sm:text-6xl md:text-7xl lg:text-8xl">
            Smart Sourcing.{" "}
            <span className="bg-gradient-to-r from-success via-success to-success/80 bg-clip-text text-transparent">
              Stronger Healthcare.
            </span>
          </h1>

          {/* Subheading - Mobile Optimized */}
          <p className="mx-auto mb-8 max-w-3xl text-base font-medium leading-relaxed text-muted-foreground sm:mb-12 sm:text-xl md:text-2xl">
            The complete pharmaceutical raw-material sourcing platform. Find suppliers, 
            manage contacts, track products, and streamline your entire sourcing workflow 
            in one powerful system.
          </p>

          {/* CTA Button - Mobile Optimized */}
          <div className="flex justify-center">
            <SignInButton size="lg" className="group h-12 min-w-[200px] text-sm shadow-xl sm:h-14 sm:min-w-[240px] sm:text-base">
              <span>Access Dashboard</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 sm:size-5" strokeWidth={2.5} />
            </SignInButton>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-border/60 bg-sidebar/30 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 text-xs font-medium text-muted-foreground sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} TechNest Pharma. All rights reserved.</span>
          <span className="rounded-full bg-accent/50 px-3 py-1 ring-1 ring-border/50">
            Internal Platform
          </span>
        </div>
      </footer>
    </div>
  );
}
