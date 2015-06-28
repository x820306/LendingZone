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
	library.formIdfrArray.push({Idfr:tempIdfr,SaveT:Date.now()});
	
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
		F3:req.body.MonthPeriodAcceptedLowest,
		F4:req.body.MonthPeriodAccepted,
		F5:req.body.StoryTitle,
		F6:req.body.Category,
		F7:req.body.Story,
		F8:req.body.TimeLimit
	};
	
	var json={FormContent:formContent,Target:target,Message:message};
	var string=JSON.stringify(json);
	
	req.flash('borrowForm',string);
	res.redirect(req.get('referer'));
}

router.post('/borrowCreate',library.loginFormChecker, library.ensureAuthenticated, function(req, res) {
	var Idfr=parseInt(req.body.Idfr);
	var passFlag=false;
	if(Idfr>0){
		for(i=0;i<library.formIdfrArray.length;i++){
			if(Idfr===library.formIdfrArray[i].Idfr){
				passFlag=true;
				break;
			}
		}
	}
	
	if(passFlag){
		var ifTitleRepeat=false;
		var titleTester;
		if(sanitizer.sanitize(req.body.StoryTitle.trim())===''){
			titleTester=null
		}else{
			titleTester=sanitizer.sanitize(req.body.StoryTitle.trim());
		}
		
		Borrows.findOne({"StoryTitle":titleTester}).exec(function (err, borrow){
			if (err) {
				console.log(err);
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}else{
				if(borrow){
					ifTitleRepeat=true;
				}
				var nowMoney=parseInt(sanitizer.sanitize(req.body.MoneyToBorrow.trim()));
				var rate=parseFloat(sanitizer.sanitize(req.body.MaxInterestRateAccepted.trim()))/100;
				var month=parseInt(sanitizer.sanitize(req.body.MonthPeriodAccepted.trim()));
				
				var errorTarget=[];
				var errorMessage=[];
				for(i=0;i<8;i++){
					errorTarget.push(false);
					errorMessage.push('');
				}
				
				if(sanitizer.sanitize(req.body.MoneyToBorrow.trim())===''){
					errorTarget[0]=true;
					errorMessage[0]='必要參數未填!';
				}else if(isNaN(nowMoney)){
					errorTarget[0]=true;
					errorMessage[0]='非數字參數!';
				}else if((nowMoney<5000)||(nowMoney>150000)){
					errorTarget[0]=true;
					errorMessage[0]='錯誤參數!';
				}
				
				if(sanitizer.sanitize(req.body.MaxInterestRateAccepted.trim())===''){
					errorTarget[1]=true;
					errorMessage[1]='必要參數未填!';
				}else if(isNaN(rate)){
					errorTarget[1]=true;
					errorMessage[1]='非數字參數!';
				}else if((rate<(0.0001+library.serviceChargeRate))||(rate>0.99)){
					errorTarget[1]=true;
					errorMessage[1]='錯誤參數!';
				}
				
				if(sanitizer.sanitize(req.body.MonthPeriodAcceptedLowest.trim())===''){
					errorTarget[2]=true;
					errorMessage[2]='必要參數未填!';
				}else if(isNaN(month)){
					errorTarget[2]=true;
					errorMessage[2]='非數字參數!';
				}else if((month<1)||(month>36)){
					errorTarget[2]=true;
					errorMessage[2]='錯誤參數!';
				}
				
				if(sanitizer.sanitize(req.body.MonthPeriodAccepted.trim())===''){
					errorTarget[3]=true;
					errorMessage[3]='必要參數未填!';
				}else if(isNaN(month)){
					errorTarget[3]=true;
					errorMessage[3]='非數字參數!';
				}else if((month<1)||(month>36)){
					errorTarget[3]=true;
					errorMessage[3]='錯誤參數!';
				}
				
				if((ifTitleRepeat)||(sanitizer.sanitize(req.body.StoryTitle.trim())==='無標題')){
					errorTarget[4]=true;
					errorMessage[4]='故事標題重覆或不合規定!';
				}
				
				if(sanitizer.sanitize(req.body.Story.trim())==='無內容'){
					errorTarget[6]=true;
					errorMessage[6]='故事內容不合規定!';
				}
				
				var tLimitValue=sanitizer.sanitize(req.body.TimeLimit.trim());
				if(tLimitValue!==''){
					var tester=Date.parse(tLimitValue);
					if(isNaN(tester)){
						errorTarget[7]=true;
						errorMessage[7]='日期格式錯誤!';
					}else{
						var tomorrow=new Date();
						tomorrow.setHours(0);
						tomorrow.setMinutes(0);
						tomorrow.setSeconds(0);
						tomorrow.setMilliseconds(0);
						tomorrow.setTime(tomorrow.getTime()+86400000);
						if(tester<tomorrow.getTime()){
							errorTarget[7]=true;
							errorMessage[7]='日期不合理!';
						}
					}
				}
				
				var valiFlag=true;
				for(i=0;i<errorTarget.length;i++){
					if(errorTarget[i]){
						valiFlag=false;
						break;
					}
				}
				
				if(valiFlag){
					var periodLow=parseInt(sanitizer.sanitize(req.body.MonthPeriodAcceptedLowest.trim()));
					var periodHigh=parseInt(sanitizer.sanitize(req.body.MonthPeriodAccepted.trim()));
					var temp;
					if(periodLow>periodHigh){
						temp=periodLow;
						periodLow=periodHigh;
						periodHigh=temp;
					}
					
					var toCreate = new Borrows();
					toCreate.MoneyToBorrow = parseInt(sanitizer.sanitize(req.body.MoneyToBorrow.trim()));
					toCreate.MaxInterestRateAccepted = parseFloat(sanitizer.sanitize(req.body.MaxInterestRateAccepted.trim()))/100;
					toCreate.MonthPeriodAcceptedLowest = periodLow;
					toCreate.MonthPeriodAccepted = periodHigh;
					if(sanitizer.sanitize(req.body.TimeLimit.trim())!==''){
						toCreate.TimeLimit = sanitizer.sanitize(req.body.TimeLimit.trim());
					}else{
						var tempDate=new Date();
						tempDate.setTime(tempDate.getTime()+1000*60*60*24*3);
						toCreate.TimeLimit = tempDate;
					}
					toCreate.Category = sanitizer.sanitize(req.body.Category.trim());
					toCreate.StoryTitle = sanitizer.sanitize(req.body.StoryTitle.trim());
					toCreate.Story = sanitizer.sanitize(req.body.Story.trim());
					toCreate.CreatedBy =req.user._id;

					toCreate.save(function(err, newCreate) {
						if (err) {
							res.redirect('/message?content='+encodeURIComponent('新建失敗!'));
						} else {
							var ctr=-1;
							if(Idfr>0){
								for(i=0;i<library.formIdfrArray.length;i++){
									if(Idfr===library.formIdfrArray[i].Idfr){
										ctr=i;
										break;
									}
								}
							}
							if(ctr>-1){
								library.formIdfrArray.splice(ctr, 1);
							}
							res.redirect('/borrower/borrowSuccess');
						}
					});
				}else{
					redirector(req,res,errorTarget,errorMessage);
				}	
			}
		});
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