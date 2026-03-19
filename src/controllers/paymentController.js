const paymentService = require('../services/paymentService');

exports.getAllPayments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await paymentService.getAllPayments(req.user.id_gimnasio, { page, limit });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.getVencidosAlerts = async (req, res, next) => {
  try {
    const alerts = await paymentService.getVencidosAlerts(req.user.id_gimnasio);
    res.status(200).json({ success: true, count: alerts.length, data: alerts });
  } catch (error) {
    next(error);
  }
};

exports.createStripeIntent = async (req, res, next) => {
  try {
    const intent = await paymentService.createStripeIntent(req.user.id_gimnasio, req.body);
    res.status(200).json({
      success: true,
      clientSecret: intent.client_secret,
    });
  } catch (error) {
    if (error.message === 'Miembro no encontrado') {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

exports.recordPayment = async (req, res, next) => {
  try {
    const payment = await paymentService.recordPayment(req.user.id_gimnasio, req.body);
    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    if (error.message === 'Miembro no encontrado') {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};
