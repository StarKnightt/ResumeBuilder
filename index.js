const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const path = require("path");
const bcrypt = require("bcrypt"); // Add this package for password hashing
const session = require("express-session"); // Add this package for session management
const MongoStore = require('connect-mongo'); // Add this line
const cors = require('cors'); // Add CORS package

// Create an instance of Express
const app = express();
dotenv.config();

// Define the port where the server will listen
const port = process.env.PORT || 3000;

// Revert session and CORS config to simpler version
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Add headers for Vercel
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// MongoDB connection with proper error handling
const connectDB = async (retries = 5) => {
  try {
    const username = process.env.MONGODB_USERNAME;
    const password = process.env.MONGODB_PASSWORD;
    const dbname = process.env.MONGODB_DBNAME;

    if (!username || !password || !dbname) {
      throw new Error("Missing MongoDB credentials in environment variables");
    }

    const uri = `mongodb+srv://${username}:${password}@cluster0.j4relx6.mongodb.net/${dbname}?retryWrites=true&w=majority`;
    
    console.log('Attempting MongoDB connection...');
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", {
      message: error.message,
      stack: error.stack,
      code: error.code
    });

    if (retries > 0) {
      console.log(`Retrying connection... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return connectDB(retries - 1);
    }
    throw error;
  }
};

connectDB();

// Enhanced user schema with password hashing
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

// Add health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', dbConnection: mongoose.connection.readyState });
});

// Add error handling for database operations
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database connection not ready' });
  }
  next();
});

// Improved error handling middleware
app.use((err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    body: req.body,
    query: req.query
  });

  // Send detailed error in development, generic in production
  if (process.env.NODE_ENV === 'development') {
    res.status(err.status || 500).json({
      error: err.message,
      stack: err.stack,
      status: err.status || 500
    });
  } else {
    res.status(err.status || 500).json({
      error: 'Internal server error',
      status: err.status || 500
    });
  }
});

// Keep track of connection state
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
  setTimeout(connectDB, 5000);
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});

// Ensure environment variables are loaded
console.log('Environment check:', {
  nodeEnv: process.env.NODE_ENV,
  port: process.env.PORT,
  frontendUrl: process.env.FRONTEND_URL,
  dbName: process.env.MONGODB_DBNAME,
  hasUsername: !!process.env.MONGODB_USERNAME,
  hasPassword: !!process.env.MONGODB_PASSWORD,
  hasSessionSecret: !!process.env.SESSION_SECRET
});

// Modified server start
const startServer = async () => {
  try {
    await connectDB();
    
    const server = app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
      console.log('Environment:', process.env.NODE_ENV);
    });

    server.on('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();