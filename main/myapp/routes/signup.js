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
	
	//get data from database and process them here
	
	//pass what u get from database and send them into ejs in this line
	res.render('ejsExample',{newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst});
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
	var varIdCardType=req.files.ssnImg.mimetype;
	var varSecondCardType=req.files.cerImg.mimetype;
	var IdCardBase64=req.files.ssnImg.buffer.toString('base64');
	var SecondCardBase64=req.files.cerImg.buffer.toString('base64');
	
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
	var temp=sanitizer.sanitize(req.body.Username);
	Users.findOne({Username:temp}).exec(function (err, user){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤'));
		}else{
			if(user){
				res.redirect('/message?content='+encodeURIComponent('此帳號已存在!'));
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
				
				toCreate.IdCardType=req.body.IdCardType;
				toCreate.SecondCardType=req.body.SecondCardType;
				toCreate.IdCard=new Buffer(req.body.IdCard, 'base64');
				toCreate.SecondCard=new Buffer(req.body.SecondCard, 'base64');
				
				toCreate.save(function (err,newCreate) {
					if (err){
						console.log(err);
						res.redirect('/message?content='+encodeURIComponent('錯誤'));
					}else{
						var toCreateInner = new BankAccounts();
						toCreateInner.BankAccountNumber=sanitizer.sanitize(req.body.BankAccountNumber);
						toCreateInner.BankAccountPassword=sanitizer.sanitize(req.body.BankAccountPassword);
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
			}
		}
	});
}

module.exports = router;