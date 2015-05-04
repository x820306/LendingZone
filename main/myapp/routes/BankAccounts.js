var mongoose = require('mongoose');
var BankAccounts  = mongoose.model('BankAccounts');
var sanitizer = require('sanitizer');

var express = require('express');
var router = express.Router();

router.post('/create', function(req, res, next) {
	var toCreate = new BankAccounts(req.body);
	toCreate.BankAccountNumber=sanitizer.sanitize(req.body.BankAccountNumber);
	toCreate.BankAccountPassword=sanitizer.sanitize(req.body.BankAccountPassword);
	toCreate.MoneyInBankAccount=sanitizer.sanitize(req.body.MoneyInBankAccount);
	toCreate.OwnedBy=sanitizer.sanitize(req.body.OwnedBy);
	
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
