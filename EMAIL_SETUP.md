Gmail Email Setup for DDKA Backend

This project uses nodemailer with Gmail SMTP to send approval emails to players when an admin approves their registration.

1) Install dependencies (in DDKA-back):
   npm install

2) Environment variables (add to your .env in DDKA-back):
   EMAIL_USER=your.email@gmail.com
   EMAIL_PASS=your_app_password
   # Optional: host and port (default uses Gmail on port 587 for STARTTLS)
   # EMAIL_HOST=smtp.gmail.com
   # EMAIL_PORT=587
   # By default, the project disables SMTP sending to avoid deploy-time failures on hosts that block SMTP.
   # To enable real sends set: EMAIL_ENABLED=true
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