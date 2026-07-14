import { PRIVACY_EMAIL } from "@/lib/constants";

export default function PrivacyPolicy() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-3xl mx-auto prose prose-sm dark:prose-invert">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground">Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: April 4, 2026</p>

        <h2>1. Information We Collect</h2>
        <p>We collect information you provide directly, such as your name, email address, and any content you create using our platform. We also collect usage data automatically, including device information, IP address, and interaction patterns.</p>

        <h2>2. How We Use Your Information</h2>
        <p>Your information is used to provide and improve our services, personalize your experience, communicate updates, and ensure platform security.</p>

        <h2>3. Data Sharing</h2>
        <p>We do not sell your personal information. We may share data with trusted service providers who assist in operating our platform, subject to strict confidentiality agreements.</p>

        <h2>4. Data Retention</h2>
        <p>We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your data at any time.</p>

        <h2>5. Your Rights</h2>
        <p>You have the right to access, correct, or delete your personal data. Contact us at {PRIVACY_EMAIL} to exercise these rights.</p>

        <h2>6. Contact</h2>
        <p>For questions about this policy, reach out to <strong>{PRIVACY_EMAIL}</strong>.</p>
      </div>
    </section>
  );
}
