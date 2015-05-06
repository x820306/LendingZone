var mongoose = require('mongoose');
var Lends  = mongoose.model('Lends');
var BankAccounts  = mongoose.model('BankAccounts');
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
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			if(!bankaccount){
				res.redirect('/message?content='+chineseEncodeToURI('無銀行帳戶!'));
			}else{
				var maxMoney=parseInt(bankaccount.MoneyInBankAccount);
				var nowMoney=parseInt(sanitizer.sanitize(req.body.MaxMoneyToLend));
				var rate=parseFloat(sanitizer.sanitize(req.body.InterestRate));
				var month=parseInt(sanitizer.sanitize(req.body.MonthPeriod));
				
				if((req.body.MaxMoneyToLend=='')||(req.body.InterestRate=='')||(req.body.MonthPeriod=='')){
					res.redirect('/message?content='+chineseEncodeToURI('必要參數未填!'));
				}else if((month<=0)||(nowMoney<=0)||(rate<=0)||(rate>=1)){
					res.redirect('/message?content='+chineseEncodeToURI('錯誤參數!'));
				}else if(nowMoney>maxMoney){
					res.redirect('/message?content='+chineseEncodeToURI('超過金額上限!'));
				}else{
					differentPart(res,req,outterPara);
				}	
			}
		}
	});
}

function createPart(res,req,outterPara){
	var toCreate = new Lends();
	toCreate.MaxMoneyToLend=sanitizer.sanitize(req.body.MaxMoneyToLend);
	toCreate.InterestRate=sanitizer.sanitize(req.body.InterestRate);
	toCreate.MonthPeriod=sanitizer.sanitize(req.body.MonthPeriod);
	toCreate.CreatedBy=req.user._id;
	
	toCreate.save(function (err,newCreate) {
		if (err){
			res.redirect('/message?content='+chineseEncodeToURI('新建失敗!'));
		}else{
			res.redirect('/lend');
		}
	});
}

function updatePart(res,req,lend){
	lend.MaxMoneyToLend=sanitizer.sanitize(req.body.MaxMoneyToLend);
	lend.InterestRate=sanitizer.sanitize(req.body.InterestRate);
	lend.MonthPeriod=sanitizer.sanitize(req.body.MonthPeriod);
	lend.Updated = Date.now();

	lend.save(function (err,newUpdate) {
		if (err){
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('更新失敗!'));
		}else{
			res.redirect('/lend');
		}
	});
}

router.post('/create', ensureAuthenticated, function(req, res, next) {
	samePart(res,req,createPart,null);
});

router.post('/update', ensureAuthenticated, function(req, res, next) {
	Lends.findById(req.body._id).exec(function (err, lend){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			if(!lend){
				res.redirect('/message?content='+chineseEncodeToURI('未找到更新目標!'));
			}else{
				if(lend.CreatedBy!=req.user._id){
					res.redirect('/message?content='+chineseEncodeToURI('認證錯誤!'));
				}else{
					samePart(res,req,updatePart,lend);	
				}
			}
		}
	});
});

router.post('/destroy', ensureAuthenticated, function(req, res, next) {
	Lends.findById(req.body._id).exec(function (err, lend){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			if(!lend){
				res.redirect('/message?content='+chineseEncodeToURI('未找到刪除目標!'));
			}else{
				if(lend.CreatedBy!=req.user._id){
					res.redirect('/message?content='+chineseEncodeToURI('認證錯誤!'));
				}else{
					lend.remove(function (err,removedItem) {
						if (err){
							console.log(err);
							res.redirect('/message?content='+chineseEncodeToURI('刪除失敗!'));
						}else{
							res.redirect('/lend');
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
