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
				toCreate.StoryTitle=sanitizer.sanitize(req.body.StoryTitle);
				toCreate.Story=sanitizer.sanitize(req.body.Story);
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

router.post('/like', ensureAuthenticated, function(req, res, next) {
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

router.post('/unlike', ensureAuthenticated, function(req, res, next) {
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
						res.json({success:true,result:newborrow.LikeNumber});
					})
				}
			}
		}
	});
});

module.exports = router;

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(null); }
	res.render('login',{userName:null,msg:'請登入'});
}

//add after ensureAuthenticated to confirm ifAdmin
function ensureAdmin(req, res, next) {
  var objID=mongoose.Types.ObjectId('5555251bb08002f0068fd00f');//管理員ID
  if(req.user._id==objID){ return next(null); }
	res.render('login',{userName:null,msg:'請以管理員身分登入'});
}

function chineseEncodeToURI(string){
	return encodeURIComponent(string);
}
