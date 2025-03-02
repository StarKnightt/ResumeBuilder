const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const path = require("path");
const bcrypt = require("bcrypt");
const session = require("express-session");
const cors = require('cors');

const app = express();
dotenv.config();

// Basic middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.static('public'));

// Simplified session setup without connect-mongo
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 
  }
}));

// MongoDB connection
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;

  try {
    await mongoose.connect(process.env.MONGODB_URI || 
      `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.j4relx6.mongodb.net/${process.env.MONGODB_DBNAME}`);
    isConnected = true;
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
};

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something broke!' });
});

// Routes with try-catch
app.get('/', async (req, res) => {
  try {
    await connectDB();
    res.sendFile(path.join(__dirname, 'index.html'));
  } catch (error) {
    res.status(500).json({ error: 'Failed to serve page' });
  }
});

// Define the schema for user registration
const registrationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  number: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
registrationSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const Registration = mongoose.model("Registration", registrationSchema);

// Basic input validation middleware
const validateRegistrationInput = (req, res, next) => {
  const { name, email, password, number } = req.body;
  
  if (!name || !email || !password || !number) {
    return res.status(400).json({ error: "All fields are required" });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  next();
};

// Routes
// Home page route
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// Registration page route
app.get("/registerPage", (req, res) => {
  res.sendFile(__dirname + "/pages/index.html");
});

// Login Page route
app.get("/loginPage", (req, res) => {
  res.sendFile(__dirname + "/pages/login.html");
});

// Enhanced registration endpoint
app.post("/register", validateRegistrationInput, async (req, res) => {
  try {
    const { name, email, password, number } = req.body;
    
    const existingUser = await Registration.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const registration = new Registration({ name, email, password, number });
    await registration.save();

    req.session.userId = registration._id; // Set session
    res.redirect("/success");
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Enhanced login endpoint
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await Registration.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.session.userId = user._id; // Set session
    res.redirect("/");
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Logout route
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// Success page route
app.get("/success", (req, res) => {
  res.sendFile(__dirname + "/pages/success.html");
});

// Resume page route
app.get("/resume", (req, res) => {
  res.sendFile(__dirname + "/resume.html");
});

// Error page route
app.get("/error", (req, res) => {
  res.sendFile(__dirname + "/pages/error.html");
});

// Route to serve the main CSS file
app.get("/all-styles", (req, res) => {
  res.sendFile(__dirname + "/public/css/main.css");
});

// Vercel serverless handler
const handler = async (req, res) => {
  try {
    await connectDB();
    app(req, res);
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Export handler for Vercel
module.exports = handler;

// Start server only in development
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}