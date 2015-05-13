require( './db' );
var library=require( './routes/library.js' );
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var mongoose = require( 'mongoose' );
var multer = require('multer');
var session = require('express-session')
var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy;

var Users= require('./routes/Users');
var Borrows= require('./routes/Borrows');
var Lends= require('./routes/Lends');
var Messages= require('./routes/Messages');
var BankAccounts= require('./routes/BankAccounts');
var Transactions= require('./routes/Transactions');
var Discussions= require('./routes/Discussions');
var Returns= require('./routes/Returns');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({ secret: 'lendingZone',
				  name: 'cookie_name',
				  resave: true,
				  saveUninitialized: true}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));
app.use(multer({
    dest: "./temp/",
	inMemory: true
}));

passport.use('local', new LocalStrategy({
		usernameField: 'Username',
		passwordField: 'Password'
	},
    function (Username, Password, done){
        var Users  = mongoose.model('Users');
		Users.findOne({"Username": Username}).exec(function (err, user){
			if (err) {
				console.log(err);
				res.json({error: err.name}, 500);
			}else{
				if(!user){
					console.log('Incorrect Username.');
					return done(null, false);
				}else{
					if(user.Password!=Password){
						console.log('Incorrect Password.');
						return done(null, false);
					}else{
						console.log('Login Success.');
						var smaller_user={
							_id: user._id,
							Username: user.Username,
							Name: user.Name,
							Gender: user.Gender,
							BirthDay: user.BirthDay,
							Phone: user.Phone,
							Address: user.Address,
							Level: user.Level,
							Created: user.Created
						}
						return done(null, smaller_user);
					}
				}
			}
		});
    }
));

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});



app.get('/', function (req, res) {
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	
	res.render('index',{userName:auRst});
});

app.get('/message/:content?', function (req, res) {
	var temp=decodeURIComponent(req.query.content);
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	
	res.render('message',{userName:auRst, content:temp});
});

app.get('/search/:keyword?/:action?/:page?', function (req, res) {
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
		actionRec="-Updated";
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
			lboundRec=parseFloat(lbound)/100;
			uboundRec=parseFloat(ubound)/100;
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
	console.log(andFindCmdAry);
	var Borrows  = mongoose.model('Borrows');
	Borrows.find({$or:[{"StoryTitle": new RegExp(keyword,'i')},{"Story": new RegExp(keyword,'i')}],$and:andFindCmdAry}).populate('CreatedBy', 'Username').sort(actionRec).exec( function (err, borrows, count){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			totalResultNumber=borrows.length;
			if(totalResultNumber==0){
				if(targetPage>1){
					res.redirect('/message?content='+chineseEncodeToURI('錯誤頁碼!'));
				}else{
					res.render('search',{userName:auRst,keywordDefault:keyword,actionDefault:action,categoryDefault:category,filterDefault:filter,lboundDefault:lbound,uboundDefault:ubound,jsonArray:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage});
				}
			}else{
				var divider=2;
				pageNum=Math.ceil(borrows.length/divider);
				
				if(pageNum<targetPage){
					res.redirect('/message?content='+chineseEncodeToURI('錯誤頁碼!'));
				}else{
					var starter=divider*(targetPage-1);
					var ender;
					if(targetPage==pageNum){
						ender=borrows.length;
					}else{
						ender=starter+divider;
					}
					for(i=starter;i<ender;i++){
						resArrays.push(borrows[i]);
					}
					res.render('search',{userName:auRst,keywordDefault:keyword,actionDefault:action,categoryDefault:category,filterDefault:filter,lboundDefault:lbound,uboundDefault:ubound,jsonArray:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage});
				}
			}
		}
	});
});

app.get('/story/:id?', function (req, res) {
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	
	var Borrows  = mongoose.model('Borrows');
	var Discussions  = mongoose.model('Discussions');
	var Messages  = mongoose.model('Messages');
	var BankAccounts  = mongoose.model('BankAccounts');
	var Transactions  = mongoose.model('Transactions');
	Borrows.findById(req.query.id).populate('CreatedBy', 'Username').exec(function (err, borrow){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			if(!borrow){
				res.redirect('/message?content='+chineseEncodeToURI('錯誤ID!'));
			}else{
				Discussions.find({"BelongTo": req.query.id}).populate('CreatedBy', 'Username').exec(function (err, discussions){
					if (err) {
						console.log(err);
						res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
					}else{
						var ifSelfValue=false;
						var ifLikedValue=false;
						if(!auRst){
							res.render('story',{userName:auRst,ifSelf:ifSelfValue,ifLiked:ifLikedValue,json:borrow,jsonComment:discussions,jsonMessage:null,jsonBorrowMessage:null,MoneyInBankAccountValue:0,MoneyLended:0});
						}else{
							if(req.user._id==borrow.CreatedBy._id){
								ifSelfValue=true;
								res.render('story',{userName:auRst,ifSelf:ifSelfValue,ifLiked:ifLikedValue,json:borrow,jsonComment:discussions,jsonMessage:null,jsonBorrowMessage:null,MoneyInBankAccountValue:0,MoneyLended:0});
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
																		borrowMessage.InterestInFuture=library.interestInFutureCalculator(borrowMessage.MoneyToLend,borrowMessage.InterestRate,borrowMessage.MonthPeriod);
																		borrowMessage.InterestInFutureDivMoney=borrowMessage.InterestInFuture/borrowMessage.MoneyToLend*100;
																		borrowMessage.InterestInFutureMonth=borrowMessage.InterestInFuture/borrowMessage.MonthPeriod;
																		borrowMessage.InterestInFutureMoneyMonth=(borrowMessage.InterestInFuture+borrowMessage.MoneyToLend)/borrowMessage.MonthPeriod;
																	}
																	res.render('story',{userName:auRst,ifSelf:ifSelfValue,ifLiked:ifLikedValue,json:borrow,jsonComment:discussions,jsonMessage:message,jsonBorrowMessage:borrowMessage,MoneyInBankAccountValue:bankaccount.MoneyInBankAccount,MoneyLended:moneyLendedCumulated});
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

app.get('/lend', ensureAuthenticated, function (req, res) {
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
								res.render('lend',{userName:req.user.Username,MoneyInBankAccountValue:bankaccount.MoneyInBankAccount,MoneyLended:moneyLendedCumulated,jsonLend:lend});
							}
						});
					}
				});
			}
		}
	});
});

app.get('/lenderTransactionRecord/:sorter?/:page?', ensureAuthenticated, function (req, res) {
	var resArrays=[];
	var sorter=decodeURIComponent(req.query.sorter);
	var targetPage=parseInt(req.query.page);
	var pageNum=0
	var totalResultNumber;
	
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
	}
	
	var Transactions  = mongoose.model('Transactions');
	Transactions.find({"Lender": req.user._id}).populate('Borrower', 'Username').sort(sorterRec).exec( function (err, transactions, count){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			totalResultNumber=transactions.length;
			if(totalResultNumber==0){
				if(targetPage>1){
					res.redirect('/message?content='+chineseEncodeToURI('錯誤頁碼!'));
				}else{
					res.render('lenderTransactionRecord',{userName:req.user.Username,sorterDefault:sorter,jsonTransaction:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage});
				}
			}else{
				for(i=0;i<totalResultNumber;i++){
					transactions[i].InterestInFuture=library.interestInFutureCalculator(transactions[i].Principal,transactions[i].InterestRate,transactions[i].MonthPeriod);
					transactions[i].InterestInFutureDivMoney=transactions[i].InterestInFuture/transactions[i].Principal*100;
					transactions[i].InterestInFutureMonth=transactions[i].InterestInFuture/transactions[i].MonthPeriod;
					transactions[i].InterestInFutureMoneyMonth=(transactions[i].InterestInFuture+transactions[i].Principal)/transactions[i].MonthPeriod;
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
					res.render('lenderTransactionRecord',{userName:req.user.Username,sorterDefault:sorter,jsonTransaction:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage});
				}
			}
		}
	});
});

app.get('/lenderReturnRecord/:id?/:sorter?/:page?', ensureAuthenticated, function (req, res) {
	var resArrays=[];
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
	var tempJson={Lender:req.user._id};
	andFindCmdAry.push(tempJson);
	if(id!=''){
		tempJson={ToTransaction:id};
		andFindCmdAry.push(tempJson);
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
					res.render('lenderReturnRecord',{userName:req.user.Username,idDefault:id,sorterDefault:sorter,jsonReturns:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage});
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
					res.render('lenderReturnRecord',{userName:req.user.Username,idDefault:id,sorterDefault:sorter,jsonReturns:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage});
				}
			}
		}
	});
});

app.get('/lendsList/:sorter?/:page?', ensureAuthenticated, function (req, res) {
	var resArrays=[];
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
	}
	
	var Lends  = mongoose.model('Lends');
	Lends.find().populate('CreatedBy', 'Username').sort(sorterRec).exec( function (err, lends, count){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			totalResultNumber=lends.length;
			if(totalResultNumber==0){
				if(targetPage>1){
					res.redirect('/message?content='+chineseEncodeToURI('錯誤頁碼!'));
				}else{
					res.render('lendsList',{userName:req.user.Username,sorterDefault:sorter,jsonLends:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage});
				}
			}else{
				var divider=2;
				pageNum=Math.ceil(lends.length/divider);
				
				if(pageNum<targetPage){
					res.redirect('/message?content='+chineseEncodeToURI('錯誤頁碼!'));
				}else{
					var starter=divider*(targetPage-1);
					var ender;
					if(targetPage==pageNum){
						ender=lends.length;
					}else{
						ender=starter+divider;
					}
					for(i=starter;i<ender;i++){
						resArrays.push(lends[i]);
					}
					res.render('lendsList',{userName:req.user.Username,sorterDefault:sorter,jsonLends:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage});
				}
			}
		}
	});
});

app.get('/lenderSendMessages/:msgKeyword?/:filter?/:sorter?/:page?', ensureAuthenticated, function (req, res) {
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
	
	var Messages  = mongoose.model('Messages');
	var Transactions  = mongoose.model('Transactions');
	Messages.find({$and:[{"CreatedBy": req.user._id},{"Type": "toLend"},{"Status": filterRec},{"Message": new RegExp(msgKeyword,'i')}]}).populate('SendTo', 'Username').populate('FromBorrowRequest', 'StoryTitle Story').populate('Transaction').sort(sorterRec).exec( function (err, messages, count){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			totalResultNumber=messages.length;
			if(totalResultNumber==0){
				if(targetPage>1){
					res.redirect('/message?content='+chineseEncodeToURI('錯誤頁碼!'));
				}else{
					res.render('lenderSendMessages',{userName:req.user.Username,msgKeywordDefault:msgKeyword,filterDefault:filter,sorterDefault:sorter,jsonMessage:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage});
				}
			}else{
				for(i=0;i<totalResultNumber;i++){
					messages[i].InterestInFuture=library.interestInFutureCalculator(messages[i].MoneyToLend,messages[i].InterestRate,messages[i].MonthPeriod);
					messages[i].InterestInFutureDivMoney=messages[i].InterestInFuture/messages[i].MoneyToLend*100;
					messages[i].InterestInFutureMonth=messages[i].InterestInFuture/messages[i].MonthPeriod;
					messages[i].InterestInFutureMoneyMonth=(messages[i].InterestInFuture+messages[i].MoneyToLend)/messages[i].MonthPeriod;
					if(messages[i].Transaction.length>0){
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

					res.render('lenderSendMessages',{userName:req.user.Username,msgKeywordDefault:msgKeyword,filterDefault:filter,sorterDefault:sorter,jsonMessage:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage});
				}
			}
		}
	});
});

app.get('/lenderReceiveMessages/:msgKeyword?/:filter?/:sorter?/:page?', ensureAuthenticated, function (req, res) {
	var resArrays=[];
	var msgKeyword=decodeURIComponent(req.query.msgKeyword);
	var filter=decodeURIComponent(req.query.filter);
	var sorter=decodeURIComponent(req.query.sorter);
	var targetPage=parseInt(req.query.page);
	var pageNum=0
	var totalResultNumber;
	
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
	
	var Messages  = mongoose.model('Messages');
	var Transactions  = mongoose.model('Transactions');
	Messages.find({$and:[{"SendTo": req.user._id},{"Type": "toBorrow"},{"Status": filterRec},{"Message": new RegExp(msgKeyword,'i')}]}).populate('CreatedBy', 'Username').populate('FromBorrowRequest', 'StoryTitle Story').populate('Transaction').sort(sorterRec).exec( function (err, messages, count){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			totalResultNumber=messages.length;
			if(totalResultNumber==0){
				if(targetPage>1){
					res.redirect('/message?content='+chineseEncodeToURI('錯誤頁碼!'));
				}else{
					res.render('lenderReceiveMessages',{userName:req.user.Username,msgKeywordDefault:msgKeyword,filterDefault:filter,sorterDefault:sorter,jsonMessage:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage});
				}
			}else{
				for(i=0;i<totalResultNumber;i++){
					messages[i].InterestInFuture=library.interestInFutureCalculator(messages[i].MoneyToLend,messages[i].InterestRate,messages[i].MonthPeriod);
					messages[i].InterestInFutureDivMoney=messages[i].InterestInFuture/messages[i].MoneyToLend*100;
					messages[i].InterestInFutureMonth=messages[i].InterestInFuture/messages[i].MonthPeriod;
					messages[i].InterestInFutureMoneyMonth=(messages[i].InterestInFuture+messages[i].MoneyToLend)/messages[i].MonthPeriod;
					if(messages[i].Transaction.length>0){
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

					res.render('lenderReceiveMessages',{userName:req.user.Username,msgKeywordDefault:msgKeyword,filterDefault:filter,sorterDefault:sorter,jsonMessage:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage});
				}
			}
		}
	});
});

app.get('/income', ensureAuthenticated, function (req, res) {
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
						var tempJson={ROI: tempMonthRoi, Revenue: tempMonthRevunue};
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
						var tempJson={ROI: tempMonthRoi, Revenue: tempMonthRevunue};
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
				yearRoi=yearRoi/monthArray.length;
				yearRoi=yearRoi.toFixed(4);
				yearRevenue=yearRevenue.toFixed(0);
				
				//monthArray2.reverse();
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
				yearHistoryRoi=yearHistoryRoi/monthArray2.length;
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

app.get('/profile', ensureAuthenticated, function (req, res) {
	res.render('profile',{userName:req.user.Username});
});

app.get('/test', ensureAuthenticated, function (req, res) {
	console.log(library.autoComfirmToBorrowMsgArray);
	res.end('aaa');
});

app.post('/login', passport.authenticate('local', { failureRedirect: '/message?content='+chineseEncodeToURI('登入失敗')}),function (req, res) {
	/*console.log(req.body.Account);
    console.log(req.body.Password);
	if(req.body.remember){
		console.log('yes');
	}else{
		console.log('no');
	}*/
	res.redirect(req.get('referer'));
	//res.redirect('/');
});

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

app.get('/signup', function (req, res) {
   var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	
	res.render('signup',{userName:auRst});
});

app.use('/Users', Users);
app.use('/Borrows', Borrows);
app.use('/Lends', Lends);
app.use('/Messages', Messages);
app.use('/BankAccounts', BankAccounts);
app.use('/Transactions', Transactions);
app.use('/Discussions', Discussions);
app.use('/Returns', Returns);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(null); }
	res.redirect('/message?content='+chineseEncodeToURI('請登入'));
}

function ensureAdmin(req, res, next) {
  var admimID="admimID";
  
  if(req.user._id==admimID){ return next(null); }
	res.redirect('/message?content='+chineseEncodeToURI('請以管理員身分登入'));
}

function chineseEncodeToURI(string){
	return encodeURIComponent(string);
}