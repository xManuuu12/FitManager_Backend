const membresiaService = require('../services/membresiaService');

exports.getAllMembresias = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await membresiaService.getAllMembresias(req.user.id_gimnasio, { page, limit });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.createMembresia = async (req, res, next) => {
  try {
    const membresia = await membresiaService.createMembresia(req.user.id_gimnasio, req.body);
    res.status(201).json({ success: true, data: membresia });
  } catch (error) {
    next(error);
  }
};

exports.updateMembresia = async (req, res, next) => {
  try {
    const membresia = await membresiaService.updateMembresia(req.user.id_gimnasio, req.params.id, req.body);
    res.status(200).json({ success: true, data: membresia });
  } catch (error) {
    if (error.message === 'Membresía no encontrada') {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

exports.deleteMembresia = async (req, res, next) => {
  try {
    await membresiaService.deleteMembresia(req.user.id_gimnasio, req.params.id);
    res.status(200).json({ success: true, message: 'Membresía eliminada' });
  } catch (error) {
    if (error.message === 'Membresía no encontrada') {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};
