var express = require('express');
var http = require('http');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');


var mongo = require('mongodb').MongoClient;
var dbURI = 'mongodb://localhost/chatDB';

var index = require('./routes/index');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);

var serve = http.createServer(app);
var io = require('socket.io')(serve);

serve.listen(3000, function () {
	console.log('Express sever listening on port ' + 3000);
});

/* User joining and leaving */
io.on('connection', function (socket) {
	console.log('a user connected');
	
	/* Last few msgs to new users to see */
	mongo.connect(dbURI, function(err, db) {
		if(err){
			console.warn(err.message);
		} else {
			var collection = db.collection('msgs');
			var stream = collection.find().sort().limit(6).stream();
			stream.on('data', function(chat) { 
				console.log('emiting chat');
				socket.emit('chat', chat.content);
			});												 
		}
	});
		
	socket.on('disconnect', function () {
		console.log('user disconnected');
	});
	
	/* Broadcasting msg to chat room */
	socket.on('chat', function (msg) {
		mongo.connect(dbURI, function(err, db) {
			if (err) {
				console.warn(err.message);
			} else {
				var collection = db.collection('msgs');
				collection.insert({ content: msg }, function(err, o) {
					if (err) { console.warn(err.message); }
					else { console.log("chat message inserted into db: " + msg); }
				});
			}
		});
		socket.broadcast.emit('chat', msg);
	});
});



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
