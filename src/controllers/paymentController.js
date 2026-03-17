const Payment = require('../models/Payment');
const Member = require('../models/Member');
const sequelize = require('../config/database');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * @desc Get all payments
 * @route GET /api/payments
 */
exports.getAllPayments = async (req, res, next) => {
  try {
    const payments = await Payment.findAll({
      include: [{ model: Member, attributes: ['nombre', 'apellido'] }]
    });
    res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get alerts for expired memberships (from MySQL View)
 * @route GET /api/payments/alerts
 */
exports.getVencidosAlerts = async (req, res, next) => {
  try {
    const alerts = await sequelize.query('SELECT * FROM alerta_vencidos', {
      type: sequelize.QueryTypes.SELECT
    });
    res.status(200).json({ success: true, count: alerts.length, data: alerts });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create a Stripe Payment Intent
 * @route POST /api/payments/create-intent
 */
exports.createStripeIntent = async (req, res, next) => {
  try {
    const { id_miembro, monto, tipo_membresia } = req.body;

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(monto * 100), // Stripe uses cents
      currency: 'mxn', // Or your preferred currency
      metadata: { id_miembro, tipo_membresia }
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Manually record a payment
 * @route POST /api/payments
 */
exports.recordPayment = async (req, res, next) => {
  try {
    const { id_miembro, monto, tipo_membresia, fecha_vencimiento } = req.body;

    const payment = await Payment.create({
      id_miembro,
      monto,
      tipo_membresia,
      fecha_vencimiento
    });

    // Update member status to 'activo'
    await Member.update({ estado: 'activo' }, { where: { id_miembro } });

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};
