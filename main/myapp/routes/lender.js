var library=require( './library.js' );
var mongoose = require('mongoose');

var express = require('express');
var router = express.Router();

router.get('/search/:keyword?/:category?/:action?/:director?/:lbound?/:ubound?/:page?',library.loginFormChecker,library.newMsgChecker, function (req, res) {
	if((typeof(req.query.keyword) !== "undefined")&&(typeof(req.query.category) !== "undefined")&&(typeof(req.query.action) !== "undefined")&&(typeof(req.query.director) !== "undefined")&&(typeof(req.query.lbound) !== "undefined")&&(typeof(req.query.ubound) !== "undefined")&&(typeof(req.query.page) !== "undefined")){
		var targetPage=parseInt(req.query.page);
		if(!isNaN(targetPage)){
			var auRst=null;
			if(req.isAuthenticated()){
				auRst=req.user.Username;
			}
			
			var resArrays=[];
			var action=decodeURIComponent(req.query.action);
			var category=decodeURIComponent(req.query.category);
			var director=decodeURIComponent(req.query.director);
			var lbound=decodeURIComponent(req.query.lbound);
			var ubound=decodeURIComponent(req.query.ubound);
			var keyword=decodeURIComponent(req.query.keyword);
			var pageNum=0
			var totalResultNumber=0;

			if((director!='大至小')&&(director!='小至大')){
				director='大至小';
			}
			
			var actionRec=null;
			var actionRecReserve=null;
			
			if(action=='建立日期'){
				actionRecReserve='Created';
			}else if(action=='更新日期'){
				actionRecReserve='Updated';
			}else if(action=='最晚媒合日期'){
				actionRecReserve='TimeLimit';
			}else if(action=='金額'){
				actionRecReserve='MoneyToBorrow';
			}else if(action=='利率'){
				actionRecReserve='MaxInterestRateAccepted';
			}else if(action=='期數'){
				actionRecReserve='MonthPeriodAccepted';
			}else if(action=='信用等級'){
				actionRecReserve='Level';
			}else if(action=='按讚次數'){
				actionRecReserve='LikeNumber';
			}else{
				actionRecReserve='Created';
				action='建立日期';
			}
			actionRec=library.directorDivider(director,actionRecReserve,true);
			
			var categoryRec=null;
			
			if(category=='一般'){
				categoryRec="general";
			}else if(category=='教育'){
				categoryRec="education";
			}else if(category=='家庭'){
				categoryRec="family";
			}else if(category=='旅遊'){
				categoryRec="tour";
			}else if(category=='不分類'){
				categoryRec=null;
			}else{
				category='不分類';
			}
			
			var lboundRec=null;
			var uboundRec=null;
			var revereDetector1=null;
			var revereDetector2=null;
			if(action=='利率'){
				var tester;
				if(lbound.trim()!=''){
					tester=parseFloat(lbound);
					if(!isNaN(tester)){
						if(tester>=0){
							lboundRec=(tester/100)+library.serviceChargeRate;//scr
						}else{
							lbound='';
						}
					}else{
						lbound='';
					}
				}
				if(ubound.trim()!=''){
					tester=parseFloat(ubound);
					if(!isNaN(tester)){
						if(tester>=0){
							uboundRec=(tester/100)+library.serviceChargeRate;//scr
						}else{
							ubound='';
						}
					}else{
						ubound='';
					}
				}
				revereDetector1=lboundRec;
				revereDetector2=uboundRec;
			}else if((action=='建立日期')||(action=='更新日期')||(action=='最晚媒合日期')){
				var tester;
				if(lbound.trim()!=''){
					tester=Date.parse(lbound);
					if(!isNaN(tester)){
						lboundRec=new Date(tester);
					}else{
						lbound='';
					}
				}
				if(ubound.trim()!=''){
					tester=Date.parse(ubound);
					if(!isNaN(tester)){
						uboundRec=new Date(tester);
					}else{
						ubound='';
					}
				}
				if(lboundRec!==null){
					revereDetector1=lboundRec.getTime();
				}
				if(uboundRec!==null){
					revereDetector2=uboundRec.getTime();
				}
			}else{
				var tester;
				if(lbound.trim()!=''){
					tester=parseInt(lbound);
					if(!isNaN(tester)){
						if(tester>=0){
							lboundRec=tester;
						}else{
							lbound='';
						}
					}else{
						lbound='';
					}
				}
				if(ubound.trim()!=''){
					tester=parseInt(ubound);
					if(!isNaN(tester)){
						if(tester>=0){
							uboundRec=tester;
						}else{
							ubound='';
						}
					}else{
						ubound='';
					}
				}
				revereDetector1=lboundRec;
				revereDetector2=uboundRec;
			}
			if((revereDetector1!==null)&&(revereDetector2!==null)){
				if(revereDetector1>revereDetector2){
					var temp;
					temp=lboundRec;
					lboundRec=uboundRec;
					uboundRec=temp;
					temp=lbound;
					lbound=ubound;
					ubound=temp;
				}
			}
			
			var andFindCmdAry=[];
			andFindCmdAry.push({"StoryTitle": {'$ne': '無標題' }});
			andFindCmdAry.push({"Story": {'$ne': '無內容' }});
			andFindCmdAry.push({"IfReadable": true});
			if(categoryRec){
				andFindCmdAry.push({"Category": categoryRec});
			}
			
			var jsonTemp={};
			if((lboundRec!==null)&&(uboundRec!==null)){
				jsonTemp[actionRecReserve]={"$gte": lboundRec, "$lte": uboundRec};
				andFindCmdAry.push(jsonTemp);
			}else if(lboundRec!==null){
				jsonTemp[actionRecReserve]={"$gte": lboundRec};
				andFindCmdAry.push(jsonTemp);
			}else if(uboundRec!==null){
				jsonTemp[actionRecReserve]={"$lte": uboundRec};
				andFindCmdAry.push(jsonTemp);
			}
			
			var keyword=keyword.replace(/\s\s+/g,' ');
			var stringArray=keyword.split(' ');
			var keywordArray=[];
			for(i=0;i<stringArray.length;i++){
				keywordArray.push(new RegExp(stringArray[i],'i'));
			}
			var keyObjID=null;
			if(mongoose.Types.ObjectId.isValid(stringArray[0])){
				keyObjID=mongoose.Types.ObjectId(stringArray[0]);
			}
			
			var Borrows  = mongoose.model('Borrows');
			Borrows.find({$and:andFindCmdAry}).populate('CreatedBy', 'Username').populate('Message','CreatedBy SendTo Type Status').sort(actionRec).exec( function (err, borrows, count){
				if (err) {
					console.log(err);
					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
				}else{
					if(borrows.length==0){
						if(targetPage>1){
							res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
						}else{
							res.render('search',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst,keywordDefault:keyword,actionDefault:action,categoryDefault:category,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound,jsonArray:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage});
						}
					}else{
						for(j=borrows.length-1;j>-1;j--){
							var testString=borrows[j].StoryTitle+' '+borrows[j].Story+' '+borrows[j].CreatedBy.Username;
							var localFlag=[];
							var ctr;
							localFlag[0]=false;
							localFlag[1]=false;
							
							if(keyObjID){
								if(keyObjID.equals(borrows[j]._id)){
									localFlag[0]=true;
								}
							}
							
							ctr=0;
							for(k=0;k<keywordArray.length;k++){
								if(testString.search(keywordArray[k])>-1){
									ctr++;
								}
							}
							if(ctr==keywordArray.length){
								localFlag[1]=true;
							}
							
							if((!localFlag[0])&&(!localFlag[1])){
								borrows.splice(j, 1);
							}
						}
						totalResultNumber=borrows.length;
						
						if(totalResultNumber==0){
							if(targetPage>1){
								res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
							}else{
								res.render('search',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst,keywordDefault:keyword,actionDefault:action,categoryDefault:category,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound,jsonArray:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage});
							}
						}else{
							var divider=10;
							pageNum=Math.ceil(totalResultNumber/divider);
							
							if(pageNum<targetPage){
								res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
							}else{
								var starter=divider*(targetPage-1);
								var ender;
								if(targetPage==pageNum){
									ender=totalResultNumber;
								}else{
									ender=starter+divider;
								}
								for(i=starter;i<ender;i++){
									resArrays.push(borrows[i]);
								}
								for(i=0;i<resArrays.length;i++){
									resArrays[i].MaxInterestRateAccepted-=library.serviceChargeRate;//scr
									if(auRst===null){
										resArrays[i].TitleColor='default';
									}else{
										for(j=0;j<resArrays[i].Message.length;j++){
											if((req.user._id==resArrays[i].Message[j].CreatedBy)&&(resArrays[i].Message[j].Type=="toLend")){
												if(resArrays[i].Message[j].Status=="NotConfirmed"){
													resArrays[i].TitleColor='color1';
												}else{
													resArrays[i].TitleColor='color2';
												}
											}else if((req.user._id==resArrays[i].Message[j].SendTo)&&(resArrays[i].Message[j].Type=="toBorrow")){
												if(resArrays[i].Message[j].Status=="NotConfirmed"){
													resArrays[i].TitleColor='color3';
												}else{
													resArrays[i].TitleColor='color2';
												}
											}
										}
										if(req.user._id==resArrays[i].CreatedBy._id){
											resArrays[i].TitleColor='color4';
										}
										resArrays[i].ifLiked=false;
										for(j=0;j<resArrays[i].Likes.length;j++){
											if(resArrays[i].Likes[j]==req.user._id){
												resArrays[i].ifLiked=true;
												break;
											}
										}
									}
								}
								res.render('search',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst,keywordDefault:keyword,actionDefault:action,categoryDefault:category,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound,jsonArray:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage});
							}
						}
					}
				}
			});
		}else{
			res.redirect('/');
		}
	}else{
		res.redirect('/');
	}
});

router.get('/story/:id?',library.loginFormChecker,library.newMsgChecker, function (req, res) {
	if(typeof(req.query.id) !== "undefined"){
		var auRst=null;
		if(req.isAuthenticated()){
			auRst=req.user.Username;
		}
		
		var stringArrayFlash=req.flash('hendLendForm');
		var hendLendFormJson=null;
		if(stringArrayFlash.length>0){
			hendLendFormJson=JSON.parse(stringArrayFlash[0]);
		}
		
		var stringArrayFlash2=req.flash('confirmForm');
		var confirmFormJson=null;
		if(stringArrayFlash2.length>0){
			confirmFormJson=JSON.parse(stringArrayFlash2[0]);
		}
		
		var Users  = mongoose.model('Users');
		var Borrows  = mongoose.model('Borrows');
		var Discussions  = mongoose.model('Discussions');
		var Messages  = mongoose.model('Messages');
		var BankAccounts  = mongoose.model('BankAccounts');
		var Transactions  = mongoose.model('Transactions');
		Borrows.findById(req.query.id).populate('CreatedBy', 'Username').populate('Discussion').populate('Message').exec(function (err, borrow){
			if (err) {
				console.log(err);
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}else{
				if(!borrow){
					res.redirect('/message?content='+encodeURIComponent('錯誤ID!'));
				}else{
					var options = {
						path: 'Discussion.CreatedBy',
						model: Users,
						select: 'Username'
					};
					Discussions.populate(borrow, options, function(err, borrow) {
						if(err){
							console.log(err);
							res.redirect('/message?content='+encodeURIComponent('錯誤!'));
						}else{
							borrow.TitleColor="default";
							borrow.MaxInterestRateAccepted-=library.serviceChargeRate;//scr
							var ifSelfValue=false;
							var ifLikedValue=false;
							if(auRst===null){
								res.render('story',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst,ifSelf:ifSelfValue,ifLiked:ifLikedValue,json:borrow,jsonMessage:null,jsonBorrowMessage:null,jsonLend:null,MoneyInBankAccountValue:0,MoneyLended:0,hlfJSON:hendLendFormJson,cfJSON:confirmFormJson});
							}else{
								if(req.user._id==borrow.CreatedBy._id){
									borrow.TitleColor='color4';
									ifSelfValue=true;
									res.render('story',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst,ifSelf:ifSelfValue,ifLiked:ifLikedValue,json:borrow,jsonMessage:null,jsonBorrowMessage:null,jsonLend:null,MoneyInBankAccountValue:0,MoneyLended:0,hlfJSON:hendLendFormJson,cfJSON:confirmFormJson});
								}else{
									var j = 0;
									for (j = 0; j < borrow.Likes.length; j++) {
										if (borrow.Likes[j].toString() == req.user._id.toString()) {
											ifLikedValue = true;
										}
									}
									BankAccounts.findOne({"OwnedBy": req.user._id}).exec(function (err, bankaccount){
										if (err) {
											console.log(err);
											res.redirect('/message?content='+encodeURIComponent('錯誤!'));
										}else{
											if(!bankaccount){
												res.redirect('/message?content='+encodeURIComponent('無銀行帳戶!'));
											}else{
												var moneyLendedCumulated=0
												Transactions.find({"Lender": req.user._id}).exec(function (err, transactions){
													if (err) {
														console.log(err);
														res.redirect('/message?content='+encodeURIComponent('錯誤!'));
													}else{
														if(transactions.length>0){
															for(i=0;i<transactions.length;i++){
																moneyLendedCumulated+=transactions[i].Principal;
															}
														}
														var message=null;
														var borrowMessage=null;
														for(j=0;j<borrow.Message.length;j++){
															if((req.user._id==borrow.Message[j].CreatedBy)&&(borrow.Message[j].Type=="toLend")){
																message=borrow.Message[j];
																if(message.Status=="NotConfirmed"){
																	borrow.TitleColor='color1';
																	break;
																}else{
																	borrow.TitleColor='color2';
																	break;
																}
															}else if((req.user._id==borrow.Message[j].SendTo)&&(borrow.Message[j].Type=="toBorrow")){
																borrowMessage=borrow.Message[j];
																if(borrowMessage.Status=="NotConfirmed"){
																	borrow.TitleColor='color3';
																	break;
																}else{
																	borrow.TitleColor='color2';
																	break;
																}
															}
														}

														if(message){
															message.InterestRate-=library.serviceChargeRate;//scr
															message.InterestInFuture=library.interestInFutureCalculator(message.MoneyToLend,message.InterestRate,message.MonthPeriod);
															if(message.MoneyToLend>0){
																message.InterestInFutureDivMoney=message.InterestInFuture/message.MoneyToLend*100;
															}else{
																message.InterestInFutureDivMoney=0;
															}
															if(message.MonthPeriod>0){
																message.InterestInFutureMonth=message.InterestInFuture/message.MonthPeriod;
															}else{
																message.InterestInFutureMonth=0;
															}
															if(message.MonthPeriod>0){
																message.InterestInFutureMoneyMonth=(message.InterestInFuture+message.MoneyToLend)/message.MonthPeriod;
															}else{
																message.InterestInFutureMoneyMonth=0;
															}
														}
														if(borrowMessage){
															borrowMessage.InterestRate-=library.serviceChargeRate;//scr
															borrowMessage.InterestInFuture=library.interestInFutureCalculator(borrowMessage.MoneyToLend,borrowMessage.InterestRate,borrowMessage.MonthPeriod);
															if(borrowMessage.MoneyToLend>0){
																borrowMessage.InterestInFutureDivMoney=borrowMessage.InterestInFuture/borrowMessage.MoneyToLend*100;
															}else{
																borrowMessage.InterestInFutureDivMoney=0;
															}
															if(borrowMessage.MonthPeriod>0){
																borrowMessage.InterestInFutureMonth=borrowMessage.InterestInFuture/borrowMessage.MonthPeriod;
															}else{
																borrowMessage.InterestInFutureMonth=0;
															}
															if(borrowMessage.MonthPeriod>0){
																borrowMessage.InterestInFutureMoneyMonth=(borrowMessage.InterestInFuture+borrowMessage.MoneyToLend)/borrowMessage.MonthPeriod;
															}else{
																borrowMessage.InterestInFutureMoneyMonth=0;
															}
														}	
														
														var Lends = mongoose.model('Lends');
														Lends.findOne({"CreatedBy": req.user._id}).exec( function (err, lend){
															if (err) {
																console.log(err);
																res.redirect('/message?content='+encodeURIComponent('錯誤!'));
															}else{
																res.render('story',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst,ifSelf:ifSelfValue,ifLiked:ifLikedValue,json:borrow,jsonMessage:message,jsonBorrowMessage:borrowMessage,jsonLend:lend,MoneyInBankAccountValue:bankaccount.MoneyInBankAccount,MoneyLended:moneyLendedCumulated,hlfJSON:hendLendFormJson,cfJSON:confirmFormJson});
															}
														});
													}
												});
											}
										}
									});
								}
							}
						}
					});
				}
			}
		});
	}else{
		res.redirect('/');
	}
});

router.get('/lend',library.loginFormChecker,library.ensureAuthenticated,library.newMsgChecker, function (req, res) {
	var Lends  = mongoose.model('Lends');
	var BankAccounts  = mongoose.model('BankAccounts');
	var Transactions  = mongoose.model('Transactions');
	
	var stringArrayFlash=req.flash('lendForm');
	var lendFormJson=null;
	if(stringArrayFlash.length>0){
		lendFormJson=JSON.parse(stringArrayFlash[0]);
	}
	
	BankAccounts.findOne({"OwnedBy": req.user._id}).exec(function (err, bankaccount){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			if(!bankaccount){
				res.redirect('/message?content='+encodeURIComponent('無銀行帳戶!'));
			}else{
				var moneyLendedCumulated=0
				Transactions.find({"Lender": req.user._id}).exec(function (err, transactions){
					if (err) {
						console.log(err);
						res.redirect('/message?content='+encodeURIComponent('錯誤!'));
					}else{
						if(transactions.length>0){
							for(i=0;i<transactions.length;i++){
								moneyLendedCumulated+=transactions[i].Principal;
							}
						}
						Lends.findOne({"CreatedBy": req.user._id}).exec(function (err, lend){
							if (err) {
								console.log(err);
								res.redirect('/message?content='+encodeURIComponent('錯誤!'));
							}else{
								if(lend){
									lend.InterestRate-=library.serviceChargeRate;//scr
								}
								res.render('lend',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,MoneyInBankAccountValue:bankaccount.MoneyInBankAccount,MoneyLended:moneyLendedCumulated,jsonLend:lend,lfJSON:lendFormJson});
							}
						});
					}
				});
			}
		}
	});
});

router.get('/lenderTransactionRecord/:oneid?/:filter?/:sorter?/:director?/:lbound?/:ubound?/:page?',library.loginFormChecker, library.ensureAuthenticated,library.newMsgChecker, function (req, res) {
	if((typeof(req.query.oneid) !== "undefined")&&(typeof(req.query.filter) !== "undefined")&&(typeof(req.query.sorter) !== "undefined")&&(typeof(req.query.director) !== "undefined")&&(typeof(req.query.lbound) !== "undefined")&&(typeof(req.query.ubound) !== "undefined")&&(typeof(req.query.page) !== "undefined")){
		var targetPage=parseInt(req.query.page);
		if(!isNaN(targetPage)){
			
			var stringArrayFlash=req.flash('buyInsuranceFlash');
			var buyInsuranceJson=null;
			if(stringArrayFlash.length>0){
				buyInsuranceJson=JSON.parse(stringArrayFlash[0]);
			}
			
			var resArrays=[];
			var oneid=decodeURIComponent(req.query.oneid);
			var sorter=decodeURIComponent(req.query.sorter);
			var filter=decodeURIComponent(req.query.filter);
			var director=decodeURIComponent(req.query.director);
			var lbound=decodeURIComponent(req.query.lbound);
			var ubound=decodeURIComponent(req.query.ubound);
			var pageNum=0
			var totalResultNumber=0;
			var selectedFeeAllIpt=0;
			
			if((director!='大至小')&&(director!='小至大')){
				director='大至小';
			}
			
			var sorterRec=null;
			var sorterRecReserve=null;
			
			if(sorter=='建立日期'){
				sorterRecReserve='Created';
			}else if(sorter=='更新日期'){
				sorterRecReserve='Updated';
			}else if(sorter=='已獲利'){
				sorterRecReserve='InterestCumulated';
			}else if(sorter=='利率'){
				sorterRecReserve='InterestRate';
			}else if(sorter=='未還本金'){
				sorterRecReserve='Principal';
			}else if(sorter=='已還本金'){
				sorterRecReserve='PrincipalReturnedCumulated';
			}else if(sorter=='剩下期數'){
				sorterRecReserve='MonthPeriod';
			}else if(sorter=='已過期數'){
				sorterRecReserve='MonthPeriodHasPast';
			}else if(sorter=='信用等級'){
				sorterRecReserve='Level';
			}else if(sorter=='預計總利息'){
				sorterRecReserve='Updated';
			}else if(sorter=='預計平均利息'){
				sorterRecReserve='Updated';
			}else if(sorter=='預計平均本利和'){
				sorterRecReserve='Updated';
			}else if(sorter=='預計利本比'){
				sorterRecReserve='Updated';
			}else if(sorter=='收款記錄'){
				sorterRecReserve='Updated';
			}else if(sorter=='上次成功收款日期'){
				sorterRecReserve='Updated';
			}else if(sorter=='下次應收款日期'){
				sorterRecReserve='Updated';
			}else if(sorter=='已付保險費用'){
				sorterRecReserve='InsuranceFeePaid';
			}else if(sorter=='保險所需費用'){
				sorterRecReserve='Principal';
			}else{
				sorterRecReserve='Created';
				sorter='建立日期';
			}
			sorterRec=library.directorDivider(director,sorterRecReserve,true);
			
			var lboundRec=null;
			var uboundRec=null;
			var revereDetector1=null;
			var revereDetector2=null;
			if((sorter=='利率')||(sorter=='預計利本比')){
				var tester;
				if(lbound.trim()!=''){
					tester=parseFloat(lbound);
					if(!isNaN(tester)){
						if(tester>=0){
							if(sorter=='利率'){
								lboundRec=(tester/100)+library.serviceChargeRate;//scr
							}else if(sorter=='預計利本比'){
								lboundRec=(tester/100);
							}
						}else{
							lbound='';
						}
					}else{
						lbound='';
					}
				}
				if(ubound.trim()!=''){
					tester=parseFloat(ubound);
					if(!isNaN(tester)){
						if(tester>=0){
							if(sorter=='利率'){
								uboundRec=(tester/100)+library.serviceChargeRate;//scr
							}else if(sorter=='預計利本比'){
								uboundRec=(tester/100);
							}
						}else{
							ubound='';
						}
					}else{
						ubound='';
					}
				}
				revereDetector1=lboundRec;
				revereDetector2=uboundRec;
			}else if((sorter=='更新日期')||(sorter=='建立日期')||(sorter=='上次成功收款日期')||(sorter=='下次應收款日期')){
				var tester;
				if(lbound.trim()!=''){
					tester=Date.parse(lbound);
					if(!isNaN(tester)){
						lboundRec=new Date(tester);
						if((sorter=='上次成功收款日期')||(sorter=='下次應收款日期')){
							lboundRec=lboundRec.getTime();
						}
					}else{
						lbound='';
					}
				}
				if(ubound.trim()!=''){
					tester=Date.parse(ubound);
					if(!isNaN(tester)){
						uboundRec=new Date(tester);
						if((sorter=='上次成功收款日期')||(sorter=='下次應收款日期')){
							uboundRec=uboundRec.getTime();
						}
					}else{
						ubound='';
					}
				}
				if((sorter=='上次成功收款日期')||(sorter=='下次應收款日期')){
					revereDetector1=lboundRec;
					revereDetector2=uboundRec;
				}else{
					if(lboundRec!==null){
						revereDetector1=lboundRec.getTime();
					}
					if(uboundRec!==null){
						revereDetector2=uboundRec.getTime();
					}
				}
			}else{
				var tester;
				if(lbound.trim()!=''){
					tester=parseInt(lbound);
					if(!isNaN(tester)){
						if(tester>=0){
							lboundRec=tester;
						}else{
							lbound='';
						}
					}else{
						lbound='';
					}
				}
				if(ubound.trim()!=''){
					tester=parseInt(ubound);
					if(!isNaN(tester)){
						if(tester>=0){
							uboundRec=tester;
						}else{
							ubound='';
						}
					}else{
						ubound='';
					}
				}
				revereDetector1=lboundRec;
				revereDetector2=uboundRec;
			}
			if((revereDetector1!==null)&&(revereDetector2!==null)){
				if(revereDetector1>revereDetector2){
					var temp;
					temp=lboundRec;
					lboundRec=uboundRec;
					uboundRec=temp;
					temp=lbound;
					lbound=ubound;
					ubound=temp;
				}
			}
			
			var andFindCmdAry=[];
			andFindCmdAry.push({"Lender": req.user._id});
			if(filter=='未保險'){
				andFindCmdAry.push({"InsuranceFeePaid": 0});
			}else if(filter=='已保險'){
				andFindCmdAry.push({"InsuranceFeePaid": {'$ne': 0 }});
			}else{
				filter='未保險';
				andFindCmdAry.push({"InsuranceFeePaid": 0});
			}

			if((sorter!='預計總利息')&&(sorter!='預計平均利息')&&(sorter!='預計平均本利和')&&(sorter!='預計利本比')&&(sorter!='收款記錄')&&(sorter!='上次成功收款日期')&&(sorter!='下次應收款日期')){
				var jsonTemp={};
				if((lboundRec!==null)&&(uboundRec!==null)){
					jsonTemp[sorterRecReserve]={"$gte": lboundRec, "$lte": uboundRec};
					andFindCmdAry.push(jsonTemp);
				}else if(lboundRec!==null){
					jsonTemp[sorterRecReserve]={"$gte": lboundRec};
					andFindCmdAry.push(jsonTemp);
				}else if(uboundRec!==null){
					jsonTemp[sorterRecReserve]={"$lte": uboundRec};
					andFindCmdAry.push(jsonTemp);
				}
			}
			
			var oneid=oneid.replace(/\s\s+/g,' ');
			var stringArray=oneid.split(' ');
			var keywordArray=[];
			for(i=0;i<stringArray.length;i++){
				keywordArray.push(new RegExp(stringArray[i],'i'));
			}
			var ObjID=null;
			if(mongoose.Types.ObjectId.isValid(stringArray[0])){
				ObjID=mongoose.Types.ObjectId(stringArray[0]);
			}
			
			var Borrows  = mongoose.model('Borrows');
			var Messages  = mongoose.model('Messages');
			var Transactions  = mongoose.model('Transactions');
			Transactions.find({$and:andFindCmdAry}).populate('Borrower', 'Username').populate('CreatedFrom','FromBorrowRequest Type Status').populate('Return', 'InterestShouldPaid InterestNotPaid Created').sort(sorterRec).exec( function (err, transactions, count){
				if (err) {
					console.log(err);
					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
				}else{
					if(transactions.length==0){
						if(targetPage>1){
							res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
						}else{
							res.render('lenderTransactionRecord',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,oneidDefault:oneid,filterDefault:filter,sorterDefault:sorter,jsonTransaction:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,insuranceRate:library.insuranceRate,selectedFeeAll:selectedFeeAllIpt,biJSON:buyInsuranceJson,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound});
						}
					}else{
						var options = {
							path: 'CreatedFrom.FromBorrowRequest',
							model: Borrows,
							select: 'StoryTitle'
						};

						Messages.populate(transactions, options, function(err, transactions) {
							if(err){
								console.log(err);
								res.redirect('/message?content='+encodeURIComponent('錯誤!'));
							}else{
								for(j=transactions.length-1;j>-1;j--){
									var testString=transactions[j].Borrower.Username+' '+transactions[j].CreatedFrom.FromBorrowRequest.StoryTitle;
									var localFlag=[];
									var ctr;
									localFlag[0]=false;
									localFlag[1]=false;
									
									if(ObjID){
										if(ObjID.equals(transactions[j]._id)){
											localFlag[0]=true;
										}
									}
									
									ctr=0;
									for(k=0;k<keywordArray.length;k++){
										if(testString.search(keywordArray[k])>-1){
											ctr++;
										}
									}
									if(ctr==keywordArray.length){
										localFlag[1]=true;
									}
									
									if((!localFlag[0])&&(!localFlag[1])){
										transactions.splice(j, 1);
									}
								}
								
								for(i=0;i<transactions.length;i++){
									transactions[i].InterestRate-=library.serviceChargeRate;//scr
									transactions[i].InterestInFuture=library.interestInFutureCalculator(transactions[i].Principal,transactions[i].InterestRate,transactions[i].MonthPeriod);
									if(transactions[i].Principal>0){
										transactions[i].InterestInFutureDivMoney=transactions[i].InterestInFuture/transactions[i].Principal*100;
									}else{
										transactions[i].InterestInFutureDivMoney=0;
									}
									if(transactions[i].MonthPeriod>0){
										transactions[i].InterestInFutureMonth=transactions[i].InterestInFuture/transactions[i].MonthPeriod;
									}else{
										transactions[i].InterestInFutureMonth=0;
									}
									if(transactions[i].MonthPeriod>0){
										transactions[i].InterestInFutureMoneyMonth=(transactions[i].InterestInFuture+transactions[i].Principal)/transactions[i].MonthPeriod;
									}else{
										transactions[i].InterestInFutureMoneyMonth=0;
									}
									transactions[i].ReturnCount=0;
									transactions[i].previousPayDate=null;
									transactions[i].previousPayDateNum=-1;
									for(u=transactions[i].Return.length-1;u>-1;u--){
										if((transactions[i].Return[u].InterestShouldPaid-transactions[i].Return[u].InterestNotPaid)>0){
											transactions[i].ReturnCount+=1;
											if(transactions[i].previousPayDate===null){
												transactions[i].previousPayDate=transactions[i].Return[u].Created;
												transactions[i].previousPayDateNum=transactions[i].Return[u].Created.getTime();
											}
										}
									}
									if(transactions[i].MonthPeriod>0){
										var tempDate=new Date(transactions[i].Created.getTime());
										tempDate.setTime(tempDate.getTime()+1000*60*60*24*30*(transactions[i].MonthPeriodHasPast+1));
										transactions[i].nextPayDate=tempDate;
										transactions[i].nextPayDateNum=tempDate.getTime();
									}else{
										transactions[i].nextPayDate=null;
										transactions[i].nextPayDateNum=Infinity;
									}
								}
								
								if(sorter=='預計總利息'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseFloat(b.InterestInFuture) - parseFloat(a.InterestInFuture)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseFloat(a.InterestInFuture) - parseFloat(b.InterestInFuture)} );
									}
									library.arrayFilter(transactions,'InterestInFuture',lboundRec,uboundRec);	
								}else if(sorter=='預計平均利息'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseFloat(b.InterestInFutureMonth) - parseFloat(a.InterestInFutureMonth)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseFloat(a.InterestInFutureMonth) - parseFloat(b.InterestInFutureMonth)} );
									}
									library.arrayFilter(transactions,'InterestInFutureMonth',lboundRec,uboundRec);	
								}else if(sorter=='預計平均本利和'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseFloat(b.InterestInFutureMoneyMonth) - parseFloat(a.InterestInFutureMoneyMonth)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseFloat(a.InterestInFutureMoneyMonth) - parseFloat(b.InterestInFutureMoneyMonth)} );
									}
									library.arrayFilter(transactions,'InterestInFutureMoneyMonth',lboundRec,uboundRec);	
								}else if(sorter=='預計利本比'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseFloat(b.InterestInFutureDivMoney) - parseFloat(a.InterestInFutureDivMoney)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseFloat(a.InterestInFutureDivMoney) - parseFloat(b.InterestInFutureDivMoney)} );
									}
									library.arrayFilter(transactions,'InterestInFutureDivMoney',lboundRec,uboundRec);	
								}else if(sorter=='收款記錄'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseFloat(b.ReturnCount) - parseFloat(a.ReturnCount)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseFloat(a.ReturnCount) - parseFloat(b.ReturnCount)} );
									}
									library.arrayFilter(transactions,'ReturnCount',lboundRec,uboundRec);
								}else if(sorter=='上次成功收款日期'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseFloat(b.previousPayDateNum) - parseFloat(a.previousPayDateNum)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseFloat(a.previousPayDateNum) - parseFloat(b.previousPayDateNum)} );
									}
									library.arrayFilter(transactions,'previousPayDateNum',lboundRec,uboundRec);
								}else if(sorter=='下次應收款日期'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseFloat(b.nextPayDateNum) - parseFloat(a.nextPayDateNum)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseFloat(a.nextPayDateNum) - parseFloat(b.nextPayDateNum)} );
									}
									library.arrayFilter(transactions,'nextPayDateNum',lboundRec,uboundRec);
								}
								
								totalResultNumber=transactions.length;
								
								if(totalResultNumber==0){
									if(targetPage>1){
										res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
									}else{
										res.render('lenderTransactionRecord',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,oneidDefault:oneid,filterDefault:filter,sorterDefault:sorter,jsonTransaction:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,insuranceRate:library.insuranceRate,selectedFeeAll:selectedFeeAllIpt,biJSON:buyInsuranceJson,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound});
									}
								}else{
									for(p=0;p<totalResultNumber;p++){
										var tempFee=transactions[p].Principal*library.insuranceRate;
										if(tempFee<1){
											tempFee=1;
										}
										selectedFeeAllIpt+=tempFee;
									}
									
									var divider=10;
									pageNum=Math.ceil(totalResultNumber/divider);
									
									if(pageNum<targetPage){
										res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
									}else{
										var starter=divider*(targetPage-1);
										var ender;
										if(targetPage==pageNum){
											ender=totalResultNumber;
										}else{
											ender=starter+divider;
										}
										for(i=starter;i<ender;i++){
											resArrays.push(transactions[i]);
										}
										res.render('lenderTransactionRecord',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,oneidDefault:oneid,filterDefault:filter,sorterDefault:sorter,jsonTransaction:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,insuranceRate:library.insuranceRate,selectedFeeAll:selectedFeeAllIpt,biJSON:buyInsuranceJson,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound});
									}
								}
							}
						});
					}
				}
			});
		}else{
			res.redirect('/');
		}
	}else{
		res.redirect('/');
	}
});

router.get('/lenderReturnRecord/:oneid?/:id?/:sorter?/:director?/:lbound?/:ubound?/:page?',library.loginFormChecker, library.ensureAuthenticated, library.newMsgChecker,function (req, res) {
	if((typeof(req.query.oneid) !== "undefined")&&(typeof(req.query.id) !== "undefined")&&(typeof(req.query.sorter) !== "undefined")&&(typeof(req.query.director) !== "undefined")&&(typeof(req.query.lbound) !== "undefined")&&(typeof(req.query.ubound) !== "undefined")&&(typeof(req.query.page) !== "undefined")){
		var targetPage=parseInt(req.query.page);
		if(!isNaN(targetPage)){
			var resArrays=[];
			var oneid=decodeURIComponent(req.query.oneid);
			var id=decodeURIComponent(req.query.id);
			var sorter=decodeURIComponent(req.query.sorter);
			var director=decodeURIComponent(req.query.director);
			var lbound=decodeURIComponent(req.query.lbound);
			var ubound=decodeURIComponent(req.query.ubound);
			var pageNum=0
			var totalResultNumber=0;
			
			if((director!='大至小')&&(director!='小至大')){
				director='大至小';
			}
			
			var sorterRec=null;
			var sorterRecReserve=null;
			
			if(sorter=='建立日期'){
				sorterRecReserve='Created';
			}else if(sorter=='更新日期'){
				sorterRecReserve='Updated';
			}else if(sorter=='實收金額'){
				sorterRecReserve='Updated';
			}else if(sorter=='應收金額'){
				sorterRecReserve='Updated';
			}else if(sorter=='未收金額'){
				sorterRecReserve='Updated';
			}else if(sorter=='超收金額'){
				sorterRecReserve='Updated';
			}else if(sorter=='實收本金'){
				sorterRecReserve='Updated';
			}else if(sorter=='應收本金'){
				sorterRecReserve='PrincipalShouldPaid';
			}else if(sorter=='未收本金'){
				sorterRecReserve='PrincipalNotPaid';
			}else if(sorter=='超收本金'){
				sorterRecReserve='-PrincipalNotPaid';
			}else if(sorter=='實收利息'){
				sorterRecReserve='Updated';
			}else if(sorter=='應收利息'){
				sorterRecReserve='InterestShouldPaid';
			}else if(sorter=='未收利息'){
				sorterRecReserve='InterestNotPaid';
			}else if(sorter=='超收利息'){
				sorterRecReserve='-InterestNotPaid';
			}else if(sorter=='收款前未還本金'){
				sorterRecReserve='PrincipalBeforePaid';
			}else if(sorter=='收款前已還本金'){
				sorterRecReserve='PrincipalReturnedCumulatedBeforePaid';
			}else if(sorter=='收款前累積利息'){
				sorterRecReserve='InterestCumulatedBeforePaid';
			}else if(sorter=='收款前累積本利和'){
				sorterRecReserve='Updated';
			}else if(sorter=='收款後未還本金'){
				sorterRecReserve='PrincipalAfterPaid';
			}else if(sorter=='收款後已還本金'){
				sorterRecReserve='PrincipalReturnedCumulatedAfterPaid';
			}else if(sorter=='收款後累積利息'){
				sorterRecReserve='InterestCumulatedAfterPaid';
			}else if(sorter=='收款後累積本利和'){
				sorterRecReserve='Updated';
			}else if(sorter=='對方信用等級'){
				sorterRecReserve='Level';
			}else{
				sorterRecReserve='Created';
				sorter='建立日期';
			}
			sorterRec=library.directorDivider(director,sorterRecReserve,true);
			
			var lboundRec=null;
			var uboundRec=null;
			var revereDetector1=null;
			var revereDetector2=null;
			if((sorter=='更新日期')||(sorter=='建立日期')){
				var tester;
				if(lbound.trim()!=''){
					tester=Date.parse(lbound);
					if(!isNaN(tester)){
						lboundRec=new Date(tester);
					}else{
						lbound='';
					}
				}
				if(ubound.trim()!=''){
					tester=Date.parse(ubound);
					if(!isNaN(tester)){
						uboundRec=new Date(tester);
					}else{
						ubound='';
					}
				}
				if(lboundRec!==null){
					revereDetector1=lboundRec.getTime();
				}
				if(uboundRec!==null){
					revereDetector2=uboundRec.getTime();
				}
			}else{
				var tester;
				if(lbound.trim()!=''){
					tester=parseInt(lbound);
					if(!isNaN(tester)){
						if(tester>=0){
							if((sorter=='超收金額')||(sorter=='超收本金')||(sorter=='超收利息')){
								if(tester!==0){
									uboundRec=tester*-1;
								}else{
									uboundRec=tester;
								}
							}else{
								lboundRec=tester;
							}
						}else{
							lbound='';
						}
					}else{
						lbound='';
					}
				}
				if(ubound.trim()!=''){
					tester=parseInt(ubound);
					if(!isNaN(tester)){
						if(tester>=0){
							if((sorter=='超收金額')||(sorter=='超收本金')||(sorter=='超收利息')){
								if(tester!==0){
									lboundRec=tester*-1;
								}else{
									lboundRec=tester;
								}
							}else{
								uboundRec=tester;
							}
						}else{
							ubound='';
						}
					}else{
						ubound='';
					}
				}
				revereDetector1=lboundRec;
				revereDetector2=uboundRec;
			}
			if((revereDetector1!==null)&&(revereDetector2!==null)){
				if(revereDetector1>revereDetector2){
					var temp;
					temp=lboundRec;
					lboundRec=uboundRec;
					uboundRec=temp;
					temp=lbound;
					lbound=ubound;
					ubound=temp;
				}
			}
			
			var andFindCmdAry=[];
			andFindCmdAry.push({Lender:req.user._id});
			if(mongoose.Types.ObjectId.isValid(id)){
				var ObjID0=mongoose.Types.ObjectId(id);
				andFindCmdAry.push({ToTransaction:ObjID0});
			}else{
				id='';
			}
			
			if((sorter!='實收金額')&&(sorter!='應收金額')&&(sorter!='未收金額')&&(sorter!='超收金額')&&(sorter!='實收本金')&&(sorter!='實收利息')&&(sorter!='收款前累積本利和')&&(sorter!='收款後累積本利和')){
				var jsonTemp={};
				if((lboundRec!==null)&&(uboundRec!==null)){
					jsonTemp[sorterRecReserve]={"$gte": lboundRec, "$lte": uboundRec};
					andFindCmdAry.push(jsonTemp);
				}else if(lboundRec!==null){
					jsonTemp[sorterRecReserve]={"$gte": lboundRec};
					andFindCmdAry.push(jsonTemp);
				}else if(uboundRec!==null){
					jsonTemp[sorterRecReserve]={"$lte": uboundRec};
					andFindCmdAry.push(jsonTemp);
				}
			}
			
			var oneid=oneid.replace(/\s\s+/g,' ');
			var stringArray=oneid.split(' ');
			var keywordArray=[];
			for(i=0;i<stringArray.length;i++){
				keywordArray.push(new RegExp(stringArray[i],'i'));
			}
			var ObjID=null;
			if(mongoose.Types.ObjectId.isValid(stringArray[0])){
				ObjID=mongoose.Types.ObjectId(stringArray[0]);
			}
			
			var Borrows  = mongoose.model('Borrows');
			var Messages  = mongoose.model('Messages');
			var Transactions  = mongoose.model('Transactions');
			var Returns  = mongoose.model('Returns');
			Returns.find({$and:andFindCmdAry,$where: function() { return (this.InterestShouldPaid-this.InterestNotPaid) > 0 }}).populate('Borrower', 'Username').populate('ToTransaction','CreatedFrom InsuranceFeePaid').sort(sorterRec).exec( function (err, returns, count){
				if (err) {
					console.log(err);
					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
				}else{
					if(returns.length==0){
						if(targetPage>1){
							res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
						}else{
							res.render('lenderReturnRecord',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,oneidDefault:oneid,idDefault:id,sorterDefault:sorter,jsonReturns:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound});
						}
					}else{
						var options = {
							path: 'ToTransaction.CreatedFrom',
							model: Messages,
							select: 'FromBorrowRequest'
						};

						Transactions.populate(returns, options, function(err, returns) {
							if(err){
								console.log(err);
								res.redirect('/message?content='+encodeURIComponent('錯誤!'));
							}else{
								var options2 = {
									path: 'ToTransaction.CreatedFrom.FromBorrowRequest',
									model: Borrows,
									select: 'StoryTitle'
								};

								Messages.populate(returns, options2, function(err, returns) {
									if(err){
										console.log(err);
										res.redirect('/message?content='+encodeURIComponent('錯誤!'));
									}else{
										for(j=returns.length-1;j>-1;j--){
											var testString=returns[j].Borrower.Username+' '+returns[j].ToTransaction.CreatedFrom.FromBorrowRequest.StoryTitle;
											var localFlag=[];
											var ctr;
											localFlag[0]=false;
											localFlag[1]=false;
											
											if(ObjID){
												if(ObjID.equals(returns[j]._id)){
													localFlag[0]=true;
												}
											}
											
											ctr=0;
											for(k=0;k<keywordArray.length;k++){
												if(testString.search(keywordArray[k])>-1){
													ctr++;
												}
											}
											if(ctr==keywordArray.length){
												localFlag[1]=true;
											}
											
											if((!localFlag[0])&&(!localFlag[1])){
												returns.splice(j, 1);
											}
										}
										
										for(i=0;i<returns.length;i++){
											returns[i].MoneyReallyPaid=(returns[i].InterestShouldPaid-returns[i].InterestNotPaid)+(returns[i].PrincipalShouldPaid-returns[i].PrincipalNotPaid);
											returns[i].MoneyShouldPaid=returns[i].InterestShouldPaid+returns[i].PrincipalShouldPaid;
											returns[i].MoneyNotPaid=returns[i].InterestNotPaid+returns[i].PrincipalNotPaid;
											returns[i].InterestReallyPaid=returns[i].InterestShouldPaid-returns[i].InterestNotPaid;
											returns[i].PrincipalReallyPaid=returns[i].PrincipalShouldPaid-returns[i].PrincipalNotPaid;
											returns[i].PICumulatedBeforePaid=returns[i].PrincipalReturnedCumulatedBeforePaid+returns[i].InterestCumulatedBeforePaid;
											returns[i].PICumulatedAfterPaid=returns[i].PrincipalReturnedCumulatedAfterPaid+returns[i].InterestCumulatedAfterPaid;
										}
										
										if(sorter=='實收金額'){
											if(director=='大至小'){
												returns.sort(function(a,b) { return parseFloat(b.MoneyReallyPaid) - parseFloat(a.MoneyReallyPaid)} );
											}else if(director=='小至大'){
												returns.sort(function(a,b) { return parseFloat(a.MoneyReallyPaid) - parseFloat(b.MoneyReallyPaid)} );
											}
											library.arrayFilter(returns,'MoneyReallyPaid',lboundRec,uboundRec);	
										}else if(sorter=='應收金額'){
											if(director=='大至小'){
												returns.sort(function(a,b) { return parseFloat(b.MoneyShouldPaid) - parseFloat(a.MoneyShouldPaid)} );
											}else if(director=='小至大'){
												returns.sort(function(a,b) { return parseFloat(a.MoneyShouldPaid) - parseFloat(b.MoneyShouldPaid)} );
											}
											library.arrayFilter(returns,'MoneyShouldPaid',lboundRec,uboundRec);
										}else if(sorter=='未收金額'){
											if(director=='大至小'){
												returns.sort(function(a,b) { return parseFloat(b.MoneyNotPaid) - parseFloat(a.MoneyNotPaid)} );
											}else if(director=='小至大'){
												returns.sort(function(a,b) { return parseFloat(a.MoneyNotPaid) - parseFloat(b.MoneyNotPaid)} );
											}
											library.arrayFilter(returns,'MoneyNotPaid',lboundRec,uboundRec);
										}else if(sorter=='超收金額'){
											if(director=='大至小'){
												returns.sort(function(a,b) { return parseFloat(a.MoneyNotPaid) - parseFloat(b.MoneyNotPaid)} );
											}else if(director=='小至大'){
												returns.sort(function(a,b) { return parseFloat(b.MoneyNotPaid) - parseFloat(a.MoneyNotPaid)} );
											}
											library.arrayFilter(returns,'MoneyNotPaid',lboundRec,uboundRec);
										}else if(sorter=='實收本金'){
											if(director=='大至小'){
												returns.sort(function(a,b) { return parseFloat(b.PrincipalReallyPaid) - parseFloat(a.PrincipalReallyPaid)} );
											}else if(director=='小至大'){
												returns.sort(function(a,b) { return parseFloat(a.PrincipalReallyPaid) - parseFloat(b.PrincipalReallyPaid)} );
											}
											library.arrayFilter(returns,'PrincipalReallyPaid',lboundRec,uboundRec);
										}else if(sorter=='實收利息'){
											if(director=='大至小'){
												returns.sort(function(a,b) { return parseFloat(b.InterestReallyPaid) - parseFloat(a.InterestReallyPaid)} );
											}else if(director=='小至大'){
												returns.sort(function(a,b) { return parseFloat(a.InterestReallyPaid) - parseFloat(b.InterestReallyPaid)} );
											}
											library.arrayFilter(returns,'InterestReallyPaid',lboundRec,uboundRec);
										}else if(sorter=='收款前累積本利和'){
											if(director=='大至小'){
												returns.sort(function(a,b) { return parseFloat(b.PICumulatedBeforePaid) - parseFloat(a.PICumulatedBeforePaid)} );
											}else if(director=='小至大'){
												returns.sort(function(a,b) { return parseFloat(a.PICumulatedBeforePaid) - parseFloat(b.PICumulatedBeforePaid)} );
											}
											library.arrayFilter(returns,'PICumulatedBeforePaid',lboundRec,uboundRec);
										}else if(sorter=='收款後累積本利和'){
											if(director=='大至小'){
												returns.sort(function(a,b) { return parseFloat(b.PICumulatedAfterPaid) - parseFloat(a.PICumulatedAfterPaid)} );
											}else if(director=='小至大'){
												returns.sort(function(a,b) { return parseFloat(a.PICumulatedAfterPaid) - parseFloat(b.PICumulatedAfterPaid)} );
											}
											library.arrayFilter(returns,'PICumulatedAfterPaid',lboundRec,uboundRec);
										}
											
										totalResultNumber=returns.length;
										
										if(totalResultNumber==0){
											if(targetPage>1){
												res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
											}else{
												res.render('lenderReturnRecord',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,oneidDefault:oneid,idDefault:id,sorterDefault:sorter,jsonReturns:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound});
											}
										}else{
											var divider=10;
											pageNum=Math.ceil(totalResultNumber/divider);
											
											if(pageNum<targetPage){
												res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
											}else{
												var starter=divider*(targetPage-1);
												var ender;
												if(targetPage==pageNum){
													ender=totalResultNumber;
												}else{
													ender=starter+divider;
												}
												for(i=starter;i<ender;i++){
													resArrays.push(returns[i]);
												}
												res.render('lenderReturnRecord',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,oneidDefault:oneid,idDefault:id,sorterDefault:sorter,jsonReturns:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound});
											}
										}
									}
								});
							}
						});
					}
				}
			});
		}else{
			res.redirect('/');
		}
	}else{
		res.redirect('/');
	}
});

router.get('/lendsList/:oneid?/:classOne?/:sorter?/:director?/:lbound?/:ubound?/:page?',library.loginFormChecker, library.ensureAuthenticated, library.newMsgChecker,function (req, res) {
	if((typeof(req.query.oneid) !== "undefined")&&(typeof(req.query.classOne) !== "undefined")&&(typeof(req.query.sorter) !== "undefined")&&(typeof(req.query.director) !== "undefined")&&(typeof(req.query.lbound) !== "undefined")&&(typeof(req.query.ubound) !== "undefined")&&(typeof(req.query.page) !== "undefined")){
		var targetPage=parseInt(req.query.page);
		if(!isNaN(targetPage)){
			var resArrays=[];
			var oneid=decodeURIComponent(req.query.oneid);
			var classOne=decodeURIComponent(req.query.classOne);
			var sorter=decodeURIComponent(req.query.sorter);
			var director=decodeURIComponent(req.query.director);
			var lbound=decodeURIComponent(req.query.lbound);
			var ubound=decodeURIComponent(req.query.ubound);
			var pageNum=0
			var totalResultNumber=0;
			
			var classOneRec=null;
			
			if(classOne=='永不自動同意'){
				classOneRec=-1;
			}else if(classOne=='立即自動同意'){
				classOneRec=0;
			}else if(classOne=='每天自動同意一次'){
				classOneRec=1;
			}else if(classOne=='每兩天自動同意一次'){
				classOneRec=2;
			}else if(classOne=='每三天自動同意一次'){
				classOneRec=3;
			}else if(classOne=='不分類'){
				classOneRec=null;
			}else{
				classOne='不分類';
			}
			
			if((director!='大至小')&&(director!='小至大')){
				director='大至小';
			}
			
			var sorterRec=null;
			var sorterRecReserve=null;
			
			if(sorter=='更新日期'){
				sorterRecReserve='Updated';
			}else if(sorter=='建立日期'){
				sorterRecReserve='Created';
			}else if(sorter=='可借出金額'){
				sorterRecReserve='MaxMoneyToLend';
			}else if(sorter=='可接受利率'){
				sorterRecReserve='InterestRate';
			}else if(sorter=='可接受期數'){
				sorterRecReserve='MonthPeriod';
			}else if(sorter=='可接受信用等級'){
				sorterRecReserve='MinLevelAccepted';
			}else if(sorter=='可接受總利息'){
				sorterRecReserve='MinInterestInFuture';
			}else if(sorter=='可接受平均利息'){
				sorterRecReserve='MinInterestInFutureMonth';
			}else if(sorter=='可接受平均本利和'){
				sorterRecReserve='MinInterestInFutureMoneyMonth';
			}else if(sorter=='可接受利本比'){
				sorterRecReserve='MinInterestInFutureDivMoney';
			}else{
				sorterRecReserve='Updated';
				sorter='更新日期';
			}
			sorterRec=library.directorDivider(director,sorterRecReserve,true);
			
			var lboundRec=null;
			var uboundRec=null;
			var revereDetector1=null;
			var revereDetector2=null;
			if(sorter=='可接受利率'){
				var tester;
				if(lbound.trim()!=''){
					tester=parseFloat(lbound);
					if(!isNaN(tester)){
						if(tester>=0){
							lboundRec=(tester/100)+library.serviceChargeRate;//scr
						}else{
							lbound='';
						}
					}else{
						lbound='';
					}
				}
				if(ubound.trim()!=''){
					tester=parseFloat(ubound);
					if(!isNaN(tester)){
						if(tester>=0){
							uboundRec=(tester/100)+library.serviceChargeRate;//scr
						}else{
							ubound='';
						}
					}else{
						ubound='';
					}
				}
				revereDetector1=lboundRec;
				revereDetector2=uboundRec;
			}else if((sorter=='更新日期')||(sorter=='建立日期')){
				var tester;
				if(lbound.trim()!=''){
					tester=Date.parse(lbound);
					if(!isNaN(tester)){
						lboundRec=new Date(tester);
					}else{
						lbound='';
					}
				}
				if(ubound.trim()!=''){
					tester=Date.parse(ubound);
					if(!isNaN(tester)){
						uboundRec=new Date(tester);
					}else{
						ubound='';
					}
				}
				if(lboundRec!==null){
					revereDetector1=lboundRec.getTime();
				}
				if(uboundRec!==null){
					revereDetector2=uboundRec.getTime();
				}
			}else{
				var tester;
				if(lbound.trim()!=''){
					tester=parseInt(lbound);
					if(!isNaN(tester)){
						if(tester>=0){
							lboundRec=tester;
						}else{
							lbound='';
						}
					}else{
						lbound='';
					}
				}
				if(ubound.trim()!=''){
					tester=parseInt(ubound);
					if(!isNaN(tester)){
						if(tester>=0){
							uboundRec=tester;
						}else{
							ubound='';
						}
					}else{
						ubound='';
					}
				}
				revereDetector1=lboundRec;
				revereDetector2=uboundRec;
			}
			if((revereDetector1!==null)&&(revereDetector2!==null)){
				if(revereDetector1>revereDetector2){
					var temp;
					temp=lboundRec;
					lboundRec=uboundRec;
					uboundRec=temp;
					temp=lbound;
					lbound=ubound;
					ubound=temp;
				}
			}
			
			var andFindCmdAry=[];
			
			var jsonTemp={};
			if((lboundRec!==null)&&(uboundRec!==null)){
				jsonTemp[sorterRecReserve]={"$gte": lboundRec, "$lte": uboundRec};
				andFindCmdAry.push(jsonTemp);
			}else if(lboundRec!==null){
				jsonTemp[sorterRecReserve]={"$gte": lboundRec};
				andFindCmdAry.push(jsonTemp);
			}else if(uboundRec!==null){
				jsonTemp[sorterRecReserve]={"$lte": uboundRec};
				andFindCmdAry.push(jsonTemp);
			}
			if(classOneRec!==null){
				andFindCmdAry.push({"AutoComfirmToBorrowMsgPeriod": classOneRec});
			}
			
			var command={};
			if(andFindCmdAry.length>0){
				command={$and:andFindCmdAry};
			}
			
			var oneid=oneid.replace(/\s\s+/g,' ');
			var stringArray=oneid.split(' ');
			var keywordArray=[];
			for(i=0;i<stringArray.length;i++){
				keywordArray.push(new RegExp(stringArray[i],'i'));
			}
			var ObjID=null;
			if(mongoose.Types.ObjectId.isValid(stringArray[0])){
				ObjID=mongoose.Types.ObjectId(stringArray[0]);
			}
			
			var Lends  = mongoose.model('Lends');
			Lends.find(command).populate('CreatedBy', 'Username').sort(sorterRec).exec( function (err, lends, count){
				if (err) {
					console.log(err);
					res.redirect('/message?content='+encodeURIComponent('錯誤1!'));
				}else{
					if(lends.length==0){
						if(targetPage>1){
							res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
						}else{
							res.render('lendsList',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,oneidDefault:oneid,classOneDefault:classOne,sorterDefault:sorter,jsonLends:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound});
						}
					}else{			
						for(j=lends.length-1;j>-1;j--){
							var localFlag=[];
							var ctr;
							localFlag[0]=false;
							localFlag[1]=false;
							
							if(ObjID){
								if(ObjID.equals(lends[j]._id)){
									localFlag[0]=true;
								}
							}
							
							ctr=0;
							for(k=0;k<keywordArray.length;k++){
								if(lends[j].CreatedBy.Username.search(keywordArray[k])>-1){
									ctr++;
								}
							}
							if(ctr==keywordArray.length){
								localFlag[1]=true;
							}
							
							if((!localFlag[0])&&(!localFlag[1])){
								lends.splice(j, 1);
							}
						}
						totalResultNumber=lends.length;
						
						if(totalResultNumber==0){
							if(targetPage>1){
								res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
							}else{
								res.render('lendsList',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,oneidDefault:oneid,classOneDefault:classOne,sorterDefault:sorter,jsonLends:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound});
							}
						}else{
							var divider=10;
							pageNum=Math.ceil(totalResultNumber/divider);
							
							if(pageNum<targetPage){
								res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
							}else{
								var starter=divider*(targetPage-1);
								var ender;
								if(targetPage==pageNum){
									ender=totalResultNumber;
								}else{
									ender=starter+divider;
								}
								for(i=starter;i<ender;i++){
									lends[i].InterestRate-=library.serviceChargeRate;//scr
									resArrays.push(lends[i]);
								}
								res.render('lendsList',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,oneidDefault:oneid,classOneDefault:classOne,sorterDefault:sorter,jsonLends:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound});
							}
						}
					}
				}
			});
		}else{
			res.redirect('/');
		}
	}else{
		res.redirect('/');
	}
});

router.get('/lenderSendMessages/:msgKeyword?/:filter?/:sorter?/:director?/:lbound?/:ubound?/:page?',library.loginFormChecker, library.ensureAuthenticated,library.newMsgChecker, function (req, res) {
	if((typeof(req.query.msgKeyword) !== "undefined")&&(typeof(req.query.filter) !== "undefined")&&(typeof(req.query.sorter) !== "undefined")&&(typeof(req.query.director) !== "undefined")&&(typeof(req.query.lbound) !== "undefined")&&(typeof(req.query.ubound) !== "undefined")&&(typeof(req.query.page) !== "undefined")){
		var targetPage=parseInt(req.query.page);
		if(!isNaN(targetPage)){
			
			var stringArrayFlash=req.flash('deleteFlash');
			var deleteJson=null;
			if(stringArrayFlash.length>0){
				deleteJson=JSON.parse(stringArrayFlash[0]);
			}
			
			var resArrays=[];
			var msgKeyword=decodeURIComponent(req.query.msgKeyword);
			var filter=decodeURIComponent(req.query.filter);
			var sorter=decodeURIComponent(req.query.sorter);
			var director=decodeURIComponent(req.query.director);
			var lbound=decodeURIComponent(req.query.lbound);
			var ubound=decodeURIComponent(req.query.ubound);
			var pageNum=0
			var totalResultNumber=0;
			
			var filterRec=null;
			
			if(filter=='未被確認'){
				filterRec="NotConfirmed";
			}else if(filter=='已被同意'){
				filterRec="Confirmed";
			}else if(filter=='已被婉拒'){
				filterRec="Rejected";
			}else{
				filter='未被確認';
				filterRec="NotConfirmed";
			}
			
			if((director!='大至小')&&(director!='小至大')){
				director='大至小';
			}
			
			var sorterRec=null;
			var sorterRecReserve=null;
			
			if(sorter=='更新日期'){
				sorterRecReserve='Updated';
			}else if(sorter=='建立日期'){
				sorterRecReserve='Created';
			}else if(sorter=='利率'){
				sorterRecReserve='InterestRate';
			}else if(sorter=='金額'){
				sorterRecReserve='MoneyToLend';
			}else if(sorter=='期數'){
				sorterRecReserve='MonthPeriod';
			}else if(sorter=='信用等級'){
				sorterRecReserve='Level';
			}else if(sorter=='預計總利息'){
				sorterRecReserve='Updated';
			}else if(sorter=='預計平均利息'){
				sorterRecReserve='Updated';
			}else if(sorter=='預計平均本利和'){
				sorterRecReserve='Updated';
			}else if(sorter=='預計利本比'){
				sorterRecReserve='Updated';
			}else{
				sorterRecReserve='Updated';
				sorter='更新日期';
			}
			sorterRec=library.directorDivider(director,sorterRecReserve,true);
			
			var lboundRec=null;
			var uboundRec=null;
			var revereDetector1=null;
			var revereDetector2=null;
			if((sorter=='利率')||(sorter=='預計利本比')){
				var tester;
				if(lbound.trim()!=''){
					tester=parseFloat(lbound);
					if(!isNaN(tester)){
						if(tester>=0){
							if(sorter=='利率'){
								lboundRec=(tester/100)+library.serviceChargeRate;//scr
							}else if(sorter=='預計利本比'){
								lboundRec=(tester/100);
							}
						}else{
							lbound='';
						}
					}else{
						lbound='';
					}
				}
				if(ubound.trim()!=''){
					tester=parseFloat(ubound);
					if(!isNaN(tester)){
						if(tester>=0){
							if(sorter=='利率'){
								uboundRec=(tester/100)+library.serviceChargeRate;//scr
							}else if(sorter=='預計利本比'){
								uboundRec=(tester/100);
							}
						}else{
							ubound='';
						}
					}else{
						ubound='';
					}
				}
				revereDetector1=lboundRec;
				revereDetector2=uboundRec;
			}else if((sorter=='更新日期')||(sorter=='建立日期')){
				var tester;
				if(lbound.trim()!=''){
					tester=Date.parse(lbound);
					if(!isNaN(tester)){
						lboundRec=new Date(tester);
					}else{
						lbound='';
					}
				}
				if(ubound.trim()!=''){
					tester=Date.parse(ubound);
					if(!isNaN(tester)){
						uboundRec=new Date(tester);
					}else{
						ubound='';
					}
				}
				if(lboundRec!==null){
					revereDetector1=lboundRec.getTime();
				}
				if(uboundRec!==null){
					revereDetector2=uboundRec.getTime();
				}
			}else{
				var tester;
				if(lbound.trim()!=''){
					tester=parseInt(lbound);
					if(!isNaN(tester)){
						if(tester>=0){
							lboundRec=tester;
						}else{
							lbound='';
						}
					}else{
						lbound='';
					}
				}
				if(ubound.trim()!=''){
					tester=parseInt(ubound);
					if(!isNaN(tester)){
						if(tester>=0){
							uboundRec=tester;
						}else{
							ubound='';
						}
					}else{
						ubound='';
					}
				}
				revereDetector1=lboundRec;
				revereDetector2=uboundRec;
			}
			if((revereDetector1!==null)&&(revereDetector2!==null)){
				if(revereDetector1>revereDetector2){
					var temp;
					temp=lboundRec;
					lboundRec=uboundRec;
					uboundRec=temp;
					temp=lbound;
					lbound=ubound;
					ubound=temp;
				}
			}
			
			var andFindCmdAry=[];
			andFindCmdAry.push({"CreatedBy": req.user._id});
			andFindCmdAry.push({"Type": "toLend"});
			andFindCmdAry.push({"Status": filterRec});
			
			if((sorter!='預計總利息')&&(sorter!='預計平均利息')&&(sorter!='預計平均本利和')&&(sorter!='預計利本比')){
				var jsonTemp={};
				if((lboundRec!==null)&&(uboundRec!==null)){
					jsonTemp[sorterRecReserve]={"$gte": lboundRec, "$lte": uboundRec};
					andFindCmdAry.push(jsonTemp);
				}else if(lboundRec!==null){
					jsonTemp[sorterRecReserve]={"$gte": lboundRec};
					andFindCmdAry.push(jsonTemp);
				}else if(uboundRec!==null){
					jsonTemp[sorterRecReserve]={"$lte": uboundRec};
					andFindCmdAry.push(jsonTemp);
				}
			}
			
			var msgKeyword=msgKeyword.replace(/\s\s+/g,' ');
			var stringArray=msgKeyword.split(' ');
			var keywordArray=[];
			for(i=0;i<stringArray.length;i++){
				keywordArray.push(new RegExp(stringArray[i],'i'));
			}
			var msgObjID=null;
			if(mongoose.Types.ObjectId.isValid(stringArray[0])){
				msgObjID=mongoose.Types.ObjectId(stringArray[0]);
			}
			
			var Messages  = mongoose.model('Messages');
			var Transactions  = mongoose.model('Transactions');
			var Returns = mongoose.model('Returns');
			Messages.find({$and:andFindCmdAry}).populate('SendTo', 'Username').populate('FromBorrowRequest', 'StoryTitle').populate('Transaction').sort(sorterRec).exec( function (err, messages, count){
				if (err) {
					console.log(err);
					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
				}else{
					if(messages.length==0){
						if(targetPage>1){
							res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
						}else{
							res.render('lenderSendMessages',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,msgKeywordDefault:msgKeyword,filterDefault:filter,sorterDefault:sorter,jsonMessage:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,insuranceRate:library.insuranceRate,delJSON:deleteJson,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound});
						}
					}else{
						var options = {
							path: 'Transaction.Return',
							model: Returns,
							select: 'InterestShouldPaid InterestNotPaid Created'
						};

						Transactions.populate(messages, options, function(err, messages){
							if(err){
								console.log(err);
								res.redirect('/message?content='+encodeURIComponent('錯誤!'));
							}else{
								for(j=messages.length-1;j>-1;j--){
									var testString=messages[j].Message+' '+messages[j].FromBorrowRequest.StoryTitle+' '+messages[j].SendTo.Username;
									var localFlag=[];
									var ctr;
									localFlag[0]=false;
									localFlag[1]=false;
									
									if(msgObjID){
										if(msgObjID.equals(messages[j]._id)){
											localFlag[0]=true;
										}
									}
									
									ctr=0;
									for(k=0;k<keywordArray.length;k++){
										if(testString.search(keywordArray[k])>-1){
											ctr++;
										}
									}
									if(ctr==keywordArray.length){
										localFlag[1]=true;
									}
									
									if((!localFlag[0])&&(!localFlag[1])){
										messages.splice(j, 1);
									}
								}
								
								for(i=0;i<messages.length;i++){
									messages[i].InterestRate-=library.serviceChargeRate;//scr
									messages[i].InterestInFuture=library.interestInFutureCalculator(messages[i].MoneyToLend,messages[i].InterestRate,messages[i].MonthPeriod);
									if(messages[i].MoneyToLend>0){
										messages[i].InterestInFutureDivMoney=messages[i].InterestInFuture/messages[i].MoneyToLend*100;
									}else{
										messages[i].InterestInFutureDivMoney=0;
									}
									if(messages[i].MonthPeriod>0){
										messages[i].InterestInFutureMonth=messages[i].InterestInFuture/messages[i].MonthPeriod;
									}else{
										messages[i].InterestInFutureMonth=0;
									}
									if(messages[i].MonthPeriod>0){
										messages[i].InterestInFutureMoneyMonth=(messages[i].InterestInFuture+messages[i].MoneyToLend)/messages[i].MonthPeriod;
									}else{
										messages[i].InterestInFutureMoneyMonth=0;
									}
									if(messages[i].Transaction.length>0){
										messages[i].Transaction[0].InterestRate-=library.serviceChargeRate;//scr
										messages[i].Transaction[0].InterestInFuture=library.interestInFutureCalculator(messages[i].Transaction[0].Principal,messages[i].Transaction[0].InterestRate,messages[i].Transaction[0].MonthPeriod);
										if(messages[i].Transaction[0].Principal>0){
											messages[i].Transaction[0].InterestInFutureDivMoney=messages[i].Transaction[0].InterestInFuture/messages[i].Transaction[0].Principal*100;
										}else{
											messages[i].Transaction[0].InterestInFutureDivMoney=0;
										}
										if(messages[i].Transaction[0].MonthPeriod>0){
											messages[i].Transaction[0].InterestInFutureMonth=messages[i].Transaction[0].InterestInFuture/messages[i].Transaction[0].MonthPeriod;
										}else{
											messages[i].Transaction[0].InterestInFutureMonth=0;
										}
										if(messages[i].Transaction[0].MonthPeriod>0){
											messages[i].Transaction[0].InterestInFutureMoneyMonth=(messages[i].Transaction[0].InterestInFuture+messages[i].Transaction[0].Principal)/messages[i].Transaction[0].MonthPeriod;
										}else{
											messages[i].Transaction[0].InterestInFutureMoneyMonth==0;
										}
										messages[i].Transaction[0].ReturnCount=0;
										messages[i].Transaction[0].previousPayDate=null;
										for(u=messages[i].Transaction[0].Return.length-1;u>-1;u--){
											if((messages[i].Transaction[0].Return[u].InterestShouldPaid-messages[i].Transaction[0].Return[u].InterestNotPaid)>0){
												messages[i].Transaction[0].ReturnCount+=1;
												if(messages[i].Transaction[0].previousPayDate===null){
													messages[i].Transaction[0].previousPayDate=messages[i].Transaction[0].Return[u].Created;
												}
											}
										}
										if(messages[i].Transaction[0].MonthPeriod>0){
											var tempDate=new Date(messages[i].Transaction[0].Created.getTime());
											tempDate.setTime(tempDate.getTime()+1000*60*60*24*30*(messages[i].Transaction[0].MonthPeriodHasPast+1));
											messages[i].Transaction[0].nextPayDate=tempDate;
										}else{
											messages[i].Transaction[0].nextPayDate=null;
										}
									}
								}
								
								if(sorter=='預計總利息'){
									if(director=='大至小'){
										messages.sort(function(a,b) { return parseFloat(b.InterestInFuture) - parseFloat(a.InterestInFuture)} );
									}else if(director=='小至大'){
										messages.sort(function(a,b) { return parseFloat(a.InterestInFuture) - parseFloat(b.InterestInFuture)} );
									}
									library.arrayFilter(messages,'InterestInFuture',lboundRec,uboundRec);	
								}else if(sorter=='預計平均利息'){
									if(director=='大至小'){
										messages.sort(function(a,b) { return parseFloat(b.InterestInFutureMonth) - parseFloat(a.InterestInFutureMonth)} );
									}else if(director=='小至大'){
										messages.sort(function(a,b) { return parseFloat(a.InterestInFutureMonth) - parseFloat(b.InterestInFutureMonth)} );
									}
									library.arrayFilter(messages,'InterestInFutureMonth',lboundRec,uboundRec);	
								}else if(sorter=='預計平均本利和'){
									if(director=='大至小'){
										messages.sort(function(a,b) { return parseFloat(b.InterestInFutureMoneyMonth) - parseFloat(a.InterestInFutureMoneyMonth)} );
									}else if(director=='小至大'){
										messages.sort(function(a,b) { return parseFloat(a.InterestInFutureMoneyMonth) - parseFloat(b.InterestInFutureMoneyMonth)} );
									}
									library.arrayFilter(messages,'InterestInFutureMoneyMonth',lboundRec,uboundRec);	
								}else if(sorter=='預計利本比'){
									if(director=='大至小'){
										messages.sort(function(a,b) { return parseFloat(b.InterestInFutureDivMoney) - parseFloat(a.InterestInFutureDivMoney)} );
									}else if(director=='小至大'){
										messages.sort(function(a,b) { return parseFloat(a.InterestInFutureDivMoney) - parseFloat(b.InterestInFutureDivMoney)} );
									}
									library.arrayFilter(messages,'InterestInFutureDivMoney',lboundRec,uboundRec);	
								}
								
								totalResultNumber=messages.length;
						
								if(totalResultNumber==0){
									if(targetPage>1){
										res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
									}else{
										res.render('lenderSendMessages',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,msgKeywordDefault:msgKeyword,filterDefault:filter,sorterDefault:sorter,jsonMessage:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,insuranceRate:library.insuranceRate,delJSON:deleteJson,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound});
									}
								}else{
									var divider=10;
									pageNum=Math.ceil(totalResultNumber/divider);
									
									if(pageNum<targetPage){
										res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
									}else{
										var starter=divider*(targetPage-1);
										var ender;
										if(targetPage==pageNum){
											ender=totalResultNumber;
										}else{
											ender=starter+divider;
										}
										for(i=starter;i<ender;i++){
											resArrays.push(messages[i]);
										}

										res.render('lenderSendMessages',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,msgKeywordDefault:msgKeyword,filterDefault:filter,sorterDefault:sorter,jsonMessage:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,insuranceRate:library.insuranceRate,delJSON:deleteJson,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound});
									}
								}
							}
						});
					}
				}
			});
		}else{
			res.redirect('/');
		}
	}else{
		res.redirect('/');
	}
});

router.get('/lenderReceiveMessages/:msgKeyword?/:filter?/:sorter?/:director?/:lbound?/:ubound?/:page?',library.loginFormChecker, library.ensureAuthenticated,library.newMsgChecker, function (req, res) {
	if((typeof(req.query.msgKeyword) !== "undefined")&&(typeof(req.query.filter) !== "undefined")&&(typeof(req.query.sorter) !== "undefined")&&(typeof(req.query.director) !== "undefined")&&(typeof(req.query.lbound) !== "undefined")&&(typeof(req.query.ubound) !== "undefined")&&(typeof(req.query.page) !== "undefined")){
		var targetPage=parseInt(req.query.page);
		if(!isNaN(targetPage)){
			
			var stringArrayFlash=req.flash('confirmFlash');
			var confirmJson=null;
			if(stringArrayFlash.length>0){
				confirmJson=JSON.parse(stringArrayFlash[0]);
			}
			
			var stringArrayFlash2=req.flash('rejectFlash');
			var rejectJson=null;
			if(stringArrayFlash2.length>0){
				rejectJson=JSON.parse(stringArrayFlash2[0]);
			}
			
			var resArrays=[];
			var msgKeyword=decodeURIComponent(req.query.msgKeyword);
			var filter=decodeURIComponent(req.query.filter);
			var sorter=decodeURIComponent(req.query.sorter);
			var director=decodeURIComponent(req.query.director);
			var lbound=decodeURIComponent(req.query.lbound);
			var ubound=decodeURIComponent(req.query.ubound);
			var pageNum=0
			var totalResultNumber=0;
			var value1ALL=0;
			var value2ALL=0;
			var value3ALL=0;
			var value4ALL=0;
			
			var filterRec=null;
			
			if(filter=='未確認'){
				filterRec="NotConfirmed";
			}else if(filter=='已同意'){
				filterRec="Confirmed";
			}else if(filter=='已婉拒'){
				filterRec="Rejected";
			}else{
				filter='未確認';
				filterRec="NotConfirmed";
			}
			
			if((director!='大至小')&&(director!='小至大')){
				director='大至小';
			}
			
			var sorterRec=null;
			var sorterRecReserve=null;
			
			if(sorter=='更新日期'){
				sorterRecReserve='Updated';
			}else if(sorter=='建立日期'){
				sorterRecReserve='Created';
			}else if(sorter=='利率'){
				sorterRecReserve='InterestRate';
			}else if(sorter=='金額'){
				sorterRecReserve='MoneyToLend';
			}else if(sorter=='期數'){
				sorterRecReserve='MonthPeriod';
			}else if(sorter=='信用等級'){
				sorterRecReserve='Level';
			}else if(sorter=='預計總利息'){
				sorterRecReserve='Updated';
			}else if(sorter=='預計平均利息'){
				sorterRecReserve='Updated';
			}else if(sorter=='預計平均本利和'){
				sorterRecReserve='Updated';
			}else if(sorter=='預計利本比'){
				sorterRecReserve='Updated';
			}else{
				sorterRecReserve='Updated';
				sorter='更新日期';
			}
			sorterRec=library.directorDivider(director,sorterRecReserve,true);
			
			var lboundRec=null;
			var uboundRec=null;
			var revereDetector1=null;
			var revereDetector2=null;
			if((sorter=='利率')||(sorter=='預計利本比')){
				var tester;
				if(lbound.trim()!=''){
					tester=parseFloat(lbound);
					if(!isNaN(tester)){
						if(tester>=0){
							if(sorter=='利率'){
								lboundRec=(tester/100)+library.serviceChargeRate;//scr
							}else if(sorter=='預計利本比'){
								lboundRec=(tester/100);
							}
						}else{
							lbound='';
						}
					}else{
						lbound='';
					}
				}
				if(ubound.trim()!=''){
					tester=parseFloat(ubound);
					if(!isNaN(tester)){
						if(tester>=0){
							if(sorter=='利率'){
								uboundRec=(tester/100)+library.serviceChargeRate;//scr
							}else if(sorter=='預計利本比'){
								uboundRec=(tester/100);
							}
						}else{
							ubound='';
						}
					}else{
						ubound='';
					}
				}
				revereDetector1=lboundRec;
				revereDetector2=uboundRec;
			}else if((sorter=='更新日期')||(sorter=='建立日期')){
				var tester;
				if(lbound.trim()!=''){
					tester=Date.parse(lbound);
					if(!isNaN(tester)){
						lboundRec=new Date(tester);
					}else{
						lbound='';
					}
				}
				if(ubound.trim()!=''){
					tester=Date.parse(ubound);
					if(!isNaN(tester)){
						uboundRec=new Date(tester);
					}else{
						ubound='';
					}
				}
				if(lboundRec!==null){
					revereDetector1=lboundRec.getTime();
				}
				if(uboundRec!==null){
					revereDetector2=uboundRec.getTime();
				}
			}else{
				var tester;
				if(lbound.trim()!=''){
					tester=parseInt(lbound);
					if(!isNaN(tester)){
						if(tester>=0){
							lboundRec=tester;
						}else{
							lbound='';
						}
					}else{
						lbound='';
					}
				}
				if(ubound.trim()!=''){
					tester=parseInt(ubound);
					if(!isNaN(tester)){
						if(tester>=0){
							uboundRec=tester;
						}else{
							ubound='';
						}
					}else{
						ubound='';
					}
				}
				revereDetector1=lboundRec;
				revereDetector2=uboundRec;
			}
			if((revereDetector1!==null)&&(revereDetector2!==null)){
				if(revereDetector1>revereDetector2){
					var temp;
					temp=lboundRec;
					lboundRec=uboundRec;
					uboundRec=temp;
					temp=lbound;
					lbound=ubound;
					ubound=temp;
				}
			}
			
			var andFindCmdAry=[];
			andFindCmdAry.push({"SendTo": req.user._id});
			andFindCmdAry.push({"Type": "toBorrow"});
			andFindCmdAry.push({"Status": filterRec});
			
			if((sorter!='預計總利息')&&(sorter!='預計平均利息')&&(sorter!='預計平均本利和')&&(sorter!='預計利本比')){
				var jsonTemp={};
				if((lboundRec!==null)&&(uboundRec!==null)){
					jsonTemp[sorterRecReserve]={"$gte": lboundRec, "$lte": uboundRec};
					andFindCmdAry.push(jsonTemp);
				}else if(lboundRec!==null){
					jsonTemp[sorterRecReserve]={"$gte": lboundRec};
					andFindCmdAry.push(jsonTemp);
				}else if(uboundRec!==null){
					jsonTemp[sorterRecReserve]={"$lte": uboundRec};
					andFindCmdAry.push(jsonTemp);
				}
			}
			
			var msgKeyword=msgKeyword.replace(/\s\s+/g,' ');
			var stringArray=msgKeyword.split(' ');
			var keywordArray=[];
			for(i=0;i<stringArray.length;i++){
				keywordArray.push(new RegExp(stringArray[i],'i'));
			}
			var msgObjID=null;
			if(mongoose.Types.ObjectId.isValid(stringArray[0])){
				msgObjID=mongoose.Types.ObjectId(stringArray[0]);
			}
			
			var Lends = mongoose.model('Lends');
			var Messages  = mongoose.model('Messages');
			var Transactions  = mongoose.model('Transactions');
			var Returns = mongoose.model('Returns');
			var BankAccounts = mongoose.model('BankAccounts');
			Messages.find({$and:andFindCmdAry}).populate('CreatedBy', 'Username').populate('FromBorrowRequest', 'StoryTitle').populate('Transaction').sort(sorterRec).exec( function (err, messages, count){
				if (err) {
					console.log(err);
					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
				}else{
					if(messages.length==0){
						if(targetPage>1){
							res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
						}else{
							res.render('lenderReceiveMessages',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,msgKeywordDefault:msgKeyword,filterDefault:filter,sorterDefault:sorter,jsonMessage:resArrays,jsonLend:null,jsonAccount:null,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,value1AllDefault:value1ALL,value2AllDefault:value2ALL,value3AllDefault:value3ALL,value4AllDefault:value4ALL,insuranceRate:library.insuranceRate,cfJSON:confirmJson,rjJSON:rejectJson,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound});
						}
					}else{
						var options = {
							path: 'Transaction.Return',
							model: Returns,
							select: 'InterestShouldPaid InterestNotPaid Created'
						};

						Transactions.populate(messages, options, function(err, messages) {
							if(err){
								console.log(err);
								res.redirect('/message?content='+encodeURIComponent('錯誤!'));
							}else{
								for(j=messages.length-1;j>-1;j--){
									var testString=messages[j].Message+' '+messages[j].FromBorrowRequest.StoryTitle+' '+messages[j].CreatedBy.Username;
									var localFlag=[];
									var ctr;
									localFlag[0]=false;
									localFlag[1]=false;
									
									if(msgObjID){
										if(msgObjID.equals(messages[j]._id)){
											localFlag[0]=true;
										}
									}
									
									ctr=0;
									for(k=0;k<keywordArray.length;k++){
										if(testString.search(keywordArray[k])>-1){
											ctr++;
										}
									}
									if(ctr==keywordArray.length){
										localFlag[1]=true;
									}
									
									if((!localFlag[0])&&(!localFlag[1])){
										messages.splice(j, 1);
									}
								}
								
								for(i=0;i<messages.length;i++){
									messages[i].InterestRate-=library.serviceChargeRate;//scr
									messages[i].InterestInFuture=library.interestInFutureCalculator(messages[i].MoneyToLend,messages[i].InterestRate,messages[i].MonthPeriod);
									if(messages[i].MoneyToLend>0){
										messages[i].InterestInFutureDivMoney=messages[i].InterestInFuture/messages[i].MoneyToLend*100;
									}else{
										messages[i].InterestInFutureDivMoney=0;
									}
									if(messages[i].MonthPeriod>0){
										messages[i].InterestInFutureMonth=messages[i].InterestInFuture/messages[i].MonthPeriod;
									}else{
										messages[i].InterestInFutureMonth=0;
									}
									if(messages[i].MonthPeriod>0){
										messages[i].InterestInFutureMoneyMonth=(messages[i].InterestInFuture+messages[i].MoneyToLend)/messages[i].MonthPeriod;
									}else{
										messages[i].InterestInFutureMoneyMonth=0;
									}
									if(messages[i].Transaction.length>0){
										messages[i].Transaction[0].InterestRate-=library.serviceChargeRate;//scr
										messages[i].Transaction[0].InterestInFuture=library.interestInFutureCalculator(messages[i].Transaction[0].Principal,messages[i].Transaction[0].InterestRate,messages[i].Transaction[0].MonthPeriod);
										if(messages[i].Transaction[0].Principal>0){
											messages[i].Transaction[0].InterestInFutureDivMoney=messages[i].Transaction[0].InterestInFuture/messages[i].Transaction[0].Principal*100;
										}else{
											messages[i].Transaction[0].InterestInFutureDivMoney=0;
										}
										if(messages[i].Transaction[0].MonthPeriod>0){
											messages[i].Transaction[0].InterestInFutureMonth=messages[i].Transaction[0].InterestInFuture/messages[i].Transaction[0].MonthPeriod;
										}else{
											messages[i].Transaction[0].InterestInFutureMonth=0;
										}
										if(messages[i].Transaction[0].MonthPeriod>0){
											messages[i].Transaction[0].InterestInFutureMoneyMonth=(messages[i].Transaction[0].InterestInFuture+messages[i].Transaction[0].Principal)/messages[i].Transaction[0].MonthPeriod;
										}else{
											messages[i].Transaction[0].InterestInFutureMoneyMonth==0;
										}
										messages[i].Transaction[0].ReturnCount=0;
										messages[i].Transaction[0].previousPayDate=null;
										for(u=messages[i].Transaction[0].Return.length-1;u>-1;u--){
											if((messages[i].Transaction[0].Return[u].InterestShouldPaid-messages[i].Transaction[0].Return[u].InterestNotPaid)>0){
												messages[i].Transaction[0].ReturnCount+=1;
												if(messages[i].Transaction[0].previousPayDate===null){
													messages[i].Transaction[0].previousPayDate=messages[i].Transaction[0].Return[u].Created;
												}
											}
										}
										if(messages[i].Transaction[0].MonthPeriod>0){
											var tempDate=new Date(messages[i].Transaction[0].Created.getTime());
											tempDate.setTime(tempDate.getTime()+1000*60*60*24*30*(messages[i].Transaction[0].MonthPeriodHasPast+1));
											messages[i].Transaction[0].nextPayDate=tempDate;
										}else{
											messages[i].Transaction[0].nextPayDate=null;
										}
									}
								}
								
								if(sorter=='預計總利息'){
									if(director=='大至小'){
										messages.sort(function(a,b) { return parseFloat(b.InterestInFuture) - parseFloat(a.InterestInFuture)} );
									}else if(director=='小至大'){
										messages.sort(function(a,b) { return parseFloat(a.InterestInFuture) - parseFloat(b.InterestInFuture)} );
									}
									library.arrayFilter(messages,'InterestInFuture',lboundRec,uboundRec);	
								}else if(sorter=='預計平均利息'){
									if(director=='大至小'){
										messages.sort(function(a,b) { return parseFloat(b.InterestInFutureMonth) - parseFloat(a.InterestInFutureMonth)} );
									}else if(director=='小至大'){
										messages.sort(function(a,b) { return parseFloat(a.InterestInFutureMonth) - parseFloat(b.InterestInFutureMonth)} );
									}
									library.arrayFilter(messages,'InterestInFutureMonth',lboundRec,uboundRec);	
								}else if(sorter=='預計平均本利和'){
									if(director=='大至小'){
										messages.sort(function(a,b) { return parseFloat(b.InterestInFutureMoneyMonth) - parseFloat(a.InterestInFutureMoneyMonth)} );
									}else if(director=='小至大'){
										messages.sort(function(a,b) { return parseFloat(a.InterestInFutureMoneyMonth) - parseFloat(b.InterestInFutureMoneyMonth)} );
									}
									library.arrayFilter(messages,'InterestInFutureMoneyMonth',lboundRec,uboundRec);	
								}else if(sorter=='預計利本比'){
									if(director=='大至小'){
										messages.sort(function(a,b) { return parseFloat(b.InterestInFutureDivMoney) - parseFloat(a.InterestInFutureDivMoney)} );
									}else if(director=='小至大'){
										messages.sort(function(a,b) { return parseFloat(a.InterestInFutureDivMoney) - parseFloat(b.InterestInFutureDivMoney)} );
									}
									library.arrayFilter(messages,'InterestInFutureDivMoney',lboundRec,uboundRec);	
								}
								
								totalResultNumber=messages.length;
						
								if(totalResultNumber==0){
									if(targetPage>1){
										res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
									}else{
										res.render('lenderReceiveMessages',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,msgKeywordDefault:msgKeyword,filterDefault:filter,sorterDefault:sorter,jsonMessage:resArrays,jsonLend:null,jsonAccount:null,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,value1AllDefault:value1ALL,value2AllDefault:value2ALL,value3AllDefault:value3ALL,value4AllDefault:value4ALL,insuranceRate:library.insuranceRate,cfJSON:confirmJson,rjJSON:rejectJson,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound});
									}
								}else{
									for(p=0;p<totalResultNumber;p++){
										value1ALL+=messages[p].MoneyToLend;
										value2ALL+=messages[p].InterestInFuture;
										value3ALL+=messages[p].InterestInFutureMonth;
										value4ALL+=messages[p].InterestInFutureMoneyMonth;
									}
									
									var divider=10;
									pageNum=Math.ceil(totalResultNumber/divider);
									
									if(pageNum<targetPage){
										res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
									}else{
										var starter=divider*(targetPage-1);
										var ender;
										if(targetPage==pageNum){
											ender=totalResultNumber;
										}else{
											ender=starter+divider;
										}
										for(i=starter;i<ender;i++){
											resArrays.push(messages[i]);
										}

										Lends.findOne({"CreatedBy": req.user._id}).exec( function (err, lend){
											if (err) {
												console.log(err);
												res.redirect('/message?content='+encodeURIComponent('錯誤!'));
											}else{
												BankAccounts.findOne({"OwnedBy": req.user._id}).exec(function (err, bankaccount){
													if (err) {
														console.log(err);
														res.redirect('/message?content='+encodeURIComponent('錯誤!'));
													}else{
														if(!bankaccount){
															res.redirect('/message?content='+encodeURIComponent('無銀行帳戶!'));
														}else{
															res.render('lenderReceiveMessages',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,msgKeywordDefault:msgKeyword,filterDefault:filter,sorterDefault:sorter,jsonMessage:resArrays,jsonLend:lend,jsonAccount:bankaccount,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,value1AllDefault:value1ALL,value2AllDefault:value2ALL,value3AllDefault:value3ALL,value4AllDefault:value4ALL,insuranceRate:library.insuranceRate,cfJSON:confirmJson,rjJSON:rejectJson,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound});
														}
													}
												});
											}
										});
									}
								}
							}
						});
					}
				}
			});
		}else{
			res.redirect('/');
		}
	}else{
		res.redirect('/');
	}
});

router.get('/income',library.loginFormChecker, library.ensureAuthenticated, library.newMsgChecker,function (req, res) {
	var totalResultNumber;
	var monthPrincipalNotReturnNow=0;
	var monthRevenueNow=0;
	var monthRoiNow=0;
	var monthPrincipalNow=0;
	var monthRevenuePrincipalNow=0;
	var monthArray=[];
	var monthArray2=[];
	var yearPrincipalNotReturn=0;
	var yearRoi=0;
	var yearRevenue=0;
	var yearPrincipal=0;
	var yearRevenuePrincipal=0;
	var yearHistoryPrincipalNotReturn=0;
	var yearHistoryRoi=0;
	var yearHistoryRevenue=0;
	var yearHistoryPrincipal=0;
	var yearHistoryRevenuePrincipal=0;
	var data1={};
	var data2={};
	var data3={};
	var data4={};
	var data5={};
	var data6={};
	var data7={};
	var data8={};
	var data9={};
	var data10={};
	var data11={};
	var Transactions  = mongoose.model('Transactions');
	Transactions.find({$and:[{Lender:req.user._id},{Principal:{"$gte": 1}},{MonthPeriod:{"$gte": 1}}]}).populate('Return').exec( function (err, transactions, count){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			totalResultNumber=transactions.length;
			console.log(totalResultNumber);
			if(totalResultNumber<=0){
				res.render('income',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,totalResultNum:totalResultNumber,monPriNRNow:monthPrincipalNotReturnNow,monRevNow:monthRevenueNow,monRoiNow:monthRoiNow,monPriNow:monthPrincipalNow,monRevPriNow:monthRevenuePrincipalNow,yrPriNR:yearPrincipalNotReturn,yrRoi:yearRoi,yrRev:yearRevenue,yrPri:yearPrincipal,yrRevPri:yearRevenuePrincipal,yrHistoryPriNR:yearHistoryPrincipalNotReturn,yrHistoryRoi:yearHistoryRoi,yrHistoryRev:yearHistoryRevenue,yrHistoryPri:yearHistoryPrincipal,yrHistoryRevPri:yearHistoryRevenuePrincipal,data01:data1,data02:data2,data03:data3,data04:data4,data05:data5,data06:data6,data07:data7,data08:data8,data09:data9,data010:data10,data011:data11});
			}else{
				for(i=0;i<totalResultNumber;i++){
					transactions[i].InterestRate-=library.serviceChargeRate;//scr
					transactions[i].tempPrincipal=transactions[i].Principal;
					transactions[i].tempMonthPeriod=transactions[i].MonthPeriod;
					if(transactions[i].Return.length>0){
						transactions[i].Return.reverse();
					}
				}
				
				for(j=0;j<12;j++){
					var tempMonthRevunue=0;
					var tempMonthPrincipal=0;
					var tempMonthPrincipalReturn=0;
					for(i=0;i<totalResultNumber;i++){
						if(transactions[i].tempPrincipal>0){
							tempMonthPrincipal+=transactions[i].tempPrincipal;
							tempMonthRevunue+=Math.round(transactions[i].tempPrincipal*transactions[i].InterestRate/12);
							
							transactions[i].monthPaidPrincipal=Math.floor(transactions[i].tempPrincipal/transactions[i].tempMonthPeriod);
							if(transactions[i].tempMonthPeriod>1){
								tempMonthPrincipalReturn+=transactions[i].monthPaidPrincipal;
								transactions[i].tempPrincipal-=transactions[i].monthPaidPrincipal;
							}else{
								tempMonthPrincipalReturn+=transactions[i].tempPrincipal;
								transactions[i].tempPrincipal-=transactions[i].tempPrincipal;
							}
							transactions[i].tempMonthPeriod-=1;
							if(transactions[i].tempPrincipal<0){
								transactions[i].tempPrincipal=0;
							}
						}
					}
					var tempMonthRoi=0;
					if(tempMonthPrincipal>0){
						tempMonthRoi=tempMonthRevunue/tempMonthPrincipal*1000;
						var tempJson={PrincipalNR:tempMonthPrincipal,ROI: Math.round(tempMonthRoi*10000)/10000, Revenue: Math.round(tempMonthRevunue*100)/100, Principal: Math.round(tempMonthPrincipalReturn*100)/100, RevenuePrincipal: Math.round((tempMonthRevunue+tempMonthPrincipalReturn)*100)/100};
						monthArray.push(tempJson);
					}
					if(j==0){
						monthPrincipalNotReturnNow=tempMonthPrincipal.toFixed(0);
						monthRevenueNow=tempMonthRevunue.toFixed(0);
						monthRoiNow=tempMonthRoi.toFixed(4);
						monthPrincipalNow=tempMonthPrincipalReturn.toFixed(0);
						monthRevenuePrincipalNow=(tempMonthPrincipalReturn+tempMonthRevunue).toFixed(0);
					}
				}
				
				for(j=0;j<12;j++){
					var tempMonthRevunue=0;
					var tempMonthPrincipal=0;
					var tempMonthPrincipalReturn=0;
					for(i=0;i<totalResultNumber;i++){
						if(transactions[i].Return.length>0){
							tempMonthRevunue+=(transactions[i].Return[0].InterestShouldPaid-transactions[i].Return[0].InterestNotPaid);
							tempMonthPrincipal+=transactions[i].Return[0].PrincipalBeforePaid;
							tempMonthPrincipalReturn+=(transactions[i].Return[0].PrincipalShouldPaid-transactions[i].Return[0].PrincipalNotPaid);
							transactions[i].Return.splice(0,1);
						}
					}
					var tempMonthRoi=0;
					if(tempMonthPrincipal>0){
						tempMonthRoi=tempMonthRevunue/tempMonthPrincipal*1000;
						var tempJson={PrincipalNR:tempMonthPrincipal,ROI: Math.round(tempMonthRoi*10000)/10000, Revenue: Math.round(tempMonthRevunue*100)/100, Principal: Math.round(tempMonthPrincipalReturn*100)/100, RevenuePrincipal: Math.round((tempMonthRevunue+tempMonthPrincipalReturn)*100)/100};
						monthArray2.push(tempJson);
					}
				}
				
				var datasets=[];
				var dataset={
							label: "Monthly Principal Investment",
							fillColor: "rgba(151,187,205,0.2)",
							strokeColor: "rgba(151,187,205,1)",
							pointColor: "rgba(151,187,205,1)",
							pointStrokeColor: "#fff",
							pointHighlightFill: "#fff",
							pointHighlightStroke: "rgba(151,187,205,1)",
							data: []
						};
				var datasets2=[];
				var dataset2={
							label: "Monthly Interest Revenue",
							fillColor: "rgba(151,187,205,0.2)",
							strokeColor: "rgba(151,187,205,1)",
							pointColor: "rgba(151,187,205,1)",
							pointStrokeColor: "#fff",
							pointHighlightFill: "#fff",
							pointHighlightStroke: "rgba(151,187,205,1)",
							data: []
						};
				var datasets3=[];
				var dataset3={
							label: "Monthly Principal Return",
							fillColor: "rgba(151,187,205,0.2)",
							strokeColor: "rgba(151,187,205,1)",
							pointColor: "rgba(151,187,205,1)",
							pointStrokeColor: "#fff",
							pointHighlightFill: "#fff",
							pointHighlightStroke: "rgba(151,187,205,1)",
							data: []
						};
				var datasets4=[];
				var dataset4={
							label: "Monthly Interest with Principal Return",
							fillColor: "rgba(151,187,205,0.2)",
							strokeColor: "rgba(151,187,205,1)",
							pointColor: "rgba(151,187,205,1)",
							pointStrokeColor: "#fff",
							pointHighlightFill: "#fff",
							pointHighlightStroke: "rgba(151,187,205,1)",
							data: []
						};
				var datasets5=[];
				var dataset5={
							label: "Monthly ROI",
							fillColor: "rgba(220,220,220,0.2)",
							strokeColor: "rgba(220,220,220,1)",
							pointColor: "rgba(220,220,220,1)",
							pointStrokeColor: "#fff",
							pointHighlightFill: "#fff",
							pointHighlightStroke: "rgba(220,220,220,1)",
							data: []
						};
				var datasets6=[];
				var dataset6={
							label: "History Principal Investment",
							fillColor: "rgba(151,187,205,0.2)",
							strokeColor: "rgba(151,187,205,1)",
							pointColor: "rgba(151,187,205,1)",
							pointStrokeColor: "#fff",
							pointHighlightFill: "#fff",
							pointHighlightStroke: "rgba(151,187,205,1)",
							data: []
						};
				var datasets7=[];
				var dataset7={
							label: "History Interest Revenue",
							fillColor: "rgba(151,187,205,0.2)",
							strokeColor: "rgba(151,187,205,1)",
							pointColor: "rgba(151,187,205,1)",
							pointStrokeColor: "#fff",
							pointHighlightFill: "#fff",
							pointHighlightStroke: "rgba(151,187,205,1)",
							data: []
						};
				var datasets8=[];
				var dataset8={
							label: "History Principal Return",
							fillColor: "rgba(151,187,205,0.2)",
							strokeColor: "rgba(151,187,205,1)",
							pointColor: "rgba(151,187,205,1)",
							pointStrokeColor: "#fff",
							pointHighlightFill: "#fff",
							pointHighlightStroke: "rgba(151,187,205,1)",
							data: []
						};
				var datasets9=[];
				var dataset9={
							label: "History Interest with Principal Return",
							fillColor: "rgba(151,187,205,0.2)",
							strokeColor: "rgba(151,187,205,1)",
							pointColor: "rgba(151,187,205,1)",
							pointStrokeColor: "#fff",
							pointHighlightFill: "#fff",
							pointHighlightStroke: "rgba(151,187,205,1)",
							data: []
						};
				var datasets10=[];
				var dataset10={
							label: "History ROI",
							fillColor: "rgba(220,220,220,0.2)",
							strokeColor: "rgba(220,220,220,1)",
							pointColor: "rgba(220,220,220,1)",
							pointStrokeColor: "#fff",
							pointHighlightFill: "#fff",
							pointHighlightStroke: "rgba(220,220,220,1)",
							data: []
						};
				
				datasets.push(dataset);
				datasets2.push(dataset2);
				datasets3.push(dataset3);
				datasets4.push(dataset4);
				datasets5.push(dataset5);
				datasets6.push(dataset6);
				datasets7.push(dataset7);
				datasets8.push(dataset8);
				datasets9.push(dataset9);
				datasets10.push(dataset10);
				data1.labels=[];
				data2.labels=[];
				data3.labels=[];
				data4.labels=[];
				data5.labels=[];
				data6.labels=[];
				data7.labels=[];
				data8.labels=[];
				data9.labels=[];
				data10.labels=[];
				data1.datasets=datasets;
				data2.datasets=datasets2;
				data3.datasets=datasets3;
				data4.datasets=datasets4;
				data5.datasets=datasets5;
				data6.datasets=datasets6;
				data7.datasets=datasets7;
				data8.datasets=datasets8;
				data9.datasets=datasets9;
				data10.datasets=datasets10;
				
				var date = new Date();
				var ctrMonth=date.getMonth()+1;
				
				for(j=0;j<monthArray.length;j++){
					yearRoi+=monthArray[j].ROI;
					yearRevenue+=monthArray[j].Revenue;
					yearPrincipal+=monthArray[j].Principal;
					yearRevenuePrincipal+=monthArray[j].RevenuePrincipal;
					yearPrincipalNotReturn+=monthArray[j].PrincipalNR;
					data1.labels.push(ctrMonth+'月');
					data2.labels.push(ctrMonth+'月');
					data3.labels.push(ctrMonth+'月');
					data4.labels.push(ctrMonth+'月');
					data5.labels.push(ctrMonth+'月');
					ctrMonth+=1;
					if(ctrMonth>12){
						ctrMonth=1;
					}
					data1.datasets[0].data.push(monthArray[j].PrincipalNR);
					data2.datasets[0].data.push(monthArray[j].Revenue);
					data3.datasets[0].data.push(monthArray[j].Principal);
					data4.datasets[0].data.push(monthArray[j].RevenuePrincipal);
					data5.datasets[0].data.push(monthArray[j].ROI);
				}
				if(monthArray.length>0){
					yearRoi=yearRoi/monthArray.length;
					yearPrincipalNotReturn=yearPrincipalNotReturn/monthArray.length;
				}
				yearPrincipalNotReturn=yearPrincipalNotReturn.toFixed(0);
				yearRoi=yearRoi.toFixed(4);
				yearRevenue=yearRevenue.toFixed(0);
				yearPrincipal=yearPrincipal.toFixed(0);
				yearRevenuePrincipal=yearRevenuePrincipal.toFixed(0);
				
				var ctrMonth2=date.getMonth();
				
				for(j=0;j<monthArray2.length;j++){
					yearHistoryRoi+=monthArray2[j].ROI;
					yearHistoryRevenue+=monthArray2[j].Revenue;
					yearHistoryPrincipal+=monthArray2[j].Principal;
					yearHistoryRevenuePrincipal+=monthArray2[j].RevenuePrincipal;
					yearHistoryPrincipalNotReturn+=monthArray2[j].PrincipalNR;
					data6.labels.push(ctrMonth2+'月');
					data7.labels.push(ctrMonth2+'月');
					data8.labels.push(ctrMonth2+'月');
					data9.labels.push(ctrMonth2+'月');
					data10.labels.push(ctrMonth2+'月');
					ctrMonth2-=1;
					if(ctrMonth2<1){
						ctrMonth2=12;
					}
					data6.datasets[0].data.push(monthArray2[j].PrincipalNR);
					data7.datasets[0].data.push(monthArray2[j].Revenue);
					data8.datasets[0].data.push(monthArray2[j].Principal);
					data9.datasets[0].data.push(monthArray2[j].RevenuePrincipal);
					data10.datasets[0].data.push(monthArray2[j].ROI);
				}
				data6.labels.reverse();
				data6.datasets[0].data.reverse();
				data7.labels.reverse();
				data7.datasets[0].data.reverse();
				data8.labels.reverse();
				data8.datasets[0].data.reverse();
				data9.labels.reverse();
				data9.datasets[0].data.reverse();
				data10.labels.reverse();
				data10.datasets[0].data.reverse();
				if(monthArray2.length>0){
					yearHistoryRoi=yearHistoryRoi/monthArray2.length;
					yearHistoryPrincipalNotReturn=yearHistoryPrincipalNotReturn/monthArray2.length;
				}
				yearHistoryPrincipalNotReturn=yearHistoryPrincipalNotReturn.toFixed(0);
				yearHistoryRoi=yearHistoryRoi.toFixed(4);
				yearHistoryRevenue=yearHistoryRevenue.toFixed(0);
				yearHistoryPrincipal=yearHistoryPrincipal.toFixed(0);
				yearHistoryRevenuePrincipal=yearHistoryRevenuePrincipal.toFixed(0);
				
				var data11Array = [
					{
						value: 0,
						color:"#F7464A",
						highlight: "#FF5A5E",
						label: "0~5級"
					},
					{
						value: 0,
						color: "#46BFBD",
						highlight: "#5AD3D1",
						label: "5~10級"
					},
					{
						value: 0,
						color: "#FDB45C",
						highlight: "#FFC870",
						label: "10~15級"
					},
					{
						value: 0,
						color: "#949FB1",
						highlight: "#A8B3C5",
						label: "15~20級"
					},
					{
						value: 0,
						color: "#4D5360",
						highlight: "#616774",
						label: "20級以上"
					}
				];
				
				for(i=0;i<totalResultNumber;i++){
					if((transactions[i].Level>=0)&&(transactions[i].Level<5)){
						data11Array[0].value+=1;
					}else if((transactions[i].Level>=5)&&(transactions[i].Level<10)){
						data11Array[1].value+=1;
					}else if((transactions[i].Level>=10)&&(transactions[i].Level<15)){
						data11Array[2].value+=1;
					}else if((transactions[i].Level>=15)&&(transactions[i].Level<20)){
						data11Array[3].value+=1;
					}else if(transactions[i].Level>=20){
						data11Array[4].value+=1;
					}
				}
				
				var totalTemp=0;
				for(i=0;i<data11Array.length;i++){
					totalTemp+=data11Array[i].value;
				}

				for(i=0;i<data11Array.length;i++){
					data11Array[i].value=data11Array[i].value/totalTemp*100;
				}
				data11.array=data11Array;
				res.render('income',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,totalResultNum:totalResultNumber,monPriNRNow:monthPrincipalNotReturnNow,monRevNow:monthRevenueNow,monRoiNow:monthRoiNow,monPriNow:monthPrincipalNow,monRevPriNow:monthRevenuePrincipalNow,yrPriNR:yearPrincipalNotReturn,yrRoi:yearRoi,yrRev:yearRevenue,yrPri:yearPrincipal,yrRevPri:yearRevenuePrincipal,yrHistoryPriNR:yearHistoryPrincipalNotReturn,yrHistoryRoi:yearHistoryRoi,yrHistoryRev:yearHistoryRevenue,yrHistoryPri:yearHistoryPrincipal,yrHistoryRevPri:yearHistoryRevenuePrincipal,data01:data1,data02:data2,data03:data3,data04:data4,data05:data5,data06:data6,data07:data7,data08:data8,data09:data9,data010:data10,data011:data11});
			}
		}
	});
});

module.exports = router;


