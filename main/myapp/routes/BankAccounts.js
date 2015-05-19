var library=require( './library.js' );
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
