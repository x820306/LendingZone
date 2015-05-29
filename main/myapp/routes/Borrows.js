var library=require( './library.js' );
var mongoose = require('mongoose');
var Borrows  = mongoose.model('Borrows');
var Users  = mongoose.model('Users');
var sanitizer = require('sanitizer');

var express = require('express');
var router = express.Router();

//for test, u have to write one like this to achieve what u want.
router.post('/createTest', function(req, res, next) {
	var id=sanitizer.sanitize(req.body.CreatedBy.trim());
	
	Users.findById(id).exec(function (err, user){
		if (err) {
			console.log(err);
			res.json({error: err.name}, 500);
		}else{
			if(!user){
				res.json({error: 'no such user'}, 500);
			}else{
				var toCreate = new Borrows();
				toCreate.MoneyToBorrow=sanitizer.sanitize(req.body.MoneyToBorrow.trim());
				toCreate.MaxInterestRateAccepted=sanitizer.sanitize(req.body.MaxInterestRateAccepted.trim());
				toCreate.MonthPeriodAccepted=sanitizer.sanitize(req.body.MonthPeriodAccepted.trim());
				toCreate.TimeLimit=sanitizer.sanitize(req.body.TimeLimit.trim());
				toCreate.Category=sanitizer.sanitize(req.body.Category.trim());
				if(sanitizer.sanitize(req.body.StoryTitle.trim())!=''){
					toCreate.StoryTitle=sanitizer.sanitize(req.body.StoryTitle.trim());
				}
				if(sanitizer.sanitize(req.body.Story.trim())!=''){
					toCreate.Story=sanitizer.sanitize(req.body.Story.trim());
				}
				toCreate.CreatedBy=sanitizer.sanitize(req.body.CreatedBy.trim());
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
	Borrows.findById(req.body._id).exec(function (err, borrow){
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
						res.json({success:true,result:newborrow.LikeNumber,date:newborrow.Updated});
					})
				}
			}
		}
	});
});

router.post('/readable', library.ensureAuthenticated, function(req, res, next) {
	Borrows.findById(req.body.borrowID).exec(function (err, borrow){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			if(!borrow){
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}else{
				if(borrow.CreatedBy!=req.user._id){
					res.redirect('/message?content='+encodeURIComponent('認證錯誤!'));
				}else{
					borrow.IfReadable=false;
					borrow.Updated=Date.now();
					borrow.save(function (err,updatedBorrow) {
						if (err){
							res.redirect('/message?content='+encodeURIComponent('錯誤!'));
						}else{
							res.redirect('/lender/story?id='+req.body.borrowID);
						}
					});
				}
			}
		}
	});
});

router.post('/unlike', library.ensureAuthenticated, function(req, res, next) {
	Borrows.findById(req.body._id).exec(function (err, borrow){
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
						res.json({success:true,result:newborrow.LikeNumber,date:newborrow.Updated});
					})
				}
			}
		}
	});
});

router.post('/iflike', function(req, res, next) {
	Borrows.findById(req.body._id).exec(function (err, borrow){
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
