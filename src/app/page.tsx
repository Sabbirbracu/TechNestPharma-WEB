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

      {/* Premium Hero Section - Full Screen Centered */}
      <main className="flex flex-1 items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-5xl text-center">
          {/* Premium Badge */}
          <div className="mb-10 inline-flex items-center gap-2.5 rounded-full border-2 border-primary/20 bg-primary/5 px-6 py-3 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
            <Shield className="size-5 text-primary" strokeWidth={2.5} />
            <span className="text-sm font-bold tracking-tight text-primary">
              Enterprise Pharmaceutical Sourcing Platform
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="mb-8 text-6xl font-bold tracking-tight text-foreground sm:text-7xl lg:text-8xl">
            Smart Sourcing.{" "}
            <span className="bg-gradient-to-r from-success via-success to-success/80 bg-clip-text text-transparent">
              Stronger Healthcare.
            </span>
          </h1>

          {/* Subheading */}
          <p className="mx-auto mb-12 max-w-3xl text-xl font-medium leading-relaxed text-muted-foreground sm:text-2xl">
            The complete pharmaceutical raw-material sourcing platform. Find suppliers, 
            manage contacts, track products, and streamline your entire sourcing workflow 
            in one powerful system.
          </p>

          {/* CTA Button */}
          <div className="flex justify-center">
            <SignInButton size="lg" className="group h-14 min-w-[240px] text-base shadow-xl">
              <span>Access Dashboard</span>
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
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
