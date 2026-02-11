Gmail Email Setup for DDKA Backend

This project uses Brevo API (recommended on Render) or nodemailer with Gmail SMTP to send registration status emails (application received, approval, rejection, deletion).

1) Install dependencies (in DDKA-back):
   npm install

2) Environment variables (add to your .env in DDKA-back):
   EMAIL_USER=your.email@gmail.com
   EMAIL_PASS=your_app_password
   # Optional: host and port (default uses Gmail on port 587 for STARTTLS)
   # EMAIL_HOST=smtp.gmail.com
   # EMAIL_PORT=587
  # Emails are controlled by the Admin Dashboard toggle (MAIL) and valid credentials.
  # Recommended on Render (free tier): Brevo API
  BREVO_API_KEY=your_brevo_api_key
  # Verified sender email for Brevo
  EMAIL_FROM=your_verified_sender@yourdomain.com
  # Optional sender name
  EMAIL_FROM_NAME=DDKA
  # Optional reply-to address (where recipients should contact you)
  EMAIL_REPLY_TO=your_gmail@gmail.com
  # Optional logo shown in all emails (public image URL)
  EMAIL_LOGO_URL=https://res.cloudinary.com/dcqo5qt7b/image/upload/v1767429051/WhatsApp_Image_2026-01-03_at_1.57.17_PM_qg7rs3.jpg
   # If your password contains spaces, wrap it in quotes:
     # EMAIL_PASS="your password with spaces"

   If your password contains spaces, wrap it in quotes:
     EMAIL_PASS="your password with spaces"

Note: Default uses port 587 (STARTTLS). If your deployment shows connection timeouts (ETIMEDOUT), many hosts block outbound SMTP — consider using a transactional email provider (SendGrid, Mailgun, Postmark) or check your host firewall settings.

Notes:
- Use an App Password (recommended) from your Google Account (2-Step Verification required).
  Follow https://support.google.com/accounts/answer/185833 to create an App Password and paste it as EMAIL_PASS.

- The mailer is non-blocking: if sending fails the player status update will still succeed and the error will be logged.

- Restart the backend after adding environment variables.

If you prefer OAuth2 with Gmail, we can implement that instead — say so and I will add the OAuth2 flow.