var library=require( './library.js' );
var mongoose = require('mongoose');
var Returns  = mongoose.model('Returns');
var Transactions  = mongoose.model('Transactions');
var BankAccounts  = mongoose.model('BankAccounts');
var Lends  = mongoose.model('Lends');
var Borrows  = mongoose.model('Borrows');
var Messages  = mongoose.model('Messages');
var sanitizer = require('sanitizer');
var nodemailer = require('nodemailer');
var generator = require('xoauth2').createXOAuth2Generator({
    user: 'lendingzonesystem@gmail.com',
    clientId: '1064408122186-fheebavu1le96q0h0assuueda5kmb0nk.apps.googleusercontent.com',
    clientSecret: '8b9UNKvg4IZZsM7vsLI8e3JP',
    refreshToken: '1/0wqk7whxhYyMKKB81KBTmJDTioc9VnDxJu2hd4v9Bas'
});
generator.on('token', function(token){
    console.log('New token for %s: %s', token.user, token.accessToken);
});
var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        xoauth2: generator
    }
});

var express = require('express');
var router = express.Router();

router.post('/destroyTest', function(req, res, next) {
	Returns.findById(req.body.ReturnID).exec(function (err, foundReturn){
		if (err) {
			console.log(err);
			res.json({error: err.name}, 500);
		}else{
			if(!foundReturn){
				res.json({error: 'no such return'}, 500);
			}else{
				Transactions.findById(foundReturn.ToTransaction).exec(function (err, transaction){
					if (err) {
						console.log(err);
						res.json({error: err.name}, 500);
					}else{
						if(!transaction){
							res.json({error: 'no such transaction'}, 500);
						}else{
							
							transaction.MonthPeriodHasPast-=1;
							transaction.MonthPeriod+=1;
							transaction.Principal+=(foundReturn.PrincipalShouldPaid-foundReturn.PrincipalNotPaid);
							transaction.Principal-=foundReturn.InterestNotPaid;
							transaction.PrincipalReturnedCumulated-=(foundReturn.PrincipalShouldPaid-foundReturn.PrincipalNotPaid);
							transaction.InterestCumulated-=(foundReturn.InterestShouldPaid-foundReturn.InterestNotPaid);
							transaction.ServiceChargeCumulated-=(foundReturn.ServiceChargeShouldPaid-foundReturn.ServiceChargeNotPaid);
							
							var ctr = -1;
							for (i = 0; i < transaction.Return.length; i++) {
								if (transaction.Return[i].toString() === foundReturn._id.toString()) {
									ctr=i;
									break;
								}
							};
							if(ctr>-1){
								transaction.Return.splice(ctr, 1);
							}
							transaction.save(function (err,updatedTransaction){
								if (err){
									console.log(err);
									res.json({error: err.name}, 500);
								}else{	
									foundReturn.remove(function (err,removedItem){
										if (err){
											console.log(err);
											res.json({error: err.name}, 500);
										}else{
											res.json(removedItem);
										}
									});
								}
							});
						}
					}
				});
			}
		}
	});
});

router.post('/pay', function(req, res, next) {
	var ToTransaction=sanitizer.sanitize(req.body.ToTransaction.trim());
	var MoneyPaid=parseFloat(sanitizer.sanitize(req.body.MoneyPaid.trim()));

	Transactions.findById(ToTransaction).populate('Lender', 'Username Email').populate('Borrower', 'Username Email').populate('CreatedFrom', 'FromBorrowRequest').exec(function (err, transaction){
		if (err) {
			console.log(err);
			res.end("error");
		}else{
			if(!transaction){
				res.end("error");
			}else{
				var options = {
					path: 'CreatedFrom.FromBorrowRequest',
					model: Borrows,
					select: 'StoryTitle'
				};
				Messages.populate(transaction, options, function(err, transaction) {
					if(err){
						console.log(err);
						res.end("error");
					}else{
						var PrincipalBeforePaid=transaction.Principal;
						var PrincipalReturnedCumulatedBeforePaid=transaction.PrincipalReturnedCumulated;
						var InterestCumulatedBeforePaid=transaction.InterestCumulated;
						var ServiceChargeCumulatedBeforePaid=transaction.ServiceChargeCumulated;
		
						var ServiceChargeShouldPaid=Math.round(transaction.Principal*library.serviceChargeRate/12);//scr
						var PrincipalShouldPaid;
						if(transaction.MonthPeriod>1){
							PrincipalShouldPaid=Math.floor(transaction.Principal/transaction.MonthPeriod);
						}else{
							PrincipalShouldPaid=transaction.Principal;
						}
						var InterestShouldPaid=Math.round(transaction.Principal*(transaction.InterestRate-library.serviceChargeRate)/12);//scr we should limit borrow.MaxInterestRateAccepted always >=library.serviceChargeRate
						var ServiceChargeNotPaid;
						var PrincipalNotPaid;
						var InterestNotPaid;
						transaction.MonthPeriod-=1;
						transaction.MonthPeriodHasPast+=1;
						
						if(MoneyPaid<=ServiceChargeShouldPaid){
							ServiceChargeNotPaid=ServiceChargeShouldPaid-MoneyPaid;
							PrincipalNotPaid=PrincipalShouldPaid;
							InterestNotPaid=InterestShouldPaid;
						}else{
							var tempMoneyPaid0=MoneyPaid-ServiceChargeShouldPaid;
							if(tempMoneyPaid0<=InterestShouldPaid){
								ServiceChargeNotPaid=0;
								PrincipalNotPaid=PrincipalShouldPaid;
								InterestNotPaid=InterestShouldPaid-tempMoneyPaid0;
							}else{
								var tempMoneyPaid=tempMoneyPaid0-InterestShouldPaid;
								ServiceChargeNotPaid=0;
								PrincipalNotPaid=PrincipalShouldPaid-tempMoneyPaid;
								InterestNotPaid=0;
							}
						}
						transaction.Principal-=(PrincipalShouldPaid-PrincipalNotPaid);
						transaction.Principal+=InterestNotPaid;
						transaction.PrincipalReturnedCumulated+=(PrincipalShouldPaid-PrincipalNotPaid);
						transaction.InterestCumulated+=(InterestShouldPaid-InterestNotPaid);
						transaction.ServiceChargeCumulated+=(ServiceChargeShouldPaid-ServiceChargeNotPaid);
						
						if((transaction.MonthPeriod==0)&&(transaction.Principal>0)){
							transaction.MonthPeriod=1;
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
						toCreate.PrincipalReturnedCumulatedBeforePaid=PrincipalReturnedCumulatedBeforePaid;
						toCreate.InterestCumulatedBeforePaid=InterestCumulatedBeforePaid;
						toCreate.ServiceChargeCumulatedBeforePaid=ServiceChargeCumulatedBeforePaid;
						toCreate.PrincipalAfterPaid=transaction.Principal;
						toCreate.PrincipalReturnedCumulatedAfterPaid=transaction.PrincipalReturnedCumulated;
						toCreate.InterestCumulatedAfterPaid=transaction.InterestCumulated;
						toCreate.ServiceChargeCumulatedAfterPaid=transaction.ServiceChargeCumulated;
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
																														mail(transaction,newUpdate,newCreate2,req);
																														res.end('success');
																													}else{
																														lend.MaxMoneyToLend+=(PrincipalShouldPaid-PrincipalNotPaid);
																														lend.Updated = Date.now();
																														lend.save(function (err,newUpdate5) {
																															if (err){
																																console.log(err);
																																res.end("error");
																															}else{
																																mail(transaction,newUpdate,newCreate2,req);
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
				});
			}
		}
	});
});		

function mail(transaction,newUpdate,newCreate2,req){
	if(library.ifMail){
		var mailOptions = {
			from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
			to: transaction.Lender.Username+' <'+transaction.Lender.Email+'>', // list of receivers
			subject: '您收到了來自'+transaction.Borrower.Username+'的還款!', // Subject line
			text: '親愛的 '+transaction.Lender.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+'您收到了來自 '+transaction.Borrower.Username+' 在「'+transaction.CreatedFrom.FromBorrowRequest.StoryTitle+'("http://'+req.headers.host+'/lender/story?id='+transaction.CreatedFrom.FromBorrowRequest._id+'")」的還款！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"http://'+req.headers.host+'/lender/lenderReturnRecord?oneid='+newCreate2._id+'&id=&sorter='+encodeURIComponent('建立日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1"', // plaintext body
			html: '<img src="cid:cpng" /><br><br>親愛的 '+transaction.Lender.Username+' 您好：<br><br>您收到了來自 '+transaction.Borrower.Username+' 在「<a href="http://'+req.headers.host+'/lender/story?id='+transaction.CreatedFrom.FromBorrowRequest._id+'">'+transaction.CreatedFrom.FromBorrowRequest.StoryTitle+'</a>」的還款！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="http://'+req.headers.host+'/lender/lenderReturnRecord?oneid='+newCreate2._id+'&id=&sorter='+encodeURIComponent('建立日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>', 
			attachments: [{
				filename: 'c.png',
				path: __dirname+'/../public/images/c.png',
				cid: 'cpng' //same cid value as in the html img src
			}]
		};
		
		transporter.sendMail(mailOptions, function(error, info){
			if(error){
				console.log(error);
			}
		});
		
		var mailOptions2 = {
			from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
			to: transaction.Borrower.Username+' <'+transaction.Borrower.Email+'>', // list of receivers
			subject: '您已向'+transaction.Lender.Username+'支付了還款!', // Subject line
			text: '親愛的 '+transaction.Borrower.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+'您已向 '+transaction.Lender.Username+' 支付了「'+transaction.CreatedFrom.FromBorrowRequest.StoryTitle+'("http://'+req.headers.host+'/lender/story?id='+transaction.CreatedFrom.FromBorrowRequest._id+'")」的還款！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"http://'+req.headers.host+'/lender/lenderReturnRecord?oneid='+newCreate2._id+'&id=&sorter='+encodeURIComponent('建立日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1"', // plaintext body
			html: '<img src="cid:cpng" /><br><br>親愛的 '+transaction.Borrower.Username+' 您好：<br><br>您已向 '+transaction.Lender.Username+' 支付了「<a href="http://'+req.headers.host+'/lender/story?id='+transaction.CreatedFrom.FromBorrowRequest._id+'">'+transaction.CreatedFrom.FromBorrowRequest.StoryTitle+'</a>」的還款！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="http://'+req.headers.host+'/lender/lenderReturnRecord?oneid='+newCreate2._id+'&id=&sorter='+encodeURIComponent('建立日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>', 
			attachments: [{
				filename: 'c.png',
				path: __dirname+'/../public/images/c.png',
				cid: 'cpng' //same cid value as in the html img src
			}]
		};
		
		transporter.sendMail(mailOptions2, function(error, info){
			if(error){
				console.log(error);
			}
		});
		
		if((newUpdate.Principal==0)&&(newUpdate.MonthPeriod==0)){
			var mailOptions3 = {
				from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
				to: transaction.Lender.Username+' <'+transaction.Lender.Email+'>', // list of receivers
				subject: transaction.Borrower.Username+'還清了所有應付款項', // Subject line
				text: '親愛的 '+transaction.Lender.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+transaction.Borrower.Username+' 還清了所有在「'+transaction.CreatedFrom.FromBorrowRequest.StoryTitle+'("http://'+req.headers.host+'/lender/story?id='+transaction.CreatedFrom.FromBorrowRequest._id+'")」的應付款項！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"http://'+req.headers.host+'/lender/lenderTransactionRecord?oneid='+newUpdate._id+'&filter='+encodeURIComponent('已結清')+'&sorter='+encodeURIComponent('建立日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1"', // plaintext body
				html: '<img src="cid:apng" /><br><br>親愛的 '+transaction.Lender.Username+' 您好：<br><br>'+transaction.Borrower.Username+' 還清了所有在「<a href="http://'+req.headers.host+'/lender/story?id='+transaction.CreatedFrom.FromBorrowRequest._id+'">'+transaction.CreatedFrom.FromBorrowRequest.StoryTitle+'</a>」的應付款項！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="http://'+req.headers.host+'/lender/lenderTransactionRecord?oneid='+newUpdate._id+'&filter='+encodeURIComponent('已結清')+'&sorter='+encodeURIComponent('建立日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>', 
				attachments: [{
					filename: 'a.png',
					path: __dirname+'/../public/images/a.png',
					cid: 'apng' //same cid value as in the html img src
				}]
			};
			
			transporter.sendMail(mailOptions3, function(error, info){
				if(error){
					console.log(error);
				}
			});
			
			var mailOptions4 = {
				from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
				to: transaction.Borrower.Username+' <'+transaction.Borrower.Email+'>', // list of receivers
				subject:'您還清了所有應向'+transaction.Lender.Username+'支付的款項', // Subject line
				text: '親愛的 '+transaction.Borrower.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+'您還清了所有在「'+transaction.CreatedFrom.FromBorrowRequest.StoryTitle+'("http://'+req.headers.host+'/lender/story?id='+transaction.CreatedFrom.FromBorrowRequest._id+'")」應向 '+transaction.Lender.Username+' 支付的款項！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"http://'+req.headers.host+'/lender/lenderTransactionRecord?oneid='+newUpdate._id+'&filter='+encodeURIComponent('已結清')+'&sorter='+encodeURIComponent('建立日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1"', // plaintext body
				html: '<img src="cid:apng" /><br><br>親愛的 '+transaction.Borrower.Username+' 您好：<br><br>您還清了所有在「<a href="http://'+req.headers.host+'/lender/story?id='+transaction.CreatedFrom.FromBorrowRequest._id+'">'+transaction.CreatedFrom.FromBorrowRequest.StoryTitle+'</a>」應向 '+transaction.Lender.Username+' 支付的款項！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="http://'+req.headers.host+'/lender/lenderTransactionRecord?oneid='+newUpdate._id+'&filter='+encodeURIComponent('已結清')+'&sorter='+encodeURIComponent('建立日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>', 
				attachments: [{
					filename: 'a.png',
					path: __dirname+'/../public/images/a.png',
					cid: 'apng' //same cid value as in the html img src
				}]
			};
			
			transporter.sendMail(mailOptions4, function(error, info){
				if(error){
					console.log(error);
				}
			});
		}
	}
}																

module.exports = router;

