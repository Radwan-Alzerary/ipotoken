const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const socketIo = require('socket.io');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 4002;

// إعداد الميدلوير
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// إعداد EJS مع Layouts
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('layout', 'layout'); // ملف التخطيط الافتراضي في views/layout.ejs
app.set('views', path.join(__dirname, 'views'));

const server = http.createServer(app);
const io = socketIo(server); // Socket.io integration

// إعداد الجلسات (يُرجى استخدام مفتاح آمن في الإنتاج)
app.use(session({
  secret: 'codeScret',
  resave: false,
  saveUninitialized: false,
}));
app.use((req, res, next) => {
  res.locals.user = req.session.admin || null;
  next();
});
// Socket.io logic to track active devices
// We'll maintain a simple in-memory map of active device keys.
let activeDevices = {};

io.on('connection', (socket) => {
  console.log('عميل متصل:', socket.id);

  // When a client registers its deviceKey, mark it as active
  socket.on('registerDevice', (data) => {
    console.log(data);
    const { deviceKey } = data;
    console.log(deviceKey);
    activeDevices[deviceKey] = socket.id;
    console.log('جهاز مسجل:', deviceKey);
    // Broadcast to all clients that this device is active
    io.emit('deviceStatus', { deviceKey, active: true });
    io.emit('pingDevicesResponse', Object.keys(activeDevices));

  });

  // Handle pingDevices event to return all connected devices
  socket.on('pingDevices', () => {
    console.log('pingDevices event received from socket:', socket.id);
    console.log(activeDevices);
    // Create an array of device keys
    const deviceKeys = Object.keys(activeDevices);
    console.log(deviceKeys)
    socket.emit('pingDevicesResponse', deviceKeys);
  });
  
  // When a client disconnects, mark its device as inactive
  socket.on('disconnect', () => {
    console.log('عميل منفصل:', socket.id);
    for (let key in activeDevices) {
      if (activeDevices[key] === socket.id) {
        delete activeDevices[key];
        io.emit('deviceStatus', { deviceKey: key, active: false });
        io.emit('pingDevicesResponse', Object.keys(activeDevices));

        break;
      }
    }
  });
});

// الاتصال بقاعدة MongoDB (حدث الـ URI بحسب إعداداتك)
const dbURI = "mongodb://127.0.0.1:27017/token";
mongoose.connect(dbURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("متصل بقاعدة MongoDB"))
.catch((err) => console.error("خطأ في الاتصال بقاعدة MongoDB:", err));

// استيراد المسارات (Routes)
const authRoutes = require('./routes/auth');
const tokenRoutes = require('./routes/tokens');
const deviceRoutes = require('./routes/devices');
const adminRoutes = require('./routes/admin');

// استخدام المسارات
app.use('/', authRoutes);           // تسجيل الدخول والتسجيل والخروج والصفحة الرئيسية
app.use('/tokens', tokenRoutes);    // إدارة الرموز
app.use('/devices', deviceRoutes);  // إدارة الأجهزة
app.use('/admin', adminRoutes);     // إدارة المسؤولين (متاح فقط لسوبر المسؤول)
// في ملف app.js أو ملف routes جديد
app.get('/check-token', (req, res) => {
  res.render('check-token', { title: 'التحقق من الرمز' });
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.render('index', { title: 'الرئيسية', user: req.session.admin || null });
});

server.listen(PORT, () => {
  console.log(`الخادم يعمل على http://localhost:${PORT}`);
});
