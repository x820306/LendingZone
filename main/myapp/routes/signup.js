var library=require( './library.js' );
var mongoose = require('mongoose');
var Users  = mongoose.model('Users');
var BankAccounts = mongoose.model('BankAccounts');
var sanitizer = require('sanitizer'); 

var express = require('express');
var router = express.Router();
var fs = require('fs');
var uuid = require('node-uuid');

router.get('/totpRemoveDevice',library.loginFormChecker,library.ensureAuthenticated,library.newMsgChecker, function(req, res, next) {
	if(req.session.hasOwnProperty('totpRemember')){
		delete req.session.totpRemember;
		req.flash('totpRememberFlash','您已忘記此設備');
		res.redirect('/signup/profile');
	}else{
		res.redirect('/signup/profile');
	}
});

router.get('/totpAddDevice',library.loginFormChecker,library.ensureAuthenticated,library.newMsgChecker, function(req, res, next) {
	if(!req.session.hasOwnProperty('totpRemember')){
		req.session.totpRemember=true;
		req.flash('totpRememberFlash','您已記住此設備');
		res.redirect('/signup/profile');
	}else{
		res.redirect('/signup/profile');
	}
});

router.get('/profile',library.loginFormChecker,library.ensureAuthenticated,library.newMsgChecker, function (req, res) {
	var stringArrayFlash=req.flash('dataCDForm');
	var dataCDFormJson=null;
	if(stringArrayFlash.length>0){
		dataCDFormJson=JSON.parse(stringArrayFlash[0]);
	}
	
	var stringArrayFlash2=req.flash('sendValidMail');
	var mailValidString=null;
	if(stringArrayFlash2.length>0){
		mailValidString=stringArrayFlash2[0];
	}
	
	var stringArrayFlash3=req.flash('disableTOTP');
	var disableTotpString=null;
	if(stringArrayFlash3.length>0){
		disableTotpString=stringArrayFlash3[0];
	}
	
	var stringArrayFlash4=req.flash('totpRememberFlash');
	var totpRememberFlashString=null;
	if(stringArrayFlash4.length>0){
		totpRememberFlashString=stringArrayFlash4[0];
	}
	
	var totpRbr=false;
	if(req.session.hasOwnProperty('totpRemember')){
		totpRbr=true;
	}
	
	Users.findById(req.user._id).exec(function (err, foundUser){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤'));
		}else{
			if(!foundUser){
				res.redirect('/message?content='+encodeURIComponent('錯誤'));
			}else{
				BankAccounts.findOne({OwnedBy:req.user._id}).exec(function (err, foundAccount){
					if (err) {
						console.log(err);
						res.redirect('/message?content='+encodeURIComponent('錯誤'));
					}else{
						if(!foundAccount){
							res.redirect('/message?content='+encodeURIComponent('錯誤'));
						}else{
							req.session.save(function(err){
								if(err){
									console.log(err);
									res.redirect('/message?content='+encodeURIComponent('錯誤!'));
								}else{
									res.render('profile',{maxAge:req.session.cookie.maxAge,lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,user:foundUser,account:foundAccount,dcdJSON:dataCDFormJson,mvString:mailValidString,dTotpString:disableTotpString,totpRbrFlhString:totpRememberFlashString,totpRemember:totpRbr});
								}
							});
						}
					}
				});
			}
		}
	});
});

router.get('/changePWpage',library.loginFormChecker,library.ensureAuthenticated,library.newMsgChecker, function (req, res) {
	var stringArrayFlash=req.flash('backerChange');
	var formJson=null;
	if(stringArrayFlash.length>0){
		formJson=JSON.parse(stringArrayFlash[0]);
	}
	
	req.session.save(function(err){
		if(err){
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			res.render('changePWpage',{maxAge:req.session.cookie.maxAge,lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,fJSON:formJson});
		}
	});
});

router.get('/changeUsernamePage',library.loginFormChecker,library.ensureAuthenticated,library.newMsgChecker, function (req, res) {
	var stringArrayFlash=req.flash('backerChangeUsername');
	var formJson=null;
	if(stringArrayFlash.length>0){
		formJson=JSON.parse(stringArrayFlash[0]);
	}
	
	req.session.save(function(err){
		if(err){
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			res.render('changeUsernamePage',{maxAge:req.session.cookie.maxAge,lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,fJSON:formJson});
		}
	});
});

router.get('/resendValidMail',library.loginFormChecker,library.ensureAuthenticated,library.newMsgChecker, function (req, res) {
	Users.findById(req.user._id).exec(function (err, user){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤'));
		}else{
			if(!user){
				res.redirect('/message?content='+encodeURIComponent('錯誤'));
			}else{
				if(!user.ifMailValid){
					library.mailValid(user._id,req,function(){
						req.flash('sendValidMail','E-mail認證信已寄往您所填寫的地址：<br><span style="color:red;">'+user.Email+'</span><br>您可於一小時內前往您的信箱點擊連結進行認證或於本頁面重發認證信');
						req.session.save(function(err){
							if(err){
								console.log(err);
								res.redirect('/message?content='+encodeURIComponent('錯誤!'));
							}else{
								res.redirect('/signup/profile');
							}
						});
					},function(){
						req.flash('sendValidMail','E-mail認證信已寄往您所填寫的地址：<br><span style="color:red;">'+user.Email+'</span><br>您可於一小時內前往您的信箱點擊連結進行認證或於本頁面重發認證信');
						req.session.save(function(err){
							if(err){
								console.log(err);
								res.redirect('/message?content='+encodeURIComponent('錯誤!'));
							}else{
								res.redirect('/signup/profile');
							}
						});
					});
				}else{
					res.redirect('/signup/profile');
				}
			}
		}
	});
});

router.post('/changeData',library.loginFormChecker, library.ensureAuthenticated, function (req, res) {
	var ifIdCardNumberExist=false;
	var idCardNumberTester;
	
	if(typeof(req.body.IdCardNumber) === 'string'){
		req.body.IdCardNumber=sanitizer.sanitize(req.body.IdCardNumber.trim());
		if(req.body.IdCardNumber===''){
			idCardNumberTester=null;
		}else{
			idCardNumberTester=req.body.IdCardNumber.toUpperCase();
		}
	}else{
		idCardNumberTester=null;
	}
	
	Users.findOne({IdCardNumber:idCardNumberTester}).exec(function (err, user){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤'));
		}else{
			if(user){
				if(!user._id.equals(req.user._id)){
					ifIdCardNumberExist=true;
				}
			}
			
			var errorTarget=[];
			var errorMessage=[];
			for(i=0;i<11;i++){
				errorTarget.push(false);
				errorMessage.push('');
			}
				
			if(typeof(req.body.Name) === 'string'){
				req.body.Name=sanitizer.sanitize(req.body.Name.trim());
				if(req.body.Name===''){
					errorTarget[0]=true;
					errorMessage[0]='必要參數未填!';
				}
			}else{
				req.body.Name='';
				errorTarget[0]=true;
				errorMessage[0]='未送出!';
			}
			
			if(typeof(req.body.Gender) === 'string'){
				req.body.Gender=sanitizer.sanitize(req.body.Gender.trim());		
				if(req.body.Gender===''){
					req.body.Gender='undefined';
					errorTarget[1]=true;
					errorMessage[1]='必要參數未填!';
				}else if((req.body.Gender!=='Male')&&(req.body.Gender!=='Female')){
					req.body.Gender='undefined';
					errorTarget[1]=true;
					errorMessage[1]='錯誤參數!';
				}					
			}else{
				req.body.Gender='undefined';
				errorTarget[1]=true;
				errorMessage[1]='未送出!';
			}
			
			if(typeof(req.body.BirthDay) === 'string'){
				req.body.BirthDay=sanitizer.sanitize(req.body.BirthDay.trim());
				if(req.body.BirthDay===''){
					errorTarget[2]=true;
					errorMessage[2]='必要參數未填!';
				}else{
					var tester=Date.parse(req.body.BirthDay);
					if(isNaN(tester)){
						errorTarget[2]=true;
						errorMessage[2]='日期格式錯誤!';
					}else{
						var tomorrow=new Date();
						tomorrow.setHours(0);
						tomorrow.setMinutes(0);
						tomorrow.setSeconds(0);
						tomorrow.setMilliseconds(0);
						tomorrow.setTime(tomorrow.getTime()+86400000);
						if(tester>=tomorrow.getTime()){
							errorTarget[2]=true;
							errorMessage[2]='日期不合理!';
						}
					}
				}
			}else{
				req.body.BirthDay='';
				errorTarget[2]=true;
				errorMessage[2]='未送出!';
			}
			
			if(typeof(req.body.IdCardNumber) === 'string'){
				if(req.body.IdCardNumber===''){
					errorTarget[3]=true;
					errorMessage[3]='必要參數未填!';
				}else if(!library.checkSsnID(req.body.IdCardNumber)){
					errorTarget[3]=true;
					errorMessage[3]='格式錯誤!';
				}else if(ifIdCardNumberExist){
					errorTarget[3]=true;
					errorMessage[3]='已存在!';
				}				
			}else{
				req.body.IdCardNumber='';
				errorTarget[3]=true;
				errorMessage[3]='未送出!';
			}

			if(req.files.IdCard){
				if(req.files.IdCard.truncated){
					errorTarget[4]=true;
					errorMessage[4]='檔案不得超過4MB!';
				}else{
					if((req.files.IdCard.mimetype !== 'image/png')&&(req.files.IdCard.mimetype !== 'image/jpeg')){
						errorTarget[4]=true;
						errorMessage[4]='檔案類型錯誤';
					}
				}
			}
			
			if(req.files.SecondCard){
				if(req.files.SecondCard.truncated){
					errorTarget[5]=true;
					errorMessage[5]='檔案不得超過4MB!';
				}else{
					if((req.files.SecondCard.mimetype !== 'image/png')&&(req.files.SecondCard.mimetype !== 'image/jpeg')){
						errorTarget[5]=true;
						errorMessage[5]='檔案類型錯誤';
					}
				}
			}
			
			if(typeof(req.body.Phone) === 'string'){
				req.body.Phone=sanitizer.sanitize(req.body.Phone.trim());
				if(req.body.Phone===''){
					errorTarget[6]=true;
					errorMessage[6]='必要參數未填!';
				}
			}else{
				req.body.Phone='';
				errorTarget[6]=true;
				errorMessage[6]='未送出!';
			}
			
			if(typeof(req.body.Email) === 'string'){
				req.body.Email=sanitizer.sanitize(req.body.Email.trim());
				if(req.body.Email===''){
					errorTarget[7]=true;
					errorMessage[7]='必要參數未填!';
				}else if(req.body.Email.search(/^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/)===-1){
					errorTarget[7]=true;
					errorMessage[7]='Email格式錯誤!';
				}
			}else{
				req.body.Email='';
				errorTarget[7]=true;
				errorMessage[7]='未送出!';
			}
			
			if(typeof(req.body.Address) === 'string'){
				req.body.Address=sanitizer.sanitize(req.body.Address.trim());
				if(req.body.Address===''){
					errorTarget[8]=true;
					errorMessage[8]='必要參數未填!';
				}
			}else{
				req.body.Address='';
				errorTarget[8]=true;
				errorMessage[8]='未送出!';
			}
			
			if(typeof(req.body.BankAccountNumber) === 'string'){
				req.body.BankAccountNumber=sanitizer.sanitize(req.body.BankAccountNumber.trim());
				if(req.body.BankAccountNumber===''){
					errorTarget[9]=true;
					errorMessage[9]='必要參數未填!';
				}
			}else{
				req.body.BankAccountNumber='';
				errorTarget[9]=true;
				errorMessage[9]='未送出!';
			}
			
			if(typeof(req.body.BankAccountPassword) === 'string'){
				req.body.BankAccountPassword=sanitizer.sanitize(req.body.BankAccountPassword.trim());
				if(req.body.BankAccountPassword===''){
					errorTarget[10]=true;
					errorMessage[10]='必要參數未填!';
				}
			}else{
				req.body.BankAccountPassword='';
				errorTarget[10]=true;
				errorMessage[10]='未送出!';
			}
			
			var valiFlag=true;
			for(i=0;i<errorTarget.length;i++){
				if(errorTarget[i]){
					valiFlag=false;
					break;
				}
			}
			
			if(valiFlag){
				Users.findById(req.user._id).exec(function (err, user){
					if (err) {
						console.log(err);
						res.redirect('/message?content='+encodeURIComponent('錯誤'));
					}else{
						if(!user){
							res.redirect('/message?content='+encodeURIComponent('錯誤'));
						}else{
							var ifEmailChange=false;
							if(user.Email!==req.body.Email){
								ifEmailChange=true;
								user.ifMailValid=false;
							}
							user.Name=req.body.Name;
							user.Email=req.body.Email;
							user.Gender=req.body.Gender;
							user.BirthDay=req.body.BirthDay;
							user.IdCardNumber=req.body.IdCardNumber.toUpperCase();
							user.Phone=req.body.Phone;
							user.Address=req.body.Address;
							user.Updated=Date.now();
							
							user.save(function (err,newUpdated) {
								if (err){
									console.log(err);
									res.redirect('/message?content='+encodeURIComponent('錯誤'));
								}else{
									BankAccounts.findOne({OwnedBy:newUpdated._id}).exec(function (err, account){
										if (err) {
											console.log(err);
											res.redirect('/message?content='+encodeURIComponent('錯誤'));
										}else{
											if(!account){
												res.redirect('/message?content='+encodeURIComponent('錯誤'));
											}else{
												account.BankAccountNumber=req.body.BankAccountNumber;
												account.BankAccountPassword=req.body.BankAccountPassword;
												account.save(function (err,newUpdatedInner) {
													if (err){
														console.log(err);
														res.redirect('/message?content='+encodeURIComponent('錯誤'));
													}else{
														var filesArray=[];
														if(req.files.IdCard){
															req.files.IdCard.flag=true;
															req.files.IdCard.category='IdCard';
															filesArray.push(req.files.IdCard);
														}else{
															var ipt={};
															ipt.flag=false;
															filesArray.push(ipt);
														}
														if(req.files.SecondCard){
															req.files.SecondCard.flag=true;
															req.files.SecondCard.category='SecondCard';
															filesArray.push(req.files.SecondCard);
														}else{
															var ipt2={};
															ipt2.flag=false;
															filesArray.push(ipt2);
														}
														
														library.gridDeletor(newUpdated._id,filesArray,function(){
															library.gridCreator(newUpdated._id,newUpdated.Username,filesArray,function(){
																if(!ifEmailChange){
																	res.redirect('/signup/profile');
																}else{
																	library.mailValid(newUpdated._id,req,function(){
																		req.flash('sendValidMail','E-mail認證信已寄往您所填寫的地址：<br><span style="color:red;">'+newUpdated.Email+'</span><br>您可於一小時內前往您的信箱點擊連結進行認證或於本頁面重發認證信');
																		req.session.save(function(err){
																			if(err){
																				console.log(err);
																				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
																			}else{
																				res.redirect('/signup/profile');
																			}
																		});
																	},function(){
																		req.flash('sendValidMail','E-mail認證信已寄往您所填寫的地址：<br><span style="color:red;">'+newUpdated.Email+'</span><br>您可於一小時內前往您的信箱點擊連結進行認證或於本頁面重發認證信');
																		req.session.save(function(err){
																			if(err){
																				console.log(err);
																				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
																			}else{
																				res.redirect('/signup/profile');
																			}
																		});
																	});
																}
															},function(){
																res.redirect('/message?content='+encodeURIComponent('檔案更新錯誤'));
															});
														},function(){
															res.redirect('/message?content='+encodeURIComponent('檔案刪除錯誤'));
														});
													}
												});
											}
										}
									});
								}
							});
						}
					}
				});
			}else{
				if((req.files.IdCard)||(req.files.SecondCard)){
					var findPath = __dirname+'/../';
					if(req.files.IdCard){
						if(!errorTarget[4]){
							errorTarget[4]=true;
							errorMessage[4]='重新上傳檔案';
						}
						var delPathA=require('path').join(findPath,req.files.IdCard.path);
						if(fs.existsSync(delPathA)){
							fs.unlinkSync(delPathA);
						}
						var ctrA=-1;
						for(i=0;i<library.tmpFilePathArray.length;i++){
							if(req.files.IdCard.path===library.tmpFilePathArray[i].Path){
								ctrA=i;
								break;
							}
						}
						if(ctrA>-1){
							library.tmpFilePathArray.splice(ctrA, 1);
						}
					}
					if(req.files.SecondCard){
						if(!errorTarget[5]){
							errorTarget[5]=true;
							errorMessage[5]='重新上傳檔案';
						}
						var delPathB=require('path').join(findPath,req.files.SecondCard.path);
						if(fs.existsSync(delPathB)){
							fs.unlinkSync(delPathB);
						}
						var ctrB=-1;
						for(i=0;i<library.tmpFilePathArray.length;i++){
							if(req.files.SecondCard.path===library.tmpFilePathArray[i].Path){
								ctrB=i;
								break;
							}
						}
						if(ctrB>-1){
							library.tmpFilePathArray.splice(ctrB, 1);
						}
					}
				}
				redirectorCD(req,res,errorTarget,errorMessage);
			}
		}
	});
});

function redirectorCD(req,res,target,message){
	var formContent={
		F1:req.body.Name,
		F2:req.body.Gender,
		F3:req.body.BirthDay,
		F4:req.body.IdCardNumber,
		F7:req.body.Phone,
		F8:req.body.Email,
		F9:req.body.Address,
		F10:req.body.BankAccountNumber,
		F11:req.body.BankAccountPassword
	};
	
	var json={FormContent:formContent,Target:target,Message:message};
	var string=JSON.stringify(json);
	
	req.flash('dataCDForm',string);
	req.session.save(function(err){
		if(err){
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			res.redirect('/signup/profile');
		}
	});
}

function redirectorNewACC(req,res,target,message){
	var formContent={
		F1:req.body.nameIpt,
		F2:req.body.genderIpt,
		F3:req.body.birthIpt,
		F4:req.body.ssnIpt,
		F7:req.body.telIpt,
		F8:req.body.emailIpt,
		F9:req.body.addrIpt,
		F10:req.body.cardIpt,
		F11:req.body.cardPwdIpt
	};
	
	var json={FormContent:formContent,Target:target,Message:message};
	var string=JSON.stringify(json);
	
	req.flash('newAccForm',string);
	req.session.save(function(err){
		if(err){
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			res.redirect('/signup/newAcc');
		}
	});
}

function redirectorCardData(req,res,target,message){
	var formContent={
		F1:req.body.cardIpt,
		F2:req.body.cardPwdIpt
	};
	
	var json={FormContent:formContent,Target:target,Message:message};
	var string=JSON.stringify(json);
	
	req.flash('cardDataForm',string);
	req.session.save(function(err){
		if(err){
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			res.redirect('/signup/cardData');
		}
	});
}

// this is the basic type when page no need to ensure authenticated. U can try this by /signup/signupExample
router.get('/cardData',library.loginFormChecker,library.newMsgChecker,library.usrNameGenerator, function (req, res) {
	var stringArrayFlash=req.flash('cardDataForm');
	var cardDataFormJson=null;
	if(stringArrayFlash.length>0){
		cardDataFormJson=JSON.parse(stringArrayFlash[0]);
	}
	
	if(!req.session.hasOwnProperty('cardDataFormArray')){
		req.session.cardDataFormArray=[];
	}else{
		for(j=req.session.cardDataFormArray.length-1;j>-1;j--){
			var NowT=Date.now();
			if((NowT-req.session.cardDataFormArray[j].SaveT)>=600000){
				req.session.cardDataFormArray.splice(j, 1);
			}
		}
	}
	
	var tempIdfr=uuid.v1();
	req.session.cardDataFormArray.push({Idfr:tempIdfr,SaveT:Date.now()});
	
	req.session.save(function(err){
		if(err){
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			res.render('cardData_1',{maxAge:req.session.cookie.maxAge,lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.auRst,formSession1:tempIdfr,cdfJSON:cardDataFormJson});
		}
	});
});

// this is the basic type when page no need to ensure authenticated. U can try this by /signup/signupExample
router.post('/checkPro',library.loginFormChecker,library.newMsgChecker,library.usrNameGenerator, function (req, res) {
	if(typeof(req.body.FormSession1) === 'string'){
		var passFlag=false;
		if(req.session.hasOwnProperty('cardDataFormArray')){
			for(i=0;i<req.session.cardDataFormArray.length;i++){
				if(req.body.FormSession1===req.session.cardDataFormArray[i].Idfr){
					passFlag=true;
					break;
				}
			}
		}
		
		if(passFlag){
			var errorTarget=[];
			var errorMessage=[];
			for(i=0;i<2;i++){
				errorTarget.push(false);
				errorMessage.push('');
			}
			
			if(typeof(req.body.cardIpt) === 'string'){
				req.body.cardIpt=sanitizer.sanitize(req.body.cardIpt.trim());
				if(req.body.cardIpt===''){
					errorTarget[0]=true;
					errorMessage[0]='必要參數未填!';
				}
			}else{
				req.body.cardIpt='';
				errorTarget[0]=true;
				errorMessage[0]='未送出!';
			}
			
			if(typeof(req.body.cardPwdIpt) === 'string'){
				req.body.cardPwdIpt=sanitizer.sanitize(req.body.cardPwdIpt.trim());
				if(req.body.cardPwdIpt===''){
					errorTarget[1]=true;
					errorMessage[1]='必要參數未填!';
				}
			}else{
				req.body.cardPwdIpt='';
				errorTarget[1]=true;
				errorMessage[1]='未送出!';
			}
			
			var valiFlag=true;
			for(i=0;i<errorTarget.length;i++){
				if(errorTarget[i]){
					valiFlag=false;
					break;
				}
			}
			
			if(valiFlag){
				Users.find({}).exec(function (err, users){
					if (err) {
						console.log(err);
						res.redirect('/message?content='+encodeURIComponent('錯誤'));
					}else{
						if(!req.session.hasOwnProperty('checkProFormArray')){
							req.session.checkProFormArray=[];
						}else{
							for(j=req.session.checkProFormArray.length-1;j>-1;j--){
								var NowT=Date.now();
								if((NowT-req.session.checkProFormArray[j].SaveT)>=600000){
									req.session.checkProFormArray.splice(j, 1);
								}
							}
						}
						
						var tempIdfr=uuid.v1();
						req.session.checkProFormArray.push({Idfr:tempIdfr,SaveT:Date.now()});
						
						req.session.save(function(err) {
							if(err){
								console.log(err);
								res.redirect('/message?content='+encodeURIComponent('錯誤!'));
							}else{
								res.render('checkPro_1',{maxAge:req.session.cookie.maxAge,lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.auRst,BankAccountNumber:req.body.cardIpt,BankAccountPassword:req.body.cardPwdIpt,formSession1:req.body.FormSession1,formSession2:tempIdfr,usrNum:users.length+1});
							}
						});
					}
				});
			}else{
				redirectorCardData(req,res,errorTarget,errorMessage);
			}
		}else{
			res.redirect('/signupTest');
		}
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

// this is the basic type when page no need to ensure authenticated. U can try this by /signup/signupExample
router.get('/newAcc',library.loginFormChecker,library.newMsgChecker,library.usrNameGenerator, function (req, res) {
	var stringArrayFlash=req.flash('newAccForm');
	var newAccFormJson=null;
	if(stringArrayFlash.length>0){
		newAccFormJson=JSON.parse(stringArrayFlash[0]);
	}
	
	if(!req.session.hasOwnProperty('newAccFormArray')){
		req.session.newAccFormArray=[];
	}else{
		for(j=req.session.newAccFormArray.length-1;j>-1;j--){
			var NowT=Date.now();
			if((NowT-req.session.newAccFormArray[j].SaveT)>=600000){
				req.session.newAccFormArray.splice(j, 1);
			}
		}
	}
	
	var tempIdfr=uuid.v1();
	req.session.newAccFormArray.push({Idfr:tempIdfr,SaveT:Date.now()});
	
	req.session.save(function(err){
		if(err){
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			res.render('newAcc_2',{maxAge:req.session.cookie.maxAge,lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.auRst,formSession1:tempIdfr,nafJSON:newAccFormJson});
		}
	});
});

// this is the basic type when page no need to ensure authenticated. U can try this by /signup/signupExample
router.post('/apply',library.loginFormChecker,library.newMsgChecker,library.usrNameGenerator, function (req, res) {
	if((typeof(req.body.FormSession2) === 'string')&&(typeof(req.body.ssnIpt) === 'string')&&(typeof(req.body.nameIpt) === 'string')&&(typeof(req.body.genderIpt) === 'string')&&(typeof(req.body.birthIpt) === 'string')&&(typeof(req.body.telIpt) === 'string')&&(typeof(req.body.emailIpt) === 'string')&&(typeof(req.body.addrIpt) === 'string')&&(typeof(req.body.BankAccountNumber) === 'string')&&(typeof(req.body.BankAccountPassword) === 'string')&&(typeof(req.body.IdCardStr) === 'string')&&(typeof(req.body.SecondCardStr) === 'string')){
		var passFlag=false;
		if(req.session.hasOwnProperty('checkProFormArray')){
			for(i=0;i<req.session.checkProFormArray.length;i++){
				if(req.body.FormSession2===req.session.checkProFormArray[i].Idfr){
					passFlag=true;
					break;
				}
			}
		}
		
		if(passFlag){
			req.body.ssnIpt=sanitizer.sanitize(req.body.ssnIpt.trim());
			req.body.nameIpt=sanitizer.sanitize(req.body.nameIpt.trim());
			req.body.genderIpt=sanitizer.sanitize(req.body.genderIpt.trim());
			req.body.birthIpt=sanitizer.sanitize(req.body.birthIpt.trim());
			req.body.telIpt=sanitizer.sanitize(req.body.telIpt.trim());
			req.body.emailIpt=sanitizer.sanitize(req.body.emailIpt.trim());
			req.body.addrIpt=sanitizer.sanitize(req.body.addrIpt.trim());
			req.body.BankAccountNumber=sanitizer.sanitize(req.body.BankAccountNumber.trim());
			req.body.BankAccountPassword=sanitizer.sanitize(req.body.BankAccountPassword.trim());
			req.body.IdCardStr=sanitizer.sanitize(req.body.IdCardStr.trim());
			req.body.SecondCardStr=sanitizer.sanitize(req.body.SecondCardStr.trim());
			
			if((req.body.nameIpt!=='')&&(req.body.genderIpt!=='')&&(req.body.birthIpt!=='')&&(req.body.ssnIpt!=='')&&(req.body.telIpt!=='')&&(req.body.emailIpt!=='')&&(req.body.addrIpt!=='')&&(req.body.BankAccountNumber!=='')&&(req.body.BankAccountPassword!=='')&&(req.body.IdCardStr!=='')&&(req.body.SecondCardStr!=='')){
				var ifIdCardNumberExist=false;
				Users.findOne({IdCardNumber:req.body.ssnIpt.toUpperCase()}).exec(function (err, userFound){
					if (err) {
						console.log(err);
						res.redirect('/message?content='+encodeURIComponent('錯誤'));
					}else{
						if(userFound){
							ifIdCardNumberExist=true;
						}
						
						var tester=Date.parse(req.body.birthIpt);
						var tLimitFlag=true;
						if(isNaN(tester)){
							tLimitFlag=false;
						}else{
							var tomorrow=new Date();
							tomorrow.setHours(0);
							tomorrow.setMinutes(0);
							tomorrow.setSeconds(0);
							tomorrow.setMilliseconds(0);
							tomorrow.setTime(tomorrow.getTime()+86400000);
							if(tester>=tomorrow.getTime()){
								tLimitFlag=false;
							}
						}
						
						var emailFlag=false;
						if(req.body.emailIpt.search(/^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/)>-1){
							emailFlag=true;
						}
						if((tLimitFlag)&&(emailFlag)&&(library.checkSsnID(req.body.ssnIpt))&&(!ifIdCardNumberExist)){
							if(!req.session.hasOwnProperty('apply1FormArray')){
								req.session.apply1FormArray=[];
							}else{
								for(j=req.session.apply1FormArray.length-1;j>-1;j--){
									var NowT=Date.now();
									if((NowT-req.session.apply1FormArray[j].SaveT)>=600000){
										req.session.apply1FormArray.splice(j, 1);
									}
								}
							}
							
							var tempIdfr=uuid.v1();
							req.session.apply1FormArray.push({Idfr:tempIdfr,SaveT:Date.now()});
							
							req.session.save(function(err) {
								if(err){
									console.log(err);
									res.redirect('/message?content='+encodeURIComponent('錯誤!'));
								}else{
									res.render('apply_1',{maxAge:req.session.cookie.maxAge,lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.auRst, Name:req.body.nameIpt, Email:req.body.emailIpt, Gender:req.body.genderIpt,
									BirthDay:req.body.birthIpt, Phone:req.body.telIpt, Address:req.body.addrIpt,IdCardNumber:req.body.ssnIpt,IdCardStr:req.body.IdCardStr,SecondCardStr:req.body.SecondCardStr,
									BankAccountNumber:req.body.BankAccountNumber,BankAccountPassword:req.body.BankAccountPassword,formSession1:req.body.FormSession1,formSession2:req.body.FormSession2,formSession3:tempIdfr});
								}
							});
						}else{
							if(ifIdCardNumberExist){
								res.redirect('/message?content='+encodeURIComponent('身分證字號已存在!'));
							}else{
								res.redirect('/message?content='+encodeURIComponent('資料填寫不全或錯誤!'));
							}
						}
					}
				});
			}else{
				res.redirect('/message?content='+encodeURIComponent('資料填寫不全或錯誤!'));
			}
		}else{
			res.redirect('/signupTest');
		}
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/_apply',library.loginFormChecker,library.newMsgChecker,library.usrNameGenerator, function (req, res) {
	if(typeof(req.body.FormSession1) === 'string'){
		var passFlag=false;
		if(req.session.hasOwnProperty('newAccFormArray')){
			for(i=0;i<req.session.newAccFormArray.length;i++){
				if(req.body.FormSession1===req.session.newAccFormArray[i].Idfr){
					passFlag=true;
					break;
				}
			}
		}
		
		if(passFlag){
			var ifIdCardNumberExist=false;
			var idCardNumberTester;
			
			if(typeof(req.body.ssnIpt) === 'string'){
				req.body.ssnIpt=sanitizer.sanitize(req.body.ssnIpt.trim());
				if(req.body.ssnIpt===''){
					idCardNumberTester=null;
				}else{
					idCardNumberTester=req.body.ssnIpt.toUpperCase();
				}
			}else{
				idCardNumberTester=null;
			}
			
			Users.findOne({IdCardNumber:idCardNumberTester}).exec(function (err, user){
				if (err) {
					console.log(err);
					res.redirect('/message?content='+encodeURIComponent('錯誤'));
				}else{
					if(user){
						ifIdCardNumberExist=true;
					}
					
					var errorTarget=[];
					var errorMessage=[];
					for(i=0;i<11;i++){
						errorTarget.push(false);
						errorMessage.push('');
					}
					
					if(typeof(req.body.nameIpt) === 'string'){
						req.body.nameIpt=sanitizer.sanitize(req.body.nameIpt.trim());
						if(req.body.nameIpt===''){
							errorTarget[0]=true;
							errorMessage[0]='必要參數未填!';
						}
					}else{
						req.body.nameIpt='';
						errorTarget[0]=true;
						errorMessage[0]='未送出!';
					}
					
					if(typeof(req.body.genderIpt) === 'string'){
						req.body.genderIpt=sanitizer.sanitize(req.body.genderIpt.trim());		
						if(req.body.genderIpt===''){
							req.body.genderIpt='undefined';
							errorTarget[1]=true;
							errorMessage[1]='必要參數未填!';
						}else if((req.body.genderIpt!=='Male')&&(req.body.genderIpt!=='Female')){
							req.body.genderIpt='undefined';
							errorTarget[1]=true;
							errorMessage[1]='錯誤參數!';
						}					
					}else{
						req.body.genderIpt='undefined';
						errorTarget[1]=true;
						errorMessage[1]='未送出!';
					}
					
					if(typeof(req.body.birthIpt) === 'string'){
						req.body.birthIpt=sanitizer.sanitize(req.body.birthIpt.trim());	
						if(req.body.birthIpt===''){
							errorTarget[2]=true;
							errorMessage[2]='必要參數未填!';
						}else{
							var tester=Date.parse(req.body.birthIpt);
							if(isNaN(tester)){
								errorTarget[2]=true;
								errorMessage[2]='日期格式錯誤!';
							}else{
								var tomorrow=new Date();
								tomorrow.setHours(0);
								tomorrow.setMinutes(0);
								tomorrow.setSeconds(0);
								tomorrow.setMilliseconds(0);
								tomorrow.setTime(tomorrow.getTime()+86400000);
								if(tester>=tomorrow.getTime()){
									errorTarget[2]=true;
									errorMessage[2]='日期不合理!';
								}
							}
						}					
					}else{
						req.body.birthIpt='';
						errorTarget[2]=true;
						errorMessage[2]='未送出!';
					}

					if(typeof(req.body.ssnIpt) === 'string'){
						if(req.body.ssnIpt===''){
							errorTarget[3]=true;
							errorMessage[3]='必要參數未填!';
						}else if(!library.checkSsnID(req.body.ssnIpt)){
							errorTarget[3]=true;
							errorMessage[3]='格式錯誤!';
						}else if(ifIdCardNumberExist){
							errorTarget[3]=true;
							errorMessage[3]='已存在!';
						}					
					}else{
						req.body.ssnIpt='';
						errorTarget[3]=true;
						errorMessage[3]='未送出!';
					}

					if(!req.files.ssnImg){
						errorTarget[4]=true;
						errorMessage[4]='重新上傳檔案';
					}else{
						if(req.files.ssnImg.truncated){
							errorTarget[4]=true;
							errorMessage[4]='檔案不得超過4MB!';
						}else{
							if((req.files.ssnImg.mimetype !== 'image/png')&&(req.files.ssnImg.mimetype !== 'image/jpeg')){
								errorTarget[4]=true;
								errorMessage[4]='檔案類型錯誤';
							}
						}
					}
					
					if(!req.files.cerImg){
						errorTarget[5]=true;
						errorMessage[5]='重新上傳檔案';
					}else{
						if(req.files.cerImg.truncated){
							errorTarget[5]=true;
							errorMessage[5]='檔案不得超過4MB!';
						}else{
							if((req.files.cerImg.mimetype !== 'image/png')&&(req.files.cerImg.mimetype !== 'image/jpeg')){
								errorTarget[5]=true;
								errorMessage[5]='檔案類型錯誤';
							}
						}
					}
					
					if(typeof(req.body.telIpt) === 'string'){
						req.body.telIpt=sanitizer.sanitize(req.body.telIpt.trim());
						if(req.body.telIpt===''){
							errorTarget[6]=true;
							errorMessage[6]='必要參數未填!';
						}					
					}else{
						req.body.telIpt='';
						errorTarget[6]=true;
						errorMessage[6]='未送出!';
					}

					if(typeof(req.body.emailIpt) === 'string'){
						req.body.emailIpt=sanitizer.sanitize(req.body.emailIpt.trim());	
						if(req.body.emailIpt===''){
							errorTarget[7]=true;
							errorMessage[7]='必要參數未填!';
						}else if(req.body.emailIpt.search(/^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/)===-1){
							errorTarget[7]=true;
							errorMessage[7]='Email格式錯誤!';
						}					
					}else{
						req.body.emailIpt='';
						errorTarget[7]=true;
						errorMessage[7]='未送出!';
					}

					if(typeof(req.body.addrIpt) === 'string'){
						req.body.addrIpt=sanitizer.sanitize(req.body.addrIpt.trim());
						if(req.body.addrIpt===''){
							errorTarget[8]=true;
							errorMessage[8]='必要參數未填!';
						}
					}else{
						req.body.addrIpt='';
						errorTarget[8]=true;
						errorMessage[8]='未送出!';
					}

					if(typeof(req.body.cardIpt) === 'string'){
						req.body.cardIpt=sanitizer.sanitize(req.body.cardIpt.trim());
						if(req.body.cardIpt===''){
							errorTarget[9]=true;
							errorMessage[9]='必要參數未填!';
						}
					}else{
						req.body.cardIpt='';
						errorTarget[9]=true;
						errorMessage[9]='未送出!';
					}
					
					if(typeof(req.body.cardPwdIpt) === 'string'){
						req.body.cardPwdIpt=sanitizer.sanitize(req.body.cardPwdIpt.trim());
						if(req.body.cardPwdIpt===''){
							errorTarget[10]=true;
							errorMessage[10]='必要參數未填!';
						}
					}else{
						req.body.cardPwdIpt='';
						errorTarget[10]=true;
						errorMessage[10]='未送出!';
					}
					
					var valiFlag=true;
					for(i=0;i<errorTarget.length;i++){
						if(errorTarget[i]){
							valiFlag=false;
							break;
						}
					}
					
					if(valiFlag){
						var idCardString='';
						if(req.files.ssnImg){
							idCardString=req.files.ssnImg.path;
						}
						
						var secondCardString='';
						if(req.files.cerImg){
							secondCardString=req.files.cerImg.path;
						}
						
						if(!req.session.hasOwnProperty('apply2FormArray')){
							req.session.apply2FormArray=[];
						}else{
							for(j=req.session.apply2FormArray.length-1;j>-1;j--){
								var NowT=Date.now();
								if((NowT-req.session.apply2FormArray[j].SaveT)>=600000){
									req.session.apply2FormArray.splice(j, 1);
								}
							}
						}
						
						var tempIdfr=uuid.v1();
						req.session.apply2FormArray.push({Idfr:tempIdfr,SaveT:Date.now()});
						
						req.session.save(function(err) {
							if(err){
								console.log(err);
								res.redirect('/message?content='+encodeURIComponent('錯誤!'));
							}else{
								res.render('apply_2',{maxAge:req.session.cookie.maxAge,lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.auRst, Name:req.body.nameIpt, Email:req.body.emailIpt, Gender:req.body.genderIpt,
								BirthDay:req.body.birthIpt, Phone:req.body.telIpt, Address:req.body.addrIpt,IdCardNumber:req.body.ssnIpt,IdCardStr:idCardString,SecondCardStr:secondCardString,
								BankAccountNumber:req.body.cardIpt,BankAccountPassword:req.body.cardPwdIpt,formSession1:req.body.FormSession1,formSession2:tempIdfr});
							}
						});
					}else{
						if((req.files.ssnImg)||(req.files.cerImg)){
							var findPath = __dirname+'/../';
							if(req.files.ssnImg){
								if(!errorTarget[4]){
									errorTarget[4]=true;
									errorMessage[4]='重新上傳檔案';
								}
								var delPathA=require('path').join(findPath,req.files.ssnImg.path);
								if(fs.existsSync(delPathA)){
									fs.unlinkSync(delPathA);
								}
								var ctrA=-1;
								for(i=0;i<library.tmpFilePathArray.length;i++){
									if(req.files.ssnImg.path===library.tmpFilePathArray[i].Path){
										ctrA=i;
										break;
									}
								}
								if(ctrA>-1){
									library.tmpFilePathArray.splice(ctrA, 1);
								}
							}
							if(req.files.cerImg){
								if(!errorTarget[5]){
									errorTarget[5]=true;
									errorMessage[5]='重新上傳檔案';
								}
								var delPathB=require('path').join(findPath,req.files.cerImg.path);
								if(fs.existsSync(delPathB)){
									fs.unlinkSync(delPathB);
								}
								var ctrB=-1;
								for(i=0;i<library.tmpFilePathArray.length;i++){
									if(req.files.cerImg.path===library.tmpFilePathArray[i].Path){
										ctrB=i;
										break;
									}
								}
								if(ctrB>-1){
									library.tmpFilePathArray.splice(ctrB, 1);
								}
							}
						}
						redirectorNewACC(req,res,errorTarget,errorMessage);
					}
				}
			});
		}else{
			if((req.files.ssnImg)||(req.files.cerImg)){
				var findPath = __dirname+'/../';
				if(req.files.ssnImg){
					var delPathA=require('path').join(findPath,req.files.ssnImg.path);
					if(fs.existsSync(delPathA)){
						fs.unlinkSync(delPathA);
					}
					var ctrA=-1;
					for(i=0;i<library.tmpFilePathArray.length;i++){
						if(req.files.ssnImg.path===library.tmpFilePathArray[i].Path){
							ctrA=i;
							break;
						}
					}
					if(ctrA>-1){
						library.tmpFilePathArray.splice(ctrA, 1);
					}
				}
				if(req.files.cerImg){
					var delPathB=require('path').join(findPath,req.files.cerImg.path);
					if(fs.existsSync(delPathB)){
						fs.unlinkSync(delPathB);
					}
					var ctrB=-1;
					for(i=0;i<library.tmpFilePathArray.length;i++){
						if(req.files.cerImg.path===library.tmpFilePathArray[i].Path){
							ctrB=i;
							break;
						}
					}
					if(ctrB>-1){
						library.tmpFilePathArray.splice(ctrB, 1);
					}
				}
			}
			res.redirect('/signupTest');
		}
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

// this is the basic type when page no need to ensure authenticated. U can try this by /signup/signupExample
router.post('/community',library.loginFormChecker,library.newMsgChecker,library.usrNameGenerator, function (req, res) {
	if((typeof(req.body.FormSession1) === 'string')&&(typeof(req.body.FormSession2) === 'string')&&(typeof(req.body.FormSession3) === 'string')&&(typeof(req.body.IdCardNumber) === 'string')&&(typeof(req.body.Username) === 'string')&&(typeof(req.body.Password) === 'string')&&(typeof(req.body.Password2nd) === 'string')&&(typeof(req.body.Name) === 'string')&&(typeof(req.body.Email) === 'string')&&(typeof(req.body.Gender) === 'string')&&(typeof(req.body.BirthDay) === 'string')&&(typeof(req.body.Phone) === 'string')&&(typeof(req.body.Address) === 'string')&&(typeof(req.body.IdCardStr) === 'string')&&(typeof(req.body.SecondCardStr) === 'string')&&(typeof(req.body.BankAccountNumber) === 'string')&&(typeof(req.body.BankAccountPassword) === 'string')){
		var passFlag=false;
		if(req.session.hasOwnProperty('apply1FormArray')){
			for(i=0;i<req.session.apply1FormArray.length;i++){
				if(req.body.FormSession3===req.session.apply1FormArray[i].Idfr){
					passFlag=true;
					break;
				}
			}
		}
		
		if(passFlag){
			userCreator(req,res,function (){
				if(req.session.hasOwnProperty('cardDataFormArray')){
					var ctr1=-1;
					for(i=0;i<req.session.cardDataFormArray.length;i++){
						if(req.body.FormSession1===req.session.cardDataFormArray[i].Idfr){
							ctr1=i;
							break;
						}
					}
					if(ctr1>-1){
						req.session.cardDataFormArray.splice(ctr1, 1);
					}
				}
				if(req.session.hasOwnProperty('checkProFormArray')){
					var ctr2=-1;
					for(i=0;i<req.session.checkProFormArray.length;i++){
						if(req.body.FormSession2===req.session.checkProFormArray[i].Idfr){
							ctr2=i;
							break;
						}
					}
					if(ctr2>-1){
						req.session.checkProFormArray.splice(ctr2, 1);
					}
				}
				if(req.session.hasOwnProperty('apply1FormArray')){
					var ctr3=-1;
					for(i=0;i<req.session.apply1FormArray.length;i++){
						if(req.body.FormSession3===req.session.apply1FormArray[i].Idfr){
							ctr3=i;
							break;
						}
					}
					if(ctr3>-1){
						req.session.apply1FormArray.splice(ctr3, 1);
					}
				}
				
				req.session.save(function(err) {
					if(err){
						console.log(err);
						res.redirect('/message?content='+encodeURIComponent('錯誤!'));
					}else{
						res.render('community_1',{maxAge:req.session.cookie.maxAge,lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.auRst,email:req.body.Email});
					}
				});
			});
		}else{
			res.redirect('/signupTest');
		}
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

// this is the basic type when page no need to ensure authenticated. U can try this by /signup/signupExample
router.post('/_community',library.loginFormChecker,library.newMsgChecker,library.usrNameGenerator, function (req, res) {
	if((typeof(req.body.FormSession1) === 'string')&&(typeof(req.body.FormSession2) === 'string')&&(typeof(req.body.IdCardNumber) === 'string')&&(typeof(req.body.Username) === 'string')&&(typeof(req.body.Password) === 'string')&&(typeof(req.body.Password2nd) === 'string')&&(typeof(req.body.Name) === 'string')&&(typeof(req.body.Email) === 'string')&&(typeof(req.body.Gender) === 'string')&&(typeof(req.body.BirthDay) === 'string')&&(typeof(req.body.Phone) === 'string')&&(typeof(req.body.Address) === 'string')&&(typeof(req.body.IdCardStr) === 'string')&&(typeof(req.body.SecondCardStr) === 'string')&&(typeof(req.body.BankAccountNumber) === 'string')&&(typeof(req.body.BankAccountPassword) === 'string')){
		var passFlag=false;
		if(req.session.hasOwnProperty('apply2FormArray')){
			for(i=0;i<req.session.apply2FormArray.length;i++){
				if(req.body.FormSession2===req.session.apply2FormArray[i].Idfr){
					passFlag=true;
					break;
				}
			}
		}
		
		if(passFlag){
			userCreator(req,res,function (){
				if(req.session.hasOwnProperty('newAccFormArray')){
					var ctr1=-1;
					for(i=0;i<req.session.newAccFormArray.length;i++){
						if(req.body.FormSession1===req.session.newAccFormArray[i].Idfr){
							ctr1=i;
							break;
						}
					}
					if(ctr1>-1){
						req.session.newAccFormArray.splice(ctr1, 1);
					}
				}
				if(req.session.hasOwnProperty('apply2FormArray')){
					var ctr2=-1;
					for(i=0;i<req.session.apply2FormArray.length;i++){
						if(req.body.FormSession2===req.session.apply2FormArray[i].Idfr){
							ctr2=i;
							break;
						}
					}
					if(ctr2>-1){
						req.session.apply2FormArray.splice(ctr2, 1);
					}
				}
				
				req.session.save(function(err) {
					if(err){
						console.log(err);
						res.redirect('/message?content='+encodeURIComponent('錯誤!'));
					}else{
						res.render('community_2',{maxAge:req.session.cookie.maxAge,lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.auRst,email:req.body.Email});
					}
				});
			});
		}else{
			res.redirect('/signupTest');
		}
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.get('/success',library.loginFormChecker,library.newMsgChecker,library.usrNameGenerator, function (req, res) {
	res.render('success_1',{maxAge:req.session.cookie.maxAge,lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.auRst});
});

router.get('/_success',library.loginFormChecker,library.newMsgChecker,library.usrNameGenerator, function (req, res) {
	res.render('success_2',{maxAge:req.session.cookie.maxAge,lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.auRst});
});

function userCreator(req,res,callback){
	req.body.IdCardNumber=sanitizer.sanitize(req.body.IdCardNumber.trim());
	req.body.Username=sanitizer.sanitize(req.body.Username.trim());
	req.body.Password=sanitizer.sanitize(req.body.Password.trim());
	req.body.Password2nd=sanitizer.sanitize(req.body.Password2nd.trim());
	req.body.Name=sanitizer.sanitize(req.body.Name.trim());
	req.body.Email=sanitizer.sanitize(req.body.Email.trim());
	req.body.Gender=sanitizer.sanitize(req.body.Gender.trim());
	req.body.BirthDay=sanitizer.sanitize(req.body.BirthDay.trim());
	req.body.Phone=sanitizer.sanitize(req.body.Phone.trim());
	req.body.Address=sanitizer.sanitize(req.body.Address.trim());
	req.body.IdCardStr=sanitizer.sanitize(req.body.IdCardStr.trim());
	req.body.SecondCardStr=sanitizer.sanitize(req.body.SecondCardStr.trim());
	req.body.BankAccountNumber=sanitizer.sanitize(req.body.BankAccountNumber.trim());
	req.body.BankAccountPassword=sanitizer.sanitize(req.body.BankAccountPassword.trim());
			
	if((req.body.Username!=='')&&(req.body.Password!=='')&&(req.body.Password2nd!=='')&&(req.body.Name!=='')&&(req.body.Email!=='')&&(req.body.Gender!=='')&&(req.body.BirthDay!=='')&&(req.body.IdCardNumber!=='')&&(req.body.Phone!=='')&&(req.body.Address!=='')&&(req.body.IdCardStr!=='')&&(req.body.SecondCardStr!=='')&&(req.body.BankAccountNumber!=='')&&(req.body.BankAccountPassword!=='')){
		var ifIdCardNumberExist=false;
		Users.findOne({IdCardNumber:req.body.IdCardNumber.toUpperCase()}).exec(function (err, userFound){
			if (err) {
				console.log(err);
				res.redirect('/message?content='+encodeURIComponent('錯誤'));
			}else{
				if(userFound){
					ifIdCardNumberExist=true;
				}
				
				var fileFlag1=true;
				var fileFlag2=true;
				var idCardJson={};
				var secondCardJson={};
				
				if(!fs.existsSync(req.body.IdCardStr)){
					fileFlag1=false;
				}else{
					var ctrA=-1;
					for(k=0;k<library.tmpFilePathArray.length;k++){
						if(req.body.IdCardStr===library.tmpFilePathArray[k].Path){
							ctrA=k;
							break;
						}
					}
					if(ctrA===-1){
						if(req.body.IdCardStr!=='tmp/brick.jpg'){
							fileFlag1=false;
						}else{
							idCardJson.path='tmp/brick.jpg';
							idCardJson.originalname='brick.jpg';
							idCardJson.mimetype='image/jpeg';
							idCardJson.extension='jpg';
						}
					}else{
						idCardJson.path=library.tmpFilePathArray[ctrA].Path;
						idCardJson.originalname=library.tmpFilePathArray[ctrA].Originalname;
						idCardJson.mimetype=library.tmpFilePathArray[ctrA].Mimetype;
						idCardJson.extension=library.tmpFilePathArray[ctrA].Extension;
					}
				}
				
				if(!fs.existsSync(req.body.SecondCardStr)){
					fileFlag2=false;
				}else{
					var ctrB=-1;
					for(k=0;k<library.tmpFilePathArray.length;k++){
						if(req.body.SecondCardStr===library.tmpFilePathArray[k].Path){
							ctrB=k;
							break;
						}
					}
					if(ctrB===-1){
						if(req.body.SecondCardStr!=='tmp/camera.png'){
							fileFlag2=false;
						}else{
							secondCardJson.path='tmp/camera.png';
							secondCardJson.originalname='camera.png';
							secondCardJson.mimetype='image/png';
							secondCardJson.extension='png';
						}
					}else{
						secondCardJson.path=library.tmpFilePathArray[ctrB].Path;
						secondCardJson.originalname=library.tmpFilePathArray[ctrB].Originalname;
						secondCardJson.mimetype=library.tmpFilePathArray[ctrB].Mimetype;
						secondCardJson.extension=library.tmpFilePathArray[ctrB].Extension;
					}
				}
				
				var tester=Date.parse(req.body.BirthDay);
				var tLimitFlag=true;
				if(isNaN(tester)){
					tLimitFlag=false;
				}else{
					var tomorrow=new Date();
					tomorrow.setHours(0);
					tomorrow.setMinutes(0);
					tomorrow.setSeconds(0);
					tomorrow.setMilliseconds(0);
					tomorrow.setTime(tomorrow.getTime()+86400000);
					if(tester>=tomorrow.getTime()){
						tLimitFlag=false;
					}
				}
				
				var emailFlag=false;
				if(req.body.Email.search(/^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/)>-1){
					emailFlag=true;
				}

				if((tLimitFlag)&&(emailFlag)&&(library.checkSsnID(req.body.IdCardNumber))&&(!ifIdCardNumberExist)&&(fileFlag1)&&(fileFlag2)){
					Users.findOne({Usnl:req.body.Username.toLowerCase()}).exec(function (err, user){
						if (err) {
							console.log(err);
							res.redirect('/message?content='+encodeURIComponent('錯誤'));
						}else{
							if(user){
								res.redirect('/message?content='+encodeURIComponent('此帳號已存在!'));
							}else{
								if(req.body.Password===req.body.Password2nd){
									if((req.body.Username.search(/[^\w]/ig)===-1)&&(req.body.Password.search(/[^\w]/ig)===-1)&&(req.body.Password.length>6)){
										var toCreate = new Users();
										toCreate.Username=req.body.Username;
										toCreate.Usnl=req.body.Username.toLowerCase();
										toCreate.Password=req.body.Password;
										toCreate.Name=req.body.Name;
										toCreate.Email=req.body.Email;
										toCreate.Gender=req.body.Gender;
										toCreate.BirthDay=req.body.BirthDay;
										toCreate.IdCardNumber=req.body.IdCardNumber.toUpperCase();
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
												toCreateInner.MoneyInBankAccount=500000;
												toCreateInner.OwnedBy=newCreate._id;
										
												toCreateInner.save(function (err,newCreateInner) {
													if (err){
														console.log(err);
														res.redirect('/message?content='+encodeURIComponent('錯誤'));
													}else{
														var filesArray=[];
															
														idCardJson.flag=true;
														idCardJson.category='IdCard';
														filesArray.push(idCardJson);
														
														secondCardJson.flag=true;
														secondCardJson.category='SecondCard';
														filesArray.push(secondCardJson);
														
														library.gridCreator(newCreate._id,newCreate.Username,filesArray,function(){
															library.mailValid(newCreate._id,req,callback,callback);
														},function(){
															res.redirect('/message?content='+encodeURIComponent('檔案新建失敗'));
														});
													}
												});
											}
										});
									}else{
										res.redirect('/message?content='+encodeURIComponent('帳號名稱或密碼格式不合規定!'));
									}
								}else{
									res.redirect('/message?content='+encodeURIComponent('兩次密碼輸入不一致!'));
								}
							}
						}
					});
				}else{
					if((!fileFlag1)||(!fileFlag2)){
						res.redirect('/message?content='+encodeURIComponent('上傳檔案資料錯誤或過期!'));
					}else if(ifIdCardNumberExist){
						res.redirect('/message?content='+encodeURIComponent('身分證字號已存在!'));
					}else{
						res.redirect('/message?content='+encodeURIComponent('資料填寫不全或錯誤!'));
					}
				}
			}
		});
	}else{
		res.redirect('/message?content='+encodeURIComponent('資料填寫不全或錯誤!'));
	}
}

module.exports = router;