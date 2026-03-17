const Member = require('../models/Member');
const { sendWhatsApp } = require('../services/whatsappService');

/**
 * @desc Send a manual WhatsApp reminder to a member
 * @route POST /api/notifications/send-reminder/:id
 */
exports.sendReminder = async (req, res, next) => {
  try {
    const member = await Member.findByPk(req.params.id);

    if (!member) {
      return res.status(404).json({ success: false, error: 'Miembro no encontrado' });
    }

    if (!member.telefono) {
      return res.status(400).json({ success: false, error: 'El miembro no tiene un número de teléfono registrado' });
    }

    const message = `Hola ${member.nombre}, te recordamos que tu membresía en FitManager está próxima a vencer. ¡No te quedes sin entrenar!`;

    // To use Twilio WhatsApp in production, your numbers must be pre-registered 
    // or you must use the Twilio Sandbox for testing.
    const sid = await sendWhatsApp(member.telefono, message);

    res.status(200).json({ success: true, message: 'Recordatorio enviado', sid });
  } catch (error) {
    next(error);
  }
};
