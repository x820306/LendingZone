var library=require( './library.js' );
var mongoose = require('mongoose');
var Lends  = mongoose.model('Lends');
var BankAccounts  = mongoose.model('BankAccounts');
var Messages = mongoose.model('Messages');
var sanitizer = require('sanitizer');

var express = require('express');
var router = express.Router();

router.post('/createTest', function(req, res, next) {
	var toCreate = new Lends();
	toCreate.MaxMoneyToLend=sanitizer.sanitize(req.body.MaxMoneyToLend);
	toCreate.InterestRate=sanitizer.sanitize(req.body.InterestRate);
	toCreate.MonthPeriod=sanitizer.sanitize(req.body.MonthPeriod);
	toCreate.CreatedBy=sanitizer.sanitize(req.body.CreatedBy);
	
	toCreate.save(function (err,newCreate) {
		if (err){
			console.log(err);
			res.json({error: err.name}, 500);
		}else{
			res.json(newCreate);
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
				var nowMoney=parseInt(sanitizer.sanitize(req.body.MaxMoneyToLend));
				var rate=(parseFloat(sanitizer.sanitize(req.body.InterestRate))/100)+library.serviceChargeRate;//scr;
				var month=parseInt(sanitizer.sanitize(req.body.MonthPeriod));
				var level=parseInt(sanitizer.sanitize(req.body.MinLevelAccepted));
				var MinInterestInFuture=parseFloat(sanitizer.sanitize(req.body.MinInterestInFuture));
				var MinInterestInFutureMonth=parseFloat(sanitizer.sanitize(req.body.MinInterestInFutureMonth));
				var MinInterestInFutureMoneyMonth=parseFloat(sanitizer.sanitize(req.body.MinInterestInFutureMoneyMonth));
				var MinInterestInFutureDivMoney=parseFloat(sanitizer.sanitize(req.body.MinInterestInFutureDivMoney))/100;
				
				if((sanitizer.sanitize(req.body.MaxMoneyToLend)=='')||(sanitizer.sanitize(req.body.InterestRate)=='')||(sanitizer.sanitize(req.body.MonthPeriod)=='')){
					res.redirect('/message?content='+encodeURIComponent('必要參數未填!'));
				}else if((month<=0)||(month>36)||(nowMoney<=0)||(level<0)||(MinInterestInFuture<0)||(MinInterestInFutureMonth<0)||(MinInterestInFutureMoneyMonth<0)||(rate<=(0+library.serviceChargeRate))||(rate>=(1+library.serviceChargeRate))||(MinInterestInFutureDivMoney<0)||(MinInterestInFutureDivMoney>=1)){
					res.redirect('/message?content='+encodeURIComponent('錯誤參數!'));//scr
				}else if(nowMoney>maxMoney){
					res.redirect('/message?content='+encodeURIComponent('超過金額上限!'));
				}else{
					differentPart(res,req,outterPara);
				}	
			}
		}
	});
}

function createPart(res,req,outterPara){
	var toCreate = new Lends();
	toCreate.MaxMoneyToLend=parseInt(sanitizer.sanitize(req.body.MaxMoneyToLend));
	toCreate.InterestRate=(parseFloat(sanitizer.sanitize(req.body.InterestRate))/100)+library.serviceChargeRate;//scr
	toCreate.MonthPeriod=parseInt(sanitizer.sanitize(req.body.MonthPeriod));
	if(sanitizer.sanitize(req.body.MinLevelAccepted)!=''){
		toCreate.MinLevelAccepted=parseInt(sanitizer.sanitize(req.body.MinLevelAccepted));
	}
	if(sanitizer.sanitize(req.body.MinInterestInFuture)!=''){
		toCreate.MinInterestInFuture=parseFloat(sanitizer.sanitize(req.body.MinInterestInFuture));
	}
	if(sanitizer.sanitize(req.body.MinInterestInFutureMonth)!=''){
		toCreate.MinInterestInFutureMonth=parseFloat(sanitizer.sanitize(req.body.MinInterestInFutureMonth));
	}
	if(sanitizer.sanitize(req.body.MinInterestInFutureMoneyMonth)!=''){
		toCreate.MinInterestInFutureMoneyMonth=parseFloat(sanitizer.sanitize(req.body.MinInterestInFutureMoneyMonth));
	}
	if(sanitizer.sanitize(req.body.MinInterestInFutureDivMoney)!=''){
		toCreate.MinInterestInFutureDivMoney=parseFloat(sanitizer.sanitize(req.body.MinInterestInFutureDivMoney))/100;
	}
	
	toCreate.AutoComfirmToBorrowMsgPeriod=sanitizer.sanitize(req.body.AutoComfirmToBorrowMsgPeriod);
	if(!req.body.AutoComfirmToBorrowMsgSorter){
		toCreate.AutoComfirmToBorrowMsgSorter="invalid";
	}else{
		toCreate.AutoComfirmToBorrowMsgSorter=sanitizer.sanitize(req.body.AutoComfirmToBorrowMsgSorter);
	}
	toCreate.CreatedBy=req.user._id;
	
	toCreate.save(function (err,newCreate) {
		if (err){
			res.redirect('/message?content='+encodeURIComponent('新建失敗!'));
		}else{
			if(newCreate.AutoComfirmToBorrowMsgPeriod>0){
				var toSaveID=setInterval( function() { autoConfirm(req,res,newCreate.AutoComfirmToBorrowMsgSorter,newCreate._id); }, 86400000*newCreate.AutoComfirmToBorrowMsgPeriod);
				var toSaveJSON={CreatedBy:req.user._id,CommandID:toSaveID,LendID:newCreate._id};
				library.autoComfirmToBorrowMsgArray.push(toSaveJSON);
			}
			res.redirect('/lender/lend');
		}
	});
}

function updatePart(res,req,lend){
	lend.MaxMoneyToLend=parseInt(sanitizer.sanitize(req.body.MaxMoneyToLend));
	lend.InterestRate=(parseFloat(sanitizer.sanitize(req.body.InterestRate))/100)+library.serviceChargeRate;//scr
	lend.MonthPeriod=parseInt(sanitizer.sanitize(req.body.MonthPeriod));
	if(sanitizer.sanitize(req.body.MinLevelAccepted)!=''){
		lend.MinLevelAccepted=parseInt(sanitizer.sanitize(req.body.MinLevelAccepted));
	}
	if(sanitizer.sanitize(req.body.MinInterestInFuture)!=''){
		lend.MinInterestInFuture=parseFloat(sanitizer.sanitize(req.body.MinInterestInFuture));
	}
	if(sanitizer.sanitize(req.body.MinInterestInFutureMonth)!=''){
		lend.MinInterestInFutureMonth=parseFloat(sanitizer.sanitize(req.body.MinInterestInFutureMonth));
	}
	if(sanitizer.sanitize(req.body.MinInterestInFutureMoneyMonth)!=''){
		lend.MinInterestInFutureMoneyMonth=parseFloat(sanitizer.sanitize(req.body.MinInterestInFutureMoneyMonth));
	}
	if(sanitizer.sanitize(req.body.MinInterestInFutureDivMoney)!=''){
		lend.MinInterestInFutureDivMoney=parseFloat(sanitizer.sanitize(req.body.MinInterestInFutureDivMoney))/100;
	}
	
	lend.AutoComfirmToBorrowMsgPeriod=sanitizer.sanitize(req.body.AutoComfirmToBorrowMsgPeriod);
	if(!req.body.AutoComfirmToBorrowMsgSorter){
		lend.AutoComfirmToBorrowMsgSorter="invalid";
	}else{
		lend.AutoComfirmToBorrowMsgSorter=sanitizer.sanitize(req.body.AutoComfirmToBorrowMsgSorter);
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
				var toSaveID=setInterval( function() { autoConfirm(req,res,newUpdate.AutoComfirmToBorrowMsgSorter,newUpdate._id); }, 86400000*newUpdate.AutoComfirmToBorrowMsgPeriod);
				var toSaveJSON={CreatedBy:req.user._id,CommandID:toSaveID,LendID:newUpdate._id};
				library.autoComfirmToBorrowMsgArray.push(toSaveJSON);
			}
			res.redirect('/lender/lend');
		}
	});
}

function autoConfirm(req,res,sorter,lendID){
	var sorterReserve=sorter;
	if(sorter=='-SpecialA'){
		sorter='-Updated';
	}else if(sorter=='-SpecialB'){
		sorter='-Updated';
	}else if(sorter=='-SpecialC'){
		sorter='-Updated';
	}else if(sorter=='-SpecialD'){
		sorter='-Updated';
	}
	
	Lends.findById(lendID).exec(function (err, lend){
		if (err) {
			console.log(err);
		}else{
			if(lend){
				if(lend.MaxMoneyToLend>0){
					Messages.find({$and:[{"SendTo": req.user._id},{"Type": "toBorrow"},{"Status": "NotConfirmed"}]}).sort(sorter).exec(function (err, messages){
						if (err) {
							console.log(err);
						}else{
							if(messages.length>0){
								if((sorterReserve=='-SpecialA')||(sorterReserve=='-SpecialB')||(sorterReserve=='-SpecialC')||(sorterReserve=='-SpecialD')){
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
									
									if(sorterReserve=='-SpecialA'){
										messages.sort(function(a,b) { return parseFloat(b.InterestInFuture) - parseFloat(a.InterestInFuture)} );
									}else if(sorterReserve=='-SpecialA'){
										messages.sort(function(a,b) { return parseFloat(b.InterestInFutureMonth) - parseFloat(a.InterestInFutureMonth)} );
									}else if(sorterReserve=='-SpecialD'){
										messages.sort(function(a,b) { return parseFloat(b.InterestInFutureMoneyMonth) - parseFloat(a.InterestInFutureMoneyMonth) } );
									}else if(sorterReserve=='-SpecialD'){
										messages.sort(function(a,b) { return parseFloat(b.InterestInFutureDivMoney) - parseFloat(a.InterestInFutureDivMoney) } );
									}
								}
								
								var arrayOp=[];
								for(i=0;i<messages.length;i++){
									var temp={FromBorrowRequest:messages[i].FromBorrowRequest,MessageID:messages[i]._id};
									arrayOp.push(temp);
								}
								delete req.body.array;
								req.body.array=arrayOp;
								library.confirmToBorrowMessage(true,0,req.body.array.length,null,req,res,true,'/',true);
							}
						}
					});
				}
			}
		}
	});
}

router.post('/create', library.ensureAuthenticated, function(req, res, next) {
	samePart(res,req,createPart,null);
});

router.post('/update', library.ensureAuthenticated, function(req, res, next) {
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

router.post('/destroy', library.ensureAuthenticated, function(req, res, next) {
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

module.exports = router;
