var library=require( './library.js' );
var mongoose = require('mongoose');
var Borrows  = mongoose.model('Borrows');
var Lends  = mongoose.model('Lends');
var Messages  = mongoose.model('Messages');
var BankAccounts  = mongoose.model('BankAccounts');
var Transactions  = mongoose.model('Transactions');
var sanitizer = require('sanitizer');

var express = require('express');
var router = express.Router();

router.post('/createTest', function(req, res, next) {
	var id=sanitizer.sanitize(req.body.FromBorrowRequest);
	
	Borrows.findById(id).exec(function (err, borrow){
		if (err) {
			console.log(err);
			res.json({error: err.name}, 500);
		}else{
			if(!borrow){
				res.json({error: 'no such borrow'}, 500);
			}else{
				var toCreate = new Messages();
				toCreate.FromBorrowRequest=sanitizer.sanitize(req.body.FromBorrowRequest);
				toCreate.Message=sanitizer.sanitize(req.body.Message);
				toCreate.MoneyToLend=sanitizer.sanitize(req.body.MoneyToLend);
				toCreate.InterestRate=sanitizer.sanitize(req.body.InterestRate);
				toCreate.MonthPeriod=sanitizer.sanitize(req.body.MonthPeriod);
				toCreate.SendTo=sanitizer.sanitize(req.body.SendTo);
				toCreate.CreatedBy=sanitizer.sanitize(req.body.CreatedBy);
				toCreate.Type=sanitizer.sanitize(req.body.Type);
				toCreate.Level=borrow.Level;
				
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

function toLendSamePart(res,req,differentPart,outterPara){
	Borrows.findById(req.body.FromBorrowRequest).exec(function (err, borrow){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			if(!borrow){
				res.redirect('/message?content='+chineseEncodeToURI('錯誤ID!'));
			}else{
				BankAccounts.findOne({"OwnedBy": req.user._id}).exec(function (err, lenderBankaccount){
					if (err) {
						console.log(err);
						res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
					}else{
						if(!lenderBankaccount){
							res.redirect('/message?content='+chineseEncodeToURI('無銀行帳戶!'));
						}else{
							var maxMoney=parseInt(lenderBankaccount.MoneyInBankAccount);
							var maxMoney2=parseInt(borrow.MoneyToBorrow)-parseInt(borrow.MoneyToBorrowCumulated);
							var maxMonth=parseInt(borrow.MonthPeriodAccepted);
							var maxRate=parseFloat(borrow.MaxInterestRateAccepted);
							
							var nowMoney=parseInt(sanitizer.sanitize(req.body.MoneyToLend));
							var rate=(parseFloat(sanitizer.sanitize(req.body.InterestRate))/100)+library.serviceChargeRate;//scr
							var month=parseInt(sanitizer.sanitize(req.body.MonthPeriod));
							
							if((req.body.MoneyToLend=='')||(req.body.InterestRate=='')||(req.body.MonthPeriod=='')){
								res.redirect('/message?content='+chineseEncodeToURI('必要參數未填!'));
							}else if((month<=0)||(nowMoney<=0)||(rate<=(0+library.serviceChargeRate))||(rate>=(1+library.serviceChargeRate))){
								res.redirect('/message?content='+chineseEncodeToURI('錯誤參數!'));//scr
							}else if(nowMoney>maxMoney){
								res.redirect('/message?content='+chineseEncodeToURI('金額超過您的銀行餘額!'));
							}else if(nowMoney>maxMoney2){
								res.redirect('/message?content='+chineseEncodeToURI('金額超過對方所需!'));
							}else if(month>maxMonth){
								res.redirect('/message?content='+chineseEncodeToURI('超過最大期數!'));
							}else if(rate>maxRate){
								res.redirect('/message?content='+chineseEncodeToURI('超過期望利率上限!'));
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
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			if(!borrowMessage){
				var toCreate = new Messages();
				toCreate.FromBorrowRequest=sanitizer.sanitize(req.body.FromBorrowRequest);
				toCreate.Message=sanitizer.sanitize(req.body.Message);
				toCreate.MoneyToLend=parseInt(sanitizer.sanitize(req.body.MoneyToLend));
				toCreate.InterestRate=(parseFloat(sanitizer.sanitize(req.body.InterestRate))/100)+library.serviceChargeRate;//scr
				toCreate.MonthPeriod=parseInt(sanitizer.sanitize(req.body.MonthPeriod));
				toCreate.CreatedBy= req.user._id
				toCreate.SendTo=borrow.CreatedBy;
				toCreate.Type='toLend';
				toCreate.Level=borrow.Level;
				
				toCreate.save(function (err,newCreate) {
					if (err){
						console.log(err);
						res.redirect('/message?content='+chineseEncodeToURI('新建失敗!'));
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
									res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
								}else{
									BankAccounts.findOne({"OwnedBy": newCreateTransaction.Borrower}).exec(function (err, borrowerBankaccount){
										if (err) {
											console.log(err);
											res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
										}else{
											if(!borrowerBankaccount){
												res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
											}else{
												borrowerBankaccount.MoneyInBankAccount+=newCreateTransaction.Principal;
												borrowerBankaccount.save(function (err,updatedBorrowerBankaccount) {
													if (err){
														console.log(err);
														res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
													}else{
														lenderBankaccount.MoneyInBankAccount-=newCreateTransaction.Principal;
														lenderBankaccount.save(function (err,updatedLenderBankaccount) {
															if (err){
																console.log(err);
																res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
															}else{				
																borrow.MoneyToBorrowCumulated+=newCreateTransaction.Principal;
																if(borrow.MoneyToBorrowCumulated>=borrow.MoneyToBorrow){
																	borrow.IfReadable=false;
																}
																borrow.save(function (err,updatedBorrow) {
																	if (err){
																		console.log(err);
																		res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
																	}else{				
																		Lends.findOne({"CreatedBy": newCreate.CreatedBy}).exec(function (err, lend){
																			if (err) {
																				console.log(err);
																				res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
																			}else{
																				if(!lend){
																					newCreate.Status='Confirmed';
																					newCreate.Transaction.push(newCreateTransaction._id);
																					newCreate.save(function (err,newCreateUpdated) {
																						if (err){
																							console.log(err);
																							res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
																						}else{
																							res.redirect('/story?id='+req.body.FromBorrowRequest);
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
																							res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
																						}else{		
																							newCreate.Status='Confirmed';
																							newCreate.Transaction.push(newCreateTransaction._id);
																							newCreate.save(function (err,newCreateUpdated) {
																								if (err){
																									console.log(err);
																									res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
																								}else{
																									res.redirect('/story?id='+req.body.FromBorrowRequest);
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
							res.redirect('/story?id='+req.body.FromBorrowRequest);
						}
					}
				});
			}else{
				res.redirect('/message?content='+chineseEncodeToURI('錯誤!請回到上頁重整頁面'));
			}
		}
	});
}

function toLendUpdatePart(res,req,innerPara,innerPara2,message){
	message.Message=sanitizer.sanitize(req.body.Message);
	message.MoneyToLend=parseInt(sanitizer.sanitize(req.body.MoneyToLend));
	message.InterestRate=(parseFloat(sanitizer.sanitize(req.body.InterestRate))/100)+library.serviceChargeRate;//scr
	message.MonthPeriod=parseInt(sanitizer.sanitize(req.body.MonthPeriod));
	message.Updated = Date.now();
	
	message.save(function (err,newUpdate) {
		if (err){
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('更新失敗!'));
		}else{
			res.redirect('/story?id='+req.body.FromBorrowRequest);
		}
	});
}

router.post('/rejectToBorrowMessageInStory', ensureAuthenticated, function(req, res, next) {
	library.rejectMessage(false,0,0,null,req,res,false,'/story?id='+req.body.FromBorrowRequest);
});

router.post('/confirmToBorrowMessageInStory', ensureAuthenticated, function(req, res, next) {
	library.confirmToBorrowMessage(false,0,0,null,req,res,false,'/story?id='+req.body.FromBorrowRequest,true);
});

router.post('/rejectToBorrowMessageInLRM', ensureAuthenticated, function(req, res, next) {
	var JSONobj=JSON.parse(req.body.JsonArrayString);
	req.body.array=JSONobj.array;
	if(req.body.array.length>0){
		library.rejectMessage(true,0,req.body.array.length,null,req,res,false,'/lenderReceiveMessages?msgKeyword=&filter='+chineseEncodeToURI('已婉拒')+'&sorter='+chineseEncodeToURI('最新')+'&page=1');
	}
});

router.post('/confirmToBorrowMessageInLRM', ensureAuthenticated, function(req, res, next) {
	var JSONobj=JSON.parse(req.body.JsonArrayString);
	req.body.array=JSONobj.array;
	if(req.body.array.length>0){
		library.confirmToBorrowMessage(true,0,req.body.array.length,null,req,res,false,'/lenderReceiveMessages?msgKeyword=&filter='+chineseEncodeToURI('已同意')+'&sorter='+chineseEncodeToURI('最新')+'&page=1',true);
	}
});

router.get('/rejectToBorrowMessageInLRMall/:sorter?', ensureAuthenticated, function(req, res, next) {
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
	
	Messages.find({$and:[{"SendTo": req.user._id},{"Type": "toBorrow"},{"Status": "NotConfirmed"}]}).sort(sorterRec).exec(function (err, messages){
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
						messages[i].InterestInFutureDivMoney=messages[i].InterestInFuture/messages[i].MoneyToLend;
						messages[i].InterestInFutureMonth=messages[i].InterestInFuture/messages[i].MonthPeriod;
						messages[i].InterestInFutureMoneyMonth=(messages[i].InterestInFuture+messages[i].MoneyToLend)/messages[i].MonthPeriod;
					}
					
					if(sorter=='預計總利息最高'){
						messages.sort(function(a,b) { return parseFloat(b.InterestInFuture) - parseFloat(a.InterestInFuture)} );
					}
					
					if(sorter=='預計平均利息最高'){
						messages.sort(function(a,b) { return parseFloat(b.InterestInFutureMonth) - parseFloat(a.InterestInFutureMonth)} );
					}
					
					if(sorter=='預計平均本利和最高'){
						messages.sort(function(a,b) { return parseFloat(b.InterestInFutureMoneyMonth) - parseFloat(a.InterestInFutureMoneyMonth)} );
					}
					
					if(sorter=='預計利本比最高'){
						messages.sort(function(a,b) { return parseFloat(b.InterestInFutureDivMoney) - parseFloat(a.InterestInFutureDivMoney) } );
					}
				}
				
				var arrayOp=[];
				for(i=0;i<messages.length;i++){
					var temp={MessageID:messages[i]._id};
					arrayOp.push(temp);
				}
				req.body.array=arrayOp;
				library.rejectMessage(true,0,req.body.array.length,null,req,res,false,'/lenderReceiveMessages?msgKeyword=&filter='+chineseEncodeToURI('已婉拒')+'&sorter='+chineseEncodeToURI('最新')+'&page=1');
			}
		}
	});
});

router.get('/confirmToBorrowMessageInLRMall/:sorter?', ensureAuthenticated, function(req, res, next) {
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
	
	Messages.find({$and:[{"SendTo": req.user._id},{"Type": "toBorrow"},{"Status": "NotConfirmed"}]}).sort(sorterRec).exec(function (err, messages){
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
						messages[i].InterestInFutureDivMoney=messages[i].InterestInFuture/messages[i].MoneyToLend;
						messages[i].InterestInFutureMonth=messages[i].InterestInFuture/messages[i].MonthPeriod;
						messages[i].InterestInFutureMoneyMonth=(messages[i].InterestInFuture+messages[i].MoneyToLend)/messages[i].MonthPeriod;
					}
					
					if(sorter=='預計總利息最高'){
						messages.sort(function(a,b) { return parseFloat(b.InterestInFuture) - parseFloat(a.InterestInFuture)} );
					}
					
					if(sorter=='預計平均利息最高'){
						messages.sort(function(a,b) { return parseFloat(b.InterestInFutureMonth) - parseFloat(a.InterestInFutureMonth)} );
					}
					
					if(sorter=='預計平均本利和最高'){
						messages.sort(function(a,b) { return parseFloat(b.InterestInFutureMoneyMonth) - parseFloat(a.InterestInFutureMoneyMonth)} );
					}
					
					if(sorter=='預計利本比最高'){
						messages.sort(function(a,b) { return parseFloat(b.InterestInFutureDivMoney) - parseFloat(a.InterestInFutureDivMoney) } );
					}
				}
				
				var arrayOp=[];
				for(i=0;i<messages.length;i++){
					var temp={FromBorrowRequest:messages[i].FromBorrowRequest,MessageID:messages[i]._id};
					arrayOp.push(temp);
				}
				req.body.array=arrayOp;
				library.confirmToBorrowMessage(true,0,req.body.array.length,null,req,res,false,'/lenderReceiveMessages?msgKeyword=&filter='+chineseEncodeToURI('已同意')+'&sorter='+chineseEncodeToURI('最新')+'&page=1',true);
			}
		}
	});
});

router.post('/toLendCreate', ensureAuthenticated, function(req, res, next) {
	toLendSamePart(res,req,toLendCreatePart,null);
});

router.post('/toLendUpdate', ensureAuthenticated, function(req, res, next) {
	Messages.findById(req.body._id).exec(function (err, message){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			if(!message){
				res.redirect('/message?content='+chineseEncodeToURI('未找到更新目標!'));
			}else{
				if(message.CreatedBy!=req.user._id){
					res.redirect('/message?content='+chineseEncodeToURI('認證錯誤!'));
				}else{
					toLendSamePart(res,req,toLendUpdatePart,message);
				}
			}
		}
	});
});

router.post('/destroy', ensureAuthenticated, function(req, res, next) {
	Messages.findById(req.body._id).exec(function (err, message){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			if(!message){
				res.redirect('/message?content='+chineseEncodeToURI('未找到刪除目標!'));
			}else{
				if(message.CreatedBy!=req.user._id){
					res.redirect('/message?content='+chineseEncodeToURI('認證錯誤!'));
				}else{
					message.remove(function (err,removedItem) {
						if (err){
							console.log(err);
							res.redirect('/message?content='+chineseEncodeToURI('刪除失敗!'));
						}else{
							if(removedItem.Type=='toLend'){
								res.redirect('/story?id='+req.body.FromBorrowRequest);
							}else if(removedItem.Type=='toBorrow'){
								res.redirect('/');
							}
						}
					});
				}
			}
		}
	});
});

module.exports = router;

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(null); }
	res.redirect('/message?content='+chineseEncodeToURI('請登入'));
}

function ensureAdmin(req, res, next) {
  var admimID="admimID";
  
  if(req.user._id==admimID){ return next(null); }
	res.redirect('/message?content='+chineseEncodeToURI('請以管理員身分登入'))
}

function chineseEncodeToURI(string){
	return encodeURIComponent(string);
}
