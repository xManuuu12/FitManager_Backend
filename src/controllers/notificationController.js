const notificationService = require('../services/notificationService');
const { sendWhatsApp } = require('../services/whatsappService');

exports.sendReminder = async (req, res, next) => {
  try {
    const sid = await notificationService.sendMemberReminder(req.user.id_gimnasio, req.params.id);
    res.status(200).json({ success: true, message: 'Recordatorio enviado', sid });
  } catch (error) {
    if (error.message === 'Miembro no encontrado') {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error.message.includes('teléfono')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    next(error);
  }
};

/**
 * Maneja los mensajes entrantes de WhatsApp (Webhook de Twilio)
 */
exports.handleIncomingWhatsApp = async (req, res, next) => {
  try {
    const { Body, From } = req.body;
    const message = Body.toLowerCase().trim();
    const fromNumber = From.replace('whatsapp:', '');

    let responseMessage = '';

    if (message.includes('precio') || message.includes('plan')) {
      responseMessage = '🏋️‍♂️ *Nuestros Planes:*\n\n1. Mensualidad: $350 MXN\n2. Trimestre: $900 MXN\n3. Visita: $50 MXN\n\n¿Te gustaría inscribirte?';
    } else if (message.includes('horario')) {
      responseMessage = '🕒 *Horarios Laguna Fitness:*\n\nLunes a Viernes: 6:00 AM - 10:00 PM\nSábados: 8:00 AM - 2:00 PM\nDomingos: Cerrado';
    } else if (message.includes('hola') || message.includes('buenos días')) {
      responseMessage = '¡Hola! 👋 Bienvenido al bot de *Laguna Fitness*. Escribe "Precio" para conocer nuestros planes o "Horario" para ver cuándo abrimos.';
    } else {
      responseMessage = 'Lo siento, no entendí eso. 🤔 Escribe "Precio" o "Horario" para ayudarte.';
    }

    // Enviamos la respuesta usando nuestro servicio existente
    await sendWhatsApp(fromNumber, responseMessage);

    // Twilio espera una respuesta HTTP 200 vacía o un TwiML
    res.status(200).send('<Response></Response>');
  } catch (error) {
    console.error('Error en Bot WhatsApp:', error);
    res.status(200).send('<Response></Response>'); // Respondemos 200 para que Twilio no reintente
  }
};
