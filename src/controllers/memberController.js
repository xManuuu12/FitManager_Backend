const Member = require('../models/Member');

exports.getAllMembers = async (req, res, next) => {
  try {
    const members = await Member.findAll();
    res.status(200).json({ success: true, count: members.length, data: members });
  } catch (error) {
    next(error);
  }
};

exports.getMemberById = async (req, res, next) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: `Miembro no encontrado` });
    }
    res.status(200).json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
};

exports.createMember = async (req, res, next) => {
  try {
    const member = await Member.create(req.body);
    res.status(201).json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
};

exports.updateMember = async (req, res, next) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: `Miembro no encontrado` });
    }
    await member.update(req.body);
    res.status(200).json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
};

exports.deleteMember = async (req, res, next) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: `Miembro no encontrado` });
    }
    await member.destroy();
    res.status(200).json({ success: true, message: 'Miembro eliminado' });
  } catch (error) {
    next(error);
  }
};
