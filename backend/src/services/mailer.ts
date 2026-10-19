import nodemailer, { type Transporter } from 'nodemailer';
import { getEnvironment } from '../config/environment';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

let transporter: Transporter | undefined;

/** SMTP delivery; disabled when SMTP_HOST or MAIL_FROM is missing. Exposed as an object so tests can replace `send`. */
export const mailer = {
  enabled(): boolean {
    const environment = getEnvironment();
    return !!environment.SMTP_HOST && !!environment.MAIL_FROM;
  },
  async send(message: MailMessage): Promise<void> {
    const environment = getEnvironment();
    if (!environment.SMTP_HOST || !environment.MAIL_FROM) throw new Error('Mail delivery is not configured');
    transporter ??= nodemailer.createTransport({
      host: environment.SMTP_HOST,
      port: environment.SMTP_PORT,
      secure: environment.SMTP_SECURE,
      ...(environment.SMTP_USER && environment.SMTP_PASS
        ? { auth: { user: environment.SMTP_USER, pass: environment.SMTP_PASS } }
        : {}),
    });
    await transporter.sendMail({ from: environment.MAIL_FROM, ...message });
  },
};
