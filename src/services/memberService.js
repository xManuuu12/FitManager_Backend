const Member = require('../models/Member');

/**
 * Servicio para gestionar la lógica de miembros
 */
class MemberService {
  async getAllMembers(id_gimnasio, { page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const { count, rows } = await Member.findAndCountAll({
      where: { id_gimnasio },
      limit,
      offset,
      order: [['nombre', 'ASC']]
    });

    return {
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: rows
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
