const Member = require('../models/Member');
const Payment = require('../models/Payment');

/**
 * Servicio para gestionar la lógica de miembros
 */
class MemberService {
  async getAllMembers(id_gimnasio, { page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;

    // Asegurar asociación para el include
    if (!Member.associations.Payments) {
      Member.hasMany(Payment, { foreignKey: 'id_miembro' });
    }

    const { count, rows } = await Member.findAndCountAll({
      where: { id_gimnasio },
      include: [{
        model: Payment,
        attributes: ['fecha_vencimiento'],
        limit: 1,
        order: [['fecha_vencimiento', 'DESC']]
      }],
      limit,
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
      totalPages: Math.ceil(count / limit),
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

  async createMember(id_gimnasio, memberData) {
    return await Member.create({
      ...memberData,
      id_gimnasio
    });
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
