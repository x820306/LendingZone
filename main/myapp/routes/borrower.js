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
	res.redirect('/borrower/borrowSuccess');
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
		userName: auRst
	});
});

router.post('/borrowCreate', library.ensureAuthenticated, function(req, res) {
	var nowMoney=parseInt(sanitizer.sanitize(req.body.MoneyToBorrow.trim()));
	var rate=parseFloat(sanitizer.sanitize(req.body.MaxInterestRateAccepted.trim()))/100;
	var month=parseInt(sanitizer.sanitize(req.body.MonthPeriodAccepted.trim()));
	if((sanitizer.sanitize(req.body.MoneyToBorrow.trim())=='')||(sanitizer.sanitize(req.body.MaxInterestRateAccepted.trim())=='')||(sanitizer.sanitize(req.body.MonthPeriodAccepted.trim())=='')){
		res.redirect('/message?content='+encodeURIComponent('必要參數未填!'));
	}else if((isNaN(month))||(isNaN(nowMoney))||(isNaN(rate))){
		res.redirect('/message?content='+encodeURIComponent('非數字參數!'));
	}else if((month<1)||(month>36)||(nowMoney<5000)||(nowMoney>150000)||(rate<0.0001)||(rate>0.99)){
		res.redirect('/message?content='+encodeURIComponent('錯誤參數!'));
	}else{
		var toCreate = new Borrows();
		toCreate.MoneyToBorrow = parseInt(sanitizer.sanitize(req.body.MoneyToBorrow.trim()));
		toCreate.MaxInterestRateAccepted = parseFloat(sanitizer.sanitize(req.body.MaxInterestRateAccepted.trim()))/100;
		toCreate.MonthPeriodAccepted = parseInt(sanitizer.sanitize(req.body.MonthPeriodAccepted.trim()));
		if(sanitizer.sanitize(req.body.TimeLimit.trim())!=''){
			toCreate.TimeLimit = sanitizer.sanitize(req.body.TimeLimit.trim());
		}else{
			var tempDate=new Date();
			tempDate.setTime(tempDate.getTime()+1000*60*60*24*3);
			toCreate.TimeLimit = tempDate;
		}
		toCreate.Category = sanitizer.sanitize(req.body.Category.trim());
		if (sanitizer.sanitize(req.body.StoryTitle.trim()) != '') {
			toCreate.StoryTitle = sanitizer.sanitize(req.body.StoryTitle.trim());
		}
		if (sanitizer.sanitize(req.body.Story.trim()) != '') {
			toCreate.Story = sanitizer.sanitize(req.body.Story.trim());
		}
		toCreate.CreatedBy =req.user._id;
		toCreate.Level = req.user.Level;

		toCreate.save(function(err, newCreate) {
			if (err) {
				res.redirect('/message?content='+encodeURIComponent('新建失敗!'));
			} else {
				res.redirect('/borrower/borrowSuccess');
			}
		});
	}
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