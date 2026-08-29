import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, List, Section } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms governing use of the TechNest Pharma sourcing platform.",
};

const UPDATED = "29 August 2026";
const CONTACT = "privacy@technestpharma.cloud";

/**
 * Terms for an invite-only B2B tool, not a consumer SaaS.
 *
 * Google's OAuth verification wants a terms-of-service URL alongside the
 * privacy policy, on the same domain and reachable without signing in — hence
 * this living outside the `(app)` auth group.
 *
 * Kept short and true. The obligations that actually matter here are the ones
 * about the connected mailbox and about what the platform is not: it does not
 * verify a supplier's licences, and nothing in it is a substitute for a
 * buyer's own regulatory diligence.
 */
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      updated={UPDATED}
      intro={
        <>
          <p>
            These terms govern use of the TechNest Pharma sourcing platform. By signing in
            you accept them on behalf of yourself and the organisation whose administrator
            issued your account.
          </p>
          <p>
            This is business software supplied to a named organisation. It is not offered
            to the general public, and there is no self-service sign-up.
          </p>
        </>
      }
    >
      <Section id="accounts" title="1. Accounts and access">
        <List
          items={[
            "Accounts are created by your organisation's administrator. Access ends when they revoke it or when the organisation's agreement with us ends.",
            "Credentials are personal. Do not share an account; ask your administrator for another one instead. You are responsible for activity carried out under your sign-in.",
            "Tell us promptly if you believe an account has been compromised. Two-step verification is available and we recommend enabling it.",
          ]}
        />
      </Section>

      <Section id="acceptable-use" title="2. Acceptable use">
        <p>You agree not to:</p>
        <List
          items={[
            "use the platform to send unsolicited bulk email, or any message that breaches applicable anti-spam law;",
            "upload material you have no right to upload, or content that is unlawful, deceptive, or infringing;",
            "attempt to access another organisation's data, probe or bypass the platform's security, or interfere with its operation;",
            "scrape, resell, or redistribute the platform's contents to third parties outside your organisation.",
          ]}
        />
      </Section>

      <Section id="mailbox" title="3. The connected mailbox">
        <p>
          If your organisation connects a Gmail account, emails sent from the platform are
          sent as that account and are attributable to your organisation, not to us. You
          are responsible for the content of every message you send and for having a
          lawful basis to contact the recipient.
        </p>
        <p>
          What we access, store, and refrain from doing with that mailbox is set out in
          the{" "}
          <Link
            href="/privacy-policy"
            className="font-bold text-slate-800 underline underline-offset-2"
          >
            Privacy Policy
          </Link>
          , which forms part of these terms. Access can be revoked at any time from
          Settings → Email Config or from your Google Account, and doing so stops sending
          immediately.
        </p>
      </Section>

      <Section id="your-data" title="4. Your data">
        <p>
          Supplier records, tenders, quotations, correspondence, and everything else your
          organisation enters remain your organisation&rsquo;s property. We process them
          to provide the platform, and for no other purpose. We claim no ownership over
          them and do not use them to build or improve products for anyone else.
        </p>
      </Section>

      <Section id="no-advice" title="5. What the platform is not">
        <p>
          The platform organises information your organisation and its suppliers provide.
          It does not verify that a supplier is licensed, that a certificate of analysis is
          genuine, that a GMP certificate is current, or that a product may lawfully be
          imported into any particular country.
        </p>
        <p>
          Nothing in the platform is regulatory, legal, medical, or financial advice.
          Qualification of a supplier and of a material remains entirely your
          organisation&rsquo;s responsibility, and must be carried out under your own
          quality system.
        </p>
      </Section>

      <Section id="availability" title="6. Availability">
        <p>
          We aim to keep the platform available and to give notice before planned
          maintenance, but we do not guarantee uninterrupted service. Features that depend
          on third parties — Gmail in particular — can be interrupted by those third
          parties, and Google&rsquo;s own authorisation limits require the mailbox
          connection to be renewed periodically.
        </p>
      </Section>

      <Section id="liability" title="7. Liability">
        <p>
          The platform is provided on an &ldquo;as is&rdquo; basis, without warranties
          beyond those that cannot lawfully be excluded. To the extent the law permits, we
          are not liable for lost profits, lost business, lost data, or indirect or
          consequential loss, and our total liability arising out of these terms is limited
          to the fees paid for the platform in the twelve months before the claim arose.
        </p>
        <p>
          Nothing here limits liability for fraud, for death or personal injury caused by
          negligence, or for anything else that cannot be limited by law.
        </p>
      </Section>

      <Section id="suspension" title="8. Suspension and termination">
        <p>
          We may suspend access where it is necessary to protect the platform or its other
          users — for a security incident, or a serious breach of section 2 — and will
          restore it once the cause is resolved. On termination, your organisation may
          request an export of its data within 30 days, after which it may be deleted.
        </p>
      </Section>

      <Section id="changes" title="9. Changes to these terms">
        <p>
          We may update these terms. The date at the top changes when we do, and account
          owners are notified by email of any material change. Continuing to use the
          platform after a change takes effect means accepting the updated terms.
        </p>
      </Section>

      <Section id="law" title="10. Governing law">
        <p>
          These terms are governed by the laws of Bangladesh, and the courts of Dhaka have
          exclusive jurisdiction over any dispute arising from them.
        </p>
        <p>
          Questions about these terms:{" "}
          <a
            href={`mailto:${CONTACT}`}
            className="font-bold text-slate-800 underline underline-offset-2"
          >
            {CONTACT}
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
