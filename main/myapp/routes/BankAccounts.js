var library=require( './library.js' );
var mongoose = require('mongoose');
var BankAccounts  = mongoose.model('BankAccounts');
var sanitizer = require('sanitizer');

var express = require('express');
var router = express.Router();

router.post('/create', function(req, res, next) {
	if((typeof(req.body.BankAccountNumber) === 'string')&&(typeof(req.body.BankAccountPassword) === 'string')&&(typeof(req.body.BankAccountPassword) === 'string')&&(typeof(req.body.MoneyInBankAccount) === 'string')){
		req.body.BankAccountNumber=sanitizer.sanitize(req.body.BankAccountNumber.trim());
		req.body.BankAccountPassword=sanitizer.sanitize(req.body.BankAccountPassword.trim());
		req.body.MoneyInBankAccount=sanitizer.sanitize(req.body.MoneyInBankAccount.trim());
		req.body.OwnedBy=sanitizer.sanitize(req.body.OwnedBy.trim());
		
		var toCreate = new BankAccounts();
		toCreate.BankAccountNumber=req.body.BankAccountNumber;
		toCreate.BankAccountPassword=req.body.BankAccountPassword;
		toCreate.MoneyInBankAccount=req.body.MoneyInBankAccount;
		toCreate.OwnedBy=req.body.OwnedBy;
		
		toCreate.save(function (err,newCreate) {
			if (err){
				console.log(err);
				res.json({error: err.name}, 500);
			}else{
				res.json(newCreate);
			}
		});
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/destroyTest',function(req, res, next) {
	if(typeof(req.body.BankAccountID) === 'string'){
		BankAccounts.findById(req.body.BankAccountID).exec(function (err, bankAccount){
			if (err) {
				console.log(err);
				res.json({error: err.name}, 500);
			}else{
				if(!bankAccount){
					res.json({error:'no such bankAccount'}, 500);
				}else{
					bankAccount.remove(function (err,removedBankAccount) {
						if (err){
							console.log(err);
							res.json({error: err.name}, 500);
						}else{
							library.userDeleter(res,removedBankAccount.OwnedBy,function(){res.json(removedBankAccount);},function(){res.end('error');},true);
						}
					});
				}
			}
		});
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

module.exports = router;
