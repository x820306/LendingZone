require( './db' );
var library=require( './routes/library.js' );
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var flash = require('connect-flash');

var ccap = require('ccap');
var captcha = ccap({});
var mongoose = require( 'mongoose' );
var multer = require('multer');
var session = require('express-session')
var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy;
var totp = require('notp').totp;
var base32 = require('thirty-two');
var sanitizer = require('sanitizer');
var MongoStore = require('connect-mongo')(session);

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

var UsersModel  = mongoose.model('Users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.enable('trust proxy');

// uncomment after placing your favicon in /public
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser('lendingZone'));
app.use(session({ secret: 'lendingZone',
				  name: 'cookie_name',
				  resave: true,
				  saveUninitialized: true,
				  store: new MongoStore({ mongooseConnection: mongoose.connection }),
				  cookie:{maxAge:259200000}
				}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));
app.use(multer({
    dest: "./tmp/",
	limits: {
		fileSize: 4194304
	},
	onFileUploadStart: function (file, req, res) {
		library.tmpFilePathArray.push({Path:file.path,SaveT:Date.now()});
	}
}));

passport.use('local', new LocalStrategy({
		usernameField: 'Username',
		passwordField: 'Password'
	},
    function (Username, Password, done){
		UsersModel.findOne({Usnl: Username.toLowerCase()}).select('Username Password keyObj').exec(function (err, user){
			if (err) {
				console.log(err);
				return done(null, false, { errorTarget:1, errorMessage: '資料庫錯誤!' });
			}else{
				if(!user){
					console.log('Incorrect Username.');
					return done(null, false, { errorTarget:1, errorMessage: '帳號錯誤!' });
				}else{
					user.comparePassword(Password, function(err, isMatch) {
						if(err){
							return done(null, false, { errorTarget:1, errorMessage: '資料庫錯誤!' });
						}else{
							if(!isMatch){
								console.log('Incorrect Password.');
								return done(null, false, { errorTarget:2, errorMessage: '密碼錯誤!' });
							}else{
								console.log('Login Success.');
								var smaller_user={
									_id: user._id,
									keyFlag: user.keyObj.flag
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
    done(null, user._id);
});

passport.deserializeUser(function (_id, done) {
	UsersModel.findById(_id).select('Username Name Gender BirthDay Phone Address Email IdCardNumber ifMailValid	Level OrignalLevel Created Updated keyObj').exec(function(err, user) {
		done(err, user);
	});
});

app.get('/protocol', function (req, res) {
    res.send(req.protocol);
});

app.get('/',library.loginFormChecker,library.newMsgChecker,library.usrNameGenerator, function (req, res) {
	res.render('index',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.auRst});
});

app.get('/message/:content?',library.loginFormChecker,library.newMsgChecker,library.usrNameGenerator, function (req, res) {
	if(typeof(req.query.content) === 'string'){
		var temp=decodeURIComponent(req.query.content);
		res.render('message',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.auRst, content:temp});
	
	}else{
		res.redirect('/');
	}
});

app.post('/login',captchaChecker, function(req, res, next) {
  if((typeof(req.body.Username) === 'string')&&(typeof(req.body.Password) === 'string')){
		req.body.Username=sanitizer.sanitize(req.body.Username.trim());
		req.body.Password=sanitizer.sanitize(req.body.Password.trim());
		passport.authenticate('local', function(err, user, info) {
			if(err){ 
				cosole.log(err);
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}else{
				if(!user){ 
					redirector(req,res,info.errorTarget,info.errorMessage);
				}else{
					req.logIn(user, function(err) {
						if(err){ 
							cosole.log(err);
							res.redirect('/message?content='+encodeURIComponent('錯誤!'));
						}else{
							if((user.keyFlag===true)&&(req.session.passport.secondFactor !== 'totp')){
								var path=library.pathProcesser(req,true);
								res.redirect('/totp_login?path='+path);
							}else{
								var targetPath=library.refererChecker(req);
								if(!library.routeChecker(targetPath)){
									targetPath='/';
								}
								res.redirect(targetPath);
							}
						}
					});
				}
			}
		})(req, res, next);
	}else{
		if((typeof(req.body.Username) !== 'string')){
			redirector(req,res,1,'未送出!');
		}else if((typeof(req.body.Password) !== 'string')){
			redirector(req,res,2,'未送出!');
		}
	}
});

app.get('/totp_login/:path?',library.loginFormChecker,library.newMsgChecker,library.totpDefender,function(req, res) {
	if(typeof(req.query.path) === 'string'){
		req.query.path=base32.decode(decodeURIComponent(req.query.path)).toString();

		var totpCodeArray=req.flash('totpCode');
		var totpCodeContent='';
		if(totpCodeArray.length>0){
			totpCodeContent=totpCodeArray[0];
		}
		
		var targetPath=req.query.path;
		if(!library.routeChecker(targetPath)){
			targetPath='/';
		}
		res.render('totp_login',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:null,tgtPath:targetPath,totpCodeCnt:totpCodeContent});
	}else{
		res.redirect('/');
	}
});

app.post('/totp_login',library.totpDefender,function(req, res) {
	if((typeof(req.body.Code) === 'string')&&(typeof(req.body.TargetPath) === 'string')){
		req.body.Code=sanitizer.sanitize(req.body.Code.trim());
		req.body.TargetPath=sanitizer.sanitize(req.body.TargetPath.trim()).replace(/&amp;/ig,'&');
		var rv = totp.verify(req.body.Code, req.user.keyObj.key, { window: 6, time: req.user.keyObj.period });
		if(rv){
			req.session.passport.secondFactor = 'totp';
			res.redirect(req.body.TargetPath);
		}else{
			req.flash('totpCode','驗證碼錯誤!');
			res.redirect(library.refererChecker(req));
		}
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});


app.get('/captcha/:captchaIdfr?', function (req, res) {
	if(typeof(req.query.captchaIdfr) === 'string'){
		var captchaIdfr=parseInt(req.query.captchaIdfr);
		
		if(captchaIdfr>0){
			var ctr = -1;
			for(i=0;i<library.captchaTextArray.length;i++){
				if(captchaIdfr===library.captchaTextArray[i].Idfr){
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
		var tempIdfr=library.captchaIdfrCtr;
		library.captchaTextArray.push({Idfr:tempIdfr,Text:ary[0],SaveT:Date.now()});
		
		var base64=ary[1].toString('base64');
		var base64='data:image/bmp;base64,'+base64;
		res.json({CaptchaIdfr:library.captchaIdfrCtr,CaptchaPic:base64,success:true});
	}else{
		res.json({success:false});
	}
});

app.get('/logout', function (req, res) {
    if(req.session.passport.hasOwnProperty('secondFactor')){
		delete req.session.passport.secondFactor;
	}
	req.logout();
    res.redirect('/');
});

app.get('/signupTest',library.loginFormChecker,library.newMsgChecker,library.usrNameGenerator, function (req, res) {
	res.render('signupTest',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.auRst});
});

app.get('/forgetActOrPW',library.loginFormChecker,library.newMsgChecker,library.usrNameGenerator, function (req, res) {
	res.render('forgetActOrPW',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.auRst});
});


app.get('/autoPage',library.loginFormChecker,library.ensureAuthenticated,library.newMsgChecker,library.ensureAdmin, function (req, res) {
    var ifEnable=false;
	if(library.autoConfirmArray.length>0){
		ifEnable=true;
	}
	var ifEnable2=false;
	if(library.autoNotReadableArray.length>0){
		ifEnable2=true;
	}
	var msgArray=req.flash('autoFlash');
	var message=null;
	if(msgArray.length>0){
		message=msgArray[0];
	}
	res.render('autoPage',{lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,ifE:ifEnable,ifE2:ifEnable2,msg:message});
});

app.post('/autoConfirmPost',library.loginFormChecker,library.ensureAuthenticated,library.newMsgChecker,library.ensureAdmin, function (req, res) {
	if(library.autoConfirmArray.length===0){
		var eid1=setInterval(function(){
			library.autoWorker(1,req,res);
		},86400000);
		library.autoConfirmArray.push(eid1);
		var eid2=setInterval(function(){
			library.autoWorker(2,req,res);
		},86400000*2);
		library.autoConfirmArray.push(eid2);
		var eid3=setInterval(function(){
			library.autoWorker(3,req,res);
		},86400000*3);
		library.autoConfirmArray.push(eid3);
		req.flash('autoFlash','已啟動自動同意!');
		res.redirect('/autoPage');
	}else{
		res.redirect('/autoPage');
	}
});

app.post('/disableAutoConfirmPost',library.loginFormChecker,library.ensureAuthenticated,library.newMsgChecker,library.ensureAdmin, function (req, res) {
	if(library.autoConfirmArray.length>0){
		for(i=0;i<library.autoConfirmArray.length;i++){
			clearInterval(library.autoConfirmArray[i]);
		}
		library.autoConfirmArray=[];
		req.flash('autoFlash','已關閉自動同意!');
		res.redirect('/autoPage');
	}else{
		res.redirect('/autoPage');
	}
});

app.post('/autoNotReadablePost',library.loginFormChecker,library.ensureAuthenticated,library.newMsgChecker,library.ensureAdmin, function (req, res) {
	if(library.autoNotReadableArray.length===0){
		var eid=setInterval(function(){
			library.autoNotReadableWorker(req,res);
		},86400000);
		library.autoNotReadableArray.push(eid);
		
		req.flash('autoFlash','已啟動自動封存!');
		res.redirect('/autoPage');
	}else{
		res.redirect('/autoPage');
	}
});

app.post('/disableAutoNotReadablePost',library.loginFormChecker,library.ensureAuthenticated,library.newMsgChecker,library.ensureAdmin, function (req, res) {
	if(library.autoNotReadableArray.length>0){
		for(i=0;i<library.autoNotReadableArray.length;i++){
			clearInterval(library.autoNotReadableArray[i]);
		}
		library.autoNotReadableArray=[];
		req.flash('autoFlash','已關閉自動封存!');
		res.redirect('/autoPage');
	}else{
		res.redirect('/autoPage');
	}
});

app.get('/test', function (req, res) {
	console.log(library.captchaTextArray);
	res.json(library.captchaTextArray);
});

app.get('/test2', function (req, res) {
	console.log(library.formIdfrArray);
	res.json(library.formIdfrArray);
});

app.get('/test3', function (req, res) {
	console.log(library.tmpFilePathArray);
	res.json(library.tmpFilePathArray);
});

app.get('/test4', function (req, res) {
	console.log(library.autoConfirmArray);
	res.json(library.autoConfirmArray);
});

app.get('/test5', function (req, res) {
	console.log(library.autoNotReadableArray);
	res.json(library.autoNotReadableArray);
});

app.get('/test6', function (req, res) {
	console.log(req.session.passport);
	res.json(req.session.passport);
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
	if((typeof(req.body.CaptchaIdfr)  === 'string')&&(typeof(req.body.CaptchaText)  === 'string')){
		req.body.CaptchaIdfr=sanitizer.sanitize(req.body.CaptchaIdfr.trim());
		req.body.CaptchaText=sanitizer.sanitize(req.body.CaptchaText.trim());
		var Idfr=parseInt(req.body.CaptchaIdfr);
		var Text=req.body.CaptchaText;
		var passFlag=false;
		if(Idfr>0){
			var ctr = -1;
			for(i=0;i<library.captchaTextArray.length;i++){
				if(Idfr===library.captchaTextArray[i].Idfr){
					ctr=i;
					if(Text===library.captchaTextArray[i].Text){
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
			redirector(req,res,3,'錯誤或過期!');
		}
	}else{
		redirector(req,res,3,'未送出!');
	}
}

function redirector(req,res,target,message){
	var formContent={
		F1:req.body.Username,
		F2:req.body.Password,
		F3:req.body.CaptchaText,
	};
	
	var json={FormContent:formContent,Target:target,Message:message};
	var string=JSON.stringify(json);
	req.flash('loginForm',string);
	var targetPath=library.refererChecker(req);
	if(!library.routeChecker(targetPath)){
		targetPath='/';
	}
	res.redirect(targetPath);
}

module.exports = app;