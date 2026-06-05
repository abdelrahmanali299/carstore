const express = require('express');
const router = express.Router();
// Listings route is an alias to cars for sell-car flow
// Delegates to car routes
const carRoutes = require('./car.routes');
router.use('/', carRoutes);
module.exports = router;
