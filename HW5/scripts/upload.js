const multer = require('multer');
const fs = require('fs');

const db = require('../data/db');
const redis = require('redis');
const client = redis.createClient(6379, '127.0.0.1', {});

var express = require('express');
var router = express.Router();

/* GET users listing. */
const upload = multer({ dest: './uploads/' })

router.post('/', upload.single('image'), function (req, res) {
  console.log(req.body) // form fields
  console.log(req.file) // form files

  if (req.file.fieldname === 'image') {
    fs.readFile(req.file.path, async function (err, data) {
      if (err) throw err;
      var img = new Buffer.from(data).toString('base64');

      // await db.cat(img);

      // add image to recent cats image cache
      client.lpush('recentCats', img);
      
      // trimming the list to hold the most recent 5 elements only
      client.ltrim('recentCats', 0, 4);

      // add image to another queue from which images will be read and written into DB later on
      client.lpush('imageQueue', img, function(err, reply) {
        if(!err)
          console.log("Image left pushed to queue");
      });

      res.send('Ok');

    });
  }
});

module.exports = router;
