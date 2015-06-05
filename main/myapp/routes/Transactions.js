var library=require( './library.js' );
var mongoose = require('mongoose');
var Transactions  = mongoose.model('Transactions');
var BankAccounts  = mongoose.model('BankAccounts');
var Lends  = mongoose.model('Lends');
var Messages  = mongoose.model('Messages');
var Borrows  = mongoose.model('Borrows');
var sanitizer = require('sanitizer');

var express = require('express');
var router = express.Router();

router.post('/createTest', function(req, res, next) {
	var id=sanitizer.sanitize(req.body.CreatedFrom.trim());
	
	Messages.findById(id).exec(function (err, message){
		if (err) {
			console.log(err);
			res.json({error: err.name}, 500);
		}else{
			if(!message){
				res.json({error: 'no such message'}, 500);
			}else{
				var toCreate = new Transactions();
				toCreate.Principal=sanitizer.sanitize(req.body.Principal.trim());
				toCreate.InterestRate=sanitizer.sanitize(req.body.InterestRate.trim());
				toCreate.MonthPeriod=sanitizer.sanitize(req.body.MonthPeriod.trim());
				toCreate.CreatedFrom=id;
				toCreate.Borrower=sanitizer.sanitize(req.body.Borrower.trim());
				toCreate.Lender=sanitizer.sanitize(req.body.Lender.trim());
				toCreate.Level=message.Level;
				
				toCreate.save(function (err,newCreate) {
					if (err){
						console.log(err);
						res.json({error: err.name}, 500);
					}else{
						message.Transaction.push(newCreate._id);
						message.save(function (err,messageUpdated) {
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

router.post('/destroyTest', function(req, res, next) {
	Transactions.findById(req.body.TransactionID).exec(function (err, transaction){
		if (err) {
			console.log(err);
			res.json({error: err.name}, 500);
		}else{
			if(!transaction){
				res.json({error: 'no such transaction'}, 500);
			}else{
				Messages.findById(transaction.CreatedFrom).exec(function (err, message){
					if (err) {
						console.log(err);
						res.json({error: err.name}, 500);
					}else{
						if(!message){
							res.json({error: 'no such message'}, 500);
						}else{
							var ctr = -1;
							for (i = 0; i < message.Transaction.length; i++) {
								if (message.Transaction[i].toString() === transaction._id.toString()) {
									ctr=i;
									break;
								}
							};
							if(ctr>-1){
								message.Transaction.splice(ctr, 1);
							}
							message.save(function (err,updatedMessage){
								if (err){
									console.log(err);
									res.json({error: err.name}, 500);
								}else{	
									transaction.remove(function (err,removedItem){
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

router.post('/buyInsurance',library.loginFormChecker,library.ensureAuthenticated, function(req, res, next) {
	var JSONobj=JSON.parse(req.body.JsonArrayString);
	req.body.array=JSONobj.array;
	if(req.body.array.length>0){
		var infoJson={counter1:req.body.array.length,counter2:0,info1:0};
		buyInsurance(0,req.body.array.length,null,req,res,infoJson);
	}
});

router.post('/buyInsuranceAll',library.loginFormChecker,library.ensureAuthenticated, function(req, res, next) {
	var oneid=sanitizer.sanitize(req.body.oneid.trim());
	var sorter=sanitizer.sanitize(req.body.sorter.trim());
	
	var sorterRec=null;
	
	if(sorter=='最新'){
		sorterRec="-Updated";
	}else if(sorter=='已獲利最多'){
		sorterRec="-InterestCumulated";
	}else if(sorter=='利率最高'){
		sorterRec="-InterestRate";
	}else if(sorter=='未還本金最多'){
		sorterRec="-Principal";
	}else if(sorter=='已還本金最多'){
		sorterRec="-PrincipalReturnedCumulated";
	}else if(sorter=='剩下期數最多'){
		sorterRec="-MonthPeriod";
	}else if(sorter=='已過期數最多'){
		sorterRec="-MonthPeriodHasPast";
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
	}else if(sorter=='成交日期最晚'){
		sorterRec="-Created";
	}else if(sorter=='收款記錄最多'){
		sorterRec="-Updated";
	}else if(sorter=='上次成功收款日期最晚'){
		sorterRec="-Updated";
	}else if(sorter=='下次應收款日期最早'){
		sorterRec="-Updated";
	}else if(sorter=='保險所需費用最高'){
		sorterRec="-Principal";
	}else{
		sorter='最新';
		sorterRec="-Updated";
	}
	
	var andFindCmdAry=[];
	andFindCmdAry.push({"Lender": req.user._id});
	andFindCmdAry.push({"InsuranceFeePaid":0});
	
	var stringArray=oneid.replace(/\s\s+/g,' ').split(' ');
	var keywordArray=[];
	for(i=0;i<stringArray.length;i++){
		keywordArray.push(new RegExp(stringArray[i],'i'));
	}
	var ObjID=null;
	if(mongoose.Types.ObjectId.isValid(stringArray[0])){
		ObjID=mongoose.Types.ObjectId(stringArray[0]);
	}
	
	Transactions.find({$and:andFindCmdAry}).populate('Borrower', 'Username').populate('CreatedFrom', 'FromBorrowRequest').sort(sorterRec).exec(function (err, transactions){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			if(transactions.length==0){
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}else{
				var options = {
					path: 'CreatedFrom.FromBorrowRequest',
					model: Borrows,
					select: 'StoryTitle'
				};

				Messages.populate(transactions, options, function(err, transactions) {
					if(err){
						console.log(err);
						res.redirect('/message?content='+encodeURIComponent('錯誤!'));
					}else{
						for(j=transactions.length-1;j>-1;j--){
							var localFlag=[];
							var ctr;
							localFlag[0]=false;
							localFlag[1]=false;
							localFlag[2]=false;
							
							if(ObjID){
								if(ObjID.equals(transactions[j]._id)){
									localFlag[0]=true;
								}
							}
							
							ctr=0;
							for(k=0;k<keywordArray.length;k++){
								if(transactions[j].Borrower.Username.search(keywordArray[k])>-1){
									ctr++;
								}
							}
							if(ctr==keywordArray.length){
								localFlag[1]=true;
							}
							
							ctr=0;
							for(k=0;k<keywordArray.length;k++){
								if(transactions[j].CreatedFrom.FromBorrowRequest.StoryTitle.search(keywordArray[k])>-1){
									ctr++;
								}
							}
							if(ctr==keywordArray.length){
								localFlag[2]=true;
							}
							
							if((!localFlag[0])&&(!localFlag[1])&&(!localFlag[2])){
								transactions.splice(j, 1);
							}
						}
						
						if(transactions.length==0){
							res.redirect('/message?content='+encodeURIComponent('錯誤!'));
						}else{
							if((sorter=='預計總利息最高')||(sorter=='預計利本比最高')||(sorter=='預計平均利息最高')||(sorter=='預計平均本利和最高')){
								for(i=0;i<transactions.length;i++){
									transactions[i].InterestRate-=library.serviceChargeRate;//scr
									transactions[i].InterestInFuture=library.interestInFutureCalculator(transactions[i].Principal,transactions[i].InterestRate,transactions[i].MonthPeriod);
									if(transactions[i].Principal>0){
										transactions[i].InterestInFutureDivMoney=transactions[i].InterestInFuture/transactions[i].Principal;
									}else{
										transactions[i].InterestInFutureDivMoney=0;
									}
									if(transactions[i].MonthPeriod>0){
										transactions[i].InterestInFutureMonth=transactions[i].InterestInFuture/transactions[i].MonthPeriod;
									}else{
										transactions[i].InterestInFutureMonth=0;
									}
									if(transactions[i].MonthPeriod>0){
										transactions[i].InterestInFutureMoneyMonth=(transactions[i].InterestInFuture+transactions[i].Principal)/transactions[i].MonthPeriod;
									}else{
										transactions[i].InterestInFutureMoneyMonth=0;
									}
								}
								
								if(sorter=='預計總利息最高'){
									transactions.sort(function(a,b) { return parseFloat(b.InterestInFuture) - parseFloat(a.InterestInFuture)} );
								}else if(sorter=='預計平均利息最高'){
									transactions.sort(function(a,b) { return parseFloat(b.InterestInFutureMonth) - parseFloat(a.InterestInFutureMonth)} );
								}else if(sorter=='預計平均本利和最高'){
									transactions.sort(function(a,b) { return parseFloat(b.InterestInFutureMoneyMonth) - parseFloat(a.InterestInFutureMoneyMonth)} );
								}else if(sorter=='預計利本比最高'){
									transactions.sort(function(a,b) { return parseFloat(b.InterestInFutureDivMoney) - parseFloat(a.InterestInFutureDivMoney) } );
								}
							}else if((sorter=='上次成功收款日期最晚')||(sorter=='下次應收款日期最早')||(sorter=='收款記錄最多')){
								for(i=0;i<transactions.length;i++){
									transactions[i].ReturnCount=0;
									transactions[i].previousPayDateNum=0;
									for(u=transactions[i].Return.length-1;u>-1;u--){
										if((transactions[i].Return[u].PrincipalShouldPaid-transactions[i].Return[u].PrincipalNotPaid)>0){
											transactions[i].ReturnCount+=1;
											if(transactions[i].previousPayDateNum==0){
												transactions[i].previousPayDateNum=transactions[i].Return[u].Created.getTime();
											}
										}
									}
									if(transactions[i].MonthPeriod>0){
										var tempDate=new Date(transactions[i].Created.getTime());
										tempDate.setTime(tempDate.getTime()+1000*60*60*24*30*(transactions[i].MonthPeriodHasPast+1));
										transactions[i].nextPayDateNum=tempDate.getTime();
									}else{
										transactions[i].nextPayDateNum=Infinity;
									}
								}
								
								if(sorter=='收款記錄最多'){
									transactions.sort(function(a,b) { return b.ReturnCount - a.ReturnCount } );
								}else if(sorter=='上次成功收款日期最晚'){
									transactions.sort(function(a,b) { return b.previousPayDateNum - a.previousPayDateNum } );
								}else if(sorter=='下次應收款日期最早'){
									transactions.sort(function(a,b) { return a.nextPayDateNum - b.nextPayDateNum } );
								}
							}
							
							var arrayOp=[];
							for(i=0;i<transactions.length;i++){
								var temp={TransactionID:transactions[i]._id};
								arrayOp.push(temp);
							}
							req.body.array=arrayOp;
							var infoJson={counter1:req.body.array.length,counter2:0,info1:0};
							buyInsurance(0,req.body.array.length,null,req,res,infoJson);
						}
					}
				});
			}
		}
	});
});

function buyInsurance(ctr,ctrTarget,returnSring,req,res,infoJson){
	var address='/lender/lenderTransactionRecord?oneid=&filter='+encodeURIComponent('已保險')+'&sorter='+encodeURIComponent('最新')+'&page=1';
	Transactions.findById(req.body.array[ctr].TransactionID).exec(function (err, transaction){
		if (err) {
			console.log(err);
			ctr++;
			if(ctr<ctrTarget){
				buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res,infoJson);
			}else{
				redirector(req,res,'有些交易因錯誤無法購買保險!',infoJson,address);
			}
		}else{
			if(!transaction){
				ctr++;
				if(ctr<ctrTarget){
					buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res,infoJson);
				}else{
					redirector(req,res,'有些交易因錯誤無法購買保險!',infoJson,address);
				}
			}else{
				if(transaction.InsuranceFeePaid!==0){
					ctr++;
					if(ctr<ctrTarget){
						buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res,infoJson);
					}else{
						redirector(req,res,'有些交易因錯誤無法購買保險!',infoJson,address);
					}
				}else{
					if(req.user._id!=transaction.Lender){
						res.redirect('/message?content='+encodeURIComponent('認證錯誤!'));
					}else{
						BankAccounts.findOne({"OwnedBy": transaction.Lender}).exec(function (err, lenderBankaccount){	
							if (err) {
								console.log(err);
								ctr++;
								if(ctr<ctrTarget){
									buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res,infoJson);
								}else{
									redirector(req,res,'有些交易因錯誤無法購買保險!',infoJson,address);
								}
							}else{
								if(!lenderBankaccount){
									ctr++;
									if(ctr<ctrTarget){
										buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res,infoJson);
									}else{
										redirector(req,res,'有些交易因錯誤無法購買保險!',infoJson,address);
									}
								}else{
									var insuranceFee=Math.round(transaction.Principal*library.insuranceRate);
									if(insuranceFee<1){
										insuranceFee=1;
									}
									
									if(lenderBankaccount.MoneyInBankAccount<insuranceFee){
										ctr++;
										if(ctr<ctrTarget){
											buyInsurance(ctr,ctrTarget,'有些交易因銀行存款不足無法購買保險!',req,res,infoJson);
										}else{
											redirector(req,res,'有些交易因銀行存款不足無法購買保險!',infoJson,address);
										}
									}else{
										lenderBankaccount.MoneyInBankAccount-=insuranceFee;
										lenderBankaccount.Updated=Date.now();
										lenderBankaccount.save(function (err,updatedLenderBankaccount) {
											if (err) {
												console.log(err);
												ctr++;
												if(ctr<ctrTarget){
													buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res,infoJson);
												}else{
													redirector(req,res,'有些交易因錯誤無法購買保險!',infoJson,address);
												}
											}else{
												transaction.InsuranceFeePaid+=insuranceFee;
												transaction.Updated=Date.now();
												transaction.save(function (err,updatedTransaction) {
													if (err) {
														console.log(err);
														ctr++;
														if(ctr<ctrTarget){
															buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res,infoJson);
														}else{
															redirector(req,res,'有些交易因錯誤無法購買保險!',infoJson,address);
														}
													}else{
														infoJson.info1+=insuranceFee;
														infoJson.counter2+=1;
														Lends.findOne({"CreatedBy": transaction.Lender}).exec(function (err, lend){
															if(err) {
																console.log(err);
																ctr++;
																if(ctr<ctrTarget){
																	buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res,infoJson);
																}else{
																	redirector(req,res,'有些交易因錯誤無法購買保險!',infoJson,address);
																}
															}else{
																if(!lend){
																	ctr++;
																	if(ctr<ctrTarget){
																		buyInsurance(ctr,ctrTarget,returnSring,req,res,infoJson)
																	}else{
																		if(returnSring){	
																			redirector(req,res,returnSring,infoJson,address);
																		}else{
																			redirector(req,res,'',infoJson,address);
																		}
																	}
																}else{
																	if(lend.MaxMoneyToLend>updatedLenderBankaccount.MoneyInBankAccount){
																		lend.MaxMoneyToLend=updatedLenderBankaccount.MoneyInBankAccount;
																		lend.Updated=Date.now();
																		lend.save(function (err,updatedLend) {
																			if (err) {
																				console.log(err);
																				ctr++;
																				if(ctr<ctrTarget){
																					buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res,infoJson);
																				}else{
																					redirector(req,res,'有些交易因錯誤無法購買保險!',infoJson,address);
																				}
																			}else{
																				ctr++;
																				if(ctr<ctrTarget){
																					buyInsurance(ctr,ctrTarget,returnSring,req,res,infoJson)
																				}else{
																					if(returnSring){	
																						redirector(req,res,returnSring,infoJson,address);
																					}else{
																						redirector(req,res,'',infoJson,address);
																					}
																				}
																			}
																		});
																	}else{
																		ctr++;
																		if(ctr<ctrTarget){
																			buyInsurance(ctr,ctrTarget,returnSring,req,res,infoJson)
																		}else{
																			if(returnSring){	
																				redirector(req,res,returnSring,infoJson,address);
																			}else{
																				redirector(req,res,'',infoJson,address);
																			}
																		}
																	}
																}
															}
														});
													}
												});
											}
										});
									}
								}
							}
						});
					}
				}
			}
		}
	});
}

function redirector(req,res,content,info,address){
	var json={Contect:content,InfoJSON:info};
	var string=JSON.stringify(json);
	
	req.flash('buyInsuranceFlash',string);
	res.redirect(address);
}

module.exports = router;
