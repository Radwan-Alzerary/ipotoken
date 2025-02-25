const express = require('express');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const Token = require('../models/Token');
const User = require('../models/User');

const router = express.Router();

// ميدلوير للتحقق من تسجيل الدخول (يمكن تعديله حسب النظام الخاص بك)
function isAuthenticated(req, res, next) {
  if (req.session && req.session.admin) {
    return next();
  } else {
    return res.status(401).json({ msg: "غير مصرح بالدخول" });
  }
}

// GET: جلب قائمة الرموز (يمكنك تعديلها لتضمين الترقيم والفلاتر)
router.get('/', async (req, res) => {
  try {
    let tokens;
    if (req.session.admin.role === 'superadmin') {
      tokens = await Token.find().sort({ expires: -1 });
    } else {
      tokens = await Token.find({ createdBy: req.session.admin.username }).sort({ expires: -1 });
    }
    // يمكنك أيضاً حساب الإحصائيات وإرسالها للقالب
    const totalTokens = await Token.countDocuments();
    const activeTokens = await Token.countDocuments({ state: 'active' });
    const usedOrExpiredTokens = await Token.countDocuments({ state: { $in: ['used', 'expired'] } });
    
    // إرسال القالب مع البيانات (يفترض أنك تستخدم EJS)
    res.render('tokens', {
      title: 'إدارة الرموز',
      tokens,
      totalTokens,
      activeTokens,
      usedOrExpiredTokens,
      currentPage: req.query.page || 1,
      totalPages: 1 // يمكن تعديلها لاحقاً للترقيم
    });
  } catch (err) {
    console.error("خطأ في جلب الرموز:", err);
    res.status(500).json({ msg: "خطأ داخلي في الخادم" });
  }
});

// POST: إنشاء رمز جديد
// POST: إنشاء رمز جديد
router.post('/generate', isAuthenticated, async (req, res) => {
  const { daysToWork, customerName, description, price, latitude, longitude, paymentType, referral } = req.body;
  const dayNum = parseInt(daysToWork);
  
  if (!Number.isNaN(dayNum) && dayNum >= 1) {
    const securityCode = uuidv4();
    const token = new Token({
      securityCode,
      dayNum,
      price: price ? parseFloat(price) : undefined,
      expires: new Date(Date.now() + 10 * 60 * 1000), // صلاحية 10 دقائق
      used: false,
      customerName,
      description,
      // New location fields (latitude and longitude)
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      // New additional details
      paymentType,
      referral,
      state: 'active',
      createdBy: req.session.admin.username
    });
    try {
      await token.save();
      res.redirect('/tokens');
    } catch (err) {
      console.error("خطأ في حفظ الرمز:", err);
      res.status(500).send("خطأ داخلي في الخادم");
    }
  } else {
    res.status(400).send("يجب أن يكون عدد الأيام رقمًا أكبر من أو يساوي 1");
  }
});


// GET: صفحة ملف الرمز (Profile) التي تعرض كافة التفاصيل للرمز المستخدم
router.get('/profile/:id', isAuthenticated, async (req, res) => {
  try {
    const token = await Token.findById(req.params.id);
    if (!token) {
      return res.status(404).send("الرمز غير موجود");
    }
    // العثور على سجل المستخدم الذي استخدم هذا الرمز
    // نفترض هنا أن قيمة "token" في سجل المستخدم مخزنة بصيغة "securityCode/dayNum"
    const user = await User.findOne({ token: token.securityCode + "/" + token.dayNum });
    res.render('tokenProfile', { title: 'ملف الرمز', token, user });
  } catch (err) {
    console.error(err);
    res.status(500).send("خطأ داخلي في الخادم");
  }
});


// GET: جلب بيانات رمز معين للتعديل (باستخدام معرّف الرمز)
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const token = await Token.findById(req.params.id);
    if (!token) {
      return res.status(404).json({ msg: "لم يتم العثور على الرمز" });
    }
    res.json(token);
  } catch (err) {
    console.error("خطأ في جلب الرمز:", err);
    res.status(500).json({ msg: "خطأ داخلي في الخادم" });
  }
});

// PUT: تحديث بيانات رمز معين
router.put('/:id', isAuthenticated, async (req, res) => {
  const { dayNum, price, customerName, location, description } = req.body;
  try {
    const token = await Token.findById(req.params.id);
    if (!token) {
      return res.status(404).json({ msg: "لم يتم العثور على الرمز" });
    }
    token.dayNum = dayNum;
    token.price = price;
    token.customerName = customerName;
    token.location = location;
    token.description = description;
    
    await token.save();
    res.json({ success: true });
  } catch (err) {
    console.error("خطأ في تحديث الرمز:", err);
    res.status(500).json({ msg: "خطأ داخلي في الخادم" });
  }
});

// DELETE: حذف رمز معين
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const token = await Token.findByIdAndDelete(req.params.id);
    if (!token) {
      return res.status(404).json({ msg: "لم يتم العثور على الرمز" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("خطأ في حذف الرمز:", err);
    res.status(500).json({ msg: "خطأ داخلي في الخادم" });
  }
});

// POST: التحقق من الرمز (للاستخدام من قبل العميل)
router.post('/check', async (req, res) => {
  const { token: receivedToken, deviceKey } = req.body;
  
  // التحقق باستخدام deviceKey للاستخدام دون اتصال
  if (deviceKey) {
    try {
      const user = await User.findOne({ deviceKey });
      if (user) {
        return res.json({ valid: true });
      } else {
        return res.json({ valid: false, error: "مفتاح الجهاز غير صحيح" });
      }
    } catch (err) {
      console.error("خطأ في التحقق من مفتاح الجهاز:", err);
      return res.status(500).json({ error: "خطأ داخلي في الخادم" });
    }
  }

  // التحقق من إرسال الرمز
  if (!receivedToken) {
    return res.status(400).json({ error: "لم يتم إرسال الرمز" });
  }

  try {
    const [securityCode, dayNumStr] = receivedToken.split("/");
    const dayNum = parseInt(dayNumStr);
    if (isNaN(dayNum)) {
      return res.status(400).json({ error: "تنسيق الرمز غير صحيح" });
    }
    
    // البحث عن الرمز في قاعدة البيانات
    const token = await Token.findOne({
      securityCode,
      dayNum,
      expires: { $gt: new Date() },
      state: 'active'
    });
    
    if (token) {
      // تحديث حالة الرمز
      token.used = true;
      token.state = 'used';
      await token.save();
      
      // إنشاء مفتاح جهاز جديد
      const generatedDeviceKey = uuidv4();
      
      // الحصول على معلومات نظام العميل من رأس "User-Agent"
      const clientOsInfo = req.headers['user-agent'] || "غير معروف";
      
      // الحصول على معلومات الجهاز من الخادم باستخدام وحدة os
      const serverPcInfo = {
          hostname: os.hostname(),
          platform: os.platform(),
          release: os.release(),
          arch: os.arch()
      };

      // إنشاء سجل مستخدم جديد مع المعلومات الإضافية
      const newUser = new User({
        ip: req.ip,
        token: receivedToken,
        deviceKey: generatedDeviceKey,
        pcInfo: JSON.stringify(serverPcInfo),
        osInfo: clientOsInfo,
        registrationTime: new Date()
      });
      await newUser.save();
      
      res.json({ valid: true, deviceKey: generatedDeviceKey, dayNum });
    } else {
      res.json({ valid: false, error: "الرمز منتهي الصلاحية أو تم استخدامه بالفعل" });
    }
  } catch (err) {
    console.error("خطأ أثناء معالجة الرمز:", err);
    res.status(500).json({ error: "خطأ داخلي في الخادم" });
  }
});

module.exports = router;
