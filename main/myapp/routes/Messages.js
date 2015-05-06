var mongoose = require('mongoose');
var Borrows  = mongoose.model('Borrows');
var Messages  = mongoose.model('Messages');
var BankAccounts  = mongoose.model('BankAccounts');
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
	Borrows.findById(req.body.FromBorrowRequest).exec(function (err, borrow){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			if(!borrow){
				res.redirect('/message?content='+chineseEncodeToURI('錯誤ID!'));
			}else{
				BankAccounts.findOne({"OwnedBy": req.user._id}).exec(function (err, bankaccount){
					if (err) {
						console.log(err);
						res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
					}else{
						if(!bankaccount){
							res.redirect('/message?content='+chineseEncodeToURI('無銀行帳戶!'));
						}else{
							var maxMoney=parseInt(bankaccount.MoneyInBankAccount);
							var maxMoney2=parseInt(borrow.MoneyToBorrow);
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
								differentPart(res,req,borrow.CreatedBy,outterPara);
							}
						}
					}
				});
			}
		}
	});	
}

function createPart(res,req,sendToIpt,typeIpt){
	var toCreate = new Messages();
	toCreate.FromBorrowRequest=sanitizer.sanitize(req.body.FromBorrowRequest);
	toCreate.Message=sanitizer.sanitize(req.body.Message);
	toCreate.MoneyToLend=sanitizer.sanitize(req.body.MoneyToLend);
	toCreate.InterestRate=sanitizer.sanitize(req.body.InterestRate);
	toCreate.MonthPeriod=sanitizer.sanitize(req.body.MonthPeriod);
	toCreate.CreatedBy= req.user._id
	toCreate.SendTo=sendToIpt;
	toCreate.Type=typeIpt;
	
	toCreate.save(function (err,newCreate) {
		if (err){
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			toCreate.save(function (err,newCreate) {
				if (err){
					res.redirect('/message?content='+chineseEncodeToURI('新建失敗!'));
				}else{
					if(newCreate.Type=='toLend'){
						res.redirect('/story?id='+req.body.FromBorrowRequest);
					}else if(newCreate.Type=='toBorrow'){
						res.redirect('/');
					}
				}
			});
		}
	});
}

function preUpdatePart(res,req,lendOrBorrow){
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
					lendOrBorrow(res,req,updatePart,message);	
				}
			}
		}
	});
}

function updatePart(res,req,innerPara,message){
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
			if(newUpdate.Type=='toLend'){
				res.redirect('/story?id='+req.body.FromBorrowRequest);
			}else if(newUpdate.Type=='toBorrow'){
				res.redirect('/');
			}
		}
	});
}

router.post('/toLendCreate', ensureAuthenticated, function(req, res, next) {
	toLendSamePart(res,req,createPart,'toLend');
});

router.post('/toLendUpdate', ensureAuthenticated, function(req, res, next) {
	preUpdatePart(res,req,toLendSamePart);
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
