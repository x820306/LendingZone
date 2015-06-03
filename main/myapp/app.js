require( './db' );
var library=require( './routes/library.js' );
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var ccap = require('ccap');
var captcha = ccap({});
var mongoose = require( 'mongoose' );
var multer = require('multer');
var session = require('express-session')
var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy;

//database models routers
var Users= require('./routes/Users');
var Borrows= require('./routes/Borrows');
var Lends= require('./routes/Lends');
var Messages= require('./routes/Messages');
var BankAccounts= require('./routes/BankAccounts');
var Transactions= require('./routes/Transactions');
var Discussions= require('./routes/Discussions');
var Returns= require('./routes/Returns');

//pages routers
var borrower= require('./routes/borrower');
var lender= require('./routes/lender');
var signup= require('./routes/signup');

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
				return done(null, false);
			}else{
				if(!user){
					console.log('Incorrect Username.');
					return done(null, false);
				}else{
					user.comparePassword(Password, function(err, isMatch) {
						if(err){
							return done(null, false);
						}else{
							if(!isMatch){
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
					});
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

app.get('/',library.newMsgChecker, function (req, res) {
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	res.render('index',{newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst});
});

app.get('/message/:content?/:info1?/:info2?/:info3?/:info4?/:infoB?',library.newMsgChecker, function (req, res) {
	if(typeof(req.query.content) !== "undefined"){
		var temp=decodeURIComponent(req.query.content);
		var auRst=null;
		if(req.isAuthenticated()){
			auRst=req.user.Username;
		}
		var info1=parseFloat(decodeURIComponent(req.query.info1));
		var info2=parseFloat(decodeURIComponent(req.query.info2));
		var info3=parseFloat(decodeURIComponent(req.query.info3));
		var info4=parseFloat(decodeURIComponent(req.query.info4));
		var infoB=parseFloat(decodeURIComponent(req.query.infoB));
		if((typeof(req.query.info1) !== "undefined")&&(typeof(req.query.info2) !== "undefined")&&(typeof(req.query.info3) !== "undefined")&&(typeof(req.query.info4) !== "undefined")&&(typeof(req.query.infoB) === "undefined")){
			res.render('message',{newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst,content:temp,if1:info1,if2:info2,if3:info3,if4:info4,ifB:null});
		}else if((typeof(req.query.info1) === "undefined")&&(typeof(req.query.info2) === "undefined")&&(typeof(req.query.info3) === "undefined")&&(typeof(req.query.info4) === "undefined")&&(typeof(req.query.infoB) !== "undefined")){
			res.render('message',{newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst,content:temp,if1:null,if2:null,if3:null,if4:null,ifB:infoB});
		}else{
			res.render('message',{newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst, content:temp,if1:null,if2:null,if3:null,if4:null,ifB:null});
		}
	}else{
		res.redirect('/');
	}
});

app.post('/login',captchaChecker, passport.authenticate('local', { failureRedirect: '/message?content='+encodeURIComponent('帳號或密碼錯誤！')}),function (req, res) {
	var origString=req.get('referer');
	var stringArray=origString.split('/');
	var subString=stringArray[stringArray.length-1];
	var subStringArray=subString.split('?');
	var target=subStringArray[0];
	if((target=='message')||(target=='borrowCreate')||(target=='readable')||(target=='buyInsurance')||(target=='rejectToBorrowMessageInStory')||(target=='confirmToBorrowMessageInStory')||(target=='rejectToBorrowMessageInLRM')||(target=='confirmToBorrowMessageInLRM')||(target=='toLendCreate')||(target=='toLendUpdate')||(target=='destroy')||(target=='create')||(target=='update')||(target=='changeData')||(target=='changePW')){
		res.redirect('/');
	}else{
		res.redirect(req.get('referer'));
	}
});

app.get('/captcha/:captchaIdfr?', function (req, res) {
	if(typeof(req.query.captchaIdfr) !== "undefined"){
		console.log('captcha');
		var captchaIdfr=parseInt(req.query.captchaIdfr);
		
		if(captchaIdfr>0){
			var ctr = -1;
			for(i=0;i<library.captchaTextArray.length;i++){
				if(captchaIdfr==library.captchaTextArray[i].Idfr){
					ctr=i;
					break;
				}
			}
			if(ctr>-1){
				library.captchaTextArray.splice(ctr, 1);
			}
		}
		var ary = captcha.get();
		library.captchaIdfrCtr+=1;
		library.captchaTextArray.push({Idfr:library.captchaIdfrCtr,Text:ary[0]});
		
		var base64=ary[1].toString('base64');
		var base64='data:image/bmp;base64,'+base64;
		library.setCaptchaTimer();
		res.json({CaptchaIdfr:library.captchaIdfrCtr,CaptchaPic:base64,success:true});
	}else{
		res.json({success:false});
	}
});

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

app.get('/signupTest',library.newMsgChecker, function (req, res) {
   var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	
	res.render('signupTest',{newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst});
});

app.get('/test', function (req, res) {
	console.log(library.captchaTextArray);
	res.json(library.captchaTextArray);
});

//database models routers
app.use('/Users', Users);
app.use('/Borrows', Borrows);
app.use('/Lends', Lends);
app.use('/Messages', Messages);
app.use('/BankAccounts', BankAccounts);
app.use('/Transactions', Transactions);
app.use('/Discussions', Discussions);
app.use('/Returns', Returns);

//pages routers
app.use('/borrower', borrower);
app.use('/lender', lender);
app.use('/signup', signup);

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

function captchaChecker(req, res, next){
	var Idfr=parseInt(req.body.CaptchaIdfr);
	var Text=req.body.CaptchaText;
	var passFlag=false;
	if(Idfr>0){
		var ctr = -1;
		for(i=0;i<library.captchaTextArray.length;i++){
			if(Idfr==library.captchaTextArray[i].Idfr){
				ctr=i;
				if(Text==library.captchaTextArray[i].Text){
					passFlag=true;
				}
				break;
			}
		}
		if(ctr>-1){
			library.captchaTextArray.splice(ctr, 1);
		}
	}
	
	if(passFlag){
		return next();
	}else{
		res.redirect('/message?content='+encodeURIComponent('驗證碼錯誤！'));
	}
}

module.exports = app;