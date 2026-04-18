const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Member = require('../models/Member');
const Payment = require('../models/Payment');
const Membresia = require('../models/Membresia');
const Visit = require('../models/Visit');
const ExcelJS = require('exceljs');

class AnalyticsService {
  async getDashboardData(id_gimnasio, filters = {}) {
    const { startDate, endDate } = filters;

    // Filtros de fecha para la tabla Payment (pagos)
    const paymentDateFilter = {};
    if (startDate || endDate) {
      paymentDateFilter.fecha_pago = {};
      if (startDate) paymentDateFilter.fecha_pago[Op.gte] = new Date(startDate);
      if (endDate) paymentDateFilter.fecha_pago[Op.lte] = new Date(`${endDate}T23:59:59.999Z`);
    }

    // Obtener nombres de membresías para mapeo (evita problemas de alias en JOINs con GROUP BY)
    const memberships = await Membresia.findAll({ 
      where: { id_gimnasio }, 
      attributes: ['id_membresia', 'nombre'],
      raw: true 
    });
    
    const membershipMap = memberships.reduce((acc, m) => {
      acc[m.id_membresia] = m.nombre;
      return acc;
    }, {});

    // 1. Estados de los miembros
    const membersStatus = await Member.findAll({
      attributes: ['estado', [sequelize.fn('COUNT', sequelize.col('id_miembro')), 'count']],
      where: { id_gimnasio },
      group: ['estado'],
      raw: true
    });

    const estados = { activos: 0, inactivos: 0 };
    membersStatus.forEach(row => {
      if (row.estado === 'activo') {
        estados.activos = parseInt(row.count, 10);
      } else {
        estados.inactivos += parseInt(row.count, 10);
      }
    });

    // 2. Distribución de membresías (Agrupado por ID en Payment)
    const membershipsDistribution = await Payment.findAll({
      attributes: [
        'id_membresia',
        [sequelize.fn('COUNT', sequelize.col('id_pago')), 'count']
      ],
      where: { id_gimnasio, ...paymentDateFilter },
      group: ['id_membresia'],
      raw: true
    });

    const distribucion = membershipsDistribution.map(row => ({
      nombre: membershipMap[row.id_membresia] || 'Desconocida',
      cantidad: parseInt(row.count, 10)
    }));

    // 3. Flujo de ingresos y ventas (Agrupado por ID en Payment)
    const revenueFlow = await Payment.findAll({
      attributes: [
        'id_membresia',
        [sequelize.fn('SUM', sequelize.col('monto')), 'total_generado'],
        [sequelize.fn('COUNT', sequelize.col('id_pago')), 'ventas']
      ],
      where: { id_gimnasio, ...paymentDateFilter },
      group: ['id_membresia'],
      order: [[sequelize.literal('total_generado'), 'DESC']],
      raw: true
    });

    const ingresos = revenueFlow.map(row => ({
      nombre: membershipMap[row.id_membresia] || 'Desconocida',
      total: parseFloat(row.total_generado) || 0,
      ventas: parseInt(row.ventas, 10)
    }));

    // 4. Analítica de visitas
    const visitDateFilter = {};
    if (startDate || endDate) {
      visitDateFilter.fecha_visita = {};
      if (startDate) visitDateFilter.fecha_visita[Op.gte] = new Date(startDate);
      if (endDate) visitDateFilter.fecha_visita[Op.lte] = new Date(`${endDate}T23:59:59.999Z`);
    } else {
      const now = new Date();
      const defaultStartDate = new Date();
      defaultStartDate.setMonth(now.getMonth() - 6); 
      visitDateFilter.fecha_visita = { [Op.gte]: defaultStartDate };
    }

    const visitsData = await Visit.findAll({
      attributes: ['fecha_visita'],
      where: { id_gimnasio, ...visitDateFilter },
      raw: true
    });

    const visitas = {
      porDiaSemana: { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 },
      ultimos7Dias: {},
      porSemana: {},
      porMes: {}
    };

    for(let i=6; i>=0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      visitas.ultimos7Dias[d.toISOString().split('T')[0]] = 0;
    }

    visitsData.forEach(v => {
      const date = new Date(v.fecha_visita);
      if (isNaN(date.getTime())) return;
      
      // Usamos toLocaleDateString con sv-SE para obtener YYYY-MM-DD en la hora local del servidor
      const dateStr = date.toLocaleDateString('sv-SE'); 
      const monthStr = dateStr.substring(0, 7);
      
      visitas.porDiaSemana[date.getDay()]++;
      if (visitas.ultimos7Dias[dateStr] !== undefined) visitas.ultimos7Dias[dateStr]++;
      if (!visitas.porMes[monthStr]) visitas.porMes[monthStr] = 0;
      visitas.porMes[monthStr]++;
      
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
      const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      const weekStr = `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
      if (!visitas.porSemana[weekStr]) visitas.porSemana[weekStr] = 0;
      visitas.porSemana[weekStr]++;
    });

    return { estados, distribucion, ingresos, visitas };
  }

  async exportToExcel(id_gimnasio, type = 'all', filters = {}) {
    const data = await this.getDashboardData(id_gimnasio, filters);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FitManager Analytics';
    workbook.created = new Date();

    if (type === 'estados' || type === 'all') {
      const sheet = workbook.addWorksheet('Estados de Miembros');
      sheet.columns = [
        { header: 'Estado', key: 'estado', width: 20 },
        { header: 'Cantidad', key: 'cantidad', width: 15 }
      ];
      sheet.addRow({ estado: 'Activos', cantidad: data.estados.activos });
      sheet.addRow({ estado: 'Inactivos', cantidad: data.estados.inactivos });
      sheet.getRow(1).font = { bold: true };
    }

    if (type === 'distribucion' || type === 'all') {
      const sheet = workbook.addWorksheet('Distribución de Membresías');
      sheet.columns = [
        { header: 'Membresía', key: 'nombre', width: 30 },
        { header: 'Cantidad Vendida', key: 'cantidad', width: 20 }
      ];
      data.distribucion.forEach(item => sheet.addRow(item));
      sheet.getRow(1).font = { bold: true };
    }

    if (type === 'ingresos' || type === 'all') {
      const sheet = workbook.addWorksheet('Flujo de Ingresos');
      sheet.columns = [
        { header: 'Membresía', key: 'nombre', width: 30 },
        { header: 'Total Generado ($)', key: 'total', width: 25 },
        { header: 'Cantidad de Ventas', key: 'ventas', width: 20 }
      ];
      data.ingresos.forEach(item => sheet.addRow(item));
      sheet.getRow(1).font = { bold: true };
    }

    if (type === 'visitas' || type === 'all') {
      const sheet = workbook.addWorksheet('Visitas (Resumen)');
      sheet.addRow(['VISITAS POR DÍA DE LA SEMANA']);
      sheet.addRow(['Día', 'Cantidad']);
      const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      for (let i = 0; i < 7; i++) sheet.addRow([diasSemana[i], data.visitas.porDiaSemana[i]]);
      sheet.addRow([]);
      sheet.addRow(['VISITAS ÚLTIMOS 7 DÍAS']);
      sheet.addRow(['Fecha', 'Cantidad']);
      for (const [fecha, cantidad] of Object.entries(data.visitas.ultimos7Dias)) sheet.addRow([fecha, cantidad]);
      sheet.addRow([]);
      sheet.addRow(['VISITAS POR MES']);
      sheet.addRow(['Mes', 'Cantidad']);
      for (const [mes, cantidad] of Object.entries(data.visitas.porMes)) sheet.addRow([mes, cantidad]);
      [1, 11, 21].forEach(rowNum => { const row = sheet.getRow(rowNum); if (row) row.font = { bold: true, size: 12 }; });
      [2, 12, 22].forEach(rowNum => { const row = sheet.getRow(rowNum); if (row) row.font = { bold: true }; });
    }

    return await workbook.xlsx.writeBuffer();
  }
}

module.exports = new AnalyticsService();
