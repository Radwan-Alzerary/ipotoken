const express = require('express');
const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');

const router = express.Router();
const saltRounds = 10;

// ميدلوير للتحقق من أن المستخدم هو سوبر مسؤول
function isSuperAdmin(req, res, next) {
  if (req.session && req.session.admin && req.session.admin.role === 'superadmin') {
    return next();
  } else {
    res.status(403).send("غير مصرح لك بالدخول إلى هذه الصفحة");
  }
}

// عرض صفحة إدارة المسؤولين
router.get('/', isSuperAdmin, async (req, res) => {
  try {
    const admins = await Admin.find();
    res.render('admin', { title: 'إدارة المسؤولين', admins });
  } catch (err) {
    console.error("خطأ في جلب المسؤولين:", err);
    res.status(500).send("خطأ داخلي في الخادم");
  }
});

// إضافة مسؤول جديد (يختار السوبر مسؤول الدور)
router.post('/add', isSuperAdmin, async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newAdmin = new Admin({ username, password: hashedPassword, role });
    await newAdmin.save();
    res.redirect('/admin');
  } catch (err) {
    console.error("خطأ في إضافة المسؤول:", err);
    res.status(500).send("خطأ داخلي في الخادم");
  }
});

module.exports = router;
