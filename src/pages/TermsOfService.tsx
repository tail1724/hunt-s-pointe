import { APP_NAME, LEGAL_EMAIL } from "@/lib/constants";

export default function TermsOfService() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-3xl mx-auto prose prose-sm dark:prose-invert">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground">Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: July 7, 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using {APP_NAME}, you agree to be bound by these Terms of Service and our Privacy Policy.</p>

        <h2>2. Use of Service</h2>
        <p>You may use {APP_NAME} for lawful purposes only. You are responsible for all content generated through your account and must not use the platform to produce harmful, misleading, or illegal content.</p>

        <h2>3. AI Features and Abuse Prevention</h2>
        <p>{APP_NAME}'s AI features (including PressRoom, Write assistance, and image generation) are broadly available for editorial and publishing work — drafting, editing, research, and structure, across any subject or genre. There is no topical restriction. Using the platform's AI to complete graded academic work for submission as someone else's own, to generate spam or deceptive bulk content, to harass or impersonate real people or organizations, or to provide material uplift for violence or other illegal harm is a misuse of the service. We enforce these limits with automated guardrails, and repeated attempts to circumvent them may result in suspension or termination of your account.</p>

        <h2>4. Abuse Prevention</h2>
        <p>You must not: (a) attempt to bypass, disable, or manipulate the platform's safety systems, content guardrails, or usage limits, including through prompt-injection techniques; (b) use the platform to generate spam, bulk unsolicited content, harassment, or deceptive material, including impersonation of real people or organizations; (c) resell, scrape, or programmatically extract AI output at scale; or (d) share account credentials to evade plan limits. We monitor for abusive usage patterns and may throttle, suspend, or terminate accounts engaged in abuse.</p>

        <h2>5. Plagiarism and Academic Integrity</h2>
        <p>{APP_NAME} is a research and editorial companion, not a ghostwriter for graded work. You must not use the platform to complete essays, exams, theses, or other academic assignments for submission as your own original work, to disguise AI-generated text in order to evade plagiarism or AI-detection systems, or to present another author's work — including AI output quoting third-party sources — as your own. Stories, briefs, and editorial materials you prepare with {APP_NAME} remain your responsibility to review, verify, and publish with integrity. Manuscript-editing features are suggestion-only by design — every AI proposal is rendered as a margin annotation you integrate by hand — and the platform's optional provenance ledger records only aggregate session telemetry (never keystroke content); see our Privacy Policy for details and how to opt out.</p>

        <h2>6. Intellectual Property</h2>
        <p>Content you create using {APP_NAME} belongs to you. {APP_NAME} retains rights to the platform, its features, and underlying technology.</p>

        <h2>7. Account Responsibilities</h2>
        <p>You are responsible for maintaining the security of your account credentials and for all activity under your account.</p>

        <h2>8. Enforcement</h2>
        <p>Violations of Sections 3–5 may result in warnings, feature restrictions, suspension, or account termination at our discretion, depending on severity and recurrence. We may report unlawful activity to the appropriate authorities. If you believe your account was restricted in error, contact us at the address below.</p>

        <h2>9. Limitation of Liability</h2>
        <p>{APP_NAME} is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform.</p>

        <h2>10. Changes to Terms</h2>
        <p>We may update these terms from time to time. Continued use of the platform constitutes acceptance of the revised terms.</p>

        <h2>11. Contact</h2>
        <p>Questions? Email <strong>{LEGAL_EMAIL}</strong>.</p>
      </div>
    </section>
  );
}
