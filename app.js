require('dotenv').config();
var express = require("express");
var bodyParser = require("body-parser");
var nodemailer = require("nodemailer");
const moment = require("moment");
require("moment-timezone");
const ejs = require("ejs");
const { google } = require("googleapis");
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const User = require('./models/user');


const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectURI = process.env.REDIRECT_URI;
const refreshToken = process.env.REFRESH_TOKEN
const OAuth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectURI
);
OAuth2Client.setCredentials({ refresh_token: refreshToken });

const { OAuth2Client: AuthLibraryOAuth2Client } = require('google-auth-library');
const authLibraryClient = new AuthLibraryOAuth2Client();

const mongoose = require("mongoose");
const Booking = require("./models/model.js");
var ObjectId = require("mongodb").ObjectId;

//Production DB
mongoose.connect(
    process.env.MONGODB_URL,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }
);
// For Local Testing
// mongoose.connect(process.env.MONGODB_URL_LOCAL, {
// useNewUrlParser: true,
//     useUnifiedTopology: true,
// });

var db = mongoose.connection;
// const LaserCutting = require("./models/model");

db.on("error", console.log.bind(console, "connection error"));
db.once("open", function (callback) {
    console.log("connection succeeded");
});
//App Declaration
var app = express();
app.set("view engine", "ejs");

app.use(bodyParser.json());
app.use(express.static("public"));
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

//Routes
app.post("/proceed_form", function (req, res) {
    var name = req.body.user;
    var email = req.body.email;
    var mobile = req.body.contact;
    var machine = req.body.machine;
    var start = new Date(req.body.utcStartTime);
    var end = new Date(req.body.utcEndTime);
    var desc = req.body.info;
    var status = req.body.status;

    const query = {
        status: "Approved",
        $or: [
            { startTime: { $lt: end }, endTime: { $gt: start } }, // Existing interval overlaps with new interval
            { startTime: { $gte: start, $lt: end } }, // starts within existing interval
            { endTime: { $gt: start, $lte: end } }, // ends within existing interval
        ],
    };

    db.collection(process.env.MONGODB_COLLECTION_NAME).findOne(query, function (err, result) {
        if (err) {
            console.log("Error finding conflicting documents:", err);
            return;
        }

        if (result) {
            console.log("Conflicting interval found");
            res.send("Conflicting interval found. Please check Calender");
        } else {
            // No conflicts, Go for it!!
            var data = {
                user: name,
                email: email,
                phone: mobile,
                machine: machine,
                startTime: start,
                endTime: end,
                description: desc,
                status: status,
            };
            db.collection(process.env.MONGODB_COLLECTION_NAME).insertOne(data, function (err, collection) {
                if (err) throw err;
                console.log("Record inserted Successfully");
            });

            return res.send("Booking Completed!");
        }
    });
});

app.get('/logout', (req, res) => {
    res.clearCookie('session-token');
    res.redirect('/')

})
app.get('/booking_withoutLogin', (req, res) => {

    res.render('booking_withoutLogin')

})

app.get("/", checkAuthenticated, function (req, res) {
    const formData = {
        machine: req.query.machine || ''
    };
    if (req.user) {

        res.render("form", { loggedIn: true, email: req.user.email, name: req.user.name, machine: formData.machine });
    } else {

        res.render("form", { loggedIn: false });
    }

}).listen(3000);

// Mailing Part
app.post("/send-email", function (req, res) {
    console.log(req.body);
    const { id, to, cname, machine, start, end, status } = req.body;
    const sub = `Confirmed Booking for ${to}`;
    const mailStartTime = moment(start).format("YYYY-MM-DD hh:mm A");
    const mailEndTime = moment(end).format("YYYY-MM-DD hh:mm A");

    if (!to) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    async function main() {
        const html = await ejs.renderFile("views/email.ejs", {
            cname,
            machine,
            mailStartTime,
            mailEndTime,
        });
        const accessToken = await OAuth2Client.getAccessToken();
        var transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: "kumaranmol@iitgn.ac.in",
                clientId: clientId,
                clientSecret: clientSecret,
                refreshToken: refreshToken,
                accessToken: accessToken,
            },
        });

        const info = await transporter.sendMail({
            from: '"Tinkerers Lab Confirmation" <anmol4979199@gmail.com>',
            to: to,
            subject: sub,
            html: html,
        });
        console.log("Message sent: %s", info.messageId);
        try {
            console.log(id);
            console.log(status);
            var o_id = new ObjectId(id);
            const result = await db
                .collection(process.env.MONGODB_COLLECTION_NAME)
                .updateOne({ _id: o_id }, { $set: { status: status } });
            console.log("Updated:", result);
        } catch (error) {
            console.log("Updating Error", error);
        }

        res.send({ message: "MAil Sent" });
    }
    main().catch(console.error);
});

app.get('/admin-login', function(req, res){
    res.render('admin-login');
})

app.get("/new", checkAuthenticated, function (req, res) {
    if (req.user) {
        // console.log("Logged in");
        // console.log(req.user.emails[0].value);
        res.render("new", { loggedIn: true, email: req.user.email });
    } else {
        // console.log("Not logged in");
        res.render("new", { loggedIn: false });
    }
});

app.get("/mail", function (req, res) {
    res.render("email");
});
app.get("/calender", function (req, res) {
    res.render("calender");
});


app.post("/", (req, res) => {
    let token = req.body.credential;
    console.log(token);
    async function verify() {
        const ticket = await authLibraryClient.verifyIdToken({ // IMP Use the authLibraryClient here
            idToken: token,
            audience: '924859429110-4seosoqea4p90m82af8vr32jlltua24k.apps.googleusercontent.com',
        });
        const payload = ticket.getPayload();
        const userid = payload['sub'];
        console.log(payload);
    }
    verify().then(() => {
        res.cookie('session-token', token);
        res.redirect('/');
    }).catch(console.error);
});

app.get("/documents", verifylogin,function (req, res) {
    Booking.find({}).sort({ $natural: -1 })
        .then((ans) => {
            const convertedDates = ans.map((doc) => {
                const startTime = moment
                    .utc(doc.startTime)
                    .tz("Asia/Kolkata")
                    .format("YYYY-MM-DD HH:mm:ss");
                const endTime = moment
                    .utc(doc.endTime)
                    .tz("Asia/Kolkata")
                    .format("YYYY-MM-DD HH:mm:ss");
                return { ...doc.toObject(), startTime, endTime };
            });

            res.render("documents", { ans: convertedDates }); //Send back UTC to +5:30GMT to ALL Bookings
        })
        .catch((err) => {
            console.error("Error retrieving data:", err);
            res.status(500).send("Error retrieving data");
        });
});
app.get("/admin", verifylogin, function (req, res) {
    res.render("admin", { title: "Admin Panel Tinkerers, IITGN" });
});

app.get("/manage", verifylogin,  function (req, res) {
    res.render("user-management", {
        title: "User Management | Admin Panel Tinkerers, IITGN",
    });
});
//API for Calender
app.get("/all", function (req, res) {
    Booking.find({}).then((ans) => {
        const convertedDates = ans.map((doc) => {
            const id = doc._id;
            let title = doc.user;
            let titleHTML = doc.machine;
            console.log(titleHTML);
            //title = title + " - " + machine;
            //making case statements for machines
            let backgroundColor = "#ffffff";
            switch (titleHTML) {
                case "3D Printer":
                    titleHTML = `Booked For <div><span class="badge badge-pill badge-primary">${titleHTML}</span><br> By <span class="badge badge-pill badge-primary">${title}</span></div>`;
                    backgroundColor = "#007bff";
                    break;
                case "Roland Vinyl Cutter":
                    titleHTML = `Booked For <div><span class="badge badge-pill badge-success">${titleHTML}</span><br> By <span class="badge badge-pill badge-success">${title}</span></div>`;
                    backgroundColor = "#28a745";
                    break;
                case "GCC Laser Cutting":
                    titleHTML = `Booked For <div><span class="badge badge-pill badge-danger">${titleHTML}</span><br> By <span class="badge badge-pill badge-danger">${title}</span></div>`;
                    backgroundColor = "#dc3545";
                    break;
                default:
                    titleHTML = `Booked For <div><span class="badge badge-pill badge-warning">${titleHTML}</span><br> By <span class="badge badge-pill badge-warning">${title}</span></div>`;
                    backgroundColor = "#ffc107";
            }
            const start = moment
                .utc(doc.startTime)
                .tz("Asia/Kolkata")
                .format("YYYY-MM-DD HH:mm:ss");
            const end = moment
                .utc(doc.endTime)
                .tz("Asia/Kolkata")
                .format("YYYY-MM-DD HH:mm:ss");
            return { id, titleHTML, backgroundColor, start, end };
        });

        res.json(convertedDates);
    });
});
//Login Verification
function checkAuthenticated(req, res, next) {

    let token = req.cookies['session-token'];

    let user = {};
    async function verify() {
        const ticket = await authLibraryClient.verifyIdToken({ // Use the authLibraryClient here
            idToken: token,
            audience: '924859429110-4seosoqea4p90m82af8vr32jlltua24k.apps.googleusercontent.com',
        });
        const payload = ticket.getPayload();
        user.name = payload.name;
        user.email = payload.email;
        user.picture = payload.picture;
    }
    verify()
        .then(() => {
            req.user = user;
            next();
        })
        .catch(err => {
            res.redirect('/booking_withoutLogin')
        })

}

//Admin Login Signup

app.post('/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = new User({ email, password });
        await user.save();
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

const JWT_SECRET = 'vvuh9uhyigphwcbwud82ti';
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Authentication failed' });
        }
        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: 'Authentication failed' });
        }
        const logintoken = jwt.sign({ userId: user._id }, JWT_SECRET);
        res.cookie('login-token', logintoken)
        res.json({ message: 'Login successful' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/admin-logout', function(res,req){
    res.clearCookie('login-token');
    res.redirect('admin-login')
})

app.get('/admin-dashboard', function (res, req) {
    res.redirect('dashboard')
})
function verifylogin(req, res, next){
    let logintoken = req.cookies['login-token'];

    if (logintoken) {
        next();
        
    } else {
        res.redirect('admin-login')
        
    }

}
console.log("server listening at port 3000");
