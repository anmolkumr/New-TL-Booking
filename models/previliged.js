const mongoose = require('mongoose');
const customSchema = new mongoose.Schema({
    emailId: String,
    userType: String
});
const CustomModel = mongoose.model('CustomModel', customSchema);

module.exports = CustomModel;