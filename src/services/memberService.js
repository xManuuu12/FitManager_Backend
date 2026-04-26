const Member = require('../models/Member');
const Payment = require('../models/Payment');
const sequelize = require('../config/database');

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
        limit: 1,
        order: [['fecha_vencimiento', 'DESC']]
      }],
      limit: limit ? parseInt(limit) : null,
      offset,
      order: [['nombre', 'ASC']]
    });



    // Aplanamos el resultado para incluir la fecha de vencimiento directamente
    const flattenedData = rows.map(m => {
      const member = m.toJSON();
      const lastPayment = member.Payments && member.Payments.length > 0 ? member.Payments[0] : null;
      return {
        ...member,
        fecha_vencimiento: lastPayment ? lastPayment.fecha_vencimiento : null
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
    const { payment, ...memberData } = data;
    const t = await sequelize.transaction();

    try {
      // 1. Si hay pago, el miembro nace 'activo', si no, nace 'vencido'
      const estadoInitial = payment ? 'activo' : 'vencido';

      const member = await Member.create({
        ...memberData,
        id_gimnasio,
        estado: estadoInitial
      }, { transaction: t });

      // 2. Si se incluyeron datos de pago, registramos el pago vinculado
      if (payment) {
        await Payment.create({
          ...payment,
          id_miembro: member.id_miembro,
          id_gimnasio
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
