var library=require( './library.js' );
var mongoose = require('mongoose');
var Transactions  = mongoose.model('Transactions');
var BankAccounts  = mongoose.model('BankAccounts');
var Lends  = mongoose.model('Lends');
var Messages  = mongoose.model('Messages');
var sanitizer = require('sanitizer');

var express = require('express');
var router = express.Router();

router.post('/createTest', function(req, res, next) {
	var id=sanitizer.sanitize(req.body.CreatedFrom);
	
	Messages.findById(id).exec(function (err, message){
		if (err) {
			console.log(err);
			res.json({error: err.name}, 500);
		}else{
			if(!message){
				res.json({error: 'no such message'}, 500);
			}else{
				var toCreate = new Transactions();
				toCreate.Principal=sanitizer.sanitize(req.body.Principal);
				toCreate.InterestRate=sanitizer.sanitize(req.body.InterestRate);
				toCreate.MonthPeriod=sanitizer.sanitize(req.body.MonthPeriod);
				toCreate.CreatedFrom=sanitizer.sanitize(req.body.CreatedFrom);
				toCreate.Borrower=sanitizer.sanitize(req.body.Borrower);
				toCreate.Lender=sanitizer.sanitize(req.body.Lender);
				toCreate.Level=message.Level;
				
				toCreate.save(function (err,newCreate) {
					if (err){
						console.log(err);
						res.json({error: err.name}, 500);
					}else{
						res.json(newCreate);
					}
				});
			}
		}
	});
});

router.post('/buyInsurance',library.ensureAuthenticated, function(req, res, next) {
	var JSONobj=JSON.parse(req.body.JsonArrayString);
	req.body.array=JSONobj.array;
	if(req.body.array.length>0){
		buyInsurance(0,req.body.array.length,null,req,res);
	}
});

router.get('/buyInsuranceAll/:oneid?/:sorter?',library.ensureAuthenticated, function(req, res, next) {
	var oneid=decodeURIComponent(req.query.oneid);
	var sorter=decodeURIComponent(req.query.sorter);
	
	var sorterRec;
	
	if(sorter=='最新'){
		sorterRec="-Updated";
	}else if(sorter=='已獲利最多'){
		sorterRec="-InterestCumulated";
	}else if(sorter=='利率最高'){
		sorterRec="-InterestRate";
	}else if(sorter=='金額最大'){
		sorterRec="-Principal";
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
	}else if(sorter=='成交日期最晚'){
		sorterRec="-Created";
	}else if(sorter=='收款記錄最多'){
		sorterRec="-Updated";
	}else if(sorter=='保險所需費用最高'){
		sorterRec="-Principal";
	}
	
	var andFindCmdAry=[];
	andFindCmdAry.push({"Lender": req.user._id});
	andFindCmdAry.push({"InsuranceFeePaid":0});
	if(mongoose.Types.ObjectId.isValid(oneid)){
		var ObjID=mongoose.Types.ObjectId(oneid);
		andFindCmdAry.push({"_id": ObjID});
	}
	
	Transactions.find({$and:andFindCmdAry}).sort(sorterRec).exec(function (err, transactions){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+'錯誤!');
		}else{
			if(transactions.length==0){
				res.redirect('/message?content='+'錯誤!');
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
						transactions[i].ReturnCount=transactions[i].Return.length;
					}
					
					if(sorter=='預計總利息最高'){
						transactions.sort(function(a,b) { return parseFloat(b.InterestInFuture) - parseFloat(a.InterestInFuture)} );
					}else if(sorter=='預計平均利息最高'){
						transactions.sort(function(a,b) { return parseFloat(b.InterestInFutureMonth) - parseFloat(a.InterestInFutureMonth)} );
					}else if(sorter=='預計平均本利和最高'){
						transactions.sort(function(a,b) { return parseFloat(b.InterestInFutureMoneyMonth) - parseFloat(a.InterestInFutureMoneyMonth)} );
					}else if(sorter=='預計利本比最高'){
						transactions.sort(function(a,b) { return parseFloat(b.InterestInFutureDivMoney) - parseFloat(a.InterestInFutureDivMoney) } );
					}else if(sorter=='收款記錄最多'){
						transactions.sort(function(a,b) { return b.ReturnCount - a.ReturnCount } );
					}
				}
				
				var arrayOp=[];
				for(i=0;i<transactions.length;i++){
					var temp={TransactionID:transactions[i]._id};
					arrayOp.push(temp);
				}
				req.body.array=arrayOp;
				buyInsurance(0,req.body.array.length,null,req,res);
			}
		}
	});
});

function buyInsurance(ctr,ctrTarget,returnSring,req,res){
	Transactions.findById(req.body.array[ctr].TransactionID).exec(function (err, transaction){
		if (err) {
			console.log(err);
			ctr++;
			if(ctr<ctrTarget){
				buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res);
			}else{
				res.redirect('/message?content='+encodeURIComponent('有些交易因錯誤無法購買保險!'));
			}
		}else{
			if(!transaction){
				ctr++;
				if(ctr<ctrTarget){
					buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res);
				}else{
					res.redirect('/message?content='+encodeURIComponent('有些交易因錯誤無法購買保險!'));
				}
			}else{
				if(transaction.InsuranceFeePaid>0){
					ctr++;
					if(ctr<ctrTarget){
						buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res);
					}else{
						res.redirect('/message?content='+encodeURIComponent('有些交易因錯誤無法購買保險!'));
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
									buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res);
								}else{
									res.redirect('/message?content='+encodeURIComponent('有些交易因錯誤無法購買保險!'));
								}
							}else{
								if(!lenderBankaccount){
									ctr++;
									if(ctr<ctrTarget){
										buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res);
									}else{
										res.redirect('/message?content='+encodeURIComponent('有些交易因錯誤無法購買保險!'));
									}
								}else{
									var insuranceFee=Math.round(transaction.Principal*library.insuranceRate);
									
									if(lenderBankaccount.MoneyInBankAccount<insuranceFee){
										ctr++;
										if(ctr<ctrTarget){
											buyInsurance(ctr,ctrTarget,'有些交易因銀行存款不足無法購買保險!',req,res);
										}else{
											res.redirect('/message?content='+encodeURIComponent('有些交易因銀行存款不足無法購買保險!'));
										}
									}else{
										lenderBankaccount.MoneyInBankAccount-=insuranceFee;
										lenderBankaccount.Updated=Date.now();
										lenderBankaccount.save(function (err,updatedLenderBankaccount) {
											if (err) {
												console.log(err);
												ctr++;
												if(ctr<ctrTarget){
													buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res);
												}else{
													res.redirect('/message?content='+encodeURIComponent('有些交易因錯誤無法購買保險!'));
												}
											}else{
												transaction.InsuranceFeePaid+=insuranceFee;
												transaction.Updated=Date.now();
												transaction.save(function (err,updatedTransaction) {
													if (err) {
														console.log(err);
														ctr++;
														if(ctr<ctrTarget){
															buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res);
														}else{
															res.redirect('/message?content='+encodeURIComponent('有些交易因錯誤無法購買保險!'));
														}
													}else{
														Lends.findOne({"CreatedBy": transaction.Lender}).exec(function (err, lend){
															if(err) {
																console.log(err);
																ctr++;
																if(ctr<ctrTarget){
																	buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res);
																}else{
																	res.redirect('/message?content='+encodeURIComponent('有些交易因錯誤無法購買保險!'));
																}
															}else{
																if(!lend){
																	ctr++;
																	if(ctr<ctrTarget){
																		buyInsurance(ctr,ctrTarget,returnSring,req,res)
																	}else{
																		res.redirect('/lender/lenderTransactionRecord?filter='+encodeURIComponent('已保險')+'&sorter='+encodeURIComponent('最新')+'&page=1');
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
																					buyInsurance(ctr,ctrTarget,'有些交易因錯誤無法購買保險!',req,res);
																				}else{
																					res.redirect('/message?content='+encodeURIComponent('有些交易因錯誤無法購買保險!'));
																				}
																			}else{
																				ctr++;
																				if(ctr<ctrTarget){
																					buyInsurance(ctr,ctrTarget,returnSring,req,res)
																				}else{
																					res.redirect('/lender/lenderTransactionRecord?filter='+encodeURIComponent('已保險')+'&sorter='+encodeURIComponent('最新')+'&page=1');
																				}
																			}
																		});
																	}else{
																		ctr++;
																		if(ctr<ctrTarget){
																			buyInsurance(ctr,ctrTarget,returnSring,req,res)
																		}else{
																			res.redirect('/lender/lenderTransactionRecord?filter='+encodeURIComponent('已保險')+'&sorter='+encodeURIComponent('最新')+'&page=1');
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

module.exports = router;
