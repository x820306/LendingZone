var library=require( './library.js' );
var mongoose = require('mongoose');
var Users  = mongoose.model('Users');
var Borrows  = mongoose.model('Borrows');
var Returns  = mongoose.model('Returns');
var Messages  = mongoose.model('Messages');
var Transactions  = mongoose.model('Transactions');
var BankAccounts  = mongoose.model('BankAccounts');
var crypto = require('crypto');
var sanitizer = require('sanitizer'); 
var nodemailer = require('nodemailer');
var generator = require('xoauth2').createXOAuth2Generator({
    user: 'lendingzonesystem@gmail.com',
    clientId: '1064408122186-fheebavu1le96q0h0assuueda5kmb0nk.apps.googleusercontent.com',
    clientSecret: '8b9UNKvg4IZZsM7vsLI8e3JP',
    refreshToken: '1/0wqk7whxhYyMKKB81KBTmJDTioc9VnDxJu2hd4v9Bas'
});
generator.on('token', function(token){
    console.log('New token for %s: %s', token.user, token.accessToken);
});
var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        xoauth2: generator
    }
});

var express = require('express');
var router = express.Router();

router.post('/createTest', function(req, res, next) {
	var temp=sanitizer.sanitize(req.body.Username.trim());
	Users.findOne({Username:temp}).exec(function (err, user){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤'));
		}else{
			if(user){
				res.redirect('/message?content='+encodeURIComponent('此帳號已存在!'));
			}else{
				var toCreate = new Users();
				toCreate.Username=sanitizer.sanitize(req.body.Username.trim());
				toCreate.Password=sanitizer.sanitize(req.body.Password.trim());
				toCreate.Name=sanitizer.sanitize(req.body.Name.trim());
				toCreate.Email=sanitizer.sanitize(req.body.Email.trim());
				toCreate.Gender=sanitizer.sanitize(req.body.Gender.trim());
				toCreate.BirthDay=sanitizer.sanitize(req.body.BirthDay.trim());
				toCreate.IdCardNumber=sanitizer.sanitize(req.body.IdCardNumber.trim());
				toCreate.Phone=sanitizer.sanitize(req.body.Phone.trim());
				toCreate.Address=sanitizer.sanitize(req.body.Address.trim());
				
				toCreate.IdCardType=req.files.IdCard.mimetype;
				toCreate.SecondCardType=req.files.SecondCard.mimetype;
				toCreate.IdCard=req.files.IdCard.buffer;
				toCreate.SecondCard=req.files.SecondCard.buffer;
				
				toCreate.save(function (err,newCreate) {
					if (err){
						console.log(err);
						res.redirect('/message?content='+encodeURIComponent('錯誤'));
					}else{
						var toCreateInner = new BankAccounts();
						toCreateInner.BankAccountNumber=sanitizer.sanitize(req.body.BankAccountNumber.trim());
						toCreateInner.BankAccountPassword=sanitizer.sanitize(req.body.BankAccountPassword.trim());
						toCreateInner.MoneyInBankAccount=sanitizer.sanitize(req.body.MoneyInBankAccount.trim());
						toCreateInner.OwnedBy=newCreate._id;
				
						toCreateInner.save(function (err,newCreateInner) {
							if (err){
								console.log(err);
								res.redirect('/message?content='+encodeURIComponent('錯誤'));
							}else{
								res.redirect('/message?content='+encodeURIComponent('帳號建立成功'));
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
	if(typeof(req.query.id) !== "undefined"){
		Users.findById(req.query.id).exec(function (err, user){
			if (err) {
				console.log(err);
				res.json({error: err.name}, 500);
			}else{
				if(user){
					res.setHeader('content-type', user.IdCardType);
					res.end(user.IdCard, "binary");
				}else{
					res.redirect('/');
				}
			}
		});
	}else{
		res.redirect('/');
	}
});

router.get('/SecondCard/:id?', function(req, res, next) {
	if(typeof(req.query.id) !== "undefined"){
		Users.findById(req.query.id).exec(function (err, user){
			if (err) {
				console.log(err);
				res.json({error: err.name}, 500);
			}else{
				if(user){
					res.setHeader('content-type', user.SecondCardType);
					res.end(user.SecondCard, "binary");
				}else{
					res.redirect('/');
				}
			}
		});
	}else{
		res.redirect('/');
	}
});

router.post('/levelSetter', function(req, res, next) {
	Uid=sanitizer.sanitize(req.body.Uid.trim());
	Level=sanitizer.sanitize(req.body.Level.trim());
	
	userLevelSetter(res,Uid,Level);
	//for setting user's level
	
	/*Transactions.update({}, { InsuranceFeePaid:0},{multi:true}, function(err, numberAffected){  
		console.log(numberAffected);
		res.end('end');
	});*/
	//for adding a new field into existed documents 
});

router.post('/changePassword', function(req, res, next) {
	Username=sanitizer.sanitize(req.body.Username.trim());
	Password=sanitizer.sanitize(req.body.Password.trim());
	
	Users.findOne({"Username": Username}).exec(function (err, user){
			if (err) {
				console.log(err);
				res.end('error!');
			}else{
				if(!user){
					res.end('error!');
				}else{
					user.Password=Password;
					user.save(function (err,newUpdated){
						if (err){
							console.log(err);
							res.end('error!');
						}else{
							res.end('success!');
						}
					});
				}
			}
	});
});

router.post('/forgetPW', function(req, res, next) {
	var temp=sanitizer.sanitize(req.body.Username.trim());
	if(temp==''){
		res.json({response:'請輸入帳號供查詢'});
	}else{
		crypto.randomBytes(20, function(err, buf) {
			if(err){
				console.log(err);
				res.json({response:'錯誤'});
			}else{
				var token = buf.toString('hex');
				Users.findOne({Username:temp}).exec(function (err, user){
					if (err) {
						console.log(err);
						res.json({response:'錯誤'});
					}else{
						if(!user){
							res.json({response:'無法找到對應帳號'});
						}else{
							user.resetPasswordToken = token;
							user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
							user.save(function(err,newUpdated) {
								if(err){
									res.json({response:'錯誤'});
								}else{
									var mailOptions = {
										from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
										to: newUpdated.Username+' <'+newUpdated.Email+'>', // list of receivers
										subject: '重設您於Lending Zone忘記的密碼', // Subject line
										text: '點擊以下連結重設您在LendingZone的密碼：'+String.fromCharCode(10)+String.fromCharCode(10)+'"http://'+req.headers.host+'/Users/resetPWpage?token='+token+'"', // plaintext body
										html: '點擊以下連結重設您在LendingZone的密碼：<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="http://'+req.headers.host+'/Users/resetPWpage?token='+token+'" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往重設</span></a></td></tr></table>'
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
							});
						}
					}
				});
			}
		});
	}
});

router.get('/resetPWpage/:token?', library.newMsgChecker, function(req, res, next) {
	if(typeof(req.query.token) !== "undefined"){
		var auRst=null;
		if(req.isAuthenticated()){
			auRst=req.user.Username;
		}
		Users.findOne({ resetPasswordToken: req.query.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
			if(err){
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}else{
				if (!user) {
					res.redirect('/message?content='+encodeURIComponent('token過期或無效！!'));
				}else{
					res.render('resetPWpage',{newlrmNum: req.newlrmNumber,newlsmNum: req.newlsmNumber,userName: auRst,tk:req.query.token});
				}
			}
		});
	}else{
		res.redirect('/');
	}
});

router.post('/resetPW', function(req, res, next) {
	Users.findOne({ resetPasswordToken: sanitizer.sanitize(req.body.Token.trim()), resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
		if(err){
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			if (!user) {
				res.redirect('/message?content='+encodeURIComponent('token過期或無效！!'));
			}else{
				if(sanitizer.sanitize(req.body.Password.trim())!=''){
					user.Password = sanitizer.sanitize(req.body.Password.trim());;
					user.resetPasswordToken = undefined;
					user.resetPasswordExpires = undefined;
					user.save(function (err,newUpdated){
						if (err){
							console.log(err);
							res.redirect('/message?content='+encodeURIComponent('錯誤!'));
						}else{
							res.redirect('/message?content='+encodeURIComponent('您的密碼已重設成功!'));
						}
					});
				}else{
					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
				}
			}
		}
	});
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

