var library=require( './library.js' );
var mongoose = require('mongoose');
var Lends  = mongoose.model('Lends');
var BankAccounts  = mongoose.model('BankAccounts');
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
				var maxMoney=parseInt(bankaccount.MoneyInBankAccount);
				var nowMoney=parseInt(sanitizer.sanitize(req.body.MaxMoneyToLend.trim()));
				var rate=(parseFloat(sanitizer.sanitize(req.body.InterestRate.trim()))/100)+library.serviceChargeRate;//scr;
				var month=parseInt(sanitizer.sanitize(req.body.MonthPeriod.trim()));
				var level;
				if(sanitizer.sanitize(req.body.MinLevelAccepted.trim())==''){
					level=1;
				}else{
					level=parseInt(sanitizer.sanitize(req.body.MinLevelAccepted.trim()));
				}
				var MinInterestInFuture;
				if(sanitizer.sanitize(req.body.MinInterestInFuture.trim())==''){
					MinInterestInFuture=1;
				}else{
					MinInterestInFuture=parseInt(sanitizer.sanitize(req.body.MinInterestInFuture.trim()));
				}
				var MinInterestInFutureMonth;
				if(sanitizer.sanitize(req.body.MinInterestInFutureMonth.trim())==''){
					MinInterestInFutureMonth=1;
				}else{
					MinInterestInFutureMonth=parseInt(sanitizer.sanitize(req.body.MinInterestInFutureMonth.trim()));
				}
				var MinInterestInFutureMoneyMonth;
				if(sanitizer.sanitize(req.body.MinInterestInFutureMoneyMonth.trim())==''){
					MinInterestInFutureMoneyMonth=1;
				}else{
					MinInterestInFutureMoneyMonth=parseInt(sanitizer.sanitize(req.body.MinInterestInFutureMoneyMonth.trim()));
				}
				var MinInterestInFutureDivMoney;
				if(sanitizer.sanitize(req.body.MinInterestInFutureDivMoney.trim())==''){
					MinInterestInFutureDivMoney=0.05;
				}else{
					MinInterestInFutureDivMoney=parseFloat(sanitizer.sanitize(req.body.MinInterestInFutureDivMoney.trim()))/100;
				}
				
				var errorTarget=[];
				var errorMessage=[];
				for(i=0;i<8;i++){
					errorTarget.push(false);
					errorMessage.push('');
				}
				
				if(sanitizer.sanitize(req.body.MaxMoneyToLend.trim())==''){
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
				
				if(sanitizer.sanitize(req.body.InterestRate.trim())==''){
					errorTarget[1]=true;
					errorMessage[1]='必要參數未填!';
				}else if(isNaN(rate)){
					errorTarget[1]=true;
					errorMessage[1]='非數字參數!';
				}else if((rate<(0.0001+library.serviceChargeRate))||(rate>(0.99+library.serviceChargeRate))){
					errorTarget[1]=true;
					errorMessage[1]='錯誤參數!';
				}
				
				if(sanitizer.sanitize(req.body.MonthPeriod.trim())==''){
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
				}else if(level<0){
					errorTarget[3]=true;
					errorMessage[3]='錯誤參數!';
				}
				
				if(isNaN(MinInterestInFuture)){
					errorTarget[4]=true;
					errorMessage[4]='非數字參數!';
				}else if(MinInterestInFuture<0){
					errorTarget[4]=true;
					errorMessage[4]='錯誤參數!';
				}
				
				if(isNaN(MinInterestInFutureMonth)){
					errorTarget[5]=true;
					errorMessage[5]='非數字參數!';
				}else if(MinInterestInFutureMonth<0){
					errorTarget[5]=true;
					errorMessage[5]='錯誤參數!';
				}
				
				if(isNaN(MinInterestInFutureMoneyMonth)){
					errorTarget[6]=true;
					errorMessage[6]='非數字參數!';
				}else if(MinInterestInFutureMoneyMonth<0){
					errorTarget[6]=true;
					errorMessage[6]='錯誤參數!';
				}
				
				if(isNaN(MinInterestInFutureDivMoney)){
					errorTarget[7]=true;
					errorMessage[7]='非數字參數!';
				}else if((MinInterestInFutureDivMoney<0)||(MinInterestInFutureDivMoney>0.99)){
					errorTarget[7]=true;
					errorMessage[7]='錯誤參數!';
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
		F6:req.body.MinInterestInFutureMonth,
		F7:req.body.MinInterestInFutureMoneyMonth,
		F8:req.body.MinInterestInFutureDivMoney,
		F9:req.body.AutoComfirmToBorrowMsgPeriod,
		F10:req.body.AutoComfirmToBorrowMsgSorter,
		F11:req.body.AutoComfirmToBorrowMsgDirector
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
	if(sanitizer.sanitize(req.body.MinLevelAccepted.trim())!=''){
		toCreate.MinLevelAccepted=parseInt(sanitizer.sanitize(req.body.MinLevelAccepted.trim()));
	}
	if(sanitizer.sanitize(req.body.MinInterestInFuture.trim())!=''){
		toCreate.MinInterestInFuture=parseInt(sanitizer.sanitize(req.body.MinInterestInFuture.trim()));
	}
	if(sanitizer.sanitize(req.body.MinInterestInFutureMonth.trim())!=''){
		toCreate.MinInterestInFutureMonth=parseInt(sanitizer.sanitize(req.body.MinInterestInFutureMonth.trim()));
	}
	if(sanitizer.sanitize(req.body.MinInterestInFutureMoneyMonth.trim())!=''){
		toCreate.MinInterestInFutureMoneyMonth=parseInt(sanitizer.sanitize(req.body.MinInterestInFutureMoneyMonth.trim()));
	}
	if(sanitizer.sanitize(req.body.MinInterestInFutureDivMoney.trim())!=''){
		toCreate.MinInterestInFutureDivMoney=parseFloat(sanitizer.sanitize(req.body.MinInterestInFutureDivMoney.trim()))/100;
	}
	
	toCreate.AutoComfirmToBorrowMsgPeriod=sanitizer.sanitize(req.body.AutoComfirmToBorrowMsgPeriod.trim());
	if(!req.body.AutoComfirmToBorrowMsgSorter){
		toCreate.AutoComfirmToBorrowMsgSorter="invalid";
	}else{
		toCreate.AutoComfirmToBorrowMsgSorter=sanitizer.sanitize(req.body.AutoComfirmToBorrowMsgSorter.trim());
	}
	if(!req.body.AutoComfirmToBorrowMsgDirector){
		toCreate.AutoComfirmToBorrowMsgDirector="invalid";
	}else{
		toCreate.AutoComfirmToBorrowMsgDirector=sanitizer.sanitize(req.body.AutoComfirmToBorrowMsgDirector.trim());
	}
	toCreate.CreatedBy=req.user._id;
	
	toCreate.save(function (err,newCreate) {
		if (err){
			res.redirect('/message?content='+encodeURIComponent('新建失敗!'));
		}else{
			if(newCreate.AutoComfirmToBorrowMsgPeriod>0){
				var toSaveID=setInterval( function() { autoConfirm(req,res,newCreate.AutoComfirmToBorrowMsgSorter,newCreate.AutoComfirmToBorrowMsgDirector,newCreate._id); }, 86400000*newCreate.AutoComfirmToBorrowMsgPeriod);
				var toSaveJSON={CreatedBy:req.user._id,CommandID:toSaveID,LendID:newCreate._id};
				library.autoComfirmToBorrowMsgArray.push(toSaveJSON);
			}
			res.redirect('/lender/lend');
		}
	});
}

function updatePart(res,req,lend){
	lend.MaxMoneyToLend=parseInt(sanitizer.sanitize(req.body.MaxMoneyToLend.trim()));
	lend.InterestRate=(parseFloat(sanitizer.sanitize(req.body.InterestRate.trim()))/100)+library.serviceChargeRate;//scr
	lend.MonthPeriod=parseInt(sanitizer.sanitize(req.body.MonthPeriod.trim()));
	if(sanitizer.sanitize(req.body.MinLevelAccepted.trim())!=''){
		lend.MinLevelAccepted=parseInt(sanitizer.sanitize(req.body.MinLevelAccepted.trim()));
	}else{
		lend.MinLevelAccepted=0;
	}
	if(sanitizer.sanitize(req.body.MinInterestInFuture.trim())!=''){
		lend.MinInterestInFuture=parseInt(sanitizer.sanitize(req.body.MinInterestInFuture.trim()));
	}else{
		lend.MinInterestInFuture=0;
	}
	if(sanitizer.sanitize(req.body.MinInterestInFutureMonth.trim())!=''){
		lend.MinInterestInFutureMonth=parseInt(sanitizer.sanitize(req.body.MinInterestInFutureMonth.trim()));
	}else{
		lend.MinInterestInFutureMonth=0;
	}
	if(sanitizer.sanitize(req.body.MinInterestInFutureMoneyMonth.trim())!=''){
		lend.MinInterestInFutureMoneyMonth=parseInt(sanitizer.sanitize(req.body.MinInterestInFutureMoneyMonth.trim()));
	}else{
		lend.MinInterestInFutureMoneyMonth=0;
	}
	if(sanitizer.sanitize(req.body.MinInterestInFutureDivMoney.trim())!=''){
		lend.MinInterestInFutureDivMoney=parseFloat(sanitizer.sanitize(req.body.MinInterestInFutureDivMoney.trim()))/100;
	}else{
		lend.MinInterestInFutureDivMoney=0;
	}
	
	lend.AutoComfirmToBorrowMsgPeriod=sanitizer.sanitize(req.body.AutoComfirmToBorrowMsgPeriod.trim());
	if(!req.body.AutoComfirmToBorrowMsgSorter){
		lend.AutoComfirmToBorrowMsgSorter="invalid";
	}else{
		lend.AutoComfirmToBorrowMsgSorter=sanitizer.sanitize(req.body.AutoComfirmToBorrowMsgSorter.trim());
	}
	if(!req.body.AutoComfirmToBorrowMsgDirector){
		lend.AutoComfirmToBorrowMsgDirector="invalid";
	}else{
		lend.AutoComfirmToBorrowMsgDirector=sanitizer.sanitize(req.body.AutoComfirmToBorrowMsgDirector.trim());
	}
	lend.Updated = Date.now();
	
	lend.save(function (err,newUpdate) {
		if (err){
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('更新失敗!'));
		}else{
			var ctr=-1;
			for(i=0;i<library.autoComfirmToBorrowMsgArray.length;i++){
				if((req.user._id==library.autoComfirmToBorrowMsgArray[i].CreatedBy)&&(library.autoComfirmToBorrowMsgArray[i].LendID.equals(newUpdate._id))){
					ctr=i;
					break;
				}
			}
			if(ctr>-1){
				clearInterval(library.autoComfirmToBorrowMsgArray[ctr].CommandID);
				library.autoComfirmToBorrowMsgArray.splice(ctr,1);
			}
			
			if(newUpdate.AutoComfirmToBorrowMsgPeriod>0){
				var toSaveID=setInterval( function() { autoConfirm(req,res,newUpdate.AutoComfirmToBorrowMsgSorter,newUpdate.AutoComfirmToBorrowMsgDirector,newUpdate._id); }, 86400000*newUpdate.AutoComfirmToBorrowMsgPeriod);
				var toSaveJSON={CreatedBy:req.user._id,CommandID:toSaveID,LendID:newUpdate._id};
				library.autoComfirmToBorrowMsgArray.push(toSaveJSON);
			}
			res.redirect('/lender/lend');
		}
	});
}

function autoConfirm(req,res,sorter,director,lendID){
	var sorterRec=null;
	
	if((director!='minus')&&(director!='plus')){
		director='minus';
	}
	
	if((sorter=='SpecialA')||(sorter=='SpecialB')||(sorter=='SpecialC')||(sorter=='SpecialD')){
		sorterRec=library.directorDivider(director,'Updated',false);
	}else{
		if((sorter!='InterestRate')&&(sorter!='MoneyToLend')&&(sorter!='MonthPeriod')&&(sorter!='Level')&&(sorter!='Updated')&&(sorter!='Created')){
			sorter='InterestRate';
		}
		sorterRec=library.directorDivider(director,sorter,false);
	}
	
	Lends.findById(lendID).exec(function (err, lend){
		if (err) {
			console.log(err);
		}else{
			if(lend){
				if(lend.MaxMoneyToLend>0){
					Messages.find({$and:[{"SendTo": req.user._id},{"Type": "toBorrow"},{"Status": "NotConfirmed"}]}).sort(sorterRec).exec(function (err, messages){
						if (err) {
							console.log(err);
						}else{
							if(messages.length>0){
								if((sorter=='SpecialA')||(sorter=='SpecialB')||(sorter=='SpecialC')||(sorter=='SpecialD')){
									for(i=0;i<messages.length;i++){
										messages[i].InterestRate-=library.serviceChargeRate;//scr
										messages[i].InterestInFuture=library.interestInFutureCalculator(messages[i].MoneyToLend,messages[i].InterestRate,messages[i].MonthPeriod);
										if(messages[i].MoneyToLend>0){
											messages[i].InterestInFutureDivMoney=messages[i].InterestInFuture/messages[i].MoneyToLend;
										}else{
											messages[i].InterestInFutureDivMoney=0;
										}
										if(messages[i].MonthPeriod>0){
											messages[i].InterestInFutureMonth=messages[i].InterestInFuture/messages[i].MonthPeriod;
										}else{
											messages[i].InterestInFutureMonth=0;
										}
										if(messages[i].MonthPeriod>0){
											messages[i].InterestInFutureMoneyMonth=(messages[i].InterestInFuture+messages[i].MoneyToLend)/messages[i].MonthPeriod;
										}else{
											messages[i].InterestInFutureMoneyMonth=0;
										}
									}
									
									if(sorter=='SpecialA'){
										if(director=='minus'){
											messages.sort(function(a,b) { return parseFloat(b.InterestInFuture) - parseFloat(a.InterestInFuture)} );
										}else if(director=='plus'){
											messages.sort(function(a,b) { return parseFloat(a.InterestInFuture) - parseFloat(b.InterestInFuture)} );
										}
									}else if(sorter=='SpecialB'){
										if(director=='minus'){
											messages.sort(function(a,b) { return parseFloat(b.InterestInFutureMonth) - parseFloat(a.InterestInFutureMonth)} );
										}else if(director=='plus'){
											messages.sort(function(a,b) { return parseFloat(a.InterestInFutureMonth) - parseFloat(b.InterestInFutureMonth)} );
										}
									}else if(sorter=='SpecialC'){
										if(director=='minus'){
											messages.sort(function(a,b) { return parseFloat(b.InterestInFutureMoneyMonth) - parseFloat(a.InterestInFutureMoneyMonth)} );
										}else if(director=='plus'){
											messages.sort(function(a,b) { return parseFloat(a.InterestInFutureMoneyMonth) - parseFloat(b.InterestInFutureMoneyMonth)} );
										}
									}else if(sorter=='SpecialD'){
										if(director=='minus'){
											messages.sort(function(a,b) { return parseFloat(b.InterestInFutureDivMoney) - parseFloat(a.InterestInFutureDivMoney)} );
										}else if(director=='plus'){
											messages.sort(function(a,b) { return parseFloat(a.InterestInFutureDivMoney) - parseFloat(b.InterestInFutureDivMoney)} );
										}
									}
								}
								
								var arrayOp=[];
								for(i=0;i<messages.length;i++){
									var temp={FromBorrowRequest:messages[i].FromBorrowRequest,MessageID:messages[i]._id};
									arrayOp.push(temp);
								}
								delete req.body.array;
								req.body.array=arrayOp;
								var infoJson={counter1:req.body.array.length,counter2:0,info1:0,info2:0,info3:0,info4:0};
								library.confirmToBorrowMessage(true,0,req.body.array.length,null,req,res,true,'/',true,infoJson);
							}
						}
					});
				}
			}
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
				if(lend.CreatedBy!=req.user._id){
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
				if(lend.CreatedBy!=req.user._id){
					res.redirect('/message?content='+encodeURIComponent('認證錯誤!'));
				}else{
					lend.remove(function (err,removedItem) {
						if (err){
							console.log(err);
							res.redirect('/message?content='+encodeURIComponent('刪除失敗!'));
						}else{
							var ctr=-1;
							for(i=0;i<library.autoComfirmToBorrowMsgArray.length;i++){
								if((req.user._id==library.autoComfirmToBorrowMsgArray[i].CreatedBy)&&(library.autoComfirmToBorrowMsgArray[i].LendID.equals(removedItem._id))){
									ctr=i;
									break;
								}
							}
							if(ctr>-1){
								clearInterval(library.autoComfirmToBorrowMsgArray[ctr].CommandID);
								library.autoComfirmToBorrowMsgArray.splice(ctr,1);
							}
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
				if(lend.CreatedBy!=req.user._id){
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
								var maxMoney=parseInt(bankaccount.MoneyInBankAccount);
								var nowMoney=parseInt(sanitizer.sanitize(req.body.Value.trim()));
								
								if(sanitizer.sanitize(req.body.Value.trim())==''){
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
											res.json({result0:bankaccount.MoneyInBankAccount,result:lendUpdated.MaxMoneyToLend,success:true});
										}
									});
								}
							}
						}
					});
				}
			}
		}
	});
});

module.exports = router;
