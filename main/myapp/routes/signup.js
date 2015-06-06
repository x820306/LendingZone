var library=require( './library.js' );
var mongoose = require('mongoose');
var Users  = mongoose.model('Users');
var BankAccounts = mongoose.model('BankAccounts');
var sanitizer = require('sanitizer'); 

var express = require('express');
var router = express.Router();

router.get('/profile',library.loginFormChecker,library.ensureAuthenticated,library.newMsgChecker, function (req, res) {
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
							res.render('profile',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,user:foundUser,account:foundAccount});
						}
					}
				});
			}
		}
	});
});

router.get('/changePWpage',library.loginFormChecker,library.ensureAuthenticated,library.newMsgChecker, function (req, res) {
	res.render('changePWpage',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username});
});

router.post('/changeData',library.loginFormChecker, library.ensureAuthenticated, function (req, res) {
	if((sanitizer.sanitize(req.body.Name.trim())!='')&&(sanitizer.sanitize(req.body.Email.trim())!='')&&(sanitizer.sanitize(req.body.Gender.trim())!='')&&(sanitizer.sanitize(req.body.BirthDay.trim())!='')&&(sanitizer.sanitize(req.body.IdCardNumber.trim())!='')&&(sanitizer.sanitize(req.body.Phone.trim())!='')&&(sanitizer.sanitize(req.body.Address.trim())!='')&&(sanitizer.sanitize(req.body.BankAccountNumber.trim())!='')&&(sanitizer.sanitize(req.body.BankAccountPassword.trim())!='')){
		Users.findById(req.user._id).exec(function (err, user){
			if (err) {
				console.log(err);
				res.redirect('/message?content='+encodeURIComponent('錯誤'));
			}else{
				if(!user){
					res.redirect('/message?content='+encodeURIComponent('錯誤'));
				}else{
					user.Name=sanitizer.sanitize(req.body.Name.trim());
					user.Email=sanitizer.sanitize(req.body.Email.trim());
					user.Gender=sanitizer.sanitize(req.body.Gender.trim());
					user.BirthDay=sanitizer.sanitize(req.body.BirthDay.trim());
					user.IdCardNumber=sanitizer.sanitize(req.body.IdCardNumber.trim());
					user.Phone=sanitizer.sanitize(req.body.Phone.trim());
					user.Address=sanitizer.sanitize(req.body.Address.trim());
					user.Updated=Date.now();
					
					if(req.files.IdCard){
						user.IdCardType=req.files.IdCard.mimetype;
						user.IdCard=req.files.IdCard.buffer;
					}
					if(req.files.SecondCard){
						user.SecondCardType=req.files.SecondCard.mimetype;
						user.SecondCard=req.files.SecondCard.buffer;
					}
					
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
										account.BankAccountNumber=sanitizer.sanitize(req.body.BankAccountNumber.trim());
										account.BankAccountPassword=sanitizer.sanitize(req.body.BankAccountPassword.trim());
										account.save(function (err,newUpdatedInner) {
											if (err){
												console.log(err);
												res.redirect('/message?content='+encodeURIComponent('錯誤'));
											}else{
												res.redirect('/signup/profile');
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
		res.redirect('/message?content='+encodeURIComponent('資料填寫不全！'));
	}
});

// this is the basic type when page no need to ensure authenticated. U can try this by /signup/signupExample
router.get('/cardData',library.loginFormChecker,library.newMsgChecker, function (req, res) {
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	
	library.formIdfrCtr+=1;
	var tempIdfr=library.formIdfrCtr;
	library.formIdfrArray.push(tempIdfr);
	library.setFormTimer();
	
	//get data from database and process them here
	
	//pass what u get from database and send them into ejs in this line
	res.render('cardData_1',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst,formSession1:tempIdfr});
});

// this is the basic type when page no need to ensure authenticated. U can try this by /signup/signupExample
router.post('/checkPro',library.loginFormChecker,library.newMsgChecker, function (req, res) {
	var Idfr=parseInt(req.body.FormSession1);
	var passFlag=false;
	if(Idfr>0){
		for(i=0;i<library.formIdfrArray.length;i++){
			if(Idfr==library.formIdfrArray[i]){
				passFlag=true;
				break;
			}
		}
	}
	
	if(passFlag){
		var auRst=null;
		if(req.isAuthenticated()){
			auRst=req.user.Username;
		}
		
		library.formIdfrCtr+=1;
		var tempIdfr=library.formIdfrCtr;
		library.formIdfrArray.push(tempIdfr);
		library.setFormTimer();
		
		res.render('checkPro_1',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst,BankAccountNumber:req.body.cardIpt,BankAccountPassword:req.body.cardPwdIpt,formSession1:req.body.FormSession1,formSession2:tempIdfr});
	}else{
		res.redirect('/signupTest');
	}
});

// this is the basic type when page no need to ensure authenticated. U can try this by /signup/signupExample
router.get('/newAcc',library.loginFormChecker,library.newMsgChecker, function (req, res) {
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	
	library.formIdfrCtr+=1;
	var tempIdfr=library.formIdfrCtr;
	library.formIdfrArray.push(tempIdfr);
	library.setFormTimer();
	
	//get data from database and process them here
	
	//pass what u get from database and send them into ejs in this line
	res.render('newAcc_2',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst,formSession1:tempIdfr});
});

// this is the basic type when page no need to ensure authenticated. U can try this by /signup/signupExample
router.post('/apply',library.loginFormChecker,library.newMsgChecker, function (req, res) {
	var Idfr=parseInt(req.body.FormSession2);
	var passFlag=false;
	if(Idfr>0){
		for(i=0;i<library.formIdfrArray.length;i++){
			if(Idfr==library.formIdfrArray[i]){
				passFlag=true;
				break;
			}
		}
	}
	
	if(passFlag){
		var auRst=null;
		if(req.isAuthenticated()){
			auRst=req.user.Username;
		}

		library.formIdfrCtr+=1;
		var tempIdfr=library.formIdfrCtr;
		library.formIdfrArray.push(tempIdfr);
		library.setFormTimer();
		
		res.render('apply_1',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst, Name:req.body.nameIpt, Email:req.body.emailIpt, Gender:req.body.genderIpt,
			BirthDay:req.body.birthIpt, Phone:req.body.telIpt, Address:req.body.addrIpt,IdCardNumber:req.body.ssnIpt,IdCard:req.body.IdCard,IdCardType:req.body.IdCardType,SecondCard:req.body.SecondCard,SecondCardType:req.body.SecondCardType,
			BankAccountNumber:req.body.BankAccountNumber,BankAccountPassword:req.body.BankAccountPassword,formSession1:req.body.FormSession1,formSession2:req.body.FormSession2,formSession3:tempIdfr});
	}else{
		res.redirect('/signupTest');
	}
});

router.post('/_apply',library.loginFormChecker,library.newMsgChecker, function (req, res) {
	var Idfr=parseInt(req.body.FormSession1);
	var passFlag=false;
	if(Idfr>0){
		for(i=0;i<library.formIdfrArray.length;i++){
			if(Idfr==library.formIdfrArray[i]){
				passFlag=true;
				break;
			}
		}
	}
	
	if(passFlag){
		var auRst=null;
		if(req.isAuthenticated()){
			auRst=req.user.Username;
		}
		var varIdCardType='';
		if(req.files.ssnImg){
			varIdCardType=req.files.ssnImg.mimetype;
		}
		var varSecondCardType='';
		if(req.files.cerImg){
			varSecondCardType=req.files.cerImg.mimetype;
		}
		var IdCardBase64='';
		if(req.files.ssnImg){
			IdCardBase64=req.files.ssnImg.buffer.toString('base64');
		}
		var SecondCardBase64='';
		if(req.files.cerImg){
			SecondCardBase64=req.files.cerImg.buffer.toString('base64');
		}
		
		library.formIdfrCtr+=1;
		var tempIdfr=library.formIdfrCtr;
		library.formIdfrArray.push(tempIdfr);
		library.setFormTimer();
		
		//pass what u get from database and send them into ejs in this line
		res.render('apply_2',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst, Name:req.body.nameIpt, Email:req.body.emailIpt, Gender:req.body.genderIpt,
			BirthDay:req.body.birthIpt, Phone:req.body.telIpt, Address:req.body.addrIpt,IdCardNumber:req.body.ssnIpt,IdCard:IdCardBase64,IdCardType:varIdCardType,SecondCard:SecondCardBase64,SecondCardType:varSecondCardType,
			BankAccountNumber:req.body.cardIpt,BankAccountPassword:req.body.cardPwdIpt,formSession1:req.body.FormSession1,formSession2:tempIdfr});
	}else{
		res.redirect('/signupTest');
	}
});

// this is the basic type when page no need to ensure authenticated. U can try this by /signup/signupExample
router.post('/community',library.loginFormChecker,library.newMsgChecker, function (req, res) {
	var Idfr1=parseInt(req.body.FormSession1);
	var Idfr2=parseInt(req.body.FormSession2);
	var Idfr3=parseInt(req.body.FormSession3);
	var passFlag=false;
	if(Idfr3>0){
		for(i=0;i<library.formIdfrArray.length;i++){
			if(Idfr3==library.formIdfrArray[i]){
				passFlag=true;
				break;
			}
		}
	}
	
	if(passFlag){
		var auRst=null;
		if(req.isAuthenticated()){
			auRst=req.user.Username;
		}
		userCreator(req,res,function (){
			var ctr1=-1;
			if(Idfr1>0){
				for(i=0;i<library.formIdfrArray.length;i++){
					if(Idfr1==library.formIdfrArray[i]){
						ctr1=i;
						break;
					}
				}
			}
			if(ctr1>-1){
				library.formIdfrArray.splice(ctr1, 1);
			}
			var ctr2=-1;
			if(Idfr2>0){
				for(i=0;i<library.formIdfrArray.length;i++){
					if(Idfr2==library.formIdfrArray[i]){
						ctr2=i;
						break;
					}
				}
			}
			if(ctr2>-1){
				library.formIdfrArray.splice(ctr2, 1);
			}
			var ctr3=-1;
			if(Idfr3>0){
				for(i=0;i<library.formIdfrArray.length;i++){
					if(Idfr3==library.formIdfrArray[i]){
						ctr3=i;
						break;
					}
				}
			}
			if(ctr3>-1){
				library.formIdfrArray.splice(ctr3, 1);
			}
			res.render('community_1',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst});
		});
	}else{
		res.redirect('/signupTest');
	}
});

// this is the basic type when page no need to ensure authenticated. U can try this by /signup/signupExample
router.post('/_community',library.loginFormChecker,library.newMsgChecker, function (req, res) {
	var Idfr1=parseInt(req.body.FormSession1);
	var Idfr2=parseInt(req.body.FormSession2);
	var passFlag=false;
	if(Idfr2>0){
		for(i=0;i<library.formIdfrArray.length;i++){
			if(Idfr2==library.formIdfrArray[i]){
				passFlag=true;
				break;
			}
		}
	}
	
	if(passFlag){
		var auRst=null;
		if(req.isAuthenticated()){
			auRst=req.user.Username;
		}
		userCreator(req,res,function (){
			var ctr1=-1;
			if(Idfr1>0){
				for(i=0;i<library.formIdfrArray.length;i++){
					if(Idfr1==library.formIdfrArray[i]){
						ctr1=i;
						break;
					}
				}
			}
			if(ctr1>-1){
				library.formIdfrArray.splice(ctr1, 1);
			}
			var ctr2=-1;
			if(Idfr2>0){
				for(i=0;i<library.formIdfrArray.length;i++){
					if(Idfr2==library.formIdfrArray[i]){
						ctr2=i;
						break;
					}
				}
			}
			if(ctr2>-1){
				library.formIdfrArray.splice(ctr2, 1);
			}
			res.render('community_2',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst});
		});
	}else{
		res.redirect('/signupTest');
	}
});

// this is the basic type when page no need to ensure authenticated. U can try this by /signup/signupExample
router.get('/success',library.loginFormChecker,library.newMsgChecker, function (req, res) {
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	
	//get data from database and process them here
	
	//pass what u get from database and send them into ejs in this line
	res.render('success_1',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst});
});

// this is the basic type when page no need to ensure authenticated. U can try this by /signup/signupExample
router.get('/_success',library.loginFormChecker,library.newMsgChecker, function (req, res) {
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	
	//get data from database and process them here
	
	//pass what u get from database and send them into ejs in this line
	res.render('success_2',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst});
});

function userCreator(req,res,callback){
	if((sanitizer.sanitize(req.body.Username.trim())!='')&&(sanitizer.sanitize(req.body.Password.trim())!='')&&(sanitizer.sanitize(req.body.Password2nd.trim())!='')&&(sanitizer.sanitize(req.body.Name.trim())!='')&&(sanitizer.sanitize(req.body.Email.trim())!='')&&(sanitizer.sanitize(req.body.Gender.trim())!='')&&(sanitizer.sanitize(req.body.BirthDay.trim())!='')&&(sanitizer.sanitize(req.body.IdCardNumber.trim())!='')&&(sanitizer.sanitize(req.body.Phone.trim())!='')&&(sanitizer.sanitize(req.body.Address.trim())!='')&&(sanitizer.sanitize(req.body.IdCardType.trim())!='')&&(sanitizer.sanitize(req.body.SecondCardType.trim())!='')&&(req.body.IdCard!='')&&(req.body.SecondCard!='')&&(sanitizer.sanitize(req.body.BankAccountNumber.trim())!='')&&(sanitizer.sanitize(req.body.BankAccountPassword.trim())!='')){
		var temp=sanitizer.sanitize(req.body.Username.trim());
		Users.findOne({Username:temp}).exec(function (err, user){
			if (err) {
				console.log(err);
				res.redirect('/message?content='+encodeURIComponent('錯誤'));
			}else{
				if(user){
					res.redirect('/message?content='+encodeURIComponent('此帳號已存在!'));
				}else{
					if(sanitizer.sanitize(req.body.Password.trim())==sanitizer.sanitize(req.body.Password2nd.trim())){
						if((sanitizer.sanitize(req.body.Username.trim()).search(/[^\w\.\/]/ig)==-1)&&(sanitizer.sanitize(req.body.Password.trim()).search(/[^\w\.\/]/ig)==-1)&&(sanitizer.sanitize(req.body.Password.trim()).length>=6)){
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
							
							toCreate.IdCardType=sanitizer.sanitize(req.body.IdCardType.trim());
							toCreate.SecondCardType=sanitizer.sanitize(req.body.SecondCardType.trim());
							toCreate.IdCard=new Buffer(req.body.IdCard, 'base64');
							toCreate.SecondCard=new Buffer(req.body.SecondCard, 'base64');
							
							toCreate.save(function (err,newCreate) {
								if (err){
									console.log(err);
									res.redirect('/message?content='+encodeURIComponent('錯誤'));
								}else{
									var toCreateInner = new BankAccounts();
									toCreateInner.BankAccountNumber=sanitizer.sanitize(req.body.BankAccountNumber.trim());
									toCreateInner.BankAccountPassword=sanitizer.sanitize(req.body.BankAccountPassword.trim());
									toCreateInner.MoneyInBankAccount=500000;
									toCreateInner.OwnedBy=newCreate._id;
							
									toCreateInner.save(function (err,newCreateInner) {
										if (err){
											console.log(err);
											res.redirect('/message?content='+encodeURIComponent('錯誤'));
										}else{
											callback();
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
		res.redirect('/message?content='+encodeURIComponent('資料填寫不全！'));
	}
}

module.exports = router;