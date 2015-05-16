var library=require( './library.js' );
var mongoose = require('mongoose');

var express = require('express');
var router = express.Router();

router.get('/', function (req, res) {
	res.end("end");
});

module.exports = router;

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(null); }
	res.redirect('/message?content='+chineseEncodeToURI('請登入'));
}

function ensureAdmin(req, res, next) {
  var objID=mongoose.Types.ObjectId('5555251bb08002f0068fd00f');//管理員ID
  if(req.user._id==objID){ return next(null); }
	res.redirect('/message?content='+chineseEncodeToURI('請以管理員身分登入'));
}

function chineseEncodeToURI(string){
	return encodeURIComponent(string);
}
