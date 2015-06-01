var library=require( './library.js' );
var mongoose = require('mongoose');
var Borrows  = mongoose.model('Borrows');
var Lends  = mongoose.model('Lends');
var Messages  = mongoose.model('Messages');
var BankAccounts  = mongoose.model('BankAccounts');
var Transactions  = mongoose.model('Transactions');
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

router.post('/createTest', function(req, res, next) {
	var id=sanitizer.sanitize(req.body.FromBorrowRequest.trim());
	
	Borrows.findById(id).exec(function (err, borrow){
		if (err) {
			console.log(err);
			res.json({error: err.name}, 500);
		}else{
			if(!borrow){
				res.json({error: 'no such borrow'}, 500);
			}else{
				var toCreate = new Messages();
				toCreate.FromBorrowRequest=sanitizer.sanitize(req.body.FromBorrowRequest.trim());
				toCreate.Message=sanitizer.sanitize(req.body.Message.trim());
				toCreate.MoneyToLend=sanitizer.sanitize(req.body.MoneyToLend.trim());
				toCreate.InterestRate=sanitizer.sanitize(req.body.InterestRate.trim());
				toCreate.MonthPeriod=sanitizer.sanitize(req.body.MonthPeriod.trim());
				toCreate.SendTo=sanitizer.sanitize(req.body.SendTo.trim());
				toCreate.CreatedBy=sanitizer.sanitize(req.body.CreatedBy.trim());
				toCreate.Type=sanitizer.sanitize(req.body.Type.trim());
				toCreate.Level=borrow.Level;
				
				toCreate.save(function (err,newCreate) {
					if (err){
						console.log(err);
						res.json({error: err.name}, 500);
					}else{
						Borrows.findById(newCreate.FromBorrowRequest).exec(function (err, borrow){
							if (err) {
								console.log(err);
								res.json({error: err.name}, 500);
							}else{
								borrow.Message.push(newCreate._id);
								borrow.save(function (err,borrowUpdated) {
									if (err){
										console.log(err);
										res.json({error: err.name}, 500);
									}else{
										res.json(newCreate);
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

function toLendSamePart(res,req,differentPart,outterPara){
	Borrows.findById(req.body.FromBorrowRequest).populate('CreatedBy', 'Username Email').exec(function (err, borrow){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			if(!borrow){
				res.redirect('/message?content='+encodeURIComponent('錯誤ID!'));
			}else{
				BankAccounts.findOne({"OwnedBy": req.user._id}).populate('OwnedBy', 'Username Email').exec(function (err, lenderBankaccount){
					if (err) {
						console.log(err);
						res.redirect('/message?content='+encodeURIComponent('錯誤!'));
					}else{
						if(!lenderBankaccount){
							res.redirect('/message?content='+encodeURIComponent('無銀行帳戶!'));
						}else{
							var maxMoney=parseInt(lenderBankaccount.MoneyInBankAccount);
							var maxMoney2=parseInt(borrow.MoneyToBorrow)-parseInt(borrow.MoneyToBorrowCumulated);
							var maxMonth=parseInt(borrow.MonthPeriodAccepted);
							var maxRate=parseFloat(borrow.MaxInterestRateAccepted);
							
							var nowMoney=parseInt(sanitizer.sanitize(req.body.MoneyToLend.trim()));
							var rate=(parseFloat(sanitizer.sanitize(req.body.InterestRate.trim()))/100)+library.serviceChargeRate;//scr
							var month=parseInt(sanitizer.sanitize(req.body.MonthPeriod.trim()));
							
							if((sanitizer.sanitize(req.body.MoneyToLend.trim())=='')||(sanitizer.sanitize(req.body.InterestRate.trim())=='')||(sanitizer.sanitize(req.body.MonthPeriod.trim())=='')){
								res.redirect('/message?content='+encodeURIComponent('必要參數未填!'));
							}else if((isNaN(month))||(isNaN(nowMoney))||(isNaN(rate))){
								res.redirect('/message?content='+encodeURIComponent('非數字參數!'));
							}else if((month<1)||(month>36)||(nowMoney<1)||(rate<(0.0001+library.serviceChargeRate))||(rate>(0.99+library.serviceChargeRate))){
								res.redirect('/message?content='+encodeURIComponent('錯誤參數!'));//scr
							}else if(nowMoney>maxMoney){
								res.redirect('/message?content='+encodeURIComponent('金額超過您的銀行餘額!'));
							}else if(nowMoney>maxMoney2){
								res.redirect('/message?content='+encodeURIComponent('金額超過對方所需!'));
							}else if(month>maxMonth){
								res.redirect('/message?content='+encodeURIComponent('超過對方可接受之最大期數!'));
							}else if(rate>maxRate){
								res.redirect('/message?content='+encodeURIComponent('超過期望利率上限!'));
							}else{
								differentPart(res,req,borrow,lenderBankaccount,outterPara);
							}
						}
					}
				});
			}
		}
	});	
}

function toLendCreatePart(res,req,borrow,lenderBankaccount,outterPara){
	Messages.findOne({$and:[{"CreatedBy": borrow.CreatedBy},{"SendTo": req.user._id},{"FromBorrowRequest": req.body.FromBorrowRequest},{"Type": "toBorrow"}]}).exec(function (err, borrowMessage){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			if(!borrowMessage){
				var toCreate = new Messages();
				toCreate.FromBorrowRequest=sanitizer.sanitize(req.body.FromBorrowRequest.trim());
				if(sanitizer.sanitize(req.body.Message.trim()) != ''){
					toCreate.Message=sanitizer.sanitize(req.body.Message.trim());
				}
				toCreate.MoneyToLend=parseInt(sanitizer.sanitize(req.body.MoneyToLend.trim()));
				toCreate.InterestRate=(parseFloat(sanitizer.sanitize(req.body.InterestRate.trim()))/100)+library.serviceChargeRate;//scr
				toCreate.MonthPeriod=parseInt(sanitizer.sanitize(req.body.MonthPeriod.trim()));
				toCreate.CreatedBy= req.user._id
				toCreate.SendTo=borrow.CreatedBy;
				toCreate.Type='toLend';
				toCreate.Level=borrow.Level;
				
				toCreate.save(function (err,newCreate) {
					if (err){
						console.log(err);
						res.redirect('/message?content='+encodeURIComponent('新建失敗!'));
					}else{
						if(borrow.AutoComfirmToLendMsgPeriod==0){
							var toCreateTransaction = new Transactions();
							toCreateTransaction.Principal=newCreate.MoneyToLend;
							toCreateTransaction.InterestRate=newCreate.InterestRate;
							toCreateTransaction.MonthPeriod=newCreate.MonthPeriod;
							toCreateTransaction.CreatedFrom=newCreate._id;
							toCreateTransaction.Borrower=newCreate.SendTo;
							toCreateTransaction.Lender=newCreate.CreatedBy;
							toCreateTransaction.Level=newCreate.Level;
							
							toCreateTransaction.save(function (err,newCreateTransaction) {
								if (err){
									console.log(err);
									res.redirect('/message?content='+encodeURIComponent('錯誤!'));
								}else{
									BankAccounts.findOne({"OwnedBy": newCreateTransaction.Borrower}).exec(function (err, borrowerBankaccount){
										if (err) {
											console.log(err);
											res.redirect('/message?content='+encodeURIComponent('錯誤!'));
										}else{
											if(!borrowerBankaccount){
												res.redirect('/message?content='+encodeURIComponent('錯誤!'));
											}else{
												borrowerBankaccount.MoneyInBankAccount+=newCreateTransaction.Principal;
												borrowerBankaccount.save(function (err,updatedBorrowerBankaccount) {
													if (err){
														console.log(err);
														res.redirect('/message?content='+encodeURIComponent('錯誤!'));
													}else{
														lenderBankaccount.MoneyInBankAccount-=newCreateTransaction.Principal;
														lenderBankaccount.save(function (err,updatedLenderBankaccount) {
															if (err){
																console.log(err);
																res.redirect('/message?content='+encodeURIComponent('錯誤!'));
															}else{				
																borrow.MoneyToBorrowCumulated+=newCreateTransaction.Principal;
																if(borrow.MoneyToBorrowCumulated>=borrow.MoneyToBorrow){
																	borrow.IfReadable=false;
																}
																borrow.Message.push(newCreate._id);
																borrow.save(function (err,updatedBorrow) {
																	if (err){
																		console.log(err);
																		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
																	}else{				
																		Lends.findOne({"CreatedBy": newCreate.CreatedBy}).exec(function (err, lend){
																			if (err) {
																				console.log(err);
																				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
																			}else{
																				if(!lend){
																					newCreate.Status='Confirmed';
																					newCreate.Transaction.push(newCreateTransaction._id);
																					newCreate.save(function (err,newCreateUpdated) {
																						if (err){
																							console.log(err);
																							res.redirect('/message?content='+encodeURIComponent('錯誤!'));
																						}else{
																							res.redirect('/lender/story?id='+req.body.FromBorrowRequest);
																						}
																					});
																				}else{
																					lend.MaxMoneyToLend-=newCreateTransaction.Principal;
																					if(lend.MaxMoneyToLend<0){
																						lend.MaxMoneyToLend=0;
																					}
																					lend.save(function (err,updatedLend) {
																						if (err){
																							console.log(err);
																							res.redirect('/message?content='+encodeURIComponent('錯誤!'));
																						}else{		
																							newCreate.Status='Confirmed';
																							newCreate.Transaction.push(newCreateTransaction._id);
																							newCreate.save(function (err,newCreateUpdated) {
																								if (err){
																									console.log(err);
																									res.redirect('/message?content='+encodeURIComponent('錯誤!'));
																								}else{
																									if(library.ifMail){
																										var mailOptions = {
																											from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
																											to: lenderBankaccount.OwnedBy.Username+' <'+lenderBankaccount.OwnedBy.Email+'>', // list of receivers
																											subject: borrow.CreatedBy.Username+'同意了您方才送出的欲借出訊息!', // Subject line
																											text: '親愛的 '+lenderBankaccount.OwnedBy.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+borrow.CreatedBy.Username+' 同意了您方才在「'+borrow.StoryTitle+'("http://'+req.headers.host+'/lender/story?id='+borrow._id+'")」送出的欲借出訊息！'+String.fromCharCode(10)+'您的交易紅利代碼為： '+library.randomString(8)+String.fromCharCode(10)+'您可至 玉山銀行網站("http://www.esunbank.com.tw/") 兌換紅利喔!'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看訊息與交易結果:'+String.fromCharCode(10)+'"http://lendingzone.herokuapp.com/lender/lenderSendMessages?msgKeyword='+newCreateUpdated._id+'&filter='+encodeURIComponent('已被同意')+'&sorter='+encodeURIComponent('最新')+'&page=1"', // plaintext body
																											html: '<img src="cid:bpng" /><br><br>親愛的 '+lenderBankaccount.OwnedBy.Username+' 您好：<br><br>'+borrow.CreatedBy.Username+' 同意了您方才在「<a href="http://'+req.headers.host+'/lender/story?id='+borrow._id+'">'+borrow.StoryTitle+'</a>」送出的欲借出訊息！<br>您的交易紅利代碼為： <div style="color:#FF0000;display:inline;">'+library.randomString(8)+'</div><br>您可至 <a href="http://www.esunbank.com.tw/">玉山銀行網站</a> 兌換紅利喔!<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="http://lendingzone.herokuapp.com/lender/lenderSendMessages?msgKeyword='+newCreateUpdated._id+'&filter='+encodeURIComponent('已被同意')+'&sorter='+encodeURIComponent('最新')+'&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看訊息與交易結果</span></a></td></tr></table>', 
																											attachments: [{
																												filename: 'b.png',
																												path: __dirname+'/../public/images/b.png',
																												cid: 'bpng' //same cid value as in the html img src
																											}]
																										};
																										
																										transporter.sendMail(mailOptions, function(error, info){
																											if(error){
																												console.log(error);
																											}
																										});
																										
																										var mailOptions2 = {
																											from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
																											to: borrow.CreatedBy.Username+' <'+borrow.CreatedBy.Email+'>', // list of receivers
																											subject: '您同意了'+lenderBankaccount.OwnedBy.Username+'方才送來的欲借出訊息!', // Subject line
																											text: '親愛的 '+borrow.CreatedBy.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+'您同意了 '+lenderBankaccount.OwnedBy.Username+' 方才在「'+borrow.StoryTitle+'("http://'+req.headers.host+'/lender/story?id='+borrow._id+'")」送來的欲借出訊息！'+String.fromCharCode(10)+'您的交易紅利代碼為： '+library.randomString(8)+String.fromCharCode(10)+'您可至 玉山銀行網站("http://www.esunbank.com.tw/") 兌換紅利喔!'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看訊息與交易結果:'+String.fromCharCode(10)+'"http://lendingzone.herokuapp.com/lender/lenderSendMessages?msgKeyword='+newCreateUpdated._id+'&filter='+encodeURIComponent('已被同意')+'&sorter='+encodeURIComponent('最新')+'&page=1"', // plaintext body
																											html: '<img src="cid:bpng" /><br><br>親愛的 '+borrow.CreatedBy.Username+' 您好：<br><br>您同意了 '+lenderBankaccount.OwnedBy.Username+' 方才在「<a href="http://'+req.headers.host+'/lender/story?id='+borrow._id+'">'+borrow.StoryTitle+'</a>」送來的欲借出訊息！<br>您的交易紅利代碼為： <div style="color:#FF0000;display:inline;">'+library.randomString(8)+'</div><br>您可至 <a href="http://www.esunbank.com.tw/">玉山銀行網站</a> 兌換紅利喔!<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="http://lendingzone.herokuapp.com/lender/lenderSendMessages?msgKeyword='+newCreateUpdated._id+'&filter='+encodeURIComponent('已被同意')+'&sorter='+encodeURIComponent('最新')+'&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看訊息與交易結果</span></a></td></tr></table>', 
																											attachments: [{
																												filename: 'b.png',
																												path: __dirname+'/../public/images/b.png',
																												cid: 'bpng' //same cid value as in the html img src
																											}]
																										};
																										
																										transporter.sendMail(mailOptions2, function(error, info){
																											if(error){
																												console.log(error);
																											}
																										});
																									}
																									res.redirect('/lender/story?id='+req.body.FromBorrowRequest);
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
								}
							});
						}else{
							borrow.Message.push(newCreate._id);
							borrow.save(function (err,updatedBorrow) {
								if (err){
									console.log(err);
									res.redirect('/message?content='+encodeURIComponent('錯誤!'));
								}else{	
									if(library.ifMail){
										var mailOptions = {
											from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
											to: borrow.CreatedBy.Username+' <'+borrow.CreatedBy.Email+'>', // list of receivers
											subject: '您收到了來自'+lenderBankaccount.OwnedBy.Username+'的欲借出訊息!', // Subject line
											text: '親愛的 '+borrow.CreatedBy.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+lenderBankaccount.OwnedBy.Username+' 想要資助您在「'+borrow.StoryTitle+'("http://'+req.headers.host+'/lender/story?id='+borrow._id+'")」的借款需求！'+String.fromCharCode(10)+'了解他所提供的資訊來決定是否要接受資助吧！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"http://lendingzone.herokuapp.com/lender/lenderSendMessages?msgKeyword='+newCreate._id+'&filter='+encodeURIComponent('未被確認')+'&sorter='+encodeURIComponent('最新')+'&page=1"', // plaintext body
											html: '<img src="cid:dpng" /><br><br>親愛的 '+borrow.CreatedBy.Username+' 您好：<br><br>'+lenderBankaccount.OwnedBy.Username+' 想要資助您在「<a href="http://'+req.headers.host+'/lender/story?id='+borrow._id+'">'+borrow.StoryTitle+'</a>」的借款需求！<br>了解他所提供的資訊來決定是否要接受資助吧！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="http://lendingzone.herokuapp.com/lender/lenderSendMessages?msgKeyword='+newCreate._id+'&filter='+encodeURIComponent('未被確認')+'&sorter='+encodeURIComponent('最新')+'&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>', 
											attachments: [{
												filename: 'd.png',
												path: __dirname+'/../public/images/d.png',
												cid: 'dpng' //same cid value as in the html img src
											}]
										};
										
										transporter.sendMail(mailOptions, function(error, info){
											if(error){
												console.log(error);
											}
										});
										
										var mailOptions2 = {
											from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
											to: lenderBankaccount.OwnedBy.Username+' <'+lenderBankaccount.OwnedBy.Email+'>', // list of receivers
											subject: '您向'+borrow.CreatedBy.Username+'送出了欲借出訊息!', // Subject line
											text: '親愛的 '+lenderBankaccount.OwnedBy.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+'您在「'+borrow.StoryTitle+'("http://'+req.headers.host+'/lender/story?id='+borrow._id+'")」向 '+borrow.CreatedBy.Username+' 送出了欲借出訊息！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"http://lendingzone.herokuapp.com/lender/lenderSendMessages?msgKeyword='+newCreate._id+'&filter='+encodeURIComponent('未被確認')+'&sorter='+encodeURIComponent('最新')+'&page=1"', // plaintext body
											html: '<img src="cid:dpng" /><br><br>親愛的 '+lenderBankaccount.OwnedBy.Username+' 您好：<br><br>您在「<a href="http://'+req.headers.host+'/lender/story?id='+borrow._id+'">'+borrow.StoryTitle+'</a>」向 '+borrow.CreatedBy.Username+' 送出了欲借出訊息！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="http://lendingzone.herokuapp.com/lender/lenderSendMessages?msgKeyword='+newCreate._id+'&filter='+encodeURIComponent('未被確認')+'&sorter='+encodeURIComponent('最新')+'&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>', 
											attachments: [{
												filename: 'd.png',
												path: __dirname+'/../public/images/d.png',
												cid: 'dpng' //same cid value as in the html img src
											}]
										};
										
										transporter.sendMail(mailOptions2, function(error, info){
											if(error){
												console.log(error);
											}
										});
									}
									res.redirect('/lender/story?id='+req.body.FromBorrowRequest);
								}
							});
						}
					}
				});
			}else{
				res.redirect('/message?content='+encodeURIComponent('錯誤!請回到上頁重整頁面'));
			}
		}
	});
}

function toLendUpdatePart(res,req,innerPara,innerPara2,message){
	if(sanitizer.sanitize(req.body.Message.trim()) != ''){
		message.Message=sanitizer.sanitize(req.body.Message.trim());
	}else{
		message.Message='無內容';
	}
	message.MoneyToLend=parseInt(sanitizer.sanitize(req.body.MoneyToLend.trim()));
	message.InterestRate=(parseFloat(sanitizer.sanitize(req.body.InterestRate.trim()))/100)+library.serviceChargeRate;//scr
	message.MonthPeriod=parseInt(sanitizer.sanitize(req.body.MonthPeriod.trim()));
	message.Updated = Date.now();
	
	message.save(function (err,newUpdate) {
		if (err){
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('更新失敗!'));
		}else{
			if(library.ifMail){
				var mailOptions = {
					from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
					to: message.SendTo.Username+' <'+message.SendTo.Email+'>', // list of receivers
					subject: message.CreatedBy.Username+'更新了他先前送來的欲借出訊息!', // Subject line
					text: '親愛的 '+message.SendTo.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+message.CreatedBy.Username+' 更新了他先前在「'+message.FromBorrowRequest.StoryTitle+'("http://'+req.headers.host+'/lender/story?id='+message.FromBorrowRequest._id+'")」送來的欲借出訊息！'+String.fromCharCode(10)+'了解他所提供的資訊來決定是否要接受資助吧！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"http://lendingzone.herokuapp.com/lender/lenderSendMessages?msgKeyword='+newUpdate._id+'&filter='+encodeURIComponent('未被確認')+'&sorter='+encodeURIComponent('最新')+'&page=1"', // plaintext body
					html: '<img src="cid:dpng" /><br><br>親愛的 '+message.SendTo.Username+' 您好：<br><br>'+message.CreatedBy.Username+' 更新了他先前在「<a href="http://'+req.headers.host+'/lender/story?id='+message.FromBorrowRequest._id+'">'+message.FromBorrowRequest.StoryTitle+'</a>」送來的欲借出訊息！<br>了解他所提供的資訊來決定是否要接受資助吧！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="http://lendingzone.herokuapp.com/lender/lenderSendMessages?msgKeyword='+newUpdate._id+'&filter='+encodeURIComponent('未被確認')+'&sorter='+encodeURIComponent('最新')+'&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>', 
					attachments: [{
						filename: 'd.png',
						path: __dirname+'/../public/images/d.png',
						cid: 'dpng' //same cid value as in the html img src
					}]
				};
				
				transporter.sendMail(mailOptions, function(error, info){
					if(error){
						console.log(error);
					}
				});
				
				var mailOptions2 = {
					from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
					to: message.CreatedBy.Username+' <'+message.CreatedBy.Email+'>', // list of receivers
					subject: '您更新了先前向'+message.SendTo.Username+'送出的欲借出訊息!', // Subject line
					text: '親愛的 '+message.CreatedBy.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+'您更新了先前在「'+message.FromBorrowRequest.StoryTitle+'("http://'+req.headers.host+'/lender/story?id='+message.FromBorrowRequest._id+'")」向 '+message.SendTo.Username+' 送出的欲借出訊息！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"http://lendingzone.herokuapp.com/lender/lenderSendMessages?msgKeyword='+newUpdate._id+'&filter='+encodeURIComponent('未被確認')+'&sorter='+encodeURIComponent('最新')+'&page=1"', // plaintext body
					html: '<img src="cid:dpng" /><br><br>親愛的 '+message.CreatedBy.Username+' 您好：<br><br>您更新了先前在「<a href="http://'+req.headers.host+'/lender/story?id='+message.FromBorrowRequest._id+'">'+message.FromBorrowRequest.StoryTitle+'</a>」向 '+message.SendTo.Username+' 送出的欲借出訊息！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="http://lendingzone.herokuapp.com/lender/lenderSendMessages?msgKeyword='+newUpdate._id+'&filter='+encodeURIComponent('未被確認')+'&sorter='+encodeURIComponent('最新')+'&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>', 
					attachments: [{
						filename: 'd.png',
						path: __dirname+'/../public/images/d.png',
						cid: 'dpng' //same cid value as in the html img src
					}]
				};
				
				transporter.sendMail(mailOptions2, function(error, info){
					if(error){
						console.log(error);
					}
				});
			}
			res.redirect('/lender/story?id='+req.body.FromBorrowRequest);
		}
	});
}

router.post('/rejectToBorrowMessageInStory', library.ensureAuthenticated, function(req, res, next) {
	library.rejectMessage(false,0,0,null,req,res,false,'/lender/story?id='+req.body.FromBorrowRequest);
});

router.post('/confirmToBorrowMessageInStory', library.ensureAuthenticated, function(req, res, next) {
	var infoJson={info1:0,info2:0,info3:0,info4:0};
	library.confirmToBorrowMessage(false,0,0,null,req,res,false,'/lender/story?id='+req.body.FromBorrowRequest,true,infoJson);
});

router.post('/rejectToBorrowMessageInLRM', library.ensureAuthenticated, function(req, res, next) {
	var JSONobj=JSON.parse(req.body.JsonArrayString);
	req.body.array=JSONobj.array;
	if(req.body.array.length>0){
		library.rejectMessage(true,0,req.body.array.length,null,req,res,false,'/lender/lenderReceiveMessages?msgKeyword=&filter='+encodeURIComponent('已婉拒')+'&sorter='+encodeURIComponent('最新')+'&page=1');
	}
});

router.post('/confirmToBorrowMessageInLRM', library.ensureAuthenticated, function(req, res, next) {
	var JSONobj=JSON.parse(req.body.JsonArrayString);
	req.body.array=JSONobj.array;
	if(req.body.array.length>0){
		var infoJson={info1:0,info2:0,info3:0,info4:0};
		library.confirmToBorrowMessage(true,0,req.body.array.length,null,req,res,false,'/lender/lenderReceiveMessages?msgKeyword=&filter='+encodeURIComponent('已同意')+'&sorter='+encodeURIComponent('最新')+'&page=1',true,infoJson);
	}
});

router.get('/rejectToBorrowMessageInLRMall/:msgKeyword?/:sorter?', library.ensureAuthenticated, function(req, res, next) {
	if((typeof(req.query.msgKeyword) !== "undefined")&&(typeof(req.query.sorter) !== "undefined")){
		var msgKeyword=decodeURIComponent(req.query.msgKeyword);
		var sorter=decodeURIComponent(req.query.sorter);
		var sorterRec;
		if(sorter=='最新'){
			sorterRec="-Updated";
		}else if(sorter=='利率最高'){
			sorterRec="-InterestRate";
		}else if(sorter=='金額最高'){
			sorterRec="-MoneyToLend";
		}else if(sorter=='期數最多'){
			sorterRec="-MonthPeriod";
		}else if(sorter=='信用等級最高'){
			sorterRec="-Level";
		}else if(sorter=='預計總利息最高'){
			sorterRec="-Updated";
		}else if(sorter=='預計平均利息最高'){
			sorterRec="-Updated";
		}else if(sorter=='預計平均本利和最高'){
			sorterRec="-Updated";
		}else if(sorter=='預計利本比最高'){
			sorterRec="-Updated";
		}
		
		var stringArray=msgKeyword.replace(/\s\s+/g,' ').split(' ');
		var kewwordArray=[];
		for(i=0;i<stringArray.length;i++){
			kewwordArray.push(new RegExp(stringArray[i],'i'));
		}
		var msgObjID=null;
		if(mongoose.Types.ObjectId.isValid(stringArray[0])){
			msgObjID=mongoose.Types.ObjectId(stringArray[0]);
		}
		
		Messages.find({$and:[{"SendTo": req.user._id},{"Type": "toBorrow"},{"Status": "NotConfirmed"}]}).populate('CreatedBy', 'Username').populate('FromBorrowRequest', 'StoryTitle').sort(sorterRec).exec(function (err, messages){
			if (err) {
				console.log(err);
				res.redirect('/message?content='+'錯誤!');
			}else{
				if(messages.length==0){
					res.redirect('/message?content='+'錯誤!');
				}else{
					if((sorter=='預計總利息最高')||(sorter=='預計利本比最高')||(sorter=='預計平均利息最高')||(sorter=='預計平均本利和最高')){
						for(i=0;i<messages.length;i++){
							messages[i].InterestRate-=library.serviceChargeRate;//scr
							messages[i].InterestInFuture=library.interestInFutureCalculator(messages[i].MoneyToLend,messages[i].InterestRate,messages[i].MonthPeriod);
							if(messages[i].MoneyToLend>0){
								messages[i].InterestInFutureDivMoney=messages[i].InterestInFuture/messages[i].MoneyToLend;
							}else{
								messages[i].InterestInFutureDivMoney=0;
							}
							if(messages[i].MonthPeriod>0){
								messages[i].InterestInFutureMonth=messages[i].InterestInFuture/messages[i].MonthPeriod;
							}else{
								messages[i].InterestInFutureMonth=0;
							}
							if(messages[i].MonthPeriod>0){
								messages[i].InterestInFutureMoneyMonth=(messages[i].InterestInFuture+messages[i].MoneyToLend)/messages[i].MonthPeriod;
							}else{
								messages[i].InterestInFutureMoneyMonth=0;
							}
						}
						
						if(sorter=='預計總利息最高'){
							messages.sort(function(a,b) { return parseFloat(b.InterestInFuture) - parseFloat(a.InterestInFuture)} );
						}else if(sorter=='預計平均利息最高'){
							messages.sort(function(a,b) { return parseFloat(b.InterestInFutureMonth) - parseFloat(a.InterestInFutureMonth)} );
						}else if(sorter=='預計平均本利和最高'){
							messages.sort(function(a,b) { return parseFloat(b.InterestInFutureMoneyMonth) - parseFloat(a.InterestInFutureMoneyMonth)} );
						}else if(sorter=='預計利本比最高'){
							messages.sort(function(a,b) { return parseFloat(b.InterestInFutureDivMoney) - parseFloat(a.InterestInFutureDivMoney) } );
						}
					}
					
					for(j=messages.length-1;j>-1;j--){
						var localFlag=[];
						var ctr;
						localFlag[0]=false;
						localFlag[1]=false;
						localFlag[2]=false;
						localFlag[3]=false;
						
						if(msgObjID){
							if(msgObjID.equals(messages[j]._id)){
								localFlag[0]=true;
							}
						}
						
						ctr=0;
						for(k=0;k<kewwordArray.length;k++){
							if(messages[j].Message.search(kewwordArray[k])>-1){
								ctr++;
							}
						}
						if(ctr==kewwordArray.length){
							localFlag[1]=true;
						}
						
						ctr=0;
						for(k=0;k<kewwordArray.length;k++){
							if(messages[j].FromBorrowRequest.StoryTitle.search(kewwordArray[k])>-1){
								ctr++;
							}
						}
						if(ctr==kewwordArray.length){
							localFlag[2]=true;
						}
						
						ctr=0;
						for(k=0;k<kewwordArray.length;k++){
							if(messages[j].CreatedBy.Username.search(kewwordArray[k])>-1){
								ctr++;
							}
						}
						if(ctr==kewwordArray.length){
							localFlag[3]=true;
						}
						
						if((!localFlag[0])&&(!localFlag[1])&&(!localFlag[2])&&(!localFlag[3])){
							messages.splice(j, 1);
						}
					}
					
					if(messages.length==0){
						res.redirect('/message?content='+'錯誤!');
					}else{
						var arrayOp=[];
						for(i=0;i<messages.length;i++){
							var temp={MessageID:messages[i]._id};
							arrayOp.push(temp);
						}
						req.body.array=arrayOp;
						library.rejectMessage(true,0,req.body.array.length,null,req,res,false,'/lender/lenderReceiveMessages?msgKeyword=&filter='+encodeURIComponent('已婉拒')+'&sorter='+encodeURIComponent('最新')+'&page=1');
					}
				}
			}
		});
	}else{
		res.redirect('/');
	}
});

router.get('/confirmToBorrowMessageInLRMall/:msgKeyword?/:sorter?', library.ensureAuthenticated, function(req, res, next) {
	if((typeof(req.query.msgKeyword) !== "undefined")&&(typeof(req.query.sorter) !== "undefined")){
		var msgKeyword=decodeURIComponent(req.query.msgKeyword);
		var sorter=decodeURIComponent(req.query.sorter);
		var sorterRec;
		if(sorter=='最新'){
			sorterRec="-Updated";
		}else if(sorter=='利率最高'){
			sorterRec="-InterestRate";
		}else if(sorter=='金額最高'){
			sorterRec="-MoneyToLend";
		}else if(sorter=='期數最多'){
			sorterRec="-MonthPeriod";
		}else if(sorter=='信用等級最高'){
			sorterRec="-Level";
		}else if(sorter=='預計總利息最高'){
			sorterRec="-Updated";
		}else if(sorter=='預計平均利息最高'){
			sorterRec="-Updated";
		}else if(sorter=='預計平均本利和最高'){
			sorterRec="-Updated";
		}else if(sorter=='預計利本比最高'){
			sorterRec="-Updated";
		}
		
		var stringArray=msgKeyword.replace(/\s\s+/g,' ').split(' ');
		var kewwordArray=[];
		for(i=0;i<stringArray.length;i++){
			kewwordArray.push(new RegExp(stringArray[i],'i'));
		}
		var msgObjID=null;
		if(mongoose.Types.ObjectId.isValid(stringArray[0])){
			msgObjID=mongoose.Types.ObjectId(stringArray[0]);
		}
		
		Messages.find({$and:[{"SendTo": req.user._id},{"Type": "toBorrow"},{"Status": "NotConfirmed"}]}).populate('CreatedBy', 'Username').populate('FromBorrowRequest', 'StoryTitle').sort(sorterRec).exec(function (err, messages){
			if (err) {
				console.log(err);
				res.redirect('/message?content='+'錯誤!');
			}else{
				if(messages.length==0){
					res.redirect('/message?content='+'錯誤!');
				}else{
					if((sorter=='預計總利息最高')||(sorter=='預計利本比最高')||(sorter=='預計平均利息最高')||(sorter=='預計平均本利和最高')){
						for(i=0;i<messages.length;i++){
							messages[i].InterestRate-=library.serviceChargeRate;//scr
							messages[i].InterestInFuture=library.interestInFutureCalculator(messages[i].MoneyToLend,messages[i].InterestRate,messages[i].MonthPeriod);
							if(messages[i].MoneyToLend>0){
								messages[i].InterestInFutureDivMoney=messages[i].InterestInFuture/messages[i].MoneyToLend;
							}else{
								messages[i].InterestInFutureDivMoney=0;
							}
							if(messages[i].MonthPeriod>0){
								messages[i].InterestInFutureMonth=messages[i].InterestInFuture/messages[i].MonthPeriod;
							}else{
								messages[i].InterestInFutureMonth=0;
							}
							if(messages[i].MonthPeriod>0){
								messages[i].InterestInFutureMoneyMonth=(messages[i].InterestInFuture+messages[i].MoneyToLend)/messages[i].MonthPeriod;
							}else{
								messages[i].InterestInFutureMoneyMonth=0;
							}
						}
						
						if(sorter=='預計總利息最高'){
							messages.sort(function(a,b) { return parseFloat(b.InterestInFuture) - parseFloat(a.InterestInFuture)} );
						}else if(sorter=='預計平均利息最高'){
							messages.sort(function(a,b) { return parseFloat(b.InterestInFutureMonth) - parseFloat(a.InterestInFutureMonth)} );
						}else if(sorter=='預計平均本利和最高'){
							messages.sort(function(a,b) { return parseFloat(b.InterestInFutureMoneyMonth) - parseFloat(a.InterestInFutureMoneyMonth)} );
						}else if(sorter=='預計利本比最高'){
							messages.sort(function(a,b) { return parseFloat(b.InterestInFutureDivMoney) - parseFloat(a.InterestInFutureDivMoney) } );
						}
					}
					
					for(j=messages.length-1;j>-1;j--){
						var localFlag=[];
						var ctr;
						localFlag[0]=false;
						localFlag[1]=false;
						localFlag[2]=false;
						localFlag[3]=false;
						
						if(msgObjID){
							if(msgObjID.equals(messages[j]._id)){
								localFlag[0]=true;
							}
						}
						
						ctr=0;
						for(k=0;k<kewwordArray.length;k++){
							if(messages[j].Message.search(kewwordArray[k])>-1){
								ctr++;
							}
						}
						if(ctr==kewwordArray.length){
							localFlag[1]=true;
						}
						
						ctr=0;
						for(k=0;k<kewwordArray.length;k++){
							if(messages[j].FromBorrowRequest.StoryTitle.search(kewwordArray[k])>-1){
								ctr++;
							}
						}
						if(ctr==kewwordArray.length){
							localFlag[2]=true;
						}
						
						ctr=0;
						for(k=0;k<kewwordArray.length;k++){
							if(messages[j].CreatedBy.Username.search(kewwordArray[k])>-1){
								ctr++;
							}
						}
						if(ctr==kewwordArray.length){
							localFlag[3]=true;
						}
						
						if((!localFlag[0])&&(!localFlag[1])&&(!localFlag[2])&&(!localFlag[3])){
							messages.splice(j, 1);
						}
					}
					
					if(messages.length==0){
						res.redirect('/message?content='+'錯誤!');
					}else{
						var arrayOp=[];
						for(i=0;i<messages.length;i++){
							var temp={FromBorrowRequest:messages[i].FromBorrowRequest,MessageID:messages[i]._id};
							arrayOp.push(temp);
						}
						req.body.array=arrayOp;
						var infoJson={info1:0,info2:0,info3:0,info4:0};
						library.confirmToBorrowMessage(true,0,req.body.array.length,null,req,res,false,'/lender/lenderReceiveMessages?msgKeyword=&filter='+encodeURIComponent('已同意')+'&sorter='+encodeURIComponent('最新')+'&page=1',true,infoJson);
					}
				}
			}
		});
	}else{
		res.redirect('/');
	}
});

router.post('/toLendCreate', library.ensureAuthenticated, function(req, res, next) {
	toLendSamePart(res,req,toLendCreatePart,null);
});

router.post('/toLendUpdate', library.ensureAuthenticated, function(req, res, next) {
	Messages.findById(req.body._id).populate('SendTo', 'Username Email').populate('CreatedBy', 'Username Email').populate('FromBorrowRequest', 'StoryTitle').exec(function (err, message){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			if(!message){
				res.redirect('/message?content='+encodeURIComponent('未找到更新目標!'));
			}else{
				if(message.CreatedBy._id!=req.user._id){
					res.redirect('/message?content='+encodeURIComponent('認證錯誤!'));
				}else{
					toLendSamePart(res,req,toLendUpdatePart,message);
				}
			}
		}
	});
});

router.post('/destroy', library.ensureAuthenticated, function(req, res, next) {
	Messages.findById(req.body._id).exec(function (err, message){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			if(!message){
				res.redirect('/message?content='+encodeURIComponent('未找到刪除目標!'));
			}else{
				if(message.CreatedBy!=req.user._id){
					res.redirect('/message?content='+encodeURIComponent('認證錯誤!'));
				}else{
					Borrows.findById(message.FromBorrowRequest).exec(function (err, borrow){
						if (err) {
							console.log(err);
							res.redirect('/message?content='+encodeURIComponent('錯誤!'));
						}else{
							if(!borrow){
								res.redirect('/message?content='+encodeURIComponent('錯誤!'));
							}else{
								var ctr = -1;
								for (i = 0; i < borrow.Message.length; i++) {
									if (borrow.Message[i].toString() === message._id.toString()) {
										ctr=i;
										break;
									}
								};
								if(ctr>-1){
									borrow.Message.splice(ctr, 1);
								}
								borrow.save(function (err,updatedBorrow) {
									if (err){
										console.log(err);
										res.redirect('/message?content='+encodeURIComponent('錯誤!'));
									}else{	
										message.remove(function (err,removedItem) {
											if (err){
												console.log(err);
												res.redirect('/message?content='+encodeURIComponent('刪除失敗!'));
											}else{
												if(removedItem.Type=='toLend'){
													res.redirect('/lender/story?id='+req.body.FromBorrowRequest);
												}else if(removedItem.Type=='toBorrow'){
													res.redirect('/');
												}
											}
										});
									}
								});
							}
						}
					});
				}
			}
		}
	});
});

module.exports = router;
