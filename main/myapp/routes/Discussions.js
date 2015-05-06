var mongoose = require('mongoose');
var Discussions  = mongoose.model('Discussions');
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

router.post('/create', function(req, res, next) {
	var toCreate = new Discussions();
	toCreate.Content=sanitizer.sanitize(req.body.Content);
	toCreate.BelongTo=sanitizer.sanitize(req.body.BelongTo);
	toCreate.CreatedBy=req.user._id;
	
	toCreate.save(function (err,newCreate) {
		if (err){
			console.log(err);
			res.json({error: "Creating failed.",success:false}, 500);
		}else{
			Discussions.find({"BelongTo": req.body.BelongTo}).populate('CreatedBy', 'Username').exec(function (err, discussions){
				if (err) {
					console.log(err);
					res.json({error: "Discussions finding failed.",success:false}, 500);
				}else{
					res.json({success:true,result:discussions});
				}
			});
		}
	});
});

module.exports = router;

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(null); }
	res.redirect('/message?content='+chineseEncodeToURI('請登入'));
}

function ensureAdmin(req, res, next) {
  var admimID="admimID";
  
  if(req.user._id==admimID){ return next(null); }
	res.redirect('/message?content='+chineseEncodeToURI('請以管理員身分登入'))
}

function chineseEncodeToURI(string){
	return encodeURIComponent(string);
}
