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
				toCreate.FromBorrowRequest=id;
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
		}
	});
});

router.post('/destroyTest',function(req, res, next) {
	Messages.findById(req.body.MessageID).exec(function (err, message){
		if (err) {
			console.log(err);
			res.json({error: err.name}, 500);
		}else{
			if(!message){
				res.json({error:'no such message'}, 500);
			}else{
				Borrows.findById(message.FromBorrowRequest).exec(function (err, borrow){
					if (err) {
						console.log(err);
						res.json({error: err.name}, 500);
					}else{
						if(!borrow){
							res.json({error:'no such borrow'}, 500);
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
									res.json({error: err.name}, 500);
								}else{	
									message.remove(function (err,removedItem) {
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
							
							var errorTarget=[];
							var errorMessage=[];
							for(i=0;i<4;i++){
								errorTarget.push(false);
								errorMessage.push('');
							}
							
							if(sanitizer.sanitize(req.body.MoneyToLend.trim())==''){
								errorTarget[0]=true;
								errorMessage[0]='必要參數未填!';
							}else if(isNaN(nowMoney)){
								errorTarget[0]=true;
								errorMessage[0]='非數字參數!';
							}else if(nowMoney<1){
								errorTarget[0]=true;
								errorMessage[0]='錯誤參數!';
							}else if(nowMoney>maxMoney){
								errorTarget[0]=true;
								errorMessage[0]='金額超過您的銀行餘額：'+maxMoney.toFixed(0)+'元!';
							}else if(nowMoney>maxMoney2){
								errorTarget[0]=true;
								errorMessage[0]='金額超過對方所需：'+maxMoney2.toFixed(0)+'元!';
							}
							
							if(sanitizer.sanitize(req.body.InterestRate.trim())==''){
								errorTarget[1]=true;
								errorMessage[1]='必要參數未填!';
							}else if(isNaN(rate)){
								errorTarget[1]=true;
								errorMessage[1]='非數字參數!';
							}else if((rate<(0.0001+library.serviceChargeRate))||(rate>(0.99+library.serviceChargeRate))){
								errorTarget[1]=true;
								errorMessage[1]='錯誤參數!';
							}else if(rate>maxRate){
								errorTarget[1]=true;
								errorMessage[1]='超過期望利率上限：'+((maxRate-library.serviceChargeRate)*100).toFixed(2)+'%!';//scr
							}
							
							if(sanitizer.sanitize(req.body.MonthPeriod.trim())==''){
								errorTarget[2]=true;
								errorMessage[2]='必要參數未填!';
							}else if(isNaN(month)){
								errorTarget[2]=true;
								errorMessage[2]='非數字參數!';
							}else if((month<1)||(month>36)){
								errorTarget[2]=true;
								errorMessage[2]='錯誤參數!';
							}else if(month>maxMonth){
								errorTarget[2]=true;
								errorMessage[2]='超過對方可接受之最大期數：'+maxMonth.toFixed(0)+'個月!';
							}
							
							if(sanitizer.sanitize(req.body.Message.trim())=='無內容'){
								errorTarget[3]=true;
								errorMessage[3]='訊息內容不合規定!';
							}
							
							var valiFlag=true;
							for(i=0;i<errorTarget.length;i++){
								if(errorTarget[i]){
									valiFlag=false;
									break;
								}
							}
							
							if(valiFlag){
								if(!borrow.IfReadable){
									res.redirect('/message?content='+encodeURIComponent('借入方已不需要借款，請回上頁重整頁面!'));
								}else{
									differentPart(res,req,borrow,lenderBankaccount,outterPara);
								}
							}else{
								redirector(req,res,errorTarget,errorMessage);
							}	
						}
					}
				});
			}
		}
	});	
}

function redirector(req,res,target,message){
	var formContent={
		F1:req.body.MoneyToLend,
		F2:req.body.InterestRate,
		F3:req.body.MonthPeriod,
		F4:req.body.Message,
		F5:req.body.F5,
		F6:req.body.F6,
		F7:req.body.F7,
		F8:req.body.F8,
	};
	
	var json={FormContent:formContent,Target:target,Message:message};
	var string=JSON.stringify(json);
	
	req.flash('hendLendForm',string);
	res.redirect(req.get('referer'));
}

function toLendCreatePart(res,req,borrow,lenderBankaccount,outterPara){
	Messages.findOne({$and:[{"CreatedBy": req.user._id},{"SendTo": borrow.CreatedBy},{"FromBorrowRequest": req.body.FromBorrowRequest},{"Type": "toLend"}]}).exec(function (err, lendMessage){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			if(!lendMessage){
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
																														text: '親愛的 '+lenderBankaccount.OwnedBy.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+borrow.CreatedBy.Username+' 同意了您方才在「'+borrow.StoryTitle+'("http://'+req.headers.host+'/lender/story?id='+borrow._id+'")」送出的欲借出訊息！'+String.fromCharCode(10)+'您的交易紅利代碼為： '+library.randomString(8)+String.fromCharCode(10)+'您可至 玉山銀行網站("http://www.esunbank.com.tw/") 兌換紅利喔!'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看訊息與交易結果:'+String.fromCharCode(10)+'"http://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newCreateUpdated._id+'&filter='+encodeURIComponent('已被同意')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1"', // plaintext body
																														html: '<img src="cid:bpng" /><br><br>親愛的 '+lenderBankaccount.OwnedBy.Username+' 您好：<br><br>'+borrow.CreatedBy.Username+' 同意了您方才在「<a href="http://'+req.headers.host+'/lender/story?id='+borrow._id+'">'+borrow.StoryTitle+'</a>」送出的欲借出訊息！<br>您的交易紅利代碼為： <div style="color:#FF0000;display:inline;">'+library.randomString(8)+'</div><br>您可至 <a href="http://www.esunbank.com.tw/">玉山銀行網站</a> 兌換紅利喔!<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="http://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newCreateUpdated._id+'&filter='+encodeURIComponent('已被同意')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看訊息與交易結果</span></a></td></tr></table>', 
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
																														text: '親愛的 '+borrow.CreatedBy.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+'您同意了 '+lenderBankaccount.OwnedBy.Username+' 方才在「'+borrow.StoryTitle+'("http://'+req.headers.host+'/lender/story?id='+borrow._id+'")」送來的欲借出訊息！'+String.fromCharCode(10)+'您的交易紅利代碼為： '+library.randomString(8)+String.fromCharCode(10)+'您可至 玉山銀行網站("http://www.esunbank.com.tw/") 兌換紅利喔!'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看訊息與交易結果:'+String.fromCharCode(10)+'"http://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newCreateUpdated._id+'&filter='+encodeURIComponent('已被同意')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1"', // plaintext body
																														html: '<img src="cid:bpng" /><br><br>親愛的 '+borrow.CreatedBy.Username+' 您好：<br><br>您同意了 '+lenderBankaccount.OwnedBy.Username+' 方才在「<a href="http://'+req.headers.host+'/lender/story?id='+borrow._id+'">'+borrow.StoryTitle+'</a>」送來的欲借出訊息！<br>您的交易紅利代碼為： <div style="color:#FF0000;display:inline;">'+library.randomString(8)+'</div><br>您可至 <a href="http://www.esunbank.com.tw/">玉山銀行網站</a> 兌換紅利喔!<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="http://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newCreateUpdated._id+'&filter='+encodeURIComponent('已被同意')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看訊息與交易結果</span></a></td></tr></table>', 
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
														text: '親愛的 '+borrow.CreatedBy.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+lenderBankaccount.OwnedBy.Username+' 想要資助您在「'+borrow.StoryTitle+'("http://'+req.headers.host+'/lender/story?id='+borrow._id+'")」的借款需求！'+String.fromCharCode(10)+'了解他所提供的資訊來決定是否要接受資助吧！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"http://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newCreate._id+'&filter='+encodeURIComponent('未被確認')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1"', // plaintext body
														html: '<img src="cid:dpng" /><br><br>親愛的 '+borrow.CreatedBy.Username+' 您好：<br><br>'+lenderBankaccount.OwnedBy.Username+' 想要資助您在「<a href="http://'+req.headers.host+'/lender/story?id='+borrow._id+'">'+borrow.StoryTitle+'</a>」的借款需求！<br>了解他所提供的資訊來決定是否要接受資助吧！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="http://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newCreate._id+'&filter='+encodeURIComponent('未被確認')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>', 
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
														text: '親愛的 '+lenderBankaccount.OwnedBy.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+'您在「'+borrow.StoryTitle+'("http://'+req.headers.host+'/lender/story?id='+borrow._id+'")」向 '+borrow.CreatedBy.Username+' 送出了欲借出訊息！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"http://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newCreate._id+'&filter='+encodeURIComponent('未被確認')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1"', // plaintext body
														html: '<img src="cid:dpng" /><br><br>親愛的 '+lenderBankaccount.OwnedBy.Username+' 您好：<br><br>您在「<a href="http://'+req.headers.host+'/lender/story?id='+borrow._id+'">'+borrow.StoryTitle+'</a>」向 '+borrow.CreatedBy.Username+' 送出了欲借出訊息！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="http://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newCreate._id+'&filter='+encodeURIComponent('未被確認')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>', 
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
			}else{
				res.redirect('/message?content='+encodeURIComponent('錯誤!請回到上頁重整頁面'));
			}
		}
	});
}

function toLendUpdatePart(res,req,innerPara,innerPara2,message){
	if((message.Type=='toLend')&&(message.Status=='NotConfirmed')){
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
						text: '親愛的 '+message.SendTo.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+message.CreatedBy.Username+' 更新了他先前在「'+message.FromBorrowRequest.StoryTitle+'("http://'+req.headers.host+'/lender/story?id='+message.FromBorrowRequest._id+'")」送來的欲借出訊息！'+String.fromCharCode(10)+'了解他所提供的資訊來決定是否要接受資助吧！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"http://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newUpdate._id+'&filter='+encodeURIComponent('未被確認')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1"', // plaintext body
						html: '<img src="cid:dpng" /><br><br>親愛的 '+message.SendTo.Username+' 您好：<br><br>'+message.CreatedBy.Username+' 更新了他先前在「<a href="http://'+req.headers.host+'/lender/story?id='+message.FromBorrowRequest._id+'">'+message.FromBorrowRequest.StoryTitle+'</a>」送來的欲借出訊息！<br>了解他所提供的資訊來決定是否要接受資助吧！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="http://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newUpdate._id+'&filter='+encodeURIComponent('未被確認')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>', 
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
						text: '親愛的 '+message.CreatedBy.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+'您更新了先前在「'+message.FromBorrowRequest.StoryTitle+'("http://'+req.headers.host+'/lender/story?id='+message.FromBorrowRequest._id+'")」向 '+message.SendTo.Username+' 送出的欲借出訊息！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"http://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newUpdate._id+'&filter='+encodeURIComponent('未被確認')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1"', // plaintext body
						html: '<img src="cid:dpng" /><br><br>親愛的 '+message.CreatedBy.Username+' 您好：<br><br>您更新了先前在「<a href="http://'+req.headers.host+'/lender/story?id='+message.FromBorrowRequest._id+'">'+message.FromBorrowRequest.StoryTitle+'</a>」向 '+message.SendTo.Username+' 送出的欲借出訊息！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="http://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newUpdate._id+'&filter='+encodeURIComponent('未被確認')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>', 
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
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!請回到上頁重整頁面'));
	}
}

router.post('/rejectToBorrowMessageInStory',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	var infoJson={counter1:1,counter2:0};
	library.rejectMessage(false,0,0,null,req,res,false,'/lender/story?id='+req.body.FromBorrowRequest,infoJson);
});

router.post('/confirmToBorrowMessageInStory',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	var infoJson={counter1:1,counter2:0,info1:0,info2:0,info3:0,info4:0};
	library.confirmToBorrowMessage(false,0,0,null,req,res,false,'/lender/story?id='+req.body.FromBorrowRequest,true,infoJson);
});

router.post('/rejectToBorrowMessageInLRM',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	var JSONobj=JSON.parse(req.body.JsonArrayString);
	req.body.array=JSONobj.array;
	if(req.body.array.length>0){
		var infoJson={counter1:req.body.array.length,counter2:0};
		library.rejectMessage(true,0,req.body.array.length,null,req,res,false,'/lender/lenderReceiveMessages?msgKeyword=&filter='+encodeURIComponent('已婉拒')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1',infoJson);
	}
});

router.post('/confirmToBorrowMessageInLRM',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	var JSONobj=JSON.parse(req.body.JsonArrayString);
	req.body.array=JSONobj.array;
	if(req.body.array.length>0){
		var infoJson={counter1:req.body.array.length,counter2:0,info1:0,info2:0,info3:0,info4:0};
		library.confirmToBorrowMessage(true,0,req.body.array.length,null,req,res,false,'/lender/lenderReceiveMessages?msgKeyword=&filter='+encodeURIComponent('已同意')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1',true,infoJson);
	}
});

router.post('/rejectToBorrowMessageInLRMall',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	var msgKeyword=sanitizer.sanitize(req.body.msgKeyword.trim());
	var sorter=sanitizer.sanitize(req.body.sorter.trim());
	var director=sanitizer.sanitize(req.body.director.trim());
	var lbound=sanitizer.sanitize(req.body.lbound.trim());
	var ubound=sanitizer.sanitize(req.body.ubound.trim());
	
	if((director!='大至小')&&(director!='小至大')){
		director='大至小';
	}
	
	var sorterRec=null;
	var sorterRecReserve=null;
	
	if(sorter=='更新日期'){
		sorterRecReserve='Updated';
	}else if(sorter=='建立日期'){
		sorterRecReserve='Created';
	}else if(sorter=='利率'){
		sorterRecReserve='InterestRate';
	}else if(sorter=='金額'){
		sorterRecReserve='MoneyToLend';
	}else if(sorter=='期數'){
		sorterRecReserve='MonthPeriod';
	}else if(sorter=='信用等級'){
		sorterRecReserve='Level';
	}else if(sorter=='預計總利息'){
		sorterRecReserve='Updated';
	}else if(sorter=='預計平均利息'){
		sorterRecReserve='Updated';
	}else if(sorter=='預計平均本利和'){
		sorterRecReserve='Updated';
	}else if(sorter=='預計利本比'){
		sorterRecReserve='Updated';
	}else{
		sorterRecReserve='Updated';
		sorter='更新日期';
	}
	sorterRec=library.directorDivider(director,sorterRecReserve,true);
	
	var lboundRec=null;
	var uboundRec=null;
	var revereDetector1=null;
	var revereDetector2=null;
	if((sorter=='利率')||(sorter=='預計利本比')){
		var tester;
		if(lbound.trim()!=''){
			tester=parseFloat(lbound);
			if(!isNaN(tester)){
				if(tester>=0){
					if(sorter=='利率'){
						lboundRec=(tester/100)+library.serviceChargeRate;//scr
					}else if(sorter=='預計利本比'){
						lboundRec=(tester/100);
					}
				}else{
					lbound='';
				}
			}else{
				lbound='';
			}
		}
		if(ubound.trim()!=''){
			tester=parseFloat(ubound);
			if(!isNaN(tester)){
				if(tester>=0){
					if(sorter=='利率'){
						uboundRec=(tester/100)+library.serviceChargeRate;//scr
					}else if(sorter=='預計利本比'){
						uboundRec=(tester/100);
					}
				}else{
					ubound='';
				}
			}else{
				ubound='';
			}
		}
		revereDetector1=lboundRec;
		revereDetector2=uboundRec;
	}else if((sorter=='更新日期')||(sorter=='建立日期')){
		var tester;
		if(lbound.trim()!=''){
			tester=Date.parse(lbound);
			if(!isNaN(tester)){
				lboundRec=new Date(tester);
			}else{
				lbound='';
			}
		}
		if(ubound.trim()!=''){
			tester=Date.parse(ubound);
			if(!isNaN(tester)){
				uboundRec=new Date(tester);
			}else{
				ubound='';
			}
		}
		if(lboundRec!==null){
			revereDetector1=lboundRec.getTime();
		}
		if(uboundRec!==null){
			revereDetector2=uboundRec.getTime();
		}
	}else{
		var tester;
		if(lbound.trim()!=''){
			tester=parseInt(lbound);
			if(!isNaN(tester)){
				if(tester>=0){
					lboundRec=tester;
				}else{
					lbound='';
				}
			}else{
				lbound='';
			}
		}
		if(ubound.trim()!=''){
			tester=parseInt(ubound);
			if(!isNaN(tester)){
				if(tester>=0){
					uboundRec=tester;
				}else{
					ubound='';
				}
			}else{
				ubound='';
			}
		}
		revereDetector1=lboundRec;
		revereDetector2=uboundRec;
	}
	if((revereDetector1!==null)&&(revereDetector2!==null)){
		if(revereDetector1>revereDetector2){
			var temp;
			temp=lboundRec;
			lboundRec=uboundRec;
			uboundRec=temp;
			temp=lbound;
			lbound=ubound;
			ubound=temp;
		}
	}
	
	var andFindCmdAry=[];
	andFindCmdAry.push({"SendTo": req.user._id});
	andFindCmdAry.push({"Type": "toBorrow"});
	andFindCmdAry.push({"Status": "NotConfirmed"});
	
	if((sorter!='預計總利息')&&(sorter!='預計平均利息')&&(sorter!='預計平均本利和')&&(sorter!='預計利本比')){
		var jsonTemp={};
		if((lboundRec!==null)&&(uboundRec!==null)){
			jsonTemp[sorterRecReserve]={"$gte": lboundRec, "$lte": uboundRec};
			andFindCmdAry.push(jsonTemp);
		}else if(lboundRec!==null){
			jsonTemp[sorterRecReserve]={"$gte": lboundRec};
			andFindCmdAry.push(jsonTemp);
		}else if(uboundRec!==null){
			jsonTemp[sorterRecReserve]={"$lte": uboundRec};
			andFindCmdAry.push(jsonTemp);
		}
	}
	
	var msgKeyword=msgKeyword.replace(/\s\s+/g,' ');
	var stringArray=msgKeyword.split(' ');
	var keywordArray=[];
	for(i=0;i<stringArray.length;i++){
		keywordArray.push(new RegExp(stringArray[i],'i'));
	}
	var msgObjID=null;
	if(mongoose.Types.ObjectId.isValid(stringArray[0])){
		msgObjID=mongoose.Types.ObjectId(stringArray[0]);
	}
	
	Messages.find({$and:andFindCmdAry}).populate('CreatedBy', 'Username').populate('FromBorrowRequest', 'StoryTitle').sort(sorterRec).exec(function (err, messages){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			if(messages.length==0){
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}else{
				for(j=messages.length-1;j>-1;j--){
					var testString=messages[j].Message+' '+messages[j].FromBorrowRequest.StoryTitle+' '+messages[j].CreatedBy.Username;
					var localFlag=[];
					var ctr;
					localFlag[0]=false;
					localFlag[1]=false;
					
					if(msgObjID){
						if(msgObjID.equals(messages[j]._id)){
							localFlag[0]=true;
						}
					}
					
					ctr=0;
					for(k=0;k<keywordArray.length;k++){
						if(testString.search(keywordArray[k])>-1){
							ctr++;
						}
					}
					if(ctr==keywordArray.length){
						localFlag[1]=true;
					}
					
					if((!localFlag[0])&&(!localFlag[1])){
						messages.splice(j, 1);
					}
				}
				
				if((sorter=='預計總利息')||(sorter=='預計利本比')||(sorter=='預計平均利息')||(sorter=='預計平均本利和')){
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
					
					if(sorter=='預計總利息'){
						if(director=='大至小'){
							messages.sort(function(a,b) { return parseFloat(b.InterestInFuture) - parseFloat(a.InterestInFuture)} );
						}else if(director=='小至大'){
							messages.sort(function(a,b) { return parseFloat(a.InterestInFuture) - parseFloat(b.InterestInFuture)} );
						}
						library.arrayFilter(messages,'InterestInFuture',lboundRec,uboundRec);	
					}else if(sorter=='預計平均利息'){
						if(director=='大至小'){
							messages.sort(function(a,b) { return parseFloat(b.InterestInFutureMonth) - parseFloat(a.InterestInFutureMonth)} );
						}else if(director=='小至大'){
							messages.sort(function(a,b) { return parseFloat(a.InterestInFutureMonth) - parseFloat(b.InterestInFutureMonth)} );
						}
						library.arrayFilter(messages,'InterestInFutureMonth',lboundRec,uboundRec);	
					}else if(sorter=='預計平均本利和'){
						if(director=='大至小'){
							messages.sort(function(a,b) { return parseFloat(b.InterestInFutureMoneyMonth) - parseFloat(a.InterestInFutureMoneyMonth)} );
						}else if(director=='小至大'){
							messages.sort(function(a,b) { return parseFloat(a.InterestInFutureMoneyMonth) - parseFloat(b.InterestInFutureMoneyMonth)} );
						}
						library.arrayFilter(messages,'InterestInFutureMoneyMonth',lboundRec,uboundRec);	
					}else if(sorter=='預計利本比'){
						if(director=='大至小'){
							messages.sort(function(a,b) { return parseFloat(b.InterestInFutureDivMoney) - parseFloat(a.InterestInFutureDivMoney)} );
						}else if(director=='小至大'){
							messages.sort(function(a,b) { return parseFloat(a.InterestInFutureDivMoney) - parseFloat(b.InterestInFutureDivMoney)} );
						}
						library.arrayFilter(messages,'InterestInFutureDivMoney',lboundRec,uboundRec);	
					}
				}
				
				if(messages.length==0){
					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
				}else{
					var arrayOp=[];
					for(i=0;i<messages.length;i++){
						var temp={MessageID:messages[i]._id};
						arrayOp.push(temp);
					}
					req.body.array=arrayOp;
					var infoJson={counter1:req.body.array.length,counter2:0};
					library.rejectMessage(true,0,req.body.array.length,null,req,res,false,'/lender/lenderReceiveMessages?msgKeyword=&filter='+encodeURIComponent('已婉拒')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1',infoJson);
				}
			}
		}
	});
});

router.post('/confirmToBorrowMessageInLRMall',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	var msgKeyword=sanitizer.sanitize(req.body.msgKeyword.trim());
	var sorter=sanitizer.sanitize(req.body.sorter.trim());
	var director=sanitizer.sanitize(req.body.director.trim());
	var lbound=sanitizer.sanitize(req.body.lbound.trim());
	var ubound=sanitizer.sanitize(req.body.ubound.trim());
	
	if((director!='大至小')&&(director!='小至大')){
		director='大至小';
	}
	
	var sorterRec=null;
	var sorterRecReserve=null;
	
	if(sorter=='更新日期'){
		sorterRecReserve='Updated';
	}else if(sorter=='建立日期'){
		sorterRecReserve='Created';
	}else if(sorter=='利率'){
		sorterRecReserve='InterestRate';
	}else if(sorter=='金額'){
		sorterRecReserve='MoneyToLend';
	}else if(sorter=='期數'){
		sorterRecReserve='MonthPeriod';
	}else if(sorter=='信用等級'){
		sorterRecReserve='Level';
	}else if(sorter=='預計總利息'){
		sorterRecReserve='Updated';
	}else if(sorter=='預計平均利息'){
		sorterRecReserve='Updated';
	}else if(sorter=='預計平均本利和'){
		sorterRecReserve='Updated';
	}else if(sorter=='預計利本比'){
		sorterRecReserve='Updated';
	}else{
		sorterRecReserve='Updated';
		sorter='更新日期';
	}
	sorterRec=library.directorDivider(director,sorterRecReserve,true);
	
	var lboundRec=null;
	var uboundRec=null;
	var revereDetector1=null;
	var revereDetector2=null;
	if((sorter=='利率')||(sorter=='預計利本比')){
		var tester;
		if(lbound.trim()!=''){
			tester=parseFloat(lbound);
			if(!isNaN(tester)){
				if(tester>=0){
					if(sorter=='利率'){
						lboundRec=(tester/100)+library.serviceChargeRate;//scr
					}else if(sorter=='預計利本比'){
						lboundRec=(tester/100);
					}
				}else{
					lbound='';
				}
			}else{
				lbound='';
			}
		}
		if(ubound.trim()!=''){
			tester=parseFloat(ubound);
			if(!isNaN(tester)){
				if(tester>=0){
					if(sorter=='利率'){
						uboundRec=(tester/100)+library.serviceChargeRate;//scr
					}else if(sorter=='預計利本比'){
						uboundRec=(tester/100);
					}
				}else{
					ubound='';
				}
			}else{
				ubound='';
			}
		}
		revereDetector1=lboundRec;
		revereDetector2=uboundRec;
	}else if((sorter=='更新日期')||(sorter=='建立日期')){
		var tester;
		if(lbound.trim()!=''){
			tester=Date.parse(lbound);
			if(!isNaN(tester)){
				lboundRec=new Date(tester);
			}else{
				lbound='';
			}
		}
		if(ubound.trim()!=''){
			tester=Date.parse(ubound);
			if(!isNaN(tester)){
				uboundRec=new Date(tester);
			}else{
				ubound='';
			}
		}
		if(lboundRec!==null){
			revereDetector1=lboundRec.getTime();
		}
		if(uboundRec!==null){
			revereDetector2=uboundRec.getTime();
		}
	}else{
		var tester;
		if(lbound.trim()!=''){
			tester=parseInt(lbound);
			if(!isNaN(tester)){
				if(tester>=0){
					lboundRec=tester;
				}else{
					lbound='';
				}
			}else{
				lbound='';
			}
		}
		if(ubound.trim()!=''){
			tester=parseInt(ubound);
			if(!isNaN(tester)){
				if(tester>=0){
					uboundRec=tester;
				}else{
					ubound='';
				}
			}else{
				ubound='';
			}
		}
		revereDetector1=lboundRec;
		revereDetector2=uboundRec;
	}
	if((revereDetector1!==null)&&(revereDetector2!==null)){
		if(revereDetector1>revereDetector2){
			var temp;
			temp=lboundRec;
			lboundRec=uboundRec;
			uboundRec=temp;
			temp=lbound;
			lbound=ubound;
			ubound=temp;
		}
	}
	
	var andFindCmdAry=[];
	andFindCmdAry.push({"SendTo": req.user._id});
	andFindCmdAry.push({"Type": "toBorrow"});
	andFindCmdAry.push({"Status": "NotConfirmed"});
	
	if((sorter!='預計總利息')&&(sorter!='預計平均利息')&&(sorter!='預計平均本利和')&&(sorter!='預計利本比')){
		var jsonTemp={};
		if((lboundRec!==null)&&(uboundRec!==null)){
			jsonTemp[sorterRecReserve]={"$gte": lboundRec, "$lte": uboundRec};
			andFindCmdAry.push(jsonTemp);
		}else if(lboundRec!==null){
			jsonTemp[sorterRecReserve]={"$gte": lboundRec};
			andFindCmdAry.push(jsonTemp);
		}else if(uboundRec!==null){
			jsonTemp[sorterRecReserve]={"$lte": uboundRec};
			andFindCmdAry.push(jsonTemp);
		}
	}
	
	var msgKeyword=msgKeyword.replace(/\s\s+/g,' ');
	var stringArray=msgKeyword.split(' ');
	var keywordArray=[];
	for(i=0;i<stringArray.length;i++){
		keywordArray.push(new RegExp(stringArray[i],'i'));
	}
	var msgObjID=null;
	if(mongoose.Types.ObjectId.isValid(stringArray[0])){
		msgObjID=mongoose.Types.ObjectId(stringArray[0]);
	}
	
	Messages.find({$and:andFindCmdAry}).populate('CreatedBy', 'Username').populate('FromBorrowRequest', 'StoryTitle').sort(sorterRec).exec(function (err, messages){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			if(messages.length==0){
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}else{
				for(j=messages.length-1;j>-1;j--){
					var testString=messages[j].Message+' '+messages[j].FromBorrowRequest.StoryTitle+' '+messages[j].CreatedBy.Username;
					var localFlag=[];
					var ctr;
					localFlag[0]=false;
					localFlag[1]=false;
					
					if(msgObjID){
						if(msgObjID.equals(messages[j]._id)){
							localFlag[0]=true;
						}
					}
					
					ctr=0;
					for(k=0;k<keywordArray.length;k++){
						if(testString.search(keywordArray[k])>-1){
							ctr++;
						}
					}
					if(ctr==keywordArray.length){
						localFlag[1]=true;
					}
					
					if((!localFlag[0])&&(!localFlag[1])){
						messages.splice(j, 1);
					}
				}
				
				if((sorter=='預計總利息')||(sorter=='預計利本比')||(sorter=='預計平均利息')||(sorter=='預計平均本利和')){
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
					
					if(sorter=='預計總利息'){
						if(director=='大至小'){
							messages.sort(function(a,b) { return parseFloat(b.InterestInFuture) - parseFloat(a.InterestInFuture)} );
						}else if(director=='小至大'){
							messages.sort(function(a,b) { return parseFloat(a.InterestInFuture) - parseFloat(b.InterestInFuture)} );
						}
						library.arrayFilter(messages,'InterestInFuture',lboundRec,uboundRec);	
					}else if(sorter=='預計平均利息'){
						if(director=='大至小'){
							messages.sort(function(a,b) { return parseFloat(b.InterestInFutureMonth) - parseFloat(a.InterestInFutureMonth)} );
						}else if(director=='小至大'){
							messages.sort(function(a,b) { return parseFloat(a.InterestInFutureMonth) - parseFloat(b.InterestInFutureMonth)} );
						}
						library.arrayFilter(messages,'InterestInFutureMonth',lboundRec,uboundRec);	
					}else if(sorter=='預計平均本利和'){
						if(director=='大至小'){
							messages.sort(function(a,b) { return parseFloat(b.InterestInFutureMoneyMonth) - parseFloat(a.InterestInFutureMoneyMonth)} );
						}else if(director=='小至大'){
							messages.sort(function(a,b) { return parseFloat(a.InterestInFutureMoneyMonth) - parseFloat(b.InterestInFutureMoneyMonth)} );
						}
						library.arrayFilter(messages,'InterestInFutureMoneyMonth',lboundRec,uboundRec);	
					}else if(sorter=='預計利本比'){
						if(director=='大至小'){
							messages.sort(function(a,b) { return parseFloat(b.InterestInFutureDivMoney) - parseFloat(a.InterestInFutureDivMoney)} );
						}else if(director=='小至大'){
							messages.sort(function(a,b) { return parseFloat(a.InterestInFutureDivMoney) - parseFloat(b.InterestInFutureDivMoney)} );
						}
						library.arrayFilter(messages,'InterestInFutureDivMoney',lboundRec,uboundRec);	
					}
				}
				
				if(messages.length==0){
					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
				}else{
					var arrayOp=[];
					for(i=0;i<messages.length;i++){
						var temp={FromBorrowRequest:messages[i].FromBorrowRequest,MessageID:messages[i]._id};
						arrayOp.push(temp);
					}
					req.body.array=arrayOp;
					var infoJson={counter1:req.body.array.length,counter2:0,info1:0,info2:0,info3:0,info4:0};
					library.confirmToBorrowMessage(true,0,req.body.array.length,null,req,res,false,'/lender/lenderReceiveMessages?msgKeyword=&filter='+encodeURIComponent('已同意')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1',true,infoJson);
				}
			}
		}
	});
});

router.post('/deleteToLendMessageInLRM',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	console.log('hahaha');
	var JSONobj=JSON.parse(req.body.JsonArrayString);
	req.body.array=JSONobj.array;
	if(req.body.array.length>0){
		var infoJson={counter1:req.body.array.length,counter2:0};
		var address='/lender/lenderSendMessages?msgKeyword=&filter='+encodeURIComponent('未被確認')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1';
		deleteMessage(0,req.body.array.length,null,req,res,infoJson,address);
	}
});

router.post('/deleteToLendMessageInLRMall',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	var msgKeyword=sanitizer.sanitize(req.body.msgKeyword.trim());
	var sorter=sanitizer.sanitize(req.body.sorter.trim());
	var director=sanitizer.sanitize(req.body.director.trim());
	var lbound=sanitizer.sanitize(req.body.lbound.trim());
	var ubound=sanitizer.sanitize(req.body.ubound.trim());
	
	if((director!='大至小')&&(director!='小至大')){
		director='大至小';
	}
	
	var sorterRec=null;
	var sorterRecReserve=null;
	
	if(sorter=='更新日期'){
		sorterRecReserve='Updated';
	}else if(sorter=='建立日期'){
		sorterRecReserve='Created';
	}else if(sorter=='利率'){
		sorterRecReserve='InterestRate';
	}else if(sorter=='金額'){
		sorterRecReserve='MoneyToLend';
	}else if(sorter=='期數'){
		sorterRecReserve='MonthPeriod';
	}else if(sorter=='信用等級'){
		sorterRecReserve='Level';
	}else if(sorter=='預計總利息'){
		sorterRecReserve='Updated';
	}else if(sorter=='預計平均利息'){
		sorterRecReserve='Updated';
	}else if(sorter=='預計平均本利和'){
		sorterRecReserve='Updated';
	}else if(sorter=='預計利本比'){
		sorterRecReserve='Updated';
	}else{
		sorterRecReserve='Updated';
		sorter='更新日期';
	}
	sorterRec=library.directorDivider(director,sorterRecReserve,true);
	
	var lboundRec=null;
	var uboundRec=null;
	var revereDetector1=null;
	var revereDetector2=null;
	if((sorter=='利率')||(sorter=='預計利本比')){
		var tester;
		if(lbound.trim()!=''){
			tester=parseFloat(lbound);
			if(!isNaN(tester)){
				if(tester>=0){
					if(sorter=='利率'){
						lboundRec=(tester/100)+library.serviceChargeRate;//scr
					}else if(sorter=='預計利本比'){
						lboundRec=(tester/100);
					}
				}else{
					lbound='';
				}
			}else{
				lbound='';
			}
		}
		if(ubound.trim()!=''){
			tester=parseFloat(ubound);
			if(!isNaN(tester)){
				if(tester>=0){
					if(sorter=='利率'){
						uboundRec=(tester/100)+library.serviceChargeRate;//scr
					}else if(sorter=='預計利本比'){
						uboundRec=(tester/100);
					}
				}else{
					ubound='';
				}
			}else{
				ubound='';
			}
		}
		revereDetector1=lboundRec;
		revereDetector2=uboundRec;
	}else if((sorter=='更新日期')||(sorter=='建立日期')){
		var tester;
		if(lbound.trim()!=''){
			tester=Date.parse(lbound);
			if(!isNaN(tester)){
				lboundRec=new Date(tester);
			}else{
				lbound='';
			}
		}
		if(ubound.trim()!=''){
			tester=Date.parse(ubound);
			if(!isNaN(tester)){
				uboundRec=new Date(tester);
			}else{
				ubound='';
			}
		}
		if(lboundRec!==null){
			revereDetector1=lboundRec.getTime();
		}
		if(uboundRec!==null){
			revereDetector2=uboundRec.getTime();
		}
	}else{
		var tester;
		if(lbound.trim()!=''){
			tester=parseInt(lbound);
			if(!isNaN(tester)){
				if(tester>=0){
					lboundRec=tester;
				}else{
					lbound='';
				}
			}else{
				lbound='';
			}
		}
		if(ubound.trim()!=''){
			tester=parseInt(ubound);
			if(!isNaN(tester)){
				if(tester>=0){
					uboundRec=tester;
				}else{
					ubound='';
				}
			}else{
				ubound='';
			}
		}
		revereDetector1=lboundRec;
		revereDetector2=uboundRec;
	}
	if((revereDetector1!==null)&&(revereDetector2!==null)){
		if(revereDetector1>revereDetector2){
			var temp;
			temp=lboundRec;
			lboundRec=uboundRec;
			uboundRec=temp;
			temp=lbound;
			lbound=ubound;
			ubound=temp;
		}
	}
	
	var andFindCmdAry=[];
	andFindCmdAry.push({"CreatedBy": req.user._id});
	andFindCmdAry.push({"Type": "toLend"});
	andFindCmdAry.push({"Status": "NotConfirmed"});
	
	if((sorter!='預計總利息')&&(sorter!='預計平均利息')&&(sorter!='預計平均本利和')&&(sorter!='預計利本比')){
		var jsonTemp={};
		if((lboundRec!==null)&&(uboundRec!==null)){
			jsonTemp[sorterRecReserve]={"$gte": lboundRec, "$lte": uboundRec};
			andFindCmdAry.push(jsonTemp);
		}else if(lboundRec!==null){
			jsonTemp[sorterRecReserve]={"$gte": lboundRec};
			andFindCmdAry.push(jsonTemp);
		}else if(uboundRec!==null){
			jsonTemp[sorterRecReserve]={"$lte": uboundRec};
			andFindCmdAry.push(jsonTemp);
		}
	}
	
	var msgKeyword=msgKeyword.replace(/\s\s+/g,' ');
	var stringArray=msgKeyword.split(' ');
	var keywordArray=[];
	for(i=0;i<stringArray.length;i++){
		keywordArray.push(new RegExp(stringArray[i],'i'));
	}
	var msgObjID=null;
	if(mongoose.Types.ObjectId.isValid(stringArray[0])){
		msgObjID=mongoose.Types.ObjectId(stringArray[0]);
	}
	
	Messages.find({$and:andFindCmdAry}).populate('SendTo', 'Username').populate('FromBorrowRequest', 'StoryTitle').sort(sorterRec).exec(function (err, messages){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			if(messages.length==0){
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}else{
				for(j=messages.length-1;j>-1;j--){
					var testString=messages[j].Message+' '+messages[j].FromBorrowRequest.StoryTitle+' '+messages[j].SendTo.Username;
					var localFlag=[];
					var ctr;
					localFlag[0]=false;
					localFlag[1]=false;
					
					if(msgObjID){
						if(msgObjID.equals(messages[j]._id)){
							localFlag[0]=true;
						}
					}
					
					ctr=0;
					for(k=0;k<keywordArray.length;k++){
						if(testString.search(keywordArray[k])>-1){
							ctr++;
						}
					}
					if(ctr==keywordArray.length){
						localFlag[1]=true;
					}
					
					if((!localFlag[0])&&(!localFlag[1])){
						messages.splice(j, 1);
					}
				}
				
				if((sorter=='預計總利息')||(sorter=='預計利本比')||(sorter=='預計平均利息')||(sorter=='預計平均本利和')){
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
					
					if(sorter=='預計總利息'){
						if(director=='大至小'){
							messages.sort(function(a,b) { return parseFloat(b.InterestInFuture) - parseFloat(a.InterestInFuture)} );
						}else if(director=='小至大'){
							messages.sort(function(a,b) { return parseFloat(a.InterestInFuture) - parseFloat(b.InterestInFuture)} );
						}
						library.arrayFilter(messages,'InterestInFuture',lboundRec,uboundRec);	
					}else if(sorter=='預計平均利息'){
						if(director=='大至小'){
							messages.sort(function(a,b) { return parseFloat(b.InterestInFutureMonth) - parseFloat(a.InterestInFutureMonth)} );
						}else if(director=='小至大'){
							messages.sort(function(a,b) { return parseFloat(a.InterestInFutureMonth) - parseFloat(b.InterestInFutureMonth)} );
						}
						library.arrayFilter(messages,'InterestInFutureMonth',lboundRec,uboundRec);	
					}else if(sorter=='預計平均本利和'){
						if(director=='大至小'){
							messages.sort(function(a,b) { return parseFloat(b.InterestInFutureMoneyMonth) - parseFloat(a.InterestInFutureMoneyMonth)} );
						}else if(director=='小至大'){
							messages.sort(function(a,b) { return parseFloat(a.InterestInFutureMoneyMonth) - parseFloat(b.InterestInFutureMoneyMonth)} );
						}
						library.arrayFilter(messages,'InterestInFutureMoneyMonth',lboundRec,uboundRec);	
					}else if(sorter=='預計利本比'){
						if(director=='大至小'){
							messages.sort(function(a,b) { return parseFloat(b.InterestInFutureDivMoney) - parseFloat(a.InterestInFutureDivMoney)} );
						}else if(director=='小至大'){
							messages.sort(function(a,b) { return parseFloat(a.InterestInFutureDivMoney) - parseFloat(b.InterestInFutureDivMoney)} );
						}
						library.arrayFilter(messages,'InterestInFutureDivMoney',lboundRec,uboundRec);	
					}
				}
				
				if(messages.length==0){
					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
				}else{
					var arrayOp=[];
					for(i=0;i<messages.length;i++){
						var temp={MessageID:messages[i]._id};
						arrayOp.push(temp);
					}
					req.body.array=arrayOp;
					var infoJson={counter1:req.body.array.length,counter2:0};
					var address='/lender/lenderSendMessages?msgKeyword=&filter='+encodeURIComponent('未被確認')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1';
					deleteMessage(0,req.body.array.length,null,req,res,infoJson,address);
				}
			}
		}
	});
});

router.post('/toLendCreate',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	toLendSamePart(res,req,toLendCreatePart,null);
});

router.post('/toLendUpdate',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
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

router.post('/destroy',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
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
					if(message.Status=='NotConfirmed'){
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
					}else{
						res.redirect('/message?content='+encodeURIComponent('錯誤!請回到上頁重整頁面'));
					}
				}
			}
		}
	});
});

function deleteMessage(ctr,ctrTarget,returnSring,req,res,infoJson,address){
	Messages.findById(req.body.array[ctr].MessageID).exec(function (err, message){
		if (err) {
			console.log(err);
			ctr++;
			if(ctr<ctrTarget){
				deleteMessage(ctr,ctrTarget,'有些訊息因錯誤無法刪除!',req,res,infoJson,address);
			}else{
				deleteRedirector(req,res,'有些訊息因錯誤無法刪除!',infoJson,address);
			}
		}else{
			if(!message){
				ctr++;
				if(ctr<ctrTarget){
					deleteMessage(ctr,ctrTarget,'有些訊息因錯誤無法刪除!',req,res,infoJson,address);
				}else{
					deleteRedirector(req,res,'有些訊息因錯誤無法刪除!',infoJson,address);
				}
			}else{
				if(message.CreatedBy!=req.user._id){
					res.redirect('/message?content='+encodeURIComponent('認證錯誤!'));
				}else{
					if(message.Status=='NotConfirmed'){
						Borrows.findById(message.FromBorrowRequest).exec(function (err, borrow){
							if (err) {
								console.log(err);
								ctr++;
								if(ctr<ctrTarget){
									deleteMessage(ctr,ctrTarget,'有些訊息因錯誤無法刪除!',req,res,infoJson,address);
								}else{
									deleteRedirector(req,res,'有些訊息因錯誤無法刪除!',infoJson,address);
								}
							}else{
								if(!borrow){
									ctr++;
									if(ctr<ctrTarget){
										deleteMessage(ctr,ctrTarget,'有些訊息因錯誤無法刪除!',req,res,infoJson,address);
									}else{
										deleteRedirector(req,res,'有些訊息因錯誤無法刪除!',infoJson,address);
									}
								}else{
									var ctr0 = -1;
									for (i = 0; i < borrow.Message.length; i++) {
										if (borrow.Message[i].toString() === message._id.toString()) {
											ctr0=i;
											break;
										}
									};
									if(ctr0>-1){
										borrow.Message.splice(ctr, 1);
									}
									borrow.save(function (err,updatedBorrow) {
										if (err){
											console.log(err);
											ctr++;
											if(ctr<ctrTarget){
												deleteMessage(ctr,ctrTarget,'有些訊息因錯誤無法刪除!',req,res,infoJson,address);
											}else{
												deleteRedirector(req,res,'有些訊息因錯誤無法刪除!',infoJson,address);
											}
										}else{	
											message.remove(function (err,removedItem) {
												if (err){
													console.log(err);
													ctr++;
													if(ctr<ctrTarget){
														deleteMessage(ctr,ctrTarget,'有些訊息因錯誤無法刪除!',req,res,infoJson,address);
													}else{
														deleteRedirector(req,res,'有些訊息因錯誤無法刪除!',infoJson,address);
													}
												}else{
													infoJson.counter2+=1;
													ctr++;
													if(ctr<ctrTarget){
														deleteMessage(ctr,ctrTarget,returnSring,req,res,infoJson,address);
													}else{
														if(returnSring){	
															deleteRedirector(req,res,returnSring,infoJson,address);
														}else{
															deleteRedirector(req,res,'',infoJson,address);
														}
													}
												}
											});
										}
									});
								}
							}
						});
					}else{
						ctr++;
						if(ctr<ctrTarget){
							deleteMessage(ctr,ctrTarget,'有些訊息因錯誤無法刪除!',req,res,infoJson)
						}else{
							deleteRedirector(req,res,'有些訊息因錯誤無法刪除!',infoJson,address);
						}
					}
				}
			}
		}
	});

}

function deleteRedirector(req,res,content,info,address){
	var json={Contect:content,InfoJSON:info};
	var string=JSON.stringify(json);
	
	req.flash('deleteFlash',string);
	res.redirect(address);
}

module.exports = router;
