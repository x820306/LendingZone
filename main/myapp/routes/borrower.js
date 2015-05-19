var library=require( './library.js' );
var mongoose = require('mongoose');

var express = require('express');
var router = express.Router();

// U can try this by /borrower
router.get('/',library.newMsgChecker, function (req, res) {
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	
	//get data from database and process them here
	
	//pass what u get from database and send them into ejs in this line
	res.render('ejsExample',{newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst});
});

// this is the basic type when page no need to ensure authenticated. U can try this by /borrower/borrowerExample
router.get('/borrowerExample',library.newMsgChecker, function (req, res) {
	var auRst=null;
	if(req.isAuthenticated()){
		auRst=req.user.Username;
	}
	
	//get data from database and process them here
	
	//pass what u get from database and send them into ejs in this line
	res.render('ejsExample',{newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:auRst});
});

// this is the basic type when page need to ensure authenticated. U can try this by /borrower/borrowerExample2
router.get('/borrowerExample2',library.ensureAuthenticated,library.newMsgChecker, function (req, res) {
	//get data from database and process them here
	
	//pass what u get from database and send them into ejs in this line
	res.render('ejsExample',{newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username});
});

module.exports = router;
