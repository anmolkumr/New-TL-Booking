var express = require("express");
var bodyParser = require("body-parser");
var nodemailer = require('nodemailer');
const moment = require('moment');
require('moment-timezone');
const ejs = require('ejs');


const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://anmol4979199:anmoltest123@test.8oysegr.mongodb.net/TLBooking');
var db = mongoose.connection;

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
    var start = new Date(req.body.utcStartTime);
    var end = new Date(req.body.utcEndTime);
    var status = req.body.status;

    const query = {
        status: 'Approved',
        $or: [
            { startTime: { $lt: end }, endTime: { $gt: start } }, // Existing interval overlaps with new interval
            { startTime: { $gte: start, $lt: end } }, // New interval starts within existing interval
            { endTime: { $gt: start, $lte: end } } // New interval ends within existing interval
        ]
    };
    // console.log(query)

    db.collection('LaserCutting').findOne(query, function(err,result){
        if (err){
            console.log('Error finding conflicting documents:', err)
            return;
        }

        if (result){
            console.log('Conflicting interval found');
            res.send('Conflicting interval found. Please check free Slots at /documents');
        }
        else {
            // No conflicts, insert the document into the collection
            var data = {
                "user": name,
                "startTime": start,
                "endTime": end,
                "status": status
            }
            db.collection('LaserCutting').insertOne(data, function (err, collection) {
                if (err) throw err;
                console.log("Record inserted Successfully");

            });

            var transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'kumaranmol@iitgn.ac.in',
                    pass: 'kopl--==kopl'
                }
            });
           
            const sub = `Confirmed Booking for ${data.user}` ;
            const mailStartTime = moment.utc(data.startTime).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
            const mailEndTime = moment.utc(data.endTime).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
            const txt = `Dear <b>${data.user}</b>,<br><br>We hereby confirm your Laser Cutting Request. The timings are as follwing:<br> From<b> ${mailStartTime} <br> </b>to <b> ${mailEndTime}</b>.<br><br>Best regards,<br>The TL Team`;

            // async..await is not allowed in global scope, must use a wrapper
            async function main() {
                const html = await ejs.renderFile('views/email.ejs', { name, mailStartTime, mailEndTime, });
                // send mail with defined transport object
                const info = await transporter.sendMail({
                    from: '"Laser Cutting Confirmation" <anmol4979199@gmail.com>',
                    to: data.user,
                    subject: sub,
                    html: html
                });

                console.log("Message sent: %s", info.messageId);
              
            }
            main().catch(console.error);
            // var mailOptions = {
            //     from: '"Laser Cutting Confirmatiom" <anmol4979199@gmail.com>',
            //     to: data.user,
            //     subject: sub,
            //     text: txt
            // };

            // await new Promise((resolve, reject) => {
            // transporter.sendMail(mailOptions, function (error, info) {
            //     if (error) {
            //         console.log(error);
            //     } else {
            //         console.log('Email sent: ' + info.response);
            //     }
            // });
            // });
            return res.send('Confirmed!! You will get a mail soon!');
            };
    })



})


app.get('/', function (req, res) {
    res.render('form')
}).listen(3000)

app.get('/new', function(req,res){
    res.render('new')
})
app.get('/mail', function(req,res){
    res.render('email')
})
app.get('/documents', function (req, res) {
    
   db.collection('LaserCutting').find({}).toArray().then((ans) => {
       const convertedDates = ans.map((doc) => {
           const startTime = moment.utc(doc.startTime).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
           const endTime = moment.utc(doc.endTime).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
           return { ...doc, startTime, endTime };
       });

       res.render('documents', { ans: convertedDates })
    });
})


console.log("server listening at port 3000");