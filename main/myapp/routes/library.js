var mongoose = require('mongoose');
var Borrows  = mongoose.model('Borrows');
var Lends  = mongoose.model('Lends');
var Messages  = mongoose.model('Messages');
var BankAccounts  = mongoose.model('BankAccounts');
var Transactions  = mongoose.model('Transactions');
var sanitizer = require('sanitizer');
var autoComfirmToBorrowMsgArray=[];
var insuranceRate=0.01;
var serviceChargeRate=0.01;

exports.autoComfirmToBorrowMsgArray=autoComfirmToBorrowMsgArray;
exports.insuranceRate=insuranceRate;
exports.serviceChargeRate=serviceChargeRate;

exports.confirmToBorrowMessage = function(ifRecursive,ctr,ctrTarget,returnSring,req,res,ifAuto,resAddress,ifLenderSide){
	var FBR;
	if(!ifRecursive){
		FBR=req.body.FromBorrowRequest;
	}else{
		FBR=req.body.array[ctr].FromBorrowRequest;
	}
	Borrows.findById(FBR).populate('CreatedBy', 'Level').exec(function (err, borrow){
		if (err) {
			console.log(err);
			if(ifRecursive){
				ctr++;
				if(ctr<ctrTarget){
					exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide);
				}else{
					if(!ifAuto){
						res.redirect('/message?content='+chineseEncodeToURI('有些訊息因錯誤無法被同意!'));
					}
				}
			}else{
				if(!ifAuto){
					res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
				}
			}
		}else{
			if(!borrow){
				if(ifRecursive){
					ctr++;
					if(ctr<ctrTarget){
						exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide);
					}else{
						if(!ifAuto){
							res.redirect('/message?content='+chineseEncodeToURI('有些訊息因錯誤無法被同意!'));
						}
					}
				}else{
					if(!ifAuto){
						res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
					}
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
								exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide);
							}else{
								if(!ifAuto){
									res.redirect('/message?content='+chineseEncodeToURI('有些訊息因錯誤無法被同意!'));
								}
							}
						}else{
							if(!ifAuto){
								res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
							}
						}
					}else{
						if(!message){
							if(ifRecursive){
								ctr++;
								if(ctr<ctrTarget){
									exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide);
								}else{
									if(!ifAuto){
										res.redirect('/message?content='+chineseEncodeToURI('有些訊息因錯誤無法被同意!'));
									}
								}
							}else{
								if(!ifAuto){
									res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
								}
							}
						}else{
							if(message.Status!=="NotConfirmed"){
								if(ifRecursive){
									ctr++;
									if(ctr<ctrTarget){
										exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide);
									}else{
										if(!ifAuto){
											res.redirect('/message?content='+chineseEncodeToURI('有些訊息因錯誤無法被同意!'));
										}
									}
								}else{
									if(!ifAuto){
										res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
									}
								}
							}else{
								var authResult=true;
								
								if(ifLenderSide){
									if(req.user._id!=message.SendTo){
										if(!ifAuto){
											authResult=false;
											res.redirect('/message?content='+chineseEncodeToURI('認證錯誤!'));
										}
									}
								}else{
									if(req.user._id!=message.CreatedBy){
										if(!ifAuto){
											authResult=false;
											res.redirect('/message?content='+chineseEncodeToURI('認證錯誤!'));
										}
									}
								}
								
								if(authResult){
									BankAccounts.findOne({"OwnedBy": message.SendTo}).exec(function (err, lenderBankaccount){
										if (err) {
											console.log(err);
											if(ifRecursive){
												ctr++;
												if(ctr<ctrTarget){
													exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide);
												}else{
													if(!ifAuto){
														res.redirect('/message?content='+chineseEncodeToURI('有些訊息因錯誤無法被同意!'));
													}
												}
											}else{
												if(!ifAuto){
													res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
												}
											}
										}else{
											if(!lenderBankaccount){
												if(ifRecursive){
													ctr++;
													if(ctr<ctrTarget){
														exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide);
													}else{
														if(!ifAuto){
															res.redirect('/message?content='+chineseEncodeToURI('有些訊息因錯誤無法被同意!'));
														}
													}
												}else{
													if(!ifAuto){
														res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
													}
												}
											}else{
												Lends.findOne({"CreatedBy": message.SendTo}).exec(function (err, lend){
													if (err) {
														console.log(err);
														if(ifRecursive){
															ctr++;
															if(ctr<ctrTarget){
																exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide);
															}else{
																if(!ifAuto){
																	res.redirect('/message?content='+chineseEncodeToURI('有些訊息因錯誤無法被同意!'));
																}
															}
														}else{
															if(!ifAuto){
																res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
															}
														}
													}else{
														if(!lend){
															if(ifRecursive){
																ctr++;
																if(ctr<ctrTarget){
																	exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'找不到自動出借設定，待其重新設定後再嘗試',req,res,ifAuto,resAddress,ifLenderSide);
																}else{
																	if(!ifAuto){
																		res.redirect('/message?content='+chineseEncodeToURI('找不到自動出借設定，待其重新設定後再嘗試'));
																	}
																}
															}else{
																if(!ifAuto){
																	res.redirect('/message?content='+chineseEncodeToURI('找不到自動出借設定，待其重新設定後再嘗試'));
																}
															}
														}else{
															var maxMoney=parseInt(lenderBankaccount.MoneyInBankAccount);
															var maxMoney2=parseInt(borrow.MoneyToBorrow)-parseInt(borrow.MoneyToBorrowCumulated);
															var maxMoney3=parseInt(lend.MaxMoneyToLend);
															
															var finalMoneyToLend=null;
															var finalInterestRate=null;
															var finalMonthPeriod=null;
															if(!ifRecursive){
																var minMoney=parseInt(message.MoneyToLend);
																var maxMonth=parseInt(message.MonthPeriod);
																var maxRate=parseFloat(message.InterestRate);
																
																var nowMoney=parseInt(sanitizer.sanitize(req.body.MoneyToLend));
																var rate=(parseFloat(sanitizer.sanitize(req.body.InterestRate))/100)+exports.serviceChargeRate;//scr
																var month=parseInt(sanitizer.sanitize(req.body.MonthPeriod));
																
																if((req.body.MoneyToLend=='')||(req.body.InterestRate=='')||(req.body.MonthPeriod=='')){
																	returnSring='必要參數未填!';
																}else if((month<=0)||(nowMoney<=0)||(rate<=(0+exports.serviceChargeRate))||(rate>=(1+exports.serviceChargeRate))){
																	returnSring='錯誤參數!';
																}else if(nowMoney>maxMoney){
																	returnSring='金額超過您的銀行餘額!';
																}else if(nowMoney>maxMoney2){
																	returnSring='金額超過對方所需!';
																}else if(nowMoney>maxMoney3){
																	returnSring='金額超過您所設定之自動借款餘額!您可調高後再嘗試';
																}else if(nowMoney<minMoney){
																	returnSring='金額少於對方期望!';
																}else if(month>maxMonth){
																	returnSring='超過該訊息希望期數!';
																}else if(rate>maxRate){
																	returnSring='超過該訊息期望利率上限!';
																}else{
																	finalMoneyToLend=parseInt(sanitizer.sanitize(req.body.MoneyToLend));
																	finalInterestRate=(parseFloat(sanitizer.sanitize(req.body.InterestRate))/100)+exports.serviceChargeRate;//scr
																	finalMonthPeriod=parseInt(sanitizer.sanitize(req.body.MonthPeriod));
																}
															}else{
																var minRate=parseFloat(lend.InterestRate);
																var minMonth=parseInt(lend.MonthPeriod);
																var minLevel=parseInt(lend.MinLevelAccepted);
																var minInterestInFuture=parseFloat(lend.MinInterestInFuture);
																var minInterestInFutureMonth=parseFloat(lend.MinInterestInFutureMonth);
																var minInterestInFutureMoneyMonth=parseFloat(lend.MinInterestInFutureMoneyMonth);
																var minInterestInFutureDivMoney=parseFloat(lend.MinInterestInFutureDivMoney);
																
																var nowMoney2=parseInt(message.MoneyToLend);
																var rate2=parseFloat(message.InterestRate);
																var month2=parseInt(message.MonthPeriod);
																var level2=parseInt(borrow.CreatedBy.Level);
																var interestInFuture2=exports.interestInFutureCalculator(nowMoney2,rate2,month2);
																var interestInFutureMonth2=interestInFuture2/month2;
																var interestInFutureMoneyMonth2=(nowMoney2+interestInFuture2)/month2;
																var interestInFutureDivMoney2=interestInFuture2/nowMoney2;
																
																if(nowMoney2>maxMoney){
																	returnSring='有訊息因借款金額超過借出方銀行帳戶內的餘額而無法被同意';
																}else if(nowMoney2>maxMoney2){
																	if(maxMoney2==0){
																		returnSring='有些訊息因借入方已不需要借款或其條件不合您現在的自動出借設定而無法被同意，它們已被自動婉拒';
																	}else{
																		finalMoneyToLend=maxMoney2;
																		finalInterestRate=message.InterestRate;
																		finalMonthPeriod=message.MonthPeriod;
																	}
																}else if(nowMoney2>maxMoney3){
																	if(maxMoney3==0){
																		returnSring='有些訊息因借出方所設定之自動借款額度已用盡而無法被同意';
																	}else{
																		finalMoneyToLend=maxMoney3;
																		finalInterestRate=message.InterestRate;
																		finalMonthPeriod=message.MonthPeriod;
																	}
																}else if(rate2<minRate){
																	returnSring='有些訊息因借入方已不需要借款或其條件不合您現在的自動出借設定而無法被同意，它們已被自動婉拒';
																}else if(month2<minMonth){
																	returnSring='有些訊息因借入方已不需要借款或其條件不合您現在的自動出借設定而無法被同意，它們已被自動婉拒';
																}else if(level2<minLevel){
																	returnSring='有些訊息因借入方已不需要借款或其條件不合您現在的自動出借設定而無法被同意，它們已被自動婉拒';
																}else if(interestInFuture2<minInterestInFuture){
																	returnSring='有些訊息因借入方已不需要借款或其條件不合您現在的自動出借設定而無法被同意，它們已被自動婉拒';
																}else if(interestInFutureMonth2<minInterestInFutureMonth){
																	returnSring='有些訊息因借入方已不需要借款或其條件不合您現在的自動出借設定而無法被同意，它們已被自動婉拒';
																}else if(interestInFutureMoneyMonth2<minInterestInFutureMoneyMonth){
																	returnSring='有些訊息因借入方已不需要借款或其條件不合您現在的自動出借設定而無法被同意，它們已被自動婉拒';
																}else if(interestInFutureDivMoney2<minInterestInFutureDivMoney){
																	returnSring='有些訊息因借入方已不需要借款或其條件不合您現在的自動出借設定而無法被同意，它們已被自動婉拒';
																}else{
																	finalMoneyToLend=message.MoneyToLend;
																	finalInterestRate=message.InterestRate;
																	finalMonthPeriod=message.MonthPeriod;
																}
															}
															if((returnSring)||(!finalMoneyToLend)||(!finalInterestRate)||(!finalMonthPeriod)){
																if(returnSring!='有些訊息因借入方已不需要借款或其條件不合您現在的自動出借設定而無法被同意，它們已被自動婉拒'){
																	if(ifRecursive){
																		ctr++;
																		if(ctr<ctrTarget){
																			exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,returnSring,req,res,ifAuto,resAddress,ifLenderSide);
																		}else{
																			if(!ifAuto){
																				res.redirect('/message?content='+chineseEncodeToURI(returnSring));
																			}
																		}
																	}else{
																		if(!ifAuto){
																			res.redirect('/message?content='+chineseEncodeToURI(returnSring));
																		}
																	}
																}else{
																	message.Status="Rejected";
																	message.Updated = Date.now();
																	message.save(function (err,newUpdate) {
																		if (err){
																			console.log(err);
																			if(ifRecursive){
																				ctr++;
																				if(ctr<ctrTarget){
																					exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide);
																				}else{
																					if(!ifAuto){
																						res.redirect('/message?content='+chineseEncodeToURI('有些訊息因錯誤無法被同意!'));
																					}
																				}
																			}else{
																				if(!ifAuto){
																					res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
																				}
																			}
																		}else{
																			if(ifRecursive){
																				ctr++;
																				if(ctr<ctrTarget){
																					exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,returnSring,req,res,ifAuto,resAddress,ifLenderSide);
																				}else{
																					if(!ifAuto){
																						res.redirect('/message?content='+chineseEncodeToURI(returnSring));
																					}
																				}
																			}else{
																				if(!ifAuto){
																					res.redirect('/message?content='+chineseEncodeToURI(returnSring));
																				}
																			}
																		}
																	});
																}
															}else{
																var toCreateTransaction = new Transactions();
																toCreateTransaction.Principal=finalMoneyToLend;
																toCreateTransaction.InterestRate=finalInterestRate;
																toCreateTransaction.MonthPeriod=finalMonthPeriod;
																toCreateTransaction.CreatedFrom=message._id;
																toCreateTransaction.Borrower=message.CreatedBy;
																toCreateTransaction.Lender=message.SendTo;
																toCreateTransaction.Level=message.Level;
																
																toCreateTransaction.save(function (err,newCreateTransaction) {
																	if (err){
																		console.log(err);
																		if(ifRecursive){
																			ctr++;
																			if(ctr<ctrTarget){
																				exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide);
																			}else{
																				if(!ifAuto){
																					res.redirect('/message?content='+chineseEncodeToURI('有些訊息因錯誤無法被同意!'));
																				}
																			}
																		}else{
																			if(!ifAuto){
																				res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
																			}
																		}
																	}else{
																		BankAccounts.findOne({"OwnedBy": newCreateTransaction.Borrower}).exec(function (err, borrowerBankaccount){
																			if (err) {
																				console.log(err);
																				if(ifRecursive){
																					ctr++;
																					if(ctr<ctrTarget){
																						exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide);
																					}else{
																						if(!ifAuto){
																							res.redirect('/message?content='+chineseEncodeToURI('有些訊息因錯誤無法被同意!'));
																						}
																					}
																				}else{
																					if(!ifAuto){
																						res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
																					}
																				}
																			}else{
																				if(!borrowerBankaccount){
																					if(ifRecursive){
																						ctr++;
																						if(ctr<ctrTarget){
																							exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide);
																						}else{
																							if(!ifAuto){
																								res.redirect('/message?content='+chineseEncodeToURI('有些訊息因錯誤無法被同意!'));
																							}
																						}
																					}else{
																						if(!ifAuto){
																							res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
																						}
																					}
																				}else{
																					borrowerBankaccount.MoneyInBankAccount+=newCreateTransaction.Principal;
																					borrowerBankaccount.Updated=Date.now();
																					borrowerBankaccount.save(function (err,updatedBorrowerBankaccount) {
																						if (err){
																							console.log(err);
																							if(ifRecursive){
																								ctr++;
																								if(ctr<ctrTarget){
																									exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide);
																								}else{
																									if(!ifAuto){
																										res.redirect('/message?content='+chineseEncodeToURI('有些訊息因錯誤無法被同意!'));
																									}
																								}
																							}else{
																								if(!ifAuto){
																									res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
																								}
																							}
																						}else{
																							lenderBankaccount.MoneyInBankAccount-=newCreateTransaction.Principal;
																							lenderBankaccount.Updated=Date.now();
																							lenderBankaccount.save(function (err,updatedLenderBankaccount) {
																								if (err){
																									console.log(err);
																									if(ifRecursive){
																										ctr++;
																										if(ctr<ctrTarget){
																											exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide);
																										}else{
																											if(!ifAuto){
																												res.redirect('/message?content='+chineseEncodeToURI('有些訊息因錯誤無法被同意!'));
																											}
																										}
																									}else{
																										if(!ifAuto){
																											res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
																										}
																									}
																								}else{				
																									borrow.MoneyToBorrowCumulated+=newCreateTransaction.Principal;
																									if(borrow.MoneyToBorrowCumulated>=borrow.MoneyToBorrow){
																										borrow.IfReadable=false;
																									}
																									borrow.Updated=Date.now();
																									borrow.save(function (err,updatedBorrow) {
																										if (err){
																											console.log(err);
																											if(ifRecursive){
																												ctr++;
																												if(ctr<ctrTarget){
																													exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide);
																												}else{
																													if(!ifAuto){
																														res.redirect('/message?content='+chineseEncodeToURI('有些訊息因錯誤無法被同意!'));
																													}
																												}
																											}else{
																												if(!ifAuto){
																													res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
																												}
																											}
																										}else{				
																											lend.MaxMoneyToLend-=newCreateTransaction.Principal;
																											if(lend.MaxMoneyToLend<0){
																												lend.MaxMoneyToLend=0;
																											}
																											lend.Updated=Date.now();
																											lend.save(function (err,updatedLend) {
																												if (err){
																													console.log(err);
																													if(ifRecursive){
																														ctr++;
																														if(ctr<ctrTarget){
																															exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide);
																														}else{
																															if(!ifAuto){
																																res.redirect('/message?content='+chineseEncodeToURI('有些訊息因錯誤無法被同意!'));
																															}
																														}
																													}else{
																														if(!ifAuto){
																															res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
																														}
																													}
																												}else{		
																													message.Status='Confirmed';
																													message.Updated=Date.now();
																													message.Transaction.push(newCreateTransaction._id);
																													message.save(function (err,newCreateUpdated) {
																														if (err){
																															console.log(err);
																															if(ifRecursive){
																																ctr++;
																																if(ctr<ctrTarget){
																																	exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide);
																																}else{
																																	if(!ifAuto){
																																		res.redirect('/message?content='+chineseEncodeToURI('有些訊息因錯誤無法被同意!'));
																																	}
																																}
																															}else{
																																if(!ifAuto){
																																	res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
																																}
																															}
																														}else{
																															if(ifRecursive){
																																ctr++;
																																if(ctr<ctrTarget){
																																	exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,returnSring,req,res,ifAuto,resAddress,ifLenderSide);
																																}else{
																																	if(returnSring){
																																		if(!ifAuto){
																																			res.redirect('/message?content='+chineseEncodeToURI(returnSring));
																																		}
																																	}else{
																																		if(!ifAuto){
																																			res.redirect(resAddress);
																																		}
																																	}
																																}
																															}else{
																																if(!ifAuto){
																																	res.redirect(resAddress);
																																}
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
						}
					}
				});
			}
		}
	});
}

exports.rejectMessage=function (ifRecursive,ctr,ctrTarget,returnSring,req,res,ifAuto,resAddress){
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
					exports.rejectMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被拒絕!',req,res,ifAuto,resAddress);
				}else{
					if(!ifAuto){
						res.redirect('/message?content='+chineseEncodeToURI('有些訊息因錯誤無法被拒絕!'));
					}
				}
			}else{
				if(!ifAuto){
					res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
				}
			}
		}else{
			if(!message){
				if(ifRecursive){
					ctr++;
					if(ctr<ctrTarget){
						exports.rejectMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被拒絕!',req,res,ifAuto,resAddress);
					}else{
						if(!ifAuto){
							res.redirect('/message?content='+chineseEncodeToURI('有些訊息因錯誤無法被拒絕!'));
						}
					}
				}else{
					if(!ifAuto){
						res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
					}
				}
			}else{			
				if(message.Status!=="NotConfirmed"){
					if(ifRecursive){
						ctr++;
						if(ctr<ctrTarget){
							exports.rejectMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被拒絕!',req,res,ifAuto,resAddress);
						}else{
							if(!ifAuto){
								res.redirect('/message?content='+chineseEncodeToURI('有些訊息因錯誤無法被拒絕!'));
							}
						}
					}else{
						if(!ifAuto){
							res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
						}
					}
				}else{
					if(req.user._id!=message.SendTo){
						if(!ifAuto){
							res.redirect('/message?content='+chineseEncodeToURI('認證錯誤!'));
						}
					}else{
						message.Status="Rejected";
						message.Updated = Date.now();
						message.save(function (err,newUpdate) {
							if (err){
								console.log(err);
								if(ifRecursive){
									ctr++;
									if(ctr<ctrTarget){
										exports.rejectMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被拒絕!',req,res,ifAuto,resAddress);
									}else{
										if(!ifAuto){
											res.redirect('/message?content='+chineseEncodeToURI('有些訊息因錯誤無法被拒絕!'));
										}
									}
								}else{
									if(!ifAuto){
										res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
									}
								}
							}else{
								if(ifRecursive){
									ctr++;
									if(ctr<ctrTarget){
										exports.rejectMessage(ifRecursive,ctr,ctrTarget,returnSring,req,res,ifAuto,resAddress);
									}else{
										if(returnSring){
											if(!ifAuto){
												res.redirect('/message?content='+chineseEncodeToURI(returnSring));
											}
										}else{
											if(!ifAuto){
												res.redirect(resAddress);
											}
										}
									}
								}else{
									if(!ifAuto){
										res.redirect(resAddress);
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

exports.interestInFutureCalculator=function (money,rate,month){
	var interestInFuture=0;
	var monthlyPaid=money/month;
	for(k=0;k<month;k++){
		if(money>0){
			interestInFuture+=money*rate;
			money-=monthlyPaid;
			if(money<0){
				money=0;
			}
		}
	}
	return interestInFuture;
}

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