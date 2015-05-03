var express = require('express');
var router = express.Router();

/* GET home page. */
router.post('/', function(req, res, next) {
    console.log(req.body.account);
    console.log(req.body.password);
	if(req.body.remember){
		console.log('yes');
	}else{
		console.log('no');
	}
	res.render('index');
});

module.exports = router;
