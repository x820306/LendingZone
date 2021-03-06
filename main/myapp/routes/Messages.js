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
	if((typeof(req.body.FromBorrowRequest) === 'string')&&(typeof(req.body.Message) === 'string')&&(typeof(req.body.MoneyToLend) === 'string')&&(typeof(req.body.InterestRate) === 'string')&&(typeof(req.body.MonthPeriod) === 'string')&&(typeof(req.body.SendTo) === 'string')&&(typeof(req.body.CreatedBy) === 'string')&&(typeof(req.body.Type) === 'string')){
		req.body.FromBorrowRequest=sanitizer.sanitize(req.body.FromBorrowRequest.trim());
		req.body.Message=sanitizer.sanitize(req.body.Message.trim());
		req.body.MoneyToLend=sanitizer.sanitize(req.body.MoneyToLend.trim());
		req.body.InterestRate=sanitizer.sanitize(req.body.InterestRate.trim());
		req.body.MonthPeriod=sanitizer.sanitize(req.body.MonthPeriod.trim());
		req.body.SendTo=sanitizer.sanitize(req.body.SendTo.trim());
		req.body.CreatedBy=sanitizer.sanitize(req.body.CreatedBy.trim());
		req.body.Type=sanitizer.sanitize(req.body.Type.trim());
		
		Borrows.findById(req.body.FromBorrowRequest).exec(function (err, borrow){
			if (err) {
				console.log(err);
				res.json({error: err.name}, 500);
			}else{
				if(!borrow){
					res.json({error: 'no such borrow'}, 500);
				}else{
					var toCreate = new Messages();
					toCreate.FromBorrowRequest=req.body.FromBorrowRequest;
					toCreate.Message=req.body.Message;
					toCreate.MoneyToLend=req.body.MoneyToLend;
					toCreate.InterestRate=req.body.InterestRate;
					toCreate.MonthPeriod=req.body.MonthPeriod;
					toCreate.SendTo=req.body.SendTo;
					toCreate.CreatedBy=req.body.CreatedBy;
					toCreate.Type=req.body.Type;
					
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
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/destroyTest',function(req, res, next) {
	if(typeof(req.body.MessageID) === 'string'){
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
									if (borrow.Message[i].equals(message._id)) {
										ctr=i;
										break;
									}
								};
								if(ctr>-1){
									borrow.Message.splice(ctr, 1);
								}
								if(message.Status==='Confirmed'){
									if(!borrow.IfReadable){
										borrow.IfReadable=true;
									}
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
												var tagetPerson;
												if(removedItem.Type==='toBorrow'){
													tagetPerson=removedItem.CreatedBy;
												}else if(removedItem.Type==='toLend'){
													tagetPerson=removedItem.SendTo;
												}
												library.userLevelAdderReturn(tagetPerson,function(){
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
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

function toLendSamePart(res,req,differentPart,outterPara){
	Borrows.findById(req.body.FromBorrowRequest).populate('CreatedBy', 'Username Email ifMailValid').populate("Message","Transaction Status").exec(function (err, borrow){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			if(!borrow){
				res.redirect('/message?content='+encodeURIComponent('錯誤ID!'));
			}else{
				var optionsX = {
					path: 'Message.Transaction',
					model: Transactions,
					select: 'Principal'
				};
				Messages.populate(borrow, optionsX, function(err, borrow){
					if(err){
						console.log(err);
						res.redirect('/message?content='+encodeURIComponent('錯誤!'));
					}else{
						BankAccounts.findOne({"OwnedBy": req.user._id}).populate('OwnedBy', 'Username Email ifMailValid').exec(function (err, lenderBankaccount){
							if (err) {
								console.log(err);
								res.redirect('/message?content='+encodeURIComponent('錯誤!'));
							}else{
								if(!lenderBankaccount){
									res.redirect('/message?content='+encodeURIComponent('無銀行帳戶!'));
								}else{
									var moneyLendedJson={
										autoLendCumulated:0,
										moneyLeftToAutoLend:0,
									};
									Transactions.find({"Lender": req.user._id}).populate('Return').populate('CreatedFrom','Type').exec(function (err, transactions){
										if (err) {
											console.log(err);
											res.redirect('/message?content='+encodeURIComponent('錯誤!'));
										}else{
											if(transactions.length>0){
												for(i=0;i<transactions.length;i++){
													if(transactions[i].CreatedFrom.Type==='toBorrow'){
														library.transactionProcessor(transactions[i],false);
														moneyLendedJson.autoLendCumulated+=transactions[i].PrincipalNotReturn;
													}
												}
											}
											
											Lends.findOne({"CreatedBy": req.user._id}).exec( function (err, lend){
												if (err) {
													console.log(err);
													res.redirect('/message?content='+encodeURIComponent('錯誤!'));
												}else{
													if(lend){
														moneyLendedJson.moneyLeftToAutoLend=lend.MaxMoneyToLend-moneyLendedJson.autoLendCumulated;
														if(moneyLendedJson.moneyLeftToAutoLend<=0){
															moneyLendedJson.moneyLeftToAutoLend=0;
														}
													}
													var maxMoney3;
													maxMoney3=lenderBankaccount.MoneyInBankAccount-moneyLendedJson.moneyLeftToAutoLend;
													if(maxMoney3<=0){
														maxMoney3=0;
													}
													
													var maxMoney=parseInt(lenderBankaccount.MoneyInBankAccount);
													borrow.Got=0;
													for(r=0;r<borrow.Message.length;r++){
														if(borrow.Message[r].Status==='Confirmed'){
															if(borrow.Message[r].Transaction.length>=1){
																borrow.Got+=(borrow.Message[r].Transaction[0].Principal);
															}
														}
													}
													var maxMoney2=parseInt(borrow.MoneyToBorrow)-parseInt(borrow.Got);
													if(maxMoney2<0){
														maxMoney2=0;
													}
													var maxMonth=parseInt(borrow.MonthPeriodAccepted);
													var minMonth=parseInt(borrow.MonthPeriodAcceptedLowest);
													var maxRate=parseFloat(borrow.MaxInterestRateAccepted);
													
													var errorTarget=[];
													var errorMessage=[];
													for(i=0;i<4;i++){
														errorTarget.push(false);
														errorMessage.push('');
													}
													
													if(typeof(req.body.MoneyToLend) === 'string'){
														req.body.MoneyToLend=sanitizer.sanitize(req.body.MoneyToLend.trim());
														var nowMoney=parseInt(req.body.MoneyToLend);
														
														if(req.body.MoneyToLend===''){
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
														}else if(nowMoney>maxMoney3){
															errorTarget[0]=true;
															errorMessage[0]='金額超過尚可手動借出金額：'+maxMoney3.toFixed(0)+'元!';
														}
													}else{
														req.body.MoneyToLend=''
														errorTarget[0]=true;
														errorMessage[0]='未送出!';
													}
													
													if(typeof(req.body.InterestRate) === 'string'){
														req.body.InterestRate=sanitizer.sanitize(req.body.InterestRate.trim());
														var rate=(parseFloat(req.body.InterestRate)/100)+library.serviceChargeRate;//scr
														
														if(req.body.InterestRate===''){
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
													}else{
														req.body.InterestRate=''
														errorTarget[1]=true;
														errorMessage[1]='未送出!';
													}
													
													if(typeof(req.body.MonthPeriod) === 'string'){
														req.body.MonthPeriod=sanitizer.sanitize(req.body.MonthPeriod.trim());
														var month=parseInt(req.body.MonthPeriod);
														
														if(req.body.MonthPeriod===''){
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
															errorMessage[2]='超過對方可接受之最高期數：'+maxMonth.toFixed(0)+'個月!';
														}else if(month<minMonth){
															errorTarget[2]=true;
															errorMessage[2]='少於對方可接受之最低期數：'+minMonth.toFixed(0)+'個月!';
														}
													}else{
														req.body.MonthPeriod=''
														errorTarget[2]=true;
														errorMessage[2]='未送出!';
													}
													
													if(typeof(req.body.Message) === 'string'){
														req.body.Message=sanitizer.sanitize(req.body.Message.trim());
														if(req.body.Message==='無內容'){
															errorTarget[3]=true;
															errorMessage[3]='訊息內容不合規定!';
														}
													}else{
														req.body.Message=''
													}
													
													if(typeof(req.body.F5) !== 'string'){
														req.body.F5=0;
													}
													if(typeof(req.body.F6) !== 'string'){
														req.body.F6=0;
													}
													if(typeof(req.body.F7) !== 'string'){
														req.body.F7=0;
													}
													if(typeof(req.body.F8) !== 'string'){
														req.body.F8=0;
													}
													if(typeof(req.body.F9) !== 'string'){
														req.body.F9=0;
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
		F9:req.body.F9
	};
	
	var json={FormContent:formContent,Target:target,Message:message};
	var string=JSON.stringify(json);
	
	req.flash('hendLendForm',string);
	req.session.save(function(err){
		if(err){
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			res.redirect('/lender/story?id='+req.body.FromBorrowRequest);
		}
	});
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
							req.body.FromBorrowRequest=sanitizer.sanitize(req.body.FromBorrowRequest.trim());
							toCreate.FromBorrowRequest=req.body.FromBorrowRequest;
							toCreate.Message=req.body.Message;
							toCreate.MoneyToLend=parseInt(req.body.MoneyToLend);
							toCreate.InterestRate=(parseFloat(req.body.InterestRate)/100)+library.serviceChargeRate;//scr
							toCreate.MonthPeriod=parseInt(req.body.MonthPeriod);
							toCreate.CreatedBy= req.user._id
							toCreate.SendTo=borrow.CreatedBy;
							toCreate.Type='toLend';
							
							toCreate.save(function (err,newCreate) {
								if (err){
									console.log(err);
									res.redirect('/message?content='+encodeURIComponent('新建失敗!'));
								}else{
									if(borrow.AutoComfirmToLendMsgPeriod===0){
										var toCreateTransaction = new Transactions();
										toCreateTransaction.Principal=newCreate.MoneyToLend;
										toCreateTransaction.InterestRate=newCreate.InterestRate;
										toCreateTransaction.MonthPeriod=newCreate.MonthPeriod;
										toCreateTransaction.CreatedFrom=newCreate._id;
										toCreateTransaction.Borrower=newCreate.SendTo;
										toCreateTransaction.Lender=newCreate.CreatedBy;
										
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
																			borrow.Got+=newCreateTransaction.Principal;
																			if(borrow.Got>=borrow.MoneyToBorrow){
																				borrow.IfReadable=false;
																			}
																			delete borrow.Got;
																			
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
																													if(lenderBankaccount.OwnedBy.ifMailValid){
																														var mailOptions = {
																															from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
																															to: lenderBankaccount.OwnedBy.Username+' <'+lenderBankaccount.OwnedBy.Email+'>', // list of receivers
																															subject: borrow.CreatedBy.Username+'同意了您方才送出的欲借出訊息!', // Subject line
																															text: '親愛的 '+lenderBankaccount.OwnedBy.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+borrow.CreatedBy.Username+' 同意了您方才在「'+borrow.StoryTitle+'("'+req.protocol+'://'+req.headers.host+'/lender/story?id='+borrow._id+'")」送出的欲借出訊息！'+String.fromCharCode(10)+'您的交易紅利代碼為： '+library.randomString(8)+String.fromCharCode(10)+'您可至 玉山銀行網站("http://www.esunbank.com.tw/") 兌換紅利喔!'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看訊息與交易結果:'+String.fromCharCode(10)+'"'+req.protocol+'://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newCreateUpdated._id+'&filter='+encodeURIComponent('已被同意')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1"', // plaintext body
																															html: '<img src="cid:bpng" /><br><br>親愛的 '+lenderBankaccount.OwnedBy.Username+' 您好：<br><br>'+borrow.CreatedBy.Username+' 同意了您方才在「<a href="'+req.protocol+'://'+req.headers.host+'/lender/story?id='+borrow._id+'">'+borrow.StoryTitle+'</a>」送出的欲借出訊息！<br>您的交易紅利代碼為： <div style="color:#FF0000;display:inline;">'+library.randomString(8)+'</div><br>您可至 <a href="http://www.esunbank.com.tw/">玉山銀行網站</a> 兌換紅利喔!<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="'+req.protocol+'://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newCreateUpdated._id+'&filter='+encodeURIComponent('已被同意')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看訊息與交易結果</span></a></td></tr></table>', 
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
																													}
																													
																													if(borrow.CreatedBy.ifMailValid){
																														var mailOptions2 = {
																															from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
																															to: borrow.CreatedBy.Username+' <'+borrow.CreatedBy.Email+'>', // list of receivers
																															subject: '您同意了'+lenderBankaccount.OwnedBy.Username+'方才送來的欲借出訊息!', // Subject line
																															text: '親愛的 '+borrow.CreatedBy.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+'您同意了 '+lenderBankaccount.OwnedBy.Username+' 方才在「'+borrow.StoryTitle+'("'+req.protocol+'://'+req.headers.host+'/lender/story?id='+borrow._id+'")」送來的欲借出訊息！'+String.fromCharCode(10)+'您的交易紅利代碼為： '+library.randomString(8)+String.fromCharCode(10)+'您可至 玉山銀行網站("http://www.esunbank.com.tw/") 兌換紅利喔!'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看訊息與交易結果:'+String.fromCharCode(10)+'"'+req.protocol+'://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newCreateUpdated._id+'&filter='+encodeURIComponent('已被同意')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1"', // plaintext body
																															html: '<img src="cid:bpng" /><br><br>親愛的 '+borrow.CreatedBy.Username+' 您好：<br><br>您同意了 '+lenderBankaccount.OwnedBy.Username+' 方才在「<a href="'+req.protocol+'://'+req.headers.host+'/lender/story?id='+borrow._id+'">'+borrow.StoryTitle+'</a>」送來的欲借出訊息！<br>您的交易紅利代碼為： <div style="color:#FF0000;display:inline;">'+library.randomString(8)+'</div><br>您可至 <a href="http://www.esunbank.com.tw/">玉山銀行網站</a> 兌換紅利喔!<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="'+req.protocol+'://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newCreateUpdated._id+'&filter='+encodeURIComponent('已被同意')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看訊息與交易結果</span></a></td></tr></table>', 
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
													if(borrow.CreatedBy.ifMailValid){
														var mailOptions = {
															from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
															to: borrow.CreatedBy.Username+' <'+borrow.CreatedBy.Email+'>', // list of receivers
															subject: '您收到了來自'+lenderBankaccount.OwnedBy.Username+'的欲借出訊息!', // Subject line
															text: '親愛的 '+borrow.CreatedBy.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+lenderBankaccount.OwnedBy.Username+' 想要資助您在「'+borrow.StoryTitle+'("'+req.protocol+'://'+req.headers.host+'/lender/story?id='+borrow._id+'")」的借款需求！'+String.fromCharCode(10)+'了解他所提供的資訊來決定是否要接受資助吧！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"'+req.protocol+'://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newCreate._id+'&filter='+encodeURIComponent('未被確認')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1"', // plaintext body
															html: '<img src="cid:dpng" /><br><br>親愛的 '+borrow.CreatedBy.Username+' 您好：<br><br>'+lenderBankaccount.OwnedBy.Username+' 想要資助您在「<a href="'+req.protocol+'://'+req.headers.host+'/lender/story?id='+borrow._id+'">'+borrow.StoryTitle+'</a>」的借款需求！<br>了解他所提供的資訊來決定是否要接受資助吧！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="'+req.protocol+'://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newCreate._id+'&filter='+encodeURIComponent('未被確認')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>', 
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
													}
													
													if(lenderBankaccount.OwnedBy.ifMailValid){
														var mailOptions2 = {
															from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
															to: lenderBankaccount.OwnedBy.Username+' <'+lenderBankaccount.OwnedBy.Email+'>', // list of receivers
															subject: '您向'+borrow.CreatedBy.Username+'送出了欲借出訊息!', // Subject line
															text: '親愛的 '+lenderBankaccount.OwnedBy.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+'您在「'+borrow.StoryTitle+'("'+req.protocol+'://'+req.headers.host+'/lender/story?id='+borrow._id+'")」向 '+borrow.CreatedBy.Username+' 送出了欲借出訊息！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"'+req.protocol+'://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newCreate._id+'&filter='+encodeURIComponent('未被確認')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1"', // plaintext body
															html: '<img src="cid:dpng" /><br><br>親愛的 '+lenderBankaccount.OwnedBy.Username+' 您好：<br><br>您在「<a href="'+req.protocol+'://'+req.headers.host+'/lender/story?id='+borrow._id+'">'+borrow.StoryTitle+'</a>」向 '+borrow.CreatedBy.Username+' 送出了欲借出訊息！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="'+req.protocol+'://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newCreate._id+'&filter='+encodeURIComponent('未被確認')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>', 
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
	if((message.Type==='toLend')&&(message.Status==='NotConfirmed')){
		message.Message=req.body.Message;
		message.MoneyToLend=parseInt(req.body.MoneyToLend);
		message.InterestRate=(parseFloat(req.body.InterestRate)/100)+library.serviceChargeRate;//scr
		message.MonthPeriod=parseInt(req.body.MonthPeriod);
		message.Updated = Date.now();
		
		message.save(function (err,newUpdate) {
			if (err){
				console.log(err);
				res.redirect('/message?content='+encodeURIComponent('更新失敗!'));
			}else{
				if(library.ifMail){
					if(message.SendTo.ifMailValid){
						var mailOptions = {
							from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
							to: message.SendTo.Username+' <'+message.SendTo.Email+'>', // list of receivers
							subject: message.CreatedBy.Username+'更新了他先前送來的欲借出訊息!', // Subject line
							text: '親愛的 '+message.SendTo.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+message.CreatedBy.Username+' 更新了他先前在「'+message.FromBorrowRequest.StoryTitle+'("'+req.protocol+'://'+req.headers.host+'/lender/story?id='+message.FromBorrowRequest._id+'")」送來的欲借出訊息！'+String.fromCharCode(10)+'了解他所提供的資訊來決定是否要接受資助吧！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"'+req.protocol+'://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newUpdate._id+'&filter='+encodeURIComponent('未被確認')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1"', // plaintext body
							html: '<img src="cid:dpng" /><br><br>親愛的 '+message.SendTo.Username+' 您好：<br><br>'+message.CreatedBy.Username+' 更新了他先前在「<a href="'+req.protocol+'://'+req.headers.host+'/lender/story?id='+message.FromBorrowRequest._id+'">'+message.FromBorrowRequest.StoryTitle+'</a>」送來的欲借出訊息！<br>了解他所提供的資訊來決定是否要接受資助吧！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="'+req.protocol+'://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newUpdate._id+'&filter='+encodeURIComponent('未被確認')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>', 
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
					}
					
					if(message.CreatedBy.ifMailValid){
						var mailOptions2 = {
							from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
							to: message.CreatedBy.Username+' <'+message.CreatedBy.Email+'>', // list of receivers
							subject: '您更新了先前向'+message.SendTo.Username+'送出的欲借出訊息!', // Subject line
							text: '親愛的 '+message.CreatedBy.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+'您更新了先前在「'+message.FromBorrowRequest.StoryTitle+'("'+req.protocol+'://'+req.headers.host+'/lender/story?id='+message.FromBorrowRequest._id+'")」向 '+message.SendTo.Username+' 送出的欲借出訊息！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"'+req.protocol+'://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newUpdate._id+'&filter='+encodeURIComponent('未被確認')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1"', // plaintext body
							html: '<img src="cid:dpng" /><br><br>親愛的 '+message.CreatedBy.Username+' 您好：<br><br>您更新了先前在「<a href="'+req.protocol+'://'+req.headers.host+'/lender/story?id='+message.FromBorrowRequest._id+'">'+message.FromBorrowRequest.StoryTitle+'</a>」向 '+message.SendTo.Username+' 送出的欲借出訊息！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="'+req.protocol+'://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newUpdate._id+'&filter='+encodeURIComponent('未被確認')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>', 
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
				}
				res.redirect('/lender/story?id='+req.body.FromBorrowRequest);
			}
		});
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!請回到上頁重整頁面'));
	}
}

router.post('/rejectToBorrowMessageInStory',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	if((typeof(req.body.FromBorrowRequest) === 'string')&&(typeof(req.body.MessageID) === 'string')){
		var infoJson={counter1:1,counter2:0};
		library.rejectMessage(false,0,0,null,req,res,false,'/lender/story?id='+req.body.FromBorrowRequest,infoJson);
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/confirmToBorrowMessageInStory',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	if((typeof(req.body.FromBorrowRequest) === 'string')&&(typeof(req.body.MessageID) === 'string')){
		var infoJson={counter1:1,counter2:0,info1:0,info2:0,info3:0,info4:0,info5:0};
		library.confirmToBorrowMessage(false,0,0,null,req,res,false,'/lender/story?id='+req.body.FromBorrowRequest,true,infoJson,function(){});
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/rejectToBorrowMessageInLRM',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	if(typeof(req.body.JsonArrayString) === 'string'){
		try{
			var JSONobj=JSON.parse(req.body.JsonArrayString);
		}catch(e){
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			return;
		}
		if(typeof(JSONobj.array) !== 'undefined'){
			if(Array.isArray(JSONobj.array)){
				if(JSONobj.array.length>0){
					req.body.array=JSONobj.array;
					var infoJson={counter1:req.body.array.length,counter2:0};
					library.rejectMessage(true,0,req.body.array.length,null,req,res,false,'/lender/lenderReceiveMessages?msgKeyword=&filter='+encodeURIComponent('已婉拒')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1',infoJson);
				}else{
					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
				}
			}else{
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}
		}else{
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/confirmToBorrowMessageInLRM',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	if(typeof(req.body.JsonArrayString) === 'string'){
		try{
			var JSONobj=JSON.parse(req.body.JsonArrayString);
		}catch(e){
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			return;
		}
		if(typeof(JSONobj.array) !== 'undefined'){
			if(Array.isArray(JSONobj.array)){
				if(JSONobj.array.length>0){
					req.body.array=JSONobj.array;
					var infoJson={counter1:req.body.array.length,counter2:0,info1:0,info2:0,info3:0,info4:0,info5:0};
					library.confirmToBorrowMessage(true,0,req.body.array.length,null,req,res,false,'/lender/lenderReceiveMessages?msgKeyword=&filter='+encodeURIComponent('已同意')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1',true,infoJson,function(){});
				}else{
					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
				}
			}else{
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}
		}else{
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/rejectToBorrowMessageInLRMall',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	if((typeof(req.body.msgKeyword) === 'string')&&(typeof(req.body.sorter) === 'string')&&(typeof(req.body.classor) === 'string')&&(typeof(req.body.director) === 'string')&&(typeof(req.body.lbound) === 'string')&&(typeof(req.body.ubound) === 'string')){
		var msgKeyword=library.replacer(sanitizer.sanitize(req.body.msgKeyword),true);
		var sorter=library.replacer(sanitizer.sanitize(req.body.sorter),false);
		var classor=library.replacer(sanitizer.sanitize(req.body.classor),false);
		var director=library.replacer(sanitizer.sanitize(req.body.director),false);
		var lbound=library.replacer(sanitizer.sanitize(req.body.lbound),false);
		var ubound=library.replacer(sanitizer.sanitize(req.body.ubound),false);
		
		if((director!=='大至小')&&(director!=='小至大')){
			director='大至小';
		}
		
		var classorRec=null;
				
		if(classor==='一般'){
			classorRec="general";
		}else if(classor==='教育'){
			classorRec="education";
		}else if(classor==='家庭'){
			classorRec="family";
		}else if(classor==='旅遊'){
			classorRec="tour";
		}else if(classor==='不分故事種類'){
			classorRec=null;
		}else{
			classorRec=null;
			classor='不分故事種類';
		}
		
		var sorterRec=null;
		var sorterRecReserve=null;
		
		if(sorter==='更新日期'){
			sorterRecReserve='Updated';
		}else if(sorter==='建立日期'){
			sorterRecReserve='Created';
		}else if(sorter==='欲借入年利率'){
			sorterRecReserve='InterestRate';
		}else if(sorter==='欲借入金額'){
			sorterRecReserve='MoneyToLend';
		}else if(sorter==='欲借入期數'){
			sorterRecReserve='MonthPeriod';
		}else if(sorter==='信用等級'){
			sorterRecReserve='Updated';
		}else if(sorter==='預計總利息'){
			sorterRecReserve='Updated';
		}else if(sorter==='預計本利和'){
			sorterRecReserve='Updated';
		}else if(sorter==='預計平均利息'){
			sorterRecReserve='Updated';
		}else if(sorter==='預計平均本利和'){
			sorterRecReserve='Updated';
		}else if(sorter==='預計利本比'){
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
		if((sorter==='欲借入年利率')||(sorter==='預計利本比')){
			var tester;
			if(lbound.trim()!==''){
				tester=parseFloat(lbound);
				if(!isNaN(tester)){
					if((tester>=0)&&(tester<=99)){
						if(sorter==='欲借入年利率'){
							lboundRec=(tester/100)+library.serviceChargeRate;//scr
						}else if(sorter==='預計利本比'){
							lboundRec=(tester/100);
						}
					}else{
						lbound='';
					}
				}else{
					lbound='';
				}
			}
			if(ubound.trim()!==''){
				tester=parseFloat(ubound);
				if(!isNaN(tester)){
					if((tester>=0)&&(tester<=99)){
						if(sorter==='欲借入年利率'){
							uboundRec=(tester/100)+library.serviceChargeRate;//scr
						}else if(sorter==='預計利本比'){
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
		}else if((sorter==='更新日期')||(sorter==='建立日期')){
			var tester;
			if(lbound.trim()!==''){
				tester=Date.parse(lbound);
				if(!isNaN(tester)){
					lboundRec=new Date(tester);
				}else{
					lbound='';
				}
			}
			if(ubound.trim()!==''){
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
			if(lbound.trim()!==''){
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
			if(ubound.trim()!==''){
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
		
		if((sorter!=='預計總利息')&&(sorter!=='預計本利和')&&(sorter!=='預計平均利息')&&(sorter!=='預計平均本利和')&&(sorter!=='預計利本比')&&(sorter!=='信用等級')){
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
		
		var orFlag=false;
		var orFlagM=false;
		var keeper=msgKeyword;
		var orResult=library.orReplacer(keeper);
		keeper=orResult.rtn;
		msgKeyword=orResult.rtn2;
		orFlag=orResult.flag;
		orFlagM=orResult.flagM;

		var stringArray=keeper.split(' ');
		var keywordArray=[];
		var keywordArrayM=[];
		var msgObjIDarray=[];
		library.arrayPro(stringArray,keywordArray,keywordArrayM,msgObjIDarray);
		
		Messages.find({$and:andFindCmdAry}).populate('CreatedBy', 'Username Level').populate('FromBorrowRequest', 'StoryTitle Category').sort(sorterRec).exec(function (err, messages){
			if (err) {
				console.log(err);
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}else{
				if(messages.length===0){
					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
				}else{
					for(j=messages.length-1;j>-1;j--){
						var testString=messages[j].Message+'\r\n'+messages[j].FromBorrowRequest.StoryTitle+'\r\n'+messages[j].CreatedBy.Username;
						var filterResponse=library.keywordFilter(orFlag,orFlagM,testString,messages[j]._id,keywordArray,keywordArrayM,msgObjIDarray);
																		
						if((!filterResponse.localFlag0)&&((!filterResponse.localFlag1)||(!filterResponse.localFlag2))){
							messages.splice(j, 1);
						}
					}
					
					if(classorRec!==null){
						for(j=messages.length-1;j>-1;j--){
							if(messages[j].FromBorrowRequest.Category!==classorRec){
								messages.splice(j, 1);
							}
						}
					}
					
					if((sorter==='預計總利息')||(sorter==='預計本利和')||(sorter==='預計平均利息')||(sorter==='預計平均本利和')||(sorter==='預計利本比')||(sorter==='信用等級')){
						for(i=0;i<messages.length;i++){
							messages[i].Level=messages[i].CreatedBy.Level;
							library.messageProcessor(messages[i]);
						}
						
						if(sorter==='預計總利息'){
							if(director==='大至小'){
								messages.sort(function(a,b) { return parseInt(b.InterestInFuture) - parseInt(a.InterestInFuture)} );
							}else if(director==='小至大'){
								messages.sort(function(a,b) { return parseInt(a.InterestInFuture) - parseInt(b.InterestInFuture)} );
							}
							library.arrayFilter(messages,'InterestInFuture',lboundRec,uboundRec);	
						}else if(sorter==='預計本利和'){
							if(director==='大至小'){
								messages.sort(function(a,b) { return parseInt(b.MoneyFuture) - parseInt(a.MoneyFuture)} );
							}else if(director==='小至大'){
								messages.sort(function(a,b) { return parseInt(a.MoneyFuture) - parseInt(b.MoneyFuture)} );
							}
							library.arrayFilter(messages,'MoneyFuture',lboundRec,uboundRec);	
						}else if(sorter==='預計平均利息'){
							if(director==='大至小'){
								messages.sort(function(a,b) { return parseInt(b.InterestInFutureMonth) - parseInt(a.InterestInFutureMonth)} );
							}else if(director==='小至大'){
								messages.sort(function(a,b) { return parseInt(a.InterestInFutureMonth) - parseInt(b.InterestInFutureMonth)} );
							}
							library.arrayFilter(messages,'InterestInFutureMonth',lboundRec,uboundRec);	
						}else if(sorter==='預計平均本利和'){
							if(director==='大至小'){
								messages.sort(function(a,b) { return parseInt(b.InterestInFutureMoneyMonth) - parseInt(a.InterestInFutureMoneyMonth)} );
							}else if(director==='小至大'){
								messages.sort(function(a,b) { return parseInt(a.InterestInFutureMoneyMonth) - parseInt(b.InterestInFutureMoneyMonth)} );
							}
							library.arrayFilter(messages,'InterestInFutureMoneyMonth',lboundRec,uboundRec);	
						}else if(sorter==='預計利本比'){
							if(director==='大至小'){
								messages.sort(function(a,b) { return parseFloat(b.InterestInFutureDivMoney) - parseFloat(a.InterestInFutureDivMoney)} );
							}else if(director==='小至大'){
								messages.sort(function(a,b) { return parseFloat(a.InterestInFutureDivMoney) - parseFloat(b.InterestInFutureDivMoney)} );
							}
							library.arrayFilter(messages,'InterestInFutureDivMoney',lboundRec,uboundRec);	
						}else if(sorter==='信用等級'){
							if(director==='大至小'){
								messages.sort(function(a,b) { return parseFloat(b.Level) - parseFloat(a.Level)} );
							}else if(director==='小至大'){
								messages.sort(function(a,b) { return parseFloat(a.Level) - parseFloat(b.Level)} );
							}
							library.arrayFilter(messages,'Level',lboundRec,uboundRec);	
						}
					}
					
					if(messages.length===0){
						res.redirect('/message?content='+encodeURIComponent('錯誤!'));
					}else{
						var arrayOp=[];
						for(i=0;i<messages.length;i++){
							var temp={MessageID:messages[i]._id.toString()};
							arrayOp.push(temp);
						}
						req.body.array=arrayOp;
						var infoJson={counter1:req.body.array.length,counter2:0};
						library.rejectMessage(true,0,req.body.array.length,null,req,res,false,'/lender/lenderReceiveMessages?msgKeyword=&filter='+encodeURIComponent('已婉拒')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1',infoJson);
					}
				}
			}
		});
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/confirmToBorrowMessageInLRMall',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	if((typeof(req.body.msgKeyword) === 'string')&&(typeof(req.body.sorter) === 'string')&&(typeof(req.body.classor) === 'string')&&(typeof(req.body.director) === 'string')&&(typeof(req.body.lbound) === 'string')&&(typeof(req.body.ubound) === 'string')){
		var msgKeyword=library.replacer(sanitizer.sanitize(req.body.msgKeyword),true);
		var sorter=library.replacer(sanitizer.sanitize(req.body.sorter),false);
		var classor=library.replacer(sanitizer.sanitize(req.body.classor),false);
		var director=library.replacer(sanitizer.sanitize(req.body.director),false);
		var lbound=library.replacer(sanitizer.sanitize(req.body.lbound),false);
		var ubound=library.replacer(sanitizer.sanitize(req.body.ubound),false);
	
		if((director!=='大至小')&&(director!=='小至大')){
			director='大至小';
		}
		
		var classorRec=null;
				
		if(classor==='一般'){
			classorRec="general";
		}else if(classor==='教育'){
			classorRec="education";
		}else if(classor==='家庭'){
			classorRec="family";
		}else if(classor==='旅遊'){
			classorRec="tour";
		}else if(classor==='不分故事種類'){
			classorRec=null;
		}else{
			classorRec=null;
			classor='不分故事種類';
		}
		
		var sorterRec=null;
		var sorterRecReserve=null;
		
		if(sorter==='更新日期'){
			sorterRecReserve='Updated';
		}else if(sorter==='建立日期'){
			sorterRecReserve='Created';
		}else if(sorter==='欲借入年利率'){
			sorterRecReserve='InterestRate';
		}else if(sorter==='欲借入金額'){
			sorterRecReserve='MoneyToLend';
		}else if(sorter==='欲借入期數'){
			sorterRecReserve='MonthPeriod';
		}else if(sorter==='信用等級'){
			sorterRecReserve='Updated';
		}else if(sorter==='預計總利息'){
			sorterRecReserve='Updated';
		}else if(sorter==='預計本利和'){
			sorterRecReserve='Updated';
		}else if(sorter==='預計平均利息'){
			sorterRecReserve='Updated';
		}else if(sorter==='預計平均本利和'){
			sorterRecReserve='Updated';
		}else if(sorter==='預計利本比'){
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
		if((sorter==='欲借入年利率')||(sorter==='預計利本比')){
			var tester;
			if(lbound.trim()!==''){
				tester=parseFloat(lbound);
				if(!isNaN(tester)){
					if((tester>=0)&&(tester<=99)){
						if(sorter==='欲借入年利率'){
							lboundRec=(tester/100)+library.serviceChargeRate;//scr
						}else if(sorter==='預計利本比'){
							lboundRec=(tester/100);
						}
					}else{
						lbound='';
					}
				}else{
					lbound='';
				}
			}
			if(ubound.trim()!==''){
				tester=parseFloat(ubound);
				if(!isNaN(tester)){
					if((tester>=0)&&(tester<=99)){
						if(sorter==='欲借入年利率'){
							uboundRec=(tester/100)+library.serviceChargeRate;//scr
						}else if(sorter==='預計利本比'){
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
		}else if((sorter==='更新日期')||(sorter==='建立日期')){
			var tester;
			if(lbound.trim()!==''){
				tester=Date.parse(lbound);
				if(!isNaN(tester)){
					lboundRec=new Date(tester);
				}else{
					lbound='';
				}
			}
			if(ubound.trim()!==''){
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
			if(lbound.trim()!==''){
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
			if(ubound.trim()!==''){
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
		
		if((sorter!=='預計總利息')&&(sorter!=='預計本利和')&&(sorter!=='預計平均利息')&&(sorter!=='預計平均本利和')&&(sorter!=='預計利本比')&&(sorter!=='信用等級')){
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
		
		var orFlag=false;
		var orFlagM=false;
		var keeper=msgKeyword;
		var orResult=library.orReplacer(keeper);
		keeper=orResult.rtn;
		msgKeyword=orResult.rtn2;
		orFlag=orResult.flag;
		orFlagM=orResult.flagM;

		var stringArray=keeper.split(' ');
		var keywordArray=[];
		var keywordArrayM=[];
		var msgObjIDarray=[];
		library.arrayPro(stringArray,keywordArray,keywordArrayM,msgObjIDarray);
		
		Messages.find({$and:andFindCmdAry}).populate('CreatedBy', 'Username Level').populate('FromBorrowRequest', 'StoryTitle Category').sort(sorterRec).exec(function (err, messages){
			if (err) {
				console.log(err);
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}else{
				if(messages.length===0){
					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
				}else{
					for(j=messages.length-1;j>-1;j--){
						var testString=messages[j].Message+'\r\n'+messages[j].FromBorrowRequest.StoryTitle+'\r\n'+messages[j].CreatedBy.Username;
						var filterResponse=library.keywordFilter(orFlag,orFlagM,testString,messages[j]._id,keywordArray,keywordArrayM,msgObjIDarray);
																		
						if((!filterResponse.localFlag0)&&((!filterResponse.localFlag1)||(!filterResponse.localFlag2))){
							messages.splice(j, 1);
						}
					}
					
					if(classorRec!==null){
						for(j=messages.length-1;j>-1;j--){
							if(messages[j].FromBorrowRequest.Category!==classorRec){
								messages.splice(j, 1);
							}
						}
					}
					
					if((sorter==='預計總利息')||(sorter==='預計本利和')||(sorter==='預計平均利息')||(sorter==='預計平均本利和')||(sorter==='預計利本比')||(sorter==='信用等級')){
						for(i=0;i<messages.length;i++){
							messages[i].Level=messages[i].CreatedBy.Level;
							library.messageProcessor(messages[i]);
						}
						
						if(sorter==='預計總利息'){
							if(director==='大至小'){
								messages.sort(function(a,b) { return parseInt(b.InterestInFuture) - parseInt(a.InterestInFuture)} );
							}else if(director==='小至大'){
								messages.sort(function(a,b) { return parseInt(a.InterestInFuture) - parseInt(b.InterestInFuture)} );
							}
							library.arrayFilter(messages,'InterestInFuture',lboundRec,uboundRec);	
						}else if(sorter==='預計本利和'){
							if(director==='大至小'){
								messages.sort(function(a,b) { return parseInt(b.MoneyFuture) - parseInt(a.MoneyFuture)} );
							}else if(director==='小至大'){
								messages.sort(function(a,b) { return parseInt(a.MoneyFuture) - parseInt(b.MoneyFuture)} );
							}
							library.arrayFilter(messages,'MoneyFuture',lboundRec,uboundRec);	
						}else if(sorter==='預計平均利息'){
							if(director==='大至小'){
								messages.sort(function(a,b) { return parseInt(b.InterestInFutureMonth) - parseInt(a.InterestInFutureMonth)} );
							}else if(director==='小至大'){
								messages.sort(function(a,b) { return parseInt(a.InterestInFutureMonth) - parseInt(b.InterestInFutureMonth)} );
							}
							library.arrayFilter(messages,'InterestInFutureMonth',lboundRec,uboundRec);	
						}else if(sorter==='預計平均本利和'){
							if(director==='大至小'){
								messages.sort(function(a,b) { return parseInt(b.InterestInFutureMoneyMonth) - parseInt(a.InterestInFutureMoneyMonth)} );
							}else if(director==='小至大'){
								messages.sort(function(a,b) { return parseInt(a.InterestInFutureMoneyMonth) - parseInt(b.InterestInFutureMoneyMonth)} );
							}
							library.arrayFilter(messages,'InterestInFutureMoneyMonth',lboundRec,uboundRec);	
						}else if(sorter==='預計利本比'){
							if(director==='大至小'){
								messages.sort(function(a,b) { return parseFloat(b.InterestInFutureDivMoney) - parseFloat(a.InterestInFutureDivMoney)} );
							}else if(director==='小至大'){
								messages.sort(function(a,b) { return parseFloat(a.InterestInFutureDivMoney) - parseFloat(b.InterestInFutureDivMoney)} );
							}
							library.arrayFilter(messages,'InterestInFutureDivMoney',lboundRec,uboundRec);	
						}else if(sorter==='信用等級'){
							if(director==='大至小'){
								messages.sort(function(a,b) { return parseFloat(b.Level) - parseFloat(a.Level)} );
							}else if(director==='小至大'){
								messages.sort(function(a,b) { return parseFloat(a.Level) - parseFloat(b.Level)} );
							}
							library.arrayFilter(messages,'Level',lboundRec,uboundRec);	
						}
					}
					
					if(messages.length===0){
						res.redirect('/message?content='+encodeURIComponent('錯誤!'));
					}else{
						var arrayOp=[];
						for(i=0;i<messages.length;i++){
							var temp={FromBorrowRequest:messages[i].FromBorrowRequest._id.toString(),MessageID:messages[i]._id.toString()};
							arrayOp.push(temp);
						}
						req.body.array=arrayOp;
						var infoJson={counter1:req.body.array.length,counter2:0,info1:0,info2:0,info3:0,info4:0,info5:0};
						library.confirmToBorrowMessage(true,0,req.body.array.length,null,req,res,false,'/lender/lenderReceiveMessages?msgKeyword=&filter='+encodeURIComponent('已同意')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1',true,infoJson,function(){});
					}
				}
			}
		});
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/deleteToLendMessageInLRM',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	if(typeof(req.body.JsonArrayString) === 'string'){
		try{
			var JSONobj=JSON.parse(req.body.JsonArrayString);
		}catch(e){
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			return;
		}
		if(typeof(JSONobj.array) !== 'undefined'){
			if(Array.isArray(JSONobj.array)){
				if(JSONobj.array.length>0){
					req.body.array=JSONobj.array;
					var infoJson={counter1:req.body.array.length,counter2:0};
					var address='/lender/lenderSendMessages?msgKeyword=&filter='+encodeURIComponent('未被確認')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1';
					deleteMessage(0,req.body.array.length,null,req,res,infoJson,address);
				}else{
					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
				}
			}else{
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}
		}else{
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/deleteToLendMessageInLRMall',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	if((typeof(req.body.msgKeyword) === 'string')&&(typeof(req.body.sorter) === 'string')&&(typeof(req.body.classor) === 'string')&&(typeof(req.body.director) === 'string')&&(typeof(req.body.lbound) === 'string')&&(typeof(req.body.ubound) === 'string')){
		var msgKeyword=library.replacer(sanitizer.sanitize(req.body.msgKeyword),true);
		var sorter=library.replacer(sanitizer.sanitize(req.body.sorter),false);
		var classor=library.replacer(sanitizer.sanitize(req.body.classor),false);
		var director=library.replacer(sanitizer.sanitize(req.body.director),false);
		var lbound=library.replacer(sanitizer.sanitize(req.body.lbound),false);
		var ubound=library.replacer(sanitizer.sanitize(req.body.ubound),false);
	
		if((director!=='大至小')&&(director!=='小至大')){
			director='大至小';
		}
		
		var classorRec=null;
				
		if(classor==='一般'){
			classorRec="general";
		}else if(classor==='教育'){
			classorRec="education";
		}else if(classor==='家庭'){
			classorRec="family";
		}else if(classor==='旅遊'){
			classorRec="tour";
		}else if(classor==='不分故事種類'){
			classorRec=null;
		}else{
			classorRec=null;
			classor='不分故事種類';
		}
		
		var sorterRec=null;
		var sorterRecReserve=null;
		
		if(sorter==='更新日期'){
			sorterRecReserve='Updated';
		}else if(sorter==='建立日期'){
			sorterRecReserve='Created';
		}else if(sorter==='欲借出年利率'){
			sorterRecReserve='InterestRate';
		}else if(sorter==='欲借出金額'){
			sorterRecReserve='MoneyToLend';
		}else if(sorter==='欲借出期數'){
			sorterRecReserve='MonthPeriod';
		}else if(sorter==='信用等級'){
			sorterRecReserve='Updated';
		}else if(sorter==='預計總利息'){
			sorterRecReserve='Updated';
		}else if(sorter==='預計本利和'){
			sorterRecReserve='Updated';
		}else if(sorter==='預計平均利息'){
			sorterRecReserve='Updated';
		}else if(sorter==='預計平均本利和'){
			sorterRecReserve='Updated';
		}else if(sorter==='預計利本比'){
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
		if((sorter==='欲借出年利率')||(sorter==='預計利本比')){
			var tester;
			if(lbound.trim()!==''){
				tester=parseFloat(lbound);
				if(!isNaN(tester)){
					if((tester>=0)&&(tester<=99)){
						if(sorter==='欲借出年利率'){
							lboundRec=(tester/100)+library.serviceChargeRate;//scr
						}else if(sorter==='預計利本比'){
							lboundRec=(tester/100);
						}
					}else{
						lbound='';
					}
				}else{
					lbound='';
				}
			}
			if(ubound.trim()!==''){
				tester=parseFloat(ubound);
				if(!isNaN(tester)){
					if((tester>=0)&&(tester<=99)){
						if(sorter==='欲借出年利率'){
							uboundRec=(tester/100)+library.serviceChargeRate;//scr
						}else if(sorter==='預計利本比'){
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
		}else if((sorter==='更新日期')||(sorter==='建立日期')){
			var tester;
			if(lbound.trim()!==''){
				tester=Date.parse(lbound);
				if(!isNaN(tester)){
					lboundRec=new Date(tester);
				}else{
					lbound='';
				}
			}
			if(ubound.trim()!==''){
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
			if(lbound.trim()!==''){
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
			if(ubound.trim()!==''){
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
		
		if((sorter!=='預計總利息')&&(sorter!=='預計本利和')&&(sorter!=='預計平均利息')&&(sorter!=='預計平均本利和')&&(sorter!=='預計利本比')&&(sorter!=='信用等級')){
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
		
		var orFlag=false;
		var orFlagM=false;
		var keeper=msgKeyword;
		var orResult=library.orReplacer(keeper);
		keeper=orResult.rtn;
		msgKeyword=orResult.rtn2;
		orFlag=orResult.flag;
		orFlagM=orResult.flagM;

		var stringArray=keeper.split(' ');
		var keywordArray=[];
		var keywordArrayM=[];
		var msgObjIDarray=[];
		library.arrayPro(stringArray,keywordArray,keywordArrayM,msgObjIDarray);
		
		Messages.find({$and:andFindCmdAry}).populate('SendTo', 'Username Level').populate('FromBorrowRequest', 'StoryTitle Category').sort(sorterRec).exec(function (err, messages){
			if (err) {
				console.log(err);
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}else{
				if(messages.length===0){
					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
				}else{
					for(j=messages.length-1;j>-1;j--){
						var testString=messages[j].Message+'\r\n'+messages[j].FromBorrowRequest.StoryTitle+'\r\n'+messages[j].SendTo.Username;
						var filterResponse=library.keywordFilter(orFlag,orFlagM,testString,messages[j]._id,keywordArray,keywordArrayM,msgObjIDarray);
																		
						if((!filterResponse.localFlag0)&&((!filterResponse.localFlag1)||(!filterResponse.localFlag2))){
							messages.splice(j, 1);
						}
					}
					
					if(classorRec!==null){
						for(j=messages.length-1;j>-1;j--){
							if(messages[j].FromBorrowRequest.Category!==classorRec){
								messages.splice(j, 1);
							}
						}
					}
					
					if((sorter==='預計總利息')||(sorter==='預計本利和')||(sorter==='預計平均利息')||(sorter==='預計平均本利和')||(sorter==='預計利本比')||(sorter==='信用等級')){
						for(i=0;i<messages.length;i++){
							messages[i].Level=messages[i].SendTo.Level;
							library.messageProcessor(messages[i]);
						}
						
						if(sorter==='預計總利息'){
							if(director==='大至小'){
								messages.sort(function(a,b) { return parseInt(b.InterestInFuture) - parseInt(a.InterestInFuture)} );
							}else if(director==='小至大'){
								messages.sort(function(a,b) { return parseInt(a.InterestInFuture) - parseInt(b.InterestInFuture)} );
							}
							library.arrayFilter(messages,'InterestInFuture',lboundRec,uboundRec);	
						}else if(sorter==='預計本利和'){
							if(director==='大至小'){
								messages.sort(function(a,b) { return parseInt(b.MoneyFuture) - parseInt(a.MoneyFuture)} );
							}else if(director==='小至大'){
								messages.sort(function(a,b) { return parseInt(a.MoneyFuture) - parseInt(b.MoneyFuture)} );
							}
							library.arrayFilter(messages,'MoneyFuture',lboundRec,uboundRec);	
						}else if(sorter==='預計平均利息'){
							if(director==='大至小'){
								messages.sort(function(a,b) { return parseInt(b.InterestInFutureMonth) - parseInt(a.InterestInFutureMonth)} );
							}else if(director==='小至大'){
								messages.sort(function(a,b) { return parseInt(a.InterestInFutureMonth) - parseInt(b.InterestInFutureMonth)} );
							}
							library.arrayFilter(messages,'InterestInFutureMonth',lboundRec,uboundRec);	
						}else if(sorter==='預計平均本利和'){
							if(director==='大至小'){
								messages.sort(function(a,b) { return parseInt(b.InterestInFutureMoneyMonth) - parseInt(a.InterestInFutureMoneyMonth)} );
							}else if(director==='小至大'){
								messages.sort(function(a,b) { return parseInt(a.InterestInFutureMoneyMonth) - parseInt(b.InterestInFutureMoneyMonth)} );
							}
							library.arrayFilter(messages,'InterestInFutureMoneyMonth',lboundRec,uboundRec);	
						}else if(sorter==='預計利本比'){
							if(director==='大至小'){
								messages.sort(function(a,b) { return parseFloat(b.InterestInFutureDivMoney) - parseFloat(a.InterestInFutureDivMoney)} );
							}else if(director==='小至大'){
								messages.sort(function(a,b) { return parseFloat(a.InterestInFutureDivMoney) - parseFloat(b.InterestInFutureDivMoney)} );
							}
							library.arrayFilter(messages,'InterestInFutureDivMoney',lboundRec,uboundRec);	
						}else if(sorter==='信用等級'){
							if(director==='大至小'){
								messages.sort(function(a,b) { return parseFloat(b.Level) - parseFloat(a.Level)} );
							}else if(director==='小至大'){
								messages.sort(function(a,b) { return parseFloat(a.Level) - parseFloat(b.Level)} );
							}
							library.arrayFilter(messages,'Level',lboundRec,uboundRec);	
						}
					}
					
					if(messages.length===0){
						res.redirect('/message?content='+encodeURIComponent('錯誤!'));
					}else{
						var arrayOp=[];
						for(i=0;i<messages.length;i++){
							var temp={MessageID:messages[i]._id.toString()};
							arrayOp.push(temp);
						}
						req.body.array=arrayOp;
						var infoJson={counter1:req.body.array.length,counter2:0};
						var address='/lender/lenderSendMessages?msgKeyword=&filter='+encodeURIComponent('未被確認')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1';
						deleteMessage(0,req.body.array.length,null,req,res,infoJson,address);
					}
				}
			}
		});
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/toLendCreate',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	if(typeof(req.body.FromBorrowRequest) === 'string'){
		toLendSamePart(res,req,toLendCreatePart,null);
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/toLendUpdate',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	if((typeof(req.body._id) === 'string')&&(typeof(req.body.FromBorrowRequest) === 'string')){
		Messages.findById(req.body._id).populate('SendTo', 'Username Email ifMailValid').populate('CreatedBy', 'Username Email ifMailValid').populate('FromBorrowRequest', 'StoryTitle').exec(function (err, message){
			if (err) {
				console.log(err);
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}else{
				if(!message){
					res.redirect('/message?content='+encodeURIComponent('未找到更新目標!'));
				}else{
					if(!message.CreatedBy._id.equals(req.user._id)){
						res.redirect('/message?content='+encodeURIComponent('認證錯誤!'));
					}else{
						if((message.Status!=='NotConfirmed')||(message.Type!=='toLend')){
							res.redirect('/message?content='+encodeURIComponent('錯誤!請回到上頁重整頁面'));
						}else{
							if(message.FromBorrowRequest._id.toString()!==req.body.FromBorrowRequest){
								res.redirect('/message?content='+encodeURIComponent('錯誤!'));
							}else{
								toLendSamePart(res,req,toLendUpdatePart,message);
							}
						}
					}
				}
			}
		});
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/destroy',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	if((typeof(req.body._id) === 'string')&&(typeof(req.body.FromBorrowRequest) === 'string')){
		Messages.findById(req.body._id).exec(function (err, message){
			if (err) {
				console.log(err);
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}else{
				if(!message){
					res.redirect('/message?content='+encodeURIComponent('未找到刪除目標!'));
				}else{
					if(!message.CreatedBy.equals(req.user._id)){
						res.redirect('/message?content='+encodeURIComponent('認證錯誤!'));
					}else{
						if(message.Status!=='NotConfirmed'){
							res.redirect('/message?content='+encodeURIComponent('錯誤!請回到上頁重整頁面'));
						}else{
							if(message.FromBorrowRequest.toString()!==req.body.FromBorrowRequest){
								res.redirect('/message?content='+encodeURIComponent('錯誤!'));
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
												if (borrow.Message[i].equals(message._id)) {
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
															if(removedItem.Type==='toLend'){
																res.redirect('/lender/story?id='+req.body.FromBorrowRequest);
															}else if(removedItem.Type==='toBorrow'){
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
				}
			}
		});
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

function deleteMessage(ctr,ctrTarget,returnSring,req,res,infoJson,address){
	if(typeof(req.body.array[ctr].MessageID) === 'string'){
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
					if(!message.CreatedBy.equals(req.user._id)){
						ctr++;
						if(ctr<ctrTarget){
							deleteMessage(ctr,ctrTarget,'有些訊息因認證錯誤無法刪除!',req,res,infoJson)
						}else{
							deleteRedirector(req,res,'有些訊息因認證錯誤無法刪除!',infoJson,address);
						}
					}else{
						if(message.Status!=='NotConfirmed'){
							ctr++;
							if(ctr<ctrTarget){
								deleteMessage(ctr,ctrTarget,'有些訊息因錯誤無法刪除!',req,res,infoJson)
							}else{
								deleteRedirector(req,res,'有些訊息因錯誤無法刪除!',infoJson,address);
							}
						}else{
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
											if (borrow.Message[i].equals(message._id)) {
												ctr0=i;
												break;
											}
										};
										if(ctr0>-1){
											borrow.Message.splice(ctr0, 1);
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
						}
					}
				}
			}
		});
	}else{
		ctr++;
		if(ctr<ctrTarget){
			deleteMessage(ctr,ctrTarget,'有些訊息因錯誤無法刪除!',req,res,infoJson,address);
		}else{
			deleteRedirector(req,res,'有些訊息因錯誤無法刪除!',infoJson,address);
		}
	}
}

function deleteRedirector(req,res,content,info,address){
	var json={Content:content,InfoJSON:info};
	var string=JSON.stringify(json);
	
	req.flash('deleteFlash',string);
	req.session.save(function(err){
		if(err){
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			res.redirect(address);
		}
	});
}

module.exports = router;
