var library=require( './library.js' );
var mongoose = require('mongoose');
var Users  = mongoose.model('Users');
var BankAccounts = mongoose.model('BankAccounts');
var sanitizer = require('sanitizer'); 

var express = require('express');
var router = express.Router();

// U can try this by /signup
router.get('/',library.newMsgChecker, function (req, res) {
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	res.redirect('/signup/success');
});

router.get('/profile', library.ensureAuthenticated,library.newMsgChecker, function (req, res) {
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
							res.render('profile',{newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,user:foundUser,account:foundAccount});
						}
					}
				});
			}
		}
	});
});

router.get('/changePWpage',library.ensureAuthenticated,library.newMsgChecker, function (req, res) {
	res.render('changePWpage',{newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username});
});

router.post('/changeData', library.ensureAuthenticated, function (req, res) {
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
router.get('/cardData',library.newMsgChecker, function (req, res) {
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	
	//get data from database and process them here
	
	//pass what u get from database and send them into ejs in this line
	res.render('cardData_1',{newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst});
});

// this is the basic type when page no need to ensure authenticated. U can try this by /signup/signupExample
router.post('/checkPro',library.newMsgChecker, function (req, res) {
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	
	res.render('checkPro_1',{newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst,BankAccountNumber:req.body.cardIpt,BankAccountPassword:req.body.cardPwdIpt});
});

// this is the basic type when page no need to ensure authenticated. U can try this by /signup/signupExample
router.get('/newAcc',library.newMsgChecker, function (req, res) {
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	
	//get data from database and process them here
	
	//pass what u get from database and send them into ejs in this line
	res.render('newAcc_2',{newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst});
});

// this is the basic type when page no need to ensure authenticated. U can try this by /signup/signupExample
router.post('/apply',library.newMsgChecker, function (req, res) {
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}

	res.render('apply_1',{newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst, Name:req.body.nameIpt, Email:req.body.emailIpt, Gender:req.body.genderIpt,
		BirthDay:req.body.birthIpt, Phone:req.body.telIpt, Address:req.body.addrIpt,IdCardNumber:req.body.ssnIpt,IdCard:req.body.IdCard,IdCardType:req.body.IdCardType,SecondCard:req.body.SecondCard,SecondCardType:req.body.SecondCardType,
		BankAccountNumber:req.body.BankAccountNumber,BankAccountPassword:req.body.BankAccountPassword});
});

router.post('/_apply',library.newMsgChecker, function (req, res) {
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
	
	//pass what u get from database and send them into ejs in this line
	res.render('apply_2',{newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst, Name:req.body.nameIpt, Email:req.body.emailIpt, Gender:req.body.genderIpt,
		BirthDay:req.body.birthIpt, Phone:req.body.telIpt, Address:req.body.addrIpt,IdCardNumber:req.body.ssnIpt,IdCard:IdCardBase64,IdCardType:varIdCardType,SecondCard:SecondCardBase64,SecondCardType:varSecondCardType,
		BankAccountNumber:req.body.cardIpt,BankAccountPassword:req.body.cardPwdIpt});
});

// this is the basic type when page no need to ensure authenticated. U can try this by /signup/signupExample
router.post('/community',library.newMsgChecker, function (req, res) {
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	userCreator(req,res,function (){
		res.render('community_1',{newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst});
	});
});

// this is the basic type when page no need to ensure authenticated. U can try this by /signup/signupExample
router.post('/_community',library.newMsgChecker, function (req, res) {
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	userCreator(req,res,function (){
		res.render('community_2',{newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst});
	});
});

// this is the basic type when page no need to ensure authenticated. U can try this by /signup/signupExample
router.get('/success',library.newMsgChecker, function (req, res) {
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	
	//get data from database and process them here
	
	//pass what u get from database and send them into ejs in this line
	res.render('success_1',{newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst});
});

// this is the basic type when page no need to ensure authenticated. U can try this by /signup/signupExample
router.get('/_success',library.newMsgChecker, function (req, res) {
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	
	//get data from database and process them here
	
	//pass what u get from database and send them into ejs in this line
	res.render('success_2',{newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst});
});

// this is the basic type when page no need to ensure authenticated. U can try this by /signup/signupExample

router.get('/signupExample',library.newMsgChecker, function (req, res) {
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	
	//get data from database and process them here
	
	//pass what u get from database and send them into ejs in this line
	res.render('ejsExample',{newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst});
});

// this is the basic type when page need to ensure authenticated. U can try this by /signup/signupExample2
router.get('/signupExample2',library.ensureAuthenticated,library.newMsgChecker, function (req, res) {
	//get data from database and process them here
	
	//pass what u get from database and send them into ejs in this line
	res.render('ejsExample',{newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username});
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
						if((sanitizer.sanitize(req.body.Password.trim()).search(/[^\w\.\/]/ig)==-1)&&(sanitizer.sanitize(req.body.Password.trim()).length>=6)){
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
							res.redirect('/message?content='+encodeURIComponent('密碼格式不合規定!'));
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