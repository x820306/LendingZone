var mongoose = require('mongoose');
var Discussions  = mongoose.model('Discussions');
var Borrows  = mongoose.model('Borrows');
var Users  = mongoose.model('Users');
var sanitizer = require('sanitizer');

var express = require('express');
var router = express.Router();

router.post('/createTest', function(req, res, next) {
	var toCreate = new Discussions();
	toCreate.Content=sanitizer.sanitize(req.body.Content);
	toCreate.BelongTo=sanitizer.sanitize(req.body.BelongTo);
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

router.post('/create',ensureAuthenticated, function(req, res, next) {
	var toCreate = new Discussions();
	toCreate.Content=sanitizer.sanitize(req.body.Content);
	toCreate.BelongTo=sanitizer.sanitize(req.body.BelongTo);
	toCreate.CreatedBy=req.user._id;
	
	toCreate.save(function (err,newCreate) {
		if (err){
			console.log(err);
			res.json({error: "Creating failed.",success:false}, 500);
		}else{
			Borrows.findById(newCreate.BelongTo).exec(function (err, borrow){
				if (err) {
					console.log(err);
					res.json({error: "Borrow finding failed.",success:false}, 500);
				}else{
					borrow.Discussion.push(newCreate._id);
					borrow.Updated=Date.now();
					borrow.save(function (err,borrowUpdated) {
						if (err){
							console.log(err);
							res.json({error: "Borrow saving failed.",success:false}, 500);
						}else{
							var options = {
								path: 'Discussion',
								model: Discussions
							};
							Borrows.populate(borrowUpdated, options, function(err, borrowUpdated) {
								if(err){
									console.log(err);
									res.json({error: "1st Population failed.",success:false}, 500);
								}else{
									var options2 = {
										path: 'Discussion.CreatedBy',
										model: Users,
										select: 'Username'
									};
									Discussions.populate(borrowUpdated, options2, function(err, borrowUpdated) {
										if(err){
											console.log(err);
											res.json({error: "2nd Population failed.",success:false}, 500);
										}else{
											console.log(borrowUpdated);
											res.json({success:true,result:borrowUpdated.Discussion});
										}
									});
								}
							});
						}
					});
				}
			});
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
