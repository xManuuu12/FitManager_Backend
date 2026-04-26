const memberService = require('../services/memberService');
const paymentService = require('../services/paymentService');

exports.getAllMembers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;

    const result = await memberService.getAllMembers(req.user.id_gimnasio, { page, limit });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.getMemberById = async (req, res, next) => {
  try {
    const member = await memberService.getMemberById(req.user.id_gimnasio, req.params.id);
    res.status(200).json({ success: true, data: member });
  } catch (error) {
    if (error.message === 'Miembro no encontrado') {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

exports.createMember = async (req, res, next) => {
  try {
    const { id_membresia, metodo_pago, ...memberData } = req.body;
    
    // 1. Crear al miembro
    const member = await memberService.createMember(req.user.id_gimnasio, memberData);

    // 2. Si el pago es por tarjeta, generar el intento de Stripe
    if (metodo_pago === 'tarjeta' && id_membresia) {
      const intent = await paymentService.createStripeIntent(req.user.id_gimnasio, {
        id_miembro: member.id_miembro,
        id_membresia: id_membresia
      });

      return res.status(201).json({ 
        success: true, 
        data: member,
        clientSecret: intent.client_secret // Este secreto lo usa el front para abrir Stripe
      });
    }

    // 3. Si no es tarjeta, respuesta normal
    res.status(201).json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
};

exports.updateMember = async (req, res, next) => {
  try {
    const member = await memberService.updateMember(req.user.id_gimnasio, req.params.id, req.body);
    res.status(200).json({ success: true, data: member });
  } catch (error) {
    if (error.message === 'Miembro no encontrado') {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

exports.deleteMember = async (req, res, next) => {
  try {
    await memberService.deleteMember(req.user.id_gimnasio, req.params.id);
    res.status(200).json({ success: true, message: 'Miembro eliminado' });
  } catch (error) {
    if (error.message === 'Miembro no encontrado') {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};
