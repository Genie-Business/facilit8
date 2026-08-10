import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Falls back to a console log when RESEND_API_KEY isn't configured, so auth/notification
 * flows are testable in local dev before the real Resend account is wired up (Phase 6+).
 */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  if (!resend) {
    console.log(`[email:dev-noop] to=${to} subject="${subject}"\n${html}`);
    return;
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Facilit8 <no-reply@facilit8.example>",
    to,
    subject,
    html,
  });
}
