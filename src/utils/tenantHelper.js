/**
 * Helper para construir objetos de consulta (where) filtrados por id_gimnasio.
 * @param {Object} req - Objeto de petición Express.
 * @param {Object} extra - Condiciones adicionales para el WHERE.
 * @returns {Object} Objeto con id_gimnasio y las condiciones extra.
 */
exports.tenantWhere = (req, extra = {}) => ({
  id_gimnasio: req.user.id_gimnasio,
  ...extra
});

/**
 * Helper para asegurar que la data contenga el id_gimnasio del usuario actual.
 * @param {Object} req - Objeto de petición Express.
 * @param {Object} data - Datos a guardar/actualizar.
 * @returns {Object} Datos con id_gimnasio incluido.
 */
exports.withTenant = (req, data = {}) => ({
  ...data,
  id_gimnasio: req.user.id_gimnasio
});
