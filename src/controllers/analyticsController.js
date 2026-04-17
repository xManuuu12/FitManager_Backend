const analyticsService = require('../services/analyticsService');

exports.getDashboardData = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await analyticsService.getDashboardData(req.user.id_gimnasio, { startDate, endDate });
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

exports.exportDashboardToExcel = async (req, res, next) => {
  try {
    const { type, startDate, endDate } = req.query; // 'estados', 'distribucion', 'ingresos', 'visitas' o 'all'
    const buffer = await analyticsService.exportToExcel(req.user.id_gimnasio, type || 'all', { startDate, endDate });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=analiticas_${type || 'completas'}.xlsx`);
    
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};
