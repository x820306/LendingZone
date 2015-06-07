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
							message.Status='NotConfirmed';
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
		var address='/lender/lenderTransactionRecord?oneid=&filter='+encodeURIComponent('已保險')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1';
		buyInsurance(0,req.body.array.length,null,req,res,infoJson,address);
	}
});

router.post('/buyInsuranceAll',library.loginFormChecker,library.ensureAuthenticated, function(req, res, next) {
	var oneid=sanitizer.sanitize(req.body.oneid.trim());
	var sorter=sanitizer.sanitize(req.body.sorter.trim());
	var director=sanitizer.sanitize(req.body.director.trim());
	var lbound=sanitizer.sanitize(req.body.lbound.trim());
	var ubound=sanitizer.sanitize(req.body.ubound.trim());
	
	if((director!='大至小')&&(director!='小至大')){
		director='大至小';
	}
	
	var sorterRec=null;
	var sorterRecReserve=null;
	
	if(sorter=='建立日期'){
		sorterRecReserve='Created';
	}else if(sorter=='更新日期'){
		sorterRecReserve='Updated';
	}else if(sorter=='已獲利'){
		sorterRecReserve='InterestCumulated';
	}else if(sorter=='利率'){
		sorterRecReserve='InterestRate';
	}else if(sorter=='未還本金'){
		sorterRecReserve='Principal';
	}else if(sorter=='已還本金'){
		sorterRecReserve='PrincipalReturnedCumulated';
	}else if(sorter=='剩下期數'){
		sorterRecReserve='MonthPeriod';
	}else if(sorter=='已過期數'){
		sorterRecReserve='MonthPeriodHasPast';
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
	}else if(sorter=='收款記錄'){
		sorterRecReserve='Updated';
	}else if(sorter=='上次成功收款日期'){
		sorterRecReserve='Updated';
	}else if(sorter=='下次應收款日期'){
		sorterRecReserve='Updated';
	}else if(sorter=='已付保險費用'){
		sorterRecReserve='InsuranceFeePaid';
	}else if(sorter=='保險所需費用'){
		sorterRecReserve='Principal';
	}else{
		sorterRecReserve='Created';
		sorter='建立日期';
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
	}else if((sorter=='更新日期')||(sorter=='建立日期')||(sorter=='上次成功收款日期')||(sorter=='下次應收款日期')){
		var tester;
		if(lbound.trim()!=''){
			tester=Date.parse(lbound);
			if(!isNaN(tester)){
				lboundRec=new Date(tester);
				if((sorter=='上次成功收款日期')||(sorter=='下次應收款日期')){
					lboundRec=lboundRec.getTime();
				}
			}else{
				lbound='';
			}
		}
		if(ubound.trim()!=''){
			tester=Date.parse(ubound);
			if(!isNaN(tester)){
				uboundRec=new Date(tester);
				if((sorter=='上次成功收款日期')||(sorter=='下次應收款日期')){
					uboundRec=uboundRec.getTime();
				}
			}else{
				ubound='';
			}
		}
		if((sorter=='上次成功收款日期')||(sorter=='下次應收款日期')){
			revereDetector1=lboundRec;
			revereDetector2=uboundRec;
		}else{
			if(lboundRec!==null){
				revereDetector1=lboundRec.getTime();
			}
			if(uboundRec!==null){
				revereDetector2=uboundRec.getTime();
			}
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
	andFindCmdAry.push({"Lender": req.user._id});
	andFindCmdAry.push({"InsuranceFeePaid":0});
	andFindCmdAry.push({"Principal":{'$gt': 0 }});
	
	if((sorter!='預計總利息')&&(sorter!='預計平均利息')&&(sorter!='預計平均本利和')&&(sorter!='預計利本比')&&(sorter!='收款記錄')&&(sorter!='上次成功收款日期')&&(sorter!='下次應收款日期')){
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
	
	var oneid=oneid.replace(/\s\s+/g,' ');
	var stringArray=oneid.split(' ');
	var keywordArray=[];
	for(i=0;i<stringArray.length;i++){
		keywordArray.push(new RegExp(stringArray[i],'i'));
	}
	var ObjID=null;
	if(mongoose.Types.ObjectId.isValid(stringArray[0])){
		ObjID=mongoose.Types.ObjectId(stringArray[0]);
	}
	
	Transactions.find({$and:andFindCmdAry}).populate('Borrower', 'Username').populate('CreatedFrom', 'FromBorrowRequest').populate('Return', 'InterestShouldPaid InterestNotPaid Created').sort(sorterRec).exec(function (err, transactions){
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
							var testString=transactions[j].Borrower.Username+' '+transactions[j].CreatedFrom.FromBorrowRequest.StoryTitle;
							var localFlag=[];
							var ctr;
							localFlag[0]=false;
							localFlag[1]=false;
							
							if(ObjID){
								if(ObjID.equals(transactions[j]._id)){
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
								transactions.splice(j, 1);
							}
						}
						
						if((sorter=='預計總利息')||(sorter=='預計利本比')||(sorter=='預計平均利息')||(sorter=='預計平均本利和')){
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
							
							if(sorter=='預計總利息'){
								if(director=='大至小'){
									transactions.sort(function(a,b) { return parseFloat(b.InterestInFuture) - parseFloat(a.InterestInFuture)} );
								}else if(director=='小至大'){
									transactions.sort(function(a,b) { return parseFloat(a.InterestInFuture) - parseFloat(b.InterestInFuture)} );
								}
								library.arrayFilter(transactions,'InterestInFuture',lboundRec,uboundRec);	
							}else if(sorter=='預計平均利息'){
								if(director=='大至小'){
									transactions.sort(function(a,b) { return parseFloat(b.InterestInFutureMonth) - parseFloat(a.InterestInFutureMonth)} );
								}else if(director=='小至大'){
									transactions.sort(function(a,b) { return parseFloat(a.InterestInFutureMonth) - parseFloat(b.InterestInFutureMonth)} );
								}
								library.arrayFilter(transactions,'InterestInFutureMonth',lboundRec,uboundRec);	
							}else if(sorter=='預計平均本利和'){
								if(director=='大至小'){
									transactions.sort(function(a,b) { return parseFloat(b.InterestInFutureMoneyMonth) - parseFloat(a.InterestInFutureMoneyMonth)} );
								}else if(director=='小至大'){
									transactions.sort(function(a,b) { return parseFloat(a.InterestInFutureMoneyMonth) - parseFloat(b.InterestInFutureMoneyMonth)} );
								}
								library.arrayFilter(transactions,'InterestInFutureMoneyMonth',lboundRec,uboundRec);	
							}else if(sorter=='預計利本比'){
								if(director=='大至小'){
									transactions.sort(function(a,b) { return parseFloat(b.InterestInFutureDivMoney) - parseFloat(a.InterestInFutureDivMoney)} );
								}else if(director=='小至大'){
									transactions.sort(function(a,b) { return parseFloat(a.InterestInFutureDivMoney) - parseFloat(b.InterestInFutureDivMoney)} );
								}
								library.arrayFilter(transactions,'InterestInFutureDivMoney',lboundRec,uboundRec);	
							}
						}else if((sorter=='上次成功收款日期')||(sorter=='下次應收款日期')||(sorter=='收款記錄')){
							for(i=0;i<transactions.length;i++){
								transactions[i].ReturnCount=0;
								transactions[i].previousPayDateNum=-1;
								for(u=transactions[i].Return.length-1;u>-1;u--){
									if((transactions[i].Return[u].InterestShouldPaid-transactions[i].Return[u].InterestNotPaid)>0){
										transactions[i].ReturnCount+=1;
										if(transactions[i].previousPayDateNum==-1){
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
							
							if(sorter=='收款記錄'){
								if(director=='大至小'){
									transactions.sort(function(a,b) { return parseFloat(b.ReturnCount) - parseFloat(a.ReturnCount)} );
								}else if(director=='小至大'){
									transactions.sort(function(a,b) { return parseFloat(a.ReturnCount) - parseFloat(b.ReturnCount)} );
								}
								library.arrayFilter(transactions,'ReturnCount',lboundRec,uboundRec);
							}else if(sorter=='上次成功收款日期'){
								if(director=='大至小'){
									transactions.sort(function(a,b) { return parseFloat(b.previousPayDateNum) - parseFloat(a.previousPayDateNum)} );
								}else if(director=='小至大'){
									transactions.sort(function(a,b) { return parseFloat(a.previousPayDateNum) - parseFloat(b.previousPayDateNum)} );
								}
								library.arrayFilter(transactions,'previousPayDateNum',lboundRec,uboundRec);
							}else if(sorter=='下次應收款日期'){
								if(director=='大至小'){
									transactions.sort(function(a,b) { return parseFloat(b.nextPayDateNum) - parseFloat(a.nextPayDateNum)} );
								}else if(director=='小至大'){
									transactions.sort(function(a,b) { return parseFloat(a.nextPayDateNum) - parseFloat(b.nextPayDateNum)} );
								}
								library.arrayFilter(transactions,'nextPayDateNum',lboundRec,uboundRec);
							}
						}
						
						if(transactions.length==0){
							res.redirect('/message?content='+encodeURIComponent('錯誤!'));
						}else{
							var arrayOp=[];
							for(i=0;i<transactions.length;i++){
								var temp={TransactionID:transactions[i]._id};
								arrayOp.push(temp);
							}
							req.body.array=arrayOp;
							var infoJson={counter1:req.body.array.length,counter2:0,info1:0};
							var address='/lender/lenderTransactionRecord?oneid=&filter='+encodeURIComponent('已保險')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1';
							buyInsurance(0,req.body.array.length,null,req,res,infoJson,address);
						}
					}
				});
			}
		}
	});
});

function buyInsurance(ctr,ctrTarget,returnSring,req,res,infoJson,address){
	Transactions.findById(req.body.array[ctr].TransactionID).exec(function (err, transaction){
		if (err) {
			console.log(err);
			ctr++;
			if(ctr<ctrTarget){
				buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res,infoJson,address);
			}else{
				redirector(req,res,'有些交易因錯誤無法購買保險!',infoJson,address);
			}
		}else{
			if(!transaction){
				ctr++;
				if(ctr<ctrTarget){
					buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res,infoJson,address);
				}else{
					redirector(req,res,'有些交易因錯誤無法購買保險!',infoJson,address);
				}
			}else{
				if((transaction.InsuranceFeePaid!==0)||(transaction.Principal<=0)){
					ctr++;
					if(ctr<ctrTarget){
						buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res,infoJson,address);
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
									buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res,infoJson,address);
								}else{
									redirector(req,res,'有些交易因錯誤無法購買保險!',infoJson,address);
								}
							}else{
								if(!lenderBankaccount){
									ctr++;
									if(ctr<ctrTarget){
										buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res,infoJson,address);
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
											buyInsurance(ctr,ctrTarget,'有些交易因銀行存款不足無法購買保險!',req,res,infoJson,address);
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
													buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res,infoJson,address);
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
															buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res,infoJson,address);
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
																	buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res,infoJson,address);
																}else{
																	redirector(req,res,'有些交易因錯誤無法購買保險!',infoJson,address);
																}
															}else{
																if(!lend){
																	ctr++;
																	if(ctr<ctrTarget){
																		buyInsurance(ctr,ctrTarget,returnSring,req,res,infoJson,address)
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
																					buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res,infoJson,address);
																				}else{
																					redirector(req,res,'有些交易因錯誤無法購買保險!',infoJson,address);
																				}
																			}else{
																				ctr++;
																				if(ctr<ctrTarget){
																					buyInsurance(ctr,ctrTarget,returnSring,req,res,infoJson,address)
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
																			buyInsurance(ctr,ctrTarget,returnSring,req,res,infoJson,address)
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
