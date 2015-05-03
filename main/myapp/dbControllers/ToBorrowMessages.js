var mongoose = require('mongoose');
var Borrows  = mongoose.model('Borrows');
var ToBorrowMessages  = mongoose.model('ToBorrowMessages');
var sanitizer = require('sanitizer');

var express = require('express');
var router = express.Router();

router.post('/create', function(req, res, next) {
	var toCreate = new ToBorrowMessages(req.body);
	toCreate.FromBorrowRequest=sanitizer.sanitize(req.body.FromBorrowRequest);
	toCreate.SendTo=sanitizer.sanitize(req.body.SendTo);
	toCreate.CreatedBy=sanitizer.sanitize(req.body.CreatedBy);
	
	toCreate.save(function (err,newCreate) {
		if (err){
			console.log(err);
			res.json({error: err.name}, 500);
		}else{
		
			Borrows.findById(req.body.FromBorrowRequest).exec(function (err, borrow){
				if (err) {
					console.log(err);
					res.json({error: err.name}, 500);
				}else{

					borrow.ToBorrowMessages.push(newCreate._id);

					borrow.save(function (err,updatedborrow){
						if (err) {
							console.log(err);
							res.json({error: err.name}, 500);
						}else{
							res.json(newCreate);
						}
					});
				}
			});
		}
	});
});

module.exports = router;
