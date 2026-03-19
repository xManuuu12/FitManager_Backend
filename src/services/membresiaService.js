const Membresia = require('../models/Membresia');

class MembresiaService {
  async getAllMembresias(id_gimnasio, { page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const { count, rows } = await Membresia.findAndCountAll({
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

  async getMembresiaById(id_gimnasio, id_membresia) {
    const membresia = await Membresia.findOne({
      where: { id_membresia, id_gimnasio }
    });
    if (!membresia) throw new Error('Membresía no encontrada');
    return membresia;
  }

  async createMembresia(id_gimnasio, membresiaData) {
    return await Membresia.create({
      ...membresiaData,
      id_gimnasio
    });
  }

  async updateMembresia(id_gimnasio, id_membresia, updateData) {
    const membresia = await this.getMembresiaById(id_gimnasio, id_membresia);
    
    delete updateData.id_gimnasio; // Seguridad
    return await membresia.update(updateData);
  }

  async deleteMembresia(id_gimnasio, id_membresia) {
    const membresia = await this.getMembresiaById(id_gimnasio, id_membresia);
    return await membresia.destroy();
  }
}

module.exports = new MembresiaService();
