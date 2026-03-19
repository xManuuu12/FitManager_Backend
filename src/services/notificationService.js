const Member = require('../models/Member');
const { sendWhatsApp } = require('./whatsappService');

class NotificationService {
  async sendMemberReminder(id_gimnasio, id_miembro) {
    const member = await Member.findOne({
      where: { id_miembro, id_gimnasio }
    });

    if (!member) throw new Error('Miembro no encontrado');
    if (!member.telefono) throw new Error('El miembro no tiene un número de teléfono registrado');

    const message = `Hola ${member.nombre}, te recordamos que tu membresía en FitManager está próxima a vencer. ¡No te quedes sin entrenar!`;

    const sid = await sendWhatsApp(member.telefono, message);
    return sid;
  }
}

module.exports = new NotificationService();
