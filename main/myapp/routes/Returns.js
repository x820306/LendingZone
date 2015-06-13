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
											library.userLevelAdderReturn(removedItem.Borrower,function(){
												res.json(removedItem);
											},function(){
												res.end('error!');
											});
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

	Transactions.findById(ToTransaction).populate('Lender', 'Username Email').populate('Borrower', 'Username Email Level').populate('CreatedFrom', 'FromBorrowRequest').populate('Return').exec(function (err, transaction){
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
						library.transactionProcessor(transaction,true);
						transaction.InterestRate+=library.serviceChargeRate;//scr
						
						var ServiceChargeShouldPaid=Math.round(transaction.PrincipalNotReturn*library.serviceChargeRate/12);//scr
						var PrincipalShouldPaid;
						if(transaction.MonthPeriodLeft>1){
							PrincipalShouldPaid=Math.floor(transaction.PrincipalNotReturn/transaction.MonthPeriodLeft);
						}else{
							PrincipalShouldPaid=transaction.PrincipalNotReturn;
						}
						var InterestShouldPaid=Math.round(transaction.PrincipalNotReturn*(transaction.InterestRate-library.serviceChargeRate)/12);//scr we should limit borrow.MaxInterestRateAccepted always >=library.serviceChargeRate
						var ServiceChargeNotPaid;
						var PrincipalNotPaid;
						var InterestNotPaid;
						
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
								if(PrincipalShouldPaid>=tempMoneyPaid){
									PrincipalNotPaid=PrincipalShouldPaid-tempMoneyPaid;
								}else{
									if(transaction.MonthPeriodLeft>1){
										PrincipalNotPaid=PrincipalShouldPaid-tempMoneyPaid;
									}else{
										PrincipalNotPaid=0;
									}
								}
								InterestNotPaid=0;
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
						toCreate.ExtendPrincipalBeforePaid=transaction.ExtendPrincipal;
						toCreate.TotalPrincipalNowBeforePaid=transaction.TotalPrincipalNow;
						toCreate.PrincipalNotReturnBeforePaid=transaction.PrincipalNotReturn;
						toCreate.PrincipalReturnBeforePaid=transaction.PrincipalReturn;
						toCreate.InterestBeforePaid=transaction.Interest;
						toCreate.PrincipalInterestBeforePaid=transaction.PrincipalInterest;
						toCreate.InterestMonthBeforePaid=transaction.InterestMonth;
						toCreate.PrincipalInterestMonthBeforePaid=transaction.PrincipalInterestMonth;
						toCreate.InterestDivPrincipalBeforePaid=transaction.InterestDivPrincipal;
						toCreate.ServiceChargeBeforePaid=transaction.ServiceCharge;
						toCreate.ExtendMonthPeriodBeforePaid=transaction.ExtendMonthPeriod;
						toCreate.TotalMonthPeriodNowBeforePaid=transaction.TotalMonthPeriodNow;
						toCreate.MonthPeriodLeftBeforePaid=transaction.MonthPeriodLeft;
						toCreate.MonthPeriodPastBeforePaid=transaction.MonthPeriodPast;
						toCreate.InterestInFutureBeforePaid=transaction.InterestInFuture;
						toCreate.MoneyFutureBeforePaid=transaction.MoneyFuture;
						toCreate.InterestInFutureMonthBeforePaid=transaction.InterestInFutureMonth;
						toCreate.InterestInFutureMoneyMonthBeforePaid=transaction.InterestInFutureMoneyMonth;
						toCreate.InterestInFutureDivMoneyBeforePaid=transaction.InterestInFutureDivMoney;
						toCreate.ReturnCountBeforePaid=transaction.ReturnCount;
						toCreate.previousPayDateBeforePaid=transaction.previousPayDate;
						toCreate.nextPayDateBeforePaid=transaction.nextPayDate;
						toCreate.LevelBeforePaid=transaction.Borrower.Level;
						
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
										var optionsY = {
											path: 'Return',
											model: Returns,
										};
										Transactions.populate(newUpdate, optionsY, function(err, newUpdate){
											if(err){
												console.log(err);
												res.redirect('/message?content='+encodeURIComponent('錯誤!'));
											}else{
												BankAccounts.findOne({"OwnedBy": newUpdate.Lender}).exec(function (err, lenderBankaccount){
													if (err) {
														console.log(err);
														res.end("error");
													}else{
														if(!lenderBankaccount){
															res.end("error");
														}else{
															lenderBankaccount.MoneyInBankAccount+=((InterestShouldPaid-InterestNotPaid)+(PrincipalShouldPaid-PrincipalNotPaid));
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
																				borrowerBankaccount.MoneyInBankAccount-=((InterestShouldPaid-InterestNotPaid)+(PrincipalShouldPaid-PrincipalNotPaid)+(ServiceChargeShouldPaid-ServiceChargeNotPaid));
																				borrowerBankaccount.Updated = Date.now();
																				borrowerBankaccount.save(function (err,newUpdate3) {
																					if (err){
																						console.log(err);
																						res.end("error");
																					}else{
																						library.userLevelAdderReturn(newCreate.Borrower,function(){
																							Returns.findById(newCreate._id).populate('Borrower','Level').exec(function (err, foundReturn){
																								if (err) {
																									console.log(err);
																									res.json({error: err.name}, 500);
																								}else{
																									if(!foundReturn){
																										res.json({error: 'no such return'}, 500);
																									}else{
																										library.transactionProcessor(newUpdate,true);
																										foundReturn.BorrowerBankAccountNumber=newUpdate3.BankAccountNumber;
																										foundReturn.ExtendPrincipalAfterPaid=newUpdate.ExtendPrincipal;
																										foundReturn.TotalPrincipalNowAfterPaid=newUpdate.TotalPrincipalNow;
																										foundReturn.PrincipalNotReturnAfterPaid=newUpdate.PrincipalNotReturn;
																										foundReturn.PrincipalReturnAfterPaid=newUpdate.PrincipalReturn;
																										foundReturn.InterestAfterPaid=newUpdate.Interest;
																										foundReturn.PrincipalInterestAfterPaid=newUpdate.PrincipalInterest;
																										foundReturn.InterestMonthAfterPaid=newUpdate.InterestMonth;
																										foundReturn.PrincipalInterestMonthAfterPaid=newUpdate.PrincipalInterestMonth;
																										foundReturn.InterestDivPrincipalAfterPaid=newUpdate.InterestDivPrincipal;
																										foundReturn.ServiceChargeAfterPaid=newUpdate.ServiceCharge;
																										foundReturn.ExtendMonthPeriodAfterPaid=newUpdate.ExtendMonthPeriod;
																										foundReturn.TotalMonthPeriodNowAfterPaid=newUpdate.TotalMonthPeriodNow;
																										foundReturn.MonthPeriodLeftAfterPaid=newUpdate.MonthPeriodLeft;
																										foundReturn.MonthPeriodPastAfterPaid=newUpdate.MonthPeriodPast;
																										foundReturn.InterestInFutureAfterPaid=newUpdate.InterestInFuture;
																										foundReturn.MoneyFutureAfterPaid=newUpdate.MoneyFuture;
																										foundReturn.InterestInFutureMonthAfterPaid=newUpdate.InterestInFutureMonth;
																										foundReturn.InterestInFutureMoneyMonthAfterPaid=newUpdate.InterestInFutureMoneyMonth;
																										foundReturn.InterestInFutureDivMoneyAfterPaid=newUpdate.InterestInFutureDivMoney;
																										foundReturn.ReturnCountAfterPaid=newUpdate.ReturnCount;
																										foundReturn.previousPayDateAfterPaid=newUpdate.previousPayDate;
																										foundReturn.nextPayDateAfterPaid=newUpdate.nextPayDate;
																										foundReturn.LevelAfterPaid=foundReturn.Borrower.Level;
																										foundReturn.save(function (err,newCreate2){
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
																								}
																							});
																						},function(){
																							res.end('error!');
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
			text: '親愛的 '+transaction.Lender.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+'您收到了來自 '+transaction.Borrower.Username+' 在「'+transaction.CreatedFrom.FromBorrowRequest.StoryTitle+'("http://'+req.headers.host+'/lender/story?id='+transaction.CreatedFrom.FromBorrowRequest._id+'")」的還款！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"http://'+req.headers.host+'/lender/lenderReturnRecord?oneid='+newCreate2._id+'&id=&messenger='+encodeURIComponent('不分訊息種類')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('建立日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1"', // plaintext body
			html: '<img src="cid:cpng" /><br><br>親愛的 '+transaction.Lender.Username+' 您好：<br><br>您收到了來自 '+transaction.Borrower.Username+' 在「<a href="http://'+req.headers.host+'/lender/story?id='+transaction.CreatedFrom.FromBorrowRequest._id+'">'+transaction.CreatedFrom.FromBorrowRequest.StoryTitle+'</a>」的還款！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="http://'+req.headers.host+'/lender/lenderReturnRecord?oneid='+newCreate2._id+'&id=&messenger='+encodeURIComponent('不分訊息種類')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('建立日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>', 
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
			text: '親愛的 '+transaction.Borrower.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+'您已向 '+transaction.Lender.Username+' 支付了「'+transaction.CreatedFrom.FromBorrowRequest.StoryTitle+'("http://'+req.headers.host+'/lender/story?id='+transaction.CreatedFrom.FromBorrowRequest._id+'")」的還款！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"http://'+req.headers.host+'/lender/lenderReturnRecord?oneid='+newCreate2._id+'&id=&messenger='+encodeURIComponent('不分訊息種類')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('建立日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1"', // plaintext body
			html: '<img src="cid:cpng" /><br><br>親愛的 '+transaction.Borrower.Username+' 您好：<br><br>您已向 '+transaction.Lender.Username+' 支付了「<a href="http://'+req.headers.host+'/lender/story?id='+transaction.CreatedFrom.FromBorrowRequest._id+'">'+transaction.CreatedFrom.FromBorrowRequest.StoryTitle+'</a>」的還款！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="http://'+req.headers.host+'/lender/lenderReturnRecord?oneid='+newCreate2._id+'&id=&messenger='+encodeURIComponent('不分訊息種類')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('建立日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>', 
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
		
		if((newUpdate.PrincipalNotReturn==0)&&(newUpdate.MonthPeriodLeft==0)){
			var mailOptions3 = {
				from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
				to: transaction.Lender.Username+' <'+transaction.Lender.Email+'>', // list of receivers
				subject: transaction.Borrower.Username+'還清了所有應付款項', // Subject line
				text: '親愛的 '+transaction.Lender.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+transaction.Borrower.Username+' 還清了所有在「'+transaction.CreatedFrom.FromBorrowRequest.StoryTitle+'("http://'+req.headers.host+'/lender/story?id='+transaction.CreatedFrom.FromBorrowRequest._id+'")」的應付款項！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"http://'+req.headers.host+'/lender/lenderTransactionRecord?oneid='+newUpdate._id+'&filter='+encodeURIComponent('已結清')+'&messenger='+encodeURIComponent('不分訊息種類')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('建立日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1"', // plaintext body
				html: '<img src="cid:apng" /><br><br>親愛的 '+transaction.Lender.Username+' 您好：<br><br>'+transaction.Borrower.Username+' 還清了所有在「<a href="http://'+req.headers.host+'/lender/story?id='+transaction.CreatedFrom.FromBorrowRequest._id+'">'+transaction.CreatedFrom.FromBorrowRequest.StoryTitle+'</a>」的應付款項！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="http://'+req.headers.host+'/lender/lenderTransactionRecord?oneid='+newUpdate._id+'&filter='+encodeURIComponent('已結清')+'&messenger='+encodeURIComponent('不分訊息種類')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('建立日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>', 
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
				text: '親愛的 '+transaction.Borrower.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+'您還清了所有在「'+transaction.CreatedFrom.FromBorrowRequest.StoryTitle+'("http://'+req.headers.host+'/lender/story?id='+transaction.CreatedFrom.FromBorrowRequest._id+'")」應向 '+transaction.Lender.Username+' 支付的款項！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"http://'+req.headers.host+'/lender/lenderTransactionRecord?oneid='+newUpdate._id+'&filter='+encodeURIComponent('已結清')+'&messenger='+encodeURIComponent('不分訊息種類')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('建立日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1"', // plaintext body
				html: '<img src="cid:apng" /><br><br>親愛的 '+transaction.Borrower.Username+' 您好：<br><br>您還清了所有在「<a href="http://'+req.headers.host+'/lender/story?id='+transaction.CreatedFrom.FromBorrowRequest._id+'">'+transaction.CreatedFrom.FromBorrowRequest.StoryTitle+'</a>」應向 '+transaction.Lender.Username+' 支付的款項！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="http://'+req.headers.host+'/lender/lenderTransactionRecord?oneid='+newUpdate._id+'&filter='+encodeURIComponent('已結清')+'&messenger='+encodeURIComponent('不分訊息種類')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('建立日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>', 
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

