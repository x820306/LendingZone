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
	if(typeof(req.body.Idfr) === 'string'){
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
			
			if(typeof(req.body.StoryTitle) === 'string'){
				req.body.StoryTitle=sanitizer.sanitize(req.body.StoryTitle.trim());
				if(req.body.StoryTitle===''){
					titleTester=null;
				}else{
					titleTester=req.body.StoryTitle;
				}
			}else{
				titleTester=null;
			}
			
			Borrows.findOne({"StoryTitle":titleTester}).exec(function (err, borrow){
				if (err) {
					console.log(err);
					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
				}else{
					if(borrow){
						ifTitleRepeat=true;
					}

					var errorTarget=[];
					var errorMessage=[];
					for(i=0;i<8;i++){
						errorTarget.push(false);
						errorMessage.push('');
					}
					
					if(typeof(req.body.MoneyToBorrow) === 'string'){
						req.body.MoneyToBorrow=sanitizer.sanitize(req.body.MoneyToBorrow.trim());
						var nowMoney=parseInt(req.body.MoneyToBorrow);
						
						if(req.body.MoneyToBorrow===''){
							errorTarget[0]=true;
							errorMessage[0]='必要參數未填!';
						}else if(isNaN(nowMoney)){
							errorTarget[0]=true;
							errorMessage[0]='非數字參數!';
						}else if((nowMoney<5000)||(nowMoney>150000)){
							errorTarget[0]=true;
							errorMessage[0]='錯誤參數!';
						}
					}else{
						req.body.MoneyToBorrow='';
						errorTarget[0]=true;
						errorMessage[0]='未送出!';
					}
					
					if(typeof(req.body.MaxInterestRateAccepted) === 'string'){
						req.body.MaxInterestRateAccepted=sanitizer.sanitize(req.body.MaxInterestRateAccepted.trim());
						var rate=parseFloat(req.body.MaxInterestRateAccepted)/100;
						
						if(req.body.MaxInterestRateAccepted===''){
							errorTarget[1]=true;
							errorMessage[1]='必要參數未填!';
						}else if(isNaN(rate)){
							errorTarget[1]=true;
							errorMessage[1]='非數字參數!';
						}else if((rate<(0.0001+library.serviceChargeRate))||(rate>0.99)){
							errorTarget[1]=true;
							errorMessage[1]='錯誤參數!';
						}
					}else{
						req.body.MaxInterestRateAccepted='';
						errorTarget[1]=true;
						errorMessage[1]='未送出!';
					}
					
					if(typeof(req.body.MonthPeriodAcceptedLowest) === 'string'){
						req.body.MonthPeriodAcceptedLowest=sanitizer.sanitize(req.body.MonthPeriodAcceptedLowest.trim());
						var monthLowest=parseFloat(req.body.MonthPeriodAcceptedLowest);
						
						if(req.body.MonthPeriodAcceptedLowest===''){
							req.body.MonthPeriodAcceptedLowest='1';
							errorTarget[2]=true;
							errorMessage[2]='必要參數未填!';
						}else if(isNaN(monthLowest)){
							req.body.MonthPeriodAcceptedLowest='1';
							errorTarget[2]=true;
							errorMessage[2]='非數字參數!';
						}else if(Math.round(monthLowest) !== monthLowest){
							req.body.MonthPeriodAcceptedLowest='1';
							errorTarget[2]=true;
							errorMessage[2]='錯誤參數!';
						}else if((monthLowest<1)||(monthLowest>36)){
							req.body.MonthPeriodAcceptedLowest='1';
							errorTarget[2]=true;
							errorMessage[2]='錯誤參數!';
						}
					}else{
						req.body.MonthPeriodAcceptedLowest='1';
						errorTarget[2]=true;
						errorMessage[2]='未送出!';
					}
					
					if(typeof(req.body.MonthPeriodAccepted) === 'string'){
						req.body.MonthPeriodAccepted=sanitizer.sanitize(req.body.MonthPeriodAccepted.trim());
						var month=parseFloat(req.body.MonthPeriodAccepted);
						
						if(req.body.MonthPeriodAccepted===''){
							req.body.MonthPeriodAccepted='1';
							errorTarget[3]=true;
							errorMessage[3]='必要參數未填!';
						}else if(isNaN(month)){
							req.body.MonthPeriodAccepted='1';
							errorTarget[3]=true;
							errorMessage[3]='非數字參數!';
						}else if(Math.round(month) !== month){
							req.body.MonthPeriodAccepted='1';
							errorTarget[3]=true;
							errorMessage[3]='錯誤參數!';
						}else if((month<1)||(month>36)){
							req.body.MonthPeriodAccepted='1';
							errorTarget[3]=true;
							errorMessage[3]='錯誤參數!';
						}
					}else{
						req.body.MonthPeriodAccepted='1';
						errorTarget[3]=true;
						errorMessage[3]='未送出!';
					}
					
					if(typeof(req.body.StoryTitle) === 'string'){
						if(req.body.StoryTitle==='無標題'){
							errorTarget[4]=true;
							errorMessage[4]='故事標題不合規定!';
						}else if(ifTitleRepeat){
							errorTarget[4]=true;
							errorMessage[4]='故事標題重覆!';
						}		
					}else{
						req.body.StoryTitle='';
						errorTarget[4]=true;
						errorMessage[4]='未送出!';
					}
					
					if(typeof(req.body.Category) === 'string'){
						req.body.Category=sanitizer.sanitize(req.body.Category.trim());	
						if(req.body.Category===''){
							req.body.Category='general';
							errorTarget[5]=true;
							errorMessage[5]='必要參數未填!';
						}else if((req.body.Category!=='general')&&(req.body.Category!=='education')&&(req.body.Category!=='family')&&(req.body.Category!=='tour')){
							req.body.Category='general';
							errorTarget[5]=true;
							errorMessage[5]='錯誤參數!';
						}					
					}else{
						req.body.Category='general';
						errorTarget[5]=true;
						errorMessage[5]='未送出!';
					}
					
					if(typeof(req.body.Story) === 'string'){
						req.body.Story=sanitizer.sanitize(req.body.Story.trim());
						if(req.body.Story==='無內容'){
							errorTarget[6]=true;
							errorMessage[6]='故事內容不合規定!';
						}
					}else{
						req.body.Story='';
						errorTarget[6]=true;
						errorMessage[6]='未送出!';
					}
					
					if(typeof(req.body.TimeLimit) === 'string'){
						req.body.TimeLimit=sanitizer.sanitize(req.body.TimeLimit.trim());
						var tLimitValue=req.body.TimeLimit;
						
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
					}else{
						req.body.TimeLimit='';
						errorTarget[7]=true;
						errorMessage[7]='未送出!';
					}
					
					var valiFlag=true;
					for(i=0;i<errorTarget.length;i++){
						if(errorTarget[i]){
							valiFlag=false;
							break;
						}
					}
					
					if(valiFlag){
						var periodLow=parseInt(req.body.MonthPeriodAcceptedLowest);
						var periodHigh=parseInt(req.body.MonthPeriodAccepted);
						var temp;
						if(periodLow>periodHigh){
							temp=periodLow;
							periodLow=periodHigh;
							periodHigh=temp;
						}
						
						var toCreate = new Borrows();
						toCreate.MoneyToBorrow = parseInt(req.body.MoneyToBorrow);
						toCreate.MaxInterestRateAccepted = parseFloat(req.body.MaxInterestRateAccepted)/100;
						toCreate.MonthPeriodAcceptedLowest = periodLow;
						toCreate.MonthPeriodAccepted = periodHigh;
						if(req.body.TimeLimit!==''){
							toCreate.TimeLimit = req.body.TimeLimit;
						}else{
							var tempDate=new Date();
							tempDate.setTime(tempDate.getTime()+1000*60*60*24*3);
							toCreate.TimeLimit = tempDate;
						}
						toCreate.Category = req.body.Category;
						toCreate.StoryTitle = req.body.StoryTitle;
						toCreate.Story = req.body.Story;
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
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
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