const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const socketIo = require('socket.io');
const http = require('http');

// Import your routes
const authRoutes = require('./routes/auth');
const tokenRoutes = require('./routes/tokens');
const deviceRoutes = require('./routes/devices');
const adminRoutes = require('./routes/admin');
const cmdRoutes = require('./routes/cmd'); // if you still need separate cmd routes

const Token = require('./models/Token'); // Import Token model for updating comments

const app = express();
const PORT = process.env.PORT || 4002;

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// EJS setup with layouts
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('layout', 'layout');
app.set('views', path.join(__dirname, 'views'));

const server = http.createServer(app);
const io = socketIo(server);

// Make io instance accessible in routes
app.set('socketio', io);

// Session setup (use a secure secret in production)
app.use(session({
  secret: 'codeScret',
  resave: false,
  saveUninitialized: false,
}));

app.use((req, res, next) => {
  res.locals.user = req.session.admin || null;
  next();
});

// Socket.io logic for connected devices and commands
let activeDevices = {};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('registerDevice', (data) => {
    const { deviceKey } = data;
    activeDevices[deviceKey] = socket.id;
    io.emit('deviceStatus', { deviceKey, active: true });
    io.emit('pingDevicesResponse', Object.keys(activeDevices));
  });

  socket.on('pingDevices', () => {
    socket.emit('pingDevicesResponse', Object.keys(activeDevices));
  });

  // New event: client sends a command (to be stored as a comment in a token)
  socket.on('sendCommand', async (data) => {
    // Expecting data: { tokenId, command, createdBy }
    const { tokenId, command, createdBy } = data;
    try {
      const token = await Token.findById(tokenId);
      if (token) {
        token.comments.push({ text: command, createdBy: createdBy || 'Unknown' });
        await token.save();
        // Emit an event to notify clients that a new comment has been added
        io.emit('newComment', { tokenId, command, createdBy });
      } else {
        socket.emit('commandError', { msg: "Token not found" });
      }
    } catch (err) {
      console.error("Error storing command comment:", err);
      socket.emit('commandError', { msg: "Error storing command comment" });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
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

// Connect to MongoDB
const dbURI = "mongodb://127.0.0.1:27017/token";
mongoose.connect(dbURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB"))
.catch((err) => console.error("MongoDB connection error:", err));

// Use routes
app.use('/', authRoutes);         // Authentication routes
app.use('/tokens', tokenRoutes);    // Tokens management
app.use('/devices', deviceRoutes);  // Devices management
app.use('/admin', adminRoutes);     // Admin management
app.use('/cmd', cmdRoutes);         // (Optional) separate cmd routes

app.get('/check-token', (req, res) => {
  res.render('check-token', { title: 'Token Check' });
});

app.get('/', (req, res) => {
  res.render('index', { title: 'Home', user: req.session.admin || null });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
