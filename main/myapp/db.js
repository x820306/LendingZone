var mongoose = require( 'mongoose' );
var Schema   = mongoose.Schema;

var Borrows = new Schema({
	MoneyToBorrow: { type: Number, default: 0 },
	MaxInterestRateAccepted: { type: Number, default: 0 },
	MonthPeriodAccepted: { type: Number, default: 1 },
	TimeLimit: { type: Date, default: Date.now },
	Story: { type: String, default:''},
	LikeNumber: { type: Number, default: 0 },
	ToBorrowMessages: [{ type: Schema.Types.ObjectId, ref: 'ToBorrowMessages'}],
	Updated: { type: Date, default: Date.now },
	CreatedBy: { type: Schema.Types.ObjectId, ref: 'Users' }
});

var Lends = new Schema({
    MaxMoneyToLend: { type: Number, default: 0 },
	InterestRate: { type: Number, default: 0 },
	MonthPeriod: { type: Number, default: 1 },
	Updated: { type: Date, default: Date.now },
	CreatedBy: { type: Schema.Types.ObjectId, ref: 'Users' }
});

var ToLendMessages = new Schema({
	MoneyToLend: { type: Number, default: 0 },
	InterestRate: { type: Number, default: 0 },
	MonthPeriod: { type: Number, default: 1 },
	SendTo:{ type: Schema.Types.ObjectId, ref: 'Users' },
	IfComfirmed: { type: Boolean, default: false },
	Updated: { type: Date, default: Date.now },
	CreatedBy: { type: Schema.Types.ObjectId, ref: 'Users' }
});

var ToBorrowMessages = new Schema({
	FromBorrowRequest: { type: Schema.Types.ObjectId, ref: 'Borrows' },
	SendTo:{ type: Schema.Types.ObjectId, ref: 'Users' },
	IfComfirmed: { type: Boolean, default: false },
	Updated: { type: Date, default: Date.now },
	CreatedBy: { type: Schema.Types.ObjectId, ref: 'Users' }
});

var Users = new Schema({
    Account: { type: String},
	Password: { type: String},
	Level: { type: Number, default: 0 },
	Created: { type: Date, default: Date.now }
});

mongoose.model( 'Users', Users );
mongoose.model( 'Borrows', Borrows );
mongoose.model( 'Lends', Lends );
mongoose.model( 'ToBorrowMessages', ToBorrowMessages );
mongoose.model( 'ToLendMessages', ToLendMessages );
mongoose.connect( 'mongodb://lendingZone:lendingZone@ds031972.mongolab.com:31972/lending' );