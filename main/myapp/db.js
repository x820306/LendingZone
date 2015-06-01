var mongoose = require( 'mongoose' );
var async = require( 'async' );
var Schema   = mongoose.Schema;
var bcrypt = require('bcrypt');
var SALT_WORK_FACTOR = 10;

var Borrows = new Schema({
	MoneyToBorrow: { type: Number, default: 0 },//想借多少錢
	MoneyToBorrowCumulated: { type: Number, default: 0 },//已經借到多少錢，以上前者減後者可得還需要多少錢
	MaxInterestRateAccepted: { type: Number, default: 0.01 },
	MonthPeriodAccepted: { type: Number, default: 1 },
	TimeLimit: { type: Date, default: Date.now },
	StoryTitle: { type: String, default:'無標題'},
	Story: { type: String, default:'無內容'},
	Category:{ type: String, default:'general'},//'general','education','family','tour' etc. we can add more
	LikeNumber: { type: Number, default: 0 },
	Likes: [{ type: Schema.Types.ObjectId, ref: 'Users' }],
	IfReadable: { type: Boolean, default: true },
	Level:{ type: Number, default: 0 },//Have to be copied from User when creating, for sorting convenience
	AutoComfirmToLendMsgPeriod: { type: Number, default: -1 },
	AutoComfirmToLendMsgSorter: { type: String, default: 'InterestRate' },
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
	MinLevelAccepted: { type: Number, default: 0 },
	MinInterestInFuture: { type: Number, default: 0 },
	MinInterestInFutureMonth: { type: Number, default: 0 },
	MinInterestInFutureMoneyMonth: { type: Number, default: 0 },
	MinInterestInFutureDivMoney:{ type: Number, default: 0 },
	AutoComfirmToBorrowMsgPeriod: { type: Number, default: -1 },
	AutoComfirmToBorrowMsgSorter: { type: String, default: '-InterestRate' },
	CreatedBy: { type: Schema.Types.ObjectId, ref: 'Users' },
	Updated: { type: Date, default: Date.now },
	Created: { type: Date, default: Date.now }
});

var Messages = new Schema({
	FromBorrowRequest: { type: Schema.Types.ObjectId, ref: 'Borrows' },
	Message: { type: String, default:'無內容'},
	MoneyToLend: { type: Number, default: 0 },
	InterestRate: { type: Number, default: 0.01 },
	MonthPeriod: { type: Number, default: 1 },
	Status: { type: String, default:'NotConfirmed' },// 'NotConfirmed' or 'Confirmed' or 'Rejected'
	Type: {type: String, default:'NoType'},// 'toLend' or 'toBorrow'
	Level:{ type: Number, default: 0 },//Have to be copied from Borrows, for sorting convenience
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
	Level: { type: Number, default: 0 },
	MaxTotalMoneyCanBorrow: { type: Number, default: 0 },
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
	Principal: { type: Number, default: 0 },//未還本金
	PrincipalReturnedCumulated: { type: Number, default: 0 },//已還本金，以上兩者相加可得原始本金
	InterestCumulated: { type: Number, default: 0 },//已繳利息
	InterestRate: { type: Number, default: 0.01 },
	MonthPeriod: { type: Number, default: 1 },//剩下期數
	MonthPeriodHasPast: { type: Number, default: 0 },//已過期數
	Level:{ type: Number, default: 0 },//Have to be copied from Messages, for sorting convenience
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
	PrincipalBeforePaid: { type: Number, default: 0 },
	Level:{ type: Number, default: 0 },
	BorrowerBankAccountNumber: {type: String, default:''},
	Updated: { type: Date, default: Date.now },
	Created: { type: Date, default: Date.now }
});

mongoose.model( 'Returns', Returns );
var ReturnsModal  = mongoose.model('Returns');

Transactions.pre('remove', function (next) {
	console.log('level-3');
	async.each(this.Return, function(id, callback) {
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
		next();
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

Borrows.pre('remove', function (next) {
	console.log('level-1');
	DiscussionsModal.remove({BelongTo: this._id}).exec();
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
		next();
	});	
});
mongoose.model( 'Borrows', Borrows );

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
mongoose.model( 'Lends', Lends );
mongoose.model( 'BankAccounts', BankAccounts );

mongoose.connect( 'mongodb://lendingZone:lendingZone@ds031972.mongolab.com:31972/lending' );