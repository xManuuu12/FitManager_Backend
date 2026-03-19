const memberService = require('../services/memberService');

exports.getAllMembers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

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
    const member = await memberService.createMember(req.user.id_gimnasio, req.body);
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
