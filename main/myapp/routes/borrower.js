var library = require('./library.js');
var mongoose = require('mongoose');
var Borrows = mongoose.model('Borrows');

var express = require('express');
var router = express.Router();

// U can try this by /borrower
router.get('/', library.newMsgChecker, function(req, res) {
	var auRst = null;
	if (req.isAuthenticated()) {
		auRst = req.user.Username;
	}

	//get data from database and process them here

	//pass what u get from database and send them into ejs in this line
	res.render('ejsExample', {
		newlrmNum: req.newlrmNumber,
		newlsmNum: req.newlsmNumber,
		userName: auRst
	});
});

// this is the basic type when page no need to ensure authenticated. U can try this by /borrower/borrowerExample
router.get('/borrowPage', library.ensureAuthenticated, library.newMsgChecker, function(req, res) {
	var auRst = null;
	if (req.isAuthenticated()) {
		auRst = req.user.Username;
	}

	//console.log(req.user);
	//get data from database and process them here

	//pass what u get from database and send them into ejs in this line
	res.render('borrowPage', {
		newlrmNum: req.newlrmNumber,
		newlsmNum: req.newlsmNumber,
		userName: auRst,
		createdBy: req.user._id
	});
});

// this is the basic type when page need to ensure authenticated. U can try this by /borrower/borrowerExample2
router.get('/checkMatch', library.ensureAuthenticated, library.newMsgChecker, function(req, res) {
	var auRst = null;
	if (req.isAuthenticated()) {
		auRst = req.user.Username;
	}
	//get data from database and process them here

	//pass what u get from database and send them into ejs in this line
	res.render('checkMatch', {
		newlrmNum: req.newlrmNumber,
		newlsmNum: req.newlsmNumber,
		userName: auRst
	});
});

// this is the basic type when page no need to ensure authenticated. U can try this by /borrower/borrowerExample
router.get('/borrowerPanel', library.ensureAuthenticated, library.newMsgChecker, function(req, res) {
	var auRst = null;
	if (req.isAuthenticated()) {
		auRst = req.user.Username;
	}

	//get data from database and process them here

	//pass what u get from database and send them into ejs in this line
	res.render('borrowerPanel', {
		newlrmNum: req.newlrmNumber,
		newlsmNum: req.newlsmNumber,
		userName: auRst
	});
});

// this is the basic type when page no need to ensure authenticated. U can try this by /borrower/borrowerExample
router.get('/borrowerConfirmedMatch', library.ensureAuthenticated, library.newMsgChecker, function(req, res) {
	var auRst = null;
	if (req.isAuthenticated()) {
		auRst = req.user.Username;
	}

	//get data from database and process them here

	//pass what u get from database and send them into ejs in this line
	res.render('borrowerConfirmedMatch', {
		newlrmNum: req.newlrmNumber,
		newlsmNum: req.newlsmNumber,
		userName: auRst
	});
});
module.exports = router;