const Visit = require('../models/Visit');
const Member = require('../models/Member');
const Payment = require('../models/Payment');
const { Op } = require('sequelize');
const { toMexicoISO, toMexicoTime, mexicoToday, mexicoDayRange } = require('../utils/dateHelper');

class VisitService {
  async getAllVisits(id_gimnasio, { page = 1, limit = 20, fecha = null }) {
    const offset = (page - 1) * limit;
    
    // Asegurar que las asociaciones existan antes de la consulta
    if (!Visit.associations.Member) {
      Visit.belongsTo(Member, { foreignKey: 'id_miembro' });
    }

    const where = { id_gimnasio };

    // Rango del día completo en TZ México con offset EXPLÍCITO (no depende de
    // process.env.TZ). Si no se pasa fecha, usa el día actual en México.
    const { start, end } = mexicoDayRange(fecha);
    where.fecha_visita = {
      [Op.between]: [start, end]
    };

    const { count, rows } = await Visit.findAndCountAll({
      where,
      include: [{ 
        model: Member, 
        attributes: ['nombre', 'apellido', 'estado'],
        required: false 
      }],
      limit,
      offset,
      order: [['fecha_visita', 'DESC']]
    });

    // Aplanamos el resultado para que el frontend (Angular) lo consuma fácilmente.
    // OJO: fecha_visita se reformatea a ISO con offset de México para que NO viaje
    // como UTC (que es lo que causaba el desfase de +6h en el frontend).
    const flattenedData = rows.map(v => {
      const visit = v.toJSON();
      return {
        ...visit,
        fecha_visita: toMexicoISO(visit.fecha_visita),
        created_at: toMexicoISO(visit.created_at),
        updated_at: toMexicoISO(visit.updated_at),
        nombre: visit.Member ? visit.Member.nombre : 'N/A',
        apellido: visit.Member ? visit.Member.apellido : '',
        estado_membresia: visit.Member ? visit.Member.estado : 'activo',
        hora_entrada: toMexicoTime(visit.fecha_visita)
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

    // "Hoy" en TZ de México (toISOString daría UTC y cerca de medianoche fallaría)
    const today = mexicoToday();

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
    // Día actual en México con offset explícito (robusto ante la TZ del proceso)
    const { start, end } = mexicoDayRange();
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);

    const hoy = await Visit.count({
      where: {
        id_gimnasio,
        fecha_visita: { [Op.between]: [start, end] }
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
    const { id_miembro } = visitData;
    
    // Verificar el estado del miembro antes de registrar la visita
    const statusResult = await this.checkMemberStatus(id_gimnasio, id_miembro);

    if (statusResult.estado === 'vencido') {
      throw new Error('El miembro tiene la membresía vencida. No se puede registrar la visita.');
    }

    const visit = await Visit.create({
      ...visitData,
      id_gimnasio,
      fecha_visita: new Date()
    });

    // Devolvemos la fecha ya formateada en TZ México para que la respuesta del POST
    // NO viaje en UTC (mismo criterio que getAllVisits).
    const json = visit.toJSON();
    return {
      ...json,
      fecha_visita: toMexicoISO(json.fecha_visita),
      created_at: toMexicoISO(json.created_at),
      updated_at: toMexicoISO(json.updated_at),
      hora_entrada: toMexicoTime(json.fecha_visita)
    };
  }
}

// Definir asociaciones globales
Visit.belongsTo(Member, { foreignKey: 'id_miembro' });
Member.hasMany(Visit, { foreignKey: 'id_miembro' });

module.exports = new VisitService();
