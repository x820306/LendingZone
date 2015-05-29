var mongoose = require( 'mongoose' );
var Schema   = mongoose.Schema;

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
    Username: { type: String},
	Password: { type: String},
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
	Created: { type: Date, default: Date.now }
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

mongoose.model( 'Users', Users );
mongoose.model( 'Borrows', Borrows );
mongoose.model( 'Lends', Lends );
mongoose.model( 'Messages', Messages );
mongoose.model( 'BankAccounts', BankAccounts );
mongoose.model( 'Transactions', Transactions );
mongoose.model( 'Discussions', Discussions );
mongoose.model( 'Returns', Returns );
mongoose.connect( 'mongodb://lendingZone:lendingZone@ds031972.mongolab.com:31972/lending' );