var library=require( './library.js' );
var mongoose = require('mongoose');
var Users  = mongoose.model('Users');
var BankAccounts = mongoose.model('BankAccounts');
var sanitizer = require('sanitizer'); 

var express = require('express');
var router = express.Router();
var fs = require('fs');

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
							res.render('profile',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,user:foundUser,account:foundAccount,dcdJSON:dataCDFormJson,mvString:mailValidString});
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
	
	res.render('changePWpage',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,fJSON:formJson});
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
						res.redirect('/signup/profile');
					},function(){
						req.flash('sendValidMail','E-mail認證信已寄往您所填寫的地址：<br><span style="color:red;">'+user.Email+'</span><br>您可於一小時內前往您的信箱點擊連結進行認證或於本頁面重發認證信');
						res.redirect('/signup/profile');
					});
				}else{
					res.redirect('/signup/profile');
				}
			}
		}
	});
});

router.post('/changeData',library.loginFormChecker, library.ensureAuthenticated, function (req, res) {
	
	var errorTarget=[];
	var errorMessage=[];
	for(i=0;i<11;i++){
		errorTarget.push(false);
		errorMessage.push('');
	}
	
	if(sanitizer.sanitize(req.body.Name.trim())===''){
		errorTarget[0]=true;
		errorMessage[0]='必要參數未填!';
	}
	
	if(!req.body.Gender){
		errorTarget[1]=true;
		errorMessage[1]='必要參數未填!';
	}
	
	if(sanitizer.sanitize(req.body.BirthDay.trim())===''){
		errorTarget[2]=true;
		errorMessage[2]='必要參數未填!';
	}else{
		var tester=Date.parse(sanitizer.sanitize(req.body.BirthDay.trim()));
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
	
	if(sanitizer.sanitize(req.body.IdCardNumber.trim())===''){
		errorTarget[3]=true;
		errorMessage[3]='必要參數未填!';
	}else if(!library.checkSsnID(sanitizer.sanitize(req.body.IdCardNumber.trim()))){
		errorTarget[3]=true;
		errorMessage[3]='格式錯誤!';
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
	
	if(sanitizer.sanitize(req.body.Phone.trim())===''){
		errorTarget[6]=true;
		errorMessage[6]='必要參數未填!';
	}
	
	if(sanitizer.sanitize(req.body.Email.trim())===''){
		errorTarget[7]=true;
		errorMessage[7]='必要參數未填!';
	}else if(sanitizer.sanitize(req.body.Email.trim()).search(/@/)===-1){
		errorTarget[7]=true;
		errorMessage[7]='Email格式錯誤!';
	}
	
	if(sanitizer.sanitize(req.body.Address.trim())===''){
		errorTarget[8]=true;
		errorMessage[8]='必要參數未填!';
	}
	
	if(sanitizer.sanitize(req.body.BankAccountNumber.trim())===''){
		errorTarget[9]=true;
		errorMessage[9]='必要參數未填!';
	}
	
	if(sanitizer.sanitize(req.body.BankAccountPassword.trim())===''){
		errorTarget[10]=true;
		errorMessage[10]='必要參數未填!';
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
					if(user.Email!==sanitizer.sanitize(req.body.Email.trim())){
						ifEmailChange=true;
						user.ifMailValid=false;
					}
					user.Name=sanitizer.sanitize(req.body.Name.trim());
					user.Email=sanitizer.sanitize(req.body.Email.trim());
					user.Gender=sanitizer.sanitize(req.body.Gender.trim());
					user.BirthDay=sanitizer.sanitize(req.body.BirthDay.trim());
					user.IdCardNumber=sanitizer.sanitize(req.body.IdCardNumber.trim());
					user.Phone=sanitizer.sanitize(req.body.Phone.trim());
					user.Address=sanitizer.sanitize(req.body.Address.trim());
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
										account.BankAccountNumber=sanitizer.sanitize(req.body.BankAccountNumber.trim());
										account.BankAccountPassword=sanitizer.sanitize(req.body.BankAccountPassword.trim());
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
													library.gridCreator(newUpdated._id,filesArray,function(){
														if(!ifEmailChange){
															res.redirect('/signup/profile');
														}else{
															library.mailValid(newUpdated._id,req,function(){
																req.flash('sendValidMail','E-mail認證信已寄往您所填寫的地址：<br><span style="color:red;">'+newUpdated.Email+'</span><br>您可於一小時內前往您的信箱點擊連結進行認證或於本頁面重發認證信');
																res.redirect('/signup/profile');
															},function(){
																req.flash('sendValidMail','E-mail認證信已寄往您所填寫的地址：<br><span style="color:red;">'+newUpdated.Email+'</span><br>您可於一小時內前往您的信箱點擊連結進行認證或於本頁面重發認證信');
																res.redirect('/signup/profile');
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
	res.redirect(req.get('referer'));
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
	res.redirect(req.get('referer'));
}

function redirectorCardData(req,res,target,message){
	var formContent={
		F1:req.body.cardIpt,
		F2:req.body.cardPwdIpt
	};
	
	var json={FormContent:formContent,Target:target,Message:message};
	var string=JSON.stringify(json);
	
	req.flash('cardDataForm',string);
	res.redirect(req.get('referer'));
}

// this is the basic type when page no need to ensure authenticated. U can try this by /signup/signupExample
router.get('/cardData',library.loginFormChecker,library.newMsgChecker, function (req, res) {
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	
	var stringArrayFlash=req.flash('cardDataForm');
	var cardDataFormJson=null;
	if(stringArrayFlash.length>0){
		cardDataFormJson=JSON.parse(stringArrayFlash[0]);
	}
	
	library.formIdfrCtr+=1;
	var tempIdfr=library.formIdfrCtr;
	library.formIdfrArray.push({Idfr:tempIdfr,SaveT:Date.now()});
	
	//get data from database and process them here
	
	//pass what u get from database and send them into ejs in this line
	res.render('cardData_1',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst,formSession1:tempIdfr,cdfJSON:cardDataFormJson});
});

// this is the basic type when page no need to ensure authenticated. U can try this by /signup/signupExample
router.post('/checkPro',library.loginFormChecker,library.newMsgChecker, function (req, res) {
	var Idfr=parseInt(req.body.FormSession1);
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
		var errorTarget=[];
		var errorMessage=[];
		for(i=0;i<2;i++){
			errorTarget.push(false);
			errorMessage.push('');
		}
		
		if(sanitizer.sanitize(req.body.cardIpt.trim())===''){
			errorTarget[0]=true;
			errorMessage[0]='必要參數未填!';
		}
		
		if(sanitizer.sanitize(req.body.cardPwdIpt.trim())===''){
			errorTarget[1]=true;
			errorMessage[1]='必要參數未填!';
		}
		
		var valiFlag=true;
		for(i=0;i<errorTarget.length;i++){
			if(errorTarget[i]){
				valiFlag=false;
				break;
			}
		}
		
		if(valiFlag){
			var auRst=null;
			if(req.isAuthenticated()){
				auRst=req.user.Username;
			}
			
			library.formIdfrCtr+=1;
			var tempIdfr=library.formIdfrCtr;
			library.formIdfrArray.push({Idfr:tempIdfr,SaveT:Date.now()});
			
			res.render('checkPro_1',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst,BankAccountNumber:req.body.cardIpt,BankAccountPassword:req.body.cardPwdIpt,formSession1:req.body.FormSession1,formSession2:tempIdfr});
		}else{
			redirectorCardData(req,res,errorTarget,errorMessage);
		}
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
	
	var stringArrayFlash=req.flash('newAccForm');
	var newAccFormJson=null;
	if(stringArrayFlash.length>0){
		newAccFormJson=JSON.parse(stringArrayFlash[0]);
	}
	
	library.formIdfrCtr+=1;
	var tempIdfr=library.formIdfrCtr;
	library.formIdfrArray.push({Idfr:tempIdfr,SaveT:Date.now()});
	
	//get data from database and process them here
	
	//pass what u get from database and send them into ejs in this line
	res.render('newAcc_2',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst,formSession1:tempIdfr,nafJSON:newAccFormJson});
});

// this is the basic type when page no need to ensure authenticated. U can try this by /signup/signupExample
router.post('/apply',library.loginFormChecker,library.newMsgChecker, function (req, res) {
	var Idfr=parseInt(req.body.FormSession2);
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
		if((sanitizer.sanitize(req.body.nameIpt.trim())!=='')&&(sanitizer.sanitize(req.body.genderIpt.trim())!=='')&&(sanitizer.sanitize(req.body.birthIpt.trim())!=='')&&(sanitizer.sanitize(req.body.ssnIpt.trim())!=='')&&(sanitizer.sanitize(req.body.telIpt.trim())!=='')&&(sanitizer.sanitize(req.body.emailIpt.trim())!=='')&&(sanitizer.sanitize(req.body.addrIpt.trim())!=='')&&(sanitizer.sanitize(req.body.BankAccountNumber.trim())!=='')&&(sanitizer.sanitize(req.body.BankAccountPassword.trim())!=='')&&(sanitizer.sanitize(req.body.IdCardStr.trim())!=='')&&(sanitizer.sanitize(req.body.SecondCardStr.trim())!=='')){
			var tester=Date.parse(sanitizer.sanitize(req.body.birthIpt.trim()));
			var emailFlag=false;
			if(sanitizer.sanitize(req.body.emailIpt.trim()).search(/@/)>-1){
				emailFlag=true;
			}
			var tester2=sanitizer.sanitize(req.body.ssnIpt.trim());
			if((!isNaN(tester))&&(emailFlag)&&(library.checkSsnID(tester2))){
				var auRst=null;
				if(req.isAuthenticated()){
					auRst=req.user.Username;
				}

				library.formIdfrCtr+=1;
				var tempIdfr=library.formIdfrCtr;
				library.formIdfrArray.push({Idfr:tempIdfr,SaveT:Date.now()});
				
				res.render('apply_1',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst, Name:req.body.nameIpt, Email:req.body.emailIpt, Gender:req.body.genderIpt,
					BirthDay:req.body.birthIpt, Phone:req.body.telIpt, Address:req.body.addrIpt,IdCardNumber:req.body.ssnIpt,IdCardStr:req.body.IdCardStr,SecondCardStr:req.body.SecondCardStr,
					BankAccountNumber:req.body.BankAccountNumber,BankAccountPassword:req.body.BankAccountPassword,formSession1:req.body.FormSession1,formSession2:req.body.FormSession2,formSession3:tempIdfr});
			}else{
				res.redirect('/message?content='+encodeURIComponent('資料填寫不全或錯誤！'));
			}
		}else{
			res.redirect('/message?content='+encodeURIComponent('資料填寫不全或錯誤！'));
		}
	}else{
		res.redirect('/signupTest');
	}
});

router.post('/_apply',library.loginFormChecker,library.newMsgChecker, function (req, res) {
	var Idfr=parseInt(req.body.FormSession1);
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
		var errorTarget=[];
		var errorMessage=[];
		for(i=0;i<11;i++){
			errorTarget.push(false);
			errorMessage.push('');
		}
		
		if(sanitizer.sanitize(req.body.nameIpt.trim())===''){
			errorTarget[0]=true;
			errorMessage[0]='必要參數未填!';
		}
		
		if(!req.body.genderIpt){
			errorTarget[1]=true;
			errorMessage[1]='必要參數未填!';
		}
		
		if(sanitizer.sanitize(req.body.birthIpt.trim())===''){
			errorTarget[2]=true;
			errorMessage[2]='必要參數未填!';
		}else{
			var tester=Date.parse(sanitizer.sanitize(req.body.birthIpt.trim()));
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
		
		if(sanitizer.sanitize(req.body.ssnIpt.trim())===''){
			errorTarget[3]=true;
			errorMessage[3]='必要參數未填!';
		}else if(!library.checkSsnID(sanitizer.sanitize(req.body.ssnIpt.trim()))){
			errorTarget[3]=true;
			errorMessage[3]='格式錯誤!';
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
		
		if(sanitizer.sanitize(req.body.telIpt.trim())===''){
			errorTarget[6]=true;
			errorMessage[6]='必要參數未填!';
		}
		
		if(sanitizer.sanitize(req.body.emailIpt.trim())===''){
			errorTarget[7]=true;
			errorMessage[7]='必要參數未填!';
		}else if(sanitizer.sanitize(req.body.emailIpt.trim()).search(/@/)===-1){
			errorTarget[7]=true;
			errorMessage[7]='Email格式錯誤!';
		}
		
		if(sanitizer.sanitize(req.body.addrIpt.trim())===''){
			errorTarget[8]=true;
			errorMessage[8]='必要參數未填!';
		}
		
		if(sanitizer.sanitize(req.body.cardIpt.trim())===''){
			errorTarget[9]=true;
			errorMessage[9]='必要參數未填!';
		}
		
		if(sanitizer.sanitize(req.body.cardPwdIpt.trim())===''){
			errorTarget[10]=true;
			errorMessage[10]='必要參數未填!';
		}
		
		var valiFlag=true;
		for(i=0;i<errorTarget.length;i++){
			if(errorTarget[i]){
				valiFlag=false;
				break;
			}
		}
		
		if(valiFlag){
			var auRst=null;
			if(req.isAuthenticated()){
				auRst=req.user.Username;
			}
			
			var idCardJson={};
			if(req.files.ssnImg){
				idCardJson.originalname=req.files.ssnImg.originalname;
				idCardJson.mimetype=req.files.ssnImg.mimetype;
				idCardJson.extension=req.files.ssnImg.extension;
				idCardJson.path=req.files.ssnImg.path;
			}
			var idCardString=JSON.stringify(idCardJson);
			
			var secondCardJson={};
			if(req.files.cerImg){
				secondCardJson.originalname=req.files.cerImg.originalname;
				secondCardJson.mimetype=req.files.cerImg.mimetype;
				secondCardJson.extension=req.files.cerImg.extension;
				secondCardJson.path=req.files.cerImg.path;
			}
			var secondCardString=JSON.stringify(secondCardJson);
			
			library.formIdfrCtr+=1;
			var tempIdfr=library.formIdfrCtr;
			library.formIdfrArray.push({Idfr:tempIdfr,SaveT:Date.now()});
			
			//pass what u get from database and send them into ejs in this line
			res.render('apply_2',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst, Name:req.body.nameIpt, Email:req.body.emailIpt, Gender:req.body.genderIpt,
				BirthDay:req.body.birthIpt, Phone:req.body.telIpt, Address:req.body.addrIpt,IdCardNumber:req.body.ssnIpt,IdCardStr:idCardString,SecondCardStr:secondCardString,
				BankAccountNumber:req.body.cardIpt,BankAccountPassword:req.body.cardPwdIpt,formSession1:req.body.FormSession1,formSession2:tempIdfr});
		}else{
			var findPath = __dirname+'/../';
			
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
			
			redirectorNewACC(req,res,errorTarget,errorMessage);
		}
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
			if(Idfr3===library.formIdfrArray[i].Idfr){
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
					if(Idfr1===library.formIdfrArray[i].Idfr){
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
					if(Idfr2===library.formIdfrArray[i].Idfr){
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
					if(Idfr3===library.formIdfrArray[i].Idfr){
						ctr3=i;
						break;
					}
				}
			}
			if(ctr3>-1){
				library.formIdfrArray.splice(ctr3, 1);
			}
			res.render('community_1',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst,email:sanitizer.sanitize(req.body.Email.trim())});
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
			if(Idfr2===library.formIdfrArray[i].Idfr){
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
					if(Idfr1===library.formIdfrArray[i].Idfr){
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
					if(Idfr2===library.formIdfrArray[i].Idfr){
						ctr2=i;
						break;
					}
				}
			}
			if(ctr2>-1){
				library.formIdfrArray.splice(ctr2, 1);
			}
			res.render('community_2',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst,email:sanitizer.sanitize(req.body.Email.trim())});
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
	if((sanitizer.sanitize(req.body.Username.trim())!=='')&&(sanitizer.sanitize(req.body.Password.trim())!=='')&&(sanitizer.sanitize(req.body.Password2nd.trim())!=='')&&(sanitizer.sanitize(req.body.Name.trim())!=='')&&(sanitizer.sanitize(req.body.Email.trim())!=='')&&(sanitizer.sanitize(req.body.Gender.trim())!=='')&&(sanitizer.sanitize(req.body.BirthDay.trim())!=='')&&(sanitizer.sanitize(req.body.IdCardNumber.trim())!=='')&&(sanitizer.sanitize(req.body.Phone.trim())!=='')&&(sanitizer.sanitize(req.body.Address.trim())!=='')&&(sanitizer.sanitize(req.body.IdCardStr.trim())!=='')&&(sanitizer.sanitize(req.body.SecondCardStr.trim())!=='')&&(sanitizer.sanitize(req.body.BankAccountNumber.trim())!=='')&&(sanitizer.sanitize(req.body.BankAccountPassword.trim())!=='')){
		var fileFlag1=true;
		var fileFlag2=true;
		
		var idCardJson=JSON.parse(sanitizer.sanitize(req.body.IdCardStr.trim()));
		if((!idCardJson.originalname)||(!idCardJson.mimetype)||(!idCardJson.extension)||(!idCardJson.path)){
			fileFlag1=false;
		}else{
			var tempArray1=idCardJson.originalname.split('.');
			var fileTemper1=tempArray1[tempArray1.length-1].toUpperCase();
			if((fileTemper1!=='PNG')&&(fileTemper1!=='JPG')&&(fileTemper1!=='JPEG')&&(fileTemper1!=='JPE')&&(fileTemper1!=='JFIF')){
				fileFlag1=false;
			}else{
				fileTemper1=idCardJson.extension.toUpperCase();
				if((fileTemper1!=='PNG')&&(fileTemper1!=='JPG')&&(fileTemper1!=='JPEG')&&(fileTemper1!=='JPE')&&(fileTemper1!=='JFIF')){
					fileFlag1=false;
				}else{
					if((idCardJson.mimetype !== 'image/png')&&(idCardJson.mimetype !== 'image/jpeg')){
						fileFlag1=false;
					}else{
						if(!fs.existsSync(idCardJson.path)){
							fileFlag1=false;
						}
					}
				}
			}
		}
		
		var secondCardJson=JSON.parse(sanitizer.sanitize(req.body.SecondCardStr.trim()));
		if((!secondCardJson.originalname)||(!secondCardJson.mimetype)||(!secondCardJson.extension)||(!secondCardJson.path)){
			fileFlag2=false;
		}else{
			var tempArray2=secondCardJson.originalname.split('.');
			var fileTemper2=tempArray2[tempArray2.length-1].toUpperCase();
			if((fileTemper2!=='PNG')&&(fileTemper2!=='JPG')&&(fileTemper2!=='JPEG')&&(fileTemper2!=='JPE')&&(fileTemper2!=='JFIF')){
				fileFlag2=false;
			}else{
				fileTemper2=secondCardJson.extension.toUpperCase();
				if((fileTemper2!=='PNG')&&(fileTemper2!=='JPG')&&(fileTemper2!=='JPEG')&&(fileTemper2!=='JPE')&&(fileTemper2!=='JFIF')){
					fileFlag2=false;
				}else{
					if((secondCardJson.mimetype !== 'image/png')&&(secondCardJson.mimetype !== 'image/jpeg')){
						fileFlag2=false;
					}else{
						if(!fs.existsSync(secondCardJson.path)){
							fileFlag2=false;
						}
					}
				}
			}
		}
		
		var tester=Date.parse(sanitizer.sanitize(req.body.BirthDay.trim()));
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
		if(sanitizer.sanitize(req.body.Email.trim()).search(/@/)>-1){
			emailFlag=true;
		}
		var tester2=sanitizer.sanitize(req.body.IdCardNumber.trim());
		if((tLimitFlag)&&(emailFlag)&&(library.checkSsnID(tester2))&&(fileFlag1)&&(fileFlag2)){
			var temp=sanitizer.sanitize(req.body.Username.trim());
			Users.findOne({Username:temp}).exec(function (err, user){
				if (err) {
					console.log(err);
					res.redirect('/message?content='+encodeURIComponent('錯誤'));
				}else{
					if(user){
						res.redirect('/message?content='+encodeURIComponent('此帳號已存在!'));
					}else{
						if(sanitizer.sanitize(req.body.Password.trim())===sanitizer.sanitize(req.body.Password2nd.trim())){
							if((sanitizer.sanitize(req.body.Username.trim()).search(/[^\w]/ig)===-1)&&(sanitizer.sanitize(req.body.Password.trim()).search(/[^\w]/ig)===-1)&&(sanitizer.sanitize(req.body.Password.trim()).length>6)){
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
												var filesArray=[];
													
												idCardJson.flag=true;
												idCardJson.category='IdCard';
												filesArray.push(idCardJson);
												
												secondCardJson.flag=true;
												secondCardJson.category='SecondCard';
												filesArray.push(secondCardJson);
												
												library.gridCreator(newCreate._id,filesArray,function(){
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
				res.redirect('/message?content='+encodeURIComponent('上傳檔案資料錯誤或過期！'));
			}else{
				res.redirect('/message?content='+encodeURIComponent('資料填寫不全或錯誤！'));
			}
		}
	}else{
		res.redirect('/message?content='+encodeURIComponent('資料填寫不全或錯誤！'));
	}
}

module.exports = router;