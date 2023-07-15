const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');

// Display the booking form
router.get('/new', (req, res) => {
    res.render('new');
});

// Handle the booking form submission
router.post('/bookings', async (req, res) => {
    const { startTime, endTime } = req.body;
    const user = req.user; // assuming you have implemented user authentication

    try {
        const conflictingBooking = await Booking.findOne({
            startTime: { $lte: endTime },
            endTime: { $gte: startTime },
            status: 'Approved',
        });

        if (conflictingBooking) {
            res.render('/new', {
                error: 'The selected time slot is already booked.',
            });
        } else {
            const newBooking = new Booking({
                user: user._id,
                startTime,
                endTime,
            });
            await newBooking.save();
            res.redirect('/bookings');
        }
    } catch (error) {
        console.error('Error creating booking', error);
        res.redirect('/new');
    }
});

module.exports = router;
