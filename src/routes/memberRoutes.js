const express = require('express');
const router = express.Router();
const {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  restoreMember
} = require('../controllers/memberController');

router.route('/')
  .get(getAllMembers)
  .post(createMember);

// Restaurar un miembro borrado (soft delete). Va antes de '/:id' por claridad.
router.post('/:id/restore', restoreMember);

router.route('/:id')
  .get(getMemberById)
  .put(updateMember)
  .delete(deleteMember);

module.exports = router;
