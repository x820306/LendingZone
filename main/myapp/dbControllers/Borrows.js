var mongoose = require('mongoose');
var Borrows  = mongoose.model('Borrows');
var sanitizer = require('sanitizer');

var express = require('express');
var router = express.Router();

router.post('/create', function(req, res, next) {
	var toCreate = new Borrows(req.body);
	toCreate.MoneyToBorrow=sanitizer.sanitize(req.body.MoneyToBorrow);
	toCreate.MaxInterestRateAccepted=sanitizer.sanitize(req.body.MaxInterestRateAccepted);
	toCreate.MonthPeriodAccepted=sanitizer.sanitize(req.body.MonthPeriodAccepted);
	toCreate.TimeLimit=sanitizer.sanitize(req.body.TimeLimit);
	toCreate.Story=sanitizer.sanitize(req.body.Story);
	toCreate.CreatedBy=sanitizer.sanitize(req.body.CreatedBy);
	
	toCreate.save(function (err,newCreate) {
		if (err){
			console.log(err);
			res.json({error: err.name}, 500);
		}else{
			res.json(newCreate);
		}
	});
});

module.exports = router;
