import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLockup } from "@/components/brand";

/**
 * Shell for the public legal documents (Privacy Policy, Terms).
 *
 * Public on purpose — these sit outside the `(app)` group and its auth gate,
 * because Google's OAuth verification requires the privacy policy to be
 * reachable, on the app's own domain, without signing in. A reviewer hitting a
 * login wall is a rejected submission.
 *
 * Deliberately plain: no gradients, no animation, black text on white. A legal
 * document is read, not admired, and reviewers print these.
 */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  /** Human-readable date. Reviewers look for one, and a stale policy reads as
   *  an abandoned product. */
  updated: string;
  intro: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-5">
          <Link href="/" aria-label="TechNest Pharma home">
            <BrandLockup size="sm" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="size-3.5" strokeWidth={2.5} />
            Back to site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Last updated {updated}
        </p>
        <div className="mt-6 space-y-4 border-l-[3px] border-slate-200 pl-4 text-sm leading-relaxed text-slate-600">
          {intro}
        </div>

        <div className="mt-10 space-y-9">{children}</div>

        <footer className="mt-14 border-t border-slate-200 pt-6 text-xs font-medium text-slate-500">
          <p>
            © {new Date().getFullYear()} TechNest Pharma. Questions about this
            document:{" "}
            <a
              href="mailto:privacy@technestpharma.cloud"
              className="font-bold text-slate-700 underline underline-offset-2"
            >
              privacy@technestpharma.cloud
            </a>
          </p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/privacy-policy" className="hover:text-slate-900">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-slate-900">
              Terms &amp; Conditions
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-base font-bold tracking-tight text-slate-900">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
        {children}
      </div>
    </section>
  );
}

export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2 pl-1">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2.5">
          <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-slate-400" />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** A statement a reviewer or auditor needs to find without hunting. */
export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm font-medium leading-relaxed text-slate-700">
      {children}
    </div>
  );
}
