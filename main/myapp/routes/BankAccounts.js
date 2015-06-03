var library=require( './library.js' );
var mongoose = require('mongoose');
var BankAccounts  = mongoose.model('BankAccounts');
var sanitizer = require('sanitizer');

var express = require('express');
var router = express.Router();

router.post('/create', function(req, res, next) {
	var toCreate = new BankAccounts(req.body);
	toCreate.BankAccountNumber=sanitizer.sanitize(req.body.BankAccountNumber.trim());
	toCreate.BankAccountPassword=sanitizer.sanitize(req.body.BankAccountPassword.trim());
	toCreate.MoneyInBankAccount=sanitizer.sanitize(req.body.MoneyInBankAccount.trim());
	toCreate.OwnedBy=sanitizer.sanitize(req.body.OwnedBy.trim());
	
	toCreate.save(function (err,newCreate) {
		if (err){
			console.log(err);
			res.json({error: err.name}, 500);
		}else{
			res.json(newCreate);
		}
	});
	
	
});

router.post('/destroyTest',function(req, res, next) {
	BankAccounts.findById(req.body.BankAccountID).exec(function (err, bankAccount){
		if (err) {
			console.log(err);
			res.json({error: err.name}, 500);
		}else{
			if(!bankAccount){
				res.json({error:'no such bankAccount'}, 500);
			}else{
				bankAccount.remove(function (err,removedItem) {
					if (err){
						console.log(err);
						res.json({error: err.name}, 500);
					}else{
						res.json(removedItem);
					}
				});
			}
		}
	});
});

module.exports = router;
