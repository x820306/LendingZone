var library=require( './library.js' );
var mongoose = require('mongoose');
var Borrows  = mongoose.model('Borrows');
var Users  = mongoose.model('Users');
var sanitizer = require('sanitizer');

var express = require('express');
var router = express.Router();

//for test, u have to write one like this to achieve what u want.
router.post('/create', function(req, res, next) {
	var id=sanitizer.sanitize(req.body.CreatedBy);
	
	Users.findById(id).exec(function (err, user){
		if (err) {
			console.log(err);
			res.json({error: err.name}, 500);
		}else{
			if(!user){
				res.json({error: 'no such user'}, 500);
			}else{
				var toCreate = new Borrows();
				toCreate.MoneyToBorrow=sanitizer.sanitize(req.body.MoneyToBorrow);
				toCreate.MaxInterestRateAccepted=sanitizer.sanitize(req.body.MaxInterestRateAccepted);
				toCreate.MonthPeriodAccepted=sanitizer.sanitize(req.body.MonthPeriodAccepted);
				toCreate.TimeLimit=sanitizer.sanitize(req.body.TimeLimit);
				toCreate.Category=sanitizer.sanitize(req.body.Category);
				if(sanitizer.sanitize(req.body.StoryTitle)!=''){
					toCreate.StoryTitle=sanitizer.sanitize(req.body.StoryTitle);
				}
				if(sanitizer.sanitize(req.body.Story)!=''){
					toCreate.Story=sanitizer.sanitize(req.body.Story);
				}
				toCreate.CreatedBy=sanitizer.sanitize(req.body.CreatedBy);
				toCreate.Level=user.Level;
				
				toCreate.save(function (err,newCreate) {
					if (err){
						console.log(err);
						res.json({error: err.name}, 500);
					}else{
						res.json(newCreate);
					}
				});
			}
		}
	});
});

router.post('/like', library.ensureAuthenticated, function(req, res, next) {
	Borrows.findById(sanitizer.sanitize(req.body._id)).exec(function (err, borrow){
		if (err) {
			console.log(err);
			res.json({error: "something wrong",success:false}, 500);
		}else{
			if(!borrow){
				res.json({error: "ID not found",success:false}, 500);
			}else{
				var i = 0;
				var flag = 0;
				for (i = 0; i < borrow.Likes.length; i++) {
					if (borrow.Likes[i].toString() === req.user._id.toString()) {
						flag = 1;
						break;
					}
				}
				if (flag === 1) {
					res.json({error: "already liked",success:false}, 500);
				}else{
					borrow.Likes.push(req.user._id);
					borrow.LikeNumber ++ ;
					borrow.Updated=Date.now();
					borrow.save(function (err, newborrow){
						if (err) {
							console.log(err);
							res.json({error: err.name,success:false},500);
						}
						res.json({success:true,result:newborrow.LikeNumber});
					})
				}
			}
		}
	});
});

router.post('/unlike', library.ensureAuthenticated, function(req, res, next) {
	Borrows.findById(sanitizer.sanitize(req.body._id)).exec(function (err, borrow){
		if (err) {
			console.log(err);
			res.json({error: "something wrong",success:false}, 500);
		}else{
			if(!borrow){
				res.json({error: "ID not found",success:false}, 500);
			}else{
				var i = 0;
				var flag = 0;
				for (i = 0; i < borrow.Likes.length; i++) {
					if (borrow.Likes[i].toString() === req.user._id.toString()) {
						flag = 1;
						break;
					}
				}
				if (flag === 0) {
					res.json({error: "haven't liked",success:false}, 500);
				}else{
					borrow.Likes.splice(i, 1);;
					borrow.LikeNumber -- ;
					borrow.Updated=Date.now();
					borrow.save(function (err, newborrow){
						if (err) {
							console.log(err);
							res.json({error: err.name,success:false},500);
						}
						res.json({success:true,result:newborrow.LikeNumber});
					})
				}
			}
		}
	});
});

router.post('/iflike', function(req, res, next) {
	Borrows.findById(sanitizer.sanitize(req.body._id)).exec(function (err, borrow){
		if (err) {
			console.log(err);
			res.json({error: "something wrong",success:false}, 500);
		}else{
			if(!borrow){
				res.json({error: "ID not found",success:false}, 500);
			}else{
				if (!req.isAuthenticated()){ 
					res.json({success:true,result:borrow.LikeNumber,status:-1,date:borrow.Updated});
				}else{
					var i = 0;
					var flag = 0;
					for (i = 0; i < borrow.Likes.length; i++) {
						if (borrow.Likes[i].toString() === req.user._id.toString()) {
							flag = 1;
							break;
						}
					}
					if(borrow.CreatedBy==req.user._id){
						flag = 2;
					}
					res.json({success:true,result:borrow.LikeNumber,status:flag,date:borrow.Updated});
				}
			}
		}
	});
});

module.exports = router;
