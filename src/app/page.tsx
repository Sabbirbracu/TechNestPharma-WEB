import Link from "next/link";
import { ArrowRight, Shield } from "lucide-react";
import { BrandLockup } from "@/components/brand";
import { SignInButton } from "@/components/auth/sign-in-button";
import { SignInDialogProvider } from "@/components/auth/sign-in-dialog";

export default function LandingPage() {
  return (
    <SignInDialogProvider>
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Modern Pharmaceutical Background */}
      <div className="pointer-events-none absolute inset-0">
        {/* Soft gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-emerald-50/30" />
        
        {/* Animated gradient orbs */}
        <div className="absolute -left-64 top-0 h-[500px] w-[500px] animate-pulse rounded-full bg-gradient-to-br from-blue-400/20 to-blue-600/10 blur-3xl" />
        <div className="absolute -right-64 top-1/4 h-[600px] w-[600px] animate-pulse rounded-full bg-gradient-to-bl from-emerald-400/20 to-emerald-600/10 blur-3xl [animation-delay:2s]" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] animate-pulse rounded-full bg-gradient-to-tr from-blue-300/15 to-cyan-400/10 blur-3xl [animation-delay:4s]" />
        
        {/* DNA Helix Pattern */}
        <svg className="absolute left-10 top-1/4 h-96 w-96 opacity-[0.04] lg:left-20" viewBox="0 0 200 400">
          <defs>
            <linearGradient id="dna-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>
          {/* Left strand */}
          <path d="M 50 0 Q 30 50 50 100 T 50 200 T 50 300 T 50 400" stroke="url(#dna-gradient)" strokeWidth="3" fill="none" />
          {/* Right strand */}
          <path d="M 150 0 Q 170 50 150 100 T 150 200 T 150 300 T 150 400" stroke="url(#dna-gradient)" strokeWidth="3" fill="none" />
          {/* Connecting bars */}
          {[0, 50, 100, 150, 200, 250, 300, 350].map((y, i) => (
            <line key={i} x1="50" y1={y} x2="150" y2={y} stroke="url(#dna-gradient)" strokeWidth="2" opacity="0.6" />
          ))}
        </svg>

        {/* Molecular Structure - Top Right */}
        <svg className="absolute right-10 top-20 h-80 w-80 opacity-[0.06] lg:right-20" viewBox="0 0 200 200">
          <defs>
            <radialGradient id="molecule-gradient">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#3B82F6" />
            </radialGradient>
          </defs>
          {/* Central molecule */}
          <circle cx="100" cy="100" r="8" fill="url(#molecule-gradient)" />
          {/* Surrounding molecules */}
          <circle cx="60" cy="60" r="6" fill="url(#molecule-gradient)" opacity="0.8" />
          <circle cx="140" cy="60" r="6" fill="url(#molecule-gradient)" opacity="0.8" />
          <circle cx="140" cy="140" r="6" fill="url(#molecule-gradient)" opacity="0.8" />
          <circle cx="60" cy="140" r="6" fill="url(#molecule-gradient)" opacity="0.8" />
          <circle cx="100" cy="40" r="5" fill="url(#molecule-gradient)" opacity="0.7" />
          <circle cx="160" cy="100" r="5" fill="url(#molecule-gradient)" opacity="0.7" />
          <circle cx="100" cy="160" r="5" fill="url(#molecule-gradient)" opacity="0.7" />
          <circle cx="40" cy="100" r="5" fill="url(#molecule-gradient)" opacity="0.7" />
          {/* Bonds */}
          <line x1="100" y1="100" x2="60" y2="60" stroke="url(#molecule-gradient)" strokeWidth="2" opacity="0.4" />
          <line x1="100" y1="100" x2="140" y2="60" stroke="url(#molecule-gradient)" strokeWidth="2" opacity="0.4" />
          <line x1="100" y1="100" x2="140" y2="140" stroke="url(#molecule-gradient)" strokeWidth="2" opacity="0.4" />
          <line x1="100" y1="100" x2="60" y2="140" stroke="url(#molecule-gradient)" strokeWidth="2" opacity="0.4" />
          <line x1="100" y1="100" x2="100" y2="40" stroke="url(#molecule-gradient)" strokeWidth="2" opacity="0.4" />
          <line x1="100" y1="100" x2="160" y2="100" stroke="url(#molecule-gradient)" strokeWidth="2" opacity="0.4" />
          <line x1="100" y1="100" x2="100" y2="160" stroke="url(#molecule-gradient)" strokeWidth="2" opacity="0.4" />
          <line x1="100" y1="100" x2="40" y2="100" stroke="url(#molecule-gradient)" strokeWidth="2" opacity="0.4" />
        </svg>

        {/* Pills/Capsules Pattern - Bottom Left */}
        <div className="absolute bottom-20 left-10 opacity-[0.03]">
          <svg width="300" height="200" viewBox="0 0 300 200">
            <defs>
              <linearGradient id="pill-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="50%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#3B82F6" />
              </linearGradient>
            </defs>
            {/* Capsule 1 */}
            <rect x="20" y="30" width="80" height="30" rx="15" fill="url(#pill-gradient)" opacity="0.8" />
            <line x1="60" y1="30" x2="60" y2="60" stroke="white" strokeWidth="2" />
            {/* Capsule 2 */}
            <rect x="120" y="60" width="80" height="30" rx="15" fill="url(#pill-gradient)" opacity="0.7" transform="rotate(20 160 75)" />
            {/* Tablet */}
            <circle cx="70" cy="130" r="25" fill="url(#pill-gradient)" opacity="0.6" />
            <circle cx="70" cy="130" r="20" fill="none" stroke="white" strokeWidth="1" />
          </svg>
        </div>

        {/* Medical Cross Pattern */}
        <div className="absolute right-1/4 top-1/3 opacity-[0.02]">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <rect x="45" y="0" width="30" height="120" fill="#10B981" />
            <rect x="0" y="45" width="120" height="30" fill="#3B82F6" />
          </svg>
        </div>

        {/* Floating dots grid */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="grid h-full w-full grid-cols-12 gap-8">
            {Array.from({ length: 120 }).map((_, i) => (
              <div key={i} className="size-1.5 rounded-full bg-primary" />
            ))}
          </div>
        </div>
      </div>

      {/* Header with matching background - compact */}
      <header className="relative z-10 border-b border-white/20 pt-3 sm:pt-4">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4 sm:h-14 sm:px-6 lg:px-8">
          <Link href="/" aria-label="TechNest Pharma" className="transition-opacity hover:opacity-90">
            <BrandLockup size="md" />
          </Link>
          <SignInButton size="sm" />
        </div>
      </header>

      {/* Hero Section - fits in viewport */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto w-full max-w-5xl text-center">
          {/* Premium Badge - smaller text */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/60 px-3 py-1.5 shadow-lg shadow-primary/10 backdrop-blur-xl sm:mb-6 sm:gap-2 sm:px-4 sm:py-2">
            <div className="flex size-4 items-center justify-center rounded-full bg-primary sm:size-5">
              <Shield className="size-2.5 text-white sm:size-3" strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-bold text-primary sm:text-xs font-inter">
              Enterprise Pharmaceutical Sourcing
            </span>
          </div>

          {/* Main Heading with Poppins - bigger */}
          <h1 
            className="mb-4 text-4xl font-extrabold tracking-tight sm:mb-5 sm:text-6xl md:text-7xl lg:text-8xl"
            style={{ 
              fontFamily: "var(--font-poppins), sans-serif",
              letterSpacing: '-0.02em'
            }}
          >
            <span className="block text-blue-950">Smart Sourcing.</span>{" "}
            <span 
              className="block text-success"
              style={{ 
                fontFamily: "var(--font-poppins), sans-serif"
              }}
            >
              Stronger Healthcare.
            </span>
          </h1>

          {/* Subheading - Solid Color */}
          <p 
            className="mx-auto mb-6 max-w-2xl text-sm font-medium leading-relaxed text-slate-600 sm:mb-8 sm:text-lg md:text-xl"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            The complete pharmaceutical raw-material sourcing platform. Find suppliers, 
            manage contacts, track products, and streamline your sourcing operations.
          </p>

          {/* CTA Button - smaller */}
          <div className="flex justify-center">
            <SignInButton 
              size="lg" 
              className="group relative h-10 min-w-[180px] overflow-hidden bg-primary text-xs font-bold shadow-2xl shadow-primary/25 transition-all hover:bg-primary-hover hover:shadow-primary/30 sm:h-12 sm:min-w-[200px] sm:text-sm"
            >
              <span className="relative z-10 flex items-center gap-2">
                Access Dashboard
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1 sm:size-4" strokeWidth={2.5} />
              </span>
            </SignInButton>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-slate-500 sm:mt-16">
            <div className="flex items-center gap-2">
              <svg className="size-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Regulatory Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="size-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>GMP Verified Suppliers</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="size-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Secure Platform</span>
            </div>
          </div>
        </div>
      </main>
    </div>
    </SignInDialogProvider>
  );
}
