// Load environment variables from a .env file
require('dotenv').config();

// Import required libraries/modules
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const path = require("path")

// Create an instance of Express
const app = express();
dotenv.config(); // Load environment variables again (repeated)

// Define the port where the server will listen
const port = process.env.PORT || 3000;

// Retrieve MongoDB connection details from environment variables
const username = process.env.MONGODB_USERNAME || process.env.SECRET_NAME;
const password = process.env.MONGODB_PASSWORD || process.env.SECRET;
const dbname = process.env.MONGODB_DBNAME || process.env.SECRET_KEY;

// Connect to MongoDB using mongoose
mongoose.connect(`mongodb+srv://${'prasenjitt4e'}:${'N0QLJsk5MVYYBuQ9'}@cluster0.j4relx6.mongodb.net/?retryWrites=true&w=majority`)

// Define the schema for user registration
const registrationSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    number: String
});

// Create a model based on the registration schema
const Registration = mongoose.model("Registration", registrationSchema);

// Configure Express to use bodyParser for parsing request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Middleware for serving static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Define routes

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

// Registration endpoint
app.post("/register", async (req, res) => {
    try {
        const { name, email, password, number } = req.body;

        // Check if the user with the given email already exists
        const existingUser = await Registration.findOne({ email });

        if (!existingUser) {
            // If user doesn't exist, create a new registration and save it
            const registrationData = new Registration({ name, email, password, number });
            await registrationData.save();
            return res.redirect("/success");
        } else {
            // If user already exists, redirect to an error page
            console.log("User already exists");
            return res.redirect("/error");
        }
    } catch (error) {
        // Handle any errors during registration
        console.log(error);
        return res.redirect("/error");
    }
});

app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if the user with the given email and password exists
        const existingUser = await Registration.findOne({ email, password });

        if (existingUser) {
            // If user exists, redirect to success page (you can customize this)
            return res.redirect("/success");
        } else {
            // If user doesn't exist or password is incorrect, redirect to error page
            console.log("Invalid email or password");
            return res.redirect("/error");
        }
    } catch (error) {
        // Handle any errors during login
        console.log(error);
        return res.redirect("/error");
    }
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


// Start the server and listen on the specified port
app.listen(port, () => {
    console.log(`Server is running http://localhost:${port}`);
});
