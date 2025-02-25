const express = require('express');
const User = require('../models/User');

const router = express.Router();

// ميدلوير للتحقق من تسجيل الدخول
function isAuthenticated(req, res, next) {
  if (req.session && req.session.admin) {
    return next();
  } else {
    res.redirect('/login');
  }
}

// عرض الأجهزة
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const users = await User.find().sort({ timestamp: -1 });
    res.render('devices', { title: 'إدارة الأجهزة', users });
  } catch (err) {
    console.error("خطأ في جلب الأجهزة:", err);
    res.status(500).send("خطأ داخلي في الخادم");
  }
});

module.exports = router;
