var express = require("express");
var bodyParser = require("body-parser");
var nodemailer = require('nodemailer');

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
    var name = req.body.name;
    var start = new Date(req.body.start);
    var end = new Date(req.body.end);
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
            const txt = `Dear ${data.user},\n\nYour Booking is from (${data.startTime}) to (${data.endTime}).\n\nBest regards,\nThe TL Team`;
            var mailOptions = {
                from: '"Laser Cutting Confirmatiom" <anmol4979199@gmail.com>',
                to: data.user,
                subject: sub,
                text: txt
            };

            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    console.log(error);
                } else {
                    console.log('Email sent: ' + info.response);
                }
            });
            return res.redirect('/views/form.ejs');
            };
    })



})


app.get('/', function (req, res) {
    res.render('form')
}).listen(3000)


app.get('/documents', function (req, res) {
    
   db.collection('LaserCutting').find({}).toArray().then((ans) => {
       res.render('documents',{ ans: ans})
    });
})


console.log("server listening at port 3000");