require( './db' );

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
	var keyword=decodeURIComponent(req.query.keyword);
	var targetPage=parseInt(req.query.page);
	var pageNum=0
	var totalResultNumber;
	
	var actionRec;
	
	if(action=='最新'){
		actionRec="-Updated";
	}else if(action=='最緊急'){
		actionRec="TimeLimit";
	}else if(action=='最熱門'){
		actionRec="-LikeNumber";
	}
	
	var Borrows  = mongoose.model('Borrows');
	var Users  = mongoose.model('Users');
	Borrows.find({$or:[{"StoryTitle": new RegExp(keyword,'i')},{"Story": new RegExp(keyword,'i')}],$and:[{"StoryTitle": {'$ne': '' }},{"Story": {'$ne': '' }},{"IfReadable": true}]}).populate('CreatedBy', 'Username').sort(actionRec).exec( function (err, borrows, count){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤!'));
		}else{
			totalResultNumber=borrows.length;
			if(totalResultNumber==0){
				res.render('search',{userName:auRst,keywordDefault:keyword,actionDefault:action,jsonArray:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage});
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
					res.render('search',{userName:auRst,keywordDefault:keyword,actionDefault:action,jsonArray:resArrays,totalResultNum:totalResultNumber,pageNumber:pageNum,targetPageNumber:targetPage});
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
	Borrows.findById(req.query.id).populate('CreatedBy', 'Username Level').exec(function (err, borrow){
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
							res.render('story',{userName:auRst,ifSelf:ifSelfValue,ifLiked:ifLikedValue,json:borrow,jsonComment:discussions,jsonMessage:null,MoneyInBankAccountValue:0,MoneyLended:0});
						}else{
							if(req.user._id==borrow.CreatedBy._id){
								ifSelfValue=true;
								res.render('story',{userName:auRst,ifSelf:ifSelfValue,ifLiked:ifLikedValue,json:borrow,jsonComment:discussions,jsonMessage:null,MoneyInBankAccountValue:0,MoneyLended:0});
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
															res.render('story',{userName:auRst,ifSelf:ifSelfValue,ifLiked:ifLikedValue,json:borrow,jsonComment:discussions,jsonMessage:message,MoneyInBankAccountValue:bankaccount.MoneyInBankAccount,MoneyLended:moneyLendedCumulated});
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

app.get('/income', ensureAuthenticated, function (req, res) {
	res.render('income',{userName:req.user.Username});
});

app.get('/lenderSendMessages', ensureAuthenticated, function (req, res) {
	res.render('lenderSendMessages',{userName:req.user.Username});
});

app.get('/lenderReceiveMessages', ensureAuthenticated, function (req, res) {
	res.render('lenderReceiveMessages',{userName:req.user.Username});
});

app.get('/profile', ensureAuthenticated, function (req, res) {
	res.render('profile',{userName:req.user.Username});
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