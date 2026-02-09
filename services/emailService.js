const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
};

// Send OTP Email
const sendOtpEmail = async (email, otp) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: `"TrustBallot - Election Commission" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Password Reset OTP - TrustBallot Admin Portal',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #000080 0%, #1a237e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                        .otp-box { background: white; border: 2px solid #000080; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
                        .otp-code { font-size: 32px; font-weight: bold; color: #000080; letter-spacing: 8px; }
                        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                        .warning { background: #fff3cd; border-left: 4px solid #F47920; padding: 15px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔒 Password Reset Request</h1>
                            <p>TrustBallot - Election Commission of India</p>
                        </div>
                        <div class="content">
                            <p>Dear Admin Officer,</p>
                            <p>You have requested to reset your password for the TrustBallot Admin Portal. Please use the following One-Time Password (OTP) to proceed:</p>
                            
                            <div class="otp-box">
                                <p style="margin: 0; font-size: 14px; color: #666;">Your OTP Code</p>
                                <div class="otp-code">${otp}</div>
                                <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">Valid for 5 minutes</p>
                            </div>
                            
                            <div class="warning">
                                <strong>⚠️ Security Notice:</strong><br>
                                If you did not request this password reset, please ignore this email and contact your system administrator immediately.
                            </div>
                            
                            <p><strong>Important:</strong></p>
                            <ul>
                                <li>This OTP will expire in 5 minutes</li>
                                <li>Do not share this code with anyone</li>
                                <li>This is an automated message from a secure system</li>
                            </ul>
                            
                            <div class="footer">
                                <p>This is an official communication from the Election Commission of India</p>
                                <p>TrustBallot Admin Portal | Secure Electronic Voting System</p>
                                <p style="color: #999; font-size: 11px;">This email was sent to ${email}</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✓ OTP email sent to ${email}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending OTP email:', error);
        // Still log to console as fallback
        console.log(`FALLBACK - OTP for ${email}: ${otp}`);
        return { success: false, error: error.message };
    }
};

const sendAlertEmail = async (subject, message) => {
    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"TrustBallot Security" <${process.env.EMAIL_USER}>`,
            to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER, // Fallback to sender if admin email not set
            subject: `🚨 SECURITY ALERT: ${subject}`,
            html: `<h3>Security Alert</h3><p>${message}</p><p>Time: ${new Date().toISOString()}</p>`
        };
        await transporter.sendMail(mailOptions);
        console.log(`[ALERT] Email sent: ${subject}`);
    } catch (error) {
        console.error('[ALERT] Failed to send email:', error);
    }
};

module.exports = { sendOtpEmail, sendAlertEmail };
