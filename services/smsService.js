const twilio = require('twilio');

const sendSmsOTP = async (mobileNumber, otp) => {
    try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

        if (!accountSid || !authToken || !twilioPhoneNumber) {
            console.warn('[SMS Service] Twilio credentials missing in .env. Logging OTP to console instead.');
            return { success: false, error: 'Twilio credentials not configured' };
        }

        const client = twilio(accountSid, authToken);

        // Ensure number has country code for Twilio (assumes India +91 if none provided)
        let formattedNumber = mobileNumber;
        if (!formattedNumber.startsWith('+')) {
            formattedNumber = `+91${formattedNumber}`;
        }

        const message = await client.messages.create({
            body: `Your TrustBallot Aadhaar Verification OTP is: ${otp}. Do not share this code with anyone. Valid for 5 minutes.`,
            from: twilioPhoneNumber,
            to: formattedNumber
        });

        console.log(`[SMS Service] ✓ OTP sent successfully to ${formattedNumber}. SID: ${message.sid}`);
        return { success: true, sid: message.sid };
    } catch (error) {
        console.error('[SMS Service] Error sending SMS:', error);
        return { success: false, error: error.message };
    }
};

module.exports = { sendSmsOTP };
