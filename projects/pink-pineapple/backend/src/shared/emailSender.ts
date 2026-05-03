import nodemailer from "nodemailer";
import config from "../config";

/// Transactional email sender via Brevo SMTP relay.
///
/// Credentials are read from environment variables (config.smtp). The
/// previous version of this file had SMTP user/pass and the FROM address
/// hardcoded — both have been moved to .env. Rotate the Brevo password
/// and update SMTP_PASS once the migration off the Fiverr dev's email is
/// complete.
const emailSender = async (to: string, html: string, subject: string) => {
  const { host, port, user, pass, from } = config.smtp;

  if (!user || !pass || !from) {
    throw new Error(
      "Email transport not configured. Set SMTP_USER, SMTP_PASS, EMAIL_FROM in .env."
    );
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: false, // Use STARTTLS on port 2525
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: html.replace(/<[^>]+>/g, ""), // plain-text fallback
      html,
    });

    return info.messageId;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`Error sending email to ${to}: ${msg}`);
    throw new Error("Failed to send email. Please try again later.");
  }
};

export default emailSender;
