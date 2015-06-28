var library=require( './library.js' );
var mongoose = require('mongoose');
var Lends  = mongoose.model('Lends');
var BankAccounts  = mongoose.model('BankAccounts');
var Transactions  = mongoose.model('Transactions');
var Messages = mongoose.model('Messages');
var sanitizer = require('sanitizer');
var flash = require('connect-flash');

var express = require('express');
var router = express.Router();

router.post('/createTest', function(req, res, next) {
	var toCreate = new Lends();
	toCreate.MaxMoneyToLend=sanitizer.sanitize(req.body.MaxMoneyToLend.trim());
	toCreate.InterestRate=sanitizer.sanitize(req.body.InterestRate.trim());
	toCreate.MonthPeriod=sanitizer.sanitize(req.body.MonthPeriod.trim());
	toCreate.CreatedBy=sanitizer.sanitize(req.body.CreatedBy.trim());
	
	toCreate.save(function (err,newCreate) {
		if (err){
			console.log(err);
			res.json({error: err.name}, 500);
		}else{
			res.json(newCreate);
		}
	});
	
});

router.post('/destroyTest',function(req, res, next) {
	Lends.findById(req.body.LendID).exec(function (err, lend){
		if (err) {
			console.log(err);
			res.json({error: err.name}, 500);
		}else{
			if(!lend){
				res.json({error:'no such lend'}, 500);
			}else{
				lend.remove(function (err,removedItem) {
					if (err){
						console.log(err);
						res.json({error: err.name}, 500);
					}else{
						res.json(removedItem);
					}
				});
			}
		}
	});
});

function samePart(res,req,differentPart,outterPara){
	BankAccounts.findOne({"OwnedBy": req.user._id}).exec(function (err, bankaccount){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			if(!bankaccount){
				res.redirect('/message?content='+encodeURIComponent('無銀行帳戶!'));
			}else{
				var autoLendCumulated=0;
				Transactions.find({"Lender": req.user._id}).populate('Return').populate('CreatedFrom','Type').exec(function (err, transactions){
					if (err) {
						console.log(err);
						res.redirect('/message?content='+encodeURIComponent('錯誤!'));
					}else{
						if(transactions.length>0){
							for(i=0;i<transactions.length;i++){
								if(transactions[i].CreatedFrom.Type==='toBorrow'){
									library.transactionProcessor(transactions[i],false);
									autoLendCumulated+=transactions[i].PrincipalNotReturn;
								}
							}
						}
						
						var maxMoney=parseInt(bankaccount.MoneyInBankAccount)+parseInt(autoLendCumulated);
						var nowMoney=parseInt(sanitizer.sanitize(req.body.MaxMoneyToLend.trim()));
						var rate=(parseFloat(sanitizer.sanitize(req.body.InterestRate.trim()))/100)+library.serviceChargeRate;//scr;
						var month=parseInt(sanitizer.sanitize(req.body.MonthPeriod.trim()));
						var level;
						if(sanitizer.sanitize(req.body.MinLevelAccepted.trim())===''){
							level=1;
						}else{
							level=parseInt(sanitizer.sanitize(req.body.MinLevelAccepted.trim()));
						}
						var MinInterestInFuture;
						if(sanitizer.sanitize(req.body.MinInterestInFuture.trim())===''){
							MinInterestInFuture=1;
						}else{
							MinInterestInFuture=parseInt(sanitizer.sanitize(req.body.MinInterestInFuture.trim()));
						}
						var MinMoneyFuture;
						if(sanitizer.sanitize(req.body.MinMoneyFuture.trim())===''){
							MinMoneyFuture=1;
						}else{
							MinMoneyFuture=parseInt(sanitizer.sanitize(req.body.MinMoneyFuture.trim()));
						}
						var MinInterestInFutureMonth;
						if(sanitizer.sanitize(req.body.MinInterestInFutureMonth.trim())===''){
							MinInterestInFutureMonth=1;
						}else{
							MinInterestInFutureMonth=parseInt(sanitizer.sanitize(req.body.MinInterestInFutureMonth.trim()));
						}
						var MinInterestInFutureMoneyMonth;
						if(sanitizer.sanitize(req.body.MinInterestInFutureMoneyMonth.trim())===''){
							MinInterestInFutureMoneyMonth=1;
						}else{
							MinInterestInFutureMoneyMonth=parseInt(sanitizer.sanitize(req.body.MinInterestInFutureMoneyMonth.trim()));
						}
						var MinInterestInFutureDivMoney;
						if(sanitizer.sanitize(req.body.MinInterestInFutureDivMoney.trim())===''){
							MinInterestInFutureDivMoney=0.05;
						}else{
							MinInterestInFutureDivMoney=parseFloat(sanitizer.sanitize(req.body.MinInterestInFutureDivMoney.trim()))/100;
						}
						
						var errorTarget=[];
						var errorMessage=[];
						for(i=0;i<16;i++){
							errorTarget.push(false);
							errorMessage.push('');
						}
						
						if(sanitizer.sanitize(req.body.MaxMoneyToLend.trim())===''){
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
							errorMessage[0]='超過金額上限：'+maxMoney.toFixed(0)+'元!';
						}
						
						if(sanitizer.sanitize(req.body.InterestRate.trim())===''){
							errorTarget[1]=true;
							errorMessage[1]='必要參數未填!';
						}else if(isNaN(rate)){
							errorTarget[1]=true;
							errorMessage[1]='非數字參數!';
						}else if((rate<(0.0001+library.serviceChargeRate))||(rate>(0.99+library.serviceChargeRate))){
							errorTarget[1]=true;
							errorMessage[1]='錯誤參數!';
						}
						
						if(sanitizer.sanitize(req.body.MonthPeriod.trim())===''){
							errorTarget[2]=true;
							errorMessage[2]='必要參數未填!';
						}else if(isNaN(month)){
							errorTarget[2]=true;
							errorMessage[2]='非數字參數!';
						}else if((month<1)||(month>36)){
							errorTarget[2]=true;
							errorMessage[2]='錯誤參數!';
						}
						
						if(isNaN(level)){
							errorTarget[3]=true;
							errorMessage[3]='非數字參數!';
						}else if(level<1){
							errorTarget[3]=true;
							errorMessage[3]='錯誤參數!';
						}
						
						if(isNaN(MinInterestInFuture)){
							errorTarget[4]=true;
							errorMessage[4]='非數字參數!';
						}else if(MinInterestInFuture<1){
							errorTarget[4]=true;
							errorMessage[4]='錯誤參數!';
						}
						
						if(isNaN(MinMoneyFuture)){
							errorTarget[5]=true;
							errorMessage[5]='非數字參數!';
						}else if(MinMoneyFuture<1){
							errorTarget[5]=true;
							errorMessage[5]='錯誤參數!';
						}
						
						if(isNaN(MinInterestInFutureMonth)){
							errorTarget[6]=true;
							errorMessage[6]='非數字參數!';
						}else if(MinInterestInFutureMonth<1){
							errorTarget[6]=true;
							errorMessage[6]='錯誤參數!';
						}
						
						if(isNaN(MinInterestInFutureMoneyMonth)){
							errorTarget[7]=true;
							errorMessage[7]='非數字參數!';
						}else if(MinInterestInFutureMoneyMonth<1){
							errorTarget[7]=true;
							errorMessage[7]='錯誤參數!';
						}
						
						if(isNaN(MinInterestInFutureDivMoney)){
							errorTarget[8]=true;
							errorMessage[8]='非數字參數!';
						}else if((MinInterestInFutureDivMoney<0.0001)||(MinInterestInFutureDivMoney>0.99)){
							errorTarget[8]=true;
							errorMessage[8]='錯誤參數!';
						}
						
						var period=parseInt(sanitizer.sanitize(req.body.AutoComfirmToBorrowMsgPeriod.trim()));
						if(period>0){
							var sorter=sanitizer.sanitize(req.body.AutoComfirmToBorrowMsgSorter.trim());
							var lbound=sanitizer.sanitize(req.body.AutoComfirmToBorrowMsgLbound.trim());
							var ubound=sanitizer.sanitize(req.body.AutoComfirmToBorrowMsgUbound.trim());
							
							if(lbound!==''){
								if((sorter==='Updated')||(sorter==='Created')){
									var tester=Date.parse(lbound);
									if(isNaN(tester)){
										errorTarget[13]=true;
										errorMessage[13]='日期格式錯誤!';
									}
								}else if((sorter==='InterestRate')||(sorter==='InterestInFutureDivMoney')){
									var tester=parseFloat(lbound);
									if((tester<0)||(tester>99)){
										errorTarget[13]=true;
										errorMessage[13]='錯誤參數!';
									}
								}else{
									var tester=parseInt(lbound);
									if(tester<0){
										errorTarget[13]=true;
										errorMessage[13]='錯誤參數!';
									}
								}
							}
							
							if(ubound!==''){
								if((sorter==='Updated')||(sorter==='Created')){
									var tester=Date.parse(ubound);
									if(isNaN(tester)){
										errorTarget[14]=true;
										errorMessage[14]='日期格式錯誤!';
									}
								}else if((sorter==='InterestRate')||(sorter==='InterestInFutureDivMoney')){
									var tester=parseFloat(ubound);
									if((tester<0)||(tester>99)){
										errorTarget[14]=true;
										errorMessage[14]='錯誤參數!';
									}
								}else{
									var tester=parseInt(ubound);
									if(tester<0){
										errorTarget[14]=true;
										errorMessage[14]='錯誤參數!';
									}
								}
							}
						}
						
						var valiFlag=true;
						for(i=0;i<errorTarget.length;i++){
							if(errorTarget[i]){
								valiFlag=false;
								break;
							}
						}
						
						if(valiFlag){
							differentPart(res,req,outterPara);
						}else{
							redirector(req,res,errorTarget,errorMessage);
						}
					}
				});
			}
		}
	});
}

function redirector(req,res,target,message){
	var formContent={
		F1:req.body.MaxMoneyToLend,
		F2:req.body.InterestRate,
		F3:req.body.MonthPeriod,
		F4:req.body.MinLevelAccepted,
		F5:req.body.MinInterestInFuture,
		F6:req.body.MinMoneyFuture,
		F7:req.body.MinInterestInFutureMonth,
		F8:req.body.MinInterestInFutureMoneyMonth,
		F9:req.body.MinInterestInFutureDivMoney,
		F10:req.body.AutoComfirmToBorrowMsgPeriod,
		F11:req.body.AutoComfirmToBorrowMsgClassor,
		F12:req.body.AutoComfirmToBorrowMsgSorter,
		F13:req.body.AutoComfirmToBorrowMsgDirector,
		F14:req.body.AutoComfirmToBorrowMsgLbound,
		F15:req.body.AutoComfirmToBorrowMsgUbound,
		F16:req.body.AutoComfirmToBorrowMsgKeyWord
	};
	
	var json={FormContent:formContent,Target:target,Message:message};
	var string=JSON.stringify(json);
	
	req.flash('lendForm',string);
	res.redirect(req.get('referer'));
}

function createPart(res,req,outterPara){
	var toCreate = new Lends();
	toCreate.MaxMoneyToLend=parseInt(sanitizer.sanitize(req.body.MaxMoneyToLend.trim()));
	toCreate.InterestRate=(parseFloat(sanitizer.sanitize(req.body.InterestRate.trim()))/100)+library.serviceChargeRate;//scr
	toCreate.MonthPeriod=parseInt(sanitizer.sanitize(req.body.MonthPeriod.trim()));
	if(sanitizer.sanitize(req.body.MinLevelAccepted.trim())!==''){
		toCreate.MinLevelAccepted=parseInt(sanitizer.sanitize(req.body.MinLevelAccepted.trim()));
	}
	if(sanitizer.sanitize(req.body.MinInterestInFuture.trim())!==''){
		toCreate.MinInterestInFuture=parseInt(sanitizer.sanitize(req.body.MinInterestInFuture.trim()));
	}
	if(sanitizer.sanitize(req.body.MinMoneyFuture.trim())!==''){
		toCreate.MinMoneyFuture=parseInt(sanitizer.sanitize(req.body.MinMoneyFuture.trim()));
	}
	if(sanitizer.sanitize(req.body.MinInterestInFutureMonth.trim())!==''){
		toCreate.MinInterestInFutureMonth=parseInt(sanitizer.sanitize(req.body.MinInterestInFutureMonth.trim()));
	}
	if(sanitizer.sanitize(req.body.MinInterestInFutureMoneyMonth.trim())!==''){
		toCreate.MinInterestInFutureMoneyMonth=parseInt(sanitizer.sanitize(req.body.MinInterestInFutureMoneyMonth.trim()));
	}
	if(sanitizer.sanitize(req.body.MinInterestInFutureDivMoney.trim())!==''){
		toCreate.MinInterestInFutureDivMoney=parseFloat(sanitizer.sanitize(req.body.MinInterestInFutureDivMoney.trim()))/100;
	}
	
	var period=parseInt(sanitizer.sanitize(req.body.AutoComfirmToBorrowMsgPeriod.trim()));
	toCreate.AutoComfirmToBorrowMsgPeriod=period;
	if(period>0){
		var sorter=sanitizer.sanitize(library.replacer(req.body.AutoComfirmToBorrowMsgSorter,false));
		var lbound=sanitizer.sanitize(library.replacer(req.body.AutoComfirmToBorrowMsgLbound,false));
		var ubound=sanitizer.sanitize(library.replacer(req.body.AutoComfirmToBorrowMsgUbound,false));
		var rtnJSON=luMaker(sorter,lbound,ubound);
		toCreate.AutoComfirmToBorrowMsgSorter=sorter;
		toCreate.AutoComfirmToBorrowMsgDirector=sanitizer.sanitize(library.replacer(req.body.AutoComfirmToBorrowMsgDirector,false));
		toCreate.AutoComfirmToBorrowMsgClassor=sanitizer.sanitize(library.replacer(req.body.AutoComfirmToBorrowMsgClassor,false));
		toCreate.AutoComfirmToBorrowMsgKeyWord=sanitizer.sanitize(library.replacer(req.body.AutoComfirmToBorrowMsgKeyWord,true));
		toCreate.AutoComfirmToBorrowMsgLbound=rtnJSON.lboundSave;
		toCreate.AutoComfirmToBorrowMsgUbound=rtnJSON.uboundSave;
		
	}else{
		toCreate.AutoComfirmToBorrowMsgSorter='invalid';
		toCreate.AutoComfirmToBorrowMsgDirector='invalid';
		toCreate.AutoComfirmToBorrowMsgClassor='invalid';
		toCreate.AutoComfirmToBorrowMsgKeyWord='';
		toCreate.AutoComfirmToBorrowMsgLbound=-1;
		toCreate.AutoComfirmToBorrowMsgUbound=-1;
	}
		
	toCreate.CreatedBy=req.user._id;
	
	toCreate.save(function (err,newCreate) {
		if (err){
			res.redirect('/message?content='+encodeURIComponent('新建失敗!'));
		}else{
			res.redirect('/lender/lend');
		}
	});
}

function luMaker(sorter,lbound,ubound){
	var rtnJSON={
		lboundSave:-1,
		uboundSave:-1
	}
	if(lbound!==''){
		if((sorter==='Updated')||(sorter==='Created')){
			rtnJSON.lboundSave=Date.parse(lbound);
		}else if(sorter==='InterestRate'){
			rtnJSON.lboundSave=(parseFloat(lbound)/100)+library.serviceChargeRate;//scr
		}else if(sorter==='InterestInFutureDivMoney'){
			rtnJSON.lboundSave=(parseFloat(lbound)/100);
		}else{
			rtnJSON.lboundSave=parseInt(lbound);
		}
	}
	if(ubound!==''){
		if((sorter==='Updated')||(sorter==='Created')){
			rtnJSON.uboundSave=Date.parse(ubound);
		}else if(sorter==='InterestRate'){
			rtnJSON.uboundSave=(parseFloat(ubound)/100)+library.serviceChargeRate;//scr
		}else if(sorter==='InterestInFutureDivMoney'){
			rtnJSON.uboundSave=(parseFloat(ubound)/100);
		}else{
			rtnJSON.uboundSave=parseInt(ubound);
		}
	}
	if((rtnJSON.lboundSave!==-1)&&(rtnJSON.uboundSave!==-1)){
		if(rtnJSON.lboundSave>rtnJSON.uboundSave){
			var temp;
			temp=rtnJSON.lboundSave;
			rtnJSON.lboundSave=rtnJSON.uboundSave;
			rtnJSON.uboundSave=temp;
		}
	}
	return rtnJSON;
}

function updatePart(res,req,lend){
	lend.MaxMoneyToLend=parseInt(sanitizer.sanitize(req.body.MaxMoneyToLend.trim()));
	lend.InterestRate=(parseFloat(sanitizer.sanitize(req.body.InterestRate.trim()))/100)+library.serviceChargeRate;//scr
	lend.MonthPeriod=parseInt(sanitizer.sanitize(req.body.MonthPeriod.trim()));
	if(sanitizer.sanitize(req.body.MinLevelAccepted.trim())!==''){
		lend.MinLevelAccepted=parseInt(sanitizer.sanitize(req.body.MinLevelAccepted.trim()));
	}else{
		lend.MinLevelAccepted=-1;
	}
	if(sanitizer.sanitize(req.body.MinInterestInFuture.trim())!==''){
		lend.MinInterestInFuture=parseInt(sanitizer.sanitize(req.body.MinInterestInFuture.trim()));
	}else{
		lend.MinInterestInFuture=-1;
	}
	if(sanitizer.sanitize(req.body.MinMoneyFuture.trim())!==''){
		lend.MinMoneyFuture=parseInt(sanitizer.sanitize(req.body.MinMoneyFuture.trim()));
	}else{
		lend.MinMoneyFuture=-1;
	}
	if(sanitizer.sanitize(req.body.MinInterestInFutureMonth.trim())!==''){
		lend.MinInterestInFutureMonth=parseInt(sanitizer.sanitize(req.body.MinInterestInFutureMonth.trim()));
	}else{
		lend.MinInterestInFutureMonth=-1;
	}
	if(sanitizer.sanitize(req.body.MinInterestInFutureMoneyMonth.trim())!==''){
		lend.MinInterestInFutureMoneyMonth=parseInt(sanitizer.sanitize(req.body.MinInterestInFutureMoneyMonth.trim()));
	}else{
		lend.MinInterestInFutureMoneyMonth=-1;
	}
	if(sanitizer.sanitize(req.body.MinInterestInFutureDivMoney.trim())!==''){
		lend.MinInterestInFutureDivMoney=parseFloat(sanitizer.sanitize(req.body.MinInterestInFutureDivMoney.trim()))/100;
	}else{
		lend.MinInterestInFutureDivMoney=-1;
	}
	
	var period=parseInt(sanitizer.sanitize(req.body.AutoComfirmToBorrowMsgPeriod.trim()));
	lend.AutoComfirmToBorrowMsgPeriod=period;
	if(period>0){
		var sorter=sanitizer.sanitize(library.replacer(req.body.AutoComfirmToBorrowMsgSorter,false));
		var lbound=sanitizer.sanitize(library.replacer(req.body.AutoComfirmToBorrowMsgLbound,false));
		var ubound=sanitizer.sanitize(library.replacer(req.body.AutoComfirmToBorrowMsgUbound,false));
		var rtnJSON=luMaker(sorter,lbound,ubound);
		lend.AutoComfirmToBorrowMsgSorter=sorter;
		lend.AutoComfirmToBorrowMsgDirector=sanitizer.sanitize(library.replacer(req.body.AutoComfirmToBorrowMsgDirector,false));
		lend.AutoComfirmToBorrowMsgClassor=sanitizer.sanitize(library.replacer(req.body.AutoComfirmToBorrowMsgClassor,false));
		lend.AutoComfirmToBorrowMsgKeyWord=sanitizer.sanitize(library.replacer(req.body.AutoComfirmToBorrowMsgKeyWord,true));
		lend.AutoComfirmToBorrowMsgLbound=rtnJSON.lboundSave;
		lend.AutoComfirmToBorrowMsgUbound=rtnJSON.uboundSave;
		
	}else{
		lend.AutoComfirmToBorrowMsgSorter='invalid';
		lend.AutoComfirmToBorrowMsgDirector='invalid';
		lend.AutoComfirmToBorrowMsgClassor='invalid';
		lend.AutoComfirmToBorrowMsgKeyWord='';
		lend.AutoComfirmToBorrowMsgLbound=-1;
		lend.AutoComfirmToBorrowMsgUbound=-1;
	}
	
	lend.Updated = Date.now();
	
	lend.save(function (err,newUpdate) {
		if (err){
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('更新失敗!'));
		}else{
			res.redirect('/lender/lend');
		}
	});
}

router.post('/create',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	Lends.findOne({CreatedBy:req.user._id}).exec(function (err, lend){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			if(!lend){
				samePart(res,req,createPart,null);
			}else{
				res.redirect('/message?content='+encodeURIComponent('錯誤!請回到上頁重整頁面'));
			}
		}
	});
});

router.post('/update',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	Lends.findById(req.body._id).exec(function (err, lend){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			if(!lend){
				res.redirect('/message?content='+encodeURIComponent('未找到更新目標!'));
			}else{
				if(!lend.CreatedBy.equals(req.user._id)){
					res.redirect('/message?content='+encodeURIComponent('認證錯誤!'));
				}else{
					samePart(res,req,updatePart,lend);	
				}
			}
		}
	});
});

router.post('/destroy',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	Lends.findById(req.body._id).exec(function (err, lend){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			if(!lend){
				res.redirect('/message?content='+encodeURIComponent('未找到刪除目標!'));
			}else{
				if(!lend.CreatedBy.equals(req.user._id)){
					res.redirect('/message?content='+encodeURIComponent('認證錯誤!'));
				}else{
					lend.remove(function (err,removedItem) {
						if (err){
							console.log(err);
							res.redirect('/message?content='+encodeURIComponent('刪除失敗!'));
						}else{
							res.redirect('/lender/lend');
						}
					});
				}
			}
		}
	});
});

router.post('/changer',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	Lends.findById(sanitizer.sanitize(req.body.TargetID.trim())).exec(function (err,lend){
		if (err) {
			console.log(err);
			res.json({error: '錯誤',success:false}, 500);
		}else{
			if(!lend){
				res.json({origValue:'未找到自動出借設定!',error: '找不到自動出借設定!',success:false});
			}else{
				if(!lend.CreatedBy.equals(req.user._id)){
					res.json({origValue:lend.MaxMoneyToLend,error: '認證錯誤',success:false});
				}else{
					BankAccounts.findOne({"OwnedBy": req.user._id}).exec(function (err, bankaccount){
						if (err) {
							console.log(err);
							res.json({error: '錯誤',success:false}, 500);
						}else{
							if(!bankaccount){
								res.json({origValue:lend.MaxMoneyToLend,error: '找不到銀行帳戶!',success:false});
							}else{
								var moneyLendedJson={
									moneyLendedCumulated:0,
									hendLendCumulated:0,
									autoLendCumulated:0,
									moneyLeftToAutoLend:0,
									moneyLeftToHendLend:0,
									maxSettingAutoLend:0,
									maxMoneyToLend:0
								};
								Transactions.find({"Lender": req.user._id}).populate('Return').populate('CreatedFrom','Type').exec(function (err, transactions){
									if (err) {
										console.log(err);
										res.redirect('/message?content='+encodeURIComponent('錯誤!'));
									}else{
										if(transactions.length>0){
											for(i=0;i<transactions.length;i++){
												library.transactionProcessor(transactions[i],false);
												if(transactions[i].CreatedFrom.Type==='toBorrow'){
													moneyLendedJson.autoLendCumulated+=transactions[i].PrincipalNotReturn;
												}else if(transactions[i].CreatedFrom.Type==='toLend'){
													moneyLendedJson.hendLendCumulated+=transactions[i].PrincipalNotReturn;
												}
											}
											moneyLendedJson.moneyLendedCumulated=moneyLendedJson.hendLendCumulated+moneyLendedJson.autoLendCumulated;
										}
										
										var maxMoney=parseInt(bankaccount.MoneyInBankAccount)+parseInt(moneyLendedJson.autoLendCumulated);
										var nowMoney=parseInt(sanitizer.sanitize(req.body.Value.trim()));
										
										if(sanitizer.sanitize(req.body.Value.trim())===''){
											res.json({result0:bankaccount.MoneyInBankAccount,origValue:lend.MaxMoneyToLend,error: '必要參數未填!',success:false});
										}else if(isNaN(nowMoney)){
											res.json({result0:bankaccount.MoneyInBankAccount,origValue:lend.MaxMoneyToLend,error: '非數字參數!',success:false});
										}else if(nowMoney<1){
											res.json({result0:bankaccount.MoneyInBankAccount,origValue:lend.MaxMoneyToLend,error: '錯誤參數!',success:false});
										}else if(nowMoney>maxMoney){
											res.json({result0:bankaccount.MoneyInBankAccount,origValue:lend.MaxMoneyToLend,error: '超過金額上限：'+maxMoney.toFixed(0)+"元!",success:false});
										}else{
											lend.MaxMoneyToLend=nowMoney;
											lend.save(function (err,lendUpdated) {
												if (err){
													console.log(err);
													res.json({error: '錯誤',success:false}, 500);
												}else{
													moneyLendedJson.maxMoneyToLend=lendUpdated.MaxMoneyToLend;
													moneyLendedJson.moneyLeftToAutoLend=lendUpdated.MaxMoneyToLend-moneyLendedJson.autoLendCumulated;
													if(moneyLendedJson.moneyLeftToAutoLend<=0){
														moneyLendedJson.moneyLeftToAutoLend=0;
													}
													moneyLendedJson.moneyLeftToHendLend=bankaccount.MoneyInBankAccount-moneyLendedJson.moneyLeftToAutoLend;
													if(moneyLendedJson.moneyLeftToHendLend<=0){
														moneyLendedJson.moneyLeftToHendLend=0;
													}
													moneyLendedJson.maxSettingAutoLend=bankaccount.MoneyInBankAccount+moneyLendedJson.autoLendCumulated;
													res.json({result0:bankaccount.MoneyInBankAccount,result:moneyLendedJson,success:true});
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
		}
	});
});

module.exports = router;
