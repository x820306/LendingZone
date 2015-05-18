var library=require( './library.js' );
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
		if (err) {
			console.log(err);
			res.end("error");
		}else{
			if(!transaction){
				res.end("error");
			}else{
				var PrincipalBeforePaid=transaction.Principal;
		
				var ServiceChargeShouldPaid=transaction.Principal*library.serviceChargeRate;//scr
				var PrincipalShouldPaid=transaction.Principal/transaction.MonthPeriod;
				var InterestShouldPaid=transaction.Principal*(transaction.InterestRate-library.serviceChargeRate);//scr we should limit borrow.MaxInterestRateAccepted always >=library.serviceChargeRate
				var ServiceChargeNotPaid;
				var PrincipalNotPaid;
				var InterestNotPaid;
				transaction.MonthPeriod-=1;
				transaction.MonthPeriodHasPast+=1;
				
				if(MoneyPaid<=ServiceChargeShouldPaid){
					ServiceChargeNotPaid=ServiceChargeShouldPaid-MoneyPaid;
					PrincipalNotPaid=PrincipalShouldPaid;
					InterestNotPaid=InterestShouldPaid;
					transaction.Principal-=0;
					transaction.Principal+=InterestNotPaid;
					transaction.PrincipalReturnedCumulated+=0;
					transaction.InterestCumulated+=0;
				}else{
					var tempMoneyPaid0=MoneyPaid-ServiceChargeShouldPaid;
					if(tempMoneyPaid0<=PrincipalShouldPaid){
						ServiceChargeNotPaid=0;
						PrincipalNotPaid=PrincipalShouldPaid-tempMoneyPaid0;
						InterestNotPaid=InterestShouldPaid;
						transaction.Principal-=tempMoneyPaid0;
						transaction.Principal+=InterestNotPaid;
						transaction.PrincipalReturnedCumulated+=tempMoneyPaid0;
						transaction.InterestCumulated+=0;
					}else{
						var tempMoneyPaid=tempMoneyPaid0-PrincipalShouldPaid;
						if(tempMoneyPaid<=InterestShouldPaid){
							ServiceChargeNotPaid=0;
							PrincipalNotPaid=0;
							InterestNotPaid=InterestShouldPaid-tempMoneyPaid;
							transaction.Principal-=PrincipalShouldPaid;
							transaction.Principal+=InterestNotPaid;
							transaction.PrincipalReturnedCumulated+=PrincipalShouldPaid;
							transaction.InterestCumulated+=tempMoneyPaid;
						}else{
							ServiceChargeNotPaid=0;
							PrincipalNotPaid=InterestShouldPaid-tempMoneyPaid;
							InterestNotPaid=0;
							transaction.Principal-=PrincipalShouldPaid;
							transaction.Principal+=PrincipalNotPaid;
							transaction.PrincipalReturnedCumulated+=PrincipalShouldPaid;
							transaction.PrincipalReturnedCumulated-=PrincipalNotPaid;
							transaction.InterestCumulated+=InterestShouldPaid;
						}
					}
				}
				
				var toCreate = new Returns();
				toCreate.ToTransaction=ToTransaction;
				toCreate.Borrower=transaction.Borrower;
				toCreate.Lender=transaction.Lender;
				toCreate.ServiceChargeShouldPaid=ServiceChargeShouldPaid;
				toCreate.ServiceChargeNotPaid=ServiceChargeNotPaid;
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
											res.end("error");
										}else{
											lenderBankaccount.MoneyInBankAccount+=(MoneyPaid-(ServiceChargeShouldPaid-ServiceChargeNotPaid));
											lenderBankaccount.Updated = Date.now();
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
																res.end("error");
															}else{
																borrowerBankaccount.MoneyInBankAccount-=MoneyPaid;
																borrowerBankaccount.Updated = Date.now();
																borrowerBankaccount.save(function (err,newUpdate3) {
																	if (err){
																		console.log(err);
																		res.end("error");
																	}else{
																		newCreate.BorrowerBankAccountNumber=newUpdate3.BankAccountNumber;
																		newCreate.save(function (err,newCreate2){
																			if (err){
																				console.log(err);
																				res.end("update Return error");
																			}else{
																				var objID=mongoose.Types.ObjectId('5555251bb08002f0068fd00f');//admin account
																				BankAccounts.findOne({"OwnedBy": objID}).exec(function (err, adminAccount){
																					if (err) {
																						console.log(err);
																						res.end("error");
																					}else{
																						if(!adminAccount){
																							res.end("error");
																						}else{
																							adminAccount.MoneyInBankAccount+=(ServiceChargeShouldPaid-ServiceChargeNotPaid);
																							adminAccount.Updated = Date.now();
																							adminAccount.save(function (err,newUpdate4) {
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
																												lend.MaxMoneyToLend+=(PrincipalShouldPaid-PrincipalNotPaid);
																												lend.Updated = Date.now();
																												lend.save(function (err,newUpdate5) {
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
