/** Email sending abstraction. Node dev: SmtpEmailService (Mailpit); Worker prod: ResendEmailService. */
export interface EmailService {
  send(to: string, subject: string, html: string, text: string): Promise<void>;
}

/** Development fallback that logs emails to the console instead of sending them. */
export class LogEmailService implements EmailService {
  async send(to: string, subject: string, _html: string, text: string) {
    console.log(`\n📧 Email → ${to}`);
    console.log(`   Sujet : ${subject}`);
    console.log(`   ---\n${text}\n   ---`);
  }
}

/** Production email service using the Resend HTTP API (compatible with Cloudflare Workers). Requires RESEND_API_KEY and RESEND_FROM env vars. */
export class ResendEmailService implements EmailService {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(to: string, subject: string, html: string) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: this.from, to, subject, html }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error("[email] Resend error:", res.status, err);
    }
  }
}
