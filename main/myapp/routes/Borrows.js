var library=require( './library.js' );
var mongoose = require('mongoose');
var Borrows  = mongoose.model('Borrows');
var Users  = mongoose.model('Users');
var sanitizer = require('sanitizer');

var express = require('express');
var router = express.Router();

//for test, u have to write one like this to achieve what u want.
router.post('/createTest', function(req, res, next) {
	if((typeof(req.body.CreatedBy) === 'string')&&(typeof(req.body.MoneyToBorrow) === 'string')&&(typeof(req.body.MaxInterestRateAccepted) === 'string')&&(typeof(req.body.MonthPeriodAccepted) === 'string')&&(typeof(req.body.TimeLimit) === 'string')&&(typeof(req.body.Category) === 'string')&&(typeof(req.body.StoryTitle) === 'string')&&(typeof(req.body.Story) === 'string')){
		req.body.CreatedBy=sanitizer.sanitize(req.body.CreatedBy.trim());
		req.body.MoneyToBorrow=sanitizer.sanitize(req.body.MoneyToBorrow.trim());
		req.body.MaxInterestRateAccepted=sanitizer.sanitize(req.body.MaxInterestRateAccepted.trim());
		req.body.MonthPeriodAccepted=sanitizer.sanitize(req.body.MonthPeriodAccepted.trim());
		req.body.TimeLimit=sanitizer.sanitize(req.body.TimeLimit.trim());
		req.body.Category=sanitizer.sanitize(req.body.Category.trim());
		req.body.StoryTitle=sanitizer.sanitize(req.body.StoryTitle.trim());
		req.body.Story=sanitizer.sanitize(req.body.Story.trim());
		
		Users.findById(req.body.CreatedBy).exec(function (err, user){
			if (err) {
				console.log(err);
				res.json({error: err.name}, 500);
			}else{
				if(!user){
					res.json({error: 'no such user'}, 500);
				}else{
					var toCreate = new Borrows();
					toCreate.MoneyToBorrow=req.body.MoneyToBorrow;
					toCreate.MaxInterestRateAccepted=req.body.MaxInterestRateAccepted;
					toCreate.MonthPeriodAccepted=req.body.MonthPeriodAccepted;
					toCreate.TimeLimit=req.body.TimeLimit;
					toCreate.Category=req.body.Category;
					if(req.body.StoryTitle!==''){
						toCreate.StoryTitle=req.body.StoryTitle;
					}
					if(req.body.Story!==''){
						toCreate.Story=req.body.Story;
					}
					toCreate.CreatedBy=req.body.CreatedBy;
					
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
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

//for test
router.post('/destroyTest', function(req, res, next) {
	if(typeof(req.body.BorrowID) === 'string'){
		req.body.BorrowID=sanitizer.sanitize(req.body.BorrowID.trim());
		
		Borrows.findById(req.body.BorrowID).exec(function (err, borrow){
			if (err) {
				console.log(err);
				res.json({error: err.name}, 500);
			}else{
				if(!borrow){
					res.json({error: 'no such borrow'}, 500);
				}else{
					borrow.remove(function (err,removedItem) {
						if (err){
							console.log(err);
							res.json({error: err.name}, 500);
						}else{
							library.userLevelAdderReturn(removedItem.CreatedBy,function(){
								res.json(removedItem);
							},function(){
								res.end('error!');
							});
						}
					});
				}
			}
		});
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/readable',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	if(typeof(req.body.borrowID) === 'string'){
		req.body.borrowID=sanitizer.sanitize(req.body.borrowID.trim());
		
		Borrows.findById(req.body.borrowID).exec(function (err, borrow){
			if (err) {
				console.log(err);
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}else{
				if(!borrow){
					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
				}else{
					if(!borrow.CreatedBy.equals(req.user._id)){
						res.redirect('/message?content='+encodeURIComponent('認證錯誤!'));
					}else{
						borrow.IfReadable=false;
						borrow.Updated=Date.now();
						borrow.save(function (err,updatedBorrow) {
							if (err){
								res.redirect('/message?content='+encodeURIComponent('錯誤!'));
							}else{
								library.rejectMessageWhenNotReadable(res,false,'/lender/story?id='+req.body.borrowID,updatedBorrow._id,req,function(){});
							}
						});
					}
				}
			}
		});
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/like',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	if(typeof(req.body._id) === 'string'){
		req.body._id=sanitizer.sanitize(req.body._id.trim());
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
						if (borrow.Likes[i].equals(req.user._id)) {
							flag = 1;
							break;
						}
					}
					if (flag === 1) {
						res.json({error: "already liked",success:false}, 500);
					}else{
						borrow.Likes.push(req.user._id);
						borrow.Updated=Date.now();
						borrow.save(function (err, newborrow){
							if (err) {
								console.log(err);
								res.json({error: err.name,success:false},500);
							}
							res.json({success:true,result:newborrow.Likes.length,date:newborrow.Updated});
						})
					}
				}
			}
		});
	}else{
		res.json({error: "failed!",success:false}, 500);
	}
});

router.post('/unlike',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	if(typeof(req.body._id) === 'string'){
		req.body._id=sanitizer.sanitize(req.body._id.trim());
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
						if (borrow.Likes[i].equals(req.user._id)) {
							flag = 1;
							break;
						}
					}
					if (flag === 0) {
						res.json({error: "haven't liked",success:false}, 500);
					}else{
						borrow.Likes.splice(i, 1);
						borrow.Updated=Date.now();
						borrow.save(function (err, newborrow){
							if (err) {
								console.log(err);
								res.json({error: err.name,success:false},500);
							}
							res.json({success:true,result:newborrow.Likes.length,date:newborrow.Updated});
						})
					}
				}
			}
		});
	}else{
		res.json({error: "failed!",success:false}, 500);
	}
});

router.post('/iflike', function(req, res, next) {
	if(typeof(req.body._id) === 'string'){
		req.body._id=sanitizer.sanitize(req.body._id.trim());
		Borrows.findById(req.body._id).exec(function (err, borrow){
			if (err) {
				console.log(err);
				res.json({error: "something wrong",success:false}, 500);
			}else{
				if(!borrow){
					res.json({error: "ID not found",success:false}, 500);
				}else{
					if (!req.isAuthenticated()){ 
						res.json({success:true,result:borrow.Likes.length,status:-1,date:borrow.Updated});
					}else{
						var i = 0;
						var flag = 0;
						for (i = 0; i < borrow.Likes.length; i++) {
							if (borrow.Likes[i].equals(req.user._id)) {
								flag = 1;
								break;
							}
						}
						if(borrow.CreatedBy.equals(req.user._id)){
							flag = 2;
						}
						res.json({success:true,result:borrow.Likes.length,status:flag,date:borrow.Updated});
					}
				}
			}
		});
	}else{
		res.json({error: "failed!",success:false}, 500);
	}
});

module.exports = router;
