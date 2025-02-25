const express = require('express');
const router = express.Router();
const Command = require('../models/Command');

// GET /cmd - list all commands (optional view)
router.get('/', async (req, res) => {
  try {
    const commands = await Command.find().sort({ createdAt: -1 });
    res.render('commands', { title: 'Commands', commands });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// POST /cmd - create a new command, store it, and broadcast it to clients
router.post('/', async (req, res) => {
  const { command } = req.body;
  // Use session info if available
  const createdBy = req.session && req.session.admin ? req.session.admin.username : 'Unknown';

  try {
    const newCommand = new Command({ command, createdBy });
    const savedCommand = await newCommand.save();

    // Retrieve the Socket.io instance from the app
    const io = req.app.get('socketio');
    // Emit the new command to all connected clients
    io.emit('newCommand', savedCommand);

    // Return the saved command to the user who posted the command
    res.json({ success: true, command: savedCommand });
  } catch (err) {
    res.json({ success: false, msg: err.message });
  }
});

module.exports = router;
