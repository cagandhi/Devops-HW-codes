var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var uploadRouter = require('./routes/upload');
var factRouter = require('./routes/fact');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/upload', uploadRouter);
app.use('/fact', factRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
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


// for task 5
const redis = require('redis');
const client = redis.createClient(6379, '127.0.0.1', {});
const db = require('./data/db');

// https://stackoverflow.com/a/46599104
function intervalFunc() {
  client.rpop('imageQueue', async function(err,value){
    // queue is not empty
    if( value )
    {
      console.log("Right popping queue image. Writing into DB");
      await db.cat(value);
    }
  });
}
setInterval(intervalFunc, 100);



module.exports = app;
