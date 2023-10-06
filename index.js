const express = require("express");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");

const app = express();
const PORT = 4000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));

// MongoDB connection URL and database name

// Create a Mongoose schema for tokens
const tokenSchema = new mongoose.Schema({
  securityCode: String,
  dayNum: Number,
  used: Boolean,
  expires: Date,
});
const userSchema = new mongoose.Schema({
  ip: String,
  token: String,
  timestamp: Date,
});
const User = mongoose.model("User", userSchema);

// Create a Mongoose model for tokens
const Token = mongoose.model("Token", tokenSchema);

// Serve the HTML page
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// Generate a time-limited token
app.post("/generateToken", async (req, res) => {
  const daysToWork = parseInt(req.body.daysToWork);
  if (!Number.isNaN(daysToWork) && daysToWork >= 1 && daysToWork <= 365) {
    const securityCode = uuidv4();
    const dayNum = daysToWork; // You can change this as needed
    const token = new Token({
      securityCode,
      dayNum,
      expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiration
      used: false, // Add a 'used' field to mark the token as unused
    });

    try {
      // Save the token to MongoDB
      await token.save();
      res.json({ token: `${securityCode}/${dayNum}` });
    } catch (err) {
      console.error("Error storing token in MongoDB:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  } else {
    res.status(400).json({ error: "Invalid input" });
  }
});

// Check the validity of a token
app.post("/checkToken", async (req, res) => {
  const receivedToken = req.body;
  console.log(receivedToken)
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
    console.log(securityCode);

    if (token && !token.used) {
      token.used = true;
      await token.save();
      const user = new User({
        ip: req.ip, // req.ip provides the IP address of the client
        token: receivedToken,
        timestamp: new Date(),
      });

      await user.save();

      res.json({ result: true, dayNum });
    } else {
      res.json({ result: false, problem: "token expire" });
    }
  } catch (err) {
    console.error("Error checking token in MongoDB:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Connect to MongoDB using Mongoose
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
