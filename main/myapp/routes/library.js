var mongoose = require('mongoose');
var Borrows  = mongoose.model('Borrows');
var Lends  = mongoose.model('Lends');
var Messages  = mongoose.model('Messages');
var BankAccounts  = mongoose.model('BankAccounts');
var Transactions  = mongoose.model('Transactions');
var sanitizer = require('sanitizer');
var autoComfirmToBorrowMsgArray=[];

exports.autoComfirmToBorrowMsgArray=autoComfirmToBorrowMsgArray;

exports.confirmToBorrowMessage = function(ifRecursive,ctr,ctrTarget,returnSring,req,res,ifAuto){
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
					exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto);
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
						exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto);
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
								exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto);
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
									exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto);
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
							if(req.user._id!=message.SendTo){
								if(!ifAuto){
									res.redirect('/message?content='+chineseEncodeToURI('認證錯誤!'));
								}
							}else{
								BankAccounts.findOne({"OwnedBy": message.SendTo}).exec(function (err, lenderBankaccount){
									if (err) {
										console.log(err);
										if(ifRecursive){
											ctr++;
											if(ctr<ctrTarget){
												exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto);
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
													exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto);
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
															exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto);
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
														if(!ifAuto){
															res.redirect('/message?content='+chineseEncodeToURI('您之前已刪除自動出借設定，請重新設定後再嘗試同意'));
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
																returnSring='金額超過您的銀行餘額!';
															}else if(nowMoney>maxMoney2){
																returnSring='金額超過對方所需!';
															}else if(nowMoney>maxMoney3){
																returnSring='金額超過您所設定之自動借款餘額!您可調高後再嘗試';
															}else if(nowMoney<minMoney){
																returnSring='金額少於對方期望!';
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
															var nowMoney2=parseInt(message.MoneyToLend);
															
															if(nowMoney2>maxMoney){
																returnSring='有訊息因借款金額超過您銀行帳戶內的餘額而無法被同意，請回上頁並重整查看';
															}else if(nowMoney2>maxMoney2){
																if(maxMoney2==0){
																	returnSring='有些訊息因為對方已不需要借款而無法被同意，它們已被自動婉拒';
																}else{
																	finalMoneyToLend=maxMoney2;
																	finalInterestRate=message.InterestRate;
																	finalMonthPeriod=message.MonthPeriod;
																}
															}else if(nowMoney2>maxMoney3){
																returnSring='有訊息因借款金額超過您所設定之自動借款額度而無法被同意，請回上頁並重整查看';
															}else{
																finalMoneyToLend=message.MoneyToLend;
																finalInterestRate=message.InterestRate;
																finalMonthPeriod=message.MonthPeriod;
															}
														}
														if((returnSring)||(!finalMoneyToLend)||(!finalInterestRate)||(!finalMonthPeriod)){
															if(returnSring!='有些訊息因為對方已不需要借款而無法被同意，它們已被自動婉拒'){
																if(!ifAuto){
																	res.redirect('/message?content='+chineseEncodeToURI(returnSring));
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
																				exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto);
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
																				exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,returnSring,req,res,ifAuto);
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
															
															toCreateTransaction.save(function (err,newCreateTransaction) {
																if (err){
																	console.log(err);
																	if(ifRecursive){
																		ctr++;
																		if(ctr<ctrTarget){
																			exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto);
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
																					exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto);
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
																						exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto);
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
																				borrowerBankaccount.save(function (err,updatedBorrowerBankaccount) {
																					if (err){
																						console.log(err);
																						if(ifRecursive){
																							ctr++;
																							if(ctr<ctrTarget){
																								exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto);
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
																						lenderBankaccount.save(function (err,updatedLenderBankaccount) {
																							if (err){
																								console.log(err);
																								if(ifRecursive){
																									ctr++;
																									if(ctr<ctrTarget){
																										exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto);
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
																								borrow.save(function (err,updatedBorrow) {
																									if (err){
																										console.log(err);
																										if(ifRecursive){
																											ctr++;
																											if(ctr<ctrTarget){
																												exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto);
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
																										lend.save(function (err,updatedLend) {
																											if (err){
																												console.log(err);
																												if(ifRecursive){
																													ctr++;
																													if(ctr<ctrTarget){
																														exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto);
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
																																exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto);
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
																																exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,returnSring,req,res,ifAuto);
																															}else{
																																if(returnSring){
																																	if(!ifAuto){
																																		res.redirect('/message?content='+chineseEncodeToURI(returnSring));
																																	}
																																}else{
																																	if(!ifAuto){
																																		res.redirect('/lenderReceiveMessages?msgKeyword=&filter='+chineseEncodeToURI('已同意')+'&sorter='+chineseEncodeToURI('最新')+'&page=1');
																																	}
																																}
																															}
																														}else{
																															if(!ifAuto){
																																res.redirect('/story?id='+FBR);
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
				});
			}
		}
	});
}

exports.rejectToBorrowMessage=function (ifRecursive,ctr,ctrTarget,returnSring,req,res,ifAuto){
	var MID;
	if(!ifRecursive){
		MID=req.body.MessageID;
	}else{
		MID=req.body.array[ctr].MessageID;
	}
	var FBR;
	if(!ifRecursive){
		FBR=req.body.FromBorrowRequest;
	}else{
		FBR=req.body.array[ctr].FromBorrowRequest;
	}
	Messages.findById(MID).exec(function (err, message){
		if (err) {
			console.log(err);
			if(ifRecursive){
				ctr++;
				if(ctr<ctrTarget){
					exports.rejectToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被拒絕!',req,res,ifAuto);
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
						exports.rejectToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被拒絕!',req,res,ifAuto);
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
									exports.rejectToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被拒絕!',req,res,ifAuto);
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
									exports.rejectToBorrowMessage(ifRecursive,ctr,ctrTarget,returnSring,req,res,ifAuto);
								}else{
									if(returnSring){
										if(!ifAuto){
											res.redirect('/message?content='+chineseEncodeToURI(returnSring));
										}
									}else{
										if(!ifAuto){
											res.redirect('/lenderReceiveMessages?msgKeyword=&filter='+chineseEncodeToURI('已婉拒')+'&sorter='+chineseEncodeToURI('最新')+'&page=1');
										}
									}
								}
							}else{
								if(!ifAuto){
									res.redirect('/story?id='+FBR);
								}
							}
						}
					});
				}
			}
		}
	});
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