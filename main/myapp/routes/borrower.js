var library = require('./library.js');
var mongoose = require('mongoose');
var Borrows = mongoose.model('Borrows');
var Users = mongoose.model('Users');
var sanitizer = require('sanitizer');

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
	/*
	res.render('ejsExample', {
		newlrmNum: req.newlrmNumber,
		newlsmNum: req.newlsmNumber,
		userName: auRst
	});*/
	res.redirect('borrowSuccess');

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

router.post('/borrowCreate', library.ensureAuthenticated, library.newMsgChecker, function(req, res) {
	var id = sanitizer.sanitize(req.body.CreatedBy);
	Users.findById(id).exec(function(err, user) {
		if (err) {
			console.log(err);
			res.json({
				error: err.name
			}, 500);
		} else {
			if (!user) {
				res.json({
					error: 'no such user'
				}, 500);
			} else {
				var toCreate = new Borrows();
				toCreate.MoneyToBorrow = sanitizer.sanitize(req.body.MoneyToBorrow);
				toCreate.MaxInterestRateAccepted = sanitizer.sanitize(req.body.MaxInterestRateAccepted);
				toCreate.MonthPeriodAccepted = sanitizer.sanitize(req.body.MonthPeriodAccepted);
				toCreate.TimeLimit = sanitizer.sanitize(req.body.TimeLimit);
				toCreate.Category = sanitizer.sanitize(req.body.Category);
				if (sanitizer.sanitize(req.body.StoryTitle) != '') {
					toCreate.StoryTitle = sanitizer.sanitize(req.body.StoryTitle);
				}
				if (sanitizer.sanitize(req.body.Story) != '') {
					toCreate.Story = sanitizer.sanitize(req.body.Story);
				}
				toCreate.CreatedBy = sanitizer.sanitize(req.body.CreatedBy);
				toCreate.Level = user.Level;

				toCreate.save(function(err, newCreate) {
					if (err) {
						console.log(err);
						res.json({
							error: err.name
						}, 500);
					} else {
						//res.json(newCreate);
						res.redirect('borrowSuccess');
					}
				});
			}
		}
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

// this is the basic type when page no need to ensure authenticated. U can try this by /borrower/borrowerExample
router.get('/borrowSuccess', library.ensureAuthenticated, library.newMsgChecker, function(req, res) {
	var auRst = null;
	if (req.isAuthenticated()) {
		auRst = req.user.Username;
	}

	//get data from database and process them here

	//pass what u get from database and send them into ejs in this line
	res.render('borrowSuccess', {
		newlrmNum: req.newlrmNumber,
		newlsmNum: req.newlsmNumber,
		userName: auRst
	});
});
module.exports = router;