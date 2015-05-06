var mongoose = require('mongoose');
var Borrows  = mongoose.model('Borrows');
var ToLendMessages  = mongoose.model('ToLendMessages');
var BankAccounts  = mongoose.model('BankAccounts');
var sanitizer = require('sanitizer');

var express = require('express');
var router = express.Router();

router.post('/createTest', function(req, res, next) {
	var toCreate = new ToLendMessages();
	toCreate.FromBorrowRequest=sanitizer.sanitize(req.body.FromBorrowRequest);
	toCreate.Message=sanitizer.sanitize(req.body.Message);
	toCreate.MoneyToLend=sanitizer.sanitize(req.body.MoneyToLend);
	toCreate.InterestRate=sanitizer.sanitize(req.body.InterestRate);
	toCreate.MonthPeriod=sanitizer.sanitize(req.body.MonthPeriod);
	toCreate.SendTo=sanitizer.sanitize(req.body.SendTo);
	toCreate.CreatedBy=sanitizer.sanitize(req.body.CreatedBy);
	
	toCreate.save(function (err,newCreate) {
		if (err){
			console.log(err);
			res.json({error: err.name}, 500);
		}else{
			Borrows.findById(req.body.FromBorrowRequest).exec(function (err, borrow){
				if (err) {
					console.log(err);
					res.json({error: err.name}, 500);
				}else{

					borrow.ToLendMessages.push(newCreate._id);

					borrow.save(function (err,updatedborrow){
						if (err) {
							console.log(err);
							res.json({error: err.name}, 500);
						}else{
							res.json(newCreate);
						}
					});
				}
			});
		}
	});
});

function samePart(res,req,differentPart,outterPara){
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
								differentPart(res,req,borrow,outterPara);
							}
						}
					}
				});
			}
		}
	});	
}

function createPart(res,req,borrow,outterPara){
	var toCreate = new ToLendMessages();
	toCreate.FromBorrowRequest=sanitizer.sanitize(req.body.FromBorrowRequest);
	toCreate.Message=sanitizer.sanitize(req.body.Message);
	toCreate.MoneyToLend=sanitizer.sanitize(req.body.MoneyToLend);
	toCreate.InterestRate=sanitizer.sanitize(req.body.InterestRate);
	toCreate.MonthPeriod=sanitizer.sanitize(req.body.MonthPeriod);
	toCreate.CreatedBy= req.user._id
	toCreate.SendTo=borrow.CreatedBy;
	
	toCreate.save(function (err,newCreate) {
		if (err){
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			toCreate.save(function (err,newCreate) {
				if (err){
					res.redirect('/message?content='+chineseEncodeToURI('新建失敗!'));
				}else{
					res.redirect('/story?id='+req.body.FromBorrowRequest);
				}
			});
		}
	});
}

function updatePart(res,req,innerPara,toLendMessage){
	toLendMessage.Message=sanitizer.sanitize(req.body.Message);
	toLendMessage.MoneyToLend=sanitizer.sanitize(req.body.MoneyToLend);
	toLendMessage.InterestRate=sanitizer.sanitize(req.body.InterestRate);
	toLendMessage.MonthPeriod=sanitizer.sanitize(req.body.MonthPeriod);
	toLendMessage.Updated = Date.now();
	
	toLendMessage.save(function (err,newUpdate) {
		if (err){
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('更新失敗!'));
		}else{
			res.redirect('/story?id='+req.body.FromBorrowRequest);
		}
	});
}

router.post('/create', ensureAuthenticated, function(req, res, next) {
	samePart(res,req,createPart,null);
});

router.post('/update', ensureAuthenticated, function(req, res, next) {
	ToLendMessages.findById(req.body._id).exec(function (err, toLendMessage){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			if(!toLendMessage){
				res.redirect('/message?content='+chineseEncodeToURI('未找到更新目標!'));
			}else{
				if(toLendMessage.CreatedBy!=req.user._id){
					res.redirect('/message?content='+chineseEncodeToURI('認證錯誤!'));
				}else{
					samePart(res,req,updatePart,toLendMessage);	
				}
			}
		}
	});
});

router.post('/destroy', ensureAuthenticated, function(req, res, next) {
	ToLendMessages.findById(req.body._id).exec(function (err, toLendMessage){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			if(!toLendMessage){
				res.redirect('/message?content='+chineseEncodeToURI('未找到刪除目標!'));
			}else{
				if(toLendMessage.CreatedBy!=req.user._id){
					res.redirect('/message?content='+chineseEncodeToURI('認證錯誤!'));
				}else{
					toLendMessage.remove(function (err,removedItem) {
						if (err){
							console.log(err);
							res.redirect('/message?content='+chineseEncodeToURI('刪除失敗!'));
						}else{
							res.redirect('/story?id='+req.body.FromBorrowRequest);
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
