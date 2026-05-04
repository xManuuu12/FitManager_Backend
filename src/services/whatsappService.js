const axios = require('axios');

/**
 * Sends a WhatsApp message using Meta's Cloud API
 * @param {string} to - The recipient's phone number with country code
 * @param {string} body - The message content
 * @param {object} templateOptions - Optional object for Meta Templates (not fully implemented for generic body in this signature, but can be adapted)
 */
exports.sendWhatsApp = async (to, body, templateOptions = null) => {
  try {
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
    const accessToken = process.env.META_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      throw new Error('Meta WhatsApp credentials are not configured');
    }

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

    // Ensure 'to' has no '+' and is just digits
    const cleanTo = to.replace('+', '');

    const payload = {
      messaging_product: 'whatsapp',
      to: cleanTo,
    };

    if (templateOptions) {
      payload.type = 'template';
      payload.template = {
        name: templateOptions.name,
        language: {
          code: templateOptions.language || 'es_MX'
        },
        components: templateOptions.components || []
      };
    } else {
      payload.type = 'text';
      payload.text = { body };
    }

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Meta API Error:', error.response ? error.response.data : error.message);
    throw error;
  }
};
