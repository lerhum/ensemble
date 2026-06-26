// Abstraction du service d'envoi d'emails.
// Node dev : SmtpEmailService (Mailpit). Worker prod : ResendEmailService.
export interface EmailService {
  send(to: string, subject: string, html: string, text: string): Promise<void>;
}

// Fallback : log dans la console (aucune dépendance externe).
export class LogEmailService implements EmailService {
  async send(to: string, subject: string, _html: string, text: string) {
    console.log(`\n📧 Email → ${to}`);
    console.log(`   Sujet : ${subject}`);
    console.log(`   ---\n${text}\n   ---`);
  }
}

// Resend (HTTP, compatible Workers). Nécessite RESEND_API_KEY + RESEND_FROM.
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
