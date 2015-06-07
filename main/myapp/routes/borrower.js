var library = require('./library.js');
var mongoose = require('mongoose');
var Borrows = mongoose.model('Borrows');
var Users = mongoose.model('Users');
var sanitizer = require('sanitizer');

var express = require('express');
var router = express.Router();

router.get('/borrowPage',library.loginFormChecker, library.ensureAuthenticated, library.newMsgChecker, function(req, res) {
	var stringArrayFlash=req.flash('borrowForm');
	var borrowFormJson=null;
	if(stringArrayFlash.length>0){
		borrowFormJson=JSON.parse(stringArrayFlash[0]);
	}
	
	library.formIdfrCtr+=1;
	var tempIdfr=library.formIdfrCtr;
	library.formIdfrArray.push(tempIdfr);
	library.setFormTimer();
	
	res.render('borrowPage', {
		lgfJSON:req.loginFormJson,
		newlrmNum: req.newlrmNumber,
		newlsmNum: req.newlsmNumber,
		userName: req.user.Username,
		scr:library.serviceChargeRate,
		idfr:tempIdfr,
		bfJSON:borrowFormJson
	});
});

function redirector(req,res,target,message){
	var formContent={
		F1:req.body.MoneyToBorrow,
		F2:req.body.MaxInterestRateAccepted,
		F3:req.body.MonthPeriodAccepted,
		F4:req.body.StoryTitle,
		F5:req.body.Category,
		F6:req.body.Story,
		F7:req.body.TimeLimit
	};
	
	var json={FormContent:formContent,Target:target,Message:message};
	var string=JSON.stringify(json);
	
	req.flash('borrowForm',string);
	res.redirect(req.get('referer'));
}

router.post('/borrowCreate',library.loginFormChecker, library.ensureAuthenticated, function(req, res) {
	var Idfr=parseInt(req.body.Idfr);
	var passFlag=false;
	var ctr=-1;
	if(Idfr>0){
		for(i=0;i<library.formIdfrArray.length;i++){
			if(Idfr==library.formIdfrArray[i]){
				ctr=i;
				passFlag=true;
				break;
			}
		}
	}
	
	if(passFlag){
		var nowMoney=parseInt(sanitizer.sanitize(req.body.MoneyToBorrow.trim()));
		var rate=parseFloat(sanitizer.sanitize(req.body.MaxInterestRateAccepted.trim()))/100;
		var month=parseInt(sanitizer.sanitize(req.body.MonthPeriodAccepted.trim()));
		
		var errorTarget=[];
		var errorMessage=[];
		for(i=0;i<3;i++){
			errorTarget.push(false);
			errorMessage.push('');
		}
		
		if(sanitizer.sanitize(req.body.MoneyToBorrow.trim())==''){
			errorTarget[0]=true;
			errorMessage[0]='必要參數未填!';
		}else if(isNaN(nowMoney)){
			errorTarget[0]=true;
			errorMessage[0]='非數字參數!';
		}else if((nowMoney<5000)||(nowMoney>150000)){
			errorTarget[0]=true;
			errorMessage[0]='錯誤參數!';
		}
		
		if(sanitizer.sanitize(req.body.MaxInterestRateAccepted.trim())==''){
			errorTarget[1]=true;
			errorMessage[1]='必要參數未填!';
		}else if(isNaN(rate)){
			errorTarget[1]=true;
			errorMessage[1]='非數字參數!';
		}else if((rate<=library.serviceChargeRate)||(rate>0.99)){
			errorTarget[1]=true;
			errorMessage[1]='錯誤參數!';
		}
		
		if(sanitizer.sanitize(req.body.MonthPeriodAccepted.trim())==''){
			errorTarget[2]=true;
			errorMessage[2]='必要參數未填!';
		}else if(isNaN(month)){
			errorTarget[2]=true;
			errorMessage[2]='非數字參數!';
		}else if((month<1)||(month>36)){
			errorTarget[2]=true;
			errorMessage[2]='錯誤參數!';
		}
		
		var valiFlag=true;
		for(i=0;i<errorTarget.length;i++){
			if(errorTarget[i]){
				valiFlag=false;
				break;
			}
		}
		
		if(valiFlag){
			var toCreate = new Borrows();
			toCreate.MoneyToBorrow = parseInt(sanitizer.sanitize(req.body.MoneyToBorrow.trim()));
			toCreate.MaxInterestRateAccepted = parseFloat(sanitizer.sanitize(req.body.MaxInterestRateAccepted.trim()))/100;
			toCreate.MonthPeriodAccepted = parseInt(sanitizer.sanitize(req.body.MonthPeriodAccepted.trim()));
			if(sanitizer.sanitize(req.body.TimeLimit.trim())!=''){
				toCreate.TimeLimit = sanitizer.sanitize(req.body.TimeLimit.trim());
			}else{
				var tempDate=new Date();
				tempDate.setTime(tempDate.getTime()+1000*60*60*24*3);
				toCreate.TimeLimit = tempDate;
			}
			toCreate.Category = sanitizer.sanitize(req.body.Category.trim());
			if (sanitizer.sanitize(req.body.StoryTitle.trim()) != '') {
				toCreate.StoryTitle = sanitizer.sanitize(req.body.StoryTitle.trim());
			}
			if (sanitizer.sanitize(req.body.Story.trim()) != '') {
				toCreate.Story = sanitizer.sanitize(req.body.Story.trim());
			}
			toCreate.CreatedBy =req.user._id;
			toCreate.Level = req.user.Level;

			toCreate.save(function(err, newCreate) {
				if (err) {
					res.redirect('/message?content='+encodeURIComponent('新建失敗!'));
				} else {
					if(ctr>-1){
						library.formIdfrArray.splice(ctr, 1);
					}
					res.redirect('/borrower/borrowSuccess');
				}
			});
		}else{
			redirector(req,res,errorTarget,errorMessage);
		}	
	}else{
		res.redirect('/message?content='+encodeURIComponent('表單已成功提交過或過期，請重新整理頁面！'));
	}
});

// this is the basic type when page need to ensure authenticated. U can try this by /borrower/borrowerExample2
router.get('/checkMatch',library.loginFormChecker, library.ensureAuthenticated, library.newMsgChecker, function(req, res) {
	res.render('checkMatch', {
		lgfJSON:req.loginFormJson,
		newlrmNum: req.newlrmNumber,
		newlsmNum: req.newlsmNumber,
		userName: req.user.Username
	});
});

// this is the basic type when page no need to ensure authenticated. U can try this by /borrower/borrowerExample
router.get('/borrowerPanel',library.loginFormChecker, library.ensureAuthenticated, library.newMsgChecker, function(req, res) {
	res.render('borrowerPanel', {
		lgfJSON:req.loginFormJson,
		newlrmNum: req.newlrmNumber,
		newlsmNum: req.newlsmNumber,
		userName: req.user.Username
	});
});

// this is the basic type when page no need to ensure authenticated. U can try this by /borrower/borrowerExample
router.get('/borrowerConfirmedMatch',library.loginFormChecker, library.ensureAuthenticated, library.newMsgChecker, function(req, res) {
	res.render('borrowerConfirmedMatch', {
		lgfJSON:req.loginFormJson,
		newlrmNum: req.newlrmNumber,
		newlsmNum: req.newlsmNumber,
		userName: req.user.Username
	});
});

// this is the basic type when page no need to ensure authenticated. U can try this by /borrower/borrowerExample
router.get('/borrowSuccess',library.loginFormChecker, library.ensureAuthenticated, library.newMsgChecker, function(req, res) {
	res.render('borrowSuccess', {
		lgfJSON:req.loginFormJson,
		newlrmNum: req.newlrmNumber,
		newlsmNum: req.newlsmNumber,
		userName: req.user.Username
	});
});
module.exports = router;