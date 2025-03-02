const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const path = require("path");
const bcrypt = require("bcrypt"); // Add this package for password hashing
const session = require("express-session"); // Add this package for session management
const cors = require('cors'); // Add CORS package

// Create an instance of Express
const app = express();
dotenv.config();

// Define the port where the server will listen
const port = process.env.PORT || 3000;

// Retrieve MongoDB connection details from environment variables
const username = process.env.MONGODB_USERNAME || "";
const password = process.env.MONGODB_PASSWORD || "";
const dbname = process.env.MONGODB_DBNAME || "";

// console.log('-----------------------------------------------------------------')
// console.log("Username:", username);
// console.log("Password:", password);
// console.log("Database:", dbname);
// console.log('-----------------------------------------------------------------')

// Simplified session config for Vercel deployment
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'none',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// CORS configuration for Vercel
app.use(cors({
  origin: true, // Allows all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add request logging for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// MongoDB connection with simplified error handling
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 
      `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.j4relx6.mongodb.net/${process.env.MONGODB_DBNAME}?retryWrites=true&w=majority`);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    return false;
  }
  return true;
};

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

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public"), {
  setHeaders: (res, path, stat) => {
    if (path.endsWith('.css')) {
      res.set('Content-Type', 'text/css');
    }
  }
}));

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Vercel deployment handler
const handler = async (req, res) => {
  if (!mongoose.connection.readyState) {
    await connectDB();
  }
  return app(req, res);
};

// Export for Vercel
module.exports = handler;

// Start server only in development
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}