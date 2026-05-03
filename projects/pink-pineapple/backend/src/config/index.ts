import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
    env: process.env.NODE_ENV,
    stripe_key:process.env.STRIPE_SECRET_KEY,
    stripe_webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
    stripe_success_url: process.env.STRIPE_SUCCESS_URL,
    stripe_cancel_url: process.env.STRIPE_CANCEL_URL,
    port: process.env.PORT,
    bcrypt_salt_rounds:process.env.BCRYPT_SALT_ROUNDS,
    jwt: {
        jwt_secret: process.env.JWT_SECRET,
        expires_in: process.env.EXPIRES_IN,
        refresh_token_secret: process.env.REFRESH_TOKEN_SECRET,
        refresh_token_expires_in: process.env.REFRESH_TOKEN_EXPIRES_IN,
        reset_pass_secret: process.env.RESET_PASS_TOKEN,
        reset_pass_token_expires_in: process.env.RESET_PASS_TOKEN_EXPIRES_IN
    },
    reset_pass_link: process.env.RESET_PASS_LINK,
    emailSender: {
        email: process.env.EMAIL,
        app_pass: process.env.APP_PASS
    },
    // Brevo / SMTP transport. Set in server .env. Hardcoded values in
    // emailSender.ts were a security/branding hole — moved here.
    smtp: {
        host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
        port: Number(process.env.SMTP_PORT || 2525),
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.EMAIL_FROM, // e.g. "Pink Pineapple <noreply@pinkpineapple.app>"
    },
    google_places_api_key: process.env.GOOGLE_PLACES_API_KEY,

}
