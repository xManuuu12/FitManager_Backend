const Member = require('../models/Member');
const Payment = require('../models/Payment');
const Membresia = require('../models/Membresia');
const sequelize = require('../config/database');
const { calcularVencimiento } = require('../utils/membresiaHelper');

/**
 * Servicio para gestionar la lógica de miembros
 */
class MemberService {
  async getAllMembers(id_gimnasio, { page = 1, limit = null }) {
    const offset = limit ? (page - 1) * limit : null;

    // Asegurar asociación para el include
    if (!Member.associations.Payments) {
      Member.hasMany(Payment, { foreignKey: 'id_miembro' });
    }

    const { count, rows } = await Member.findAndCountAll({
      where: { id_gimnasio },
      distinct: true, // Asegura que el conteo sea de miembros únicos
      include: [{
        model: Payment,
        attributes: ['fecha_vencimiento'],
        // Subconsulta aparte para no romper la paginación de miembros.
        // OJO: NO usar `limit` aquí: separate + limit + include anidado genera
        // un ON clause inválido en Sequelize. Traemos los pagos ordenados y
        // tomamos el último en JS (más abajo).
        separate: true,
        order: [['fecha_vencimiento', 'DESC']],
        include: [{
          model: Membresia,
          attributes: ['nombre', 'duracion_dias', 'precio']
        }]
      }],
      limit: limit ? parseInt(limit) : null,
      offset,
      order: [['nombre', 'ASC']]
    });



    // Aplanamos el resultado para incluir la fecha de vencimiento y la membresía directamente
    const flattenedData = rows.map(m => {
      const member = m.toJSON();
      const lastPayment = member.Payments && member.Payments.length > 0 ? member.Payments[0] : null;
      return {
        ...member,
        fecha_vencimiento: lastPayment ? lastPayment.fecha_vencimiento : null,
        membresia: lastPayment && lastPayment.Membresia ? lastPayment.Membresia.nombre : null
      };
    });

    return {
      count,
      totalPages: limit ? Math.ceil(count / limit) : 1,
      currentPage: page,
      data: flattenedData
    };
  }

  async getMemberById(id_gimnasio, id_miembro) {
    const member = await Member.findOne({
      where: { id_miembro, id_gimnasio }
    });
    if (!member) throw new Error('Miembro no encontrado');
    return member;
  }

  /**
   * Crea un miembro y opcionalmente su primer pago en una sola transacción.
   */
  async createMember(id_gimnasio, data) {
    const { id_membresia, metodo_pago, ...memberData } = data;
    const t = await sequelize.transaction();

    try {
      // 1. Si se eligió una membresía, el miembro nace 'activo'; si no, 'vencido'
      const hasPayment = Boolean(id_membresia);

      const member = await Member.create({
        ...memberData,
        id_gimnasio,
        estado: hasPayment ? 'activo' : 'vencido'
      }, { transaction: t });

      // 2. Si hay membresía, registramos el pago vinculado.
      //    Precio y duración SIEMPRE desde la DB (SaaS-safe), nunca desde el frontend.
      if (hasPayment) {
        const membresia = await Membresia.findOne({
          where: { id_membresia, id_gimnasio },
          transaction: t
        });
        if (!membresia) {
          throw new Error('Membresía no encontrada o no válida para este gimnasio');
        }

        // Vencimiento = hoy + duración de la membresía (formato YYYY-MM-DD)
        const fecha_vencimiento = calcularVencimiento(membresia.duracion_dias);

        await Payment.create({
          id_miembro: member.id_miembro,
          id_membresia,
          id_gimnasio,
          monto: membresia.precio,
          metodo_pago: metodo_pago || 'efectivo',
          fecha_vencimiento
        }, { transaction: t });
      }

      await t.commit();
      return member;

    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async updateMember(id_gimnasio, id_miembro, updateData) {
    const member = await this.getMemberById(id_gimnasio, id_miembro);
    
    // Protegemos el id_gimnasio
    delete updateData.id_gimnasio;
    
    return await member.update(updateData);
  }

  async deleteMember(id_gimnasio, id_miembro) {
    const member = await this.getMemberById(id_gimnasio, id_miembro);
    return await member.destroy();
  }
}

module.exports = new MemberService();
