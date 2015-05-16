var mongoose = require('mongoose');
var Example = mongoose.model('Example');//just a pseudo model
var sanitizer = require('sanitizer');

var express = require('express');
var router = express.Router();

router.post('/create',ensureAuthenticated,function(req, res){
	var toCreate = new Example();
	toCreate.FieldA = sanitizer.sanitize(req.body.FieldA);
	toCreate.FieldB = sanitizer.sanitize(req.body.FieldB);
	toCreate.FieldC = sanitizer.sanitize(req.body.FieldC);
	toCreate.CreatedBy = req.user._id;

	toCreate.save(function (err, exampleCreated){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤'));
		}else{
			//replace this line by next page after create success
			res.redirect('/');
		}
	});
});

router.post('/update',ensureAuthenticated,function(req, res){
	Example.findById(sanitizer.sanitize(req.body.id)).exec(function (err, example){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤'));
		}else{
			if(!example){
				res.redirect('/message?content='+chineseEncodeToURI('錯誤'));
			}else{
				if(req.user._id!=example.CreatedBy){
					res.redirect('/message?content='+chineseEncodeToURI('認證錯誤'));
				}else{
					example.FieldA = sanitizer.sanitize(req.body.FieldA);
					example.FieldB = sanitizer.sanitize(req.body.FieldB);
					example.FieldC = sanitizer.sanitize(req.body.FieldC);
					example.Updated = Date.now();

					example.save(function (err, exampleUpdated){
						if (err) {
							console.log(err);
							res.redirect('/message?content='+chineseEncodeToURI('錯誤'));
						}else{
							//replace this line by next page after update success
							res.redirect('/');
						}
					});
				}
			}
		}
	});
});

router.post('/delete',ensureAuthenticated,function(req, res){
	Example.findById(sanitizer.sanitize(req.body.id)).exec(function (err, example){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤'));
		}else{
			if(!example){
				res.redirect('/message?content='+chineseEncodeToURI('錯誤'));
			}else{
				if(req.user._id!=example.CreatedBy){
					res.redirect('/message?content='+chineseEncodeToURI('認證錯誤'));
				}else{
					example.remove(function (err, exampleRemoved){
						if (err) {
							console.log(err);
							res.redirect('/message?content='+chineseEncodeToURI('錯誤'));
						}else{
							//replace this line by next page after remove success
							res.redirect('/');
						}
					});
				}
			}
		}
	});
});

//post version
router.post('/find',function(req, res){
	Example.findById(sanitizer.sanitize(req.body.id)).exec(function (err, example){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤'));
		}else{
			if(!example){
				res.redirect('/message?content='+chineseEncodeToURI('錯誤'));
			}else{
				//replace this line by next page after find success( pass data u found into res.redirect function )
				res.redirect('/');
			}
		}
	});
});

//get version
router.get('/find/:id?',function(req, res){
	Example.findById(req.query.id).exec(function (err, example){
		if (err) {
			console.log(err);
			res.redirect('/message?content='+chineseEncodeToURI('錯誤'));
		}else{
			if(!example){
				res.redirect('/message?content='+chineseEncodeToURI('錯誤'));
			}else{
				//replace this line by next page after find success( pass data u found into res.redirect function )
				res.redirect('/');
			}
		}
	});
});

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

