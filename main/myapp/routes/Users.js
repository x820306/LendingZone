var mongoose = require('mongoose');
var Users  = mongoose.model('Users');
var Borrows  = mongoose.model('Borrows');
var Returns  = mongoose.model('Returns');
var Messages  = mongoose.model('Messages');
var Transactions  = mongoose.model('Transactions');
var BankAccounts  = mongoose.model('BankAccounts');
var sanitizer = require('sanitizer'); 
var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'x820306test@gmail.com',
        pass: 'github111'
    }
});

var express = require('express');
var router = express.Router();

router.post('/createTest', function(req, res, next) {
	var temp=sanitizer.sanitize(req.body.Username);
	Users.findOne({Username:temp}).exec(function (err, user){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤'));
		}else{
			if(user){
				res.redirect('/message?content='+chineseEncodeToURI('此帳號已存在!'));
			}else{
				var toCreate = new Users();
				toCreate.Username=sanitizer.sanitize(req.body.Username);
				toCreate.Password=sanitizer.sanitize(req.body.Password);
				toCreate.Name=sanitizer.sanitize(req.body.Name);
				toCreate.Email=sanitizer.sanitize(req.body.Email);
				toCreate.Gender=sanitizer.sanitize(req.body.Gender);
				toCreate.BirthDay=sanitizer.sanitize(req.body.BirthDay);
				toCreate.IdCardNumber=sanitizer.sanitize(req.body.IdCardNumber);
				toCreate.Phone=sanitizer.sanitize(req.body.Phone);
				toCreate.Address=sanitizer.sanitize(req.body.Address);
				
				toCreate.IdCardType=req.files.IdCard.mimetype;
				toCreate.SecondCardType=req.files.SecondCard.mimetype;
				toCreate.IdCard=req.files.IdCard.buffer;
				toCreate.SecondCard=req.files.SecondCard.buffer;
				
				toCreate.save(function (err,newCreate) {
					if (err){
						console.log(err);
						res.redirect('/message?content='+chineseEncodeToURI('錯誤'));
					}else{
						var toCreateInner = new BankAccounts();
						toCreateInner.BankAccountNumber=sanitizer.sanitize(req.body.BankAccountNumber);
						toCreateInner.BankAccountPassword=sanitizer.sanitize(req.body.BankAccountPassword);
						toCreateInner.MoneyInBankAccount=sanitizer.sanitize(req.body.MoneyInBankAccount);
						toCreateInner.OwnedBy=newCreate._id;
				
						toCreateInner.save(function (err,newCreateInner) {
							if (err){
								console.log(err);
								res.redirect('/message?content='+chineseEncodeToURI('錯誤'));
							}else{
								res.redirect('/message?content='+chineseEncodeToURI('帳號建立成功'));
							}
						});
					}
				});
			}
		}
	});
});

router.get('/find/:id?', function(req, res, next) {
	Users.findById(req.query.id).exec(function (err, user){
		if (err) {
			console.log(err);
			res.json({error: err.name}, 500);
		}else{
			if(!user){
				res.redirect('/');
			}else{
				res.json(user);
			}
		}
	});
});

router.get('/IdCard/:id?', function(req, res, next) {
	Users.findById(req.query.id).exec(function (err, user){
		if (err) {
			console.log(err);
			res.json({error: err.name}, 500);
		}else{
			res.setHeader('content-type', user.IdCardType);
			res.end(user.IdCard, "binary");
		}
	});
});

router.get('/SecondCard/:id?', function(req, res, next) {
	Users.findById(req.query.id).exec(function (err, user){
		if (err) {
			console.log(err);
			res.json({error: err.name}, 500);
		}else{
			res.setHeader('content-type', user.SecondCardType);
			res.end(user.SecondCard, "binary");
		}
	});
});

router.post('/levelSetter', function(req, res, next) {
	Uid=sanitizer.sanitize(req.body.Uid);
	Level=sanitizer.sanitize(req.body.Level);
	
	userLevelSetter(res,Uid,Level);
	//for setting user's level
	
	/*Returns.update({}, { ServiceChargeNotPaid:0},{multi:true}, function(err, numberAffected){  
		console.log(numberAffected);
		res.end('end');
	});*/
	//for adding a new field into existed documents 
});

router.post('/forgetPW', function(req, res, next) {
	var temp=sanitizer.sanitize(req.body.Username);
	if(temp==''){
		res.json({response:'請輸入帳號供查詢'});
	}else{
		Users.findOne({Username:temp}).exec(function (err, user){
			if (err) {
				console.log(err);
				res.json({response:'錯誤'});
			}else{
				if(!user){
					res.json({response:'無法找到對應帳號'});
				}else{
					var mailOptions = {
						from: 'x820306test ', // sender address
						to: user.Email, // list of receivers
						subject: '您於Lending Zone忘記的密碼', // Subject line
						text: user.Password, // plaintext body
						html: user.Password // html body
					};
					
					transporter.sendMail(mailOptions, function(error, info){
						if(error){
							console.log(error);
							res.json({response:'電子郵件發送失敗'});
						}else{
							res.json({response:'您的密碼已發送至您的信箱，請前往確認，謝謝!'});
						}
					});
				}
			}
		});
	}
});

module.exports = router;

function userLevelSetter(res,uid,newLevel){
	Users.update({_id:uid},{$set:{Level:newLevel}},function(err){
		if(!err){
			Borrows.update({CreatedBy:uid},{$set:{Level:newLevel}}, { multi: true },function(err){
				if(!err){
					Messages.update({$or:[{$and:[{CreatedBy:uid},{Type:"toBorrow"}]},{$and:[{SendTo:uid},{Type:"toLend"}]}]},{$set:{Level:newLevel}}, { multi: true },function(err){
						if(!err){
							Transactions.update({Borrower:uid},{$set:{Level:newLevel}}, { multi: true },function(err){
								if(!err){
									Returns.update({Borrower:uid},{$set:{Level:newLevel}}, { multi: true },function(err){
										if(!err){
											res.end('success!');
										}else{
											console.log(err);
											res.end('error!');
										}
									});
								}else{
									console.log(err);
									res.end('error!');
								}
							});
						}else{
							console.log(err);
							res.end('error!');
						}
					});
				}else{
					console.log(err);
					res.end('error!');
				}
			});
		}else{
			console.log(err);
			res.end('error!');
		}
	});
}

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(null); }
	res.redirect('/message?content='+chineseEncodeToURI('請登入'));
}

function ensureAdmin(req, res, next) {
  var objID=mongoose.Types.ObjectId('5555251bb08002f0068fd00f');//管理員ID
  if(req.user._id==objID){ return next(null); }
	res.redirect('/message?content='+chineseEncodeToURI('請以管理員身分登入'));
}

function chineseEncodeToURI(string){
	return encodeURIComponent(string);
}
