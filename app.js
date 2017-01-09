'use strict';
var express = require('express');
var mongoose = require('mongoose');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
var serve = http.createServer(app);
var io = require('socket.io')(serve);

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

// Database connection
var dbURI = 'mongodb://localhost/chatDB';
var Schema = mongoose.Schema;
var msgs = mongoose.model("Msgs", new Schema({ content: String }), 'msgs');

mongoose.connect(dbURI, function (err, db) {
    var collection = msgs;
    collection.insert({ content: msg }, function (err, o) {
        if (err) {
            console.warn(err.message);
        }
        else {
            console.log("chat message inserted into db: " + msg);
        }
    });
});

/* Last 5 msgs seen by new user */
mongoose.connect(dbURI, function () {
    var collection = msgs;
    var stream = collection.find().sort({ _id: -1 }).limit(5).stream();
    stream.on('data', function (chat) {
        socket.emit('chat', chat.content);
    });
});

var db = mongoose.connection;

db.on('connected', function () {
    console.log('Mongoose connected to ' + dbURI);
});
db.on('error', function (err) {
    console.log('Mongoose connection error: ' + err);
});
db.on('disconnected', function () {
    console.log('Mongoose disconnected');
});

//For app termination
process.on('SIGINT', function () {
    gracefulShutdown('app termination', function () {
        process.exit(0);
    });
}); 

//server connection
console.log('server strating prot: ' + app.get('port')  );
serve.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});

io.on('connection', function (socket) {
    console.log('a user connected');
    socket.on('disconnect', function () {
        console.log('user disconnected');
    });

    socket.on('chat', function () {
        socket.broadcast.emit('chat', msg);
    });
});




// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
