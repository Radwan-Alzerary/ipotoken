const express = require("express");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 4000;
app.use(cors());

app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(express.static("public"));

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Mongoose schemas
const tokenSchema = new mongoose.Schema({
  securityCode: String,
  dayNum: Number,
  used: Boolean,
  expires: Date,
});

const userSchema = new mongoose.Schema({
  ip: String,
  token: String,
  deviceKey: String,
  timestamp: Date,
});

const User = mongoose.model("User", userSchema);
const Token = mongoose.model("Token", tokenSchema);

// Serve the HTML page (main page)
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// Generate a time-limited token
app.post("/generateToken", async (req, res) => {
  const daysToWork = parseInt(req.body.daysToWork);
  
  // Remove the upper bound (365) check.
  // Now it only checks if daysToWork is a number and at least 1.
  if (!Number.isNaN(daysToWork) && daysToWork >= 1) {
    const securityCode = uuidv4();
    const dayNum = daysToWork;
    const token = new Token({
      securityCode,
      dayNum,
      expires: new Date(Date.now() + 10 * 60 * 1000), // Token expires in 10 minutes
      used: false,
    });

    try {
      await token.save();
      res.json({ token: `${securityCode}/${dayNum}` });
    } catch (err) {
      console.error("Error storing token in MongoDB:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  } else {
    // This error will only occur if daysToWork is not a number or less than 1
    res.status(400).json({ error: "Invalid input, please enter a day number greater than or equal to 1" });
  }
});

// Check the validity of a token or a deviceKey
app.post("/checkToken", async (req, res) => {
  const { token: receivedToken, deviceKey } = req.body;
  console.log("Received body:", req.body);

  // If deviceKey is provided, it's a subsequent offline run
  if (deviceKey) {
    try {
      const user = await User.findOne({ deviceKey });
      if (user) {
        // Device key found, considered valid
        res.json({ valid: true });
      } else {
        res.json({ valid: false, error: "Invalid deviceKey" });
      }
    } catch (err) {
      console.error("Error checking deviceKey in MongoDB:", err);
      res.status(500).json({ error: "Internal server error" });
    }
    return;
  }

  // If no deviceKey, we must be checking the token for the first time
  if (!receivedToken) {
    res.status(400).json({ error: "Token not provided" });
    return;
  }

  try {
    const [securityCode, dayNumStr] = receivedToken.split("/");
    const dayNum = parseInt(dayNumStr);

    if (isNaN(dayNum)) {
      res.status(400).json({ error: "Invalid token format" });
      return;
    }

    // Find the token in MongoDB
    const token = await Token.findOne({
      securityCode,
      dayNum,
      expires: { $gt: new Date() },
    });

    if (token && !token.used) {
      // Mark token as used
      token.used = true;
      await token.save();

      // Generate a unique deviceKey for subsequent runs
      const generatedDeviceKey = uuidv4();

      // Create a user record with the deviceKey
      const user = new User({
        ip: req.ip,
        token: receivedToken,
        deviceKey: generatedDeviceKey,
        timestamp: new Date(),
      });
      await user.save();

      // Return the deviceKey for future offline use
      res.json({ valid: true, deviceKey: generatedDeviceKey, dayNum });
    } else {
      res.json({ valid: false, error: "Token expired or already used" });
    }
  } catch (err) {
    console.error("Error checking token in MongoDB:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// New route to display a list of all devices
app.get("/devices", async (req, res) => {
  try {
    const users = await User.find().sort({ timestamp: -1 }); // Sort by most recent first
    res.render("devices", { users });
  } catch (err) {
    console.error("Error fetching devices from MongoDB:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Connect to MongoDB
mongoose.connect("mongodb+srv://rdoaniv:tuURcyibFupH2znu@cluster0.fzmflcb.mongodb.net/", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on("connected", () => {
  console.log("Connected to MongoDB");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
