const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Sends a WhatsApp message using Twilio
 * @param {string} to - The recipient's phone number with country code
 * @param {string} body - The message content (optional if using template)
 * @param {object} templateOptions - Optional object for Twilio Content Templates
 */
exports.sendWhatsApp = async (to, body, templateOptions = null) => {
  try {
    const messageConfig = {
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${to.includes('+') ? to : '+' + to}`
    };

    if (templateOptions) {
      // Si usamos plantillas (como el código que te dio Twilio)
      messageConfig.contentSid = templateOptions.contentSid;
      messageConfig.contentVariables = JSON.stringify(templateOptions.variables);
    } else {
      // Mensaje de texto normal
      messageConfig.body = body;
    }

    const message = await client.messages.create(messageConfig);
    return message.sid;
  } catch (error) {
    console.error('Twilio Error:', error.message);
    throw error;
  }
};
