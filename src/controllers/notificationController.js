const notificationService = require('../services/notificationService');

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
