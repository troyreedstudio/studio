import emailSender from "./emailSender";
import { generateOtpEmail, welcomeEmail } from "./emaiHTMLtext";

/// Centralised notification dispatcher.
///
/// Today: email-only via Brevo. Future channels (push via Firebase, in-app
/// Notification model) will be added here so call sites don't change. Keep
/// each function failure-tolerant unless the user genuinely needs it (e.g.
/// OTP must reach them — bubble up; welcome email is nice-to-have — swallow).
const notify = {
  /// OTP / verification code email. Failures bubble up — user can't proceed
  /// without the code.
  sendOtp: async (
    email: string,
    otp: number,
    subject: string = "Pink Pineapple verification code"
  ): Promise<void> => {
    const html = generateOtpEmail(otp);
    await emailSender(email, html, subject);
  },

  /// Welcome email after OTP verification (user becomes ACTIVE). Failure is
  /// non-fatal — user is already in the app, they don't need this to function.
  sendWelcome: async (email: string, fullName: string): Promise<void> => {
    try {
      const html = welcomeEmail(fullName);
      await emailSender(email, html, "Welcome to Pink Pineapple");
    } catch (err) {
      console.error("Welcome email failed (non-fatal):", err);
    }
  },
};

export default notify;
