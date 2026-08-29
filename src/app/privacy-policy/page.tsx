import type { Metadata } from "next";
import Link from "next/link";
import { Callout, LegalPage, List, Section } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How TechNest Pharma handles data in its sourcing platform, including data accessed through Google Gmail APIs.",
};

const UPDATED = "29 August 2026";
const CONTACT = "privacy@technestpharma.cloud";

/**
 * Written against what the software actually does, not from a template.
 *
 * The Google sections are the load-bearing ones: `gmail.send` and
 * `gmail.readonly` are both restricted scopes, so this page is read by a human
 * reviewer at Google who checks that the described behaviour matches the code.
 * The three things they look for specifically — the scopes named individually
 * with a reason each, the affirmative Limited Use statement, and an explicit
 * "not used to train AI/ML models" line — are all present and must stay.
 *
 * If the mailbox module changes what it reads or stores, this page changes in
 * the same commit. A policy that overstates restraint is worse than none.
 */
export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated={UPDATED}
      intro={
        <>
          <p>
            TechNest Pharma operates a private, invite-only sourcing platform used by
            pharmaceutical importers to find raw-material suppliers, run tenders, and
            correspond with those suppliers. This policy explains what the platform
            collects, why, and how long it is kept.
          </p>
          <p>
            The platform is not a consumer service. Accounts exist only because an
            administrator created one; there is no public sign-up, and the platform is
            not directed at children.
          </p>
        </>
      }
    >
      <Section id="who-we-are" title="1. Who we are">
        <p>
          TechNest Pharma (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates this platform
          from Bangladesh and acts as the data controller for the information described
          below. You can reach us at{" "}
          <a href={`mailto:${CONTACT}`} className="font-bold text-slate-800 underline underline-offset-2">
            {CONTACT}
          </a>
          .
        </p>
      </Section>

      <Section id="what-we-collect" title="2. What the platform holds">
        <List
          items={[
            <>
              <strong className="font-bold text-slate-800">Account data</strong> — your
              name, work email address, role, profile photo if you upload one, and a
              hashed password. Passwords are stored using Argon2id and are never
              recoverable, by us or by anyone else.
            </>,
            <>
              <strong className="font-bold text-slate-800">Usage and security data</strong>{" "}
              — sign-in sessions, the device and browser that created them, and an audit
              log of administrative actions. This is how account takeover is detected and
              how a user can revoke a session they do not recognise.
            </>,
            <>
              <strong className="font-bold text-slate-800">Business records</strong> —
              suppliers, contacts, products, offers, tenders, and sourcing enquiries
              entered by your organisation, including business contact details for
              supplier personnel.
            </>,
            <>
              <strong className="font-bold text-slate-800">Supplier correspondence</strong>{" "}
              — the email conversations described in section 3.
            </>,
          ]}
        />
      </Section>

      <Section id="google-data" title="3. Data accessed through Google APIs">
        <p>
          A user with the owner role may connect one Gmail account so that supplier
          enquiries are sent from the organisation&rsquo;s own address and the replies
          come back onto the enquiry that produced them. Connecting is optional; the rest
          of the platform works without it. We request exactly two scopes:
        </p>
        <List
          items={[
            <>
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] text-slate-800">
                gmail.send
              </code>{" "}
              — to send the enquiry emails you compose and approve in the platform. It is
              used for nothing else, and no message is ever sent without a user pressing
              Send.
            </>,
            <>
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] text-slate-800">
                gmail.readonly
              </code>{" "}
              — to read the supplier&rsquo;s replies to those enquiries. Read-only rather
              than a modify scope on purpose: a fault in our software cannot alter or
              delete anything in your mailbox.
            </>,
          ]}
        />
        <Callout>
          We only read conversations this platform started. The Gmail thread identifier is
          recorded at the moment an enquiry is sent, and the sync reads those threads and
          no others. The rest of the mailbox — personal mail, unrelated business mail,
          anything that arrived on its own — is never requested, never read, and never
          stored.
        </Callout>
        <p>From those threads, the platform stores:</p>
        <List
          items={[
            "the message subject, body text, sender and recipient addresses, and the date it was sent or received;",
            "the Gmail message and thread identifiers, which is how a reply is matched to the enquiry that caused it;",
            <>
              attachment <em>metadata</em> only — filename, file type, and size. Attachment
              contents are not copied into our systems; when someone opens one it is
              streamed from Gmail on demand and not retained.
            </>,
          ]}
        />
        <p>
          The Google authorisation token that makes this possible is encrypted at rest
          (AES-128-CBC with HMAC-SHA256 authentication) using a key held outside the
          database, so a database backup is not a usable mailbox credential.
        </p>
      </Section>

      <Section id="limited-use" title="4. Google API Services Limited Use">
        <Callout>
          TechNest Pharma&rsquo;s use and transfer of information received from Google
          APIs to any other app will adhere to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noreferrer noopener"
            className="font-bold text-slate-900 underline underline-offset-2"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </Callout>
        <p>Concretely, and without exception:</p>
        <List
          items={[
            "we do not sell Google user data, and we do not transfer it to data brokers or information resellers;",
            "we do not use Google user data for advertising, ad targeting, or ad personalisation;",
            "we do not use Google user data to develop, train, improve, or fine-tune any artificial-intelligence or machine-learning model, whether ours or a third party's;",
            "no human at TechNest Pharma reads your Gmail data, except where you have given us explicit permission for a specific support issue, where it is necessary for security purposes such as investigating abuse, or where we are compelled to by law.",
          ]}
        />
      </Section>

      <Section id="how-we-use" title="5. How the data is used">
        <p>
          Everything above is used to operate the platform for the organisation that
          entered it: sending and tracking enquiries, matching supplier replies to the
          right enquiry, comparing quotations against a tender, and keeping the audit and
          security records that a regulated purchasing process needs. We do not use it to
          build profiles, and we do not use one customer&rsquo;s data to serve another.
        </p>
      </Section>

      <Section id="sharing" title="6. Who else touches the data">
        <p>
          We do not sell data or share it for anyone else&rsquo;s marketing. Data is
          processed on our behalf only by:
        </p>
        <List
          items={[
            <>
              <strong className="font-bold text-slate-800">Google LLC</strong> — the source
              and destination of the Gmail data in section 3, under the permission you
              granted.
            </>,
            <>
              <strong className="font-bold text-slate-800">Resend</strong> — delivers
              system email only: account invitations and password resets. Supplier
              correspondence never goes through it.
            </>,
            <>
              <strong className="font-bold text-slate-800">Our hosting provider</strong> —
              runs the servers and stores the encrypted database backups.
            </>,
          ]}
        />
        <p>
          We may also disclose data where we are legally required to, or to establish or
          defend a legal claim.
        </p>
      </Section>

      <Section id="retention" title="7. Retention and deletion">
        <p>
          Business records and supplier correspondence are kept for as long as your
          organisation keeps its account, because a sourcing history is the point of the
          product — a quotation from two years ago is what this year&rsquo;s price is
          judged against.
        </p>
        <p>
          Disconnecting the mailbox in{" "}
          <span className="font-bold text-slate-800">Settings → Email Config</span> revokes
          our access at Google immediately and deletes the stored authorisation token.
          Messages already synced are kept, since they are part of the sourcing record —
          if you want those erased as well, email us and we will delete them.
        </p>
        <p>
          You can also revoke our access at any time, without involving us, from your
          Google Account&rsquo;s{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noreferrer noopener"
            className="font-bold text-slate-800 underline underline-offset-2"
          >
            Third-party apps &amp; services
          </a>{" "}
          page.
        </p>
      </Section>

      <Section id="security" title="8. Security">
        <p>
          Access requires an account created by an administrator, and two-step
          verification is available and recommended. Traffic is encrypted in transit with
          TLS. Passwords are hashed with Argon2id; Google refresh tokens are encrypted at
          rest. Administrative actions are written to an audit log. No system is immune,
          and we do not claim otherwise — if a breach affects your data we will tell you
          and the relevant authority promptly.
        </p>
      </Section>

      <Section id="your-rights" title="9. Your rights">
        <p>
          You may ask for a copy of the personal data we hold about you, ask us to correct
          it, or ask us to delete it. Some records must be retained where we have a legal
          obligation to keep them. Write to{" "}
          <a href={`mailto:${CONTACT}`} className="font-bold text-slate-800 underline underline-offset-2">
            {CONTACT}
          </a>{" "}
          and we will respond within 30 days.
        </p>
      </Section>

      <Section id="changes" title="10. Changes to this policy">
        <p>
          If we change what the platform collects or how it is used, this page is updated
          and the date at the top changes with it. Material changes affecting the Google
          data in section 3 will also be notified to account owners by email.
        </p>
        <p>
          See also our{" "}
          <Link href="/terms" className="font-bold text-slate-800 underline underline-offset-2">
            Terms &amp; Conditions
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
