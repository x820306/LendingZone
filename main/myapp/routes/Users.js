var mongoose = require('mongoose');
var Users  = mongoose.model('Users');
var BankAccounts  = mongoose.model('BankAccounts');
var sanitizer = require('sanitizer'); 

var express = require('express');
var router = express.Router();

router.post('/createTest', function(req, res, next) {
	var toCreate = new Users();
	toCreate.Username=sanitizer.sanitize(req.body.Username);
	toCreate.Password=sanitizer.sanitize(req.body.Password);
	toCreate.Name=sanitizer.sanitize(req.body.Name);
	toCreate.Gender=sanitizer.sanitize(req.body.Gender);
	toCreate.BirthDay=sanitizer.sanitize(req.body.BirthDay);
	toCreate.Phone=sanitizer.sanitize(req.body.Phone);
	toCreate.Address=sanitizer.sanitize(req.body.Address);
	
	toCreate.IdCardType=req.files.IdCard.mimetype;
	toCreate.SecondCardType=req.files.SecondCard.mimetype;
	toCreate.IdCard=req.files.IdCard.buffer;
	toCreate.SecondCard=req.files.SecondCard.buffer;
	
	toCreate.save(function (err,newCreate) {
		if (err){
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤'));
		}else{
			var toCreateInner = new BankAccounts();
			toCreateInner.BankAccountNumber=sanitizer.sanitize(req.body.BankAccountNumber);
			toCreateInner.BankAccountPassword=sanitizer.sanitize(req.body.BankAccountPassword);
			toCreateInner.MoneyInBankAccount=sanitizer.sanitize(req.body.MoneyInBankAccount);
			toCreateInner.OwnedBy=newCreate._id;
	
			toCreateInner.save(function (err,newCreateInner) {
				if (err){
					console.log(err);
					res.redirect('/message?content='+chineseEncodeToURI('錯誤'));
				}else{
					res.redirect('/message?content='+chineseEncodeToURI('帳號建立成功'));
				}
			});
		}
	});
});

router.get('/find/:id?', function(req, res, next) {
	Users.findById(req.query.id).exec(function (err, user){
		if (err) {
			console.log(err);
			res.json({error: err.name}, 500);
		}else{
			if(!user){
				res.redirect('/');
			}else{
				res.json(user);
			}
		}
	});
});

router.get('/IdCard/:id?', function(req, res, next) {
	Users.findById(req.query.id).exec(function (err, user){
		if (err) {
			console.log(err);
			res.json({error: err.name}, 500);
		}else{
			res.setHeader('content-type', user.IdCardType);
			res.end(user.IdCard, "binary");
		}
	});
});

router.get('/SecondCard/:id?', function(req, res, next) {
	Users.findById(req.query.id).exec(function (err, user){
		if (err) {
			console.log(err);
			res.json({error: err.name}, 500);
		}else{
			res.setHeader('content-type', user.SecondCardType);
			res.end(user.SecondCard, "binary");
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
