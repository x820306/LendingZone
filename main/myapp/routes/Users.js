var library=require( './library.js' );
var mongoose = require('mongoose');
var Users  = mongoose.model('Users');
var Borrows  = mongoose.model('Borrows');
var Returns  = mongoose.model('Returns');
var Messages  = mongoose.model('Messages');
var Transactions  = mongoose.model('Transactions');
var BankAccounts  = mongoose.model('BankAccounts');
var crypto = require('crypto');
var base32 = require('thirty-two');
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
	if((typeof(req.body.Username) === 'string')&&(typeof(req.body.Password) === 'string')&&(typeof(req.body.Name) === 'string')&&(typeof(req.body.Email) === 'string')&&(typeof(req.body.Gender) === 'string')&&(typeof(req.body.BirthDay) === 'string')&&(typeof(req.body.IdCardNumber) === 'string')&&(typeof(req.body.Phone) === 'string')&&(typeof(req.body.Address) === 'string')&&(typeof(req.body.BankAccountNumber) === 'string')&&(typeof(req.body.BankAccountPassword) === 'string')&&(typeof(req.body.MoneyInBankAccount) === 'string')){
		req.body.Username=sanitizer.sanitize(req.body.Username.trim());
		req.body.Password=sanitizer.sanitize(req.body.Password.trim());
		req.body.Name=sanitizer.sanitize(req.body.Name.trim());
		req.body.Email=sanitizer.sanitize(req.body.Email.trim());
		req.body.Gender=sanitizer.sanitize(req.body.Gender.trim());
		req.body.BirthDay=sanitizer.sanitize(req.body.BirthDay.trim());
		req.body.IdCardNumber=sanitizer.sanitize(req.body.IdCardNumber.trim());
		req.body.Phone=sanitizer.sanitize(req.body.Phone.trim());
		req.body.Address=sanitizer.sanitize(req.body.Address.trim());
		req.body.BankAccountNumber=sanitizer.sanitize(req.body.BankAccountNumber.trim());
		req.body.BankAccountPassword=sanitizer.sanitize(req.body.BankAccountPassword.trim());
		req.body.MoneyInBankAccount=sanitizer.sanitize(req.body.MoneyInBankAccount.trim());

		Users.findOne({Usnl:req.body.Username.toLowerCase()}).exec(function (err, user){
			if (err) {
				console.log(err);
				res.redirect('/message?content='+encodeURIComponent('錯誤'));
			}else{
				if(user){
					res.redirect('/message?content='+encodeURIComponent('此帳號已存在!'));
				}else{
					var toCreate = new Users();
					toCreate.Username=req.body.Username;
					toCreate.Usnl=req.body.Username.toLowerCase();
					toCreate.Password=req.body.Password;
					toCreate.Name=req.body.Name;
					toCreate.Email=req.body.Email;
					toCreate.Gender=req.body.Gender;
					toCreate.BirthDay=req.body.BirthDay;
					toCreate.IdCardNumber=req.body.IdCardNumber;
					toCreate.Phone=req.body.Phone;
					toCreate.Address=req.body.Address;
					
					toCreate.save(function (err,newCreate) {
						if (err){
							console.log(err);
							res.redirect('/message?content='+encodeURIComponent('錯誤'));
						}else{
							var toCreateInner = new BankAccounts();
							toCreateInner.BankAccountNumber=req.body.BankAccountNumber;
							toCreateInner.BankAccountPassword=req.body.BankAccountPassword;
							toCreateInner.MoneyInBankAccount=req.body.MoneyInBankAccount;
							toCreateInner.OwnedBy=newCreate._id;
					
							toCreateInner.save(function (err,newCreateInner) {
								if (err){
									console.log(err);
									res.redirect('/message?content='+encodeURIComponent('錯誤'));
								}else{
									var filesArray=[];
									
									if((req.files.IdCard)&&(req.files.SecondCard)){
										req.files.IdCard.flag=true;
										req.files.IdCard.category='IdCard';
										filesArray.push(req.files.IdCard);
									
										req.files.SecondCard.flag=true;
										req.files.SecondCard.category='SecondCard';
										filesArray.push(req.files.SecondCard);
										
										library.gridCreator(newCreate._id,filesArray,function(){
											res.redirect('/message?content='+encodeURIComponent('帳號建立成功'));
										},function(){
											res.redirect('/message?content='+encodeURIComponent('檔案新建失敗'));
										});
									}else{
										res.redirect('/message?content='+encodeURIComponent('錯誤!'));
									}
								}
							});
						}
					});
				}
			}
		});
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/destroyTest', function(req, res, next) {
	if(typeof(req.body.UserID) === 'string'){
		req.body.UserID=sanitizer.sanitize(req.body.UserID.trim());
		if(mongoose.Types.ObjectId.isValid(req.body.UserID)){
			var uid=mongoose.Types.ObjectId(req.body.UserID);
			library.userDeleter(res,uid,function(){},function(){res.end('error');},false);
		}else{
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/destoryImages', function(req, res, next) {
	if(typeof(req.body.ImagesOwnerID) === 'string'){
		req.body.ImagesOwnerID=sanitizer.sanitize(req.body.ImagesOwnerID.trim());
		if(mongoose.Types.ObjectId.isValid(req.body.ImagesOwnerID)){
			var ImagesOwnerID=mongoose.Types.ObjectId(req.body.ImagesOwnerID);
			var filesArray=[];
			var IdCard={
				flag:true,
				category:'IdCard'
			};
			var SecondCard={
				flag:true,
				category:'SecondCard'
			};
			filesArray.push(IdCard);
			filesArray.push(SecondCard);
			
			library.gridDeletor(ImagesOwnerID,filesArray,function(){
				res.end('success');
			},function(){
				res.end('fail');
			});
		}else{
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.get('/enableTotp',library.loginFormChecker,library.ensureAuthenticated,library.newMsgChecker, function(req, res, next) {
	if(req.user.keyObj.flag==true){
		var encodedKey = base32.encode(req.user.keyObj.key);
      
		var otpUrl = 'otpauth://totp/'+req.user.Username+'_at_lendingZone?secret=' + encodedKey + '&period=' + req.user.keyObj.period;
		var qrImage = 'https://chart.googleapis.com/chart?chs=166x166&chld=L|0&cht=qr&chl=' + encodeURIComponent(otpUrl);
		  
		res.render('enableTotp', {maxAge:req.session.cookie.maxAge,lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username, key: encodedKey, qrImage: qrImage, content:'' });
	}else{
		var key = library.randomKey(10);
		var encodedKey = base32.encode(key);
      
		var otpUrl = 'otpauth://totp/'+req.user.Username+'_at_lendingZone?secret=' + encodedKey + '&period=30';
		var qrImage = 'https://chart.googleapis.com/chart?chs=166x166&chld=L|0&cht=qr&chl=' + encodeURIComponent(otpUrl);
		Users.findById(req.user._id).exec(function (err, foundUser){
			if (err) {
				console.log(err);
				res.redirect('/message?content='+encodeURIComponent('錯誤'));
			}else{
				if(!foundUser){
					res.redirect('/message?content='+encodeURIComponent('錯誤'));
				}else{
					foundUser.keyObj.flag=true;
					foundUser.keyObj.key=key;
					foundUser.keyObj.period=30;
					foundUser.save(function (err,newUpdated){
						if (err){
							console.log(err);
							res.redirect('/message?content='+encodeURIComponent('錯誤'));
						}else{
							if(req.session.hasOwnProperty('totpRemember')){
								delete req.session.totpRemember;
							}
							req.session.secondFactor = 'totp';
							req.session.save(function(err){
								if(err){
									console.log(err);
									res.redirect('/message?content='+encodeURIComponent('錯誤!'));
								}else{
									res.render('enableTotp', {maxAge:req.session.cookie.maxAge,lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username, key: encodedKey, qrImage: qrImage, content:'<h4 class="red">您已啟用兩階段驗證</h4><br>' });
								}
							});
						}
					});
				}
			}
		});
	}
});

router.get('/disableTotp',library.loginFormChecker,library.ensureAuthenticated,library.newMsgChecker, function(req, res, next) {
	if(req.user.keyObj.flag==true){
		Users.findById(req.user._id).exec(function (err, foundUser){
			if (err) {
				console.log(err);
				res.redirect('/message?content='+encodeURIComponent('錯誤'));
			}else{
				if(!foundUser){
					res.redirect('/message?content='+encodeURIComponent('錯誤'));
				}else{
					foundUser.keyObj.flag=false;
					foundUser.keyObj.key='';
					foundUser.keyObj.period=-1;
					foundUser.save(function (err,newUpdated){
						if (err){
							console.log(err);
							res.redirect('/message?content='+encodeURIComponent('錯誤'));
						}else{
							if(req.session.hasOwnProperty('totpRemember')){
								delete req.session.totpRemember;
							}
							if(req.session.hasOwnProperty('secondFactor')){
								delete req.session.secondFactor;
							}
							req.flash('disableTOTP','您已停用兩階段驗證');
							req.session.save(function(err){
								if(err){
									console.log(err);
									res.redirect('/message?content='+encodeURIComponent('錯誤!'));
								}else{
									res.redirect('/signup/profile');
								}
							});
						}
					});
				}
			}
		});
	}else{
		res.redirect('/signup/profile');
	}
});

router.get('/IdCard/:id?',library.loginFormChecker,library.ensureAuthenticated,library.newMsgChecker, function(req, res, next) {
	if(typeof(req.query.id) === 'string'){
		if(mongoose.Types.ObjectId.isValid(req.query.id)){
			var uid=mongoose.Types.ObjectId(req.query.id);
			library.gridResponser(uid,'IdCard',req,res);
		}else{
			res.redirect('/images/icon.png');
		}
	}else{
		res.redirect('/images/icon.png');
	}
});

router.get('/SecondCard/:id?',library.loginFormChecker,library.ensureAuthenticated,library.newMsgChecker, function(req, res, next) {
	if(typeof(req.query.id) === 'string'){
		if(mongoose.Types.ObjectId.isValid(req.query.id)){
			var uid=mongoose.Types.ObjectId(req.query.id);
			library.gridResponser(uid,'SecondCard',req,res);
		}else{
			res.redirect('/images/icon.png');
		}
	}else{
		res.redirect('/images/icon.png');
	}
});

router.post('/originalLevelSetter', function(req, res, next) {
	if((typeof(req.body.Uid) === 'string')&&(typeof(req.body.OriginalLevel) === 'string')){
		req.body.Uid=sanitizer.sanitize(req.body.Uid.trim());
		req.body.OriginalLevel=sanitizer.sanitize(req.body.OriginalLevel.trim());
		if(mongoose.Types.ObjectId.isValid(req.body.Uid)){
			var Uid=mongoose.Types.ObjectId(req.body.Uid);
			var OriginalLevel=req.body.OriginalLevel;
			
			library.userOriginalLevelSetter(Uid,OriginalLevel,function(){
				res.end('success!');
			},function(){
				res.end('error!');
			});
		}else{
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
	//for setting user's level
	
	/*Borrows.update({}, { MonthPeriodAcceptedLowest:4},{multi:true}, function(err, numberAffected){  
		console.log(numberAffected);
		res.end('end');
	});*/
	
	/*Users.update({},{$unset: {SecondCardType: 1 }},{multi:true}, function(err, numberAffected){  
		console.log(numberAffected);
		res.end('end');
	});*/
	//for adding a new field into existed documents 
});

router.post('/changePassword', function(req, res, next) {
	if((typeof(req.body.Username) === 'string')&&(typeof(req.body.Password) === 'string')){
		req.body.Username=sanitizer.sanitize(req.body.Username.trim());
		req.body.Password=sanitizer.sanitize(req.body.Password.trim());
		
		var Username=req.body.Username;
		var Password=req.body.Password;
		
		Users.findOne({Usnl: Username.toLowerCase()}).exec(function (err, user){
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
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/forgetPW', function(req, res, next) {
	if(typeof(req.body.Username) === 'string'){
		req.body.Username=sanitizer.sanitize(req.body.Username.trim());
		if(req.body.Username===''){
			res.json({response:'請輸入帳號供查詢'});
		}else{
			crypto.randomBytes(20, function(err, buf) {
				if(err){
					console.log(err);
					res.json({response:'錯誤'});
				}else{
					var token = buf.toString('hex');
					Users.findOne({Usnl:req.body.Username.toLowerCase()}).exec(function (err, user){
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
											text: '點擊以下連結重設您在LendingZone的密碼：'+String.fromCharCode(10)+String.fromCharCode(10)+'"'+req.protocol+'://'+req.headers.host+'/Users/resetPWpage?token='+token+'"', // plaintext body
											html: '點擊以下連結重設您在LendingZone的密碼：<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="'+req.protocol+'://'+req.headers.host+'/Users/resetPWpage?token='+token+'" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往重設</span></a></td></tr></table>'
										};
										
										transporter.sendMail(mailOptions, function(error, info){
											if(error){
												console.log(error);
												res.json({response:'電子郵件發送失敗'});
											}else{
												res.json({response:'您的重設密碼連結已發送至您的信箱：<br>'+newUpdated.Email+'<br>請前往確認，謝謝!'});
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
	}else{
		res.json({response:'failed!'});
	}
});

router.post('/forgetAct', function(req, res, next) {
	if(typeof(req.body.IdCardNumber) === 'string'){
		req.body.IdCardNumber=sanitizer.sanitize(req.body.IdCardNumber.trim());
		if(req.body.IdCardNumber===''){
			res.json({response:'請輸入身分證字號供查詢'});
		}else{
			Users.findOne({IdCardNumber: req.body.IdCardNumber.toUpperCase()}).exec(function (err, user){
				if (err) {
					console.log(err);
					res.json({response:'錯誤'});
				}else{
					if(!user){
						res.json({response:'無法找到對應身分證字號'});
					}else{
						var mailOptions = {
							from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
							to: user.Username+' <'+user.Email+'>', // list of receivers
							subject: '您於Lending Zone忘記的帳號', // Subject line
							text: '您於Lending Zone忘記的帳號為：'+String.fromCharCode(10)+String.fromCharCode(10)+user.Username+String.fromCharCode(10)+String.fromCharCode(10)+'前往Lending Zone("'+req.protocol+'://'+req.headers.host+'")', // plaintext body
							html: '您於Lending Zone忘記的帳號為：<br><br><span style="color:red;">'+user.Username+'</span><br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="'+req.protocol+'://'+req.headers.host+'" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">前往Lending Zone</span></a></td></tr></table>'
						};
						
						transporter.sendMail(mailOptions, function(error, info){
							if(error){
								console.log(error);
								res.json({response:'電子郵件發送失敗'});
							}else{
								res.json({response:'您的帳號已發送至您的信箱：<br>'+user.Email+'<br>請前往確認，謝謝!'});
							}
						});
					}
				}
			});
		}
	}else{
		res.json({response:'failed!'});
	}
});

router.get('/resetPWpage/:token?',library.loginFormChecker, library.newMsgChecker,library.usrNameGenerator, function(req, res, next) {
	if(typeof(req.query.token) === 'string'){
		var stringArrayFlash=req.flash('backerReset');
		var formJson=null;
		if(stringArrayFlash.length>0){
			formJson=JSON.parse(stringArrayFlash[0]);
		}
		Users.findOne({ resetPasswordToken: req.query.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
			if(err){
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}else{
				if (!user) {
					res.redirect('/message?content='+encodeURIComponent('token過期或無效!'));
				}else{
					req.session.save(function(err){
						if(err){
							console.log(err);
							res.redirect('/message?content='+encodeURIComponent('錯誤!'));
						}else{
							res.render('resetPWpage',{maxAge:req.session.cookie.maxAge,lgfJSON:req.loginFormJson,newlrmNum: req.newlrmNumber,newlsmNum: req.newlsmNumber,userName: req.auRst,tk:req.query.token,fJSON:formJson});
						}
					});
				}
			}
		});
	}else{
		res.redirect('/');
	}
});

router.post('/resetPW', function(req, res, next) {
	if((typeof(req.body.Token) === 'string')&&(typeof(req.body.Password) === 'string')&&(typeof(req.body.Password2nd) === 'string')){
		req.body.Token=sanitizer.sanitize(req.body.Token.trim());
		req.body.Password=sanitizer.sanitize(req.body.Password.trim());
		req.body.Password2nd=sanitizer.sanitize(req.body.Password2nd.trim());
		
		Users.findOne({ resetPasswordToken: req.body.Token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
			if(err){
				console.log(err);
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}else{
				if (!user) {
					res.redirect('/message?content='+encodeURIComponent('token過期或無效!'));
				}else{
					if((req.body.Password!=='')&&(req.body.Password2nd!=='')){
						if(req.body.Password===req.body.Password2nd){
							if((req.body.Password.search(/[^\w]/ig)===-1)&&(req.body.Password.length>6)){
								user.Password = req.body.Password;
								user.Updated=Date.now();
								user.resetPasswordToken = undefined;
								user.resetPasswordExpires = undefined;
								user.save(function (err,newUpdated){
									if (err){
										console.log(err);
										res.redirect('/message?content='+encodeURIComponent('錯誤!'));
									}else{
										pwChangedMail(newUpdated);
										res.redirect('/message?content='+encodeURIComponent('您的密碼已重設成功!'));
									}
								});
							}else{
								//res.redirect('/message?content='+encodeURIComponent('新密碼格式不合規定!'));
								backerReset(req,res)
							}
						}else{
							//res.redirect('/message?content='+encodeURIComponent('兩次密碼輸入不一致!'));
							backerReset(req,res)
						}
					}else{
						//res.redirect('/message?content='+encodeURIComponent('必填欄位未填!'));
						backerReset(req,res)
					}
				}
			}
		});
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/changePW',library.loginFormChecker,library.ensureAuthenticated,function(req, res, next) {
	if((typeof(req.body.Password) === 'string')&&(typeof(req.body.Password2nd) === 'string')&&(typeof(req.body.OldPassword) === 'string')){
		req.body.Password=sanitizer.sanitize(req.body.Password.trim());
		req.body.Password2nd=sanitizer.sanitize(req.body.Password2nd.trim());
		req.body.OldPassword=sanitizer.sanitize(req.body.OldPassword.trim());
		
		Users.findById(req.user._id).exec(function (err, user){
			if(err){
				console.log(err);
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}else{
				if (!user) {
					res.redirect('/message?content='+encodeURIComponent('認證錯誤'));
				}else{
					if((req.body.Password!=='')&&(req.body.Password2nd!=='')&&(req.body.OldPassword!=='')){
						user.comparePassword(req.body.OldPassword, function(err, isMatch) {
							if(err){
								res.redirect('/message?content='+encodeURIComponent('錯誤!'));
							}else{
								if(!isMatch){
									//res.redirect('/message?content='+encodeURIComponent('舊密碼輸入錯誤!'));
									backerChange(req,res);
								}else{
									if(req.body.Password===req.body.Password2nd){
										if((req.body.Password.search(/[^\w]/ig)===-1)&&(req.body.Password.length>6)){
											user.Password = req.body.Password;
											user.Updated=Date.now();
											user.save(function (err,newUpdated){
												if (err){
													console.log(err);
													res.redirect('/message?content='+encodeURIComponent('錯誤!'));
												}else{
													pwChangedMail(newUpdated);
													res.redirect('/message?content='+encodeURIComponent('您的密碼已變更成功!'));
												}
											});
										}else{
											//res.redirect('/message?content='+encodeURIComponent('新密碼格式不合規定!'));
											backerChange(req,res);
										}
									}else{
										//res.redirect('/message?content='+encodeURIComponent('兩次密碼輸入不一致!'));
										backerChange(req,res);
									}
								}
							}
						});
					}else{
						//res.redirect('/message?content='+encodeURIComponent('必填欄位未填!'));
						backerChange(req,res);
					}
				}
			}
		});
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/changeUsername',library.loginFormChecker,library.ensureAuthenticated,function(req, res, next) {
	if((typeof(req.body.Username) === 'string')&&(typeof(req.body.OldPassword) === 'string')){
		req.body.Username=sanitizer.sanitize(req.body.Username.trim());
		req.body.OldPassword=sanitizer.sanitize(req.body.OldPassword.trim());
		
		Users.findById(req.user._id).exec(function (err, user){
			if(err){
				console.log(err);
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}else{
				if (!user) {
					res.redirect('/message?content='+encodeURIComponent('認證錯誤'));
				}else{
					if((req.body.Username!=='')&&(req.body.OldPassword!=='')){
						user.comparePassword(req.body.OldPassword, function(err, isMatch) {
							if(err){
								res.redirect('/message?content='+encodeURIComponent('錯誤!'));
							}else{
								if(!isMatch){
									//res.redirect('/message?content='+encodeURIComponent('密碼輸入錯誤!'));
									backerChangeUsername(req,res);
								}else{
									Users.findOne({Usnl:req.body.Username.toLowerCase()}).exec(function (err, userFound){
										if (err) {
											console.log(err);
											res.redirect('/message?content='+encodeURIComponent('錯誤'));
										}else{
											if(userFound){
												//res.redirect('/message?content='+encodeURIComponent('此帳號已存在!'));
												backerChangeUsername(req,res);
											}else{
												user.Username = req.body.Username;
												user.Usnl=req.body.Username.toLowerCase();
												user.Updated=Date.now();
												user.save(function (err,newUpdated){
													if (err){
														console.log(err);
														res.redirect('/message?content='+encodeURIComponent('錯誤!'));
													}else{
														accChangedMail(newUpdated);
														res.redirect('/message?content='+encodeURIComponent('您的帳號名稱已變更成功!'));
													}
												});
											}
										}
									});
								}
							}
						});
					}else{
						//res.redirect('/message?content='+encodeURIComponent('必填欄位未填!'));
						backerChangeUsername(req,res);
					}
				}
			}
		});
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/ifUsernameExist',function(req, res, next) {
	if(typeof(req.body.Urname) === 'string'){
		req.body.Urname=sanitizer.sanitize(req.body.Urname.trim());
		Users.findOne({Usnl:req.body.Urname.toLowerCase()}).exec(function (err, user){
			if(err){
				console.log(err);
				res.json({error: "錯誤",success:false}, 500);
			}else{
				if(!user) {
					res.json({Valid: true,success:true});
				}else{
					res.json({Valid: false,success:true});
				}
			}
		});
	}else{
		res.json({error: "failed!",success:false}, 500);
	}
});

router.post('/ifOldPWRight',library.loginFormChecker,library.ensureAuthenticated,function(req, res, next) {
	if(typeof(req.body.OldPassword) === 'string'){
		req.body.OldPassword=sanitizer.sanitize(req.body.OldPassword.trim());
		Users.findById(req.user._id).exec(function (err, user){
			if(err){
				console.log(err);
				res.json({error: "錯誤",success:false}, 500);
			}else{
				if(!user){
					res.json({error:"認證錯誤",success:false}, 500);
				}else{
					user.comparePassword(req.body.OldPassword, function(err, isMatch) {
						if(err){
							res.redirect('/message?content='+encodeURIComponent('錯誤!'));
						}else{
							if(!isMatch){
								res.json({Right:false,success:true});
							}else{
								res.json({Right:true,success:true});
							}
						}
					});
				}
			}
		});
	}else{
		res.json({error: "failed!",success:false}, 500);
	}
});

router.get('/confirmMail/:token?',library.loginFormChecker,library.ensureAuthenticated,library.newMsgChecker, function(req, res, next) {
	if(typeof(req.query.token) === 'string'){
		Users.findOne({ mailValidToken: req.query.token, mailValidExpires: { $gt: Date.now() } }, function(err, user) {
			if(err){
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}else{
				if (!user) {
					res.redirect('/message?content='+encodeURIComponent('token過期或無效!'));
				}else{
					if(!user._id.equals(req.user._id)){
						res.redirect('/message?content='+encodeURIComponent('身分驗證錯誤!'));
					}else{
						user.Updated=Date.now();
						user.mailValidToken = undefined;
						user.mailValidExpires = undefined;
						user.ifMailValid=true;
						user.save(function (err,newUpdated){
							if (err){
								console.log(err);
								res.redirect('/message?content='+encodeURIComponent('錯誤!'));
							}else{
								req.flash('sendValidMail','您的E-mail已完成認證：<br><br><span style="color:red;">'+newUpdated.Email+'</span>');
								req.session.save(function(err){
									if(err){
										console.log(err);
										res.redirect('/message?content='+encodeURIComponent('錯誤!'));
									}else{
										res.redirect('/signup/profile');
									}
								});
							}
						});
					}
				}
			}
		});
	}else{
		res.redirect('/');
	}
});

function backerChange(req,res){
	var formContent={
		F1:req.body.OldPassword,
		F2:req.body.Password,
		F3:req.body.Password2nd
	};

	var json={FormContent:formContent};
	var string=JSON.stringify(json);
	req.flash('backerChange',string);
	req.session.save(function(err){
		if(err){
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			res.redirect('/signup/changePWpage');
		}
	});
}

function backerReset(req,res){
	var formContent={
		F1:req.body.Password,
		F2:req.body.Password2nd
	};

	var json={FormContent:formContent};
	var string=JSON.stringify(json);
	req.flash('backerReset',string);
	req.session.save(function(err){
		if(err){
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			res.redirect('/Users/resetPWpage?token='+req.body.Token);
		}
	});
}

function backerChangeUsername(req,res){
	var formContent={
		F1:req.body.OldPassword,
		F2:req.body.Username
	};

	var json={FormContent:formContent};
	var string=JSON.stringify(json);
	req.flash('backerChangeUsername',string);
	req.session.save(function(err){
		if(err){
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			res.redirect('/signup/changeUsernamePage');
		}
	});
}

function pwChangedMail(newUpdated){
	if(newUpdated.ifMailValid){
		var mailOptions = {
			from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
			to: newUpdated.Username+' <'+newUpdated.Email+'>', // list of receivers
			subject: '您於Lending Zone的密碼已經變更', // Subject line
			text: '您於Lending Zone的密碼已經變更', // plaintext body
			html: '您於Lending Zone的密碼已經變更'
		};
		
		transporter.sendMail(mailOptions, function(error, info){
			if(error){
				console.log(error);
			}
		});
	}
}

function accChangedMail(newUpdated){
	if(newUpdated.ifMailValid){
		var mailOptions = {
			from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
			to: newUpdated.Username+' <'+newUpdated.Email+'>', // list of receivers
			subject: '您於Lending Zone的帳號名稱已經變更', // Subject line
			text: '您於Lending Zone的帳號名稱已經變更：'+String.fromCharCode(10)+String.fromCharCode(10)+newUpdated.Username, // plaintext body
			html: '您於Lending Zone的帳號名稱已經變更：<br><br><span style="color:red;">'+newUpdated.Username+'</span>'
		};
		
		transporter.sendMail(mailOptions, function(error, info){
			if(error){
				console.log(error);
			}
		});
	}
}

module.exports = router;