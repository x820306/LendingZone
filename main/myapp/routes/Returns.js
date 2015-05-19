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
var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'x820306test@gmail.com',
        pass: 'github111'
    }
});

var express = require('express');
var router = express.Router();

router.post('/pay', function(req, res, next) {
	var ToTransaction=sanitizer.sanitize(req.body.ToTransaction);
	var MoneyPaid=parseFloat(sanitizer.sanitize(req.body.MoneyPaid));

	Transactions.findById(ToTransaction).populate('Lender', 'Username Email').populate('Borrower', 'Username').populate('CreatedFrom', 'FromBorrowRequest').exec(function (err, transaction){
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
																														var mailOptions = {
																															from: 'x820306test ', // sender address
																															to: transaction.Lender.Email, // list of receivers
																															subject: '您收到了來自'+transaction.Borrower.Username+'的還款!', // Subject line
																															text: '親愛的 '+transaction.Lender.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+'您收到了來自 '+transaction.Borrower.Username+' 在「'+transaction.CreatedFrom.FromBorrowRequest.StoryTitle+'("http://lendingzone.herokuapp.com/lender/story?id='+transaction.CreatedFrom.FromBorrowRequest._id+'")」的還款！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"http://lendingzone.herokuapp.com/lender/lenderReturnRecord?oneid='+newCreate2._id+'&id=&sorter='+chineseEncodeToURI('最新')+'&page=1"', // plaintext body
																															html: '<img src="cid:cpng" /><br><br>親愛的 '+transaction.Lender.Username+' 您好：<br><br>您收到了來自 '+transaction.Borrower.Username+' 在「<a href="http://lendingzone.herokuapp.com/lender/story?id='+transaction.CreatedFrom.FromBorrowRequest._id+'">'+transaction.CreatedFrom.FromBorrowRequest.StoryTitle+'</a>」的還款！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="http://lendingzone.herokuapp.com/lender/lenderReturnRecord?oneid='+newCreate2._id+'&id=&sorter='+chineseEncodeToURI('最新')+'&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>', 
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
																														
																														if((newUpdate.Principal==0)&&(newUpdate.MonthPeriod==0)){
																															var filterText;
																															if(newUpdate.InsuranceFeePaid>0){
																																filterText='已保險';
																															}else{
																																filterText='未保險';
																															}
																															
																															var mailOptions2 = {
																																from: 'x820306test ', // sender address
																																to: transaction.Lender.Email, // list of receivers
																																subject: transaction.Borrower.Username+'還清了所有應付款項', // Subject line
																																text: '親愛的 '+transaction.Lender.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+transaction.Borrower.Username+' 還清了所有在「'+transaction.CreatedFrom.FromBorrowRequest.StoryTitle+'("http://lendingzone.herokuapp.com/lender/story?id='+transaction.CreatedFrom.FromBorrowRequest._id+'")」的應付款項！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"http://lendingzone.herokuapp.com/lender/lenderTransactionRecord?oneid='+newUpdate._id+'&filter='+chineseEncodeToURI(filterText)+'&sorter='+chineseEncodeToURI('最新')+'&page=1"', // plaintext body
																																html: '<img src="cid:apng" /><br><br>親愛的 '+transaction.Lender.Username+' 您好：<br><br>'+transaction.Borrower.Username+' 還清了所有在「<a href="http://lendingzone.herokuapp.com/lender/story?id='+transaction.CreatedFrom.FromBorrowRequest._id+'">'+transaction.CreatedFrom.FromBorrowRequest.StoryTitle+'</a>」的應付款項！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="http://lendingzone.herokuapp.com/lender/lenderTransactionRecord?oneid='+newUpdate._id+'&filter='+chineseEncodeToURI(filterText)+'&sorter='+chineseEncodeToURI('最新')+'&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>', 
																																attachments: [{
																																	filename: 'a.png',
																																	path: __dirname+'/../public/images/a.png',
																																	cid: 'apng' //same cid value as in the html img src
																																}]
																															};
																															
																															transporter.sendMail(mailOptions2, function(error, info){
																																if(error){
																																	console.log(error);
																																}
																															});
																														}
																														
																														res.end('success');
																													}else{
																														lend.MaxMoneyToLend+=(PrincipalShouldPaid-PrincipalNotPaid);
																														lend.Updated = Date.now();
																														lend.save(function (err,newUpdate5) {
																															if (err){
																																console.log(err);
																																res.end("error");
																															}else{
																																var mailOptions = {
																																	from: 'x820306test ', // sender address
																																	to: transaction.Lender.Email, // list of receivers
																																	subject: '您收到了來自'+transaction.Borrower.Username+'的還款!', // Subject line
																																	text: '親愛的 '+transaction.Lender.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+'您收到了來自 '+transaction.Borrower.Username+' 在「'+transaction.CreatedFrom.FromBorrowRequest.StoryTitle+'("http://lendingzone.herokuapp.com/lender/story?id='+transaction.CreatedFrom.FromBorrowRequest._id+'")」的還款！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"http://lendingzone.herokuapp.com/lender/lenderReturnRecord?oneid='+newCreate2._id+'&id=&sorter='+chineseEncodeToURI('最新')+'&page=1"', // plaintext body
																																	html: '<img src="cid:cpng" /><br><br>親愛的 '+transaction.Lender.Username+' 您好：<br><br>您收到了來自 '+transaction.Borrower.Username+' 在「<a href="http://lendingzone.herokuapp.com/lender/story?id='+transaction.CreatedFrom.FromBorrowRequest._id+'">'+transaction.CreatedFrom.FromBorrowRequest.StoryTitle+'</a>」的還款！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="http://lendingzone.herokuapp.com/lender/lenderReturnRecord?oneid='+newCreate2._id+'&id=&sorter='+chineseEncodeToURI('最新')+'&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>', 
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
																																
																																if((newUpdate.Principal==0)&&(newUpdate.MonthPeriod==0)){
																																	var filterText;
																																	if(newUpdate.InsuranceFeePaid>0){
																																		filterText='已保險';
																																	}else{
																																		filterText='未保險';
																																	}
																																	
																																	var mailOptions2 = {
																																		from: 'x820306test ', // sender address
																																		to: transaction.Lender.Email, // list of receivers
																																		subject: transaction.Borrower.Username+'還清了所有應付款項', // Subject line
																																		text: '親愛的 '+transaction.Lender.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+transaction.Borrower.Username+' 還清了所有在「'+transaction.CreatedFrom.FromBorrowRequest.StoryTitle+'("http://lendingzone.herokuapp.com/lender/story?id='+transaction.CreatedFrom.FromBorrowRequest._id+'")」的應付款項！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"http://lendingzone.herokuapp.com/lender/lenderTransactionRecord?oneid='+newUpdate._id+'&filter='+chineseEncodeToURI(filterText)+'&sorter='+chineseEncodeToURI('最新')+'&page=1"', // plaintext body
																																		html: '<img src="cid:apng" /><br><br>親愛的 '+transaction.Lender.Username+' 您好：<br><br>'+transaction.Borrower.Username+' 還清了所有在「<a href="http://lendingzone.herokuapp.com/lender/story?id='+transaction.CreatedFrom.FromBorrowRequest._id+'">'+transaction.CreatedFrom.FromBorrowRequest.StoryTitle+'</a>」的應付款項！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="http://lendingzone.herokuapp.com/lender/lenderTransactionRecord?oneid='+newUpdate._id+'&filter='+chineseEncodeToURI(filterText)+'&sorter='+chineseEncodeToURI('最新')+'&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>', 
																																		attachments: [{
																																			filename: 'a.png',
																																			path: __dirname+'/../public/images/a.png',
																																			cid: 'apng' //same cid value as in the html img src
																																		}]
																																	};
																																	
																																	transporter.sendMail(mailOptions2, function(error, info){
																																		if(error){
																																			console.log(error);
																																		}
																																	});
																																}
																																
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
