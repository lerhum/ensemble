// Service email SMTP (dev local via Mailpit). Importé uniquement depuis node.ts.
import nodemailer from "nodemailer";
import type { EmailService } from "./email.js";

/** SMTP email service for local development via Mailpit. Imported only from node.ts. */
export class SmtpEmailService implements EmailService {
  private transporter: nodemailer.Transporter;

  constructor(
    host: string,
    port: number,
    private readonly from: string,
  ) {
    this.transporter = nodemailer.createTransport({ host, port, secure: false });
  }

  async send(to: string, subject: string, html: string, text: string) {
    await this.transporter.sendMail({ from: this.from, to, subject, html, text });
  }
}
