var mongoose = require('mongoose');
var async = require('async');
var Schema   = mongoose.Schema;
var bcrypt = require('bcrypt');
var SALT_WORK_FACTOR = 10;

var Borrows = new Schema({
	MoneyToBorrow: { type: Number, default: 0 },//想借多少錢
	MaxInterestRateAccepted: { type: Number, default: 0.01 },
	MonthPeriodAccepted: { type: Number, default: 1 },
	MonthPeriodAcceptedLowest: { type: Number, default: 1 },
	TimeLimit: { type: Date, default: Date.now },
	StoryTitle: { type: String, default:''},
	Story: { type: String, default:''},
	Category:{ type: String, default:'general'},//'general','education','family','tour' etc. we can add more
	Likes: [{ type: Schema.Types.ObjectId, ref: 'Users' }],
	IfReadable: { type: Boolean, default: true },
	AutoComfirmToLendMsgPeriod: { type: Number, default: -1 },
	AutoComfirmToLendMsgSorter: { type: String, default: 'invalid' },
	AutoComfirmToLendMsgDirector: { type: String, default: 'invalid' },
	CreatedBy: { type: Schema.Types.ObjectId, ref: 'Users' },
	Discussion: [{ type: Schema.Types.ObjectId, ref: 'Discussions' }],
	Message:[{ type: Schema.Types.ObjectId, ref: 'Messages' }],
	Updated: { type: Date, default: Date.now },
	Created: { type: Date, default: Date.now }
});

var Lends = new Schema({
    MaxMoneyToLend: { type: Number, default: 0 },
	InterestRate: { type: Number, default: 0.01 },
	MonthPeriod: { type: Number, default: 1 },
	MinLevelAccepted: { type: Number, default: -1 },
	MinInterestInFuture: { type: Number, default: -1 },
	MinMoneyFuture: { type: Number, default: -1 },
	MinInterestInFutureMonth: { type: Number, default: -1 },
	MinInterestInFutureMoneyMonth: { type: Number, default: -1 },
	MinInterestInFutureDivMoney:{ type: Number, default: -1 },
	AutoComfirmToBorrowMsgPeriod: { type: Number, default: -1 },
	AutoComfirmToBorrowMsgSorter: { type: String, default: 'invalid' },
	AutoComfirmToBorrowMsgDirector: { type: String, default: 'invalid' },
	AutoComfirmToBorrowMsgClassor: { type: String, default: 'invalid' },
	AutoComfirmToBorrowMsgLbound: { type: Number, default: -1 },
	AutoComfirmToBorrowMsgUbound: { type: Number, default: -1 },
	AutoComfirmToBorrowMsgKeyWord: { type: String, default: '' },
	CreatedBy: { type: Schema.Types.ObjectId, ref: 'Users' },
	Updated: { type: Date, default: Date.now },
	Created: { type: Date, default: Date.now }
});

var Messages = new Schema({
	FromBorrowRequest: { type: Schema.Types.ObjectId, ref: 'Borrows' },
	Message: { type: String, default:''},
	MoneyToLend: { type: Number, default: 0 },
	InterestRate: { type: Number, default: 0.01 },
	MonthPeriod: { type: Number, default: 1 },
	OldMoneyToLend: { type: Number, default: 0 },
	OldInterestRate: { type: Number, default: 0.01 },
	OldMonthPeriod: { type: Number, default: 1 },
	Status: { type: String, default:'NotConfirmed' },// 'NotConfirmed' or 'Confirmed' or 'Rejected'
	Type: {type: String, default:'NoType'},// 'toLend' or 'toBorrow'
	SendTo:{ type: Schema.Types.ObjectId, ref: 'Users' },
	Transaction: [{ type: Schema.Types.ObjectId, ref: 'Transactions' }],
	CreatedBy: { type: Schema.Types.ObjectId, ref: 'Users' },
	Updated: { type: Date, default: Date.now },
	Created: { type: Date, default: Date.now }
});

var Users = new Schema({
    Username: { type: String, required: true, index: { unique: true } },
	Password: { type: String, required: true},
	Name: { type: String},
	Email: { type: String},
	Gender: { type: String},
	BirthDay: { type: Date},
	IdCardNumber: { type: String},
	IdCard: { type: Buffer},
	IdCardType: { type: String},
	SecondCard: { type: Buffer},
	SecondCardType: { type: String},
	Phone: { type: String},
	Address: { type: String},
	OrignalLevel: { type: Number, default: 1 },
	Level: { type: Number, default: 1 },
	MaxTotalMoneyCanBorrow: { type: Number, default: 1 },
	Updated: { type: Date, default: Date.now },
	Created: { type: Date, default: Date.now },
	resetPasswordToken: { type: String},
	resetPasswordExpires: { type: Date}
});

var BankAccounts = new Schema({
	BankAccountNumber: { type: String},
	BankAccountPassword: { type: String},
	MoneyInBankAccount: { type: Number},
	OwnedBy: { type: Schema.Types.ObjectId, ref: 'Users' },
	Updated: { type: Date, default: Date.now },
	Created: { type: Date, default: Date.now }
});

var Transactions = new Schema({
	Principal: { type: Number, default: 0 },//本金
	InterestRate: { type: Number, default: 0.01 },
	MonthPeriod: { type: Number, default: 1 },//期數
	CreatedFrom: { type: Schema.Types.ObjectId, ref: 'Messages' },
	Borrower: { type: Schema.Types.ObjectId, ref: 'Users' },
	Lender: { type: Schema.Types.ObjectId, ref: 'Users' },
	Return: [{ type: Schema.Types.ObjectId, ref: 'Returns' }],
	InsuranceFeePaid: { type: Number, default: 0 },
	Updated: { type: Date, default: Date.now },
	Created: { type: Date, default: Date.now }
});

var Discussions = new Schema({
	Content: { type: String },
	BelongTo: { type: Schema.Types.ObjectId, ref: 'Borrows' },
	CreatedBy: { type: Schema.Types.ObjectId , ref: 'Users' },
	Updated: { type: Date, default: Date.now },
	Created: { type: Date, default: Date.now }
});

var Returns = new Schema({
	ToTransaction: { type: Schema.Types.ObjectId, ref: 'Transactions' },
	Borrower: { type: Schema.Types.ObjectId, ref: 'Users' },
	Lender: { type: Schema.Types.ObjectId, ref: 'Users' },
	ServiceChargeShouldPaid: { type: Number, default: 0 },
	ServiceChargeNotPaid: { type: Number, default: 0 },
	InterestShouldPaid: { type: Number, default: 0 },
	InterestNotPaid: { type: Number, default: 0 },
	PrincipalShouldPaid: { type: Number, default: 0 },
	PrincipalNotPaid: { type: Number, default: 0 },
	ExtendPrincipalBeforePaid: { type: Number, default: 0 },
	TotalPrincipalNowBeforePaid: { type: Number, default: 0 },
	PrincipalNotReturnBeforePaid: { type: Number, default: 0 },
	PrincipalReturnBeforePaid: { type: Number, default: 0 },
	InterestBeforePaid: { type: Number, default: 0 },
	PrincipalInterestBeforePaid: { type: Number, default: 0 },
	InterestMonthBeforePaid: { type: Number, default: 0 },
	PrincipalInterestMonthBeforePaid: { type: Number, default: 0 },
	InterestDivPrincipalBeforePaid: { type: Number, default: 0 },
	ServiceChargeBeforePaid: { type: Number, default: 0 },
	ExtendMonthPeriodBeforePaid: { type: Number, default: 0 },
	TotalMonthPeriodNowBeforePaid: { type: Number, default: 0 },
	MonthPeriodLeftBeforePaid: { type: Number, default: 0 },
	MonthPeriodPastBeforePaid: { type: Number, default: 0 },
	InterestInFutureBeforePaid: { type: Number, default: 0 },
	MoneyFutureBeforePaid: { type: Number, default: 0 },
	InterestInFutureMonthBeforePaid: { type: Number, default: 0 },
	InterestInFutureMoneyMonthBeforePaid: { type: Number, default: 0 },
	InterestInFutureDivMoneyBeforePaid: { type: Number, default: 0 },
	ReturnCountBeforePaid: { type: Number, default: 0 },
	previousPayDateBeforePaid: { type: Date, default: Date.now },
	nextPayDateBeforePaid: { type: Date, default: Date.now },
	LevelBeforePaid: { type: Number, default: 1 },
	ExtendPrincipalAfterPaid: { type: Number, default: 0 },
	TotalPrincipalNowAfterPaid: { type: Number, default: 0 },
	PrincipalNotReturnAfterPaid: { type: Number, default: 0 },
	PrincipalReturnAfterPaid: { type: Number, default: 0 },
	InterestAfterPaid: { type: Number, default: 0 },
	PrincipalInterestAfterPaid: { type: Number, default: 0 },
	InterestMonthAfterPaid: { type: Number, default: 0 },
	PrincipalInterestMonthAfterPaid: { type: Number, default: 0 },
	InterestDivPrincipalAfterPaid: { type: Number, default: 0 },
	ServiceChargeAfterPaid: { type: Number, default: 0 },
	ExtendMonthPeriodAfterPaid: { type: Number, default: 0 },
	TotalMonthPeriodNowAfterPaid: { type: Number, default: 0 },
	MonthPeriodLeftAfterPaid: { type: Number, default: 0 },
	MonthPeriodPastAfterPaid: { type: Number, default: 0 },
	InterestInFutureAfterPaid: { type: Number, default: 0 },
	MoneyFutureAfterPaid: { type: Number, default: 0 },
	InterestInFutureMonthAfterPaid: { type: Number, default: 0 },
	InterestInFutureMoneyMonthAfterPaid: { type: Number, default: 0 },
	InterestInFutureDivMoneyAfterPaid: { type: Number, default: 0 },
	ReturnCountAfterPaid: { type: Number, default: 0 },
	previousPayDateAfterPaid: { type: Date, default: Date.now },
	nextPayDateAfterPaid: { type: Date, default: Date.now },
	LevelAfterPaid: { type: Number, default: 1 },
	BorrowerBankAccountNumber: {type: String, default:''},
	Updated: { type: Date, default: Date.now },
	Created: { type: Date, default: Date.now }
});

mongoose.model( 'Lends', Lends );
var LendsModal  = mongoose.model('Lends');
mongoose.model( 'BankAccounts', BankAccounts );
var BankAccountsModal  = mongoose.model('BankAccounts');

Returns.pre('remove', function (next) {
	console.log('level-4');
	var returnFound=this;
	BankAccountsModal.findOne({"OwnedBy": returnFound.Lender}).exec(function (err, lenderBankaccount){
		if (err) {
			console.log(err);
			next();
		}else{
			if(!lenderBankaccount){
				next();
			}else{
				lenderBankaccount.MoneyInBankAccount-=((returnFound.InterestShouldPaid-returnFound.InterestNotPaid)+(returnFound.PrincipalShouldPaid-returnFound.PrincipalNotPaid));
				lenderBankaccount.save(function (err,updatedLenderBankaccount){
					if (err){
						console.log(err);
						next();
					}else{	
						BankAccountsModal.findOne({"OwnedBy": returnFound.Borrower}).exec(function (err, borrowerBankaccount){
							if (err) {
								console.log(err);
								next();
							}else{
								if(!borrowerBankaccount){
									next();
								}else{
									borrowerBankaccount.MoneyInBankAccount+=((returnFound.ServiceChargeShouldPaid-returnFound.ServiceChargeNotPaid)+(returnFound.InterestShouldPaid-returnFound.InterestNotPaid)+(returnFound.PrincipalShouldPaid-returnFound.PrincipalNotPaid));
									borrowerBankaccount.save(function (err,updatedBorrowerBankaccount){
										if (err){
											console.log(err);
											next();
										}else{	
											var objID=mongoose.Types.ObjectId('5555251bb08002f0068fd00f');//admin account
											BankAccountsModal.findOne({"OwnedBy": objID}).exec(function (err, adminAccount){
												if (err) {
													console.log(err);
													next();
												}else{
													if(!adminAccount){
														next();
													}else{
														adminAccount.MoneyInBankAccount-=(returnFound.ServiceChargeShouldPaid-returnFound.ServiceChargeNotPaid);
														adminAccount.save(function (err,updatedAdminAccount){
															if (err){
																console.log(err);
																next();
															}else{	
																next();
															}
														});
													}
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
	});
});

mongoose.model( 'Returns', Returns );
var ReturnsModal  = mongoose.model('Returns');

Transactions.pre('remove', function (next) {
	console.log('level-3');
	var transactionFound=this;
	async.each(transactionFound.Return, function(id, callback) {
		ReturnsModal.findById(id).exec(function (err, returnFound){
			if(err){
				callback();
			}else{
				if(!returnFound){
					callback();
				}else{
					returnFound.remove(function (err,removed) {
						callback();
					});
				}
			}
		});
	},function(err){
		if(err) throw err;
		BankAccountsModal.findOne({"OwnedBy": transactionFound.Lender}).exec(function (err, lenderBankaccount){
			if (err) {
				console.log(err);
				next();
			}else{
				if(!lenderBankaccount){
					next();
				}else{
					lenderBankaccount.MoneyInBankAccount+=transactionFound.Principal;
					lenderBankaccount.save(function (err,updatedLenderBankaccount){
						if (err){
							console.log(err);
							next();
						}else{	
							BankAccountsModal.findOne({"OwnedBy": transactionFound.Borrower}).exec(function (err, borrowerBankaccount){
								if (err) {
									console.log(err);
									next();
								}else{
									if(!borrowerBankaccount){
										next();
									}else{
										borrowerBankaccount.MoneyInBankAccount-=transactionFound.Principal;
										borrowerBankaccount.save(function (err,updatedBorrowerBankaccount){
											if (err){
												console.log(err);
												next();
											}else{	
												next();
											}
										});
									}
								}
							});
						}
					});
				}
			}
		});
	});	
});
mongoose.model( 'Transactions', Transactions );
var TransactionsModal  = mongoose.model('Transactions');

Messages.pre('remove', function (next) {
	console.log('level-2');
	async.each(this.Transaction, function(id, callback) {
		TransactionsModal.findById(id).exec(function (err, transaction){
			if(err){
				callback();
			}else{
				if(!transaction){
					callback();
				}else{
					transaction.remove(function (err,removed) {
						callback();
					});
				}
			}
		});
	},function(err){
		if(err) throw err;
		next();
	});	
});
mongoose.model( 'Messages', Messages );
var MessagesModal  = mongoose.model('Messages');

mongoose.model( 'Discussions', Discussions );
var DiscussionsModal  = mongoose.model('Discussions');

Borrows.pre('remove', function (next){
	console.log('level-1');
	var borrow_id=this._id;
	async.each(this.Message, function(id, callback) {
		MessagesModal.findById(id).exec(function (err, message){
			if(err){
				callback();
			}else{
				if(!message){
					callback();
				}else{
					message.remove(function (err,removed) {
						callback();
					});
				}
			}
		});
	},function(err){
		if(err) throw err;
		DiscussionsModal.remove({BelongTo: borrow_id},function(err){
			if(err) throw err;
			next();
		});
	});	
});
mongoose.model( 'Borrows', Borrows );
var BorrowsModal  = mongoose.model('Borrows');

Users.pre('remove', function (next){
	var user_id=this._id;
	BorrowsModal.find({}).exec(function (err, borrows){
		if(err){
			throw err;
		}else{
			async.each(borrows, function(brw, callback) {
				if(brw.CreatedBy.toString()===user_id.toString()){
					brw.remove(function (err,removed) {
						callback();
					});
				}else{
					var foundFlag=false;
					for(j=brw.Likes.length-1;j>-1;j--){
						if(brw.Likes[j].toString()===user_id.toString()){
							brw.Likes.splice(j, 1);
							foundFlag=true;
						}
					}
					if(foundFlag){
						brw.save(function (err,updatedBrw) {
							if (err){
								callback();
							}else{	
								callback();
							}
						});
					}else{
						callback();
					}
				}
			},function(err){
				if(err) throw err;
				MessagesModal.find({$or:[{"SendTo": user_id},{"CreatedBy": user_id}]}).exec(function (err, messages){
					if(err){
						throw err;
					}else{
						async.each(messages, function(msg, callback){	
							BorrowsModal.findById(msg.FromBorrowRequest).exec(function (err, borrow){
								if(err){
									callback();
								}else{
									if(!borrow){
										callback();
									}else{
										var ctr = -1;
										for (i = 0; i < borrow.Message.length; i++) {
											if (borrow.Message[i].toString() === msg._id.toString()) {
												ctr=i;
												break;
											}
										};
										if(ctr>-1){
											borrow.Message.splice(ctr, 1);
										}
										borrow.save(function (err,updatedBorrow) {
											if (err){
												callback();
											}else{	
												msg.remove(function (err,removedItem) {
													if (err){
														callback();
													}else{
														callback();
													}
												});
											}
										});
									}
								}
							});
						},function(err){
							if(err) throw err;
							DiscussionsModal.find({CreatedBy:user_id}).exec(function (err, discussions){
								if(err){
									throw err;
								}else{
									async.each(discussions, function(dcs, callback){	
										BorrowsModal.findById(dcs.BelongTo).exec(function (err, borrow2){
											if(err){
												callback();
											}else{
												if(!borrow2){
													callback();
												}else{
													var ctr2 = -1;
													for (o = 0; o < borrow2.Discussion.length; o++) {
														if (borrow2.Discussion[o].toString() === dcs._id.toString()) {
															ctr2=o;
															break;
														}
													};
													if(ctr2>-1){
														borrow2.Discussion.splice(ctr2, 1);
													}
													borrow2.save(function (err,updatedBorrow2) {
														if (err){
															callback();
														}else{	
															dcs.remove(function (err,removedItem2) {
																if (err){
																	callback();
																}else{
																	callback();
																}
															});
														}
													});
												}
											}
										});
									},function(err){
										if(err) throw err;
										LendsModal.remove({CreatedBy: user_id},function(err){
											if(err) throw err;
											BankAccountsModal.remove({OwnedBy: user_id},function(err){
												if(err) throw err;
												next();
											});
										});	
									});
								}
							});
						});
					}
				});
			});	
		}
	});
});

Users.pre('save', function(next) {
    var user = this;

    // only hash the password if it has been modified (or is new)
    if (!user.isModified('Password')){
		return next();
	}else{
		// generate a salt
		bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
			if (err){
				return next(err);
			}else{
				// hash the password along with our new salt
				bcrypt.hash(user.Password, salt, function(err, hash) {
					if (err){
						return next(err);
					}else{
						// override the cleartext password with the hashed one
						user.Password = hash;
						next();
					}
				});
			}
		});
	}
});

Users.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.Password, function(err, isMatch) {
        if (err){
			return cb(err);
		}else{
			cb(null, isMatch);
		}
    });
};

mongoose.model( 'Users', Users );

mongoose.connect( 'mongodb://lendingZone:lendingZone@ds031972.mongolab.com:31972/lending' );