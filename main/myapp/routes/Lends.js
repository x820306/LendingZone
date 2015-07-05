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
	if((typeof(req.body.MaxMoneyToLend) === 'string')&&(typeof(req.body.InterestRate) === 'string')&&(typeof(req.body.MonthPeriod) === 'string')&&(typeof(req.body.CreatedBy) === 'string')){	
		req.body.MaxMoneyToLend=sanitizer.sanitize(req.body.MaxMoneyToLend.trim());
		req.body.InterestRate=sanitizer.sanitize(req.body.InterestRate.trim());
		req.body.MonthPeriod=sanitizer.sanitize(req.body.MonthPeriod.trim());
		req.body.CreatedBy=sanitizer.sanitize(req.body.CreatedBy.trim());
		
		var toCreate = new Lends();
		toCreate.MaxMoneyToLend=req.body.MaxMoneyToLend;
		toCreate.InterestRate=req.body.InterestRate;
		toCreate.MonthPeriod=req.body.MonthPeriod;
		toCreate.CreatedBy=req.body.CreatedBy;
		
		toCreate.save(function (err,newCreate) {
			if (err){
				console.log(err);
				res.json({error: err.name}, 500);
			}else{
				res.json(newCreate);
			}
		});
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/destroyTest',function(req, res, next) {
	if(typeof(req.body.LendID) === 'string'){
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
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
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
						
						var errorTarget=[];
						var errorMessage=[];
						for(i=0;i<16;i++){
							errorTarget.push(false);
							errorMessage.push('');
						}
						
						if(typeof(req.body.MaxMoneyToLend) === 'string'){
							req.body.MaxMoneyToLend=sanitizer.sanitize(req.body.MaxMoneyToLend.trim());
							var nowMoney=parseInt(req.body.MaxMoneyToLend);
							
							if(req.body.MaxMoneyToLend===''){
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
						}else{
							req.body.MaxMoneyToLend=''
							errorTarget[0]=true;
							errorMessage[0]='未送出!';
						}
						
						if(typeof(req.body.InterestRate) === 'string'){
							req.body.InterestRate=sanitizer.sanitize(req.body.InterestRate.trim());
							var rate=(parseFloat(req.body.InterestRate)/100)+library.serviceChargeRate;//scr;
							
							if(req.body.InterestRate===''){
								errorTarget[1]=true;
								errorMessage[1]='必要參數未填!';
							}else if(isNaN(rate)){
								errorTarget[1]=true;
								errorMessage[1]='非數字參數!';
							}else if((rate<(0.0001+library.serviceChargeRate))||(rate>(0.99+library.serviceChargeRate))){
								errorTarget[1]=true;
								errorMessage[1]='錯誤參數!';
							}
						}else{
							req.body.InterestRate='';
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
							}
						}else{
							req.body.MonthPeriod='';
							errorTarget[2]=true;
							errorMessage[2]='未送出!';
						}
						
						if(typeof(req.body.MinLevelAccepted) === 'string'){
							req.body.MinLevelAccepted=sanitizer.sanitize(req.body.MinLevelAccepted.trim());
							var level;
							if(req.body.MinLevelAccepted===''){
								level=1;
							}else{
								level=parseInt(req.body.MinLevelAccepted);
							}
							
							if(isNaN(level)){
								errorTarget[3]=true;
								errorMessage[3]='非數字參數!';
							}else if(level<1){
								errorTarget[3]=true;
								errorMessage[3]='錯誤參數!';
							}
						}else{
							req.body.MinLevelAccepted='';
							errorTarget[3]=true;
							errorMessage[3]='未送出!';
						}
						
						if(typeof(req.body.MinInterestInFuture) === 'string'){
							req.body.MinInterestInFuture=sanitizer.sanitize(req.body.MinInterestInFuture.trim());
							var MinInterestInFuture;
							if(req.body.MinInterestInFuture===''){
								MinInterestInFuture=1;
							}else{
								MinInterestInFuture=parseInt(req.body.MinInterestInFuture);
							}
							
							if(isNaN(MinInterestInFuture)){
								errorTarget[4]=true;
								errorMessage[4]='非數字參數!';
							}else if(MinInterestInFuture<1){
								errorTarget[4]=true;
								errorMessage[4]='錯誤參數!';
							}
						}else{
							req.body.MinInterestInFuture='';
							errorTarget[4]=true;
							errorMessage[4]='未送出!';
						}
						
						if(typeof(req.body.MinMoneyFuture) === 'string'){
							req.body.MinMoneyFuture=sanitizer.sanitize(req.body.MinMoneyFuture.trim());
							var MinMoneyFuture;
							if(req.body.MinMoneyFuture===''){
								MinMoneyFuture=1;
							}else{
								MinMoneyFuture=parseInt(req.body.MinMoneyFuture);
							}
							
							if(isNaN(MinMoneyFuture)){
								errorTarget[5]=true;
								errorMessage[5]='非數字參數!';
							}else if(MinMoneyFuture<1){
								errorTarget[5]=true;
								errorMessage[5]='錯誤參數!';
							}
						}else{
							req.body.MinMoneyFuture='';
							errorTarget[5]=true;
							errorMessage[5]='未送出!';
						}
						
						if(typeof(req.body.MinInterestInFutureMonth) === 'string'){
							req.body.MinInterestInFutureMonth=sanitizer.sanitize(req.body.MinInterestInFutureMonth.trim());
							var MinInterestInFutureMonth;
							if(req.body.MinInterestInFutureMonth===''){
								MinInterestInFutureMonth=1;
							}else{
								MinInterestInFutureMonth=parseInt(req.body.MinInterestInFutureMonth);
							}
							
							if(isNaN(MinInterestInFutureMonth)){
								errorTarget[6]=true;
								errorMessage[6]='非數字參數!';
							}else if(MinInterestInFutureMonth<1){
								errorTarget[6]=true;
								errorMessage[6]='錯誤參數!';
							}
						}else{
							req.body.MinInterestInFutureMonth='';
							errorTarget[6]=true;
							errorMessage[6]='未送出!';
						}
						
						if(typeof(req.body.MinInterestInFutureMoneyMonth) === 'string'){
							req.body.MinInterestInFutureMoneyMonth=sanitizer.sanitize(req.body.MinInterestInFutureMoneyMonth.trim());
							var MinInterestInFutureMoneyMonth;
							if(req.body.MinInterestInFutureMoneyMonth===''){
								MinInterestInFutureMoneyMonth=1;
							}else{
								MinInterestInFutureMoneyMonth=parseInt(req.body.MinInterestInFutureMoneyMonth);
							}
							
							if(isNaN(MinInterestInFutureMoneyMonth)){
								errorTarget[7]=true;
								errorMessage[7]='非數字參數!';
							}else if(MinInterestInFutureMoneyMonth<1){
								errorTarget[7]=true;
								errorMessage[7]='錯誤參數!';
							}
						}else{
							req.body.MinInterestInFutureMoneyMonth='';
							errorTarget[7]=true;
							errorMessage[7]='未送出!';
						}
						
						if(typeof(req.body.MinInterestInFutureDivMoney) === 'string'){
							req.body.MinInterestInFutureDivMoney=sanitizer.sanitize(req.body.MinInterestInFutureDivMoney.trim());
							var MinInterestInFutureDivMoney;
							if(req.body.MinInterestInFutureDivMoney===''){
								MinInterestInFutureDivMoney=0.05;
							}else{
								MinInterestInFutureDivMoney=parseFloat(req.body.MinInterestInFutureDivMoney)/100;
							}
							
							if(isNaN(MinInterestInFutureDivMoney)){
								errorTarget[8]=true;
								errorMessage[8]='非數字參數!';
							}else if((MinInterestInFutureDivMoney<0.0001)||(MinInterestInFutureDivMoney>0.99)){
								errorTarget[8]=true;
								errorMessage[8]='錯誤參數!';
							}
						}else{
							req.body.MinInterestInFutureDivMoney='';
							errorTarget[8]=true;
							errorMessage[8]='未送出!';
						}
						
						if(typeof(req.body.AutoComfirmToBorrowMsgPeriod) === 'string'){
							req.body.AutoComfirmToBorrowMsgPeriod=sanitizer.sanitize(req.body.AutoComfirmToBorrowMsgPeriod.trim());
							var period=parseFloat(req.body.AutoComfirmToBorrowMsgPeriod);
							
							if(req.body.AutoComfirmToBorrowMsgPeriod===''){
								req.body.AutoComfirmToBorrowMsgPeriod='-1';
								errorTarget[9]=true;
								errorMessage[9]='必要參數未填!';
							}else if(isNaN(period)){
								req.body.AutoComfirmToBorrowMsgPeriod='-1';
								errorTarget[9]=true;
								errorMessage[9]='非數字參數!';
							}else if(Math.round(period) !== period){
								req.body.AutoComfirmToBorrowMsgPeriod='-1';
								errorTarget[9]=true;
								errorMessage[9]='錯誤參數!';
							}else if((period<-1)||(period>3)){
								req.body.AutoComfirmToBorrowMsgPeriod='-1';
								errorTarget[9]=true;
								errorMessage[9]='錯誤參數!';
							}
							
							if((!errorTarget[9])&&(period>0)){
								if(typeof(req.body.AutoComfirmToBorrowMsgClassor) === 'string'){
									req.body.AutoComfirmToBorrowMsgClassor=sanitizer.sanitize(req.body.AutoComfirmToBorrowMsgClassor.trim());
									if(req.body.AutoComfirmToBorrowMsgClassor===''){
										req.body.AutoComfirmToBorrowMsgClassor='none';
										errorTarget[10]=true;
										errorMessage[10]='必要參數未填!';
									}else if((req.body.AutoComfirmToBorrowMsgClassor!=='none')&&(req.body.AutoComfirmToBorrowMsgClassor!=='general')&&(req.body.AutoComfirmToBorrowMsgClassor!=='education')&&(req.body.AutoComfirmToBorrowMsgClassor!=='family')&&(req.body.AutoComfirmToBorrowMsgClassor!=='tour')){
										req.body.AutoComfirmToBorrowMsgClassor='none';
										errorTarget[10]=true;
										errorMessage[10]='錯誤參數!';
									}
								}else{
									req.body.AutoComfirmToBorrowMsgClassor='none';
									errorTarget[10]=true;
									errorMessage[10]='未送出!';
								}
								
								if(typeof(req.body.AutoComfirmToBorrowMsgSorter) === 'string'){
									req.body.AutoComfirmToBorrowMsgSorter=sanitizer.sanitize(req.body.AutoComfirmToBorrowMsgSorter.trim());
									var sorter=req.body.AutoComfirmToBorrowMsgSorter;
									
									if(req.body.AutoComfirmToBorrowMsgSorter===''){
										req.body.AutoComfirmToBorrowMsgSorter='InterestRate';
										errorTarget[11]=true;
										errorMessage[11]='必要參數未填!';
									}else if((req.body.AutoComfirmToBorrowMsgSorter!=='InterestRate')&&(req.body.AutoComfirmToBorrowMsgSorter!=='MoneyToLend')&&(req.body.AutoComfirmToBorrowMsgSorter!=='MonthPeriod')&&(req.body.AutoComfirmToBorrowMsgSorter!=='Level')&&(req.body.AutoComfirmToBorrowMsgSorter!=='InterestInFuture')&&(req.body.AutoComfirmToBorrowMsgSorter!=='MoneyFuture')&&(req.body.AutoComfirmToBorrowMsgSorter!=='InterestInFutureMonth')&&(req.body.AutoComfirmToBorrowMsgSorter!=='InterestInFutureMoneyMonth')&&(req.body.AutoComfirmToBorrowMsgSorter!=='InterestInFutureDivMoney')&&(req.body.AutoComfirmToBorrowMsgSorter!=='Updated')&&(req.body.AutoComfirmToBorrowMsgSorter!=='Created')){
										req.body.AutoComfirmToBorrowMsgSorter='InterestRate';
										errorTarget[11]=true;
										errorMessage[11]='錯誤參數!';
									}
								}else{
									req.body.AutoComfirmToBorrowMsgSorter='InterestRate';
									errorTarget[11]=true;
									errorMessage[11]='未送出!';
								}
								
								if(typeof(req.body.AutoComfirmToBorrowMsgDirector) === 'string'){
									req.body.AutoComfirmToBorrowMsgDirector=sanitizer.sanitize(req.body.AutoComfirmToBorrowMsgDirector.trim());
									if(req.body.AutoComfirmToBorrowMsgDirector===''){
										req.body.AutoComfirmToBorrowMsgDirector='minus';
										errorTarget[12]=true;
										errorMessage[12]='必要參數未填!';
									}else if((req.body.AutoComfirmToBorrowMsgDirector!=='minus')&&(req.body.AutoComfirmToBorrowMsgDirector!=='plus')){
										req.body.AutoComfirmToBorrowMsgDirector='minus';
										errorTarget[12]=true;
										errorMessage[12]='錯誤參數!';
									}
								}else{
									req.body.AutoComfirmToBorrowMsgDirector='minus';
									errorTarget[12]=true;
									errorMessage[12]='未送出!';
								}
								
								if(!errorTarget[11]){
									if(typeof(req.body.AutoComfirmToBorrowMsgLbound) === 'string'){
										req.body.AutoComfirmToBorrowMsgLbound=sanitizer.sanitize(req.body.AutoComfirmToBorrowMsgLbound.trim());
										var lbound=req.body.AutoComfirmToBorrowMsgLbound;
										
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
									}else{
										req.body.AutoComfirmToBorrowMsgLbound='';
										errorTarget[13]=true;
										errorMessage[13]='未送出!';
									}
									
									if(typeof(req.body.AutoComfirmToBorrowMsgUbound) === 'string'){
										req.body.AutoComfirmToBorrowMsgUbound=sanitizer.sanitize(req.body.AutoComfirmToBorrowMsgUbound.trim());
										var ubound=req.body.AutoComfirmToBorrowMsgUbound;
										
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
									}else{
										req.body.AutoComfirmToBorrowMsgUbound='';
										errorTarget[14]=true;
										errorMessage[14]='未送出!';
									}
									
									if(typeof(req.body.AutoComfirmToBorrowMsgKeyWord) === 'string'){
										req.body.AutoComfirmToBorrowMsgKeyWord=sanitizer.sanitize(req.body.AutoComfirmToBorrowMsgKeyWord.trim());
									}else{
										req.body.AutoComfirmToBorrowMsgKeyWord='';
										errorTarget[15]=true;
										errorMessage[15]='未送出!';
									}
								}else{
									req.body.AutoComfirmToBorrowMsgLbound='';
									req.body.AutoComfirmToBorrowMsgUbound='';
									req.body.AutoComfirmToBorrowMsgKeyWord='';
								}
							}else{
								req.body.AutoComfirmToBorrowMsgClassor='none';
								req.body.AutoComfirmToBorrowMsgSorter='InterestRate';
								req.body.AutoComfirmToBorrowMsgDirector='minus';
								req.body.AutoComfirmToBorrowMsgLbound='';
								req.body.AutoComfirmToBorrowMsgUbound='';
								req.body.AutoComfirmToBorrowMsgKeyWord='';
							}
						}else{
							req.body.AutoComfirmToBorrowMsgPeriod='-1';
							req.body.AutoComfirmToBorrowMsgClassor='none';
							req.body.AutoComfirmToBorrowMsgSorter='InterestRate';
							req.body.AutoComfirmToBorrowMsgDirector='minus';
							req.body.AutoComfirmToBorrowMsgLbound='';
							req.body.AutoComfirmToBorrowMsgUbound='';
							req.body.AutoComfirmToBorrowMsgKeyWord='';
							errorTarget[9]=true;
							errorMessage[9]='未送出!';
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
	res.redirect('/lender/lend');
}

function createPart(res,req,outterPara){
	var toCreate = new Lends();
	toCreate.MaxMoneyToLend=parseInt(req.body.MaxMoneyToLend);
	toCreate.InterestRate=(parseFloat(req.body.InterestRate)/100)+library.serviceChargeRate;//scr
	toCreate.MonthPeriod=parseInt(req.body.MonthPeriod);
	if(req.body.MinLevelAccepted!==''){
		toCreate.MinLevelAccepted=parseInt(req.body.MinLevelAccepted);
	}
	if(req.body.MinInterestInFuture!==''){
		toCreate.MinInterestInFuture=parseInt(req.body.MinInterestInFuture);
	}
	if(req.body.MinMoneyFuture!==''){
		toCreate.MinMoneyFuture=parseInt(req.body.MinMoneyFuture);
	}
	if(req.body.MinInterestInFutureMonth!==''){
		toCreate.MinInterestInFutureMonth=parseInt(req.body.MinInterestInFutureMonth);
	}
	if(req.body.MinInterestInFutureMoneyMonth!==''){
		toCreate.MinInterestInFutureMoneyMonth=parseInt(req.body.MinInterestInFutureMoneyMonth);
	}
	if(req.body.MinInterestInFutureDivMoney!==''){
		toCreate.MinInterestInFutureDivMoney=parseFloat(req.body.MinInterestInFutureDivMoney)/100;
	}
	
	var period=parseInt(req.body.AutoComfirmToBorrowMsgPeriod);
	toCreate.AutoComfirmToBorrowMsgPeriod=period;
	if(period>0){
		var sorter=library.replacer(req.body.AutoComfirmToBorrowMsgSorter,false);
		var lbound=library.replacer(req.body.AutoComfirmToBorrowMsgLbound,false);
		var ubound=library.replacer(req.body.AutoComfirmToBorrowMsgUbound,false);
		var rtnJSON=luMaker(sorter,lbound,ubound);
		toCreate.AutoComfirmToBorrowMsgSorter=sorter;
		toCreate.AutoComfirmToBorrowMsgDirector=library.replacer(req.body.AutoComfirmToBorrowMsgDirector,false);
		toCreate.AutoComfirmToBorrowMsgClassor=library.replacer(req.body.AutoComfirmToBorrowMsgClassor,false);
		toCreate.AutoComfirmToBorrowMsgKeyWord=library.replacer(req.body.AutoComfirmToBorrowMsgKeyWord,true);
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
	lend.MaxMoneyToLend=parseInt(req.body.MaxMoneyToLend);
	lend.InterestRate=(parseFloat(req.body.InterestRate)/100)+library.serviceChargeRate;//scr
	lend.MonthPeriod=parseInt(req.body.MonthPeriod);
	if(req.body.MinLevelAccepted!==''){
		lend.MinLevelAccepted=parseInt(req.body.MinLevelAccepted);
	}else{
		lend.MinLevelAccepted=-1;
	}
	if(req.body.MinInterestInFuture!==''){
		lend.MinInterestInFuture=parseInt(req.body.MinInterestInFuture);
	}else{
		lend.MinInterestInFuture=-1;
	}
	if(req.body.MinMoneyFuture!==''){
		lend.MinMoneyFuture=parseInt(req.body.MinMoneyFuture);
	}else{
		lend.MinMoneyFuture=-1;
	}
	if(req.body.MinInterestInFutureMonth!==''){
		lend.MinInterestInFutureMonth=parseInt(req.body.MinInterestInFutureMonth);
	}else{
		lend.MinInterestInFutureMonth=-1;
	}
	if(req.body.MinInterestInFutureMoneyMonth!==''){
		lend.MinInterestInFutureMoneyMonth=parseInt(req.body.MinInterestInFutureMoneyMonth);
	}else{
		lend.MinInterestInFutureMoneyMonth=-1;
	}
	if(req.body.MinInterestInFutureDivMoney!==''){
		lend.MinInterestInFutureDivMoney=parseFloat(req.body.MinInterestInFutureDivMoney)/100;
	}else{
		lend.MinInterestInFutureDivMoney=-1;
	}
	
	var period=parseInt(req.body.AutoComfirmToBorrowMsgPeriod);
	lend.AutoComfirmToBorrowMsgPeriod=period;
	if(period>0){
		var sorter=library.replacer(req.body.AutoComfirmToBorrowMsgSorter,false);
		var lbound=library.replacer(req.body.AutoComfirmToBorrowMsgLbound,false);
		var ubound=library.replacer(req.body.AutoComfirmToBorrowMsgUbound,false);
		var rtnJSON=luMaker(sorter,lbound,ubound);
		lend.AutoComfirmToBorrowMsgSorter=sorter;
		lend.AutoComfirmToBorrowMsgDirector=library.replacer(req.body.AutoComfirmToBorrowMsgDirector,false);
		lend.AutoComfirmToBorrowMsgClassor=library.replacer(req.body.AutoComfirmToBorrowMsgClassor,false);
		lend.AutoComfirmToBorrowMsgKeyWord=library.replacer(req.body.AutoComfirmToBorrowMsgKeyWord,true);
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
	if(typeof(req.body._id) !== 'string'){	
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
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/update',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	if(typeof(req.body._id) === 'string'){	
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
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/destroy',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	if(typeof(req.body._id) === 'string'){
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
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/changer',library.loginFormChecker, library.ensureAuthenticated, function(req, res, next) {
	if((typeof(req.body.TargetID) === 'string')&&(typeof(req.body.Value) === 'string')){
		req.body.TargetID=sanitizer.sanitize(req.body.TargetID.trim());
		req.body.Value=sanitizer.sanitize(req.body.Value.trim());
		Lends.findById(req.body.TargetID).exec(function (err,lend){
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
											var nowMoney=parseInt(req.body.Value);
											
											if(req.body.Value===''){
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
	}else{
		res.json({error: "failed!",success:false}, 500);
	}
});

module.exports = router;
