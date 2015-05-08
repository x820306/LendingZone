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
	var toCreate = new Messages();
	toCreate.FromBorrowRequest=sanitizer.sanitize(req.body.FromBorrowRequest);
	toCreate.Message=sanitizer.sanitize(req.body.Message);
	toCreate.MoneyToLend=sanitizer.sanitize(req.body.MoneyToLend);
	toCreate.InterestRate=sanitizer.sanitize(req.body.InterestRate);
	toCreate.MonthPeriod=sanitizer.sanitize(req.body.MonthPeriod);
	toCreate.SendTo=sanitizer.sanitize(req.body.SendTo);
	toCreate.CreatedBy=sanitizer.sanitize(req.body.CreatedBy);
	toCreate.Type=sanitizer.sanitize(req.body.Type);
	
	toCreate.save(function (err,newCreate) {
		if (err){
			console.log(err);
			res.json({error: err.name}, 500);
		}else{
			res.json(newCreate);
		}
	});
});

function toLendSamePart(res,req,differentPart,outterPara){
	Borrows.findById(req.body.FromBorrowRequest).populate('CreatedBy', 'AutoComfirmToLendMsgPeriod AutoComfirmToBorrowMsgPeriod').exec(function (err, borrow){
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
							var minMonth=parseInt(borrow.MonthPeriodAccepted);
							var maxRate=parseFloat(borrow.MaxInterestRateAccepted);
							
							var nowMoney=parseInt(sanitizer.sanitize(req.body.MoneyToLend));
							var rate=parseFloat(sanitizer.sanitize(req.body.InterestRate));
							var month=parseInt(sanitizer.sanitize(req.body.MonthPeriod));
							
							if((req.body.MoneyToLend=='')||(req.body.InterestRate=='')||(req.body.MonthPeriod=='')){
								res.redirect('/message?content='+chineseEncodeToURI('必要參數未填!'));
							}else if((month<=0)||(nowMoney<=0)||(rate<=0)||(rate>=1)){
								res.redirect('/message?content='+chineseEncodeToURI('錯誤參數!'));
							}else if((nowMoney>maxMoney)||(nowMoney>maxMoney2)){
								res.redirect('/message?content='+chineseEncodeToURI('超過金額限制!'));
							}else if(month<minMonth){
								res.redirect('/message?content='+chineseEncodeToURI('小於最小期數!'));
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
	Messages.findOne({$and:[{"CreatedBy": borrow.CreatedBy._id},{"SendTo": req.user._id},{"FromBorrowRequest": req.body.FromBorrowRequest},{"Type": "toBorrow"}]}).exec(function (err, borrowMessage){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			if(!borrowMessage){
				var toCreate = new Messages();
				toCreate.FromBorrowRequest=sanitizer.sanitize(req.body.FromBorrowRequest);
				toCreate.Message=sanitizer.sanitize(req.body.Message);
				toCreate.MoneyToLend=sanitizer.sanitize(req.body.MoneyToLend);
				toCreate.InterestRate=sanitizer.sanitize(req.body.InterestRate);
				toCreate.MonthPeriod=sanitizer.sanitize(req.body.MonthPeriod);
				toCreate.CreatedBy= req.user._id
				toCreate.SendTo=borrow.CreatedBy._id;
				toCreate.Type='toLend';
				
				toCreate.save(function (err,newCreate) {
					if (err){
						console.log(err);
						res.redirect('/message?content='+chineseEncodeToURI('新建失敗!'));
					}else{
						if(borrow.CreatedBy.AutoComfirmToLendMsgPeriod==0){
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
																		Lends.findOne({"CreatedBy": req.user._id}).exec(function (err, lend){
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
	message.MoneyToLend=sanitizer.sanitize(req.body.MoneyToLend);
	message.InterestRate=sanitizer.sanitize(req.body.InterestRate);
	message.MonthPeriod=sanitizer.sanitize(req.body.MonthPeriod);
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

function confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,returnSring,req,res){
	var FBR;
	if(!ifRecursive){
		FBR=req.body.FromBorrowRequest;
	}else{
		FBR=req.body.array[ctr].FromBorrowRequest;
	}
	Borrows.findById(FBR).exec(function (err, borrow){
		if (err) {
			console.log(err);
			if(ifRecursive){
				ctr++;
				if(ctr<ctrTarget){
					confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res);
				}else{
					res.redirect('/message?content='+'有些訊息因錯誤無法被同意!');
				}
			}else{
				res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
			}
		}else{
			if(!borrow){
				if(ifRecursive){
					ctr++;
					if(ctr<ctrTarget){
						confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res);
					}else{
						res.redirect('/message?content='+'有些訊息因錯誤無法被同意!');
					}
				}else{
					res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
				}
			}else{
				var MID;
				if(!ifRecursive){
					MID=req.body.MessageID;
				}else{
					MID=req.body.array[ctr].MessageID;
				}
				Messages.findById(MID).exec(function (err, message){
					if (err) {
						console.log(err);
						if(ifRecursive){
							ctr++;
							if(ctr<ctrTarget){
								confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res);
							}else{
								res.redirect('/message?content='+'有些訊息因錯誤無法被同意!');
							}
						}else{
							res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
						}
					}else{
						if(!message){
							if(ifRecursive){
								ctr++;
								if(ctr<ctrTarget){
									confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res);
								}else{
									res.redirect('/message?content='+'有些訊息因錯誤無法被同意!');
								}
							}else{
								res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
							}
						}else{
							BankAccounts.findOne({"OwnedBy": req.user._id}).exec(function (err, lenderBankaccount){
								if (err) {
									console.log(err);
									if(ifRecursive){
										ctr++;
										if(ctr<ctrTarget){
											confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res);
										}else{
											res.redirect('/message?content='+'有些訊息因錯誤無法被同意!');
										}
									}else{
										res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
									}
								}else{
									if(!lenderBankaccount){
										if(ifRecursive){
											ctr++;
											if(ctr<ctrTarget){
												confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res);
											}else{
												res.redirect('/message?content='+'有些訊息因錯誤無法被同意!');
											}
										}else{
											res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
										}
									}else{
										Lends.findOne({"CreatedBy": req.user._id}).exec(function (err, lend){
											if (err) {
												console.log(err);
												if(ifRecursive){
													ctr++;
													if(ctr<ctrTarget){
														confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res);
													}else{
														res.redirect('/message?content='+'有些訊息因錯誤無法被同意!');
													}
												}else{
													res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
												}
											}else{
												if(!lend){
													if(ifRecursive){
														ctr++;
														if(ctr<ctrTarget){
															confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res);
														}else{
															res.redirect('/message?content='+'有些訊息因錯誤無法被同意!');
														}
													}else{
														res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
													}
												}else{
													var maxMoney=parseInt(lenderBankaccount.MoneyInBankAccount);
													var maxMoney2=parseInt(borrow.MoneyToBorrow)-parseInt(borrow.MoneyToBorrowCumulated);
													
													var finalMoneyToLend=null;
													var finalInterestRate=null;
													var finalMonthPeriod=null;
													if(!ifRecursive){
														var minMonth=parseInt(message.MonthPeriod);
														var maxRate=parseFloat(message.InterestRate);
														
														var nowMoney=parseInt(sanitizer.sanitize(req.body.MoneyToLend));
														var rate=parseFloat(sanitizer.sanitize(req.body.InterestRate));
														var month=parseInt(sanitizer.sanitize(req.body.MonthPeriod));
														
														if((req.body.MoneyToLend=='')||(req.body.InterestRate=='')||(req.body.MonthPeriod=='')){
															returnSring='必要參數未填!';
														}else if((month<=0)||(nowMoney<=0)||(rate<=0)||(rate>=1)){
															returnSring='錯誤參數!';
														}else if(nowMoney>maxMoney){
															returnSring='超過您的銀行餘額!';
														}else if(nowMoney>maxMoney2){
															returnSring='超過對方所需!';
														}else if(month<minMonth){
															returnSring='小於該訊息希望期數!';
														}else if(rate>maxRate){
															returnSring='超過該訊息期望利率上限!';
														}else{
															finalMoneyToLend=sanitizer.sanitize(req.body.MoneyToLend);
															finalInterestRate=sanitizer.sanitize(req.body.InterestRate);
															finalMonthPeriod=sanitizer.sanitize(req.body.MonthPeriod);
														}
													}else{
														var maxMoney3=parseInt(lend.MaxMoneyToLend);
														var nowMoney2=parseInt(message.MoneyToLend);
														
														if(nowMoney2>maxMoney){
															returnSring='借款金額超過您銀行帳戶內的餘額';
														}else if(nowMoney2>maxMoney2){
															if(maxMoney2==0){
																returnSring='有些訊息因為對方已不需要借款而無法被同意，請拒絕這些訊息';
															}else{
																finalMoneyToLend=maxMoney2;
																finalInterestRate=message.InterestRate;
																finalMonthPeriod=message.MonthPeriod;
															}
														}else if(nowMoney2>maxMoney3){
															returnSring='借款金額超過您所設定之自動借款額度!';
														}else{
															finalMoneyToLend=message.MoneyToLend;
															finalInterestRate=message.InterestRate;
															finalMonthPeriod=message.MonthPeriod;
														}
													}
													if((returnSring)||(!finalMoneyToLend)||(!finalInterestRate)||(!finalMonthPeriod)){
														if(returnSring!='對方已不需要借款，請拒絕此訊息'){
															res.redirect('/message?content='+chineseEncodeToURI(returnSring));
														}else{
															if(ifRecursive){
																ctr++;
																if(ctr<ctrTarget){
																	confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,returnSring,req,res);
																}else{
																	res.redirect('/message?content='+'有些訊息因錯誤無法被同意!');
																}
															}else{
																res.redirect('/message?content='+chineseEncodeToURI(returnSring));
															}
														}
													}else{
														var toCreateTransaction = new Transactions();
														toCreateTransaction.Principal=finalMoneyToLend;
														toCreateTransaction.InterestRate=finalInterestRate;
														toCreateTransaction.MonthPeriod=finalMonthPeriod;
														toCreateTransaction.CreatedFrom=message._id;
														toCreateTransaction.Borrower=message.CreatedBy;
														toCreateTransaction.Lender=req.user._id;
														
														toCreateTransaction.save(function (err,newCreateTransaction) {
															if (err){
																console.log(err);
																if(ifRecursive){
																	ctr++;
																	if(ctr<ctrTarget){
																		confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res);
																	}else{
																		res.redirect('/message?content='+'有些訊息因錯誤無法被同意!');
																	}
																}else{
																	res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
																}
															}else{
																BankAccounts.findOne({"OwnedBy": newCreateTransaction.Borrower}).exec(function (err, borrowerBankaccount){
																	if (err) {
																		console.log(err);
																		if(ifRecursive){
																			ctr++;
																			if(ctr<ctrTarget){
																				confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res);
																			}else{
																				res.redirect('/message?content='+'有些訊息因錯誤無法被同意!');
																			}
																		}else{
																			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
																		}
																	}else{
																		if(!borrowerBankaccount){
																			if(ifRecursive){
																				ctr++;
																				if(ctr<ctrTarget){
																					confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res);
																				}else{
																					res.redirect('/message?content='+'有些訊息因錯誤無法被同意!');
																				}
																			}else{
																				res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
																			}
																		}else{
																			borrowerBankaccount.MoneyInBankAccount+=newCreateTransaction.Principal;
																			borrowerBankaccount.save(function (err,updatedBorrowerBankaccount) {
																				if (err){
																					console.log(err);
																					if(ifRecursive){
																						ctr++;
																						if(ctr<ctrTarget){
																							confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res);
																						}else{
																							res.redirect('/message?content='+'有些訊息因錯誤無法被同意!');
																						}
																					}else{
																						res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
																					}
																				}else{
																					lenderBankaccount.MoneyInBankAccount-=newCreateTransaction.Principal;
																					lenderBankaccount.save(function (err,updatedLenderBankaccount) {
																						if (err){
																							console.log(err);
																							if(ifRecursive){
																								ctr++;
																								if(ctr<ctrTarget){
																									confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res);
																								}else{
																									res.redirect('/message?content='+'有些訊息因錯誤無法被同意!');
																								}
																							}else{
																								res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
																							}
																						}else{				
																							borrow.MoneyToBorrowCumulated+=newCreateTransaction.Principal;
																							if(borrow.MoneyToBorrowCumulated>=borrow.MoneyToBorrow){
																								borrow.IfReadable=false;
																							}
																							borrow.save(function (err,updatedBorrow) {
																								if (err){
																									console.log(err);
																									if(ifRecursive){
																										ctr++;
																										if(ctr<ctrTarget){
																											confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res);
																										}else{
																											res.redirect('/message?content='+'有些訊息因錯誤無法被同意!');
																										}
																									}else{
																										res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
																									}
																								}else{				
																									lend.MaxMoneyToLend-=newCreateTransaction.Principal;
																									if(lend.MaxMoneyToLend<0){
																										lend.MaxMoneyToLend=0;
																									}
																									lend.save(function (err,updatedLend) {
																										if (err){
																											console.log(err);
																											if(ifRecursive){
																												ctr++;
																												if(ctr<ctrTarget){
																													confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res);
																												}else{
																													res.redirect('/message?content='+'有些訊息因錯誤無法被同意!');
																												}
																											}else{
																												res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
																											}
																										}else{		
																											message.Status='Confirmed';
																											message.Transaction.push(newCreateTransaction._id);
																											message.save(function (err,newCreateUpdated) {
																												if (err){
																													console.log(err);
																													if(ifRecursive){
																														ctr++;																														
																														if(ctr<ctrTarget){
																															confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res);
																														}else{
																															res.redirect('/message?content='+'有些訊息因錯誤無法被同意!');
																														}
																													}else{
																														res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
																													}
																												}else{
																													if(ifRecursive){
																														ctr++;
																														if(ctr<ctrTarget){
																															confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,returnSring,req,res);
																														}else{
																															if(returnSring){
																																res.redirect('/message?content='+chineseEncodeToURI(returnSring));
																															}else{
																																res.redirect(req.get('referer'));
																															}
																														}
																													}else{
																														res.redirect(req.get('referer'));
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
															}
														});
													}
												}
											}
										});	
									}
								}
							});
						}
					}
				});
			}
		}
	});
}

router.post('/rejectToBorrowMessage', ensureAuthenticated, function(req, res, next) {
	Messages.findById(req.body.MessageID).exec(function (err, message){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			if(!message){
				res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
			}else{
				if(req.user._id!=message.SendTo){
					res.redirect('/message?content='+chineseEncodeToURI('認證錯誤!'));
				}else{
					message.Status="Rejected";
					message.Updated = Date.now();
					message.save(function (err,newUpdate) {
						if (err){
							console.log(err);
							res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
						}else{
							res.redirect('/story?id='+req.body.FromBorrowRequest);
						}
					});
				}
			}
		}
	});
});

router.post('/confirmToBorrowMessageInStory', ensureAuthenticated, function(req, res, next) {
	confirmToBorrowMessage(false,0,0,null,req,res);
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
