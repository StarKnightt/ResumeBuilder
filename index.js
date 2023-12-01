const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const path = require("path")

const app = express();
dotenv.config();

const port = process.env.PORT || 3000;

const username = process.env.MONGODB_USERNAME || "";
const password = process.env.MONGODB_PASSWORD || "";
const dbname = process.env.MONGODB_DBNAME || "";

mongoose.connect(`mongodb+srv://${username}:${password}@cluster0.j4relx6.mongodb.net/${dbname}`);

// registration schema
const registrationSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String
});

// model of registration schema
const Registration = mongoose.model("Registration", registrationSchema);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// Middlelware for serving static files
app.use(express.static(path.join(__dirname, 'public')));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.get("/registerPage", (req, res) => {
    res.sendFile(__dirname + "/pages/index.html");
});

app.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await Registration.findOne({ email });

        // Checking for existing user
        if (!existingUser) {
            const registrationData = new Registration({
                name,
                email,
                password
            });
            await registrationData.save();
            return res.redirect("/success");
        } else {
            console.log("User already exists");
            return res.redirect("/error");
        }
    } catch (error) {
        console.log(error);
        return res.redirect("/error");
    }
});

app.get("/success", (req, res) => {
    res.sendFile(__dirname + "/pages/success.html");
});

app.get("/resume", (req, res) => {
    res.sendFile(__dirname + "/resume.html");
});

app.get("/error", (req, res) => {
    res.sendFile(__dirname + "/pages/error.html");
});

app.get("/all-styles", (req, res) => {
    res.sendFile(__dirname + "/public/css/main.css");
});

app.listen(port, () => {
    console.log(`Server is running http://localhost:${port}`);
});
