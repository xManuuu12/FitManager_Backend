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
 * Verificación del Webhook de Meta
 */
exports.verifyWebhook = (req, res) => {
  const verify_token = process.env.META_WEBHOOK_VERIFY_TOKEN;

  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === verify_token) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
};

/**
 * Maneja los mensajes entrantes de WhatsApp (Webhook de Meta)
 */
exports.handleIncomingWhatsApp = async (req, res, next) => {
  try {
    const body = req.body;

    if (body.object) {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0] &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const messageObj = body.entry[0].changes[0].value.messages[0];
        const fromNumber = messageObj.from;

        if (messageObj.type === 'text') {
          const messageText = messageObj.text.body.toLowerCase().trim();
          let responseMessage = '';

          if (messageText.includes('precio') || messageText.includes('plan')) {
            responseMessage = '🏋️‍♂️ *Nuestros Planes:*\n\n1. Mensualidad: $350 MXN\n2. Trimestre: $900 MXN\n3. Visita: $50 MXN\n\n¿Te gustaría inscribirte?';
          } else if (messageText.includes('horario')) {
            responseMessage = '🕒 *Horarios Laguna Fitness:*\n\nLunes a Viernes: 6:00 AM - 10:00 PM\nSábados: 8:00 AM - 2:00 PM\nDomingos: Cerrado';
          } else if (messageText.includes('hola') || messageText.includes('buenos días')) {
            responseMessage = '¡Hola! 👋 Bienvenido al bot de *Laguna Fitness*. Escribe "Precio" para conocer nuestros planes o "Horario" para ver cuándo abrimos.';
          } else {
            responseMessage = 'Lo siento, no entendí eso. 🤔 Escribe "Precio" o "Horario" para ayudarte.';
          }

          // Enviamos la respuesta usando nuestro servicio
          await sendWhatsApp(fromNumber, responseMessage);
        }
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('Error en Bot WhatsApp Meta:', error);
    res.sendStatus(500);
  }
};

