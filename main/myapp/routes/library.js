var mongoose = require('mongoose');
var async = require('async');
var Borrows  = mongoose.model('Borrows');
var Users  = mongoose.model('Users');
var Returns  = mongoose.model('Returns');
var Lends  = mongoose.model('Lends');
var Messages  = mongoose.model('Messages');
var BankAccounts  = mongoose.model('BankAccounts');
var Transactions  = mongoose.model('Transactions');
var Discussions  = mongoose.model('Discussions');
var sanitizer = require('sanitizer');
var nodemailer = require('nodemailer');
var crypto = require('crypto');
var base32 = require('thirty-two');
var generator = require('xoauth2').createXOAuth2Generator({
    user: 'lendingzonesystem@gmail.com',
    clientId: '1064408122186-fheebavu1le96q0h0assuueda5kmb0nk.apps.googleusercontent.com',
    clientSecret: '8b9UNKvg4IZZsM7vsLI8e3JP',
    refreshToken: '1/0wqk7whxhYyMKKB81KBTmJDTioc9VnDxJu2hd4v9Bas'
});
generator.on('token', function(token){
    console.log('New token for %s: %s', token.user, token.accessToken);
});
var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        xoauth2: generator
    }
});

var fs = require('fs');
var Grid = require('gridfs-stream');
Grid.mongo = mongoose.mongo;

var autoConfirmArray=[];
var autoNotReadableArray=[];
var insuranceRate=0.001;
var serviceChargeRate=0.01;
var ifMail=false;
var tmpFilePathArray=[];
var adminID=mongoose.Types.ObjectId('5555251bb08002f0068fd00f');//管理員ID

exports.autoConfirmArray=autoConfirmArray;
exports.autoNotReadableArray=autoNotReadableArray;
exports.adminID=adminID;
exports.insuranceRate=insuranceRate;
exports.serviceChargeRate=serviceChargeRate;
exports.ifMail=ifMail;
exports.tmpFilePathArray=tmpFilePathArray;

setInterval( function(){
	var findPath = __dirname+'/../';
	for(j=exports.tmpFilePathArray.length-1;j>-1;j--){
		var NowT=Date.now();
		var localPath=require('path').join(findPath,tmpFilePathArray[j].Path);
		if((NowT-exports.tmpFilePathArray[j].SaveT)>=600000){
			if(fs.existsSync(localPath)){
				fs.unlinkSync(localPath);
			}
			exports.tmpFilePathArray.splice(j, 1);
		}
	}
},600000);

exports.gridCreator=function(uid,uname,filesArray,successCallback,failCallback){
	async.each(filesArray, function(file, callback) {
		if(file.flag){
			var readPath = require('path').join(__dirname+'/../',file.path);
			file.readPath=readPath;
			var conn = mongoose.connection;
			var gfs = Grid(conn.db);
			
			var read_stream =  fs.createReadStream(readPath);
			var writestream = gfs.createWriteStream({
				filename: uname+'_'+file.category+'.'+file.extension,
				mode: 'w',
				content_type: file.mimetype,
				root: 'images',
				metadata: {
					ownedBy:uid,
					category:file.category,
					extension:file.extension,
					originalname:file.originalname
				}
			});
			
			read_stream.on('error', function(){
				callback('error');
			});
			writestream.on('error', function(){
				callback('error');
			});
			writestream.on('finish', function(){
				callback();
			});
			
			read_stream.pipe(writestream);
		}else{
			callback();
		}
	}, function(err){
		for(k=0;k<filesArray.length;k++){
			if(filesArray[k].flag){
				if((require('path').basename(filesArray[k].readPath)!=='brick.jpg')&&(require('path').basename(filesArray[k].readPath)!=='camera.png')){
					var delPath = require('path').join(__dirname+'/../',filesArray[k].path);
					if(fs.existsSync(delPath)){
						fs.unlinkSync(delPath);
					}
					var ctr=-1;
					for(i=0;i<exports.tmpFilePathArray.length;i++){
						if(filesArray[k].path===exports.tmpFilePathArray[i].Path){
							ctr=i;
							break;
						}
					}
					if(ctr>-1){
						exports.tmpFilePathArray.splice(ctr, 1);
					}
				}
			}
		}
		
		if(err){
			failCallback();
		}else{
			successCallback();
		}
	});
}

exports.gridDeletor=function(uid,filesArray,successCallback,failCallback){
	async.each(filesArray, function(file, callback) {
		if(file.flag){			
			var conn = mongoose.connection;
			var gfs = Grid(conn.db);
			
			gfs.findOne({'metadata.ownedBy':uid,'metadata.category':file.category, root: 'images'}, function (err, file) {
				if (err){
					console.log(err);
					callback('error');
				}else{
					if(file){
						gfs.remove({_id: file._id, root: 'images'}, function (err) {
							if(err){
								callback('error');
							}else{
								callback();
							}
						});
					}else{
						callback();
					}
				}
			});
		}else{
			callback();
		}
	}, function(err){
		if(err){
			failCallback();
		}else{
			successCallback();
		}
	});
}

exports.gridResponser=function(uid,category,req,res){
	var conn = mongoose.connection;
	var gfs = Grid(conn.db);
	gfs.findOne({'metadata.ownedBy':uid,'metadata.category':category, root: 'images'}, function (err, file) {
		if (err){
			console.log(err);
			res.redirect('/images/icon.png');
		}else{
			if(file){
				if((exports.adminID.equals(req.user._id))||(uid.equals(req.user._id))){
					res.setHeader('Content-type', file.contentType);
					res.setHeader('Content-disposition', 'inline; filename='+file.filename);
					var read_stream = gfs.createReadStream({_id: file._id, root: 'images'});
					read_stream.pipe(res);
				}else{
					res.redirect('/images/icon.png');
				}
			}else{
				res.redirect('/images/icon.png');
			}
		}
	});
}

exports.replacer=function(input,flag){
	if(!flag){
		return input.replace(/　/g,' ').replace(/\t/g,' ').replace(/[^\w\s\/\.\-\"\u0800-\u9fa5]/ig,'').replace(/\s\s+/g,'').trim();
	}else{
		return input.replace(/　/g,' ').replace(/\t/g,' ').replace(/[^\w\s\/\.\-\"\u0800-\u9fa5]/ig,' ').replace(/\s\s+/g,' ').trim();
	}
}


exports.keywordFilter=function(orFlag,orFlagM,testString,testID,keywordArray,keywordArrayM,IDarray){
	var rtnObjson={
		localFlag0:false,
		localFlag1:false,
		localFlag2:false,
		localObjFlag:false
	};
	var ctr;
	
	for(we=0;we<IDarray.length;we++){
		if(IDarray[we].equals(testID)){
			rtnObjson.localFlag0=true;
			rtnObjson.localObjFlag=true;
			break;
		}
	}
	
	if(keywordArray.length>0){
		ctr=0;
		for(k=0;k<keywordArray.length;k++){
			if(!keywordArray[k].flag){
				if(testString.search(keywordArray[k].cnt)>-1){
					ctr++;
				}
			}else{
				var restrictFlag=exports.restrictFinder(keywordArray[k].cnt,testString);
				if(restrictFlag){
					ctr++;
				}
			}
		}
		if(!orFlag){
			if(ctr===keywordArray.length){
				rtnObjson.localFlag1=true;
			}
		}else{
			if(ctr>0){
				rtnObjson.localFlag1=true;
			}
		}
	}else{
		rtnObjson.localFlag1=true;
	}
	
	if(keywordArrayM.length>0){
		ctr=0;
		for(k=0;k<keywordArrayM.length;k++){
			if(!keywordArrayM[k].flag){
				if(testString.search(keywordArrayM[k].cnt)>-1){
					ctr++;
				}
			}else{
				var restrictFlag=exports.restrictFinder(keywordArrayM[k].cnt,testString);
				if(restrictFlag){
					ctr++;
				}
			}
		}
		if(!orFlagM){
			if(ctr===0){
				rtnObjson.localFlag2=true;
			}
		}else{
			if(ctr<keywordArrayM.length){
				rtnObjson.localFlag2=true;
			}
		}
	}else{
		rtnObjson.localFlag2=true;
	}	

	return rtnObjson;
}

exports.arrayPro=function(stringArray,keywordArray,keywordArrayM,IDarray){
	for(i=0;i<stringArray.length;i++){
		if(stringArray[i].charAt(0)==='-'){
			var temper1=stringArray[i].substring(1);
			temper1=temper1.trim();
			if(temper1!==''){
				if((temper1.charAt(0)==='"')&&(temper1.charAt(temper1.length-1)==='"')){
					var tempCnt=temper1.substring(1);
					tempCnt=tempCnt.substring(0,tempCnt.length-1);
					tempCnt=tempCnt.trim();
					if(tempCnt!==''){
						var pusher={
							flag:true,
							cnt:tempCnt.replace(/\./g,'\\.')
						}
						keywordArrayM.push(pusher);
					}
				}else{
					var pusher={
						flag:false,
						cnt:new RegExp(temper1.replace(/\./g,'\\.'),'i')
					}
					keywordArrayM.push(pusher);
				}
			}
		}else if((stringArray[i].charAt(0)==='"')&&(stringArray[i].charAt(stringArray[i].length-1)==='"')){
			var tempCnt=stringArray[i].substring(1);
			tempCnt=tempCnt.substring(0,tempCnt.length-1);
			tempCnt=tempCnt.trim();
			if(tempCnt!==''){
				var pusher={
					flag:true,
					cnt:tempCnt.replace(/\./g,'\\.')
				}
				keywordArray.push(pusher);
			}
		}else{
			var pusher={
				flag:false,
				cnt:new RegExp(stringArray[i].replace(/\./g,'\\.'),'i')
			}
			keywordArray.push(pusher);
		}
		if(mongoose.Types.ObjectId.isValid(stringArray[i])){
			IDarray.push(mongoose.Types.ObjectId(stringArray[i]));
		}
	}
}

exports.restrictFinder=function(finder,befounderOrig){
	var rtnFlag=false;
	var befounder=befounderOrig.replace(/\r\n/g,' \r\n ');
	finder=finder.replace(/%/g,'[^\\w\\u0800-\\u9fa5\\r\\n]+');
	
	var search=befounder.search(new RegExp('(^|[^\\w\\u0800-\\u9fa5\\r\\n])'+finder+'($|[^\\w\\u0800-\\u9fa5\\r\\n])','ig'));
	/*var search1=befounder.search(new RegExp(' '+finder+' ','i'));
	var search2=befounder.search(new RegExp('^'+finder+' ','i'));
	var search3=befounder.search(new RegExp(' '+finder+'$','i'));
	var search4=befounder.search(new RegExp('^'+finder+'$','i'));
	if((search1>-1)||(search2>-1)||(search3>-1)||(search4>-1)){
		rtnFlag=true;
	}*/
	if(search>-1){
		rtnFlag=true;
	}
	return rtnFlag;
}

exports.replacerInner=function(finder,befounder,ifReserveFlag){
	var obj={
		rtn:befounder,
		rtn2:befounder,
		flag:false
	};
	
	var search1=obj.rtn.search(new RegExp(' '+finder+' '));
	var search2=obj.rtn.search(new RegExp('^'+finder+' '));
	var search3=obj.rtn.search(new RegExp(' '+finder+'$'));
	var search4=obj.rtn.search(new RegExp('^'+finder+'$'));
	if(search1===-1){
		search1=Number.MAX_VALUE;
	}
	if(search2===-1){
		search2=Number.MAX_VALUE;
	}
	if(search3===-1){
		search3=Number.MAX_VALUE;
	}
	if(search4===-1){
		search4=Number.MAX_VALUE;
	}
	var min=Math.min(search1, search2, search3, search4);
	var flagX=null;
	if(min!==Number.MAX_VALUE){
		if(min===search1){
			flagX=1;
		}else if(min===search2){
			flagX=2;
		}else if(min===search3){
			flagX=3;
		}else if(min===search4){
			flagX=4;
		}
	}
	
	if(flagX!==null){
		obj.flag=true;
		
		//console.log(obj.rtn);
		var tester1=obj.rtn.match(new RegExp(' '+finder+' '));
		while(tester1!==null){
			obj.rtn=obj.rtn.substring(0,tester1.index)+' '+obj.rtn.substring(tester1.index+tester1[0].length,obj.rtn.length);
			tester1=obj.rtn.match(new RegExp(' '+finder+' '));
			//console.log(obj.rtn);
		}
		
		var tester2=obj.rtn.match(new RegExp('^'+finder+' '));
		if(tester2!==null){
			obj.rtn=obj.rtn.substring(tester2[0].length,obj.rtn.length);
		}
		//console.log(obj.rtn);
		
		var tester3=obj.rtn.match(new RegExp(' '+finder+'$'));
		if(tester3!==null){
			obj.rtn=obj.rtn.substring(0,tester3.index);
		}
		//console.log(obj.rtn);
		var tester4=obj.rtn.match(new RegExp('^'+finder+'$'));
		if(tester4!==null){
			obj.rtn='';
		}
		//console.log(obj.rtn);
		obj.rtn2=obj.rtn;
		if(ifReserveFlag){
			var tempStr=obj.rtn.substring(0,min);
			var tempStr2=obj.rtn.substring(min,obj.rtn.length);
			if(flagX===1){
				obj.rtn2=tempStr+' '+finder+' '+tempStr2;
			}else if(flagX===2){
				obj.rtn2=tempStr+finder+' '+tempStr2;
			}else if(flagX===3){
				obj.rtn2=tempStr+' '+finder+tempStr2;
			}else if(flagX===4){
				obj.rtn2=tempStr+finder+tempStr2;
			}
			obj.rtn2=obj.rtn2.replace(/\s\s+/g,' ').trim();
			//console.log(obj.rtn2);
		}
	}
	return obj;
}

exports.orReplacer=function(input){
	input=exports.spaceParser(input);
	
	var obj={
		rtn:input,
		rtn2:input,
		flag:false,
		flagM:false
	};
	
	var wordArray=[];
	var testArray=[];
	var testFlag;
	var testMatch;
	var itrResponse;
	
	do{
		//console.log('start');
		wordArray=obj.rtn.split(' ');
		for(gm=0;gm<wordArray.length;gm++){
			testFlag=true;
			for(gk=0;gk<testArray.length;gk++){
				if(wordArray[gm]===testArray[gk]){
					testFlag=false;
					break;
				}
			}
			if(testFlag){
				testArray.push(wordArray[gm]);
				break;
			}
		}
		if(testFlag){
			//console.log(gm);
			testMatch=obj.rtn.match(new RegExp(wordArray[gm],'ig'));
			if(testMatch.length>=2){
				itrResponse=exports.replacerInner(wordArray[gm],obj.rtn,true);
				obj.rtn=itrResponse.rtn2;
				obj.rtn2=itrResponse.rtn2;
			}
		}
		//console.log('end');
	}while(testFlag);
	
	
	var notReserveResponse=exports.replacerInner('(""|-""|-)',obj.rtn,false);
	obj.rtn=notReserveResponse.rtn;
	obj.rtn2=notReserveResponse.rtn;
	var orResponse=exports.replacerInner('OR',obj.rtn,true);
	obj.rtn=orResponse.rtn;
	obj.rtn2=orResponse.rtn2;
	obj.flag=orResponse.flag;
	var orResponseM=exports.replacerInner('-OR',obj.rtn,false);
	obj.rtn=orResponseM.rtn;
	obj.flagM=orResponseM.flag;
	obj.rtn2=exports.replacerInner('-OR',obj.rtn2,true).rtn2;
	
	obj.rtn2=obj.rtn2.replace(/%/g,' ');
	return obj;
}

exports.spaceParser=function(input){
	//console.log(input);
	
	var starter=input.match(/^("|-")([\s\S]*?)" /i);
	//console.log(starter[0]);
	if(starter!==null){
		var ctr1;
		var header1;
		if(starter[0].charAt(0)!=='-'){
			ctr1=1;
			header1='&';
		}else{
			ctr1=2;
			header1='-&';
		}
		//console.log('1'+starter[0]);
		var temper1=starter[0].substring(ctr1,starter[0].length-2).trim().replace(/\s/g,'%');
		//console.log('1'+temper1);
		temper1=header1+temper1+'& ';
		//console.log('1'+temper1);
		input=temper1+input.substring(starter[0].length,input.length);
		//console.log('1'+input);
	}
	
	var inner=input.match(/ ("|-")([\s\S]*?)" /i);
	//console.log(inner[0]);
	while(inner!==null){
		var ctr2;
		var header2;
		if(inner[0].charAt(1)!=='-'){
			ctr2=2;
			header2=' &';
		}else{
			ctr2=3;
			header2=' -&';
		}
		//console.log('2'+inner[0]);
		var temper2=inner[0].substring(ctr2,inner[0].length-2).trim().replace(/\s/g,'%');
		//console.log('2'+temper2);
		temper2=header2+temper2+'& ';
		//console.log('2'+temper2);
		input=input.substring(0,inner.index)+temper2+input.substring(inner.index+inner[0].length,input.length);
		//console.log('2'+input);
		inner=input.match(/ ("|-")([\s\S]*?)" /i);
	}
	
	var ender=input.match(/ ("|-")([\s\S]*?)"$/i);
	//console.log(ender[0]);
	if(ender!==null){
		var ctr3;
		var header3;
		if(ender[0].charAt(1)!=='-'){
			ctr3=2;
			header3=' &';
		}else{
			ctr3=3;
			header3=' -&';
		}
		//console.log('3'+ender[0]);
		var temper3=ender[0].substring(ctr3,ender[0].length-1).trim().replace(/\s/g,'%');
		//console.log('3'+temper3);
		temper3=header3+temper3+'&';
		//console.log('3'+temper3);
		input=input.substring(0,ender.index)+temper3;
		//console.log('3'+input);
	}
	var aller=input.match(/^("|-")([\s\S]*?)"$/i);
	if(aller!==null){
		var ctr4;
		var header4;
		if(aller[0].charAt(0)!=='-'){
			ctr4=1;
			header4='&';
		}else{
			ctr4=2;
			header4='-&';
		}
		//console.log('4'+aller[0]);
		var temper4=aller[0].substring(ctr4,aller[0].length-1).trim().replace(/\s/g,'%');
		//console.log('4'+temper4);
		temper4=header4+temper4+'&';
		//console.log('4'+temper4);
		input=temper4;
		//console.log('4'+input);
	}
	input=input.replace(/&/g,'"');
	return input;
}

function redirector(req,res,target,message){
	var formContent={
		F1:req.body.MoneyToLend,
		F2:req.body.InterestRate,
		F3:req.body.MonthPeriod,
		F4:req.body.Message,
		F5:req.body.F5,
		F6:req.body.F6,
		F7:req.body.F7,
		F8:req.body.F8,
		F9:req.body.F9
	};
	
	var json={FormContent:formContent,Target:target,Message:message};
	var string=JSON.stringify(json);
	
	req.flash('confirmForm',string);
	req.session.save(function(err){
		if(err){
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			res.redirect('/lender/story?id='+req.body.FromBorrowRequest);
		}
	});
}

exports.directorDivider = function(dtr,input,type){
	if(type){
		if(dtr==='大至小'){
			if(input.search(/-/)>-1){
				output=input.replace(/-/g,'');
			}else{
				output="-"+input;
			}
		}else if(dtr==='小至大'){
			output=input;
		}
	}else{
		if(dtr==='minus'){
			if(input.search(/-/)>-1){
				output=input.replace(/-/g,'');
			}else{
				output="-"+input;
			}
		}else if(dtr==='plus'){
			output=input;
		}
	}
	return output;
}


exports.arrayFilter=function(array,tgt,lb,ub){
	if((lb!==null)&&(ub!==null)){
		for(v=array.length-1;v>-1;v--){
			if((array[v][tgt]<lb)||(array[v][tgt]>ub)){
				array.splice(v, 1);
			}
		}
	}else if(lb!==null){
		for(v=array.length-1;v>-1;v--){
			if(array[v][tgt]<lb){
				array.splice(v, 1);
			}
		}
	}else if(ub!==null){
		for(v=array.length-1;v>-1;v--){
			if(array[v][tgt]>ub){
				array.splice(v, 1);
			}
		}
	}
}

exports.confirmToBorrowMessage = function(ifRecursive,ctr,ctrTarget,returnSring,req,res,ifAuto,resAddress,ifLenderSide,infoJson,callback){
	var passFlg0=true;
	if(ifRecursive){
		if((typeof(req.body.array[ctr].FromBorrowRequest) !== 'string')||(typeof(req.body.array[ctr].MessageID) !== 'string')){
			passFlg0=false;
		}
	}
	
	if(!passFlg0){
		if(ifRecursive){
			ctr++;
			if(ctr<ctrTarget){
				exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide,infoJson,callback);
			}else{
				if(!ifAuto){
					confirmRedirector(req,res,'有些訊息因錯誤無法被同意!',infoJson,resAddress);
				}else{
					callback();
				}
			}
		}else{
			if(!ifAuto){
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}
		}
	}else{	
		var FBR;
		if(ifRecursive){
			FBR=req.body.array[ctr].FromBorrowRequest;
		}else{
			FBR=req.body.FromBorrowRequest;
		}
		Borrows.findById(FBR).populate('CreatedBy', 'Level').populate("Message","Transaction Status").exec(function (err, borrow){
			if (err) {
				console.log(err);
				if(ifRecursive){
					ctr++;
					if(ctr<ctrTarget){
						exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide,infoJson,callback);
					}else{
						if(!ifAuto){
							confirmRedirector(req,res,'有些訊息因錯誤無法被同意!',infoJson,resAddress);
						}else{
							callback();
						}
					}
				}else{
					if(!ifAuto){
						res.redirect('/message?content='+encodeURIComponent('錯誤!'));
					}
				}
			}else{
				if(!borrow){
					if(ifRecursive){
						ctr++;
						if(ctr<ctrTarget){
							exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide,infoJson,callback);
						}else{
							if(!ifAuto){
								confirmRedirector(req,res,'有些訊息因錯誤無法被同意!',infoJson,resAddress);
							}else{
								callback();
							}
						}
					}else{
						if(!ifAuto){
							res.redirect('/message?content='+encodeURIComponent('錯誤!'));
						}
					}
				}else{
					var optionsX = {
						path: 'Message.Transaction',
						model: Transactions,
						select: 'Principal'
					};
					Messages.populate(borrow, optionsX, function(err, borrow){
						if(err){
							console.log(err);
							if(ifRecursive){
								ctr++;
								if(ctr<ctrTarget){
									exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide,infoJson,callback);
								}else{
									if(!ifAuto){
										confirmRedirector(req,res,'有些訊息因錯誤無法被同意!',infoJson,resAddress);
									}else{
										callback();
									}
								}
							}else{
								if(!ifAuto){
									res.redirect('/message?content='+encodeURIComponent('錯誤!'));
								}
							}
						}else{
							var MID;
							if(ifRecursive){
								MID=req.body.array[ctr].MessageID;
							}else{
								MID=req.body.MessageID;
							}
							Messages.findById(MID).populate('CreatedBy', 'Username Email ifMailValid').populate('SendTo', 'Username Email ifMailValid').populate('FromBorrowRequest', 'StoryTitle').exec(function (err, message){
								if (err) {
									console.log(err);
									if(ifRecursive){
										ctr++;
										if(ctr<ctrTarget){
											exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide,infoJson,callback);
										}else{
											if(!ifAuto){
												confirmRedirector(req,res,'有些訊息因錯誤無法被同意!',infoJson,resAddress);
											}else{
												callback();
											}
										}
									}else{
										if(!ifAuto){
											res.redirect('/message?content='+encodeURIComponent('錯誤!'));
										}
									}
								}else{
									if(!message){
										if(ifRecursive){
											ctr++;
											if(ctr<ctrTarget){
												exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide,infoJson,callback);
											}else{
												if(!ifAuto){
													confirmRedirector(req,res,'有些訊息因錯誤無法被同意!',infoJson,resAddress);
												}else{
													callback();
												}
											}
										}else{
											if(!ifAuto){
												res.redirect('/message?content='+encodeURIComponent('錯誤!'));
											}
										}
									}else{
										if((message.Status!=='NotConfirmed')||(message.Type!=='toBorrow')){
											if(ifRecursive){
												ctr++;
												if(ctr<ctrTarget){
													exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide,infoJson,callback);
												}else{
													if(!ifAuto){
														confirmRedirector(req,res,'有些訊息因錯誤無法被同意!',infoJson,resAddress);
													}else{
														callback();
													}
												}
											}else{
												if(!ifAuto){
													res.redirect('/message?content='+encodeURIComponent('錯誤!'));
												}
											}
										}else{
											var authResult=true;
											
											if(ifLenderSide){
												if(!message.SendTo._id.equals(req.user._id)){
													authResult=false;
												}
											}else{
												if(!message.CreatedBy._id.equals(req.user._id)){
													authResult=false;
												}
											}
											
											if(!authResult){
												if(ifRecursive){
													ctr++;
													if(ctr<ctrTarget){
														exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因認證錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide,infoJson,callback);
													}else{
														if(!ifAuto){
															confirmRedirector(req,res,'有些訊息因認證錯誤無法被同意!',infoJson,resAddress);
														}else{
															callback();
														}
													}
												}else{
													if(!ifAuto){
														res.redirect('/message?content='+encodeURIComponent('認證錯誤!'));
													}
												}
											}else{
												var passFlg1=true;
												if(ifRecursive){
													if(message.FromBorrowRequest._id.toString()!==req.body.array[ctr].FromBorrowRequest){
														passFlg1=false;
													}
												}else{
													if(message.FromBorrowRequest._id.toString()!==req.body.FromBorrowRequest){
														passFlg1=false;
													}
												}
												
												if(!passFlg1){
													if(ifRecursive){
														ctr++;
														if(ctr<ctrTarget){
															exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide,infoJson,callback);
														}else{
															if(!ifAuto){
																confirmRedirector(req,res,'有些訊息因錯誤無法被同意!',infoJson,resAddress);
															}else{
																callback();
															}
														}
													}else{
														if(!ifAuto){
															res.redirect('/message?content='+encodeURIComponent('錯誤!'));
														}
													}
												}else{	
													BankAccounts.findOne({"OwnedBy": message.SendTo}).exec(function (err, lenderBankaccount){
														if (err) {
															console.log(err);
															if(ifRecursive){
																ctr++;
																if(ctr<ctrTarget){
																	exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide,infoJson,callback);
																}else{
																	if(!ifAuto){
																		confirmRedirector(req,res,'有些訊息因錯誤無法被同意!',infoJson,resAddress);
																	}else{
																		callback();
																	}
																}
															}else{
																if(!ifAuto){
																	res.redirect('/message?content='+encodeURIComponent('錯誤!'));
																}
															}
														}else{
															if(!lenderBankaccount){
																if(ifRecursive){
																	ctr++;
																	if(ctr<ctrTarget){
																		exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide,infoJson,callback);
																	}else{
																		if(!ifAuto){
																			confirmRedirector(req,res,'有些訊息因錯誤無法被同意!',infoJson,resAddress);
																		}else{
																			callback();
																		}
																	}
																}else{
																	if(!ifAuto){
																		res.redirect('/message?content='+encodeURIComponent('錯誤!'));
																	}
																}
															}else{
																Lends.findOne({"CreatedBy": message.SendTo}).exec(function (err, lend){
																	if (err) {
																		console.log(err);
																		if(ifRecursive){
																			ctr++;
																			if(ctr<ctrTarget){
																				exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide,infoJson,callback);
																			}else{
																				if(!ifAuto){
																					confirmRedirector(req,res,'有些訊息因錯誤無法被同意!',infoJson,resAddress);
																				}else{
																					callback();
																				}
																			}
																		}else{
																			if(!ifAuto){
																				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
																			}
																		}
																	}else{
																		if(!lend){
																			if(ifRecursive){
																				ctr++;
																				if(ctr<ctrTarget){
																					exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'找不到自動出借設定，待其重新設定後再嘗試',req,res,ifAuto,resAddress,ifLenderSide,infoJson,callback);
																				}else{
																					if(!ifAuto){
																						confirmRedirector(req,res,'找不到自動出借設定，待其重新設定後再嘗試',infoJson,resAddress);
																					}else{
																						callback();
																					}
																				}
																			}else{
																				if(!ifAuto){
																					res.redirect('/message?content='+encodeURIComponent('找不到自動出借設定，待其重新設定後再嘗試'));
																				}
																			}
																		}else{
																			var moneyLendedJson={
																				autoLendCumulated:0,
																			};
																			Transactions.find({"Lender": req.user._id}).populate('Return').populate('CreatedFrom','Type').exec(function (err, transactions){
																				if (err) {
																					console.log(err);
																					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
																				}else{
																					if(transactions.length>0){
																						for(as=0;as<transactions.length;as++){
																							if(transactions[as].CreatedFrom.Type==='toBorrow'){
																								exports.transactionProcessor(transactions[as],false);
																								moneyLendedJson.autoLendCumulated+=transactions[as].PrincipalNotReturn;
																							}
																						}
																					}
																					
																					var maxMoney3;
																					maxMoney3=lend.MaxMoneyToLend-moneyLendedJson.autoLendCumulated;
																					if(maxMoney3<=0){
																						maxMoney3=0;
																					}
																					
																					var maxMoney=parseInt(lenderBankaccount.MoneyInBankAccount);
																					borrow.Got=0;
																					for(r=0;r<borrow.Message.length;r++){
																						if(borrow.Message[r].Status==='Confirmed'){
																							if(borrow.Message[r].Transaction.length>=1){
																								borrow.Got+=(borrow.Message[r].Transaction[0].Principal);
																							}
																						}
																					}
																					var maxMoney2=parseInt(borrow.MoneyToBorrow)-parseInt(borrow.Got);
																					if(maxMoney2<0){
																						maxMoney2=0;
																					}
																					
																					var errorTarget=[];
																					var errorMessage=[];
																					for(i=0;i<3;i++){
																						errorTarget.push(false);
																						errorMessage.push('');
																					}
																					
																					var finalMoneyToLend=null;
																					var finalInterestRate=null;
																					var finalMonthPeriod=null;
																					var returnSringNow=null;
																					if(!ifRecursive){
																						var minMoney=parseInt(message.MoneyToLend);
																						var maxMonth=parseInt(message.MonthPeriod);
																						var minMonth=parseInt(borrow.MonthPeriodAcceptedLowest);
																						var maxRate=parseFloat(message.InterestRate);
																						
																						if(typeof(req.body.MoneyToLend) === 'string'){
																							req.body.MoneyToLend=sanitizer.sanitize(req.body.MoneyToLend.trim());
																							var nowMoney=parseInt(req.body.MoneyToLend);
																							
																							if(req.body.MoneyToLend===''){
																								errorTarget[0]=true;
																								errorMessage[0]='必要參數未填!';
																							}else if(isNaN(nowMoney)){
																								errorTarget[0]=true;
																								errorMessage[0]='非數字參數!';
																							}else if(nowMoney<1){
																								errorTarget[0]=true;
																								errorMessage[0]='錯誤參數!';
																							}else if(nowMoney>maxMoney){
																								errorTarget[0]=true;
																								errorMessage[0]='金額超過您的銀行餘額：'+maxMoney.toFixed(0)+'元!';
																							}else if(nowMoney>maxMoney2){
																								errorTarget[0]=true;
																								errorMessage[0]='金額超過對方所需：'+maxMoney2.toFixed(0)+'元!';
																							}else if(nowMoney>maxMoney3){
																								errorTarget[0]=true;
																								errorMessage[0]='金額超過尚可自動借出金額：'+maxMoney3.toFixed(0)+'元!';
																							}else if((nowMoney<minMoney)&&(minMoney<=maxMoney2)){
																								errorTarget[0]=true;
																								errorMessage[0]='金額少於對方期望：'+minMoney.toFixed(0)+'元!';
																							}
																						}else{
																							req.body.MoneyToLend=''
																							errorTarget[0]=true;
																							errorMessage[0]='未送出!';
																						}
																						
																						if(typeof(req.body.InterestRate) === 'string'){
																							req.body.InterestRate=sanitizer.sanitize(req.body.InterestRate.trim());
																							var rate=(parseFloat(req.body.InterestRate)/100)+exports.serviceChargeRate;//scr
																							
																							if(req.body.InterestRate===''){
																								errorTarget[1]=true;
																								errorMessage[1]='必要參數未填!';
																							}else if(isNaN(rate)){
																								errorTarget[1]=true;
																								errorMessage[1]='非數字參數!';
																							}else if((rate<(0.0001+exports.serviceChargeRate))||(rate>(0.99+exports.serviceChargeRate))){
																								errorTarget[1]=true;
																								errorMessage[1]='錯誤參數!';
																							}else if(rate>maxRate){
																								errorTarget[1]=true;
																								errorMessage[1]='超過該訊息希望利率：'+((maxRate-exports.serviceChargeRate)*100).toFixed(2)+'%!';
																							}
																						}else{
																							req.body.InterestRate=''
																							errorTarget[1]=true;
																							errorMessage[1]='未送出!';
																						}
																						
																						if(typeof(req.body.MonthPeriod) === 'string'){
																							req.body.MonthPeriod=sanitizer.sanitize(req.body.MonthPeriod.trim());
																							var month=parseInt(req.body.MonthPeriod);
																							
																							if(req.body.MonthPeriod===''){
																								errorTarget[2]=true;
																								errorMessage[2]='必要參數未填!';
																							}else if(isNaN(month)){
																								errorTarget[2]=true;
																								errorMessage[2]='非數字參數!';
																							}else if((month<1)||(month>36)){
																								errorTarget[2]=true;
																								errorMessage[2]='錯誤參數!';
																							}else if(month>maxMonth){
																								errorTarget[2]=true;
																								errorMessage[2]='超過該訊息希望期數：'+maxMonth.toFixed(0)+'個月!';
																							}else if(month<minMonth){
																								errorTarget[2]=true;
																								errorMessage[2]='少於對方可接受之最低期數：'+minMonth.toFixed(0)+'個月!';
																							}
																						}else{
																							req.body.MonthPeriod=''
																							errorTarget[2]=true;
																							errorMessage[2]='未送出!';
																						}
																						
																						if(typeof(req.body.Message) !== 'string'){
																							req.body.Message='';
																						}
																						if(typeof(req.body.F5) !== 'string'){
																							req.body.F5=0;
																						}
																						if(typeof(req.body.F6) !== 'string'){
																							req.body.F6=0;
																						}
																						if(typeof(req.body.F7) !== 'string'){
																							req.body.F7=0;
																						}
																						if(typeof(req.body.F8) !== 'string'){
																							req.body.F8=0;
																						}
																						if(typeof(req.body.F9) !== 'string'){
																							req.body.F9=0;
																						}
																						
																						var valiFlag=true;
																						for(k=0;k<errorTarget.length;k++){
																							if(errorTarget[k]){
																								valiFlag=false;
																								break;
																							}
																						}
																						
																						if(valiFlag){
																							if(!borrow.IfReadable){
																								returnSringNow='此訊息因借入方已不需要借款而無法被同意，它已被自動婉拒';
																								returnSring=returnSringNow;
																							}else{
																								finalMoneyToLend=nowMoney;
																								finalInterestRate=rate;
																								finalMonthPeriod=month;
																							}
																						}else{
																							returnSringNow='validation failed.';
																							returnSring=returnSringNow;
																						}
																					}else{
																						var minRate=parseFloat(lend.InterestRate);
																						var minMonth=parseInt(lend.MonthPeriod);
																						var minLevel=parseInt(lend.MinLevelAccepted);
																						var minInterestInFuture=parseInt(lend.MinInterestInFuture);
																						var minMoneyFuture=parseInt(lend.MinMoneyFuture);
																						var minInterestInFutureMonth=parseInt(lend.MinInterestInFutureMonth);
																						var minInterestInFutureMoneyMonth=parseInt(lend.MinInterestInFutureMoneyMonth);
																						var minInterestInFutureDivMoney=parseFloat(lend.MinInterestInFutureDivMoney);
																						
																						var nowMoney2=parseInt(message.MoneyToLend);
																						var rate2=parseFloat(message.InterestRate);
																						var month2=parseInt(message.MonthPeriod);
																						var level2=parseInt(borrow.CreatedBy.Level);
																						var interestInFuture2=exports.interestInFutureCalculator(nowMoney2,rate2,month2);
																						var moneyFuture2=nowMoney2+interestInFuture2;
																						var interestInFutureMonth2=interestInFuture2/month2;
																						var interestInFutureMoneyMonth2=(nowMoney2+interestInFuture2)/month2;
																						var interestInFutureDivMoney2=interestInFuture2/nowMoney2;
																						
																						if(nowMoney2>maxMoney){
																							returnSringNow='有訊息因借款金額超過借出方銀行帳戶內的餘額而無法被同意';
																							returnSring=returnSringNow;
																						}else if(rate2<minRate){
																							returnSringNow='有些訊息因借入方已不需要借款或其條件不合您現在的自動出借設定而無法被同意，它們已被自動婉拒';
																							returnSring=returnSringNow;
																						}else if(month2<minMonth){
																							returnSringNow='有些訊息因借入方已不需要借款或其條件不合您現在的自動出借設定而無法被同意，它們已被自動婉拒';
																							returnSring=returnSringNow;
																						}else if(level2<minLevel){
																							returnSringNow='有些訊息因借入方已不需要借款或其條件不合您現在的自動出借設定而無法被同意，它們已被自動婉拒';
																							returnSring=returnSringNow;
																						}else if(interestInFuture2<minInterestInFuture){
																							returnSringNow='有些訊息因借入方已不需要借款或其條件不合您現在的自動出借設定而無法被同意，它們已被自動婉拒';
																							returnSring=returnSringNow;
																						}else if(moneyFuture2<minMoneyFuture){
																							returnSringNow='有些訊息因借入方已不需要借款或其條件不合您現在的自動出借設定而無法被同意，它們已被自動婉拒';
																							returnSring=returnSringNow;
																						}else if(interestInFutureMonth2<minInterestInFutureMonth){
																							returnSringNow='有些訊息因借入方已不需要借款或其條件不合您現在的自動出借設定而無法被同意，它們已被自動婉拒';
																							returnSring=returnSringNow;
																						}else if(interestInFutureMoneyMonth2<minInterestInFutureMoneyMonth){
																							returnSringNow='有些訊息因借入方已不需要借款或其條件不合您現在的自動出借設定而無法被同意，它們已被自動婉拒';
																							returnSring=returnSringNow;
																						}else if(interestInFutureDivMoney2<minInterestInFutureDivMoney){
																							returnSringNow='有些訊息因借入方已不需要借款或其條件不合您現在的自動出借設定而無法被同意，它們已被自動婉拒';
																							returnSring=returnSringNow;
																						}else if(!borrow.IfReadable){
																							returnSringNow='有些訊息因借入方已不需要借款或其條件不合您現在的自動出借設定而無法被同意，它們已被自動婉拒';
																							returnSring=returnSringNow;
																						}else if(nowMoney2>maxMoney2){
																							if(maxMoney2===0){
																								returnSringNow='有些訊息因借入方已不需要借款或其條件不合您現在的自動出借設定而無法被同意，它們已被自動婉拒';
																								returnSring=returnSringNow;
																							}else{
																								 if(nowMoney2>maxMoney3){
																									if(maxMoney3===0){
																										returnSringNow='有些訊息因借出方所設定之自動借款額度已用盡而無法被同意';
																										returnSring=returnSringNow;
																									}else{
																										finalMoneyToLend=maxMoney3;
																										finalInterestRate=message.InterestRate;
																										finalMonthPeriod=message.MonthPeriod;
																									}
																								}else{
																									finalMoneyToLend=maxMoney2;
																									finalInterestRate=message.InterestRate;
																									finalMonthPeriod=message.MonthPeriod;
																								}
																							}
																						}else if(nowMoney2>maxMoney3){
																							if(maxMoney3===0){
																								returnSringNow='有些訊息因借出方所設定之自動借款額度已用盡而無法被同意';
																								returnSring=returnSringNow;
																							}else{
																								finalMoneyToLend=maxMoney3;
																								finalInterestRate=message.InterestRate;
																								finalMonthPeriod=message.MonthPeriod;
																							}
																						}else{
																							finalMoneyToLend=message.MoneyToLend;
																							finalInterestRate=message.InterestRate;
																							finalMonthPeriod=message.MonthPeriod;
																						}
																					}
																					if((returnSringNow)||(!finalMoneyToLend)||(!finalInterestRate)||(!finalMonthPeriod)){
																						if((returnSringNow!=='有些訊息因借入方已不需要借款或其條件不合您現在的自動出借設定而無法被同意，它們已被自動婉拒')&&(returnSringNow!=='此訊息因借入方已不需要借款而無法被同意，它已被自動婉拒')){
																							if(ifRecursive){
																								ctr++;
																								if(ctr<ctrTarget){
																									exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,returnSring,req,res,ifAuto,resAddress,ifLenderSide,infoJson,callback);
																								}else{
																									if(!ifAuto){
																										confirmRedirector(req,res,returnSring,infoJson,resAddress);
																									}else{
																										callback();
																									}
																								}
																							}else{
																								if(!ifAuto){
																									redirector(req,res,errorTarget,errorMessage);
																								}
																							}
																						}else{
																							message.Status="Rejected";
																							message.Updated = Date.now();
																							message.save(function (err,newUpdate) {
																								if (err){
																									console.log(err);
																									if(ifRecursive){
																										ctr++;
																										if(ctr<ctrTarget){
																											exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide,infoJson,callback);
																										}else{
																											if(!ifAuto){
																												confirmRedirector(req,res,'有些訊息因錯誤無法被同意!',infoJson,resAddress);
																											}else{
																												callback();
																											}
																										}
																									}else{
																										if(!ifAuto){
																											res.redirect('/message?content='+encodeURIComponent('錯誤!'));
																										}
																									}
																								}else{
																									if(ifRecursive){
																										ctr++;
																										if(ctr<ctrTarget){
																											mailReject(message,newUpdate,req);
																											exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,returnSring,req,res,ifAuto,resAddress,ifLenderSide,infoJson,callback);
																										}else{
																											mailReject(message,newUpdate,req);
																											if(!ifAuto){
																												confirmRedirector(req,res,returnSring,infoJson,resAddress);
																											}else{
																												callback();
																											}
																										}
																									}else{
																										mailReject(message,newUpdate,req);
																										
																										if(!ifAuto){
																											res.redirect('/message?content='+encodeURIComponent(returnSring));
																										}
																									}
																								}
																							});
																						}
																					}else{
																						var toCreateTransaction = new Transactions();
																						toCreateTransaction.Principal=finalMoneyToLend;
																						toCreateTransaction.InterestRate=finalInterestRate;
																						toCreateTransaction.MonthPeriod=finalMonthPeriod;
																						toCreateTransaction.CreatedFrom=message._id;
																						toCreateTransaction.Borrower=message.CreatedBy;
																						toCreateTransaction.Lender=message.SendTo;
																						
																						toCreateTransaction.save(function (err,newCreateTransaction) {
																							if (err){
																								console.log(err);
																								if(ifRecursive){
																									ctr++;
																									if(ctr<ctrTarget){
																										exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide,infoJson,callback);
																									}else{
																										if(!ifAuto){
																											confirmRedirector(req,res,'有些訊息因錯誤無法被同意!',infoJson,resAddress);
																										}else{
																											callback();
																										}
																									}
																								}else{
																									if(!ifAuto){
																										res.redirect('/message?content='+encodeURIComponent('錯誤!'));
																									}
																								}
																							}else{
																								BankAccounts.findOne({"OwnedBy": newCreateTransaction.Borrower}).exec(function (err, borrowerBankaccount){
																									if (err) {
																										console.log(err);
																										if(ifRecursive){
																											ctr++;
																											if(ctr<ctrTarget){
																												exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide,infoJson,callback);
																											}else{
																												if(!ifAuto){
																													confirmRedirector(req,res,'有些訊息因錯誤無法被同意!',infoJson,resAddress);
																												}else{
																													callback();
																												}
																											}
																										}else{
																											if(!ifAuto){
																												res.redirect('/message?content='+encodeURIComponent('錯誤!'));
																											}
																										}
																									}else{
																										if(!borrowerBankaccount){
																											if(ifRecursive){
																												ctr++;
																												if(ctr<ctrTarget){
																													exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide,infoJson,callback);
																												}else{
																													if(!ifAuto){
																														confirmRedirector(req,res,'有些訊息因錯誤無法被同意!',infoJson,resAddress);
																													}else{
																														callback();
																													}
																												}
																											}else{
																												if(!ifAuto){
																													res.redirect('/message?content='+encodeURIComponent('錯誤!'));
																												}
																											}
																										}else{
																											borrowerBankaccount.MoneyInBankAccount+=newCreateTransaction.Principal;
																											borrowerBankaccount.Updated=Date.now();
																											borrowerBankaccount.save(function (err,updatedBorrowerBankaccount) {
																												if (err){
																													console.log(err);
																													if(ifRecursive){
																														ctr++;
																														if(ctr<ctrTarget){
																															exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide,infoJson,callback);
																														}else{
																															if(!ifAuto){
																																confirmRedirector(req,res,'有些訊息因錯誤無法被同意!',infoJson,resAddress);
																															}else{
																																callback();
																															}
																														}
																													}else{
																														if(!ifAuto){
																															res.redirect('/message?content='+encodeURIComponent('錯誤!'));
																														}
																													}
																												}else{
																													lenderBankaccount.MoneyInBankAccount-=newCreateTransaction.Principal;
																													lenderBankaccount.Updated=Date.now();
																													lenderBankaccount.save(function (err,updatedLenderBankaccount) {
																														if (err){
																															console.log(err);
																															if(ifRecursive){
																																ctr++;
																																if(ctr<ctrTarget){
																																	exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide,infoJson,callback);
																																}else{
																																	if(!ifAuto){
																																		confirmRedirector(req,res,'有些訊息因錯誤無法被同意!',infoJson,resAddress);
																																	}else{
																																		callback();
																																	}
																																}
																															}else{
																																if(!ifAuto){
																																	res.redirect('/message?content='+encodeURIComponent('錯誤!'));
																																}
																															}
																														}else{				
																															borrow.Got+=newCreateTransaction.Principal;
																															if(borrow.Got>=borrow.MoneyToBorrow){
																																borrow.IfReadable=false;
																															}
																															delete borrow.Got;
																															
																															borrow.Updated=Date.now();
																															borrow.save(function (err,updatedBorrow) {
																																if (err){
																																	console.log(err);
																																	if(ifRecursive){
																																		ctr++;
																																		if(ctr<ctrTarget){
																																			exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide,infoJson,callback);
																																		}else{
																																			if(!ifAuto){
																																				confirmRedirector(req,res,'有些訊息因錯誤無法被同意!',infoJson,resAddress);
																																			}else{
																																				callback();
																																			}
																																		}
																																	}else{
																																		if(!ifAuto){
																																			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
																																		}
																																	}
																																}else{
																																	if(!updatedBorrow.IfReadable){
																																		exports.rejectMessageWhenNotReadable(res,true,'/',updatedBorrow._id,req,function(){});
																																	}
																																	
																																	message.OldMoneyToLend=message.MoneyToLend;
																																	message.OldInterestRate=message.InterestRate;
																																	message.OldMonthPeriod=message.MonthPeriod;
																																	message.MoneyToLend=newCreateTransaction.Principal;
																																	message.InterestRate=newCreateTransaction.InterestRate;
																																	message.MonthPeriod=newCreateTransaction.MonthPeriod;
																																	message.Status='Confirmed';
																																	message.Updated=Date.now();
																																	message.Transaction.push(newCreateTransaction._id);
																																	message.save(function (err,newCreateUpdated) {
																																		if (err){
																																			console.log(err);
																																			if(ifRecursive){
																																				ctr++;
																																				if(ctr<ctrTarget){
																																					exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被同意!',req,res,ifAuto,resAddress,ifLenderSide,infoJson,callback);
																																				}else{
																																					if(!ifAuto){
																																						confirmRedirector(req,res,'有些訊息因錯誤無法被同意!',infoJson,resAddress);
																																					}else{
																																						callback();
																																					}
																																				}
																																			}else{
																																				if(!ifAuto){
																																					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
																																				}
																																			}
																																		}else{
																																			infoJson.counter2+=1;
																																			infoJson.info1+=newCreateUpdated.MoneyToLend;
																																			var tempRate=newCreateUpdated.InterestRate-exports.serviceChargeRate;//scr
																																			var temp1=exports.interestInFutureCalculator(newCreateUpdated.MoneyToLend,tempRate,newCreateUpdated.MonthPeriod);
																																			var temp2=temp1+newCreateUpdated.MoneyToLend;
																																			var temp3;
																																			if(newCreateUpdated.MonthPeriod>0){
																																				temp3=temp1/newCreateUpdated.MonthPeriod;
																																			}else{
																																				temp3=0;
																																			}
																																			var temp4;
																																			if(newCreateUpdated.MonthPeriod>0){
																																				temp4=(temp1+newCreateUpdated.MoneyToLend)/newCreateUpdated.MonthPeriod;
																																			}else{
																																				temp4=0;
																																			}
																																			infoJson.info2+=temp1;
																																			infoJson.info3+=temp2;
																																			infoJson.info4+=temp3;
																																			infoJson.info5+=temp4;
																																			if(ifRecursive){
																																				ctr++;
																																				if(ctr<ctrTarget){
																																					mailAgree(message,newCreateUpdated,req);
																																					exports.confirmToBorrowMessage(ifRecursive,ctr,ctrTarget,returnSring,req,res,ifAuto,resAddress,ifLenderSide,infoJson,callback);
																																				}else{
																																					mailAgree(message,newCreateUpdated,req);
																																					if(!ifAuto){
																																						if(returnSring){	
																																							confirmRedirector(req,res,returnSring,infoJson,resAddress);
																																						}else{
																																							confirmRedirector(req,res,'',infoJson,resAddress);
																																						}
																																					}else{
																																						callback();
																																					}
																																				}
																																			}else{
																																				mailAgree(message,newCreateUpdated,req);
																																				if(!ifAuto){
																																					res.redirect(resAddress);
																																				}
																																			}
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
																						});
																					}
																					
																				}
																			});
																		}
																	}
																});	
															}
														}
													});
												}
											}
										}
									}
								}
							});
						}
					});
				}
			}
		});
	}
}

exports.rejectMessage=function (ifRecursive,ctr,ctrTarget,returnSring,req,res,ifAuto,resAddress,infoJson){
	var passFlg0=true;
	if(ifRecursive){
		if(typeof(req.body.array[ctr].MessageID) !== 'string'){
			passFlg0=false;
		}
	}
	
	if(!passFlg0){
		if(ifRecursive){
			ctr++;
			if(ctr<ctrTarget){
				exports.rejectMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被拒絕!',req,res,ifAuto,resAddress,infoJson);
			}else{
				if(!ifAuto){
					rejectRedirector(req,res,'有些訊息因錯誤無法被拒絕!',infoJson,resAddress);
				}
			}
		}else{
			if(!ifAuto){
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}
		}
	}else{
		var MID;
		if(ifRecursive){
			MID=req.body.array[ctr].MessageID;
		}else{
			MID=req.body.MessageID;
		}
		Messages.findById(MID).populate('CreatedBy', 'Username Email ifMailValid').populate('SendTo', 'Username Email ifMailValid').populate('FromBorrowRequest', 'StoryTitle').exec(function (err, message){
			if (err) {
				console.log(err);
				if(ifRecursive){
					ctr++;
					if(ctr<ctrTarget){
						exports.rejectMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被拒絕!',req,res,ifAuto,resAddress,infoJson);
					}else{
						if(!ifAuto){
							rejectRedirector(req,res,'有些訊息因錯誤無法被拒絕!',infoJson,resAddress);
						}
					}
				}else{
					if(!ifAuto){
						res.redirect('/message?content='+encodeURIComponent('錯誤!'));
					}
				}
			}else{
				if(!message){
					if(ifRecursive){
						ctr++;
						if(ctr<ctrTarget){
							exports.rejectMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被拒絕!',req,res,ifAuto,resAddress,infoJson);
						}else{
							if(!ifAuto){
								rejectRedirector(req,res,'有些訊息因錯誤無法被拒絕!',infoJson,resAddress);
							}
						}
					}else{
						if(!ifAuto){
							res.redirect('/message?content='+encodeURIComponent('錯誤!'));
						}
					}
				}else{			
					if(message.Status!=="NotConfirmed"){
						if(ifRecursive){
							ctr++;
							if(ctr<ctrTarget){
								exports.rejectMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被拒絕!',req,res,ifAuto,resAddress,infoJson);
							}else{
								if(!ifAuto){
									rejectRedirector(req,res,'有些訊息因錯誤無法被拒絕!',infoJson,resAddress);
								}
							}
						}else{
							if(!ifAuto){
								res.redirect('/message?content='+encodeURIComponent('錯誤!'));
							}
						}
					}else{
						if(!message.SendTo._id.equals(req.user._id)){
							if(ifRecursive){
								ctr++;
								if(ctr<ctrTarget){
									exports.rejectMessage(ifRecursive,ctr,ctrTarget,'有些訊息因認證錯誤無法被拒絕!',req,res,ifAuto,resAddress,infoJson);
								}else{
									if(!ifAuto){
										rejectRedirector(req,res,'有些訊息因認證錯誤無法被拒絕!',infoJson,resAddress);
									}
								}
							}else{
								if(!ifAuto){
									res.redirect('/message?content='+encodeURIComponent('認證錯誤!'));
								}
							}
						}else{
							var passFlg1=true;
							if(!ifRecursive){
								if(message.FromBorrowRequest._id.toString()!==req.body.FromBorrowRequest){
									passFlg1=false;
								}
							}
							
							if(!passFlg1){
								if(ifRecursive){
									ctr++;
									if(ctr<ctrTarget){
										exports.rejectMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被拒絕!',req,res,ifAuto,resAddress,infoJson);
									}else{
										if(!ifAuto){
											rejectRedirector(req,res,'有些訊息因錯誤無法被拒絕!',infoJson,resAddress);
										}
									}
								}else{
									if(!ifAuto){
										res.redirect('/message?content='+encodeURIComponent('錯誤!'));
									}
								}
							}else{
								message.Status="Rejected";
								message.Updated = Date.now();
								message.save(function (err,newUpdate) {
									if (err){
										console.log(err);
										if(ifRecursive){
											ctr++;
											if(ctr<ctrTarget){
												exports.rejectMessage(ifRecursive,ctr,ctrTarget,'有些訊息因錯誤無法被拒絕!',req,res,ifAuto,resAddress,infoJson);
											}else{
												if(!ifAuto){
													rejectRedirector(req,res,'有些訊息因錯誤無法被拒絕!',infoJson,resAddress);
												}
											}
										}else{
											if(!ifAuto){
												res.redirect('/message?content='+encodeURIComponent('錯誤!'));
											}
										}
									}else{
										infoJson.counter2+=1;
										if(ifRecursive){
											ctr++;
											if(ctr<ctrTarget){
												mailReject(message,newUpdate,req);
												
												exports.rejectMessage(ifRecursive,ctr,ctrTarget,returnSring,req,res,ifAuto,resAddress,infoJson);
											}else{
												mailReject(message,newUpdate,req);
												
												if(!ifAuto){
													if(returnSring){
														rejectRedirector(req,res,returnSring,infoJson,resAddress);
													}else{
														rejectRedirector(req,res,'',infoJson,resAddress);
													}
												}
											}
										}else{
											mailReject(message,newUpdate,req);
											
											if(!ifAuto){	
												res.redirect(resAddress);
											}
										}
									}
								});
							}
						}
					}
				}
			}
		});
	}
}

exports.rejectMessageWhenNotReadable=function (res,ifAuto,resAddress,borrowID,req,callback){
	Borrows.findById(borrowID).populate('Message', 'Status').exec(function (err, borrow){
		if (err){
			if(!ifAuto){
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}else{
				callback();
			}	
		}else{
			if (!borrow){
				if(!ifAuto){
					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
				}else{
					callback();
				}		
			}else{
				var jsonArray=[];
				for(i=0;i<borrow.Message.length;i++){
					if(borrow.Message[i].Status==='NotConfirmed'){
						jsonArray.push({MsgID:borrow.Message[i]._id});
					}
				}
				if(jsonArray.length>0){
					rejectMessageWhenNotReadableRecursivePart(0,jsonArray.length,res,ifAuto,resAddress,jsonArray,null,req,callback);
				}else{
					if(!ifAuto){
						res.redirect(resAddress);
					}else{
						callback();
					}
				}
			}
		}
	});
}

function rejectMessageWhenNotReadableRecursivePart(ctr,ctrTarget,res,ifAuto,resAddress,array,returnSring,req,callback){
	Messages.findById(array[ctr].MsgID).populate('CreatedBy', 'Username Email ifMailValid').populate('SendTo', 'Username Email ifMailValid').populate('FromBorrowRequest', 'StoryTitle').exec(function (err, message){
		if (err) {
			ctr++;
			if(ctr<ctrTarget){
				rejectMessageWhenNotReadableRecursivePart(ctr,ctrTarget,res,ifAuto,resAddress,array,'有些訊息因錯誤而無法婉拒或被婉拒!',req,callback)
			}else{
				if(!ifAuto){
					res.redirect('/message?content='+encodeURIComponent('錯誤!'));
				}else{
					callback();
				}
			}			
		}else{
			if(!message){
				ctr++;
				if(ctr<ctrTarget){
					rejectMessageWhenNotReadableRecursivePart(ctr,ctrTarget,res,ifAuto,resAddress,array,'有些訊息因錯誤而無法婉拒或被婉拒!',req,callback)
				}else{
					if(!ifAuto){
						res.redirect('/message?content='+encodeURIComponent('錯誤!'));
					}else{
						callback();
					}
				}		
			}else{
				if(message.Status!=="NotConfirmed"){
					ctr++;
					if(ctr<ctrTarget){
						rejectMessageWhenNotReadableRecursivePart(ctr,ctrTarget,res,ifAuto,resAddress,array,'有些訊息因錯誤而無法婉拒或被婉拒!',req,callback)
					}else{
						if(!ifAuto){
							res.redirect('/message?content='+encodeURIComponent('錯誤!'));
						}else{
							callback();
						}
					}		
				}else{
					message.Status="Rejected";
					message.Updated = Date.now();
					message.save(function (err,newUpdate) {
						if(err){
							ctr++;
							if(ctr<ctrTarget){
								rejectMessageWhenNotReadableRecursivePart(ctr,ctrTarget,res,ifAuto,resAddress,array,'有些訊息因錯誤而無法婉拒或被婉拒!',req,callback)
							}else{
								if(!ifAuto){
									res.redirect('/message?content='+encodeURIComponent('錯誤!'));
								}else{
									callback();
								}
							}		
						}else{
							ctr++;
							if(ctr<ctrTarget){
								if(newUpdate.Type==='toBorrow'){
									mailReject(message,newUpdate,req);
								}else if(newUpdate.Type==='toLend'){
									mailRejectLend(message,newUpdate,req);
								}
								rejectMessageWhenNotReadableRecursivePart(ctr,ctrTarget,res,ifAuto,resAddress,array,returnSring,req,callback)
							}else{
								if(newUpdate.Type==='toBorrow'){
									mailReject(message,newUpdate,req);
								}else if(newUpdate.Type==='toLend'){
									mailRejectLend(message,newUpdate,req);
								}
								if(!ifAuto){
									if(returnSring){
										res.redirect('/message?content='+encodeURIComponent(returnSring));
									}else{
										res.redirect(resAddress);
									}
								}else{
									callback();
								}
							}		
						}
					});
				}
			}
		}
	});
}

exports.interestInFutureCalculator=function (money,rate,month){
	rate/=12;
	var interestInFuture=0;
	var tempMonth=month;
	var tempMoney=money;
	for(k=0;k<month;k++){
		if(tempMoney>0){
			interestInFuture+=Math.round(tempMoney*rate);
			var monthlyPaid=Math.floor(tempMoney/tempMonth);
			if(tempMonth>1){
				tempMoney-=monthlyPaid;
			}else{
				tempMoney-=tempMoney;
			}
			tempMonth-=1;
			if(tempMoney<0){
				tempMoney=0;
			}
		}
	}
	return interestInFuture;
}

exports.randomString=function (len, charSet) {
    charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var randomString = '';
    for (var i = 0; i < len; i++) {
    	var randomPoz = Math.floor(Math.random() * charSet.length);
    	randomString += charSet.substring(randomPoz,randomPoz+1);
    }
    return randomString;
}

exports.randomKey = function(len) {
  var buf = []
    , chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    , charlen = chars.length;

  for (var i = 0; i < len; ++i) {
    buf.push(chars[getRandomInt(0, charlen - 1)]);
  }

  return buf.join('');
};

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


//ensureAuthenticated->newMsgChecker->ensureAdmin
exports.newMsgChecker=function (req, res, next) {
	if (!req.isAuthenticated()) { 
		req.newlrmNumber=0;
		req.newlsmNumber=0;
		return next();
	}else{
		Messages.count({$and:[{"SendTo": req.user._id},{"Type": "toBorrow"},{"Status": "NotConfirmed"}]},function (err, count) {
			if (err){
				console.log(err);
				req.newlrmNumber=0;
				req.newlsmNumber=0;
				return next();
			}else{
				req.newlrmNumber=count;
				Messages.count({$and:[{"CreatedBy": req.user._id},{"Type": "toLend"},{"Status": "NotConfirmed"}]},function (err, count2) {
					if (err){
						console.log(err);
						req.newlsmNumber=0;
						return next();
					}else{
						req.newlsmNumber=count2;
						return next();
					}
				});
			}
		});
	}
}

exports.ensureAuthenticated=function (req, res, next) {
	if (req.isAuthenticated()){ 
		if(req.user.keyObj.flag===true){
			if(req.session.secondFactor === 'totp'){
				return next();
			}else{
				//var path=exports.pathProcesser(req,false);
				//res.redirect('/totp_login?path='+path);
				res.render('login',{maxAge:req.session.cookie.maxAge,lgfJSON:req.loginFormJson,newlrmNum:0,newlsmNum:0,userName:null,msg:'請登入'});
			}
		}else{
			return next();
		}
	}else{
		res.render('login',{maxAge:req.session.cookie.maxAge,lgfJSON:req.loginFormJson,newlrmNum:0,newlsmNum:0,userName:null,msg:'請登入'});
	}
}

//add after ensureAuthenticated to confirm ifAdmin
exports.ensureAdmin=function (req, res, next) {
	if(exports.adminID.equals(req.user._id)){ 
		return next(); 
	}else{
		res.render('message',{maxAge:req.session.cookie.maxAge,lgfJSON:req.loginFormJson,newlrmNum:req.newlrmNumber,newlsmNum:req.newlsmNumber,userName:req.user.Username,content:'請以管理員身分登入'});
	}
}

exports.usrNameGenerator=function (req, res, next) {
	req.auRst=null;
	if(req.isAuthenticated()){
		if(req.user.keyObj.flag===true){
			if(req.session.secondFactor === 'totp'){
				req.auRst=req.user.Username;
			}
		}else{
			req.auRst=req.user.Username;
		}
	}
	return next(); 
}

exports.totpDefender=function (req, res, next) {
	if(req.isAuthenticated()){ 
		if (req.user.keyObj.flag===true){
			if (req.session.secondFactor !== 'totp'){
				return next(); 
			}else{
				res.redirect('/');
			}
		}else{
			res.redirect('/');
		}
	}else{
		res.redirect('/');
	}
}

exports.routeChecker=function (origString){
	var stringArray=origString.split('/');
	var subString=stringArray[stringArray.length-1];
	var subStringArray=subString.split('?');
	var target=subStringArray[0];
	if((target==='message')||(target==='forgetActOrPW')||(target==='borrowCreate')||(target==='readable')||(target==='buyInsurance')||(target==='buyInsuranceAll')||(target==='rejectToBorrowMessageInStory')||(target==='confirmToBorrowMessageInStory')||(target==='rejectToBorrowMessageInLRM')||(target==='confirmToBorrowMessageInLRM')||(target==='rejectToBorrowMessageInLRMall')||(target==='confirmToBorrowMessageInLRMall')||(target==='toLendCreate')||(target==='toLendUpdate')||(target==='destroy')||(target==='create')||(target==='update')||(target==='changeData')||(target==='changePW')||(target==='changeUsername')||(target==='deleteToLendMessageInLRMall')||(target==='buyInsuranceAll')||(target==='rejectToBorrowMessageInLRMall')||(target==='confirmToBorrowMessageInLRMall')||(target==='autoConfirmPost')||(target==='disableAutoConfirmPost')||(target==='autoNotReadablePost')||(target==='disableAutoNotReadablePost')){
		return false;
	}else{
		return true;
	}
}

exports.refererChecker=function(req){
	var tester=req.get('referer');
	if(typeof(tester) === 'string'){
		var rootPath=req.protocol+'://'+req.headers.host;
		var regp=new RegExp(rootPath);
		if(tester.search(regp)>-1){
			tester=tester.replace(regp,'');
		}else{
			tester='/'
		}
	}else{
		tester='/'
	}
	return tester;
}

exports.pathProcesser=function (req,flag){
	var origPath;
	if(flag){
		origPath=exports.refererChecker(req);
	}else{
		origPath=req.originalUrl;
	}
	
	var path=encodeURIComponent(base32.encode(origPath).toString());
	
	return path;
}

exports.loginFormChecker=function(req, res, next) {
	var lgfArray=req.flash('loginForm');
	var loginFormJson=null;
	if(lgfArray.length>0){
		loginFormJson=JSON.parse(lgfArray[0]);
	}
	req.loginFormJson=loginFormJson;
	
	if(loginFormJson!==null){
		req.session.save(function(err){
			if(err){
				console.log(err);
				res.redirect('/message?content='+encodeURIComponent('錯誤!'));
			}else{
				return next();
			}
		});
	}else{
		return next();
	}
}

exports.checkSsnID=function(id) {
	var ifDoThis=false;
	if(ifDoThis){
		tab = "ABCDEFGHJKLMNPQRSTUVXYWZIO"                     
		A1 = new Array (1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3 );
		A2 = new Array (0,1,2,3,4,5,6,7,8,9,0,1,2,3,4,5,6,7,8,9,0,1,2,3,4,5 );
		Mx = new Array (9,8,7,6,5,4,3,2,1,1);

		if ( id.length !== 10 ) return false;
		i = tab.search(new RegExp(id.charAt(0),'i'));
		if ( i === -1 ) return false;
		sum = A1[i] + A2[i]*9;

		for ( i=1; i<10; i++ ) {
			v = parseInt( id.charAt(i) );
			if ( isNaN(v) ) return false;
			sum = sum + v * Mx[i];
		}
		if ( sum % 10 !== 0 ) return false;
		return true;
	}else{
		return true;
	}
}

exports.transactionProcessor=function(target,flag){
	var temp=0;
	for(m=0;m<target.Return.length;m++){
		temp+=target.Return[m].InterestNotPaid;
	}
	target.ExtendPrincipal=temp;
	target.TotalPrincipalNow=target.Principal+target.ExtendPrincipal;
	temp=0;
	for(m=0;m<target.Return.length;m++){
		temp+=(target.Return[m].PrincipalShouldPaid-target.Return[m].PrincipalNotPaid);
	}
	target.PrincipalReturn=temp;
	target.PrincipalNotReturn=target.TotalPrincipalNow-target.PrincipalReturn;
	target.MonthPeriodPast=target.Return.length;
	if(target.PrincipalNotReturn<=0){
		target.MonthPeriodLeft=0;
	}else{
		if((target.MonthPeriod-target.MonthPeriodPast)<=0){
			target.MonthPeriodLeft=1;
		}else{
			target.MonthPeriodLeft=(target.MonthPeriod-target.MonthPeriodPast);
		}
	}
	target.TotalMonthPeriodNow=target.MonthPeriodLeft+target.MonthPeriodPast;
	target.ExtendMonthPeriod=target.TotalMonthPeriodNow-target.MonthPeriod;
	temp=0;
	for(m=0;m<target.Return.length;m++){
		temp+=(target.Return[m].ServiceChargeShouldPaid-target.Return[m].ServiceChargeNotPaid);
	}
	target.ServiceCharge=temp;
	temp=0;
	for(m=0;m<target.Return.length;m++){
		temp+=(target.Return[m].InterestShouldPaid-target.Return[m].InterestNotPaid);
	}
	target.Interest=temp;
	target.PrincipalInterest=target.PrincipalReturn+target.Interest;
	if(target.MonthPeriodPast>0){
		target.InterestMonth=target.Interest/target.MonthPeriodPast;
	}else{
		target.InterestMonth=0;
	}
	if(target.MonthPeriodPast>0){
		target.PrincipalInterestMonth=(target.PrincipalReturn+target.Interest)/target.MonthPeriodPast;
	}else{
		target.PrincipalInterestMonth=0;
	}
	if(target.PrincipalReturn>0){
		target.InterestDivPrincipal=target.Interest/target.PrincipalReturn;
	}else{
		target.InterestDivPrincipal=0;
	}
	
	if(flag){
		target.InterestRate-=exports.serviceChargeRate;//scr
		target.InterestInFuture=exports.interestInFutureCalculator(target.PrincipalNotReturn,target.InterestRate,target.MonthPeriodLeft);
		target.MoneyFuture=target.InterestInFuture+target.PrincipalNotReturn;
		if(target.PrincipalNotReturn>0){
			target.InterestInFutureDivMoney=target.InterestInFuture/target.PrincipalNotReturn;
		}else{
			target.InterestInFutureDivMoney=0;
		}
		if(target.MonthPeriodLeft>0){
			target.InterestInFutureMonth=target.InterestInFuture/target.MonthPeriodLeft;
		}else{
			target.InterestInFutureMonth=0;
		}
		if(target.MonthPeriodLeft>0){
			target.InterestInFutureMoneyMonth=(target.InterestInFuture+target.PrincipalNotReturn)/target.MonthPeriodLeft;
		}else{
			target.InterestInFutureMoneyMonth=0;
		}
		target.ReturnCount=0;
		target.previousPayDate=null;
		target.previousPayDateNum=-1;
		for(u=target.Return.length-1;u>-1;u--){
			if((target.Return[u].InterestShouldPaid-target.Return[u].InterestNotPaid)>0){
				target.ReturnCount+=1;
				if(target.previousPayDate===null){
					target.previousPayDate=target.Return[u].Created;
					target.previousPayDateNum=target.Return[u].Created.getTime();
				}
			}
		}
		if((target.MonthPeriodLeft>0)||(target.PrincipalNotReturn>0)){
			var tempDate=new Date(target.Created.getTime());
			tempDate.setTime(tempDate.getTime()+1000*60*60*24*30*(target.MonthPeriodPast+1));
			target.nextPayDate=tempDate;
			target.nextPayDateNum=tempDate.getTime();
		}else{
			target.nextPayDate=null;
			target.nextPayDateNum=Number.MAX_VALUE;
		}
	}
}

exports.messageProcessor=function(target){
	target.InterestRate-=exports.serviceChargeRate;//scr
	target.InterestInFuture=exports.interestInFutureCalculator(target.MoneyToLend,target.InterestRate,target.MonthPeriod);
	target.MoneyFuture=target.InterestInFuture+target.MoneyToLend;
	if(target.MoneyToLend>0){
		target.InterestInFutureDivMoney=target.InterestInFuture/target.MoneyToLend;
	}else{
		target.InterestInFutureDivMoney=0;
	}
	if(target.MonthPeriod>0){
		target.InterestInFutureMonth=target.InterestInFuture/target.MonthPeriod;
	}else{
		target.InterestInFutureMonth=0;
	}
	if(target.MonthPeriod>0){
		target.InterestInFutureMoneyMonth=(target.InterestInFuture+target.MoneyToLend)/target.MonthPeriod;
	}else{
		target.InterestInFutureMoneyMonth=0;
	}
}

exports.userDeleter=function (resRef,uid,successCallback,failCallback,flag){
	Users.findById(uid).exec(function (err, user){
		if (err) {
			console.log(err);
			failCallback();
		}else{
			if(!user){
				failCallback();
			}else{
				user.remove(function (err,removedItem){
					if (err){
						console.log(err);
						failCallback();
					}else{
						Users.find({}).exec(function (err, users){
							if (err) {
								console.log(err);
								failCallback();
							}else{
								async.each(users, function(userFound, callback) {
									exports.userLevelAdderReturn(userFound._id,callback,callback);
								},function(err){
									if(err){
										console.log(err);
										failCallback();
									}else{
										var filesArray=[];
										var IdCard={
											flag:true,
											category:'IdCard'
										};
										var SecondCard={
											flag:true,
											category:'SecondCard'
										};
										filesArray.push(IdCard);
										filesArray.push(SecondCard);
										
										exports.gridDeletor(removedItem._id,filesArray,function(){
											if(!flag){
												resRef.json(removedItem);
											}else{
												successCallback();
											}
										},function(){
											failCallback();
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

exports.userLevelAdderReturn=function (uid,successCallback,failCallback){
	Users.findById(uid).exec(function (err, user){
		if (err) {
			console.log(err);
			failCallback();
		}else{
			Returns.find({Borrower:user._id}).exec(function (err, returns){
				if (err) {
					console.log(err);
					failCallback();
				}else{
					var grade=0;
					for(i=0;i<returns.length;i++){
						var tester=returns[i].ServiceChargeNotPaid+returns[i].InterestNotPaid+returns[i].PrincipalNotPaid;
						if(tester>0){
							grade-=1;
						}else{
							grade+=1;
						}
					}
					var nowGrade=user.OrignalLevel*10;
					nowGrade+=grade;
					if(nowGrade<0){
						nowGrade=0;
					}
					if(nowGrade>200){
						nowGrade=200;
					}

					newLevel=Math.floor(nowGrade/10);
					if(newLevel!==user.Level){
						user.Level=newLevel;
						user.save(function (err,newUpdateUser) {
							if (err){
								console.log(err);
								failCallback();
							}else{
								successCallback();
							}
						});
					}else{
						successCallback();
					}
				}
			});
		}
	});
}

exports.userOriginalLevelSetter=function (uid,newOriginalLevel,successCallback,failCallback){
	Users.findById(uid).exec(function (err, user){
		if (err) {
			console.log(err);
			failCallback();
		}else{
			user.OrignalLevel=newOriginalLevel;
			Returns.find({Borrower:uid}).exec(function (err, returns){
				if (err) {
					console.log(err);
					failCallback();
				}else{
					var grade=0;
					for(i=0;i<returns.length;i++){
						var tester=returns[i].ServiceChargeNotPaid+returns[i].InterestNotPaid+returns[i].PrincipalNotPaid;
						if(tester>0){
							grade-=1;
						}else{
							grade+=1;
						}
					}
					var nowGrade=user.OrignalLevel*10;
					nowGrade+=grade;
					if(nowGrade<0){
						nowGrade=0;
					}
					if(nowGrade>200){
						nowGrade=200;
					}
					newLevel=Math.floor(nowGrade/10);
					user.Level=newLevel;
					user.save(function (err,newUpdateUser) {
						if (err){
							console.log(err);
							failCallback();
						}else{
							successCallback();
						}
					});
				}
			});
		}
	});
}

function confirmRedirector(req,res,content,info,address){
	var json={Content:content,InfoJSON:info};
	var string=JSON.stringify(json);
	
	req.flash('confirmFlash',string);
	req.session.save(function(err){
		if(err){
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			res.redirect(address);
		}
	});
}

function rejectRedirector(req,res,content,info,address){
	var json={Content:content,InfoJSON:info};
	var string=JSON.stringify(json);
	
	req.flash('rejectFlash',string);
	req.session.save(function(err){
		if(err){
			console.log(err);
			res.redirect('/message?content='+encodeURIComponent('錯誤!'));
		}else{
			res.redirect(address);
		}
	});
}

exports.autoNotReadableWorker=function (req,res){
	Borrows.find({}).exec(function (err,borrows){
		if (err) {
			console.log(err);
		}else{
			var prosArray=[];
			for(i=0;i<borrows.length;i++){
				var nowT=Date.now();
				var tester=borrows[i].TimeLimit.getTime()+86400000;
				if(nowT>=tester){
					prosArray.push(borrows[i]);
				}
			}
			if(prosArray.length>0){
				autoNotReadableWorkerRecursive(0,prosArray.length,prosArray,req,res);
			}
		}
	});
}

function autoNotReadableWorkerRecursive(counter,counterTarget,prosArray,req,res){
	var localCtr=counter;
	
	prosArray[localCtr].IfReadable=false;
	prosArray[localCtr].Updated=Date.now();
	prosArray[localCtr].save(function (err,updatedBorrow) {
		if(err){
			counter++;
			if(counter<counterTarget){
				autoNotReadableWorkerRecursive(counter,counterTarget,prosArray,req,res);
			}else{
				console.log('end');
			}
		}else{
			exports.rejectMessageWhenNotReadable(res,true,'/',updatedBorrow._id,req,function(){
				counter++;
				if(counter<counterTarget){
					autoNotReadableWorkerRecursive(counter,counterTarget,prosArray,req,res);
				}else{
					console.log('end');
				}
			});
		}
	});
}

exports.autoWorker=function (day,req,res){
	Lends.find({AutoComfirmToBorrowMsgPeriod:day}).exec(function (err,lends){
		if (err) {
			console.log(err);
		}else{
			if(lends.length>0){
				autoWorkerRecursive(0,lends.length,lends,req,res);
			}
		}
	});
}

function autoWorkerRecursive(counter,counterTarget,lends,req,res){
	var localCtr=counter;

	autoConfirm(req,res,lends[localCtr],function(){
		counter++;
		if(counter<counterTarget){
			autoWorkerRecursive(counter,counterTarget,lends,req,res);
		}else{
			console.log('end');
		}
	});
}

function autoConfirm(req,res,lend,callback){
	if((typeof(lend.AutoComfirmToBorrowMsgDirector) === 'string')&&(typeof(lend.AutoComfirmToBorrowMsgSorter) === 'string')&&(typeof(lend.AutoComfirmToBorrowMsgClassor) === 'string')&&(typeof(lend.AutoComfirmToBorrowMsgKeyWord) === 'string')&&(typeof(lend.AutoComfirmToBorrowMsgLbound) === 'number')&&(typeof(lend.AutoComfirmToBorrowMsgUbound) === 'number')){
		var director=lend.AutoComfirmToBorrowMsgDirector;
		var sorter=lend.AutoComfirmToBorrowMsgSorter;
		var classor=lend.AutoComfirmToBorrowMsgClassor;
		var lboundSave=lend.AutoComfirmToBorrowMsgLbound;
		var uboundSave=lend.AutoComfirmToBorrowMsgUbound;
		var msgKeyword=lend.AutoComfirmToBorrowMsgKeyWord;
		
		if((director!=='minus')&&(director!=='plus')){
			director='minus';
		}
		
		var sorterRec=null;
		
		if((sorter==='InterestInFuture')||(sorter==='MoneyFuture')||(sorter==='InterestInFutureMonth')||(sorter==='InterestInFutureMoneyMonth')||(sorter==='InterestInFutureDivMoney')||(sorter==='Level')){
			sorterRec=exports.directorDivider(director,'Updated',false);
		}else{
			if((sorter!=='InterestRate')&&(sorter!=='MoneyToLend')&&(sorter!=='MonthPeriod')&&(sorter!=='Updated')&&(sorter!=='Created')){
				sorter='InterestRate';
			}
			sorterRec=exports.directorDivider(director,sorter,false);
		}
		
		var lboundRec=null;
		var uboundRec=null;
		
		if(lboundSave!==-1){
			if((sorter==='Updated')||(sorter==='Created')){
				lboundRec=new Date(lboundSave);
			}else if((sorter==='InterestRate')||(sorter==='InterestInFutureDivMoney')){
				lboundRec=parseFloat(lboundSave);
			}else{
				lboundRec=parseInt(lboundSave);
			}
		}
		if(uboundSave!==-1){
			if((sorter==='Updated')||(sorter==='Created')){
				uboundRec=new Date(uboundSave);
			}else if((sorter==='InterestRate')||(sorter==='InterestInFutureDivMoney')){
				uboundRec=parseFloat(uboundSave);
			}else{
				uboundRec=parseInt(uboundSave);
			}
		}
		
		
		var andFindCmdAry=[];
		andFindCmdAry.push({"SendTo": lend.CreatedBy});
		andFindCmdAry.push({"Type": "toBorrow"});
		andFindCmdAry.push({"Status": "NotConfirmed"});
		
		if((sorter!=='InterestInFuture')&&(sorter!=='MoneyFuture')&&(sorter!=='InterestInFutureMonth')&&(sorter!=='InterestInFutureMoneyMonth')&&(sorter!=='InterestInFutureDivMoney')&&(sorter!=='Level')){
			var jsonTemp={};
			if((lboundRec!==null)&&(uboundRec!==null)){
				jsonTemp[sorter]={"$gte": lboundRec, "$lte": uboundRec};
				andFindCmdAry.push(jsonTemp);
			}else if(lboundRec!==null){
				jsonTemp[sorter]={"$gte": lboundRec};
				andFindCmdAry.push(jsonTemp);
			}else if(uboundRec!==null){
				jsonTemp[sorter]={"$lte": uboundRec};
				andFindCmdAry.push(jsonTemp);
			}
		}
		
		var orFlag=false;
		var orFlagM=false;
		var keeper=msgKeyword;
		var orResult=exports.orReplacer(keeper);
		keeper=orResult.rtn;
		msgKeyword=orResult.rtn2;
		orFlag=orResult.flag;
		orFlagM=orResult.flagM;

		var stringArray=keeper.split(' ');
		var keywordArray=[];
		var keywordArrayM=[];
		var msgObjIDarray=[];
		exports.arrayPro(stringArray,keywordArray,keywordArrayM,msgObjIDarray);
		
		var moneyLendedJson={
			autoLendCumulated:0,
			moneyLeftToAutoLend:0
		};
		
		Transactions.find({"Lender": lend.CreatedBy}).populate('Return').populate('CreatedFrom','Type').exec(function (err, transactions){
			if (err) {
				console.log(err);
				callback();
			}else{
				if(transactions.length>0){
					for(i=0;i<transactions.length;i++){
						if(transactions[i].CreatedFrom.Type==='toBorrow'){
							exports.transactionProcessor(transactions[i],false);
							moneyLendedJson.autoLendCumulated+=transactions[i].PrincipalNotReturn;
						}
					}
				}
				moneyLendedJson.moneyLeftToAutoLend=lend.MaxMoneyToLend-moneyLendedJson.autoLendCumulated;
				if(moneyLendedJson.moneyLeftToAutoLend<=0){
					moneyLendedJson.moneyLeftToAutoLend=0;
				}
				if(moneyLendedJson.moneyLeftToAutoLend>0){
					Messages.find({$and:andFindCmdAry}).populate('CreatedBy', 'Username Level').populate('FromBorrowRequest', 'StoryTitle Category').sort(sorterRec).exec(function (err, messages){
						if (err) {
							console.log(err);
							callback();
						}else{
							if(messages.length>0){
								for(j=messages.length-1;j>-1;j--){
									var testString=messages[j].Message+'\r\n'+messages[j].FromBorrowRequest.StoryTitle+'\r\n'+messages[j].CreatedBy.Username;
									var filterResponse=exports.keywordFilter(orFlag,orFlagM,testString,messages[j]._id,keywordArray,keywordArrayM,msgObjIDarray);
																		
									if((!filterResponse.localFlag0)&&((!filterResponse.localFlag1)||(!filterResponse.localFlag2))){
										messages.splice(j, 1);
									}
								}
								
								if((classor==='general')||(classor==='education')||(classor==='family')||(classor==='tour')){
									for(j=messages.length-1;j>-1;j--){
										if(messages[j].FromBorrowRequest.Category!==classor){
											messages.splice(j, 1);
										}
									}
								}
								
								if((sorter==='InterestInFuture')||(sorter==='MoneyFuture')||(sorter==='InterestInFutureMonth')||(sorter==='InterestInFutureMoneyMonth')||(sorter==='InterestInFutureDivMoney')||(sorter==='Level')){
									for(i=0;i<messages.length;i++){
										messages[i].Level=messages[i].CreatedBy.Level;
										exports.messageProcessor(messages[i]);
									}
									
									if(sorter==='InterestInFuture'){
										if(director==='minus'){
											messages.sort(function(a,b) { return parseInt(b.InterestInFuture) - parseInt(a.InterestInFuture)} );
										}else if(director==='plus'){
											messages.sort(function(a,b) { return parseInt(a.InterestInFuture) - parseInt(b.InterestInFuture)} );
										}
										exports.arrayFilter(messages,'InterestInFuture',lboundRec,uboundRec);
									}else if(sorter==='MoneyFuture'){
										if(director==='minus'){
											messages.sort(function(a,b) { return parseInt(b.MoneyFuture) - parseInt(a.MoneyFuture)} );
										}else if(director==='plus'){
											messages.sort(function(a,b) { return parseInt(a.MoneyFuture) - parseInt(b.MoneyFuture)} );
										}
										exports.arrayFilter(messages,'MoneyFuture',lboundRec,uboundRec);
									}else if(sorter==='InterestInFutureMonth'){
										if(director==='minus'){
											messages.sort(function(a,b) { return parseInt(b.InterestInFutureMonth) - parseInt(a.InterestInFutureMonth)} );
										}else if(director==='plus'){
											messages.sort(function(a,b) { return parseInt(a.InterestInFutureMonth) - parseInt(b.InterestInFutureMonth)} );
										}
										exports.arrayFilter(messages,'InterestInFutureMonth',lboundRec,uboundRec);
									}else if(sorter==='InterestInFutureMoneyMonth'){
										if(director==='minus'){
											messages.sort(function(a,b) { return parseInt(b.InterestInFutureMoneyMonth) - parseInt(a.InterestInFutureMoneyMonth)} );
										}else if(director==='plus'){
											messages.sort(function(a,b) { return parseInt(a.InterestInFutureMoneyMonth) - parseInt(b.InterestInFutureMoneyMonth)} );
										}
										exports.arrayFilter(messages,'InterestInFutureMoneyMonth',lboundRec,uboundRec);
									}else if(sorter==='InterestInFutureDivMoney'){
										if(director==='minus'){
											messages.sort(function(a,b) { return parseFloat(b.InterestInFutureDivMoney) - parseFloat(a.InterestInFutureDivMoney)} );
										}else if(director==='plus'){
											messages.sort(function(a,b) { return parseFloat(a.InterestInFutureDivMoney) - parseFloat(b.InterestInFutureDivMoney)} );
										}
										exports.arrayFilter(messages,'InterestInFutureDivMoney',lboundRec,uboundRec);
									}else if(sorter==='Level'){
										if(director==='minus'){
											messages.sort(function(a,b) { return parseFloat(b.Level) - parseFloat(a.Level)} );
										}else if(director==='plus'){
											messages.sort(function(a,b) { return parseFloat(a.Level) - parseFloat(b.Level)} );
										}
										exports.arrayFilter(messages,'Level',lboundRec,uboundRec);
									}
								}
								
								if(messages.length>0){
									var arrayOp=[];
									for(i=0;i<messages.length;i++){
										var temp={FromBorrowRequest:messages[i].FromBorrowRequest._id.toString(),MessageID:messages[i]._id.toString()};
										arrayOp.push(temp);
									}
									var newReq={};
									newReq['body']={};
									newReq['user']={};
									newReq['headers']={};
									newReq.body.array=arrayOp;
									newReq.user._id=lend.CreatedBy;
									newReq.headers.host=req.headers.host;
									newReq.protocol=req.protocol;
									
									var infoJson={counter1:newReq.body.array.length,counter2:0,info1:0,info2:0,info3:0,info4:0,info5:0};
									exports.confirmToBorrowMessage(true,0,newReq.body.array.length,null,newReq,res,true,'/',true,infoJson,callback);
								}else{
									callback();
								}
							}else{
								callback();
							}
						}
					});
				}else{
					callback();
				}
			}
		});
	}else{
		callback();
	}
}

function mailAgree(message,newCreateUpdated,req){
	if(exports.ifMail){
		if(message.CreatedBy.ifMailValid){
			var mailOptions = {
				from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
				to: message.CreatedBy.Username+' <'+message.CreatedBy.Email+'>', // list of receivers
				subject: message.SendTo.Username+'同意了您先前送出的借款請求!', // Subject line
				text: '親愛的 '+message.CreatedBy.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+message.SendTo.Username+' 同意了您先前在「'+message.FromBorrowRequest.StoryTitle+'("'+req.protocol+'://'+req.headers.host+'/lender/story?id='+message.FromBorrowRequest._id+'")」送出的借款請求！'+String.fromCharCode(10)+'您的交易紅利代碼為： '+exports.randomString(8)+String.fromCharCode(10)+'您可至 玉山銀行網站("http://www.esunbank.com.tw/") 兌換紅利喔!'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看訊息與交易結果:'+String.fromCharCode(10)+'"'+req.protocol+'://'+req.headers.host+'/lender/lenderReceiveMessages?msgKeyword='+newCreateUpdated._id+'&filter='+encodeURIComponent('已同意')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1"', // plaintext body
				html: '<img src="cid:bpng" /><br><br>親愛的 '+message.CreatedBy.Username+' 您好：<br><br>'+message.SendTo.Username+' 同意了您先前在「<a href="'+req.protocol+'://'+req.headers.host+'/lender/story?id='+message.FromBorrowRequest._id+'">'+message.FromBorrowRequest.StoryTitle+'</a>」送出的借款請求！<br>您的交易紅利代碼為： <div style="color:#FF0000;display:inline;">'+exports.randomString(8)+'</div><br>您可至 <a href="http://www.esunbank.com.tw/">玉山銀行網站</a> 兌換紅利喔!<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="'+req.protocol+'://'+req.headers.host+'/lender/lenderReceiveMessages?msgKeyword='+newCreateUpdated._id+'&filter='+encodeURIComponent('已同意')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看訊息與交易結果</span></a></td></tr></table>', 
				attachments: [{
					filename: 'b.png',
					path: __dirname+'/../public/images/b.png',
					cid: 'bpng' //same cid value as in the html img src
				}]
			};
			
			transporter.sendMail(mailOptions, function(error, info){
				if(error){
					console.log(error);
				}
			});
		}
		
		if(message.SendTo.ifMailValid){
			var mailOptions2 = {
				from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
				to: message.SendTo.Username+' <'+message.SendTo.Email+'>', // list of receivers
				subject: '您同意了'+message.CreatedBy.Username+'先前送來的借款請求!', // Subject line
				text: '親愛的 '+message.SendTo.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+'您同意了 '+message.CreatedBy.Username+' 先前在「'+message.FromBorrowRequest.StoryTitle+'("'+req.protocol+'://'+req.headers.host+'/lender/story?id='+message.FromBorrowRequest._id+'")」送來的借款請求！'+String.fromCharCode(10)+'您的交易紅利代碼為： '+exports.randomString(8)+String.fromCharCode(10)+'您可至 玉山銀行網站("http://www.esunbank.com.tw/") 兌換紅利喔!'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看訊息與交易結果:'+String.fromCharCode(10)+'"'+req.protocol+'://'+req.headers.host+'/lender/lenderReceiveMessages?msgKeyword='+newCreateUpdated._id+'&filter='+encodeURIComponent('已同意')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1"', // plaintext body
				html: '<img src="cid:bpng" /><br><br>親愛的 '+message.SendTo.Username+' 您好：<br><br>您同意了 '+message.CreatedBy.Username+' 先前在「<a href="'+req.protocol+'://'+req.headers.host+'/lender/story?id='+message.FromBorrowRequest._id+'">'+message.FromBorrowRequest.StoryTitle+'</a>」送來的借款請求！<br>您的交易紅利代碼為： <div style="color:#FF0000;display:inline;">'+exports.randomString(8)+'</div><br>您可至 <a href="http://www.esunbank.com.tw/">玉山銀行網站</a> 兌換紅利喔!<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="'+req.protocol+'://'+req.headers.host+'/lender/lenderReceiveMessages?msgKeyword='+newCreateUpdated._id+'&filter='+encodeURIComponent('已同意')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看訊息與交易結果</span></a></td></tr></table>', 
				attachments: [{
					filename: 'b.png',
					path: __dirname+'/../public/images/b.png',
					cid: 'bpng' //same cid value as in the html img src
				}]
			};
			
			transporter.sendMail(mailOptions2, function(error, info){
				if(error){
					console.log(error);
				}
			});
		}
	}
}

function mailReject(message,newUpdate,req){
	if(exports.ifMail){
		if(message.CreatedBy.ifMailValid){
			var mailOptions = {
				from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
				to: message.CreatedBy.Username+' <'+message.CreatedBy.Email+'>', // list of receivers
				subject: message.SendTo.Username+'婉拒了您先前送出的借款請求!', // Subject line
				text: '親愛的 '+message.CreatedBy.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+message.SendTo.Username+' 婉拒了您先前在「'+message.FromBorrowRequest.StoryTitle+'("'+req.protocol+'://'+req.headers.host+'/lender/story?id='+message.FromBorrowRequest._id+'")」送出的借款請求！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"'+req.protocol+'://'+req.headers.host+'/lender/lenderReceiveMessages?msgKeyword='+newUpdate._id+'&filter='+encodeURIComponent('已婉拒')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1"', // plaintext body
				html: '親愛的 '+message.CreatedBy.Username+' 您好：<br><br>'+message.SendTo.Username+' 婉拒了您先前在「<a href="'+req.protocol+'://'+req.headers.host+'/lender/story?id='+message.FromBorrowRequest._id+'">'+message.FromBorrowRequest.StoryTitle+'</a>」送出的借款請求！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="'+req.protocol+'://'+req.headers.host+'/lender/lenderReceiveMessages?msgKeyword='+newUpdate._id+'&filter='+encodeURIComponent('已婉拒')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>' 
				// html body
			};
			
			transporter.sendMail(mailOptions, function(error, info){
				if(error){
					console.log(error);
				}
			});
		}
		
		if(message.SendTo.ifMailValid){
			var mailOptions2 = {
				from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
				to: message.SendTo.Username+' <'+message.SendTo.Email+'>', // list of receivers
				subject:'您婉拒了'+ message.CreatedBy.Username+'先前送來的借款請求!', // Subject line
				text: '親愛的 '+message.SendTo.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+'您婉拒了 '+message.CreatedBy.Username+' 先前在「'+message.FromBorrowRequest.StoryTitle+'("'+req.protocol+'://'+req.headers.host+'/lender/story?id='+message.FromBorrowRequest._id+'")」送來的借款請求！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"'+req.protocol+'://'+req.headers.host+'/lender/lenderReceiveMessages?msgKeyword='+newUpdate._id+'&filter='+encodeURIComponent('已婉拒')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1"', // plaintext body
				html: '親愛的 '+message.SendTo.Username+' 您好：<br><br>您婉拒了 '+message.CreatedBy.Username+' 先前在「<a href="'+req.protocol+'://'+req.headers.host+'/lender/story?id='+message.FromBorrowRequest._id+'">'+message.FromBorrowRequest.StoryTitle+'</a>」送來的借款請求！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="'+req.protocol+'://'+req.headers.host+'/lender/lenderReceiveMessages?msgKeyword='+newUpdate._id+'&filter='+encodeURIComponent('已婉拒')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>' 
				// html body
			};
			
			transporter.sendMail(mailOptions2, function(error, info){
				if(error){
					console.log(error);
				}
			});
		}
	}
}

function mailRejectLend(message,newUpdate,req){
	if(exports.ifMail){
		if(message.CreatedBy.ifMailValid){
			var mailOptions = {
				from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
				to: message.CreatedBy.Username+' <'+message.CreatedBy.Email+'>', // list of receivers
				subject: message.SendTo.Username+'婉拒了您先前送出的欲借出訊息!', // Subject line
				text: '親愛的 '+message.CreatedBy.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+message.SendTo.Username+' 婉拒了您先前在「'+message.FromBorrowRequest.StoryTitle+'("'+req.protocol+'://'+req.headers.host+'/lender/story?id='+message.FromBorrowRequest._id+'")」送出的欲借出訊息！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"'+req.protocol+'://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newUpdate._id+'&filter='+encodeURIComponent('已被婉拒')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1"', // plaintext body
				html: '親愛的 '+message.CreatedBy.Username+' 您好：<br><br>'+message.SendTo.Username+' 婉拒了您先前在「<a href="'+req.protocol+'://'+req.headers.host+'/lender/story?id='+message.FromBorrowRequest._id+'">'+message.FromBorrowRequest.StoryTitle+'</a>」送出的欲借出訊息！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="'+req.protocol+'://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newUpdate._id+'&filter='+encodeURIComponent('已被婉拒')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>' 
				// html body
			};
			
			transporter.sendMail(mailOptions, function(error, info){
				if(error){
					console.log(error);
				}
			});
		}
		
		if(message.SendTo.ifMailValid){
			var mailOptions2 = {
				from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
				to: message.SendTo.Username+' <'+message.SendTo.Email+'>', // list of receivers
				subject:'您婉拒了'+ message.CreatedBy.Username+'先前送來的欲借出訊息!', // Subject line
				text: '親愛的 '+message.SendTo.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+'您婉拒了 '+message.CreatedBy.Username+' 先前在「'+message.FromBorrowRequest.StoryTitle+'("'+req.protocol+'://'+req.headers.host+'/lender/story?id='+message.FromBorrowRequest._id+'")」送來的欲借出訊息！'+String.fromCharCode(10)+String.fromCharCode(10)+'立刻前往查看:'+String.fromCharCode(10)+'"'+req.protocol+'://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newUpdate._id+'&filter='+encodeURIComponent('已被婉拒')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1"', // plaintext body
				html: '親愛的 '+message.SendTo.Username+' 您好：<br><br>您婉拒了 '+message.CreatedBy.Username+' 先前在「<a href="'+req.protocol+'://'+req.headers.host+'/lender/story?id='+message.FromBorrowRequest._id+'">'+message.FromBorrowRequest.StoryTitle+'</a>」送來的欲借出訊息！<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="'+req.protocol+'://'+req.headers.host+'/lender/lenderSendMessages?msgKeyword='+newUpdate._id+'&filter='+encodeURIComponent('已被婉拒')+'&classor='+encodeURIComponent('不分故事種類')+'&sorter='+encodeURIComponent('更新日期')+'&director='+encodeURIComponent('大至小')+'&lbound=&ubound=&page=1" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻前往查看</span></a></td></tr></table>' 
				// html body
			};
			
			transporter.sendMail(mailOptions2, function(error, info){
				if(error){
					console.log(error);
				}
			});
		}
	}
}

exports.mailValid=function (uid,req,successCallback,failCallback){
	crypto.randomBytes(20, function(err, buf) {
		if(err){
			console.log(err);
			failCallback();
		}else{
			var token = buf.toString('hex');
			Users.findById(uid).exec(function (err, user){
				if (err) {
					console.log(err);
					failCallback();
				}else{
					if(!user){
						failCallback();
					}else{
						user.mailValidToken = token;
						user.mailValidExpires = Date.now() + 3600000; // 1 hour
						user.save(function(err,newUpdated) {
							if(err){
								failCallback();
							}else{
								var mailOptions = {
									from: 'LendingZone <lendingzonesystem@gmail.com>', // sender address
									to: newUpdated.Username+' <'+newUpdated.Email+'>', // list of receivers
									subject: '驗證您於Lending Zone填寫的E-mail', // Subject line
									text: '親愛的 '+newUpdated.Username+' 您好：'+String.fromCharCode(10)+String.fromCharCode(10)+'請點擊下方連結完成E-mail驗證動作'+String.fromCharCode(10)+String.fromCharCode(10)+'"'+req.protocol+'://'+req.headers.host+'/Users/confirmMail?token='+token+'"', // plaintext body
									html: '親愛的 '+newUpdated.Username+' 您好：<br><br>請點擊下方連結完成E-mail驗證動作<br><br><table cellspacing="0" cellpadding="0"><tr><td align="center" width="300" height="40" bgcolor="#000091" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;"><a href="'+req.protocol+'://'+req.headers.host+'/Users/confirmMail?token='+token+'" style="font-size:16px; font-weight: bold; font-family: Helvetica, Arial, sans-serif; text-decoration: none; line-height:40px; width:100%; display:inline-block"><span style="color: #FFFFFF">立刻進行驗證</span></a></td></tr></table>'
								};
								
								transporter.sendMail(mailOptions, function(error, info){
									if(error){
										failCallback();
									}else{
										successCallback();
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

