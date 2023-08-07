const express = require('express');
const path = require("path");
const ejs = require('ejs');
const cookieParser = require('cookie-parser');
const bodyParser = require("body-parser");
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client();

app.post("/", (req, res) => {
    let token = req.body.credential;
    console.log(token);
    async function verify() {
        const ticket = await client.verifyIdToken({
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