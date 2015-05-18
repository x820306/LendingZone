var library=require( './library.js' );
var mongoose = require('mongoose');

var express = require('express');
var router = express.Router();

router.get('/search/:keyword?/:action?/:page?', function (req, res) {
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	
	var resArrays=[];
	var action=decodeURIComponent(req.query.action);
	var category=decodeURIComponent(req.query.category);
	var filter=decodeURIComponent(req.query.filter);
	var lbound=decodeURIComponent(req.query.lbound);
	var ubound=decodeURIComponent(req.query.ubound);
	var keyword=decodeURIComponent(req.query.keyword);
	var targetPage=parseInt(req.query.page);
	var pageNum=0
	var totalResultNumber;
	
	var actionRec=null;
	
	if(action=='最新'){
		actionRec="-Created";
	}else if(action=='最緊急'){
		actionRec="TimeLimit";
	}else if(action=='最熱門'){
		actionRec="-LikeNumber";
	}else if(action=='金額最高'){
		actionRec="-MoneyToBorrow";
	}else if(action=='利率最高'){
		actionRec="-MaxInterestRateAccepted";
	}else if(action=='期數最多'){
		actionRec="-MonthPeriodAccepted";
	}else if(action=='信用等級最高'){
		actionRec="-Level";
	}
	
	var categoryRec=null;
	
	if(category=='一般'){
		categoryRec="general";
	}else if(category=='教育'){
		categoryRec="education";
	}else if(category=='婚禮'){
		categoryRec="wedding";
	}else if(category=='旅行'){
		categoryRec="tour";
	}
	
	var filterRec=null;
	
	if(filter=='金額'){
		filterRec="MoneyToBorrow";
	}else if(filter=='利率'){
		filterRec="MaxInterestRateAccepted";
	}else if(filter=='期數'){
		filterRec="MonthPeriodAccepted";
	}else if(filter=='信用等級'){
		filterRec="Level";
	}else if(filter=='未選擇濾鏡'){
		filterRec=null;
	}
	
	var lboundRec=null;
	var uboundRec=null;
	if(filterRec){
		if(filterRec=="MaxInterestRateAccepted"){
			lboundRec=(parseFloat(lbound)/100)+library.serviceChargeRate;//scr
			uboundRec=(parseFloat(ubound)/100)+library.serviceChargeRate;//scr
		}else{
			lboundRec=parseInt(lbound);
			uboundRec=parseInt(ubound);
		}
	}
	
	var andFindCmdAry=[];
	andFindCmdAry.push({"StoryTitle": {'$ne': '' }});
	andFindCmdAry.push({"Story": {'$ne': '' }});
	andFindCmdAry.push({"IfReadable": true});
	if(categoryRec){
		andFindCmdAry.push({"Category": categoryRec});
	}
	var jsonTemp={};
	if((filter!='未選擇濾鏡')&&(lbound!='')&&(ubound!='')&&(lboundRec)&&(uboundRec)&&(filterRec)&&(filterRec!='')&&(lboundRec!='')&&(uboundRec!='')){
		jsonTemp[filterRec]={"$gte": lboundRec, "$lt": uboundRec};
		andFindCmdAry.push(jsonTemp);
	}else if((filter!='未選擇濾鏡')&&(filterRec)&&(filterRec!='')&&(lbound!='')&&(lboundRec)&&(lboundRec!='')){
		jsonTemp[filterRec]={"$gte": lboundRec};
		andFindCmdAry.push(jsonTemp);
	}else if((filter!='未選擇濾鏡')&&(filterRec)&&(filterRec!='')&&(ubound!='')&&(uboundRec)&&(uboundRec!='')){
		jsonTemp[filterRec]={"$lt": uboundRec};
		andFindCmdAry.push(jsonTemp);
	}
	var orFindCmdAry=[];
	orFindCmdAry.push({"StoryTitle": new RegExp(keyword,'i')});
	orFindCmdAry.push({"Story": new RegExp(keyword,'i')});
	if(mongoose.Types.ObjectId.isValid(keyword)){
		var borrowObjID=mongoose.Types.ObjectId(keyword);
		orFindCmdAry.push({"_id": borrowObjID});
	}
	var Borrows  = mongoose.model('Borrows');
	Borrows.count({$or:orFindCmdAry,$and:andFindCmdAry},function (err, count) {
		if (err){
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			var divider=2;
			totalResultNumber=count;
			if(totalResultNumber<=0){
				if(targetPage>1){
					res.redirect('/message?content='+chineseEncodeToURI('錯誤頁碼!'));
				}else{
					res.render('search',{userName:auRst,keywordDefault:keyword,actionDefault:action,categoryDefault:category,filterDefault:filter,lboundDefault:lbound,uboundDefault:ubound,jsonArray:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage});
				}
			}else{
				pageNum=Math.ceil(totalResultNumber/divider);
				if(pageNum<targetPage){
					res.redirect('/message?content='+chineseEncodeToURI('錯誤頁碼!'));
				}else{
					Borrows.find({$or:orFindCmdAry,$and:andFindCmdAry}).limit(divider).skip(divider*(targetPage-1)).populate('CreatedBy', 'Username').sort(actionRec).exec( function (err, borrows, count){
						if (err) {
							console.log(err);
							res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
						}else{
							for(i=0;i<borrows.length;i++){
								borrows[i].MaxInterestRateAccepted-=library.serviceChargeRate;//scr
							}
							resArrays=borrows;
							res.render('search',{userName:auRst,keywordDefault:keyword,actionDefault:action,categoryDefault:category,filterDefault:filter,lboundDefault:lbound,uboundDefault:ubound,jsonArray:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage});
						}
					});
				}
			}
		}
	});
});

router.get('/story/:id?', function (req, res) {
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	
	var Users  = mongoose.model('Users');
	var Borrows  = mongoose.model('Borrows');
	var Discussions  = mongoose.model('Discussions');
	var Messages  = mongoose.model('Messages');
	var BankAccounts  = mongoose.model('BankAccounts');
	var Transactions  = mongoose.model('Transactions');
	Borrows.findById(req.query.id).populate('CreatedBy', 'Username').populate('Discussion').exec(function (err, borrow){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			if(!borrow){
				res.redirect('/message?content='+chineseEncodeToURI('錯誤ID!'));
			}else{
				var options = {
					path: 'Discussion.CreatedBy',
					model: Users,
					select: 'Username'
				};
				Discussions.populate(borrow, options, function(err, borrow) {
					if(err){
						console.log(err);
						res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
					}else{
						borrow.MaxInterestRateAccepted-=library.serviceChargeRate;//scr
						var ifSelfValue=false;
						var ifLikedValue=false;
						if(!auRst){
							res.render('story',{userName:auRst,ifSelf:ifSelfValue,ifLiked:ifLikedValue,json:borrow,jsonMessage:null,jsonBorrowMessage:null,MoneyInBankAccountValue:0,MoneyLended:0});
						}else{
							if(req.user._id==borrow.CreatedBy._id){
								ifSelfValue=true;
								res.render('story',{userName:auRst,ifSelf:ifSelfValue,ifLiked:ifLikedValue,json:borrow,jsonMessage:null,jsonBorrowMessage:null,MoneyInBankAccountValue:0,MoneyLended:0});
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
										res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
									}else{
										if(!bankaccount){
											res.redirect('/message?content='+chineseEncodeToURI('無銀行帳戶!'));
										}else{
											var moneyLendedCumulated=0
											Transactions.find({"Lender": req.user._id}).exec(function (err, transactions){
												if (err) {
													console.log(err);
													res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
												}else{
													if(transactions.length>0){
														for(i=0;i<transactions.length;i++){
															moneyLendedCumulated+=transactions[i].Principal;
														}
													}
													Messages.findOne({$and:[{"CreatedBy": req.user._id},{"FromBorrowRequest": req.query.id},{"Type": "toLend"}]}).exec(function (err, message){
														if (err) {
															console.log(err);
															res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
														}else{
															if(message){
																message.InterestRate-=library.serviceChargeRate;//scr
																message.InterestInFuture=library.interestInFutureCalculator(message.MoneyToLend,message.InterestRate,message.MonthPeriod);
																message.InterestInFutureDivMoney=message.InterestInFuture/message.MoneyToLend*100;
																message.InterestInFutureMonth=message.InterestInFuture/message.MonthPeriod;
																message.InterestInFutureMoneyMonth=(message.InterestInFuture+message.MoneyToLend)/message.MonthPeriod;
															}
															Messages.findOne({$and:[{"CreatedBy": borrow.CreatedBy._id},{"SendTo": req.user._id},{"FromBorrowRequest": req.query.id},{"Type": "toBorrow"}]}).exec(function (err, borrowMessage){
																if (err) {
																	console.log(err);
																	res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
																}else{
																	if(borrowMessage){
																		borrowMessage.InterestRate-=library.serviceChargeRate;//scr
																		borrowMessage.InterestInFuture=library.interestInFutureCalculator(borrowMessage.MoneyToLend,borrowMessage.InterestRate,borrowMessage.MonthPeriod);
																		borrowMessage.InterestInFutureDivMoney=borrowMessage.InterestInFuture/borrowMessage.MoneyToLend*100;
																		borrowMessage.InterestInFutureMonth=borrowMessage.InterestInFuture/borrowMessage.MonthPeriod;
																		borrowMessage.InterestInFutureMoneyMonth=(borrowMessage.InterestInFuture+borrowMessage.MoneyToLend)/borrowMessage.MonthPeriod;
																	}
																	res.render('story',{userName:auRst,ifSelf:ifSelfValue,ifLiked:ifLikedValue,json:borrow,jsonMessage:message,jsonBorrowMessage:borrowMessage,MoneyInBankAccountValue:bankaccount.MoneyInBankAccount,MoneyLended:moneyLendedCumulated});
																}
															});
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
});

router.get('/lend', ensureAuthenticated, function (req, res) {
	var Lends  = mongoose.model('Lends');
	var BankAccounts  = mongoose.model('BankAccounts');
	var Transactions  = mongoose.model('Transactions');
	BankAccounts.findOne({"OwnedBy": req.user._id}).exec(function (err, bankaccount){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			if(!bankaccount){
				res.redirect('/message?content='+chineseEncodeToURI('無銀行帳戶!'));
			}else{
				var moneyLendedCumulated=0
				Transactions.find({"Lender": req.user._id}).exec(function (err, transactions){
					if (err) {
						console.log(err);
						res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
					}else{
						if(transactions.length>0){
							for(i=0;i<transactions.length;i++){
								moneyLendedCumulated+=transactions[i].Principal;
							}
						}
						Lends.findOne({"CreatedBy": req.user._id}).exec(function (err, lend){
							if (err) {
								console.log(err);
								res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
							}else{
								if(lend){
									lend.InterestRate-=library.serviceChargeRate;//scr
								}
								res.render('lend',{userName:req.user.Username,MoneyInBankAccountValue:bankaccount.MoneyInBankAccount,MoneyLended:moneyLendedCumulated,jsonLend:lend});
							}
						});
					}
				});
			}
		}
	});
});

router.get('/lenderTransactionRecord/:oneid?/:filter?/:sorter?/:page?', ensureAuthenticated, function (req, res) {
	var resArrays=[];
	var oneid=decodeURIComponent(req.query.oneid);
	var sorter=decodeURIComponent(req.query.sorter);
	var filter=decodeURIComponent(req.query.filter);
	var targetPage=parseInt(req.query.page);
	var pageNum=0
	var totalResultNumber;
	var selectedFeeAllIpt=0;
	
	var sorterRec;
	
	if(sorter=='最新'){
		sorterRec="-Updated";
	}else if(sorter=='已獲利最多'){
		sorterRec="-InterestCumulated";
	}else if(sorter=='利率最高'){
		sorterRec="-InterestRate";
	}else if(sorter=='金額最大'){
		sorterRec="-Principal";
	}else if(sorter=='期數最多'){
		sorterRec="-MonthPeriod";
	}else if(sorter=='信用等級最高'){
		sorterRec="-Level";
	}else if(sorter=='預計總利息最高'){
		sorterRec="-Updated";
	}else if(sorter=='預計平均利息最高'){
		sorterRec="-Updated";
	}else if(sorter=='預計平均本利和最高'){
		sorterRec="-Updated";
	}else if(sorter=='預計利本比最高'){
		sorterRec="-Updated";
	}else if(sorter=='已付保險費最高'){
		sorterRec="-InsuranceFeePaid";
	}
	
	var andFindCmdAry=[];
	andFindCmdAry.push({"Lender": req.user._id});
	var jsonTemp={};
	if(filter=='未保險'){
		jsonTemp['InsuranceFeePaid']={"$lt": 1};
		andFindCmdAry.push(jsonTemp);
	}else if(filter=='已保險'){
		jsonTemp['InsuranceFeePaid']={"$gte": 1};
		andFindCmdAry.push(jsonTemp);
	}
	if(mongoose.Types.ObjectId.isValid(oneid)){
		var ObjID=mongoose.Types.ObjectId(oneid);
		andFindCmdAry.push({"_id": ObjID});
	}
	
	var Borrows  = mongoose.model('Borrows');
	var Messages  = mongoose.model('Messages');
	var Transactions  = mongoose.model('Transactions');
	Transactions.find({$and:andFindCmdAry}).populate('Borrower', 'Username').populate('CreatedFrom', 'FromBorrowRequest').sort(sorterRec).exec( function (err, transactions, count){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			totalResultNumber=transactions.length;
			if(totalResultNumber==0){
				if(targetPage>1){
					res.redirect('/message?content='+chineseEncodeToURI('錯誤頁碼!'));
				}else{
					res.render('lenderTransactionRecord',{userName:req.user.Username,oneidDefault:oneid,filterDefault:filter,sorterDefault:sorter,jsonTransaction:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,insuranceRate:library.insuranceRate,selectedFeeAll:selectedFeeAllIpt});
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
						res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
					}else{
						for(i=0;i<totalResultNumber;i++){
							transactions[i].InterestRate-=library.serviceChargeRate;//scr
							transactions[i].InterestInFuture=library.interestInFutureCalculator(transactions[i].Principal,transactions[i].InterestRate,transactions[i].MonthPeriod);
							transactions[i].InterestInFutureDivMoney=transactions[i].InterestInFuture/transactions[i].Principal*100;
							transactions[i].InterestInFutureMonth=transactions[i].InterestInFuture/transactions[i].MonthPeriod;
							transactions[i].InterestInFutureMoneyMonth=(transactions[i].InterestInFuture+transactions[i].Principal)/transactions[i].MonthPeriod;
							selectedFeeAllIpt+=transactions[i].Principal*library.insuranceRate;
						}
						
						if(sorter=='預計總利息最高'){
							transactions.sort(function(a,b) { return parseFloat(b.InterestInFuture) - parseFloat(a.InterestInFuture)} );
						}
						
						if(sorter=='預計平均利息最高'){
							transactions.sort(function(a,b) { return parseFloat(b.InterestInFutureMonth) - parseFloat(a.InterestInFutureMonth)} );
						}
						
						if(sorter=='預計平均本利和最高'){
							transactions.sort(function(a,b) { return parseFloat(b.InterestInFutureMoneyMonth) - parseFloat(a.InterestInFutureMoneyMonth)} );
						}
						
						if(sorter=='預計利本比最高'){
							transactions.sort(function(a,b) { return parseFloat(b.InterestInFutureDivMoney) - parseFloat(a.InterestInFutureDivMoney) } );
						}
						
						var divider=2;
						pageNum=Math.ceil(transactions.length/divider);
						
						if(pageNum<targetPage){
							res.redirect('/message?content='+chineseEncodeToURI('錯誤頁碼!'));
						}else{
							var starter=divider*(targetPage-1);
							var ender;
							if(targetPage==pageNum){
								ender=transactions.length;
							}else{
								ender=starter+divider;
							}
							for(i=starter;i<ender;i++){
								resArrays.push(transactions[i]);
							}
							res.render('lenderTransactionRecord',{userName:req.user.Username,oneidDefault:oneid,filterDefault:filter,sorterDefault:sorter,jsonTransaction:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,insuranceRate:library.insuranceRate,selectedFeeAll:selectedFeeAllIpt});
						}
					}
				});
			}
		}
	});
});

router.get('/lenderReturnRecord/:oneid?/:id?/:sorter?/:page?', ensureAuthenticated, function (req, res) {
	var resArrays=[];
	var oneid=decodeURIComponent(req.query.oneid);
	var id=decodeURIComponent(req.query.id);
	var sorter=decodeURIComponent(req.query.sorter);
	var targetPage=parseInt(req.query.page);
	var pageNum=0
	var totalResultNumber;
	
	var sorterRec;
	
	if(sorter=='最新'){
		sorterRec="-Updated";
	}else if(sorter=='實收金額最多'){
		sorterRec="-Updated";
	}else if(sorter=='應收金額最多'){
		sorterRec="-Updated";
	}else if(sorter=='未收金額最多'){
		sorterRec="-Updated";
	}else if(sorter=='超收金額最多'){
		sorterRec="-Updated";
	}
	
	var andFindCmdAry=[];
	andFindCmdAry.push({Lender:req.user._id});
	if(mongoose.Types.ObjectId.isValid(id)){
		var ObjID0=mongoose.Types.ObjectId(id);
		andFindCmdAry.push({ToTransaction:ObjID0});
	}
	if(mongoose.Types.ObjectId.isValid(oneid)){
		var ObjID=mongoose.Types.ObjectId(oneid);
		andFindCmdAry.push({"_id": ObjID});
	}
	
	var Returns  = mongoose.model('Returns');
	Returns.find({$and:andFindCmdAry}).populate('Borrower', 'Username').sort(sorterRec).exec( function (err, returns, count){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			totalResultNumber=returns.length;
			if(totalResultNumber==0){
				if(targetPage>1){
					res.redirect('/message?content='+chineseEncodeToURI('錯誤頁碼!'));
				}else{
					res.render('lenderReturnRecord',{userName:req.user.Username,oneidDefault:oneid,idDefault:id,sorterDefault:sorter,jsonReturns:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage});
				}
			}else{
				for(i=0;i<totalResultNumber;i++){
					returns[i].MoneyReallyPaid=(returns[i].InterestShouldPaid-returns[i].InterestNotPaid)+(returns[i].PrincipalShouldPaid-returns[i].PrincipalNotPaid);
					returns[i].MoneyShouldPaid=returns[i].InterestShouldPaid+returns[i].PrincipalShouldPaid;
					returns[i].MoneyNotPaid=returns[i].InterestNotPaid+returns[i].PrincipalNotPaid;
				}
				
				if(sorter=='實收金額最多'){
					returns.sort(function(a,b) { return parseFloat(b.MoneyReallyPaid) - parseFloat(a.MoneyReallyPaid)} );
				}else if(sorter=='應收金額最多'){
					returns.sort(function(a,b) { return parseFloat(b.MoneyShouldPaid) - parseFloat(a.MoneyShouldPaid)} );
				}else if(sorter=='未收金額最多'){
					returns.sort(function(a,b) { return parseFloat(b.MoneyNotPaid) - parseFloat(a.MoneyNotPaid)} );
				}else if(sorter=='超收金額最多'){
					returns.sort(function(a,b) { return parseFloat(a.MoneyNotPaid) - parseFloat(b.MoneyNotPaid)} );
				}
				
				var divider=2;
				pageNum=Math.ceil(returns.length/divider);
				
				if(pageNum<targetPage){
					res.redirect('/message?content='+chineseEncodeToURI('錯誤頁碼!'));
				}else{
					var starter=divider*(targetPage-1);
					var ender;
					if(targetPage==pageNum){
						ender=returns.length;
					}else{
						ender=starter+divider;
					}
					for(i=starter;i<ender;i++){
						resArrays.push(returns[i]);
					}
					res.render('lenderReturnRecord',{userName:req.user.Username,oneidDefault:oneid,idDefault:id,sorterDefault:sorter,jsonReturns:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage});
				}
			}
		}
	});
});

router.get('/lendsList/:oneid?/:sorter?/:page?', ensureAuthenticated, function (req, res) {
	var resArrays=[];
	var oneid=decodeURIComponent(req.query.oneid);
	var sorter=decodeURIComponent(req.query.sorter);
	var targetPage=parseInt(req.query.page);
	var pageNum=0
	var totalResultNumber;
	
	var sorterRec;
	
	if(sorter=='最新'){
		sorterRec="-Updated";
	}else if(sorter=='可借出金額最高'){
		sorterRec="-MaxMoneyToLend";
	}else if(sorter=='利率最高'){
		sorterRec="-InterestRate";
	}else if(sorter=='期數最多'){
		sorterRec="-MonthPeriod";
	}else if(sorter=='可接受信用等級最高'){
		sorterRec="-MinLevelAccepted";
	}else if(sorter=='可接受總利息最高'){
		sorterRec="-MinInterestInFuture";
	}else if(sorter=='可接受平均利息最高'){
		sorterRec="-MinInterestInFutureMonth";
	}else if(sorter=='可接受平均本利和最高'){
		sorterRec="-MinInterestInFutureMoneyMonth";
	}else if(sorter=='可接受利本比最高'){
		sorterRec="-MinInterestInFutureDivMoney";
	}
	
	var findCmd={};
	if(mongoose.Types.ObjectId.isValid(oneid)){
		var ObjID=mongoose.Types.ObjectId(oneid);
		findCmd={"_id": ObjID};
	}
	
	var Lends  = mongoose.model('Lends');
	Lends.count(findCmd,function (err, count) {
		if (err){
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			var divider=2;
			totalResultNumber=count;
			if(totalResultNumber<=0){
				if(targetPage>1){
					res.redirect('/message?content='+chineseEncodeToURI('錯誤頁碼!'));
				}else{
					res.render('lendsList',{userName:req.user.Username,oneidDefault:oneid,sorterDefault:sorter,jsonLends:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage});
				}
			}else{
				pageNum=Math.ceil(totalResultNumber/divider);
				if(pageNum<targetPage){
					res.redirect('/message?content='+chineseEncodeToURI('錯誤頁碼!'));
				}else{
					Lends.find(findCmd).limit(divider).skip(divider*(targetPage-1)).populate('CreatedBy', 'Username').sort(sorterRec).exec( function (err, lends, count){
						if (err) {
							console.log(err);
							res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
						}else{
							for(i=0;i<lends.length;i++){
								lends[i].InterestRate-=library.serviceChargeRate;//scr
							}
							resArrays=lends;
							res.render('lendsList',{userName:req.user.Username,oneidDefault:oneid,sorterDefault:sorter,jsonLends:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage});
						}
					});
				}
			}
		}
	});
});

router.get('/lenderSendMessages/:msgKeyword?/:filter?/:sorter?/:page?', ensureAuthenticated, function (req, res) {
	var resArrays=[];
	var msgKeyword=decodeURIComponent(req.query.msgKeyword);
	var filter=decodeURIComponent(req.query.filter);
	var sorter=decodeURIComponent(req.query.sorter);
	var targetPage=parseInt(req.query.page);
	var pageNum=0
	var totalResultNumber;
	
	var filterRec;
	
	if(filter=='未被確認'){
		filterRec="NotConfirmed";
	}else if(filter=='已被同意'){
		filterRec="Confirmed";
	}else if(filter=='已被婉拒'){
		filterRec="Rejected";
	}
	
	var sorterRec;
	
	if(sorter=='最新'){
		sorterRec="-Updated";
	}else if(sorter=='利率最高'){
		sorterRec="-InterestRate";
	}else if(sorter=='金額最高'){
		sorterRec="-MoneyToLend";
	}else if(sorter=='期數最多'){
		sorterRec="-MonthPeriod";
	}else if(sorter=='信用等級最高'){
		sorterRec="-Level";
	}else if(sorter=='預計總利息最高'){
		sorterRec="-Updated";
	}else if(sorter=='預計平均利息最高'){
		sorterRec="-Updated";
	}else if(sorter=='預計平均本利和最高'){
		sorterRec="-Updated";
	}else if(sorter=='預計利本比最高'){
		sorterRec="-Updated";
	}
	
	var orFindCmdAry=[];
	orFindCmdAry.push({"Message": new RegExp(msgKeyword,'i')});
	if(mongoose.Types.ObjectId.isValid(msgKeyword)){
		var msgObjID=mongoose.Types.ObjectId(msgKeyword);
		orFindCmdAry.push({"_id": msgObjID});
	}
	
	var Messages  = mongoose.model('Messages');
	var Transactions  = mongoose.model('Transactions');
	Messages.find({$or:orFindCmdAry,$and:[{"CreatedBy": req.user._id},{"Type": "toLend"},{"Status": filterRec}]}).populate('SendTo', 'Username').populate('FromBorrowRequest', 'StoryTitle').populate('Transaction').sort(sorterRec).exec( function (err, messages, count){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			totalResultNumber=messages.length;
			if(totalResultNumber==0){
				if(targetPage>1){
					res.redirect('/message?content='+chineseEncodeToURI('錯誤頁碼!'));
				}else{
					res.render('lenderSendMessages',{userName:req.user.Username,msgKeywordDefault:msgKeyword,filterDefault:filter,sorterDefault:sorter,jsonMessage:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,insuranceRate:library.insuranceRate});
				}
			}else{
				for(i=0;i<totalResultNumber;i++){
					messages[i].InterestRate-=library.serviceChargeRate;//scr
					messages[i].InterestInFuture=library.interestInFutureCalculator(messages[i].MoneyToLend,messages[i].InterestRate,messages[i].MonthPeriod);
					messages[i].InterestInFutureDivMoney=messages[i].InterestInFuture/messages[i].MoneyToLend*100;
					messages[i].InterestInFutureMonth=messages[i].InterestInFuture/messages[i].MonthPeriod;
					messages[i].InterestInFutureMoneyMonth=(messages[i].InterestInFuture+messages[i].MoneyToLend)/messages[i].MonthPeriod;
					if(messages[i].Transaction.length>0){
						messages[i].Transaction[0].InterestRate-=library.serviceChargeRate;//scr
						messages[i].Transaction[0].InterestInFuture=library.interestInFutureCalculator(messages[i].Transaction[0].Principal,messages[i].Transaction[0].InterestRate,messages[i].Transaction[0].MonthPeriod);
						messages[i].Transaction[0].InterestInFutureDivMoney=messages[i].Transaction[0].InterestInFuture/messages[i].Transaction[0].Principal*100;
						messages[i].Transaction[0].InterestInFutureMonth=messages[i].Transaction[0].InterestInFuture/messages[i].Transaction[0].MonthPeriod;
						messages[i].Transaction[0].InterestInFutureMoneyMonth=(messages[i].Transaction[0].InterestInFuture+messages[i].Transaction[0].Principal)/messages[i].Transaction[0].MonthPeriod;
					}
				}
				
				if(sorter=='預計總利息最高'){
					messages.sort(function(a,b) { return parseFloat(b.InterestInFuture) - parseFloat(a.InterestInFuture)} );
				}
				
				if(sorter=='預計平均利息最高'){
					messages.sort(function(a,b) { return parseFloat(b.InterestInFutureMonth) - parseFloat(a.InterestInFutureMonth)} );
				}
				
				if(sorter=='預計平均本利和最高'){
					messages.sort(function(a,b) { return parseFloat(b.InterestInFutureMoneyMonth) - parseFloat(a.InterestInFutureMoneyMonth)} );
				}
				
				if(sorter=='預計利本比最高'){
					messages.sort(function(a,b) { return parseFloat(b.InterestInFutureDivMoney) - parseFloat(a.InterestInFutureDivMoney) } );
				}
				
				var divider=2;
				pageNum=Math.ceil(messages.length/divider);
				
				if(pageNum<targetPage){
					res.redirect('/message?content='+chineseEncodeToURI('錯誤頁碼!'));
				}else{
					var starter=divider*(targetPage-1);
					var ender;
					if(targetPage==pageNum){
						ender=messages.length;
					}else{
						ender=starter+divider;
					}
					for(i=starter;i<ender;i++){
						resArrays.push(messages[i]);
					}

					res.render('lenderSendMessages',{userName:req.user.Username,msgKeywordDefault:msgKeyword,filterDefault:filter,sorterDefault:sorter,jsonMessage:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,insuranceRate:library.insuranceRate});
				}
			}
		}
	});
});

router.get('/lenderReceiveMessages/:msgKeyword?/:filter?/:sorter?/:page?', ensureAuthenticated, function (req, res) {
	var resArrays=[];
	var msgKeyword=decodeURIComponent(req.query.msgKeyword);
	var filter=decodeURIComponent(req.query.filter);
	var sorter=decodeURIComponent(req.query.sorter);
	var targetPage=parseInt(req.query.page);
	var pageNum=0
	var totalResultNumber;
	var value1ALL=0;
	var value2ALL=0;
	var value3ALL=0;
	var value4ALL=0;
	
	var filterRec;
	
	if(filter=='未確認'){
		filterRec="NotConfirmed";
	}else if(filter=='已同意'){
		filterRec="Confirmed";
	}else if(filter=='已婉拒'){
		filterRec="Rejected";
	}
	
	var sorterRec;
	
	if(sorter=='最新'){
		sorterRec="-Updated";
	}else if(sorter=='利率最高'){
		sorterRec="-InterestRate";
	}else if(sorter=='金額最高'){
		sorterRec="-MoneyToLend";
	}else if(sorter=='期數最多'){
		sorterRec="-MonthPeriod";
	}else if(sorter=='信用等級最高'){
		sorterRec="-Level";
	}else if(sorter=='預計總利息最高'){
		sorterRec="-Updated";
	}else if(sorter=='預計平均利息最高'){
		sorterRec="-Updated";
	}else if(sorter=='預計平均本利和最高'){
		sorterRec="-Updated";
	}else if(sorter=='預計利本比最高'){
		sorterRec="-Updated";
	}
	
	var orFindCmdAry=[];
	orFindCmdAry.push({"Message": new RegExp(msgKeyword,'i')});
	if(mongoose.Types.ObjectId.isValid(msgKeyword)){
		var msgObjID=mongoose.Types.ObjectId(msgKeyword);
		orFindCmdAry.push({"_id": msgObjID});
	}
	
	var Messages  = mongoose.model('Messages');
	var Transactions  = mongoose.model('Transactions');
	Messages.find({$or:orFindCmdAry,$and:[{"SendTo": req.user._id},{"Type": "toBorrow"},{"Status": filterRec}]}).populate('CreatedBy', 'Username').populate('FromBorrowRequest', 'StoryTitle').populate('Transaction').sort(sorterRec).exec( function (err, messages, count){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			totalResultNumber=messages.length;
			if(totalResultNumber==0){
				if(targetPage>1){
					res.redirect('/message?content='+chineseEncodeToURI('錯誤頁碼!'));
				}else{
					res.render('lenderReceiveMessages',{userName:req.user.Username,msgKeywordDefault:msgKeyword,filterDefault:filter,sorterDefault:sorter,jsonMessage:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,value1AllDefault:value1ALL,value2AllDefault:value2ALL,value3AllDefault:value3ALL,value4AllDefault:value4ALL,insuranceRate:library.insuranceRate});
				}
			}else{
				for(i=0;i<totalResultNumber;i++){
					messages[i].InterestRate-=library.serviceChargeRate;//scr
					messages[i].InterestInFuture=library.interestInFutureCalculator(messages[i].MoneyToLend,messages[i].InterestRate,messages[i].MonthPeriod);
					messages[i].InterestInFutureDivMoney=messages[i].InterestInFuture/messages[i].MoneyToLend*100;
					messages[i].InterestInFutureMonth=messages[i].InterestInFuture/messages[i].MonthPeriod;
					messages[i].InterestInFutureMoneyMonth=(messages[i].InterestInFuture+messages[i].MoneyToLend)/messages[i].MonthPeriod;
					if(messages[i].Transaction.length>0){
						messages[i].Transaction[0].InterestRate-=library.serviceChargeRate;//scr
						messages[i].Transaction[0].InterestInFuture=library.interestInFutureCalculator(messages[i].Transaction[0].Principal,messages[i].Transaction[0].InterestRate,messages[i].Transaction[0].MonthPeriod);
						messages[i].Transaction[0].InterestInFutureDivMoney=messages[i].Transaction[0].InterestInFuture/messages[i].Transaction[0].Principal*100;
						messages[i].Transaction[0].InterestInFutureMonth=messages[i].Transaction[0].InterestInFuture/messages[i].Transaction[0].MonthPeriod;
						messages[i].Transaction[0].InterestInFutureMoneyMonth=(messages[i].Transaction[0].InterestInFuture+messages[i].Transaction[0].Principal)/messages[i].Transaction[0].MonthPeriod;
					}
					value1ALL+=messages[i].MoneyToLend;
					value2ALL+=messages[i].InterestInFuture;
					value3ALL+=messages[i].InterestInFutureMonth;
					value4ALL+=messages[i].InterestInFutureMoneyMonth;
				}
				
				if(sorter=='預計總利息最高'){
					messages.sort(function(a,b) { return parseFloat(b.InterestInFuture) - parseFloat(a.InterestInFuture)} );
				}
				
				if(sorter=='預計平均利息最高'){
					messages.sort(function(a,b) { return parseFloat(b.InterestInFutureMonth) - parseFloat(a.InterestInFutureMonth)} );
				}
				
				if(sorter=='預計平均本利和最高'){
					messages.sort(function(a,b) { return parseFloat(b.InterestInFutureMoneyMonth) - parseFloat(a.InterestInFutureMoneyMonth)} );
				}
				
				if(sorter=='預計利本比最高'){
					messages.sort(function(a,b) { return parseFloat(b.InterestInFutureDivMoney) - parseFloat(a.InterestInFutureDivMoney) } );
				}
				
				var divider=2;
				pageNum=Math.ceil(messages.length/divider);
				
				if(pageNum<targetPage){
					res.redirect('/message?content='+chineseEncodeToURI('錯誤頁碼!'));
				}else{
					var starter=divider*(targetPage-1);
					var ender;
					if(targetPage==pageNum){
						ender=messages.length;
					}else{
						ender=starter+divider;
					}
					for(i=starter;i<ender;i++){
						resArrays.push(messages[i]);
					}

					res.render('lenderReceiveMessages',{userName:req.user.Username,msgKeywordDefault:msgKeyword,filterDefault:filter,sorterDefault:sorter,jsonMessage:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage,value1AllDefault:value1ALL,value2AllDefault:value2ALL,value3AllDefault:value3ALL,value4AllDefault:value4ALL,insuranceRate:library.insuranceRate});
				}
			}
		}
	});
});

router.get('/income', ensureAuthenticated, function (req, res) {
	var totalResultNumber;
	var monthRevenueNow=0;
	var monthRoiNow=0;
	var monthArray=[];
	var monthArray2=[];
	var yearRoi=0;
	var yearRevenue=0;
	var yearHistoryRoi=0;
	var yearHistoryRevenue=0;
	var moneyLendedNow=0;
	var data1={};
	var data2={};
	var data3={};
	var data4={};
	var data5={};
	var Transactions  = mongoose.model('Transactions');
	Transactions.find({$and:[{Lender:req.user._id},{Principal:{"$gte": 1}},{MonthPeriod:{"$gte": 1}}]}).populate('Return').exec( function (err, transactions, count){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			totalResultNumber=transactions.length;
			console.log(totalResultNumber);
			if(totalResultNumber<=0){
				res.render('income',{userName:req.user.Username,totalResultNum:totalResultNumber,monRevNow:monthRevenueNow,monRoiNow:monthRoiNow,yrRoi:yearRoi,yrRev:yearRevenue,yrHistoryRoi:yearHistoryRoi,yrHistoryRev:yearHistoryRevenue,mnyLendNow:moneyLendedNow,data01:data1,data02:data2,data03:data3,data04:data4,data05:data5});
			}else{
				for(i=0;i<totalResultNumber;i++){
					transactions[i].InterestRate-=library.serviceChargeRate;//scr
					moneyLendedNow+=transactions[i].Principal;
					transactions[i].tempPrincipal=transactions[i].Principal;
					transactions[i].monthPaidPrincipal=transactions[i].Principal/transactions[i].MonthPeriod;
					if(transactions[i].Return.length>0){
						transactions[i].Return.reverse();
					}
				}
				
				for(j=0;j<12;j++){
					var tempMonthRevunue=0;
					var tempMonthPrincipal=0;
					for(i=0;i<totalResultNumber;i++){
						if(transactions[i].tempPrincipal>0){
							tempMonthRevunue+=transactions[i].tempPrincipal*transactions[i].InterestRate;
							tempMonthPrincipal+=transactions[i].tempPrincipal;
							transactions[i].tempPrincipal-=transactions[i].monthPaidPrincipal;
							if(transactions[i].tempPrincipal<0){
								transactions[i].tempPrincipal=0;
							}
						}
					}
					var tempMonthRoi=0;
					if(tempMonthPrincipal>0){
						tempMonthRoi=tempMonthRevunue/tempMonthPrincipal*100;
						var tempJson={ROI: Math.round(tempMonthRoi*10000)/10000, Revenue: Math.round(tempMonthRevunue*100)/100};
						monthArray.push(tempJson);
					}
					if(j==0){
						monthRevenueNow=tempMonthRevunue.toFixed(0);
						monthRoiNow=tempMonthRoi.toFixed(4);
					}
				}
				
				for(j=0;j<12;j++){
					var tempMonthRevunue=0;
					var tempMonthPrincipal=0;
					for(i=0;i<totalResultNumber;i++){
						if(transactions[i].Return.length>0){
							tempMonthRevunue+=(transactions[i].Return[0].InterestShouldPaid-transactions[i].Return[0].InterestNotPaid);
							tempMonthPrincipal+=transactions[i].Return[0].PrincipalBeforePaid;
							transactions[i].Return.splice(0,1);
						}
					}
					var tempMonthRoi=0;
					if(tempMonthPrincipal>0){
						tempMonthRoi=tempMonthRevunue/tempMonthPrincipal*100;
						var tempJson={ROI: Math.round(tempMonthRoi*10000)/10000, Revenue: Math.round(tempMonthRevunue*100)/100};
						monthArray2.push(tempJson);
					}
				}
				
				var datasets=[];
				var dataset={
							label: "Monthly ROI",
							fillColor: "rgba(220,220,220,0.2)",
							strokeColor: "rgba(220,220,220,1)",
							pointColor: "rgba(220,220,220,1)",
							pointStrokeColor: "#fff",
							pointHighlightFill: "#fff",
							pointHighlightStroke: "rgba(220,220,220,1)",
							data: []
						};
				var datasets2=[];
				var dataset2={
							label: "Monthly Revenue",
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
							label: "Monthly ROI",
							fillColor: "rgba(220,220,220,0.2)",
							strokeColor: "rgba(220,220,220,1)",
							pointColor: "rgba(220,220,220,1)",
							pointStrokeColor: "#fff",
							pointHighlightFill: "#fff",
							pointHighlightStroke: "rgba(220,220,220,1)",
							data: []
						};
				var datasets4=[];
				var dataset4={
							label: "Monthly Revenue",
							fillColor: "rgba(151,187,205,0.2)",
							strokeColor: "rgba(151,187,205,1)",
							pointColor: "rgba(151,187,205,1)",
							pointStrokeColor: "#fff",
							pointHighlightFill: "#fff",
							pointHighlightStroke: "rgba(151,187,205,1)",
							data: []
						};
				datasets.push(dataset);
				datasets2.push(dataset2);
				datasets3.push(dataset3);
				datasets4.push(dataset4);
				data1.labels=[];
				data2.labels=[];
				data3.labels=[];
				data4.labels=[];
				data1.datasets=datasets;
				data2.datasets=datasets2;
				data3.datasets=datasets3;
				data4.datasets=datasets4;
				
				var date = new Date();
				var ctrMonth=date.getMonth()+1;
				
				for(j=0;j<monthArray.length;j++){
					yearRoi+=monthArray[j].ROI;
					yearRevenue+=monthArray[j].Revenue
					data1.labels.push(ctrMonth+'月');
					data2.labels.push(ctrMonth+'月');
					ctrMonth+=1;
					if(ctrMonth>12){
						ctrMonth=1;
					}
					data1.datasets[0].data.push(monthArray[j].ROI);
					data2.datasets[0].data.push(monthArray[j].Revenue);
				}
				if(monthArray.length>0){
					yearRoi=yearRoi/monthArray.length;
				}
				yearRoi=yearRoi.toFixed(4);
				yearRevenue=yearRevenue.toFixed(0);
				
				var ctrMonth2=date.getMonth();
				
				for(j=0;j<monthArray2.length;j++){
					yearHistoryRoi+=monthArray2[j].ROI;
					yearHistoryRevenue+=monthArray2[j].Revenue
					data3.labels.push(ctrMonth2+'月');
					data4.labels.push(ctrMonth2+'月');
					ctrMonth2-=1;
					if(ctrMonth2<1){
						ctrMonth2=12;
					}
					data3.datasets[0].data.push(monthArray2[j].ROI);
					data4.datasets[0].data.push(monthArray2[j].Revenue);
				}
				data3.labels.reverse();
				data3.datasets[0].data.reverse();
				data4.labels.reverse();
				data4.datasets[0].data.reverse();
				if(monthArray2.length>0){
					yearHistoryRoi=yearHistoryRoi/monthArray2.length;
				}
				yearHistoryRoi=yearHistoryRoi.toFixed(4);
				yearHistoryRevenue=yearHistoryRevenue.toFixed(0);
				
				var data5Array = [
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
						data5Array[0].value+=1;
					}else if((transactions[i].Level>=5)&&(transactions[i].Level<10)){
						data5Array[1].value+=1;
					}else if((transactions[i].Level>=10)&&(transactions[i].Level<15)){
						data5Array[2].value+=1;
					}else if((transactions[i].Level>=15)&&(transactions[i].Level<20)){
						data5Array[3].value+=1;
					}else if(transactions[i].Level>=20){
						data5Array[4].value+=1;
					}
				}
				
				var totalTemp=0;
				for(i=0;i<data5Array.length;i++){
					totalTemp+=data5Array[i].value;
				}

				for(i=0;i<data5Array.length;i++){
					data5Array[i].value=data5Array[i].value/totalTemp*100;
				}
				data5.array=data5Array;
				res.render('income',{userName:req.user.Username,totalResultNum:totalResultNumber,monRevNow:monthRevenueNow,monRoiNow:monthRoiNow,yrRoi:yearRoi,yrRev:yearRevenue,yrHistoryRoi:yearHistoryRoi,yrHistoryRev:yearHistoryRevenue,mnyLendNow:moneyLendedNow,data01:data1,data02:data2,data03:data3,data04:data4,data05:data5});
			}
		}
	});
});

module.exports = router;

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(null); }
	res.render('login',{userName:null,msg:'請登入'});
}

//add after ensureAuthenticated to confirm ifAdmin
function ensureAdmin(req, res, next) {
  var objID=mongoose.Types.ObjectId('5555251bb08002f0068fd00f');//管理員ID
  if(req.user._id==objID){ return next(null); }
	res.render('login',{userName:null,msg:'請以管理員身分登入'});
}

function chineseEncodeToURI(string){
	return encodeURIComponent(string);
}
