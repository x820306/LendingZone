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
	if((typeof(req.body.CreatedFrom) === 'string')&&(typeof(req.body.Principal) === 'string')&&(typeof(req.body.InterestRate) === 'string')&&(typeof(req.body.MonthPeriod) === 'string')&&(typeof(req.body.Borrower) === 'string')&&(typeof(req.body.Lender) === 'string')){
		req.body.CreatedFrom=sanitizer.sanitize(req.body.CreatedFrom.trim());
		req.body.Principal=sanitizer.sanitize(req.body.Principal.trim());
		req.body.InterestRate=sanitizer.sanitize(req.body.InterestRate.trim());
		req.body.MonthPeriod=sanitizer.sanitize(req.body.MonthPeriod.trim());
		req.body.Borrower=sanitizer.sanitize(req.body.Borrower.trim());
		req.body.Lender=sanitizer.sanitize(req.body.Lender.trim());
		
		Messages.findById(req.body.CreatedFrom).exec(function (err, message){
			if (err) {
				console.log(err);
				res.json({error: err.name}, 500);
			}else{
				if(!message){
					res.json({error: 'no such message'}, 500);
				}else{
					var toCreate = new Transactions();
					toCreate.Principal=req.body.Principal;
					toCreate.InterestRate=req.body.InterestRate;
					toCreate.MonthPeriod=req.body.MonthPeriod;
					toCreate.CreatedFrom=req.body.CreatedFrom;
					toCreate.Borrower=req.body.Borrower;
					toCreate.Lender=req.body.Lender;
					
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
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/destroyTest', function(req, res, next) {
	if(typeof(req.body.TransactionID) === 'string'){
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
								message.MoneyToLend=message.OldMoneyToLend;
								message.InterestRate=message.OldInterestRate;
								message.MonthPeriod=message.OldMonthPeriod;
								message.OldMoneyToLend=0;
								message.OldInterestRate=0.01;
								message.OldMonthPeriod=1;
								message.Status='NotConfirmed';
								var ctr = -1;
								for (i = 0; i < message.Transaction.length; i++) {
									if (message.Transaction[i].equals(transaction._id)) {
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
										Borrows.findById(updatedMessage.FromBorrowRequest).exec(function (err, borrow){
											if (err) {
												console.log(err);
												res.json({error: err.name}, 500);
											}else{
												if(!borrow){
													res.json({error: 'no such borrow'}, 500);
												}else{
													if(!borrow.IfReadable){
														borrow.IfReadable=true;
														borrow.save(function (err,updatedBorrow){
															if (err){
																console.log(err);
																res.json({error: err.name}, 500);
															}else{
																transaction.remove(function (err,removedItem){
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
													}else{
														transaction.remove(function (err,removedItem){
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
		});
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/buyInsurance',library.loginFormChecker,library.ensureAuthenticated, function(req, res, next) {
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
					var infoJson={counter1:req.body.array.length,counter2:0,info1:0};
					var address='/lender/lenderTransactionRecord?oneid=&filter='+encodeURIComponent('已保險')+'&messenger='+encodeURIComponent('不分訊息種類')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1';
					buyInsurance(0,req.body.array.length,null,req,res,infoJson,address);
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

router.post('/buyInsuranceAll',library.loginFormChecker,library.ensureAuthenticated, function(req, res, next) {
	if((typeof(req.body.oneid) === 'string')&&(typeof(req.body.sorter) === 'string')&&(typeof(req.body.director) === 'string')&&(typeof(req.body.lbound) === 'string')&&(typeof(req.body.ubound) === 'string')&&(typeof(req.body.classor) === 'string')&&(typeof(req.body.messenger) === 'string')){
		var oneid=library.replacer(sanitizer.sanitize(req.body.oneid),true);
		var sorter=library.replacer(sanitizer.sanitize(req.body.sorter),false);
		var director=library.replacer(sanitizer.sanitize(req.body.director),false);
		var lbound=library.replacer(sanitizer.sanitize(req.body.lbound),false);
		var ubound=library.replacer(sanitizer.sanitize(req.body.ubound),false);
		var classor=library.replacer(sanitizer.sanitize(req.body.classor),false);
		var messenger=library.replacer(sanitizer.sanitize(req.body.messenger),false);
		
		if((director!=='大至小')&&(director!=='小至大')){
			director='大至小';
		}
		
		var messengerRec=false;
				
		if(messenger==='收到訊息'){
			messengerRec=true;
		}else if(messenger==='送出訊息'){
			messengerRec=true;
		}else if(messenger==='不分訊息種類'){
			messengerRec=false;
		}else{
			messengerRec=false;
			messenger='不分訊息種類';
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
		
		if(sorter==='建立日期'){
			sorterRecReserve='Created';
		}else if(sorter==='更新日期'){
			sorterRecReserve='Updated';
		}else if(sorter==='已得利息'){
			sorterRecReserve='Updated';
		}else if(sorter==='已得本利和'){
			sorterRecReserve='Updated';
		}else if(sorter==='已得平均利息'){
			sorterRecReserve='Updated';
		}else if(sorter==='已得平均本利和'){
			sorterRecReserve='Updated';
		}else if(sorter==='已得利本比'){
			sorterRecReserve='Updated';
		}else if(sorter==='年利率'){
			sorterRecReserve='InterestRate';
		}else if(sorter==='原始本金'){
			sorterRecReserve='Principal';
		}else if(sorter==='額外本金'){
			sorterRecReserve='Updated';
		}else if(sorter=='目前總本金'){
			sorterRecReserve='Updated';
		}else if(sorter==='未還本金'){
			sorterRecReserve='Updated';
		}else if(sorter==='已還本金'){
			sorterRecReserve='Updated';
		}else if(sorter==='原始期數'){
			sorterRecReserve='MonthPeriod';
		}else if(sorter==='額外期數'){
			sorterRecReserve='Updated';
		}else if(sorter==='目前總期數'){
			sorterRecReserve='Updated';
		}else if(sorter==='剩下期數'){
			sorterRecReserve='Updated';
		}else if(sorter==='已過期數'){
			sorterRecReserve='Updated';
		}else if(sorter==='信用等級'){
			sorterRecReserve='Updated';
		}else if(sorter==='預計剩餘利息'){
			sorterRecReserve='Updated';
		}else if(sorter==='預計剩餘本利和'){
			sorterRecReserve='Updated';
		}else if(sorter==='預計剩餘平均利息'){
			sorterRecReserve='Updated';
		}else if(sorter==='預計剩餘平均本利和'){
			sorterRecReserve='Updated';
		}else if(sorter==='預計剩餘利本比'){
			sorterRecReserve='Updated';
		}else if(sorter==='收款次數'){
			sorterRecReserve='Updated';
		}else if(sorter==='上次成功收款日期'){
			sorterRecReserve='Updated';
		}else if(sorter==='下次應收款日期'){
			sorterRecReserve='Updated';
		}else if(sorter==='已付保險費用'){
			sorterRecReserve='InsuranceFeePaid';
		}else if(sorter==='保險所需費用'){
			sorterRecReserve='Updated';
		}else{
			sorterRecReserve='Created';
			sorter='建立日期';
		}
		sorterRec=library.directorDivider(director,sorterRecReserve,true);
		
		var lboundRec=null;
		var uboundRec=null;
		var revereDetector1=null;
		var revereDetector2=null;
		if((sorter==='年利率')||(sorter==='預計剩餘利本比')||(sorter==='已得利本比')){
			var tester;
			if(lbound.trim()!==''){
				tester=parseFloat(lbound);
				if(!isNaN(tester)){
					if((tester>=0)&&(tester<=99)){
						if(sorter==='年利率'){
							lboundRec=(tester/100)+library.serviceChargeRate;//scr
						}else{
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
					if(tester>=0){
						if(sorter==='年利率'){
							uboundRec=(tester/100)+library.serviceChargeRate;//scr
						}else{
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
		}else if((sorter==='更新日期')||(sorter==='建立日期')||(sorter==='上次成功收款日期')||(sorter==='下次應收款日期')){
			var tester;
			if(lbound.trim()!==''){
				tester=Date.parse(lbound);
				if(!isNaN(tester)){
					lboundRec=new Date(tester);
					if((sorter==='上次成功收款日期')||(sorter==='下次應收款日期')){
						lboundRec=lboundRec.getTime();
					}
				}else{
					lbound='';
				}
			}
			if(ubound.trim()!==''){
				tester=Date.parse(ubound);
				if(!isNaN(tester)){
					uboundRec=new Date(tester);
					if((sorter==='上次成功收款日期')||(sorter==='下次應收款日期')){
						uboundRec=uboundRec.getTime();
					}
				}else{
					ubound='';
				}
			}
			if((sorter==='上次成功收款日期')||(sorter==='下次應收款日期')){
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
		andFindCmdAry.push({"Lender": req.user._id});
		
		if((sorter==='建立日期')||(sorter==='更新日期')||(sorter==='年利率')||(sorter==='原始本金')||(sorter==='原始期數')||(sorter==='已付保險費用')){
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
		var keeper=oneid;
		var orResult=library.orReplacer(keeper);
		keeper=orResult.rtn;
		oneid=orResult.rtn2;
		orFlag=orResult.flag;
		orFlagM=orResult.flagM;

		var stringArray=keeper.split(' ');
		var keywordArray=[];
		var keywordArrayM=[];
		var ObjIDarray=[];
		library.arrayPro(stringArray,keywordArray,keywordArrayM,ObjIDarray);
		
		Transactions.find({$and:andFindCmdAry}).populate('Borrower', 'Username Level').populate('CreatedFrom', 'FromBorrowRequest Type').populate('Return').sort(sorterRec).exec(function (err, transactions){
			if (err) {
				console.log(err);
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}else{
				if(transactions.length===0){
					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
				}else{
					var options = {
						path: 'CreatedFrom.FromBorrowRequest',
						model: Borrows,
						select: 'StoryTitle Category'
					};

					Messages.populate(transactions, options, function(err, transactions) {
						if(err){
							console.log(err);
							res.redirect('/message?content='+encodeURIComponent('錯誤!'));
						}else{
							for(j=transactions.length-1;j>-1;j--){
								var testString=transactions[j].Borrower.Username+'\r\n'+transactions[j].CreatedFrom.FromBorrowRequest.StoryTitle;
								var filterResponse=library.keywordFilter(orFlag,orFlagM,testString,transactions[j]._id,keywordArray,keywordArrayM,ObjIDarray);
																		
								if((!filterResponse.localFlag0)&&((!filterResponse.localFlag1)||(!filterResponse.localFlag2))){
									transactions.splice(j, 1);
								}
							}
							
							if(messengerRec){
								for(j=transactions.length-1;j>-1;j--){
									if(messenger==='收到訊息'){
										if(transactions[j].CreatedFrom.Type!=='toBorrow'){
											transactions.splice(j, 1);
										}
									}else if(messenger==='送出訊息'){
										if(transactions[j].CreatedFrom.Type!=='toLend'){
											transactions.splice(j, 1);
										}
									}
								}
							}
							
							if(classorRec!==null){
								for(j=transactions.length-1;j>-1;j--){
									if(transactions[j].CreatedFrom.FromBorrowRequest.Category!==classorRec){
										transactions.splice(j, 1);
									}
								}
							}
							
							for(i=0;i<transactions.length;i++){
								transactions[i].Level=transactions[i].Borrower.Level;
								library.transactionProcessor(transactions[i],true);
							}
							
							for(j=transactions.length-1;j>-1;j--){
								if((transactions[j].InsuranceFeePaid!==0)||(transactions[j].PrincipalNotReturn<=0)){
									transactions.splice(j, 1);
								}
							}
							
							if(sorter==='預計剩餘利息'){
								if(director==='大至小'){
									transactions.sort(function(a,b) { return parseInt(b.InterestInFuture) - parseInt(a.InterestInFuture)} );
								}else if(director==='小至大'){
									transactions.sort(function(a,b) { return parseInt(a.InterestInFuture) - parseInt(b.InterestInFuture)} );
								}
								library.arrayFilter(transactions,'InterestInFuture',lboundRec,uboundRec);	
							}else if(sorter==='預計剩餘本利和'){
								if(director==='大至小'){
									transactions.sort(function(a,b) { return parseInt(b.MoneyFuture) - parseInt(a.MoneyFuture)} );
								}else if(director==='小至大'){
									transactions.sort(function(a,b) { return parseInt(a.MoneyFuture) - parseInt(b.MoneyFuture)} );
								}
								library.arrayFilter(transactions,'MoneyFuture',lboundRec,uboundRec);	
							}else if(sorter==='預計剩餘平均利息'){
								if(director==='大至小'){
									transactions.sort(function(a,b) { return parseInt(b.InterestInFutureMonth) - parseInt(a.InterestInFutureMonth)} );
								}else if(director==='小至大'){
									transactions.sort(function(a,b) { return parseInt(a.InterestInFutureMonth) - parseInt(b.InterestInFutureMonth)} );
								}
								library.arrayFilter(transactions,'InterestInFutureMonth',lboundRec,uboundRec);	
							}else if(sorter==='預計剩餘平均本利和'){
								if(director==='大至小'){
									transactions.sort(function(a,b) { return parseInt(b.InterestInFutureMoneyMonth) - parseInt(a.InterestInFutureMoneyMonth)} );
								}else if(director==='小至大'){
									transactions.sort(function(a,b) { return parseInt(a.InterestInFutureMoneyMonth) - parseInt(b.InterestInFutureMoneyMonth)} );
								}
								library.arrayFilter(transactions,'InterestInFutureMoneyMonth',lboundRec,uboundRec);	
							}else if(sorter==='預計剩餘利本比'){
								if(director==='大至小'){
									transactions.sort(function(a,b) { return parseFloat(b.InterestInFutureDivMoney) - parseFloat(a.InterestInFutureDivMoney)} );
								}else if(director==='小至大'){
									transactions.sort(function(a,b) { return parseFloat(a.InterestInFutureDivMoney) - parseFloat(b.InterestInFutureDivMoney)} );
								}
								library.arrayFilter(transactions,'InterestInFutureDivMoney',lboundRec,uboundRec);	
							}else if(sorter==='收款次數'){
								if(director==='大至小'){
									transactions.sort(function(a,b) { return parseInt(b.ReturnCount) - parseInt(a.ReturnCount)} );
								}else if(director==='小至大'){
									transactions.sort(function(a,b) { return parseInt(a.ReturnCount) - parseInt(b.ReturnCount)} );
								}
								library.arrayFilter(transactions,'ReturnCount',lboundRec,uboundRec);
							}else if(sorter==='上次成功收款日期'){
								if(director==='大至小'){
									transactions.sort(function(a,b) { return parseInt(b.previousPayDateNum) - parseInt(a.previousPayDateNum)} );
								}else if(director==='小至大'){
									transactions.sort(function(a,b) { return parseInt(a.previousPayDateNum) - parseInt(b.previousPayDateNum)} );
								}
								library.arrayFilter(transactions,'previousPayDateNum',lboundRec,uboundRec);
							}else if(sorter==='下次應收款日期'){
								if(director==='大至小'){
									transactions.sort(function(a,b) { return parseInt(b.nextPayDateNum) - parseInt(a.nextPayDateNum)} );
								}else if(director==='小至大'){
									transactions.sort(function(a,b) { return parseInt(a.nextPayDateNum) - parseInt(b.nextPayDateNum)} );
								}
								library.arrayFilter(transactions,'nextPayDateNum',lboundRec,uboundRec);
							}else if(sorter==='已得利息'){
								if(director==='大至小'){
									transactions.sort(function(a,b) { return parseInt(b.nextPayDateNum) - parseInt(a.nextPayDateNum)} );
								}else if(director==='小至大'){
									transactions.sort(function(a,b) { return parseInt(a.nextPayDateNum) - parseInt(b.nextPayDateNum)} );
								}
								library.arrayFilter(transactions,'nextPayDateNum',lboundRec,uboundRec);
							}else if(sorter==='已得本利和'){
								if(director==='大至小'){
									transactions.sort(function(a,b) { return parseInt(b.PrincipalInterest) - parseInt(a.PrincipalInterest)} );
								}else if(director==='小至大'){
									transactions.sort(function(a,b) { return parseInt(a.PrincipalInterest) - parseInt(b.PrincipalInterest)} );
								}
								library.arrayFilter(transactions,'PrincipalInterest',lboundRec,uboundRec);
							}else if(sorter==='已得平均利息'){
								if(director==='大至小'){
									transactions.sort(function(a,b) { return parseInt(b.InterestMonth) - parseInt(a.InterestMonth)} );
								}else if(director==='小至大'){
									transactions.sort(function(a,b) { return parseInt(a.InterestMonth) - parseInt(b.InterestMonth)} );
								}
								library.arrayFilter(transactions,'InterestMonth',lboundRec,uboundRec);
							}else if(sorter==='已得平均本利和'){
								if(director==='大至小'){
									transactions.sort(function(a,b) { return parseInt(b.PrincipalInterestMonth) - parseInt(a.PrincipalInterestMonth)} );
								}else if(director==='小至大'){
									transactions.sort(function(a,b) { return parseInt(a.PrincipalInterestMonth) - parseInt(b.PrincipalInterestMonth)} );
								}
								library.arrayFilter(transactions,'PrincipalInterestMonth',lboundRec,uboundRec);
							}else if(sorter==='已得利本比'){
								if(director==='大至小'){
									transactions.sort(function(a,b) { return parseInt(b.InterestDivPrincipal) - parseInt(a.InterestDivPrincipal)} );
								}else if(director==='小至大'){
									transactions.sort(function(a,b) { return parseInt(a.InterestDivPrincipal) - parseInt(b.InterestDivPrincipal)} );
								}
								library.arrayFilter(transactions,'InterestDivPrincipal',lboundRec,uboundRec);
							}else if(sorter==='額外本金'){
								if(director==='大至小'){
									transactions.sort(function(a,b) { return parseInt(b.ExtendPrincipal) - parseInt(a.ExtendPrincipal)} );
								}else if(director==='小至大'){
									transactions.sort(function(a,b) { return parseInt(a.ExtendPrincipal) - parseInt(b.ExtendPrincipal)} );
								}
								library.arrayFilter(transactions,'ExtendPrincipal',lboundRec,uboundRec);
							}else if(sorter==='目前總本金'){
								if(director==='大至小'){
									transactions.sort(function(a,b) { return parseInt(b.TotalPrincipalNow) - parseInt(a.TotalPrincipalNow)} );
								}else if(director==='小至大'){
									transactions.sort(function(a,b) { return parseInt(a.TotalPrincipalNow) - parseInt(b.TotalPrincipalNow)} );
								}
								library.arrayFilter(transactions,'TotalPrincipalNow',lboundRec,uboundRec);
							}else if(sorter==='未還本金'){
								if(director==='大至小'){
									transactions.sort(function(a,b) { return parseInt(b.PrincipalNotReturn) - parseInt(a.PrincipalNotReturn)} );
								}else if(director==='小至大'){
									transactions.sort(function(a,b) { return parseInt(a.PrincipalNotReturn) - parseInt(b.PrincipalNotReturn)} );
								}
								library.arrayFilter(transactions,'PrincipalNotReturn',lboundRec,uboundRec);
							}else if(sorter==='保險所需費用'){
								if(director==='大至小'){
									transactions.sort(function(a,b) { return parseInt(b.PrincipalNotReturn) - parseInt(a.PrincipalNotReturn)} );
								}else if(director==='小至大'){
									transactions.sort(function(a,b) { return parseInt(a.PrincipalNotReturn) - parseInt(b.PrincipalNotReturn)} );
								}
								library.arrayFilter(transactions,'PrincipalNotReturn',lboundRec,uboundRec);
							}else if(sorter==='已還本金'){
								if(director==='大至小'){
									transactions.sort(function(a,b) { return parseInt(b.PrincipalReturn) - parseInt(a.PrincipalReturn)} );
								}else if(director==='小至大'){
									transactions.sort(function(a,b) { return parseInt(a.PrincipalReturn) - parseInt(b.PrincipalReturn)} );
								}
								library.arrayFilter(transactions,'PrincipalReturn',lboundRec,uboundRec);
							}else if(sorter==='額外期數'){
								if(director==='大至小'){
									transactions.sort(function(a,b) { return parseInt(b.ExtendMonthPeriod) - parseInt(a.ExtendMonthPeriod)} );
								}else if(director==='小至大'){
									transactions.sort(function(a,b) { return parseInt(a.ExtendMonthPeriod) - parseInt(b.ExtendMonthPeriod)} );
								}
								library.arrayFilter(transactions,'ExtendMonthPeriod',lboundRec,uboundRec);
							}else if(sorter==='目前總期數'){
								if(director==='大至小'){
									transactions.sort(function(a,b) { return parseInt(b.TotalMonthPeriodNow) - parseInt(a.TotalMonthPeriodNow)} );
								}else if(director==='小至大'){
									transactions.sort(function(a,b) { return parseInt(a.TotalMonthPeriodNow) - parseInt(b.TotalMonthPeriodNow)} );
								}
								library.arrayFilter(transactions,'TotalMonthPeriodNow',lboundRec,uboundRec);
							}else if(sorter==='剩下期數'){
								if(director==='大至小'){
									transactions.sort(function(a,b) { return parseInt(b.MonthPeriodLeft) - parseInt(a.MonthPeriodLeft)} );
								}else if(director==='小至大'){
									transactions.sort(function(a,b) { return parseInt(a.MonthPeriodLeft) - parseInt(b.MonthPeriodLeft)} );
								}
								library.arrayFilter(transactions,'MonthPeriodLeft',lboundRec,uboundRec);
							}else if(sorter==='已過期數'){
								if(director==='大至小'){
									transactions.sort(function(a,b) { return parseInt(b.MonthPeriodPast) - parseInt(a.MonthPeriodPast)} );
								}else if(director==='小至大'){
									transactions.sort(function(a,b) { return parseInt(a.MonthPeriodPast) - parseInt(b.MonthPeriodPast)} );
								}
								library.arrayFilter(transactions,'MonthPeriodPast',lboundRec,uboundRec);
							}else if(sorter==='信用等級'){
								if(director==='大至小'){
									transactions.sort(function(a,b) { return parseInt(b.Level) - parseInt(a.Level)} );
								}else if(director==='小至大'){
									transactions.sort(function(a,b) { return parseInt(a.Level) - parseInt(b.Level)} );
								}
								library.arrayFilter(transactions,'Level',lboundRec,uboundRec);
							}
							
							if(transactions.length===0){
								res.redirect('/message?content='+encodeURIComponent('錯誤!'));
							}else{
								var arrayOp=[];
								for(i=0;i<transactions.length;i++){
									var temp={TransactionID:transactions[i]._id.toString()};
									arrayOp.push(temp);
								}
								req.body.array=arrayOp;
								var infoJson={counter1:req.body.array.length,counter2:0,info1:0};
								var address='/lender/lenderTransactionRecord?oneid=&filter='+encodeURIComponent('已保險')+'&messenger='+encodeURIComponent('不分訊息種類')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1';
								buyInsurance(0,req.body.array.length,null,req,res,infoJson,address);
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

function buyInsurance(ctr,ctrTarget,returnSring,req,res,infoJson,address){
	if(typeof(req.body.array[ctr].TransactionID) === 'string'){
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
						if(!transaction.Lender.equals(req.user._id)){
							ctr++;
							if(ctr<ctrTarget){
								buyInsurance(ctr,ctrTarget,'有些交易因認證錯誤無法購買保險!',req,res,infoJson,address);
							}else{
								redirector(req,res,'有些交易因認證錯誤無法購買保險!',infoJson,address);
							}
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
										var moneyLendedJson={
											autoLendCumulated:0,
											moneyLeftToAutoLend:0,
											moneyLeftToHendLend:0
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
														
														moneyLendedJson.moneyLeftToHendLend=lenderBankaccount.MoneyInBankAccount-moneyLendedJson.moneyLeftToAutoLend;
														if(moneyLendedJson.moneyLeftToHendLend<=0){
															moneyLendedJson.moneyLeftToHendLend=0;
														}
														
														var insuranceFee=Math.round(transaction.Principal*library.insuranceRate);
														if(insuranceFee<1){
															insuranceFee=1;
														}
														
														if(moneyLendedJson.moneyLeftToHendLend<insuranceFee){
															ctr++;
															if(ctr<ctrTarget){
																buyInsurance(ctr,ctrTarget,'有些交易因可支付餘額不足而無法購買保險!',req,res,infoJson,address);
															}else{
																redirector(req,res,'有些交易因可支付餘額而不足無法購買保險!',infoJson,address);
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
					}
				}
			}
		});
	}else{
		ctr++;
		if(ctr<ctrTarget){
			buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res,infoJson,address);
		}else{
			redirector(req,res,'有些交易因錯誤無法購買保險!',infoJson,address);
		}
	}
}

function redirector(req,res,content,info,address){
	var json={Contect:content,InfoJSON:info};
	var string=JSON.stringify(json);
	
	req.flash('buyInsuranceFlash',string);
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
