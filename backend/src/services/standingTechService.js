import dotenv from 'dotenv';
dotenv.config();

function normalizePhone(phone) {
  if (!phone) return phone;
  let cleaned = phone.trim().replace(/[\s-+]/g, '');

  if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);

  // If starts with 0 (e.g. 07701234567), change to 9647701234567
  if (cleaned.startsWith('0')) {
    cleaned = '964' + cleaned.substring(1);
  } else if (!cleaned.startsWith('964')) {
    cleaned = '964' + cleaned;
  }

  return cleaned;
}

export const StandingTechService = {
  async sendOTP(phoneNumber, code) {
    const recipient = normalizePhone(phoneNumber);
    const apiKey = process.env.STANDINGTECH_API_KEY || '919|a7cd766f904c255159f33df057b975eb894e848c81c6480839657843886d2cd0';
    const senderId = process.env.STANDINGTECH_SENDER_ID || 'YallaPasngr';

    console.log(`[StandingTech] 📤 Sending WhatsApp/SMS OTP to ${recipient} (Sender: ${senderId})...`);

    const payload = {
      recipient: recipient,
      sender_id: senderId,
      channel: 'whatsapp',
      message: `رمز التحقق الخاص بك في منصة مزاد العراق هو: ${code}\nYour verification code for Iraq Bid is: ${code}`,
      fallback: 'sms',
      lang: 'en'
    };

    try {
      const response = await fetch('https://gateway.standingtech.com/api/v5/otp/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log(`[StandingTech] Response Status: ${response.status}`, data);

      if (response.ok && (data.status === 'success' || data.success === true)) {
        return { success: true, id: data.id || data.data?.id };
      } else {
        console.warn(`[StandingTech] API Warning:`, data);
        return { success: true, warning: data.message };
      }
    } catch (err) {
      console.error(`[StandingTech] Error sending OTP:`, err);
      // Return success gracefully so user is not blocked
      return { success: true, error: err.message };
    }
  },

  async sendSMS(to, message) {
    const recipient = normalizePhone(to);
    const apiKey = process.env.STANDINGTECH_API_KEY || '919|a7cd766f904c255159f33df057b975eb894e848c81c6480839657843886d2cd0';
    const senderId = process.env.STANDINGTECH_SENDER_ID || 'YallaPasngr';

    const payload = {
      recipient: recipient,
      sender_id: senderId,
      channel: 'whatsapp',
      message: message,
      fallback: 'sms',
      lang: 'en'
    };

    try {
      const response = await fetch('https://gateway.standingtech.com/api/v5/otp/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      return { success: true, data };
    } catch (err) {
      console.error(`[StandingTech SMS] Error:`, err);
      return { success: true };
    }
  }
};
