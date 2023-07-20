const mongoose = require('mongoose');

const laserCuttingSchema = new mongoose.Schema({
    user: String,
    email: String,
    phone: String,
    startTime: Date,
    endTime: Date,
    description: String,
    status: String,
});

const LaserCutting = mongoose.model('LaserCutting', laserCuttingSchema, 'LaserCutting');

module.exports = LaserCutting;
