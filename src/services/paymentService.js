const Payment = require('../models/Payment');
const Member = require('../models/Member');
const Membresia = require('../models/Membresia');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const sequelize = require('../config/database');

class PaymentService {
  async getAllPayments(id_gimnasio, { page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const { count, rows } = await Payment.findAndCountAll({
      where: { id_gimnasio },
      limit,
      offset,
      order: [['fecha_pago', 'DESC']],
      include: [
        { model: Member, attributes: ['nombre', 'apellido'], where: { id_gimnasio } },
        { model: Membresia, attributes: ['nombre'], where: { id_gimnasio } }
      ]
    });

    return {
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: rows
    };
  }

  async createStripeIntent(id_gimnasio, { id_miembro, id_membresia, monto }) {
    const member = await Member.findOne({ where: { id_miembro, id_gimnasio } });
    if (!member) throw new Error('Miembro no encontrado');

    return await stripe.paymentIntents.create({
      amount: Math.round(monto * 100),
      currency: 'mxn',
      metadata: { id_miembro, id_membresia, id_gimnasio }
    });
  }

  /**
   * Registra un pago y activa al miembro en una sola transacción atómica.
   * Si falla CUALQUIER paso, el t.rollback() deshace todos los cambios.
   */
  async recordPayment(id_gimnasio, paymentData) {
    const { id_miembro } = paymentData;

    // 1. Iniciamos la transacción
    const t = await sequelize.transaction();

    try {
      // 2. Registramos el pago (Sequelize verificará las FKs)
      const payment = await Payment.create({
        ...paymentData,
        id_gimnasio
      }, { transaction: t });

      // 3. Actualizamos al miembro inyectando id_gimnasio en el WHERE
      // Esto es "SaaS-Safe": aunque alguien mande un id_miembro de otro gimnasio, 
      // el filtro id_gimnasio evitará que se actualice.
      const [updatedRows] = await Member.update(
        { estado: 'activo' }, 
        { 
          where: { id_miembro, id_gimnasio }, 
          transaction: t 
        }
      );

      if (updatedRows === 0) {
        throw new Error('No se pudo actualizar el miembro (No encontrado o pertenece a otro gimnasio)');
      }

      // 4. Si todo salió bien, confirmamos (Commit)
      await t.commit();
      
      // Retornamos el pago con los datos del miembro para el frontend
      return await Payment.findByPk(payment.id_pago, {
        include: [{ model: Member, attributes: ['nombre', 'apellido'] }]
      });

    } catch (error) {
      // 5. Si algo falla (Trigger de BD, error de red, error de lógica), deshacemos TODO
      await t.rollback();
      throw error;
    }
  }

  async getVencidosAlerts(id_gimnasio) {
    return await sequelize.query(
      'SELECT * FROM alerta_vencidos WHERE id_gimnasio = :id_gimnasio', 
      {
        replacements: { id_gimnasio },
        type: sequelize.QueryTypes.SELECT
      }
    );
  }
}

module.exports = new PaymentService();
