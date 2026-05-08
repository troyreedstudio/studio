import emailSender from "./emailSender";
import {
  generateOtpEmail,
  welcomeEmail,
  venueApprovedEmail,
  applicationReceivedEmail,
  adminNewVenueApplicationEmail,
} from "./emaiHTMLtext";
import prisma from "./prisma";
import { UserRole } from "@prisma/client";

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

  /// Venue partner approval email — sent when an admin moves a CLUB user
  /// from PENDING to ACTIVE in /approvals. Non-fatal; the admin's UI
  /// shouldn't fail just because email delivery is having a bad day.
  sendVenueApproved: async (email: string, fullName: string): Promise<void> => {
    try {
      const html = venueApprovedEmail(fullName);
      await emailSender(email, html, "Welcome to Pink Pineapple — your venue is approved");
    } catch (err) {
      console.error("Venue approval email failed (non-fatal):", err);
    }
  },

  /// Application received — sent to a venue partner right after they verify
  /// their OTP, so they know we got it and what's next. Non-fatal.
  sendApplicationReceived: async (email: string, fullName: string): Promise<void> => {
    try {
      const html = applicationReceivedEmail(fullName);
      await emailSender(email, html, "Pink Pineapple — application received");
    } catch (err) {
      console.error("Application received email failed (non-fatal):", err);
    }
  },

  /// Internal admin alert — fires to every ADMIN-role user when a new venue
  /// partner submits an application. Keeps Troy + Sascha from missing
  /// sign-ups sitting in /approvals. Non-fatal; if no admins or delivery
  /// fails, we log and move on.
  sendAdminNewApplication: async (
    venueName: string,
    applicantEmail: string,
    area: string,
    category: string,
    phone: string
  ): Promise<void> => {
    try {
      const admins = await prisma.user.findMany({
        where: { role: UserRole.ADMIN },
        select: { email: true },
      });
      if (admins.length === 0) {
        console.warn("No ADMIN users to notify of new venue application");
        return;
      }
      const html = adminNewVenueApplicationEmail(
        venueName,
        applicantEmail,
        area,
        category,
        phone
      );
      await Promise.all(
        admins.map((a) =>
          emailSender(
            a.email,
            html,
            `New venue application — ${venueName}`
          ).catch((err) =>
            console.error(`Admin alert to ${a.email} failed (non-fatal):`, err)
          )
        )
      );
    } catch (err) {
      console.error("Admin new-application alert failed (non-fatal):", err);
    }
  },
};

export default notify;
