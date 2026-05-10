//OTP HTML TXT
const generateOtpEmail = (otp: number) => {
    return `
      <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">Your verification code is inside. Expires in 10 minutes.</div>
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #FFFFFF; padding: 40px 20px; background-color: #000000;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 44px; font-weight: 900; letter-spacing: 5px; color: #E8A0B0; margin: 0; line-height: 1; font-family: 'Helvetica Neue', Arial, sans-serif;">PINK</h1>
            <p style="font-size: 13px; letter-spacing: 8px; color: #FFFFFF; margin: 10px 0 0 0; font-weight: 700; font-family: 'Helvetica Neue', Arial, sans-serif;">PINEAPPLE</p>
        </div>
        <div style="max-width: 500px; margin: 0 auto; background-color: #1A1A1A; padding: 40px 30px; border-radius: 16px; border: 1px solid #2A2A2A;">
            <div style="width: 60px; height: 1px; background: linear-gradient(90deg, transparent, #8B4060, #E8A0B0, transparent); margin: 0 auto 30px auto;"></div>
            <h2 style="font-size: 22px; text-align: center; margin-bottom: 16px; color: #FFFFFF; font-weight: 600; letter-spacing: 0.5px;">
                Verify Your Account
            </h2>
            <p style="font-size: 15px; color: #B0B0B0; line-height: 1.6; text-align: center; margin-bottom: 24px;">
                Enter the code below to verify your Pink Pineapple account.
            </p>
            <div style="background-color: #000000; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; border: 1px solid #2A2A2A;">
                <p style="font-size: 36px; font-weight: 800; letter-spacing: 8px; margin: 0; color: #C4707E;">
                    ${otp}
                </p>
            </div>
            <p style="font-size: 13px; color: #6B6B6B; text-align: center; margin-bottom: 8px;">
                This code expires in <strong style="color: #B0B0B0;">10 minutes</strong>.
            </p>
            <p style="font-size: 13px; color: #6B6B6B; text-align: center; margin-bottom: 30px;">
                If you didn't request this, you can safely ignore this email.
            </p>
            <div style="width: 60px; height: 1px; background: linear-gradient(90deg, transparent, #8B4060, #E8A0B0, transparent); margin: 0 auto 20px auto;"></div>
            <p style="font-size: 11px; color: #6B6B6B; text-align: center; letter-spacing: 0.5px;">
                Pink Pineapple — Know Bali Like a Local
            </p>
        </div>
      </div>`;
  };

//New User Registration HTML Template
const newAccEmail = (email: string, password: string) => {
  const dashboardUrl = "https://dashboard.pinkpineapple.app/login";
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #FFFFFF; padding: 40px 20px; background-color: #000000;">
      <div style="text-align: center; margin-bottom: 24px;">
          <img src="https://dashboard.pinkpineapple.app/images/logo_primary_dark.jpg" alt="Pink Pineapple" width="240" style="display: block; max-width: 100%; height: auto; margin: 0 auto; border: 0;" />
      </div>
      <div style="max-width: 500px; margin: 0 auto; background-color: #1A1A1A; padding: 40px 30px; border-radius: 16px; border: 1px solid #2A2A2A;">
          <div style="width: 60px; height: 1px; background: linear-gradient(90deg, transparent, #8B4060, #E8A0B0, transparent); margin: 0 auto 30px auto;"></div>
          <h2 style="font-size: 22px; text-align: center; margin-bottom: 16px; color: #FFFFFF; font-weight: 600;">
              Welcome to Pink Pineapple
          </h2>
          <p style="font-size: 15px; color: #B0B0B0; line-height: 1.6; text-align: center; margin-bottom: 24px;">
              An admin account has been created for you. Use the details below to sign in to the Pink Pineapple dashboard.
          </p>
          <div style="background-color: #000000; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #2A2A2A;">
              <p style="font-size: 14px; color: #B0B0B0; margin: 0 0 8px 0;"><strong style="color: #FFFFFF;">Email:</strong> ${email}</p>
              <p style="font-size: 14px; color: #B0B0B0; margin: 0;"><strong style="color: #FFFFFF;">Temporary password:</strong> ${password}</p>
          </div>
          <div style="text-align: center; margin-bottom: 24px;">
              <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #8B4060, #C4707E, #E8A0B0); color: #000000; text-decoration: none; border-radius: 12px; font-weight: 700; letter-spacing: 1.5px; font-size: 14px;">
                  GO TO DASHBOARD
              </a>
          </div>
          <p style="font-size: 13px; color: #B0B0B0; line-height: 1.7; text-align: center; margin-bottom: 12px;">
              Or paste this into your browser:<br/>
              <a href="${dashboardUrl}" style="color: #E8A0B0; text-decoration: none; word-break: break-all;">${dashboardUrl}</a>
          </p>
          <p style="font-size: 13px; color: #6B6B6B; text-align: center; margin-bottom: 30px;">
              Please change your password after your first login. If you didn't expect this email, contact us at info@pinkpineapple.app.
          </p>
          <div style="width: 60px; height: 1px; background: linear-gradient(90deg, transparent, #8B4060, #E8A0B0, transparent); margin: 0 auto 20px auto;"></div>
          <p style="font-size: 11px; color: #6B6B6B; text-align: center; letter-spacing: 0.5px;">
              Pink Pineapple — Know Bali Like a Local
          </p>
      </div>
    </div>`;
};


/// Welcome email — sent after OTP verification, when user becomes ACTIVE.
const welcomeEmail = (name: string) => {
  const firstName = (name || "").split(" ")[0] || "there";
  const appStoreUrl = "https://apps.apple.com/app/id6758339469";
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #FFFFFF; padding: 40px 20px; background-color: #000000;">
      <div style="text-align: center; margin-bottom: 24px;">
          <img src="https://dashboard.pinkpineapple.app/images/logo_primary_dark.jpg" alt="Pink Pineapple" width="240" style="display: block; max-width: 100%; height: auto; margin: 0 auto; border: 0;" />
      </div>
      <div style="max-width: 500px; margin: 0 auto; background-color: #1A1A1A; padding: 40px 30px; border-radius: 16px; border: 1px solid #2A2A2A;">
          <div style="width: 60px; height: 1px; background: linear-gradient(90deg, transparent, #8B4060, #E8A0B0, transparent); margin: 0 auto 30px auto;"></div>
          <h2 style="font-size: 22px; text-align: center; margin-bottom: 16px; color: #FFFFFF; font-weight: 600; letter-spacing: 0.5px;">
              Welcome, ${firstName}.
          </h2>
          <p style="font-size: 15px; color: #B0B0B0; line-height: 1.6; text-align: center; margin-bottom: 28px;">
              You're in. Pink Pineapple is your insider's guide to Bali — curated nightlife, restaurants, beach clubs, and gyms with real-time vibes from people on the ground.
          </p>
          <div style="text-align: center; margin-bottom: 28px;">
              <a href="${appStoreUrl}" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #8B4060, #C4707E, #E8A0B0); color: #000000; text-decoration: none; border-radius: 12px; font-weight: 700; letter-spacing: 1.5px; font-size: 14px;">
                  OPEN PINK PINEAPPLE
              </a>
          </div>
          <p style="font-size: 13px; color: #B0B0B0; line-height: 1.7; text-align: center; margin-bottom: 20px;">
              Start with <strong style="color: #FFFFFF;">Plan My Night</strong> if you don't know where to begin, or hit <strong style="color: #FFFFFF;">This Week</strong> for tonight's curated picks.
          </p>
          <div style="width: 60px; height: 1px; background: linear-gradient(90deg, transparent, #8B4060, #E8A0B0, transparent); margin: 0 auto 20px auto;"></div>
          <p style="font-size: 11px; color: #6B6B6B; text-align: center; letter-spacing: 0.5px;">
              Pink Pineapple — Know Bali Like a Local
          </p>
      </div>
    </div>`;
};

/// Venue partner approval email — sent when an admin flips a CLUB user
/// from PENDING to ACTIVE in /approvals. Tells them their application
/// has been accepted and that we're finalising their venue page.
const venueApprovedEmail = (name: string) => {
  const firstName = (name || "").split(" ")[0] || "there";
  const dashboardUrl = "https://dashboard.pinkpineapple.app";
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #FFFFFF; padding: 40px 20px; background-color: #000000;">
      <div style="text-align: center; margin-bottom: 24px;">
          <img src="https://dashboard.pinkpineapple.app/images/logo_primary_dark.jpg" alt="Pink Pineapple" width="240" style="display: block; max-width: 100%; height: auto; margin: 0 auto; border: 0;" />
      </div>
      <div style="max-width: 500px; margin: 0 auto; background-color: #1A1A1A; padding: 40px 30px; border-radius: 16px; border: 1px solid #2A2A2A;">
          <div style="width: 60px; height: 1px; background: linear-gradient(90deg, transparent, #8B4060, #E8A0B0, transparent); margin: 0 auto 30px auto;"></div>
          <h2 style="font-size: 22px; text-align: center; margin-bottom: 16px; color: #FFFFFF; font-weight: 600; letter-spacing: 0.5px;">
              You're in, ${firstName}.
          </h2>
          <p style="font-size: 15px; color: #B0B0B0; line-height: 1.6; text-align: center; margin-bottom: 24px;">
              Your venue partner application has been approved. Welcome to Pink Pineapple — Bali's curated discovery and booking platform.
          </p>
          <div style="background-color: #000000; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #2A2A2A;">
              <p style="font-size: 14px; color: #FFFFFF; font-weight: 600; margin: 0 0 12px 0;">What happens next</p>
              <p style="font-size: 13px; color: #B0B0B0; line-height: 1.7; margin: 0 0 8px 0;">
                  1. Our team is finalising your venue page (photos, hours, booking links).
              </p>
              <p style="font-size: 13px; color: #B0B0B0; line-height: 1.7; margin: 0 0 8px 0;">
                  2. You'll receive a second email once your listing goes live to consumers.
              </p>
              <p style="font-size: 13px; color: #B0B0B0; line-height: 1.7; margin: 0;">
                  3. You can then sign in to manage your events and track bookings.
              </p>
          </div>
          <div style="text-align: center; margin-bottom: 28px;">
              <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #8B4060, #C4707E, #E8A0B0); color: #000000; text-decoration: none; border-radius: 12px; font-weight: 700; letter-spacing: 1.5px; font-size: 14px;">
                  OPEN PARTNER DASHBOARD
              </a>
          </div>
          <p style="font-size: 13px; color: #6B6B6B; line-height: 1.7; text-align: center; margin-bottom: 20px;">
              Questions? Reply to this email and we'll come back to you.
          </p>
          <div style="width: 60px; height: 1px; background: linear-gradient(90deg, transparent, #8B4060, #E8A0B0, transparent); margin: 0 auto 20px auto;"></div>
          <p style="font-size: 11px; color: #6B6B6B; text-align: center; letter-spacing: 0.5px;">
              Pink Pineapple — Know Bali Like a Local
          </p>
      </div>
    </div>`;
};

/// Application received email — sent to a venue partner immediately after
/// they verify their OTP. Tells them their application is in the queue and
/// what to expect. Pairs with venueApprovedEmail (sent on admin approval).
const applicationReceivedEmail = (name: string) => {
  const firstName = (name || "").split(" ")[0] || "there";
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #FFFFFF; padding: 40px 20px; background-color: #000000;">
      <div style="text-align: center; margin-bottom: 24px;">
          <img src="https://dashboard.pinkpineapple.app/images/logo_primary_dark.jpg" alt="Pink Pineapple" width="240" style="display: block; max-width: 100%; height: auto; margin: 0 auto; border: 0;" />
      </div>
      <div style="max-width: 500px; margin: 0 auto; background-color: #1A1A1A; padding: 40px 30px; border-radius: 16px; border: 1px solid #2A2A2A;">
          <div style="width: 60px; height: 1px; background: linear-gradient(90deg, transparent, #8B4060, #E8A0B0, transparent); margin: 0 auto 30px auto;"></div>
          <h2 style="font-size: 22px; text-align: center; margin-bottom: 16px; color: #FFFFFF; font-weight: 600; letter-spacing: 0.5px;">
              Thanks, ${firstName}.
          </h2>
          <p style="font-size: 15px; color: #B0B0B0; line-height: 1.6; text-align: center; margin-bottom: 24px;">
              We've received your venue partner application. Our team will review it and get back to you within 24 hours.
          </p>
          <div style="background-color: #000000; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #2A2A2A;">
              <p style="font-size: 14px; color: #FFFFFF; font-weight: 600; margin: 0 0 12px 0;">What happens next</p>
              <p style="font-size: 13px; color: #B0B0B0; line-height: 1.7; margin: 0 0 8px 0;">
                  1. We review your application and verify your business.
              </p>
              <p style="font-size: 13px; color: #B0B0B0; line-height: 1.7; margin: 0 0 8px 0;">
                  2. Once approved, you'll receive a second email with your partner dashboard access.
              </p>
              <p style="font-size: 13px; color: #B0B0B0; line-height: 1.7; margin: 0;">
                  3. You'll be able to add photos, opening hours, and your booking link.
              </p>
          </div>
          <p style="font-size: 13px; color: #6B6B6B; line-height: 1.7; text-align: center; margin-bottom: 20px;">
              Questions in the meantime? Reply to this email and we'll come back to you.
          </p>
          <div style="width: 60px; height: 1px; background: linear-gradient(90deg, transparent, #8B4060, #E8A0B0, transparent); margin: 0 auto 20px auto;"></div>
          <p style="font-size: 11px; color: #6B6B6B; text-align: center; letter-spacing: 0.5px;">
              Pink Pineapple — Know Bali Like a Local
          </p>
      </div>
    </div>`;
};

/// Internal admin notification — fires when a new venue partner completes
/// OTP verification. Tells admins (Troy, Sascha) there's a new application
/// to review in /approvals so they don't miss sign-ups.
const adminNewVenueApplicationEmail = (
  venueName: string,
  applicantEmail: string,
  area: string,
  category: string,
  phone: string
) => {
  const dashboardUrl = "https://dashboard.pinkpineapple.app/approvals";
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #FFFFFF; padding: 40px 20px; background-color: #000000;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #1A1A1A; padding: 40px 30px; border-radius: 16px; border: 1px solid #2A2A2A;">
          <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://dashboard.pinkpineapple.app/images/logo_primary_dark.jpg" alt="Pink Pineapple" width="200" style="display: block; max-width: 100%; height: auto; margin: 0 auto; border: 0;" />
              <p style="font-size: 11px; letter-spacing: 6px; color: #C4707E; margin: 8px 0 0 0; font-weight: 700; font-family: 'Helvetica Neue', Arial, sans-serif;">ADMIN ALERT</p>
          </div>
          <div style="width: 60px; height: 1px; background: linear-gradient(90deg, transparent, #8B4060, #E8A0B0, transparent); margin: 0 auto 30px auto;"></div>
          <h2 style="font-size: 20px; text-align: center; margin-bottom: 16px; color: #FFFFFF; font-weight: 600;">
              New venue application
          </h2>
          <div style="background-color: #000000; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #2A2A2A;">
              <p style="font-size: 13px; color: #B0B0B0; margin: 0 0 8px 0;"><strong style="color: #FFFFFF;">Venue:</strong> ${venueName}</p>
              <p style="font-size: 13px; color: #B0B0B0; margin: 0 0 8px 0;"><strong style="color: #FFFFFF;">Email:</strong> ${applicantEmail}</p>
              <p style="font-size: 13px; color: #B0B0B0; margin: 0 0 8px 0;"><strong style="color: #FFFFFF;">Phone:</strong> ${phone || "—"}</p>
              <p style="font-size: 13px; color: #B0B0B0; margin: 0 0 8px 0;"><strong style="color: #FFFFFF;">Area:</strong> ${area || "—"}</p>
              <p style="font-size: 13px; color: #B0B0B0; margin: 0;"><strong style="color: #FFFFFF;">Category:</strong> ${category || "—"}</p>
          </div>
          <div style="text-align: center; margin-bottom: 28px;">
              <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #8B4060, #C4707E, #E8A0B0); color: #000000; text-decoration: none; border-radius: 12px; font-weight: 700; letter-spacing: 1.5px; font-size: 14px;">
                  REVIEW APPLICATION
              </a>
          </div>
          <div style="width: 60px; height: 1px; background: linear-gradient(90deg, transparent, #8B4060, #E8A0B0, transparent); margin: 0 auto 20px auto;"></div>
          <p style="font-size: 11px; color: #6B6B6B; text-align: center; letter-spacing: 0.5px;">
              Pink Pineapple — Admin Alert
          </p>
      </div>
    </div>`;
};

export {
  generateOtpEmail,
  newAccEmail,
  welcomeEmail,
  venueApprovedEmail,
  applicationReceivedEmail,
  adminNewVenueApplicationEmail,
};
