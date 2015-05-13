var mongoose = require('mongoose');
var Returns  = mongoose.model('Returns');
var Transactions  = mongoose.model('Transactions');
var sanitizer = require('sanitizer');

var express = require('express');
var router = express.Router();

router.post('/pay', function(req, res, next) {
	var ToTransaction=sanitizer.sanitize(req.body.ToTransaction);
	var MoneyPaid=parseFloat(sanitizer.sanitize(req.body.MoneyPaid));

	Transactions.findById(ToTransaction).exec(function (err, transaction){
		var PrincipalBeforePaid=transaction.Principal;
		var PrincipalShouldPaid=transaction.Principal/transaction.MonthPeriod;
		var InterestShouldPaid=transaction.Principal*transaction.InterestRate;
		var PrincipalNotPaid;
		var InterestNotPaid;
		transaction.MonthPeriod-=1;
		transaction.MonthPeriodHasPast+=1;
		if(MoneyPaid<=PrincipalShouldPaid){
			PrincipalNotPaid=PrincipalShouldPaid-MoneyPaid;
			InterestNotPaid=InterestShouldPaid;
			transaction.Principal-=MoneyPaid;
			transaction.Principal+=InterestNotPaid;
			transaction.PrincipalReturnedCumulated+=MoneyPaid;
			transaction.InterestCumulated+=0;
		}else{
			var tempMoneyPaid=MoneyPaid-PrincipalShouldPaid;
			if(tempMoneyPaid<=InterestShouldPaid){
				PrincipalNotPaid=0;
				InterestNotPaid=InterestShouldPaid-tempMoneyPaid;
				transaction.Principal-=PrincipalShouldPaid;
				transaction.Principal+=InterestNotPaid;
				transaction.PrincipalReturnedCumulated+=PrincipalShouldPaid;
				transaction.InterestCumulated+=tempMoneyPaid;
			}else{
				PrincipalNotPaid=InterestShouldPaid-tempMoneyPaid;
				InterestNotPaid=0;
				transaction.Principal-=PrincipalShouldPaid;
				transaction.Principal+=PrincipalNotPaid;
				transaction.PrincipalReturnedCumulated+=PrincipalShouldPaid;
				transaction.PrincipalReturnedCumulated-=PrincipalNotPaid;
				transaction.InterestCumulated+=InterestShouldPaid;
			}
		}
		
		var toCreate = new Returns();
		toCreate.ToTransaction=ToTransaction;
		toCreate.Borrower=transaction.Borrower;
		toCreate.Lender=transaction.Lender;
		toCreate.InterestShouldPaid=InterestShouldPaid;
		toCreate.InterestNotPaid=InterestNotPaid;
		toCreate.PrincipalShouldPaid=PrincipalShouldPaid;
		toCreate.PrincipalNotPaid=PrincipalNotPaid;
		toCreate.PrincipalBeforePaid=PrincipalBeforePaid;
		toCreate.Level=transaction.Level;
		
		toCreate.save(function (err,newCreate) {
			if (err){
				console.log(err);
				res.end("create Return error");
			}else{
				transaction.Return.push(newCreate._id);
				transaction.Updated = Date.now();
				transaction.save(function (err,newUpdate) {
					if (err){
						console.log(err);
						res.end("update Transaction error");
					}else{
						BankAccounts.findOne({"OwnedBy": newUpdate.Lender}).exec(function (err, lenderBankaccount){
							if (err) {
								console.log(err);
								res.end("error");
							}else{
								if(!lenderBankaccount){
									console.log(err);
									res.end("error");
								}else{
									lenderBankaccount.MoneyInBankAccount+=MoneyPaid;
									lenderBankaccount.save(function (err,newUpdate2) {
										if (err){
											console.log(err);
											res.end("error");
										}else{
											BankAccounts.findOne({"OwnedBy": newUpdate.Borrower}).exec(function (err, borrowerBankaccount){
												if (err) {
													console.log(err);
													res.end("error");
												}else{
													if(!borrowerBankaccount){
														console.log(err);
														res.end("error");
													}else{
														borrowerBankaccount.MoneyInBankAccount-=MoneyPaid;
														borrowerBankaccount.save(function (err,newUpdate3) {
															if (err){
																console.log(err);
																res.end("error");
															}else{
																Lends.findOne({"CreatedBy": newUpdate.Lender}).exec(function (err, lend){
																	if (err) {
																		console.log(err);
																		res.end("error");
																	}else{
																		if(!lend){
																			res.end('success');
																		}else{
																			lend.MaxMoneyToLend+=(newCreate.PrincipalShouldPaid-newCreate.PrincipalNotPaid);
																			lend.save(function (err,newUpdate4) {
																				if (err){
																					console.log(err);
																					res.end("error");
																				}else{
																					res.end('success');
																				}
																			});	
																		}
																	}
																});
															}
														});								
													}
												}
											});
										}
									});								
								}
							}
						});
					}
				});
			}
		});
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
