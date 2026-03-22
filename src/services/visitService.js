const Visit = require('../models/Visit');
const Member = require('../models/Member');
const Payment = require('../models/Payment');
const { Op } = require('sequelize');

class VisitService {
  async getAllVisits(id_gimnasio, { page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    
    // Asegurar que las asociaciones existan antes de la consulta
    if (!Visit.associations.Member) {
      Visit.belongsTo(Member, { foreignKey: 'id_miembro' });
    }

    const { count, rows } = await Visit.findAndCountAll({
      where: { id_gimnasio },
      include: [{ 
        model: Member, 
        attributes: ['nombre', 'apellido', 'estado'],
        required: false 
      }],
      limit,
      offset,
      order: [['fecha_visita', 'DESC']]
    });

    // Aplanamos el resultado para que el frontend (Angular) lo consuma fácilmente
    const flattenedData = rows.map(v => {
      const visit = v.toJSON();
      const hora = new Date(visit.fecha_visita).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      return {
        ...visit,
        nombre: visit.Member ? visit.Member.nombre : 'N/A',
        apellido: visit.Member ? visit.Member.apellido : '',
        estado_membresia: visit.Member ? visit.Member.estado : 'activo',
        hora_entrada: hora
      };
    });

    return {
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: flattenedData
    };
  }

  async checkMemberStatus(id_gimnasio, id_miembro) {
    const member = await Member.findOne({
      where: { 
        id_miembro: Number(id_miembro), 
        id_gimnasio 
      }
    });

    if (!member) {
      throw new Error('Miembro no encontrado');
    }

    const lastPayment = await Payment.findOne({
      where: { id_miembro: member.id_miembro, id_gimnasio },
      order: [['fecha_vencimiento', 'DESC']]
    });

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    let status = 'vencido';
    let message = 'Membresía vencida o sin pagos registrados';

    if (lastPayment && lastPayment.fecha_vencimiento >= today) {
      status = 'activo';
      message = 'Membresía activa';
    }

    // Sincronizar estado del miembro si ha cambiado
    if (member.estado !== status) {
      await member.update({ estado: status });
    }

    return {
      id_miembro: member.id_miembro,
      nombre: member.nombre,
      apellido: member.apellido,
      estado: status,
      lastPayment: lastPayment ? {
        fecha_vencimiento: lastPayment.fecha_vencimiento
      } : null,
      message
    };
  }

  async getTodayStats(id_gimnasio) {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);

    const hoy = await Visit.count({
      where: {
        id_gimnasio,
        fecha_visita: { [Op.between]: [startOfDay, endOfDay] }
      }
    });

    const ultimaHora = await Visit.count({
      where: {
        id_gimnasio,
        fecha_visita: { [Op.between]: [lastHour, new Date()] }
      }
    });

    return {
      hoy,
      ultimaHora,
      promedioDiario: Math.round(hoy * 0.8) || 0 // Un dato de ejemplo basado en el actual
    };
  }

  async createVisit(id_gimnasio, visitData) {
    return await Visit.create({
      ...visitData,
      id_gimnasio,
      fecha_visita: new Date()
    });
  }
}

// Definir asociaciones globales
Visit.belongsTo(Member, { foreignKey: 'id_miembro' });
Member.hasMany(Visit, { foreignKey: 'id_miembro' });

module.exports = new VisitService();
