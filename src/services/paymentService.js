const Payment = require('../models/Payment');
const Member = require('../models/Member');
const Membresia = require('../models/Membresia');
const sequelize = require('../config/database');
require('dotenv').config(); // Asegúrate de cargar dotenv

// Inicialización segura de Stripe
const stripeKey = process.env.STRIPE_SECRET_KEY;
let stripe;

if (stripeKey) {
    stripe = require('stripe')(stripeKey);
} else {
    console.error("❌ ERROR: STRIPE_SECRET_KEY no definida en variables de entorno.");
    // Creamos un objeto dummy para que el servidor no explote al iniciar
    stripe = {
        paymentIntents: {
            create: () => { throw new Error("Stripe no configurado en este servidor"); }
        }
    };
}

class PaymentService {
    // ... (el resto de tu código se mantiene igual)
    async createStripeIntent(id_gimnasio, { id_miembro, id_membresia }) {
        if (!stripeKey) throw new Error('El sistema de pagos no está configurado (Falta API Key)');
        
        // 1. Validar que el miembro existe y pertenece al gimnasio
        const member = await Member.findOne({ where: { id_miembro, id_gimnasio } });
        // ... (continúa tu lógica de Stripe aquí abajo)
    if (!member) throw new Error('Miembro no encontrado');

    // 2. BUSCAR LA MEMBRESÍA REAL (Seguridad: Usamos el precio de la DB, no del front)
    const membresia = await Membresia.findOne({ where: { id_membresia, id_gimnasio } });
    if (!membresia) throw new Error('Membresía no encontrada o no válida para este gimnasio');

    // 3. CALCULAR FECHA DE VENCIMIENTO (Hoy + duración de la membresía)
    const hoy = new Date();
    const vencimiento = new Date();
    vencimiento.setDate(hoy.getDate() + membresia.duracion_dias);
    
    // Formato YYYY-MM-DD para la base de datos
    const fecha_vencimiento = vencimiento.toISOString().split('T')[0];

    console.log(`[Stripe] Generando intento de pago: $${membresia.precio} para miembro #${id_miembro}. Vence: ${fecha_vencimiento}`);

    // 4. Crear el intento en Stripe
    return await stripe.paymentIntents.create({
      amount: Math.round(membresia.precio * 100), // Stripe usa centavos
      currency: 'mxn',
      metadata: { 
        id_miembro, 
        id_membresia, 
        id_gimnasio,
        monto: membresia.precio,
        fecha_vencimiento // Se guarda para que el Webhook la use al confirmar
      }
    });
  }

  /**
   * Maneja el webhook de Stripe para automatizar la activación del miembro.
   */
  async handleStripeWebhook(event) {
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object;
      const { id_miembro, id_membresia, id_gimnasio, monto, fecha_vencimiento } = intent.metadata;

      console.log(`[Stripe Webhook] Pago exitoso para el miembro #${id_miembro} en el gimnasio #${id_gimnasio}`);

      // Reutilizamos recordPayment para registrar el pago y activar al miembro
      return await this.recordPayment(parseInt(id_gimnasio), {
        id_miembro: parseInt(id_miembro),
        id_membresia: parseInt(id_membresia),
        monto: parseFloat(monto),
        metodo_pago: 'tarjeta',
        fecha_vencimiento: fecha_vencimiento
      });
    }
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
