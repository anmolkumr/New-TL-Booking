var express = require("express");
var bodyParser = require("body-parser");
var nodemailer = require('nodemailer');
const moment = require('moment');
require('moment-timezone');
const ejs = require('ejs');
const { google } = require('googleapis')

const clientId = '924859429110-9m81uoae5co4g2qpuvb74h7fnp74od2j.apps.googleusercontent.com';
const clientSecret = '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';
const redirectURI = 'https://developers.google.com/oauthplayground';
const refreshToken = '1//04XiS2M6bBb5BCgYIARAAGAQSNwF-L9IrvjZIbupyH5PmvjbFbovk5kXBDLihLwf19P1GkV5mMmOVmw8tgjK3VEt4Auzbiv_qhgw';

const OAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectURI);
OAuth2Client.setCredentials({ refresh_token: refreshToken })

const mongoose = require('mongoose');
const Booking = require('./models/model.js');
var ObjectId = require('mongodb').ObjectId;

mongoose.connect('mongodb+srv://anmol4979199:anmoltest123@test.8oysegr.mongodb.net/TLBooking', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// mongoose.connect('mongodb://localhost:27017/TLBooking', {
// useNewUrlParser: true,
//     useUnifiedTopology: true,
// });
var db = mongoose.connection;
const LaserCutting = require('./models/model');

db.on('error', console.log.bind(console, "connection error"));
db.once('open', function (callback) {
    console.log("connection succeeded");
})

var app = express()
app.set('view engine', 'ejs');


app.use(bodyParser.json());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({
    extended: true
}));

app.post('/sign_up', function (req, res) {
    var name = req.body.user;
    var email = req.body.email;
    var mobile = req.body.contact;
    var start = new Date(req.body.utcStartTime);
    var end = new Date(req.body.utcEndTime);
    var desc = req.body.info;
    var status = req.body.status;

    const query =

    {
        status: 'Approved',
        $or: [
            { startTime: { $lt: end }, endTime: { $gt: start } }, // Existing interval overlaps with new interval
            { startTime: { $gte: start, $lt: end } }, // New interval starts within existing interval
            { endTime: { $gt: start, $lte: end } } // New interval ends within existing interval
        ]
    };

    db.collection('LaserCutting').findOne(query, function (err, result) {
        if (err) {
            console.log('Error finding conflicting documents:', err)
            return;
        }

        if (result) {
            console.log('Conflicting interval found');
            res.send('Conflicting interval found. Please check Calender');
        }
        else {
            // No conflicts, insert the document into the collection
            var data = {
                "user": name,
                "email": email,
                "phone": mobile,
                "startTime": start,
                "endTime": end,
                "description": desc,
                "status": status
            }
            db.collection('LaserCutting').insertOne(data, function (err, collection) {
                if (err) throw err;
                console.log("Record inserted Successfully");

            });

            return res.send('Booking Completed!');
        };
    })



})


app.get('/', function (req, res) {
    res.render('form')
}).listen(3000)

app.post('/send-email', function (req, res) {
    console.log(req.body);
    const { id, to, start, end, status } = req.body;
    const sub = `Confirmed Booking for ${to}`;
    const mailStartTime = moment(start).format('YYYY-MM-DD hh:mm A');
    const mailEndTime = moment(end).format('YYYY-MM-DD hh:mm A');
    // const txt = `Dear <b>${data.user}</b>,<br><br>We hereby confirm your Laser Cutting Request. The timings are as follwing:<br> From<b> ${mailStartTime} <br> </b>to <b> ${mailEndTime}</b>.<br><br>Best regards,<br>The TL Team`;

    if (!to) {
        return res.status(400).json({ error: 'Missing required fields' });
    }


    // async..await is not allowed in global scope, must use a wrapper
    async function main() {
        const html = await ejs.renderFile('views/email.ejs', { to, mailStartTime, mailEndTime, });
        const accessToken = await OAuth2Client.getAccessToken()
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: 'kumaranmol@iitgn.ac.in',
                clientId: clientId,
                clientSecret: clientSecret,
                refreshToken: refreshToken,
                accessToken: accessToken
            }
        });

        const info = await transporter.sendMail({
            from: '"Laser Cutting Confirmation" <anmol4979199@gmail.com>',
            to: to,
            subject: sub,
            html: html
        });
        console.log("Message sent: %s", info.messageId);
        try {
            console.log(id);
            console.log(status);
            var o_id = new ObjectId(id);
            const result = await db.collection('LaserCutting').updateOne({ _id: o_id }, { $set: { "status": status } });
            console.log('Updated:', result);
        } catch (error) {
            console.log('Updating Error', error);
        }

        res.send({ message: 'MAil Sent' })


    }
    main().catch(console.error);


});

app.get('/new', function (req, res) {
    res.render('new')
});
app.get('/mail', function (req, res) {
    res.render('email')
})
app.get('/calender', function (req, res) {
    res.render('calender')
})
// app.get('/documents', function (req, res) {

//    db.collection('LaserCutting').find({}).toArray().then((ans) => {
//        const convertedDates = ans.map((doc) => {
//            const startTime = moment.utc(doc.startTime).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
//            const endTime = moment.utc(doc.endTime).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
//            return { ...doc, startTime, endTime };
//        });

//        res.render('documents', { ans: convertedDates })
//     });
// })

app.get('/documents', function (req, res) {
    Booking.find({}).then((ans) => {
        const convertedDates = ans.map((doc) => {
            const startTime = moment.utc(doc.startTime).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
            const endTime = moment.utc(doc.endTime).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
            return { ...doc.toObject(), startTime, endTime };
        });

        res.render('documents', { ans: convertedDates });
    }).catch((err) => {
        console.error('Error retrieving data:', err);
        res.status(500).send('Error retrieving data');
    });
});
app.get('/admin', function (req, res) {
    res.render('admin', { title: 'Admin Panel Tinkerers, IITGN' })
})

app.get('/manage', function (req, res) {
    res.render('user-management', { title: 'User Management | Admin Panel Tinkerers, IITGN' })
})
app.get('/all', function (req, res) {
    Booking.find({}).then((ans) => {
        const convertedDates = ans.map((doc) => {
            const id = doc._id;
            const title = doc.user;
            const start = moment.utc(doc.startTime).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
            const end = moment.utc(doc.endTime).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
            return { id, title, start, end };
        });

        res.json(convertedDates);
    });
})


console.log("server listening at port 3000");