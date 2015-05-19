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

app.get('/',library.newMsgChecker, function (req, res) {
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	res.render('index',{newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst});
});

app.get('/message/:content?',library.newMsgChecker, function (req, res) {
	var temp=decodeURIComponent(req.query.content);
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	
	res.render('message',{newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst, content:temp});
});

app.get('/profile', library.ensureAuthenticated,library.newMsgChecker, function (req, res) {
	res.render('profile',{newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username});
});

app.post('/login', passport.authenticate('local', { failureRedirect: '/message?content='+encodeURIComponent('登入失敗')}),function (req, res) {
	res.redirect(req.get('referer'));
	//res.redirect('/');
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
	console.log(library.autoComfirmToBorrowMsgArray);
	res.json(library.autoComfirmToBorrowMsgArray);
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

module.exports = app;