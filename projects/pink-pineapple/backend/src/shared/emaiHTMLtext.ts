//OTP HTML TXT
const generateOtpEmail = (otp: number) => {
    return `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #FFFFFF; padding: 40px 20px; background-color: #000000;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #1A1A1A; padding: 40px 30px; border-radius: 16px; border: 1px solid #2A2A2A;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="font-size: 28px; font-weight: 900; letter-spacing: 3px; margin: 0;">
                    <span style="background: linear-gradient(135deg, #8B4060, #E8A0B0); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">PINK</span>
                </h1>
                <p style="font-size: 11px; letter-spacing: 6px; color: #B0B0B0; margin: 4px 0 0 0; font-weight: 300;">PINEAPPLE</p>
            </div>
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
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #FFFFFF; padding: 40px 20px; background-color: #000000;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #1A1A1A; padding: 40px 30px; border-radius: 16px; border: 1px solid #2A2A2A;">
          <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="font-size: 28px; font-weight: 900; letter-spacing: 3px; margin: 0;">
                  <span style="background: linear-gradient(135deg, #8B4060, #E8A0B0); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">PINK</span>
              </h1>
              <p style="font-size: 11px; letter-spacing: 6px; color: #B0B0B0; margin: 4px 0 0 0; font-weight: 300;">PINEAPPLE</p>
          </div>
          <div style="width: 60px; height: 1px; background: linear-gradient(90deg, transparent, #8B4060, #E8A0B0, transparent); margin: 0 auto 30px auto;"></div>
          <h2 style="font-size: 22px; text-align: center; margin-bottom: 16px; color: #FFFFFF; font-weight: 600;">
              Welcome to Pink Pineapple
          </h2>
          <p style="font-size: 15px; color: #B0B0B0; line-height: 1.6; text-align: center; margin-bottom: 24px;">
              Your account has been created. Here are your login details:
          </p>
          <div style="background-color: #000000; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #2A2A2A;">
              <p style="font-size: 14px; color: #B0B0B0; margin: 0 0 8px 0;"><strong style="color: #FFFFFF;">Email:</strong> ${email}</p>
              <p style="font-size: 14px; color: #B0B0B0; margin: 0;"><strong style="color: #FFFFFF;">Password:</strong> ${password}</p>
          </div>
          <p style="font-size: 13px; color: #6B6B6B; text-align: center; margin-bottom: 30px;">
              Please change your password after your first login. If you didn't create this account, contact us immediately.
          </p>
          <div style="width: 60px; height: 1px; background: linear-gradient(90deg, transparent, #8B4060, #E8A0B0, transparent); margin: 0 auto 20px auto;"></div>
          <p style="font-size: 11px; color: #6B6B6B; text-align: center; letter-spacing: 0.5px;">
              Pink Pineapple — Know Bali Like a Local
          </p>
      </div>
    </div>`;
};


export { generateOtpEmail, newAccEmail };
