var library=require( './library.js' );
var mongoose = require('mongoose');

var express = require('express');
var router = express.Router();

router.get('/search/:keyword?/:category?/:messenger?/:action?/:director?/:lbound?/:ubound?/:page?',library.loginFormChecker,library.newMsgChecker, function (req, res) {
	if((typeof(req.query.keyword) !== "undefined")&&(typeof(req.query.category) !== "undefined")&&(typeof(req.query.messenger) !== "undefined")&&(typeof(req.query.action) !== "undefined")&&(typeof(req.query.director) !== "undefined")&&(typeof(req.query.lbound) !== "undefined")&&(typeof(req.query.ubound) !== "undefined")&&(typeof(req.query.page) !== "undefined")){
		var targetPage=parseInt(req.query.page);
		if(!isNaN(targetPage)){
			var auRst=null;
			if(req.isAuthenticated()){
				auRst=req.user.Username;
			}
			
			var resArrays=[];
			var action=decodeURIComponent(req.query.action);
			var category=decodeURIComponent(req.query.category);
			var messenger=decodeURIComponent(req.query.messenger);
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
			}else if(action=='原始需要金額'){
				actionRecReserve='MoneyToBorrow';
			}else if(action=='已經借到金額'){
				actionRecReserve='Created';
			}else if(action=='還需要金額'){
				actionRecReserve='Created';
			}else if(action=='年利率'){
				actionRecReserve='MaxInterestRateAccepted';
			}else if(action=='最低期數'){
				actionRecReserve='MonthPeriodAcceptedLowest';
			}else if(action=='最高期數'){
				actionRecReserve='MonthPeriodAccepted';
			}else if(action=='信用等級'){
				actionRecReserve='Created';
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
				categoryRec=null;
				category='不分類';
			}
			
			var messengerRec=false;
			
			if(messenger=='無訊息'){
				messengerRec=true;
			}else if(messenger=='有訊息'){
				messengerRec=true;
			}else if(messenger=='訊息未確認或未被確認'){
				messengerRec=true;
			}else if(messenger=='訊息已同意或已被同意'){
				messengerRec=true;
			}else if(messenger=='訊息已婉拒或已被婉拒'){
				messengerRec=true;
			}else if(messenger=='收到訊息未確認'){
				messengerRec=true;
			}else if(messenger=='收到訊息已同意'){
				messengerRec=true;
			}else if(messenger=='收到訊息已婉拒'){
				messengerRec=true;
			}else if(messenger=='送出訊息未被確認'){
				messengerRec=true;
			}else if(messenger=='送出訊息已被同意'){
				messengerRec=true;
			}else if(messenger=='送出訊息已被婉拒'){
				messengerRec=true;
			}else if(messenger=='屬於我'){
				messengerRec=true;
			}else if(messenger=='不分訊息狀態'){
				messengerRec=false;
			}else{
				messengerRec=false;
				messenger='不分訊息狀態';
			}
			if(auRst===null){
				messengerRec=false;
				messenger='不分訊息狀態';
			}
			
			var lboundRec=null;
			var uboundRec=null;
			var revereDetector1=null;
			var revereDetector2=null;
			if(action=='年利率'){
				var tester;
				if(lbound.trim()!=''){
					tester=parseFloat(lbound);
					if(!isNaN(tester)){
						if((tester>=0)&&(tester<=99)){
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
						if((tester>=0)&&(tester<=99)){
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
			andFindCmdAry.push({"StoryTitle": {'$ne': '' }});
			andFindCmdAry.push({"Story": {'$ne': '' }});
			andFindCmdAry.push({"IfReadable": true});
			if(categoryRec){
				andFindCmdAry.push({"Category": categoryRec});
			}
			
			if((action!='還需要金額')&&(action!='已經借到金額')&&(action!='信用等級')){
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
			}
			
			keyword=keyword.replace(/\s\s+/g,' ');
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
			Borrows.find({$and:andFindCmdAry}).populate('CreatedBy', 'Username Level').populate('Message','CreatedBy SendTo Type Status Transaction').sort(actionRec).exec( function (err, borrows, count){
				if (err) {
					console.log(err);
					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
				}else{
					if(borrows.length==0){
						if(targetPage>1){
							res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
						}else{
							res.render('search',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst,keywordDefault:keyword,messengerDefault:messenger,actionDefault:action,categoryDefault:category,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound,jsonArray:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage});
						}
					}else{
						var Transactions  = mongoose.model('Transactions');
						var Messages  = mongoose.model('Messages');
						var optionsX = {
							path: 'Message.Transaction',
							model: Transactions,
							select: 'Principal'
						};
						Messages.populate(borrows, optionsX, function(err, borrows){
							if(err){
								console.log(err);
								res.redirect('/message?content='+encodeURIComponent('錯誤!'));
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
								
								for(i=borrows.length-1;i>-1;i--){
									if(auRst===null){
										borrows[i].TitleColor='default';
									}else{
										borrows[i].TitleColor='default';
										for(j=0;j<borrows[i].Message.length;j++){
											if((req.user._id==borrows[i].Message[j].CreatedBy)&&(borrows[i].Message[j].Type=="toLend")){
												if(borrows[i].Message[j].Status=="NotConfirmed"){
													borrows[i].TitleColor='color1';
												}else if(borrows[i].Message[j].Status=="Rejected"){
													borrows[i].TitleColor='color2';
												}else if(borrows[i].Message[j].Status=="Confirmed"){
													borrows[i].TitleColor='color6';
												}
												break;
											}else if((req.user._id==borrows[i].Message[j].SendTo)&&(borrows[i].Message[j].Type=="toBorrow")){
												if(borrows[i].Message[j].Status=="NotConfirmed"){
													borrows[i].TitleColor='color3';
												}else if(borrows[i].Message[j].Status=="Rejected"){
													borrows[i].TitleColor='color5';
												}else if(borrows[i].Message[j].Status=="Confirmed"){
													borrows[i].TitleColor='color7';
												}
												break;
											}
										}
										if(req.user._id==borrows[i].CreatedBy._id){
											borrows[i].TitleColor='color4';
										}
									}
									if(messengerRec){
										if(messenger=='無訊息'){
											if(borrows[i].TitleColor!='default'){
												borrows.splice(i, 1);
											}
										}else if(messenger=='有訊息'){
											if((borrows[i].TitleColor=='default')||(borrows[i].TitleColor=='color4')){
												borrows.splice(i, 1);
											}
										}else if(messenger=='訊息未確認或未被確認'){
											if((borrows[i].TitleColor!='color1')&&(borrows[i].TitleColor!='color3')){
												borrows.splice(i, 1);
											}
										}else if(messenger=='訊息已同意或已被同意'){
											if((borrows[i].TitleColor!='color6')&&(borrows[i].TitleColor!='color7')){
												borrows.splice(i, 1);
											}
										}else if(messenger=='訊息已婉拒或已被婉拒'){
											if((borrows[i].TitleColor!='color2')&&(borrows[i].TitleColor!='color5')){
												borrows.splice(i, 1);
											}
										}else if(messenger=='收到訊息未確認'){
											if(borrows[i].TitleColor!='color3'){
												borrows.splice(i, 1);
											}
										}else if(messenger=='收到訊息已同意'){
											if(borrows[i].TitleColor!='color7'){
												borrows.splice(i, 1);
											}
										}else if(messenger=='收到訊息已婉拒'){
											if(borrows[i].TitleColor!='color5'){
												borrows.splice(i, 1);
											}
										}else if(messenger=='送出訊息未被確認'){
											if(borrows[i].TitleColor!='color1'){
												borrows.splice(i, 1);
											}
										}else if(messenger=='送出訊息已被同意'){
											if(borrows[i].TitleColor!='color6'){
												borrows.splice(i, 1);
											}
										}else if(messenger=='送出訊息已被婉拒'){
											if(borrows[i].TitleColor!='color2'){
												borrows.splice(i, 1);
											}
										}else if(messenger=='屬於我'){
											if(borrows[i].TitleColor!='color4'){
												borrows.splice(i, 1);
											}
										}
									}
								}
								
								for(i=0;i<borrows.length;i++){
									borrows[i].Got=0;
									for(r=0;r<borrows[i].Message.length;r++){
										if(borrows[i].Message[r].Status=='Confirmed'){
											if(borrows[i].Message[r].Transaction.length>=1){
												borrows[i].Got+=(borrows[i].Message[r].Transaction[0].Principal);
											}
										}
									}
									borrows[i].Need=borrows[i].MoneyToBorrow-borrows[i].Got;
									if(borrows[i].Need<0){
										borrows[i].Need=0;
									}
									borrows[i].Level=borrows[i].CreatedBy.Level;
								}
								
								if(action=='還需要金額'){
									if(director=='大至小'){
										borrows.sort(function(a,b) { return parseInt(b.Need) - parseInt(a.Need)} );
									}else if(director=='小至大'){
										borrows.sort(function(a,b) { return parseInt(a.Need) - parseInt(b.Need)} );
									}
									library.arrayFilter(borrows,'Need',lboundRec,uboundRec);	
								}else if(action=='已經借到金額'){
									if(director=='大至小'){
										borrows.sort(function(a,b) { return parseInt(b.Got) - parseInt(a.Got)} );
									}else if(director=='小至大'){
										borrows.sort(function(a,b) { return parseInt(a.Got) - parseInt(b.Got)} );
									}
									library.arrayFilter(borrows,'Got',lboundRec,uboundRec);	
								}else if(action=='信用等級'){
									if(director=='大至小'){
										borrows.sort(function(a,b) { return parseInt(b.Level) - parseInt(a.Level)} );
									}else if(director=='小至大'){
										borrows.sort(function(a,b) { return parseInt(a.Level) - parseInt(b.Level)} );
									}
									library.arrayFilter(borrows,'Level',lboundRec,uboundRec);	
								}
								
								totalResultNumber=borrows.length;
								
								if(totalResultNumber==0){
									if(targetPage>1){
										res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
									}else{
										res.render('search',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst,keywordDefault:keyword,messengerDefault:messenger,actionDefault:action,categoryDefault:category,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound,jsonArray:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage});
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
											if(auRst!==null){
												resArrays[i].ifLiked=false;
												for(j=0;j<resArrays[i].Likes.length;j++){
													if(resArrays[i].Likes[j]==req.user._id){
														resArrays[i].ifLiked=true;
														break;
													}
												}
											}
										}
										res.render('search',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst,keywordDefault:keyword,messengerDefault:messenger,actionDefault:action,categoryDefault:category,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound,jsonArray:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage});
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

router.get('/story/:id?',library.loginFormChecker,library.newMsgChecker, function (req, res){
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
		
		var moneyLendedJson={
			moneyLendedCumulated:0,
			hendLendCumulated:0,
			autoLendCumulated:0,
			moneyLeftToAutoLend:0,
			moneyLeftToHendLend:0,
			maxSettingAutoLend:0
		};
		
		Borrows.findById(req.query.id).populate('CreatedBy', 'Username Level').populate('Discussion').populate('Message').exec(function (err, borrow){
			if (err) {
				console.log(err);
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}else{
				if(!borrow){
					res.redirect('/message?content='+encodeURIComponent('錯誤ID!'));
				}else{
					var optionsX = {
						path: 'Message.Transaction',
						model: Transactions,
						select: 'Principal'
					};
					Messages.populate(borrow, optionsX, function(err, borrow){
						if(err){
							console.log(err);
							res.redirect('/message?content='+encodeURIComponent('錯誤!'));
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
									borrow.Level=borrow.CreatedBy.Level;
									borrow.TitleColor="default";
									borrow.MaxInterestRateAccepted-=library.serviceChargeRate;//scr
									borrow.Got=0;
									for(r=0;r<borrow.Message.length;r++){
										if(borrow.Message[r].Status=='Confirmed'){
											if(borrow.Message[r].Transaction.length>=1){
												borrow.Got+=(borrow.Message[r].Transaction[0].Principal);
											}
										}
									}
									borrow.Need=borrow.MoneyToBorrow-borrow.Got;
									if(borrow.Need<0){
										borrow.Need=0;
									}
									
									var ifSelfValue=false;
									var ifLikedValue=false;
									if(auRst===null){
										res.render('story',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst,ifSelf:ifSelfValue,ifLiked:ifLikedValue,json:borrow,jsonMessage:null,jsonBorrowMessage:null,jsonLend:null,MoneyInBankAccountValue:0,MoneyLended:moneyLendedJson,hlfJSON:hendLendFormJson,cfJSON:confirmFormJson});
									}else{
										if(req.user._id==borrow.CreatedBy._id){
											borrow.TitleColor='color4';
											ifSelfValue=true;
											res.render('story',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst,ifSelf:ifSelfValue,ifLiked:ifLikedValue,json:borrow,jsonMessage:null,jsonBorrowMessage:null,jsonLend:null,MoneyInBankAccountValue:0,MoneyLended:moneyLendedJson,hlfJSON:hendLendFormJson,cfJSON:confirmFormJson});
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
														Transactions.find({"Lender": req.user._id}).populate('Return').populate('CreatedFrom','Type').exec(function (err, transactions){
															if (err) {
																console.log(err);
																res.redirect('/message?content='+encodeURIComponent('錯誤!'));
															}else{
																if(transactions.length>0){
																	for(i=0;i<transactions.length;i++){
																		library.transactionProcessor(transactions[i],false);
																		if(transactions[i].CreatedFrom.Type=='toBorrow'){
																			moneyLendedJson.autoLendCumulated+=transactions[i].PrincipalNotReturn;
																		}else if(transactions[i].CreatedFrom.Type=='toLend'){
																			moneyLendedJson.hendLendCumulated+=transactions[i].PrincipalNotReturn;
																		}
																	}
																	moneyLendedJson.moneyLendedCumulated=moneyLendedJson.hendLendCumulated+moneyLendedJson.autoLendCumulated;
																}
																
																var message=null;
																var borrowMessage=null;
																borrow.TitleColor='default';
																for(j=0;j<borrow.Message.length;j++){
																	if((req.user._id==borrow.Message[j].CreatedBy)&&(borrow.Message[j].Type=="toLend")){
																		message=borrow.Message[j];
																		if(message.Status=="NotConfirmed"){
																			borrow.TitleColor='color1';
																		}else if(message.Status=="Rejected"){
																			borrow.TitleColor='color2';
																		}else if(message.Status=="Confirmed"){
																			borrow.TitleColor='color6';
																		}
																		break;
																	}else if((req.user._id==borrow.Message[j].SendTo)&&(borrow.Message[j].Type=="toBorrow")){
																		borrowMessage=borrow.Message[j];
																		if(borrowMessage.Status=="NotConfirmed"){
																			borrow.TitleColor='color3';
																		}else if(borrowMessage.Status=="Rejected"){
																			borrow.TitleColor='color5';
																		}else if(borrowMessage.Status=="Confirmed"){
																			borrow.TitleColor='color7';
																		}
																		break;
																	}
																}

																if(message){
																	library.messageProcessor(message);
																}
																if(borrowMessage){
																	library.messageProcessor(borrowMessage);
																}	
																
																var Lends = mongoose.model('Lends');
																Lends.findOne({"CreatedBy": req.user._id}).exec( function (err, lend){
																	if (err) {
																		console.log(err);
																		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
																	}else{
																		if(lend){
																			moneyLendedJson.moneyLeftToAutoLend=lend.MaxMoneyToLend-moneyLendedJson.autoLendCumulated;
																			if(moneyLendedJson.moneyLeftToAutoLend<=0){
																				moneyLendedJson.moneyLeftToAutoLend=0;
																			}
																		}
																		moneyLendedJson.moneyLeftToHendLend=bankaccount.MoneyInBankAccount-moneyLendedJson.moneyLeftToAutoLend;
																		if(moneyLendedJson.moneyLeftToHendLend<=0){
																			moneyLendedJson.moneyLeftToHendLend=0;
																		}
																		moneyLendedJson.maxSettingAutoLend=bankaccount.MoneyInBankAccount+moneyLendedJson.autoLendCumulated;
																		res.render('story',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst,ifSelf:ifSelfValue,ifLiked:ifLikedValue,json:borrow,jsonMessage:message,jsonBorrowMessage:borrowMessage,jsonLend:lend,MoneyInBankAccountValue:bankaccount.MoneyInBankAccount,MoneyLended:moneyLendedJson,hlfJSON:hendLendFormJson,cfJSON:confirmFormJson});
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
	
	var moneyLendedJson={
		moneyLendedCumulated:0,
		hendLendCumulated:0,
		autoLendCumulated:0,
		moneyLeftToAutoLend:0,
		moneyLeftToHendLend:0,
		maxSettingAutoLend:0
	};
	
	BankAccounts.findOne({"OwnedBy": req.user._id}).exec(function (err, bankaccount){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			if(!bankaccount){
				res.redirect('/message?content='+encodeURIComponent('無銀行帳戶!'));
			}else{
				Transactions.find({"Lender": req.user._id}).populate('Return').populate('CreatedFrom','Type').exec(function (err, transactions){
					if (err) {
						console.log(err);
						res.redirect('/message?content='+encodeURIComponent('錯誤!'));
					}else{
						if(transactions.length>0){
							for(i=0;i<transactions.length;i++){
								library.transactionProcessor(transactions[i],false);
								if(transactions[i].CreatedFrom.Type=='toBorrow'){
									moneyLendedJson.autoLendCumulated+=transactions[i].PrincipalNotReturn;
								}else if(transactions[i].CreatedFrom.Type=='toLend'){
									moneyLendedJson.hendLendCumulated+=transactions[i].PrincipalNotReturn;
								}
							}
							moneyLendedJson.moneyLendedCumulated=moneyLendedJson.hendLendCumulated+moneyLendedJson.autoLendCumulated;
						}
						Lends.findOne({"CreatedBy": req.user._id}).exec(function (err, lend){
							if (err) {
								console.log(err);
								res.redirect('/message?content='+encodeURIComponent('錯誤!'));
							}else{
								if(lend){
									lend.InterestRate-=library.serviceChargeRate;//scr
									moneyLendedJson.moneyLeftToAutoLend=lend.MaxMoneyToLend-moneyLendedJson.autoLendCumulated;
									if(moneyLendedJson.moneyLeftToAutoLend<=0){
										moneyLendedJson.moneyLeftToAutoLend=0;
									}
								}
								moneyLendedJson.moneyLeftToHendLend=bankaccount.MoneyInBankAccount-moneyLendedJson.moneyLeftToAutoLend;
								if(moneyLendedJson.moneyLeftToHendLend<=0){
									moneyLendedJson.moneyLeftToHendLend=0;
								}
								moneyLendedJson.maxSettingAutoLend=bankaccount.MoneyInBankAccount+moneyLendedJson.autoLendCumulated;
								res.render('lend',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,MoneyInBankAccountValue:bankaccount.MoneyInBankAccount,MoneyLended:moneyLendedJson,jsonLend:lend,lfJSON:lendFormJson});
							}
						});
					}
				});
			}
		}
	});
});

router.get('/lenderTransactionRecord/:oneid?/:filter?/:messenger?/:classor?/:sorter?/:director?/:lbound?/:ubound?/:page?',library.loginFormChecker, library.ensureAuthenticated,library.newMsgChecker, function (req, res) {
	if((typeof(req.query.oneid) !== "undefined")&&(typeof(req.query.filter) !== "undefined")&&(typeof(req.query.messenger) !== "undefined")&&(typeof(req.query.classor) !== "undefined")&&(typeof(req.query.sorter) !== "undefined")&&(typeof(req.query.director) !== "undefined")&&(typeof(req.query.lbound) !== "undefined")&&(typeof(req.query.ubound) !== "undefined")&&(typeof(req.query.page) !== "undefined")){
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
			var messenger=decodeURIComponent(req.query.messenger);
			var classor=decodeURIComponent(req.query.classor);
			var pageNum=0
			var totalResultNumber=0;
			var selectedFeeAllIpt=0;
			
			if((director!='大至小')&&(director!='小至大')){
				director='大至小';
			}
			
			var filterRec=false;
			
			if(filter=='未保險'){
				filterRec=true;
			}else if(filter=='已保險'){
				filterRec=true;
			}else if(filter=='已結清'){
				filterRec=true;
			}else if(filter=='不分類'){
				filterRec=false;
			}else{
				filterRec=false;
				filter='不分類';
			}
			
			var messengerRec=false;
			
			if(messenger=='收到訊息'){
				messengerRec=true;
			}else if(messenger=='送出訊息'){
				messengerRec=true;
			}else if(messenger=='不分訊息種類'){
				messengerRec=false;
			}else{
				messengerRec=false;
				messenger='不分訊息種類';
			}
			
			var classorRec=null;
			
			if(classor=='一般'){
				classorRec="general";
			}else if(classor=='教育'){
				classorRec="education";
			}else if(classor=='家庭'){
				classorRec="family";
			}else if(classor=='旅遊'){
				classorRec="tour";
			}else if(classor=='不分故事種類'){
				classorRec=null;
			}else{
				classorRec=null;
				classor='不分故事種類';
			}
			
			var sorterRec=null;
			var sorterRecReserve=null;
			
			if(sorter=='建立日期'){
				sorterRecReserve='Created';
			}else if(sorter=='更新日期'){
				sorterRecReserve='Updated';
			}else if(sorter=='已得利息'){
				sorterRecReserve='Updated';
			}else if(sorter=='已得本利和'){
				sorterRecReserve='Updated';
			}else if(sorter=='已得平均利息'){
				sorterRecReserve='Updated';
			}else if(sorter=='已得平均本利和'){
				sorterRecReserve='Updated';
			}else if(sorter=='已得利本比'){
				sorterRecReserve='Updated';
			}else if(sorter=='年利率'){
				sorterRecReserve='InterestRate';
			}else if(sorter=='原始本金'){
				sorterRecReserve='Principal';
			}else if(sorter=='額外本金'){
				sorterRecReserve='Updated';
			}else if(sorter=='目前總本金'){
				sorterRecReserve='Updated';
			}else if(sorter=='未還本金'){
				sorterRecReserve='Updated';
			}else if(sorter=='已還本金'){
				sorterRecReserve='Updated';
			}else if(sorter=='原始期數'){
				sorterRecReserve='MonthPeriod';
			}else if(sorter=='額外期數'){
				sorterRecReserve='Updated';
			}else if(sorter=='目前總期數'){
				sorterRecReserve='Updated';
			}else if(sorter=='剩下期數'){
				sorterRecReserve='Updated';
			}else if(sorter=='已過期數'){
				sorterRecReserve='Updated';
			}else if(sorter=='信用等級'){
				sorterRecReserve='Updated';
			}else if(sorter=='預計剩餘利息'){
				sorterRecReserve='Updated';
			}else if(sorter=='預計剩餘本利和'){
				sorterRecReserve='Updated';
			}else if(sorter=='預計剩餘平均利息'){
				sorterRecReserve='Updated';
			}else if(sorter=='預計剩餘平均本利和'){
				sorterRecReserve='Updated';
			}else if(sorter=='預計剩餘利本比'){
				sorterRecReserve='Updated';
			}else if(sorter=='收款次數'){
				sorterRecReserve='Updated';
			}else if(sorter=='上次成功收款日期'){
				sorterRecReserve='Updated';
			}else if(sorter=='下次應收款日期'){
				sorterRecReserve='Updated';
			}else if(sorter=='已付保險費用'){
				sorterRecReserve='InsuranceFeePaid';
			}else if(sorter=='保險所需費用'){
				sorterRecReserve='Updated';
			}else{
				sorterRecReserve='Created';
				sorter='建立日期';
			}
			sorterRec=library.directorDivider(director,sorterRecReserve,true);
			
			var lboundRec=null;
			var uboundRec=null;
			var revereDetector1=null;
			var revereDetector2=null;
			if((sorter=='年利率')||(sorter=='預計剩餘利本比')||(sorter=='已得利本比')){
				var tester;
				if(lbound.trim()!=''){
					tester=parseFloat(lbound);
					if(!isNaN(tester)){
						if((tester>=0)&&(tester<=99)){
							if(sorter=='年利率'){
								lboundRec=(tester/100)+library.serviceChargeRate;//scr
							}else{
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
						if((tester>=0)&&(tester<=99)){
							if(sorter=='年利率'){
								uboundRec=(tester/100)+library.serviceChargeRate;//scr
							}else{
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

			if((sorter=='建立日期')||(sorter=='更新日期')||(sorter=='年利率')||(sorter=='原始本金')||(sorter=='原始期數')||(sorter=='已付保險費用')){
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
			
			oneid=oneid.replace(/\s\s+/g,' ');
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
			Transactions.find({$and:andFindCmdAry}).populate('Borrower', 'Username Level').populate('CreatedFrom','FromBorrowRequest Type').populate('Return').sort(sorterRec).exec( function (err, transactions, count){
				if (err) {
					console.log(err);
					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
				}else{
					if(transactions.length==0){
						if(targetPage>1){
							res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
						}else{
							res.render('lenderTransactionRecord',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,oneidDefault:oneid,filterDefault:filter,messengerDefault:messenger,sorterDefault:sorter,classorDefault:classor,jsonTransaction:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,insuranceRate:library.insuranceRate,selectedFeeAll:selectedFeeAllIpt,biJSON:buyInsuranceJson,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound});
						}
					}else{
						var options = {
							path: 'CreatedFrom.FromBorrowRequest',
							model: Borrows,
							select: 'StoryTitle Category'
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
								
								if(filterRec){
									for(j=transactions.length-1;j>-1;j--){
										if(filter=='未保險'){
											if((transactions[j].InsuranceFeePaid!==0)||(transactions[j].PrincipalNotReturn<=0)){
												transactions.splice(j, 1);
											}
										}else if(filter=='已保險'){
											if((transactions[j].InsuranceFeePaid<=0)||(transactions[j].PrincipalNotReturn<=0)){
												transactions.splice(j, 1);
											}
										}else if(filter=='已結清'){
											if(transactions[j].PrincipalNotReturn>0){
												transactions.splice(j, 1);
											}
										}
									}
								}
								
								if(messengerRec){
									for(j=transactions.length-1;j>-1;j--){
										if(messenger=='收到訊息'){
											if(transactions[j].CreatedFrom.Type!='toBorrow'){
												transactions.splice(j, 1);
											}
										}else if(messenger=='送出訊息'){
											if(transactions[j].CreatedFrom.Type!='toLend'){
												transactions.splice(j, 1);
											}
										}
									}
								}
								
								if(classorRec!==null){
									for(j=transactions.length-1;j>-1;j--){
										if(transactions[j].CreatedFrom.FromBorrowRequest.Category!=classorRec){
											transactions.splice(j, 1);
										}
									}
								}
								
								for(i=0;i<transactions.length;i++){
									transactions[i].Level=transactions[i].Borrower.Level;
									library.transactionProcessor(transactions[i],true);
								}
								
								if(sorter=='預計剩餘利息'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseInt(b.InterestInFuture) - parseInt(a.InterestInFuture)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseInt(a.InterestInFuture) - parseInt(b.InterestInFuture)} );
									}
									library.arrayFilter(transactions,'InterestInFuture',lboundRec,uboundRec);	
								}else if(sorter=='預計剩餘本利和'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseInt(b.MoneyFuture) - parseInt(a.MoneyFuture)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseInt(a.MoneyFuture) - parseInt(b.MoneyFuture)} );
									}
									library.arrayFilter(transactions,'MoneyFuture',lboundRec,uboundRec);	
								}else if(sorter=='預計剩餘平均利息'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseInt(b.InterestInFutureMonth) - parseInt(a.InterestInFutureMonth)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseInt(a.InterestInFutureMonth) - parseInt(b.InterestInFutureMonth)} );
									}
									library.arrayFilter(transactions,'InterestInFutureMonth',lboundRec,uboundRec);	
								}else if(sorter=='預計剩餘平均本利和'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseInt(b.InterestInFutureMoneyMonth) - parseInt(a.InterestInFutureMoneyMonth)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseInt(a.InterestInFutureMoneyMonth) - parseInt(b.InterestInFutureMoneyMonth)} );
									}
									library.arrayFilter(transactions,'InterestInFutureMoneyMonth',lboundRec,uboundRec);	
								}else if(sorter=='預計剩餘利本比'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseFloat(b.InterestInFutureDivMoney) - parseFloat(a.InterestInFutureDivMoney)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseFloat(a.InterestInFutureDivMoney) - parseFloat(b.InterestInFutureDivMoney)} );
									}
									library.arrayFilter(transactions,'InterestInFutureDivMoney',lboundRec,uboundRec);	
								}else if(sorter=='收款次數'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseInt(b.ReturnCount) - parseInt(a.ReturnCount)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseInt(a.ReturnCount) - parseInt(b.ReturnCount)} );
									}
									library.arrayFilter(transactions,'ReturnCount',lboundRec,uboundRec);
								}else if(sorter=='上次成功收款日期'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseInt(b.previousPayDateNum) - parseInt(a.previousPayDateNum)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseInt(a.previousPayDateNum) - parseInt(b.previousPayDateNum)} );
									}
									library.arrayFilter(transactions,'previousPayDateNum',lboundRec,uboundRec);
								}else if(sorter=='下次應收款日期'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseInt(b.nextPayDateNum) - parseInt(a.nextPayDateNum)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseInt(a.nextPayDateNum) - parseInt(b.nextPayDateNum)} );
									}
									library.arrayFilter(transactions,'nextPayDateNum',lboundRec,uboundRec);
								}else if(sorter=='已得利息'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseInt(b.nextPayDateNum) - parseInt(a.nextPayDateNum)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseInt(a.nextPayDateNum) - parseInt(b.nextPayDateNum)} );
									}
									library.arrayFilter(transactions,'nextPayDateNum',lboundRec,uboundRec);
								}else if(sorter=='已得本利和'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseInt(b.PrincipalInterest) - parseInt(a.PrincipalInterest)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseInt(a.PrincipalInterest) - parseInt(b.PrincipalInterest)} );
									}
									library.arrayFilter(transactions,'PrincipalInterest',lboundRec,uboundRec);
								}else if(sorter=='已得平均利息'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseInt(b.InterestMonth) - parseInt(a.InterestMonth)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseInt(a.InterestMonth) - parseInt(b.InterestMonth)} );
									}
									library.arrayFilter(transactions,'InterestMonth',lboundRec,uboundRec);
								}else if(sorter=='已得平均本利和'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseInt(b.PrincipalInterestMonth) - parseInt(a.PrincipalInterestMonth)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseInt(a.PrincipalInterestMonth) - parseInt(b.PrincipalInterestMonth)} );
									}
									library.arrayFilter(transactions,'PrincipalInterestMonth',lboundRec,uboundRec);
								}else if(sorter=='已得利本比'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseInt(b.InterestDivPrincipal) - parseInt(a.InterestDivPrincipal)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseInt(a.InterestDivPrincipal) - parseInt(b.InterestDivPrincipal)} );
									}
									library.arrayFilter(transactions,'InterestDivPrincipal',lboundRec,uboundRec);
								}else if(sorter=='額外本金'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseInt(b.ExtendPrincipal) - parseInt(a.ExtendPrincipal)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseInt(a.ExtendPrincipal) - parseInt(b.ExtendPrincipal)} );
									}
									library.arrayFilter(transactions,'ExtendPrincipal',lboundRec,uboundRec);
								}else if(sorter=='目前總本金'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseInt(b.TotalPrincipalNow) - parseInt(a.TotalPrincipalNow)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseInt(a.TotalPrincipalNow) - parseInt(b.TotalPrincipalNow)} );
									}
									library.arrayFilter(transactions,'TotalPrincipalNow',lboundRec,uboundRec);
								}else if(sorter=='未還本金'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseInt(b.PrincipalNotReturn) - parseInt(a.PrincipalNotReturn)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseInt(a.PrincipalNotReturn) - parseInt(b.PrincipalNotReturn)} );
									}
									library.arrayFilter(transactions,'PrincipalNotReturn',lboundRec,uboundRec);
								}else if(sorter=='保險所需費用'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseInt(b.PrincipalNotReturn) - parseInt(a.PrincipalNotReturn)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseInt(a.PrincipalNotReturn) - parseInt(b.PrincipalNotReturn)} );
									}
									library.arrayFilter(transactions,'PrincipalNotReturn',lboundRec,uboundRec);
								}else if(sorter=='已還本金'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseInt(b.PrincipalReturn) - parseInt(a.PrincipalReturn)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseInt(a.PrincipalReturn) - parseInt(b.PrincipalReturn)} );
									}
									library.arrayFilter(transactions,'PrincipalReturn',lboundRec,uboundRec);
								}else if(sorter=='額外期數'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseInt(b.ExtendMonthPeriod) - parseInt(a.ExtendMonthPeriod)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseInt(a.ExtendMonthPeriod) - parseInt(b.ExtendMonthPeriod)} );
									}
									library.arrayFilter(transactions,'ExtendMonthPeriod',lboundRec,uboundRec);
								}else if(sorter=='目前總期數'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseInt(b.TotalMonthPeriodNow) - parseInt(a.TotalMonthPeriodNow)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseInt(a.TotalMonthPeriodNow) - parseInt(b.TotalMonthPeriodNow)} );
									}
									library.arrayFilter(transactions,'TotalMonthPeriodNow',lboundRec,uboundRec);
								}else if(sorter=='剩下期數'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseInt(b.MonthPeriodLeft) - parseInt(a.MonthPeriodLeft)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseInt(a.MonthPeriodLeft) - parseInt(b.MonthPeriodLeft)} );
									}
									library.arrayFilter(transactions,'MonthPeriodLeft',lboundRec,uboundRec);
								}else if(sorter=='已過期數'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseInt(b.MonthPeriodPast) - parseInt(a.MonthPeriodPast)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseInt(a.MonthPeriodPast) - parseInt(b.MonthPeriodPast)} );
									}
									library.arrayFilter(transactions,'MonthPeriodPast',lboundRec,uboundRec);
								}else if(sorter=='信用等級'){
									if(director=='大至小'){
										transactions.sort(function(a,b) { return parseInt(b.Level) - parseInt(a.Level)} );
									}else if(director=='小至大'){
										transactions.sort(function(a,b) { return parseInt(a.Level) - parseInt(b.Level)} );
									}
									library.arrayFilter(transactions,'Level',lboundRec,uboundRec);
								}
								
								totalResultNumber=transactions.length;
								
								if(totalResultNumber==0){
									if(targetPage>1){
										res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
									}else{
										res.render('lenderTransactionRecord',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,oneidDefault:oneid,filterDefault:filter,messengerDefault:messenger,sorterDefault:sorter,classorDefault:classor,jsonTransaction:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,insuranceRate:library.insuranceRate,selectedFeeAll:selectedFeeAllIpt,biJSON:buyInsuranceJson,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound});
									}
								}else{
									for(p=0;p<totalResultNumber;p++){
										var tempFee=transactions[p].PrincipalNotReturn*library.insuranceRate;
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
										
										for(i=0;i<resArrays.length;i++){
											if(resArrays[i].CreatedFrom.Type=='toBorrow'){
												resArrays[i].color='color7';
											}else if(resArrays[i].CreatedFrom.Type=='toLend'){
												resArrays[i].color='color6';
											}
										}
										
										res.render('lenderTransactionRecord',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,oneidDefault:oneid,filterDefault:filter,messengerDefault:messenger,sorterDefault:sorter,classorDefault:classor,jsonTransaction:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,insuranceRate:library.insuranceRate,selectedFeeAll:selectedFeeAllIpt,biJSON:buyInsuranceJson,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound});
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

router.get('/lenderReturnRecord/:oneid?/:id?/:messenger?/:classor?/:sorter?/:director?/:lbound?/:ubound?/:page?',library.loginFormChecker, library.ensureAuthenticated, library.newMsgChecker,function (req, res) {
	if((typeof(req.query.oneid) !== "undefined")&&(typeof(req.query.id) !== "undefined")&&(typeof(req.query.messenger) !== "undefined")&&(typeof(req.query.classor) !== "undefined")&&(typeof(req.query.sorter) !== "undefined")&&(typeof(req.query.director) !== "undefined")&&(typeof(req.query.lbound) !== "undefined")&&(typeof(req.query.ubound) !== "undefined")&&(typeof(req.query.page) !== "undefined")){
		var targetPage=parseInt(req.query.page);
		if(!isNaN(targetPage)){
			var resArrays=[];
			var oneid=decodeURIComponent(req.query.oneid);
			var id=decodeURIComponent(req.query.id);
			var sorter=decodeURIComponent(req.query.sorter);
			var director=decodeURIComponent(req.query.director);
			var lbound=decodeURIComponent(req.query.lbound);
			var ubound=decodeURIComponent(req.query.ubound);
			var classor=decodeURIComponent(req.query.classor);
			var messenger=decodeURIComponent(req.query.messenger);
			var pageNum=0
			var totalResultNumber=0;
			
			if((director!='大至小')&&(director!='小至大')){
				director='大至小';
			}
			
			var messengerRec=false;
			
			if(messenger=='收到訊息'){
				messengerRec=true;
			}else if(messenger=='送出訊息'){
				messengerRec=true;
			}else if(messenger=='不分訊息種類'){
				messengerRec=false;
			}else{
				messengerRec=false;
				messenger='不分訊息種類';
			}
			
			var classorRec=null;
			
			if(classor=='一般'){
				classorRec="general";
			}else if(classor=='教育'){
				classorRec="education";
			}else if(classor=='家庭'){
				classorRec="family";
			}else if(classor=='旅遊'){
				classorRec="tour";
			}else if(classor=='不分故事種類'){
				classorRec=null;
			}else{
				classorRec=null;
				classor='不分故事種類';
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
			}else if(sorter=='信用等級'){
				sorterRecReserve='Updated';
			}else if(sorter=='收款前額外本金'){
				sorterRecReserve='ExtendPrincipalBeforePaid';
			}else if(sorter=='收款前總本金'){
				sorterRecReserve='TotalPrincipalNowBeforePaid';
			}else if(sorter=='收款前未還本金'){
				sorterRecReserve='PrincipalNotReturnBeforePaid';
			}else if(sorter=='收款前已還本金'){
				sorterRecReserve='PrincipalReturnBeforePaid';
			}else if(sorter=='收款前已得利息'){
				sorterRecReserve='InterestBeforePaid';
			}else if(sorter=='收款前已得本利和'){
				sorterRecReserve='PrincipalInterestBeforePaid';
			}else if(sorter=='收款前已得平均利息'){
				sorterRecReserve='InterestMonthBeforePaid';
			}else if(sorter=='收款前已得平均本利和'){
				sorterRecReserve='PrincipalInterestMonthBeforePaid';
			}else if(sorter=='收款前已得利本比'){
				sorterRecReserve='InterestDivPrincipalBeforePaid';
			}else if(sorter=='收款前額外期數'){
				sorterRecReserve='ExtendMonthPeriodBeforePaid';
			}else if(sorter=='收款前總期數'){
				sorterRecReserve='TotalMonthPeriodNowBeforePaid';
			}else if(sorter=='收款前剩下期數'){
				sorterRecReserve='MonthPeriodLeftBeforePaid';
			}else if(sorter=='收款前已過期數'){
				sorterRecReserve='MonthPeriodPastBeforePaid';
			}else if(sorter=='收款前預計剩餘利息'){
				sorterRecReserve='InterestInFutureBeforePaid';
			}else if(sorter=='收款前預計剩餘本利和'){
				sorterRecReserve='MoneyFutureBeforePaid';
			}else if(sorter=='收款前預計剩餘平均利息'){
				sorterRecReserve='InterestInFutureMonthBeforePaid';
			}else if(sorter=='收款前預計剩餘平均本利和'){
				sorterRecReserve='InterestInFutureMoneyMonthBeforePaid';
			}else if(sorter=='收款前預計剩餘利本比'){
				sorterRecReserve='InterestInFutureDivMoneyBeforePaid';
			}else if(sorter=='收款前收款次數'){
				sorterRecReserve='ReturnCountBeforePaid';
			}else if(sorter=='收款前上次成功收款日期'){
				sorterRecReserve='previousPayDateBeforePaid';
			}else if(sorter=='收款前下次應收款日期'){
				sorterRecReserve='nextPayDateBeforePaid';
			}else if(sorter=='收款前信用等級'){
				sorterRecReserve='LevelBeforePaid';
			}else if(sorter=='收款後額外本金'){
				sorterRecReserve='ExtendPrincipalAfterPaid';
			}else if(sorter=='收款後總本金'){
				sorterRecReserve='TotalPrincipalNowAfterPaid';
			}else if(sorter=='收款後未還本金'){
				sorterRecReserve='PrincipalNotReturnAfterPaid';
			}else if(sorter=='收款後已還本金'){
				sorterRecReserve='PrincipalReturnAfterPaid';
			}else if(sorter=='收款後已得利息'){
				sorterRecReserve='InterestAfterPaid';
			}else if(sorter=='收款後已得本利和'){
				sorterRecReserve='PrincipalInterestAfterPaid';
			}else if(sorter=='收款後已得平均利息'){
				sorterRecReserve='InterestMonthAfterPaid';
			}else if(sorter=='收款後已得平均本利和'){
				sorterRecReserve='PrincipalInterestMonthAfterPaid';
			}else if(sorter=='收款後已得利本比'){
				sorterRecReserve='InterestDivPrincipalAfterPaid';
			}else if(sorter=='收款後額外期數'){
				sorterRecReserve='ExtendMonthPeriodAfterPaid';
			}else if(sorter=='收款後總期數'){
				sorterRecReserve='TotalMonthPeriodNowAfterPaid';
			}else if(sorter=='收款後剩下期數'){
				sorterRecReserve='MonthPeriodLeftAfterPaid';
			}else if(sorter=='收款後已過期數'){
				sorterRecReserve='MonthPeriodPastAfterPaid';
			}else if(sorter=='收款後預計剩餘利息'){
				sorterRecReserve='InterestInFutureAfterPaid';
			}else if(sorter=='收款後預計剩餘本利和'){
				sorterRecReserve='MoneyFutureAfterPaid';
			}else if(sorter=='收款後預計剩餘平均利息'){
				sorterRecReserve='InterestInFutureMonthAfterPaid';
			}else if(sorter=='收款後預計剩餘平均本利和'){
				sorterRecReserve='InterestInFutureMoneyMonthAfterPaid';
			}else if(sorter=='收款後預計剩餘利本比'){
				sorterRecReserve='InterestInFutureDivMoneyAfterPaid';
			}else if(sorter=='收款後收款次數'){
				sorterRecReserve='ReturnCountAfterPaid';
			}else if(sorter=='收款後上次成功收款日期'){
				sorterRecReserve='previousPayDateAfterPaid';
			}else if(sorter=='收款後下次應收款日期'){
				sorterRecReserve='nextPayDateAfterPaid';
			}else if(sorter=='收款後信用等級'){
				sorterRecReserve='LevelAfterPaid';
			}else{
				sorterRecReserve='Created';
				sorter='建立日期';
			}
			sorterRec=library.directorDivider(director,sorterRecReserve,true);
			
			var lboundRec=null;
			var uboundRec=null;
			var revereDetector1=null;
			var revereDetector2=null;
			
			if((sorter=='收款前預計剩餘利本比')||(sorter=='收款後預計剩餘利本比')||(sorter=='收款前已得利本比')||(sorter=='收款後已得利本比')){
				var tester;
				if(lbound.trim()!=''){
					tester=parseFloat(lbound);
					if(!isNaN(tester)){
						if((tester>=0)&&(tester<=99)){
							lboundRec=(tester/100);
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
						if((tester>=0)&&(tester<=99)){
							uboundRec=(tester/100);
						}else{
							ubound='';
						}
					}else{
						ubound='';
					}
				}
				revereDetector1=lboundRec;
				revereDetector2=uboundRec;
			}else if((sorter=='更新日期')||(sorter=='建立日期')||(sorter=='收款前上次成功收款日期')||(sorter=='收款前下次應收款日期')||(sorter=='收款後上次成功收款日期')||(sorter=='收款後下次應收款日期')){
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
			
			if((sorter!='實收金額')&&(sorter!='應收金額')&&(sorter!='未收金額')&&(sorter!='超收金額')&&(sorter!='實收本金')&&(sorter!='實收利息')&&(sorter!='信用等級')){
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
			
			oneid=oneid.replace(/\s\s+/g,' ');
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
			Returns.find({$and:andFindCmdAry,$where: function() { return (this.InterestShouldPaid-this.InterestNotPaid) > 0 }}).populate('Borrower', 'Username Level').populate('ToTransaction').sort(sorterRec).exec( function (err, returns, count){
				if (err) {
					console.log(err);
					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
				}else{
					if(returns.length==0){
						if(targetPage>1){
							res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
						}else{
							res.render('lenderReturnRecord',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,oneidDefault:oneid,idDefault:id,messengerDefault:messenger,sorterDefault:sorter,classorDefault:classor,jsonReturns:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound});
						}
					}else{
						var options = {
							path: 'ToTransaction.CreatedFrom',
							model: Messages,
							select: 'FromBorrowRequest Type'
						};

						Transactions.populate(returns, options, function(err, returns) {
							if(err){
								console.log(err);
								res.redirect('/message?content='+encodeURIComponent('錯誤!'));
							}else{
								var options2 = {
									path: 'ToTransaction.CreatedFrom.FromBorrowRequest',
									model: Borrows,
									select: 'StoryTitle Category'
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
										
										if(messengerRec){
											for(j=returns.length-1;j>-1;j--){
												if(messenger=='收到訊息'){
													if(returns[j].ToTransaction.CreatedFrom.Type!='toBorrow'){
														returns.splice(j, 1);
													}
												}else if(messenger=='送出訊息'){
													if(returns[j].ToTransaction.CreatedFrom.Type!='toLend'){
														returns.splice(j, 1);
													}
												}
											}
										}
										
										if(classorRec!==null){
											for(j=returns.length-1;j>-1;j--){
												if(returns[j].ToTransaction.CreatedFrom.FromBorrowRequest.Category!=classorRec){
													returns.splice(j, 1);
												}
											}
										}
										
										for(i=0;i<returns.length;i++){
											returns[i].Level=returns[i].Borrower.Level;
											returns[i].MoneyReallyPaid=(returns[i].InterestShouldPaid-returns[i].InterestNotPaid)+(returns[i].PrincipalShouldPaid-returns[i].PrincipalNotPaid);
											returns[i].MoneyShouldPaid=returns[i].InterestShouldPaid+returns[i].PrincipalShouldPaid;
											returns[i].MoneyNotPaid=returns[i].InterestNotPaid+returns[i].PrincipalNotPaid;
											returns[i].InterestReallyPaid=returns[i].InterestShouldPaid-returns[i].InterestNotPaid;
											returns[i].PrincipalReallyPaid=returns[i].PrincipalShouldPaid-returns[i].PrincipalNotPaid;
										}
										
										if(sorter=='實收金額'){
											if(director=='大至小'){
												returns.sort(function(a,b) { return parseInt(b.MoneyReallyPaid) - parseInt(a.MoneyReallyPaid)} );
											}else if(director=='小至大'){
												returns.sort(function(a,b) { return parseInt(a.MoneyReallyPaid) - parseInt(b.MoneyReallyPaid)} );
											}
											library.arrayFilter(returns,'MoneyReallyPaid',lboundRec,uboundRec);	
										}else if(sorter=='應收金額'){
											if(director=='大至小'){
												returns.sort(function(a,b) { return parseInt(b.MoneyShouldPaid) - parseInt(a.MoneyShouldPaid)} );
											}else if(director=='小至大'){
												returns.sort(function(a,b) { return parseInt(a.MoneyShouldPaid) - parseInt(b.MoneyShouldPaid)} );
											}
											library.arrayFilter(returns,'MoneyShouldPaid',lboundRec,uboundRec);
										}else if(sorter=='未收金額'){
											if(director=='大至小'){
												returns.sort(function(a,b) { return parseInt(b.MoneyNotPaid) - parseInt(a.MoneyNotPaid)} );
											}else if(director=='小至大'){
												returns.sort(function(a,b) { return parseInt(a.MoneyNotPaid) - parseInt(b.MoneyNotPaid)} );
											}
											library.arrayFilter(returns,'MoneyNotPaid',lboundRec,uboundRec);
										}else if(sorter=='超收金額'){
											if(director=='大至小'){
												returns.sort(function(a,b) { return parseInt(a.MoneyNotPaid) - parseInt(b.MoneyNotPaid)} );
											}else if(director=='小至大'){
												returns.sort(function(a,b) { return parseInt(b.MoneyNotPaid) - parseInt(a.MoneyNotPaid)} );
											}
											library.arrayFilter(returns,'MoneyNotPaid',lboundRec,uboundRec);
										}else if(sorter=='實收本金'){
											if(director=='大至小'){
												returns.sort(function(a,b) { return parseInt(b.PrincipalReallyPaid) - parseInt(a.PrincipalReallyPaid)} );
											}else if(director=='小至大'){
												returns.sort(function(a,b) { return parseInt(a.PrincipalReallyPaid) - parseInt(b.PrincipalReallyPaid)} );
											}
											library.arrayFilter(returns,'PrincipalReallyPaid',lboundRec,uboundRec);
										}else if(sorter=='實收利息'){
											if(director=='大至小'){
												returns.sort(function(a,b) { return parseInt(b.InterestReallyPaid) - parseInt(a.InterestReallyPaid)} );
											}else if(director=='小至大'){
												returns.sort(function(a,b) { return parseInt(a.InterestReallyPaid) - parseInt(b.InterestReallyPaid)} );
											}
											library.arrayFilter(returns,'InterestReallyPaid',lboundRec,uboundRec);
										}else if(sorter=='信用等級'){
											if(director=='大至小'){
												returns.sort(function(a,b) { return parseInt(b.Level) - parseInt(a.Level)} );
											}else if(director=='小至大'){
												returns.sort(function(a,b) { return parseInt(a.Level) - parseInt(b.Level)} );
											}
											library.arrayFilter(returns,'Level',lboundRec,uboundRec);
										}
											
										totalResultNumber=returns.length;
										
										if(totalResultNumber==0){
											if(targetPage>1){
												res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
											}else{
												res.render('lenderReturnRecord',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,oneidDefault:oneid,idDefault:id,messengerDefault:messenger,sorterDefault:sorter,classorDefault:classor,jsonReturns:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound});
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
												
												for(i=0;i<resArrays.length;i++){
													if(resArrays[i].ToTransaction.CreatedFrom.Type=='toBorrow'){
														resArrays[i].color='color7';
													}else if(resArrays[i].ToTransaction.CreatedFrom.Type=='toLend'){
														resArrays[i].color='color6';
													}
												}
												
												var optionsZ = {
													path: 'ToTransaction.Return',
													model: Returns
												};
												Transactions.populate(resArrays, optionsZ, function(err, resArrays){
													if(err){
														console.log(err);
														res.redirect('/message?content='+encodeURIComponent('錯誤!'));
													}else{
														for(i=0;i<resArrays.length;i++){
															library.transactionProcessor(resArrays[i].ToTransaction,false);
														}
														res.render('lenderReturnRecord',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,oneidDefault:oneid,idDefault:id,messengerDefault:messenger,sorterDefault:sorter,classorDefault:classor,jsonReturns:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound});
													}
												});
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

router.get('/lendsList/:oneid?/:classOne?/:classTwo?/:sorter?/:director?/:lbound?/:ubound?/:page?',library.loginFormChecker, library.ensureAuthenticated, library.newMsgChecker,function (req, res) {
	if((typeof(req.query.oneid) !== "undefined")&&(typeof(req.query.classOne) !== "undefined")&&(typeof(req.query.classTwo) !== "undefined")&&(typeof(req.query.sorter) !== "undefined")&&(typeof(req.query.director) !== "undefined")&&(typeof(req.query.lbound) !== "undefined")&&(typeof(req.query.ubound) !== "undefined")&&(typeof(req.query.page) !== "undefined")){
		var targetPage=parseInt(req.query.page);
		if(!isNaN(targetPage)){
			var resArrays=[];
			var oneid=decodeURIComponent(req.query.oneid);
			var classOne=decodeURIComponent(req.query.classOne);
			var classTwo=decodeURIComponent(req.query.classTwo);
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
			}else if(classOne=='不篩選自動同意設定'){
				classOneRec=null;
			}else{
				classOne='不篩選自動同意設定';
			}
			
			var classTwoRec=null;
			
			if(classTwo=='不分類'){
				classTwoRec='none';
			}else if(classTwo=='一般'){
				classTwoRec='general';
			}else if(classTwo=='教育'){
				classTwoRec='education';
			}else if(classTwo=='家庭'){
				classTwoRec='family';
			}else if(classTwo=='旅遊'){
				classTwoRec='tour';
			}else if(classTwo=='不篩選故事種類設定'){
				classTwoRec=null;
			}else{
				classTwo='不篩選故事種類設定';
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
			}else if(sorter=='最大可自動借出金額'){
				sorterRecReserve='MaxMoneyToLend';
			}else if(sorter=='可接受年利率'){
				sorterRecReserve='InterestRate';
			}else if(sorter=='可接受期數'){
				sorterRecReserve='MonthPeriod';
			}else if(sorter=='可接受信用等級'){
				sorterRecReserve='MinLevelAccepted';
			}else if(sorter=='可接受總利息'){
				sorterRecReserve='MinInterestInFuture';
			}else if(sorter=='可接受本利和'){
				sorterRecReserve='MinMoneyFuture';
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
			if((sorter=='可接受年利率')||(sorter=='可接受利本比')){
				var tester;
				if(lbound.trim()!=''){
					tester=parseFloat(lbound);
					if(!isNaN(tester)){
						if((tester>=0)&&(tester<=99)){
							if(sorter=='可接受年利率'){
								lboundRec=(tester/100)+library.serviceChargeRate;//scr
							}else if(sorter=='可接受利本比'){
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
						if((tester>=0)&&(tester<=99)){
							if(sorter=='可接受年利率'){
								uboundRec=(tester/100)+library.serviceChargeRate;//scr
							}else if(sorter=='可接受利本比'){
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
			if(classTwoRec!==null){
				andFindCmdAry.push({"AutoComfirmToBorrowMsgClassor": classTwoRec});
			}
			
			var command={};
			if(andFindCmdAry.length>0){
				command={$and:andFindCmdAry};
			}
			
			oneid=oneid.replace(/\s\s+/g,' ');
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
							res.render('lendsList',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,oneidDefault:oneid,classOneDefault:classOne,classTwoDefault:classTwo,sorterDefault:sorter,jsonLends:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound,scr:library.serviceChargeRate});
						}
					}else{			
						for(j=lends.length-1;j>-1;j--){
							var testingString=lends[j].CreatedBy.Username+' '+lends[j].AutoComfirmToBorrowMsgKeyWord;
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
								if(testingString.search(keywordArray[k])>-1){
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
								res.render('lendsList',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,oneidDefault:oneid,classOneDefault:classOne,classTwoDefault:classTwo,sorterDefault:sorter,jsonLends:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound,scr:library.serviceChargeRate});
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
									resArrays.push(lends[i]);
								}
								res.render('lendsList',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,oneidDefault:oneid,classOneDefault:classOne,classTwoDefault:classTwo,sorterDefault:sorter,jsonLends:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound,scr:library.serviceChargeRate});
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

router.get('/lenderSendMessages/:msgKeyword?/:filter?/:classor?/:sorter?/:director?/:lbound?/:ubound?/:page?',library.loginFormChecker, library.ensureAuthenticated,library.newMsgChecker, function (req, res) {
	if((typeof(req.query.msgKeyword) !== "undefined")&&(typeof(req.query.filter) !== "undefined")&&(typeof(req.query.classor) !== "undefined")&&(typeof(req.query.sorter) !== "undefined")&&(typeof(req.query.director) !== "undefined")&&(typeof(req.query.lbound) !== "undefined")&&(typeof(req.query.ubound) !== "undefined")&&(typeof(req.query.page) !== "undefined")){
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
			var classor=decodeURIComponent(req.query.classor);
			var pageNum=0
			var totalResultNumber=0;
			
			if((director!='大至小')&&(director!='小至大')){
				director='大至小';
			}
			
			var classorRec=null;
			
			if(classor=='一般'){
				classorRec="general";
			}else if(classor=='教育'){
				classorRec="education";
			}else if(classor=='家庭'){
				classorRec="family";
			}else if(classor=='旅遊'){
				classorRec="tour";
			}else if(classor=='不分故事種類'){
				classorRec=null;
			}else{
				classorRec=null;
				classor='不分故事種類';
			}
			
			var sorterRec=null;
			var sorterRecReserve=null;
			
			if(sorter=='更新日期'){
				sorterRecReserve='Updated';
			}else if(sorter=='建立日期'){
				sorterRecReserve='Created';
			}else if(sorter=='欲借出年利率'){
				sorterRecReserve='InterestRate';
			}else if(sorter=='欲借出金額'){
				sorterRecReserve='MoneyToLend';
			}else if(sorter=='欲借出期數'){
				sorterRecReserve='MonthPeriod';
			}else if(sorter=='信用等級'){
				sorterRecReserve='Updated';
			}else if(sorter=='預計總利息'){
				sorterRecReserve='Updated';
			}else if(sorter=='預計本利和'){
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
			if((sorter=='欲借出年利率')||(sorter=='預計利本比')){
				var tester;
				if(lbound.trim()!=''){
					tester=parseFloat(lbound);
					if(!isNaN(tester)){
						if((tester>=0)&&(tester<=99)){
							if(sorter=='欲借出年利率'){
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
						if((tester>=0)&&(tester<=99)){
							if(sorter=='欲借出年利率'){
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
			if(filter=='未被確認'){
				andFindCmdAry.push({"Status": "NotConfirmed"});
			}else if(filter=='已被同意'){
				andFindCmdAry.push({"Status": "Confirmed"});
			}else if(filter=='已被婉拒'){
				andFindCmdAry.push({"Status": "Rejected"});
			}else{
				if(filter!='不分類'){
					filter='不分類';
				}
			}
			
			if((sorter!='預計總利息')&&(sorter!='預計本利和')&&(sorter!='預計平均利息')&&(sorter!='預計平均本利和')&&(sorter!='預計利本比')&&(sorter!='信用等級')){
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
			
			msgKeyword=msgKeyword.replace(/\s\s+/g,' ');
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
			Messages.find({$and:andFindCmdAry}).populate('SendTo', 'Username Level').populate('FromBorrowRequest', 'StoryTitle Category').populate('Transaction').sort(sorterRec).exec( function (err, messages, count){
				if (err) {
					console.log(err);
					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
				}else{
					if(messages.length==0){
						if(targetPage>1){
							res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
						}else{
							res.render('lenderSendMessages',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,msgKeywordDefault:msgKeyword,filterDefault:filter,sorterDefault:sorter,classorDefault:classor,jsonMessage:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,insuranceRate:library.insuranceRate,delJSON:deleteJson,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound});
						}
					}else{
						var options = {
							path: 'Transaction.Return',
							model: Returns
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
								
								if(classorRec!==null){
									for(j=messages.length-1;j>-1;j--){
										if(messages[j].FromBorrowRequest.Category!=classorRec){
											messages.splice(j, 1);
										}
									}
								}
								
								for(i=0;i<messages.length;i++){
									messages[i].Level=messages[i].SendTo.Level;
									library.messageProcessor(messages[i]);
									if(messages[i].Transaction.length>0){
										library.transactionProcessor(messages[i].Transaction[0],true);
									}
								}
								
								if(sorter=='預計總利息'){
									if(director=='大至小'){
										messages.sort(function(a,b) { return parseInt(b.InterestInFuture) - parseInt(a.InterestInFuture)} );
									}else if(director=='小至大'){
										messages.sort(function(a,b) { return parseInt(a.InterestInFuture) - parseInt(b.InterestInFuture)} );
									}
									library.arrayFilter(messages,'InterestInFuture',lboundRec,uboundRec);	
								}else if(sorter=='預計本利和'){
									if(director=='大至小'){
										messages.sort(function(a,b) { return parseInt(b.MoneyFuture) - parseInt(a.MoneyFuture)} );
									}else if(director=='小至大'){
										messages.sort(function(a,b) { return parseInt(a.MoneyFuture) - parseInt(b.MoneyFuture)} );
									}
									library.arrayFilter(messages,'MoneyFuture',lboundRec,uboundRec);	
								}else if(sorter=='預計平均利息'){
									if(director=='大至小'){
										messages.sort(function(a,b) { return parseInt(b.InterestInFutureMonth) - parseInt(a.InterestInFutureMonth)} );
									}else if(director=='小至大'){
										messages.sort(function(a,b) { return parseInt(a.InterestInFutureMonth) - parseInt(b.InterestInFutureMonth)} );
									}
									library.arrayFilter(messages,'InterestInFutureMonth',lboundRec,uboundRec);	
								}else if(sorter=='預計平均本利和'){
									if(director=='大至小'){
										messages.sort(function(a,b) { return parseInt(b.InterestInFutureMoneyMonth) - parseInt(a.InterestInFutureMoneyMonth)} );
									}else if(director=='小至大'){
										messages.sort(function(a,b) { return parseInt(a.InterestInFutureMoneyMonth) - parseInt(b.InterestInFutureMoneyMonth)} );
									}
									library.arrayFilter(messages,'InterestInFutureMoneyMonth',lboundRec,uboundRec);	
								}else if(sorter=='預計利本比'){
									if(director=='大至小'){
										messages.sort(function(a,b) { return parseFloat(b.InterestInFutureDivMoney) - parseFloat(a.InterestInFutureDivMoney)} );
									}else if(director=='小至大'){
										messages.sort(function(a,b) { return parseFloat(a.InterestInFutureDivMoney) - parseFloat(b.InterestInFutureDivMoney)} );
									}
									library.arrayFilter(messages,'InterestInFutureDivMoney',lboundRec,uboundRec);	
								}else if(sorter=='信用等級'){
									if(director=='大至小'){
										messages.sort(function(a,b) { return parseFloat(b.Level) - parseFloat(a.Level)} );
									}else if(director=='小至大'){
										messages.sort(function(a,b) { return parseFloat(a.Level) - parseFloat(b.Level)} );
									}
									library.arrayFilter(messages,'Level',lboundRec,uboundRec);	
								}
								
								totalResultNumber=messages.length;
						
								if(totalResultNumber==0){
									if(targetPage>1){
										res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
									}else{
										res.render('lenderSendMessages',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,msgKeywordDefault:msgKeyword,filterDefault:filter,sorterDefault:sorter,classorDefault:classor,jsonMessage:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,insuranceRate:library.insuranceRate,delJSON:deleteJson,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound});
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
										
										for(i=0;i<resArrays.length;i++){
											if(resArrays[i].Status=='NotConfirmed'){
												resArrays[i].color='color1';
											}else if(resArrays[i].Status=='Rejected'){
												resArrays[i].color='color2';
											}else if(resArrays[i].Status=='Confirmed'){
												resArrays[i].color='color6';
											}
										}
										
										res.render('lenderSendMessages',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,msgKeywordDefault:msgKeyword,filterDefault:filter,sorterDefault:sorter,classorDefault:classor,jsonMessage:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,insuranceRate:library.insuranceRate,delJSON:deleteJson,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound});
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

router.get('/lenderReceiveMessages/:msgKeyword?/:filter?/:classor?/:sorter?/:director?/:lbound?/:ubound?/:page?',library.loginFormChecker, library.ensureAuthenticated,library.newMsgChecker, function (req, res) {
	if((typeof(req.query.msgKeyword) !== "undefined")&&(typeof(req.query.filter) !== "undefined")&&(typeof(req.query.classor) !== "undefined")&&(typeof(req.query.sorter) !== "undefined")&&(typeof(req.query.director) !== "undefined")&&(typeof(req.query.lbound) !== "undefined")&&(typeof(req.query.ubound) !== "undefined")&&(typeof(req.query.page) !== "undefined")){
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
			
			var moneyLendedJson={
				moneyLendedCumulated:0,
				hendLendCumulated:0,
				autoLendCumulated:0,
				moneyLeftToAutoLend:0,
				moneyLeftToHendLend:0,
				maxSettingAutoLend:0
			};
			
			var resArrays=[];
			var msgKeyword=decodeURIComponent(req.query.msgKeyword);
			var filter=decodeURIComponent(req.query.filter);
			var sorter=decodeURIComponent(req.query.sorter);
			var director=decodeURIComponent(req.query.director);
			var lbound=decodeURIComponent(req.query.lbound);
			var ubound=decodeURIComponent(req.query.ubound);
			var classor=decodeURIComponent(req.query.classor);
			var pageNum=0
			var totalResultNumber=0;
			var value1ALL=0;
			var value2ALL=0;
			var value3ALL=0;
			var value4ALL=0;
			var value5ALL=0;
			
			var classorRec=null;
			
			if(classor=='一般'){
				classorRec="general";
			}else if(classor=='教育'){
				classorRec="education";
			}else if(classor=='家庭'){
				classorRec="family";
			}else if(classor=='旅遊'){
				classorRec="tour";
			}else if(classor=='不分故事種類'){
				classorRec=null;
			}else{
				classorRec=null;
				classor='不分故事種類';
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
			}else if(sorter=='欲借入年利率'){
				sorterRecReserve='InterestRate';
			}else if(sorter=='欲借入金額'){
				sorterRecReserve='MoneyToLend';
			}else if(sorter=='欲借入期數'){
				sorterRecReserve='MonthPeriod';
			}else if(sorter=='信用等級'){
				sorterRecReserve='Updated';
			}else if(sorter=='預計總利息'){
				sorterRecReserve='Updated';
			}else if(sorter=='預計本利和'){
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
			if((sorter=='欲借入年利率')||(sorter=='預計利本比')){
				var tester;
				if(lbound.trim()!=''){
					tester=parseFloat(lbound);
					if(!isNaN(tester)){
						if((tester>=0)&&(tester<=99)){
							if(sorter=='欲借入年利率'){
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
						if((tester>=0)&&(tester<=99)){
							if(sorter=='欲借入年利率'){
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
			if(filter=='未確認'){
				andFindCmdAry.push({"Status": "NotConfirmed"});
			}else if(filter=='已同意'){
				andFindCmdAry.push({"Status": "Confirmed"});
			}else if(filter=='已婉拒'){
				andFindCmdAry.push({"Status": "Rejected"});
			}else{
				if(filter!='不分類'){
					filter='不分類';
				}
			}
			
			if((sorter!='預計總利息')&&(sorter!='預計本利和')&&(sorter!='預計平均利息')&&(sorter!='預計平均本利和')&&(sorter!='預計利本比')&&(sorter!='信用等級')){
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
			
			msgKeyword=msgKeyword.replace(/\s\s+/g,' ');
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
			Messages.find({$and:andFindCmdAry}).populate('CreatedBy', 'Username Level').populate('FromBorrowRequest', 'StoryTitle Category').populate('Transaction').sort(sorterRec).exec( function (err, messages, count){
				if (err) {
					console.log(err);
					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
				}else{
					if(messages.length==0){
						if(targetPage>1){
							res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
						}else{
							res.render('lenderReceiveMessages',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,msgKeywordDefault:msgKeyword,filterDefault:filter,sorterDefault:sorter,classorDefault:classor,jsonMessage:resArrays,jsonLend:null,MoneyInBankAccountValue:0,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,value1AllDefault:value1ALL,value2AllDefault:value2ALL,value3AllDefault:value3ALL,value4AllDefault:value4ALL,insuranceRate:library.insuranceRate,cfJSON:confirmJson,rjJSON:rejectJson,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound,MoneyLended:moneyLendedJson});
						}
					}else{
						var options = {
							path: 'Transaction.Return',
							model: Returns
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
								
								if(classorRec!==null){
									for(j=messages.length-1;j>-1;j--){
										if(messages[j].FromBorrowRequest.Category!=classorRec){
											messages.splice(j, 1);
										}
									}
								}
								
								for(i=0;i<messages.length;i++){
									messages[i].Level=messages[i].CreatedBy.Level;
									library.messageProcessor(messages[i]);
									if(messages[i].Transaction.length>0){
										library.transactionProcessor(messages[i].Transaction[0],true);
									}
								}
								
								if(sorter=='預計總利息'){
									if(director=='大至小'){
										messages.sort(function(a,b) { return parseInt(b.InterestInFuture) - parseInt(a.InterestInFuture)} );
									}else if(director=='小至大'){
										messages.sort(function(a,b) { return parseInt(a.InterestInFuture) - parseInt(b.InterestInFuture)} );
									}
									library.arrayFilter(messages,'InterestInFuture',lboundRec,uboundRec);	
								}else if(sorter=='預計本利和'){
									if(director=='大至小'){
										messages.sort(function(a,b) { return parseInt(b.MoneyFuture) - parseInt(a.MoneyFuture)} );
									}else if(director=='小至大'){
										messages.sort(function(a,b) { return parseInt(a.MoneyFuture) - parseInt(b.MoneyFuture)} );
									}
									library.arrayFilter(messages,'MoneyFuture',lboundRec,uboundRec);	
								}else if(sorter=='預計平均利息'){
									if(director=='大至小'){
										messages.sort(function(a,b) { return parseInt(b.InterestInFutureMonth) - parseInt(a.InterestInFutureMonth)} );
									}else if(director=='小至大'){
										messages.sort(function(a,b) { return parseInt(a.InterestInFutureMonth) - parseInt(b.InterestInFutureMonth)} );
									}
									library.arrayFilter(messages,'InterestInFutureMonth',lboundRec,uboundRec);	
								}else if(sorter=='預計平均本利和'){
									if(director=='大至小'){
										messages.sort(function(a,b) { return parseInt(b.InterestInFutureMoneyMonth) - parseInt(a.InterestInFutureMoneyMonth)} );
									}else if(director=='小至大'){
										messages.sort(function(a,b) { return parseInt(a.InterestInFutureMoneyMonth) - parseInt(b.InterestInFutureMoneyMonth)} );
									}
									library.arrayFilter(messages,'InterestInFutureMoneyMonth',lboundRec,uboundRec);	
								}else if(sorter=='預計利本比'){
									if(director=='大至小'){
										messages.sort(function(a,b) { return parseFloat(b.InterestInFutureDivMoney) - parseFloat(a.InterestInFutureDivMoney)} );
									}else if(director=='小至大'){
										messages.sort(function(a,b) { return parseFloat(a.InterestInFutureDivMoney) - parseFloat(b.InterestInFutureDivMoney)} );
									}
									library.arrayFilter(messages,'InterestInFutureDivMoney',lboundRec,uboundRec);	
								}else if(sorter=='信用等級'){
									if(director=='大至小'){
										messages.sort(function(a,b) { return parseFloat(b.Level) - parseFloat(a.Level)} );
									}else if(director=='小至大'){
										messages.sort(function(a,b) { return parseFloat(a.Level) - parseFloat(b.Level)} );
									}
									library.arrayFilter(messages,'Level',lboundRec,uboundRec);	
								}
								
								totalResultNumber=messages.length;
						
								if(totalResultNumber==0){
									if(targetPage>1){
										res.redirect('/message?content='+encodeURIComponent('錯誤頁碼!'));
									}else{
										res.render('lenderReceiveMessages',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,msgKeywordDefault:msgKeyword,filterDefault:filter,sorterDefault:sorter,classorDefault:classor,jsonMessage:resArrays,jsonLend:null,MoneyInBankAccountValue:0,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,value1AllDefault:value1ALL,value2AllDefault:value2ALL,value3AllDefault:value3ALL,value4AllDefault:value4ALL,insuranceRate:library.insuranceRate,cfJSON:confirmJson,rjJSON:rejectJson,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound,MoneyLended:moneyLendedJson});
									}
								}else{
									for(p=0;p<totalResultNumber;p++){
										value1ALL+=messages[p].MoneyToLend;
										value2ALL+=messages[p].InterestInFuture;
										value3ALL+=messages[p].MoneyFuture;
										value4ALL+=messages[p].InterestInFutureMonth;
										value5ALL+=messages[p].InterestInFutureMoneyMonth;
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
										
										for(i=0;i<resArrays.length;i++){
											if(resArrays[i].Status=='NotConfirmed'){
												resArrays[i].color='color3';
											}else if(resArrays[i].Status=='Rejected'){
												resArrays[i].color='color5';
											}else if(resArrays[i].Status=='Confirmed'){
												resArrays[i].color='color7';
											}
										}
										
										Transactions.find({"Lender": req.user._id}).populate('Return').populate('CreatedFrom','Type').exec(function (err, transactions){
											if (err){
												console.log(err);
												res.redirect('/message?content='+encodeURIComponent('錯誤!'));
											}else{
												if(transactions.length>0){
													for(i=0;i<transactions.length;i++){
														library.transactionProcessor(transactions[i],false);
														if(transactions[i].CreatedFrom.Type=='toBorrow'){
															moneyLendedJson.autoLendCumulated+=transactions[i].PrincipalNotReturn;
														}else if(transactions[i].CreatedFrom.Type=='toLend'){
															moneyLendedJson.hendLendCumulated+=transactions[i].PrincipalNotReturn;
														}
													}
													moneyLendedJson.moneyLendedCumulated=moneyLendedJson.hendLendCumulated+moneyLendedJson.autoLendCumulated;
												}
												
												BankAccounts.findOne({"OwnedBy": req.user._id}).exec(function (err, bankaccount){
													if (err) {
														console.log(err);
														res.redirect('/message?content='+encodeURIComponent('錯誤!'));
													}else{
														if(!bankaccount){
															res.redirect('/message?content='+encodeURIComponent('無銀行帳戶!'));
														}else{
															Lends.findOne({"CreatedBy": req.user._id}).exec( function (err, lend){
																if (err) {
																	console.log(err);
																	res.redirect('/message?content='+encodeURIComponent('錯誤!'));
																}else{
																	if(lend){
																		moneyLendedJson.moneyLeftToAutoLend=lend.MaxMoneyToLend-moneyLendedJson.autoLendCumulated;
																		if(moneyLendedJson.moneyLeftToAutoLend<=0){
																			moneyLendedJson.moneyLeftToAutoLend=0;
																		}
																	}
																	moneyLendedJson.moneyLeftToHendLend=bankaccount.MoneyInBankAccount-moneyLendedJson.moneyLeftToAutoLend;
																	if(moneyLendedJson.moneyLeftToHendLend<=0){
																		moneyLendedJson.moneyLeftToHendLend=0;
																	}
																	moneyLendedJson.maxSettingAutoLend=bankaccount.MoneyInBankAccount+moneyLendedJson.autoLendCumulated;
																	res.render('lenderReceiveMessages',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,msgKeywordDefault:msgKeyword,filterDefault:filter,sorterDefault:sorter,classorDefault:classor,jsonMessage:resArrays,jsonLend:lend,MoneyInBankAccountValue:bankaccount.MoneyInBankAccount,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,value1AllDefault:value1ALL,value2AllDefault:value2ALL,value3AllDefault:value3ALL,value4AllDefault:value4ALL,insuranceRate:library.insuranceRate,cfJSON:confirmJson,rjJSON:rejectJson,directorDefault:director,lboundDefault:lbound,uboundDefault:ubound,MoneyLended:moneyLendedJson});
																}
															});
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
	var dataPack={
		d1:'0',
		d:'0',
		d3:'0',
		d4:'0',
		d5:'0',
		d6:'0'
	};
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
	Transactions.find({$and:[{Lender:req.user._id}]}).populate('Return').populate('Borrower','Level').exec( function (err, transactions, count){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			totalResultNumber=transactions.length;
			if(totalResultNumber<=0){
				res.render('income',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,totalResultNum:totalResultNumber,monPriNRNow:monthPrincipalNotReturnNow,monRevNow:monthRevenueNow,monRoiNow:monthRoiNow,monPriNow:monthPrincipalNow,monRevPriNow:monthRevenuePrincipalNow,yrPriNR:yearPrincipalNotReturn,yrRoi:yearRoi,yrRev:yearRevenue,yrPri:yearPrincipal,yrRevPri:yearRevenuePrincipal,yrHistoryPriNR:yearHistoryPrincipalNotReturn,yrHistoryRoi:yearHistoryRoi,yrHistoryRev:yearHistoryRevenue,yrHistoryPri:yearHistoryPrincipal,yrHistoryRevPri:yearHistoryRevenuePrincipal,data01:data1,data02:data2,data03:data3,data04:data4,data05:data5,data06:data6,data07:data7,data08:data8,data09:data9,data010:data10,data011:data11});
			}else{
				for(i=0;i<totalResultNumber;i++){
					library.transactionProcessor(transactions[i],false);
					transactions[i].InterestRate-=library.serviceChargeRate;//scr
					transactions[i].tempPrincipal=transactions[i].PrincipalNotReturn;
					transactions[i].tempMonthPeriod=transactions[i].MonthPeriodLeft;
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
							
							if(transactions[i].tempMonthPeriod>1){
								transactions[i].monthPaidPrincipal=Math.floor(transactions[i].tempPrincipal/transactions[i].tempMonthPeriod);
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
							tempMonthPrincipal+=transactions[i].Return[0].PrincipalNotReturnBeforePaid;
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
					dataPack.d1=yearRevenue/monthArray.length;
					dataPack.d2=yearPrincipal/monthArray.length;
					dataPack.d3=yearRevenuePrincipal/monthArray.length;
				}
				yearPrincipalNotReturn=yearPrincipalNotReturn.toFixed(0);
				yearRoi=yearRoi.toFixed(4);
				dataPack.d1=dataPack.d1.toFixed(0);
				dataPack.d2=dataPack.d2.toFixed(0);
				dataPack.d3=dataPack.d3.toFixed(0);
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
					dataPack.d4=yearHistoryRevenue/monthArray2.length;
					dataPack.d5=yearHistoryPrincipal/monthArray2.length;
					dataPack.d6=yearHistoryRevenuePrincipal/monthArray2.length;
				}
				yearHistoryPrincipalNotReturn=yearHistoryPrincipalNotReturn.toFixed(0);
				yearHistoryRoi=yearHistoryRoi.toFixed(4);
				dataPack.d4=dataPack.d4.toFixed(0);
				dataPack.d5=dataPack.d5.toFixed(0);
				dataPack.d6=dataPack.d6.toFixed(0);
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
					if((transactions[i].Borrower.Level>=0)&&(transactions[i].Borrower.Level<5)){
						data11Array[0].value+=1;
					}else if((transactions[i].Borrower.Level>=5)&&(transactions[i].Borrower.Level<10)){
						data11Array[1].value+=1;
					}else if((transactions[i].Borrower.Level>=10)&&(transactions[i].Borrower.Level<15)){
						data11Array[2].value+=1;
					}else if((transactions[i].Borrower.Level>=15)&&(transactions[i].Borrower.Level<20)){
						data11Array[3].value+=1;
					}else if(transactions[i].Borrower.Level>=20){
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
				res.render('income',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,dpk:dataPack,totalResultNum:totalResultNumber,monPriNRNow:monthPrincipalNotReturnNow,monRevNow:monthRevenueNow,monRoiNow:monthRoiNow,monPriNow:monthPrincipalNow,monRevPriNow:monthRevenuePrincipalNow,yrPriNR:yearPrincipalNotReturn,yrRoi:yearRoi,yrRev:yearRevenue,yrPri:yearPrincipal,yrRevPri:yearRevenuePrincipal,yrHistoryPriNR:yearHistoryPrincipalNotReturn,yrHistoryRoi:yearHistoryRoi,yrHistoryRev:yearHistoryRevenue,yrHistoryPri:yearHistoryPrincipal,yrHistoryRevPri:yearHistoryRevenuePrincipal,data01:data1,data02:data2,data03:data3,data04:data4,data05:data5,data06:data6,data07:data7,data08:data8,data09:data9,data010:data10,data011:data11});
			}
		}
	});
});

module.exports = router;


