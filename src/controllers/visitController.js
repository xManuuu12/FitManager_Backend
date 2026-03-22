const visitService = require('../services/visitService');

exports.getAllVisits = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await visitService.getAllVisits(req.user.id_gimnasio, { page, limit });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.checkMemberStatus = async (req, res, next) => {
  try {
    const id_miembro = req.params.id;
    const result = await visitService.checkMemberStatus(req.user.id_gimnasio, id_miembro);
    
    // Devolvemos el resultado envuelto en 'data' para consistencia con el frontend
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.message === 'Miembro no encontrado') {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

exports.getTodayStats = async (req, res, next) => {
  try {
    const stats = await visitService.getTodayStats(req.user.id_gimnasio);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

exports.createVisit = async (req, res, next) => {
  try {
    const visit = await visitService.createVisit(req.user.id_gimnasio, req.body);
    res.status(201).json({ success: true, data: visit });
  } catch (error) {
    next(error);
  }
};
