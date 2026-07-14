import { APP_NAME, SAFETY_EMAIL } from "@/lib/constants";

export default function AISafetyPolicy() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-3xl mx-auto prose prose-sm dark:prose-invert">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground">AI Safety Policy</h1>
        <p className="text-muted-foreground">Last updated: April 4, 2026</p>

        <h2>Our Commitment</h2>
        <p>{APP_NAME} is committed to the responsible development and deployment of AI-powered tools. We believe AI should augment human creativity — not replace accountability.</p>

        <h2>Content Safeguards</h2>
        <p>Our platform includes built-in safeguards to prevent the generation of harmful, discriminatory, or misleading content. We continuously monitor and improve these protections.</p>

        <h2>Transparency</h2>
        <p>We are transparent about how our AI models work, what data they use, and their limitations. Users are always informed when content is AI-generated.</p>

        <h2>Human Oversight</h2>
        <p>{APP_NAME} is designed as a human-in-the-loop system. Every generation can be reviewed, refined, and approved by the user before publication.</p>

        <h2>Bias Mitigation</h2>
        <p>We actively work to identify and reduce biases in our processing pipeline, including regular audits and diverse testing protocols.</p>

        <h2>Feedback & Reporting</h2>
        <p>If you encounter problematic outputs, please report them to <strong>{SAFETY_EMAIL}</strong>. We take every report seriously.</p>
      </div>
    </section>
  );
}
