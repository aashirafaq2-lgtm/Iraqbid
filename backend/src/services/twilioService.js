
import twilio from 'twilio';
import dotenv from 'dotenv';

// Ensure env vars are loaded if not already
dotenv.config();

// Initialize Twilio client
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  console.log('✅ Twilio client initialized (Global SMS Mode)');
} else {
  console.warn('⚠️ Twilio client NOT initialized. Missing Credentials');
}

/**
 * Universal Phone Normalization
 * Handles Iraq (+964) and International (e.g. US +1)
 */
function normalizePhone(phone) {
  if (!phone) return phone;
  let cleaned = phone.trim().replace(/[\s-]/g, '');

  if (cleaned.startsWith('+')) return cleaned; // Already international
  if (cleaned.startsWith('00')) return '+' + cleaned.substring(2);

  // Iraq Specifics
  if (cleaned.startsWith('964')) return '+' + cleaned;
  if (cleaned.startsWith('0')) return '+964' + cleaned.substring(1);
  if (cleaned.length === 10 && (cleaned.startsWith('75') || cleaned.startsWith('77') || cleaned.startsWith('78') || cleaned.startsWith('79'))) {
    return '+964' + cleaned;
  }

  // Default fallback for Iraq numbers without leading 0
  if (cleaned.length === 9 || cleaned.length === 10) {
    return '+964' + cleaned;
  }

  return cleaned;
}

export const TwilioService = {
  /**
   * Send OTP using Twilio Verify with Aggressive Fallback
   */
  async sendOTP(phoneNumber) {
    if (!twilioClient) throw new Error('Twilio client not initialized');

    const formattedPhone = normalizePhone(phoneNumber);
    console.log(`[Twilio] 📤 Requesting OTP for: ${formattedPhone}`);

    // MAGIC OTP FOR APPLE REVIEWERS (Bypass Twilio)
    if (formattedPhone === '+1234567890' || formattedPhone === '+9647500000000') {
      console.log('🍎 [Twilio] Magic number detected for Apple Review. Bypassing SMS.');
      return { success: true, method: 'magic', manualCode: '123456' };
    }

    // Try Verify API FIRST
    try {
      // FORCE FALLBACK MODE (For Debugging/Manual Code Visibility)
      if (process.env.FORCE_OTP_FALLBACK === 'true') {
        console.log('⚠️ [Twilio] FORCE_OTP_FALLBACK active. Skipping Verify API...');
        throw new Error('Forced Fallback');
      }

      if (!process.env.TWILIO_VERIFY_SID) throw new Error('TWILIO_VERIFY_SID missing');

      const verification = await twilioClient.verify.v2
        .services(process.env.TWILIO_VERIFY_SID)
        .verifications
        .create({ to: formattedPhone, channel: 'sms' });

      console.log(`[Twilio] ✅ Verify API Success: ${verification.sid}`);
      return { success: true, method: 'verify' };

    } catch (error) {
      console.warn(`[Twilio] ⚠️ Verify API Failed (Code ${error.code}). Trying Fallback Messaging API...`);

      // Fallback for ANY Twilio error that isn't a credential issue
      try {
        if (!process.env.TWILIO_PHONE_NUMBER) throw new Error('TWILIO_PHONE_NUMBER missing');

        const manualCode = Math.floor(100000 + Math.random() * 900000).toString();
        const msgBody = `Your identification code for Iraq Bid is: ${manualCode}`;

        const message = await twilioClient.messages.create({
          body: msgBody,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedPhone
        });

        console.log(`[Twilio] ✅ Fallback SMS Sent: ${message.sid}. Code: ${manualCode}`);
        return { success: true, method: 'sms', manualCode };

      } catch (fallbackError) {
        console.error(`[Twilio] ❌ Both Verify and Fallback Failed: ${fallbackError.message}`);
        throw new Error(`Twilio Error: ${fallbackError.message}`);
      }
    }
  },

  /**
   * Verify OTP (Handles both Verify API and Internal Fallback)
   */
  async verifyOTP(phoneNumber, code, manualCodeFromDB = null) {
    if (!twilioClient) throw new Error('Twilio client not initialized');
    const formattedPhone = normalizePhone(phoneNumber);

    console.log(`[Twilio] 🔐 Verifying: ${formattedPhone} (Provided Code: ${code}, DB Code: ${manualCodeFromDB || 'None'})`);

    // MAGIC OTP MATCH (Apple Review)
    if ((formattedPhone === '+1234567890' || formattedPhone === '+9647500000000') && code.toString() === '123456') {
      console.log('🍎 [Twilio] Magic Code Verified Successfully');
      return { success: true, status: 'approved' };
    }

    // If we have a manual code from DB, check it first
    if (manualCodeFromDB && code.toString() === manualCodeFromDB.toString()) {
      console.log('[Twilio] ✅ Manual Code Verified Successfully (Fallback Path)');
      return { success: true, status: 'approved' };
    }

    // Try Verify API Check
    try {
      const check = await twilioClient.verify.v2
        .services(process.env.TWILIO_VERIFY_SID)
        .verificationChecks
        .create({ to: formattedPhone, code: code });

      console.log(`[Twilio] Verify Check Result: ${check.status}`);
      return { success: check.status === 'approved', status: check.status };
    } catch (error) {
      console.warn(`[Twilio] Verify Check Failed: ${error.message}. Checking DB Fallback...`);

      // Final fallback: in case Verify API call itself failed but we have a DB code
      if (manualCodeFromDB && code.toString() === manualCodeFromDB.toString()) {
        return { success: true, status: 'approved' };
      }
      return { success: false, message: error.message };
    }
  },

  /**
   * Send a simple SMS
   */
  async sendSMS(to, body) {
    if (!twilioClient) throw new Error('Twilio client not initialized');
    const formattedPhone = normalizePhone(to);

    try {
      const message = await twilioClient.messages.create({
        body: body,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone
      });
      console.log(`[Twilio] 💬 SMS Sent to ${formattedPhone}: ${message.sid}`);
      return { success: true, sid: message.sid };
    } catch (error) {
      console.error(`[Twilio] ❌ SMS Failed to ${formattedPhone}: ${error.message}`);
      throw error;
    }
  },

  normalizePhoneNumber: normalizePhone
};
