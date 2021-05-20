var express = require('express');
var router = express.Router();

const db = require('../data/db');
const redis = require('redis');

const client = redis.createClient(6379, '127.0.0.1', {});

/* GET home page. */
router.get('/', async function(req, res, next) {
  
  // WITH CACHING CODE ADDED
  var dbVotes;

  
  // CACHE RECENT CATS - UPLOAD
  var recentCats = [];

  client.lrange('recentCats', 0, -1, (err, data) => {
    if (!err && data.length !== 0) {
      console.log("RECENT CATS FOUND IN REDIS");
      recentCats = data;
    }
  });

  client.get('bestFacts', async function(err, value)
  {
    // key does not exist
    if(value === null) 
    {
      console.log("KEY DOES NOT EXIST");
      dbVotes = (await db.votes()).slice(0,100);
      client.setex('bestFacts', 10, JSON.stringify(dbVotes));
    }
    // key exists and is within ttl
    else
    {
      console.log("KEY EXISTS");
      dbVotes = JSON.parse(value);
    }

    res.render('index',
    { recentFlag: getFlag('ON'),
      title: 'meow.io',
      recentUploads: recentCats,
      bestFacts: dbVotes
    });
  });
  

  // W/O CACHING CODE
  // res.render('index', 
  //   { recentFlag: getFlag('ON'), 
  //     title: 'meow.io', 
  //     recentUploads: await db.recentCats(5), 
  //     bestFacts: (await db.votes()).slice(0,100) 
  //   });
});

function getFlag(value)
{
  // force undefined flags to be OFF.
  if( value == undefined)
    return false;
  if( value == 'ON' )
    return true;
  if( value == 'OFF')
    return false;
  // any other value is automatically off.
  return false;
}

module.exports = router;
