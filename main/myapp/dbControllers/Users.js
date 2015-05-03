var mongoose = require('mongoose');
var Users  = mongoose.model('Users');
var sanitizer = require('sanitizer');

var express = require('express');
var router = express.Router();

router.post('/create', function(req, res, next) {
	var toCreate = new Users(req.body);
	toCreate.Account=sanitizer.sanitize(req.body.Account);
	toCreate.Password=sanitizer.sanitize(req.body.Password);
	
	toCreate.save(function (err,newCreate) {
		if (err){
			console.log(err);
			res.json({error: err.name}, 500);
		}else{
			res.json(newCreate);
		}
	});
});

router.get('/find/:id?', function(req, res, next) {
	Users.findById(req.query.id).exec(function (err, user){
		if (err) {
			console.log(err);
			res.json({error: err.name}, 500);
		}else{
			res.json(user);
		}
	})
});

module.exports = router;
