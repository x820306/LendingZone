var library=require( './library.js' );
var mongoose = require('mongoose');

var express = require('express');
var router = express.Router();

// U can try this by /borrower
router.get('/', function (req, res) {
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	
	//get data from database and process them here
	
	//pass what u get from database and send them into ejs in this line
	res.render('ejsExample',{userName:auRst});
});

// this is the basic type when page no need to ensure authenticated. U can try this by /borrower/borrowerExample
router.get('/borrowerExample', function (req, res) {
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	
	//get data from database and process them here
	
	//pass what u get from database and send them into ejs in this line
	res.render('ejsExample',{userName:auRst});
});

// this is the basic type when page need to ensure authenticated. U can try this by /borrower/borrowerExample2
router.get('/borrowerExample2',ensureAuthenticated, function (req, res) {
	//get data from database and process them here
	
	//pass what u get from database and send them into ejs in this line
	res.render('ejsExample',{userName:req.user.Username});
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
