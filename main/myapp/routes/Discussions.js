var library=require( './library.js' );
var mongoose = require('mongoose');
var Discussions  = mongoose.model('Discussions');
var Borrows  = mongoose.model('Borrows');
var Users  = mongoose.model('Users');
var sanitizer = require('sanitizer');

var express = require('express');
var router = express.Router();

router.post('/createTest', function(req, res, next) {
	if((typeof(req.body.Content) === 'string')&&(typeof(req.body.BelongTo) === 'string')&&(typeof(req.body.CreatedBy) === 'string')){
		req.body.Content=sanitizer.sanitize(req.body.Content.trim());
		req.body.BelongTo=sanitizer.sanitize(req.body.BelongTo.trim());
		req.body.CreatedBy=sanitizer.sanitize(req.body.CreatedBy.trim());
		
		var toCreate = new Discussions();
		toCreate.Content=req.body.Content;
		toCreate.BelongTo=req.body.BelongTo;
		toCreate.CreatedBy=req.body.CreatedBy;
		
		toCreate.save(function (err,newCreate) {
			if (err){
				console.log(err);
				res.json({error: err.name}, 500);
			}else{
				res.json(newCreate);
			}
		});
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/destroyTest',function(req, res, next) {
	if(typeof(req.body.DiscussionID) === 'string'){
		Discussions.findById(req.body.DiscussionID).exec(function (err, discussion){
			if (err) {
				console.log(err);
				res.json({error: err.name}, 500);
			}else{
				if(!discussion){
					res.json({error:'no such discussion'}, 500);
				}else{
					Borrows.findById(discussion.BelongTo).exec(function (err, borrow){
						if (err) {
							console.log(err);
							res.json({error: err.name}, 500);
						}else{
							if(!borrow){
								res.json({error:'no such borrow'}, 500);
							}else{
								var ctr = -1;
								for (i = 0; i < borrow.Discussion.length; i++) {
									if (borrow.Discussion[i].equals(discussion._id)) {
										ctr=i;
										break;
									}
								};
								if(ctr>-1){
									borrow.Discussion.splice(ctr, 1);
								}
								borrow.save(function (err,updatedBorrow) {
									if (err){
										console.log(err);
										res.json({error: err.name}, 500);
									}else{	
										discussion.remove(function (err,removedItem) {
											if (err){
												console.log(err);
												res.json({error: err.name}, 500);
											}else{
												res.json(removedItem);
											}
										});
									}
								});
							}
						}
					});
				}
			}
		});
	}else{
		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
	}
});

router.post('/create',library.loginFormChecker,library.ensureAuthenticated, function(req, res, next) {
	if((typeof(req.body.Content) === 'string')&&(typeof(req.body.BelongTo) === 'string')){
		req.body.Content=sanitizer.sanitize(req.body.Content.trim());
		req.body.BelongTo=sanitizer.sanitize(req.body.BelongTo.trim());
		
		var toCreate = new Discussions();
		toCreate.Content=req.body.Content;
		toCreate.BelongTo=req.body.BelongTo;
		toCreate.CreatedBy=req.user._id;
		
		toCreate.save(function (err,newCreate) {
			if (err){
				console.log(err);
				res.json({error: "Creating failed.",success:false}, 500);
			}else{
				Borrows.findById(newCreate.BelongTo).exec(function (err, borrow){
					if (err) {
						console.log(err);
						res.json({error: "Borrow finding failed.",success:false}, 500);
					}else{
						if(!borrow){
							res.json({error: "Borrow not found.",success:false}, 500);
						}else{
							borrow.Discussion.push(newCreate._id);
							borrow.Updated=Date.now();
							borrow.save(function (err,borrowUpdated) {
								if (err){
									console.log(err);
									res.json({error: "Borrow saving failed.",success:false}, 500);
								}else{
									var options = {
										path: 'Discussion',
										model: Discussions
									};
									Borrows.populate(borrowUpdated, options, function(err, borrowUpdated) {
										if(err){
											console.log(err);
											res.json({error: "1st Population failed.",success:false}, 500);
										}else{
											var options2 = {
												path: 'Discussion.CreatedBy',
												model: Users,
												select: 'Username'
											};
											Discussions.populate(borrowUpdated, options2, function(err, borrowUpdated) {
												if(err){
													console.log(err);
													res.json({error: "2nd Population failed.",success:false}, 500);
												}else{
													var createdByViewerArray=[];
													for(i=0;i<borrowUpdated.Discussion.length;i++){
														if(borrowUpdated.Discussion[i].CreatedBy._id.equals(req.user._id)){
															createdByViewerArray.push(true);
														}else{
															createdByViewerArray.push(false);
														}
													}
													res.json({success:true,result:borrowUpdated.Discussion,CreatedByViewer:createdByViewerArray,date:borrowUpdated.Updated});
												}
											});
										}
									});
								}
							});
						}
					}
				});
			}
		});
	}else{
		res.json({error: "failed!",success:false}, 500);
	}
});

router.post('/destroy',library.loginFormChecker,library.ensureAuthenticated, function(req, res, next) {
	if(typeof(req.body._id) === 'string'){
		req.body._id=sanitizer.sanitize(req.body._id.trim());
		
		Discussions.findById(req.body._id).exec(function (err, discussion){
			if (err) {
				console.log(err);
				res.json({error: "Discussion finding failed.",success:false}, 500);
			}else{
				if(!discussion){
					res.json({error: "Target discussion not found.",success:false}, 500);
				}else{
					if(!discussion.CreatedBy.equals(req.user._id)){
						res.json({error: "Auth failed.",success:false}, 500);
					}else{
						Borrows.findById(discussion.BelongTo).exec(function (err, borrow){
							if (err) {
								console.log(err);
								res.json({error: "Borrow finding failed.",success:false}, 500);
							}else{
								if(!borrow){
									res.json({error: "Borrow not found.",success:false}, 500);
								}else{
									var ctr = -1;
									for (i = 0; i < borrow.Discussion.length; i++) {
										if (borrow.Discussion[i].equals(discussion._id)) {
											ctr=i;
											break;
										}
									};
									if(ctr>-1){
										borrow.Discussion.splice(ctr, 1);
									}
									borrow.Updated=Date.now();
									borrow.save(function (err,borrowUpdated) {
										if (err){
											console.log(err);
											res.json({error: "Borrow updating fail.",success:false}, 500);
										}else{	
											discussion.remove(function (err,removedItem) {
												if (err){
													console.log(err);
													res.json({error: "Discussion removing fail.",success:false}, 500);
												}else{
													var options = {
														path: 'Discussion',
														model: Discussions
													};
													Borrows.populate(borrowUpdated, options, function(err, borrowUpdated) {
														if(err){
															console.log(err);
															res.json({error: "1st Population failed.",success:false}, 500);
														}else{
															var options2 = {
																path: 'Discussion.CreatedBy',
																model: Users,
																select: 'Username'
															};
															Discussions.populate(borrowUpdated, options2, function(err, borrowUpdated) {
																if(err){
																	console.log(err);
																	res.json({error: "2nd Population failed.",success:false}, 500);
																}else{
																	var createdByViewerArray=[];
																	for(i=0;i<borrowUpdated.Discussion.length;i++){
																		if(borrowUpdated.Discussion[i].CreatedBy._id.equals(req.user._id)){
																			createdByViewerArray.push(true);
																		}else{
																			createdByViewerArray.push(false);
																		}
																	}
																	
																	res.json({success:true,result:borrowUpdated.Discussion,CreatedByViewer:createdByViewerArray,date:borrowUpdated.Updated});
																}
															});
														}
													});
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
	}else{
		res.json({error: "failed!",success:false}, 500);
	}
});

router.post('/edit',library.loginFormChecker,library.ensureAuthenticated, function(req, res, next) {
	if((typeof(req.body._id) === 'string')&&(typeof(req.body.Content) === 'string')){
		req.body._id=sanitizer.sanitize(req.body._id.trim());
		req.body.Content=sanitizer.sanitize(req.body.Content.trim());
		Discussions.findById(req.body._id).exec(function (err, discussion){
			if (err) {
				console.log(err);
				res.json({error: "Discussion finding failed.",success:false}, 500);
			}else{
				if(!discussion){
					res.json({error: "Target discussion not found.",success:false}, 500);
				}else{
					if(!discussion.CreatedBy.equals(req.user._id)){
						res.json({error: "Auth failed.",success:false}, 500);
					}else{
						discussion.Content=req.body.Content;
						discussion.Updated=Date.now();
						discussion.save(function (err,discussionUpdated) {
							if (err){
								console.log(err);
								res.json({error: "discussion updating fail.",success:false}, 500);
							}else{
								Borrows.findById(discussionUpdated.BelongTo).exec(function (err, borrow){
									if (err) {
										console.log(err);
										res.json({error: "Borrow finding failed.",success:false}, 500);
									}else{
										if(!borrow){
											res.json({error: "Borrow not found.",success:false}, 500);
										}else{
											borrow.Updated=Date.now();
											borrow.save(function (err,borrowUpdated) {
												if (err){
													console.log(err);
													res.json({error: "Borrow updating fail.",success:false}, 500);
												}else{	
													var options = {
														path: 'Discussion',
														model: Discussions
													};
													Borrows.populate(borrowUpdated, options, function(err, borrowUpdated) {
														if(err){
															console.log(err);
															res.json({error: "1st Population failed.",success:false}, 500);
														}else{
															var options2 = {
																path: 'Discussion.CreatedBy',
																model: Users,
																select: 'Username'
															};
															Discussions.populate(borrowUpdated, options2, function(err, borrowUpdated) {
																if(err){
																	console.log(err);
																	res.json({error: "2nd Population failed.",success:false}, 500);
																}else{
																	var createdByViewerArray=[];
																	for(i=0;i<borrowUpdated.Discussion.length;i++){
																		if(borrowUpdated.Discussion[i].CreatedBy._id.equals(req.user._id)){
																			createdByViewerArray.push(true);
																		}else{
																			createdByViewerArray.push(false);
																		}
																	}
																	
																	res.json({success:true,result:borrowUpdated.Discussion,CreatedByViewer:createdByViewerArray,date:borrowUpdated.Updated});
																}
															});
														}
													});
												}
											});
										}
									}
								});
							}
						});
					}
				}
			}
		});
	}else{
		res.json({error: "failed!",success:false}, 500);
	}
});

router.post('/findDiscussions', function(req, res, next) {
	if(typeof(req.body._id) === 'string'){
		req.body._id=sanitizer.sanitize(req.body._id.trim());
		
		Borrows.findById(req.body._id).populate('Discussion',null, null, {sort: { Created: 1 }}).exec(function (err, borrow){
			if (err) {
				console.log(err);
				res.json({error: "Borrow finding failed.",success:false}, 500);
			}else{
				if(!borrow){
					res.json({error: "Borrow not found.",success:false}, 500);
				}else{	
					var options = {
						path: 'Discussion.CreatedBy',
						model: Users,
						select: 'Username'
					};
					Discussions.populate(borrow, options, function(err, borrow) {
						if(err){
							console.log(err);
							res.json({error: "Population failed.",success:false}, 500);
						}else{
							var createdByViewerArray=[];
							if(req.isAuthenticated()){
								for(i=0;i<borrow.Discussion.length;i++){
									if(borrow.Discussion[i].CreatedBy._id.equals(req.user._id)){
										createdByViewerArray.push(true);
									}else{
										createdByViewerArray.push(false);
									}
								}
							}else{
								for(i=0;i<borrow.Discussion.length;i++){
									createdByViewerArray.push(false);
								}
							}
							res.json({success:true,result:borrow.Discussion,CreatedByViewer:createdByViewerArray,date:borrow.Updated});
						}
					});
				}
			}
		});
	}else{
		res.json({error: "failed!",success:false}, 500);
	}
});

module.exports = router;
