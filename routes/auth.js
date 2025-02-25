const express = require('express');
const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');

const router = express.Router();
const saltRounds = 10;

// عرض صفحة التسجيل
router.get('/register', (req, res) => {
  res.render('register', { title: 'التسجيل' });
});

// عملية التسجيل (يتم إنشاء حساب مسؤول عادي بشكل افتراضي)
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newAdmin = new Admin({ username, password: hashedPassword });
    await newAdmin.save();
    res.redirect('/login');
  } catch (err) {
    console.error("خطأ في التسجيل:", err);
    res.status(500).send("خطأ في التسجيل");
  }
});

// عرض صفحة تسجيل الدخول
router.get('/login', (req, res) => {
  res.render('login', { title: 'تسجيل الدخول' });
});

// عملية تسجيل الدخول
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).send("بيانات اعتماد غير صحيحة");
    }
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).send("بيانات اعتماد غير صحيحة");
    }
    req.session.admin = admin;
    res.redirect('/');
  } catch (err) {
    console.error("خطأ في تسجيل الدخول:", err);
    res.status(500).send("خطأ داخلي في الخادم");
  }
});

// تسجيل الخروج
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;
