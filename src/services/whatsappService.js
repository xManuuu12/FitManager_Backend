const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Sends a WhatsApp message using Twilio
 * @param {string} to - The recipient's phone number with country code (e.g., +52123456789)
 * @param {string} body - The message content
 */
exports.sendWhatsApp = async (to, body) => {
  try {
    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${to}`
    });
    return message.sid;
  } catch (error) {
    console.error('Twilio Error:', error.message);
    throw error;
  }
};
