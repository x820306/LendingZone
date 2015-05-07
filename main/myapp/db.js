var mongoose = require( 'mongoose' );
var Schema   = mongoose.Schema;

var Borrows = new Schema({
	MoneyToBorrow: { type: Number, default: 0 },
	MoneyToBorrowCumulated: { type: Number, default: 0 },
	MaxInterestRateAccepted: { type: Number, default: 0 },
	MonthPeriodAccepted: { type: Number, default: 1 },
	TimeLimit: { type: Date, default: Date.now },
	StoryTitle: { type: String, default:''},
	Story: { type: String, default:''},
	LikeNumber: { type: Number, default: 0 },
	Likes: [{ type: Schema.Types.ObjectId, ref: 'Users' }],
	IfReadable: { type: Boolean, default: true },
	CreatedBy: { type: Schema.Types.ObjectId, ref: 'Users' },
	Updated: { type: Date, default: Date.now },
	Created: { type: Date, default: Date.now }
});

var Lends = new Schema({
    MaxMoneyToLend: { type: Number, default: 0 },
	InterestRate: { type: Number, default: 0 },
	MonthPeriod: { type: Number, default: 1 },
	CreatedBy: { type: Schema.Types.ObjectId, ref: 'Users' },
	Updated: { type: Date, default: Date.now },
	Created: { type: Date, default: Date.now }
});

var Messages = new Schema({
	FromBorrowRequest: { type: Schema.Types.ObjectId, ref: 'Borrows' },
	Message: { type: String, default:''},
	MoneyToLend: { type: Number, default: 0 },
	InterestRate: { type: Number, default: 0 },
	MonthPeriod: { type: Number, default: 1 },
	Status: { type: String, default:'NotConfirmed' },// 'NotConfirmed' or 'Confirmed' or 'Rejected'
	Type: {type: String, default:'NoType'},// 'toLend' or 'toBorrow'
	SendTo:{ type: Schema.Types.ObjectId, ref: 'Users' },
	CreatedBy: { type: Schema.Types.ObjectId, ref: 'Users' },
	Updated: { type: Date, default: Date.now },
	Created: { type: Date, default: Date.now }
});

var Users = new Schema({
    Username: { type: String},
	Password: { type: String},
	Name: { type: String},
	Gender: { type: String},
	BirthDay: { type: Date},
	IdCard: { type: Buffer},
	IdCardType: { type: String},
	SecondCard: { type: Buffer},
	SecondCardType: { type: String},
	Phone: { type: String},
	Address: { type: String},
	Level: { type: Number, default: 0 },
	MaxTotalMoneyCanBorrow: { type: Number, default: 0 },
	AutoComfirmToLendMsgPeriod: { type: Number, default: -1 },
	AutoComfirmToBorrowMsgPeriod: { type: Number, default: -1 },
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
	Principal: { type: Number, default: 0 },
	PrincipalReturnedCumulated: { type: Number, default: 0 },
	InterestCumulated: { type: Number, default: 0 },
	InterestRate: { type: Number, default: 0 },
	MonthPeriod: { type: Number, default: 1 },
	MonthPeriodHasPast: { type: Number, default: 0 },
	CreatedFrom: { type: Schema.Types.ObjectId, ref: 'Messages' },
	Borrower: { type: Schema.Types.ObjectId, ref: 'Users' },
	Lender: { type: Schema.Types.ObjectId, ref: 'Users' },
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

mongoose.model( 'Users', Users );
mongoose.model( 'Borrows', Borrows );
mongoose.model( 'Lends', Lends );
mongoose.model( 'Messages', Messages );
mongoose.model( 'BankAccounts', BankAccounts );
mongoose.model( 'Transactions', Transactions );
mongoose.model( 'Discussions', Discussions );
mongoose.connect( 'mongodb://lendingZone:lendingZone@ds031972.mongolab.com:31972/lending' );