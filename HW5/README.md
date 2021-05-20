# HW5 - Redis

**Name:** Chintan Gandhi <br>
**Unity ID:** cagandhi <br>
**Student ID:** 200315238

## Table of Contents

- [Completing redis workshop](#completing-redis-workshop)
  * [Task 1 Implement a day of week service](#task-1-implement-a-day-of-week-service)
  * [Task 2 Self-destruct message service](#task-2-self-destruct-message-service)
  * [Task 3 Cache best facts calculation](#task-3-cache-best-facts-calculation)
  * [Task 4 Cat picture uploads storage](#task-4-cat-picture-uploads-storage)
  * [Task 5 Regulate uploads with queue](#task-5-regulate-uploads-with-queue)
- [Conceptual Questions](#conceptual-questions)
- [Screencast](#screencast)

## Completing redis workshop

### Task 1 Implement a day of week service

Changes as made by Prof. Parnin. Instantiate a new current date object, get day and pass it as string to response.

The [simple.js](scripts/simple.js) file was modified.

### Task 2 Self-destruct message service

Changes as made by Prof. Parnin. 

For the `tape/` endpoint, fetch a unique random key and set it as key for the key-value pair. Value is the message passed in the request body. Return a JSON response with the unique key in the `read/:id` endpoint.

For the `read/` endpoint, get the key from the Redis DB. If the `ttl` is -1, meaning expiry is not set, set expiry to 10s and initialise the `ttl`. If the expiry is already set, just return a json response displaying how many seconds until expiry of the key.

The [api.js](scripts/api.js) file was modified.

### Task 3 Cache best facts calculation

The changes were made in [index.js](scripts/index.js#L26-L48).

```js
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
```

Get the key named `bestFacts` from the Redis DB. If the value is `null`, this means key does not exist or key has expired. In either case, we fetch the facts from the database and set this record variable for the key `bestFacts` with an expiry of 10 seconds. Since, we can't store a list in Redis, we use `JSON.stringify()` and `JSON.parse()` to store to and read from respectively.

### Task 4 Cat picture uploads storage

The changes were made in [upload.js](scripts/upload.js#L25-L29) and [index.js](scripts/index.js#L16-L24).

`upload.js`
```js
// add image to recent cats image cache
client.lpush('recentCats', img);

// trimming the list to hold the most recent 5 elements only
client.ltrim('recentCats', 0, 4);
```

We create a new Redis list associated with the key named `recentCats` and push images into it from the left. We trim the Redis list so it only holds the most recent 5 elements.

`index.js`
```js
// CACHE RECENT CATS - UPLOAD
var recentCats = [];

client.lrange('recentCats', 0, -1, (err, data) => {
  if (!err && data.length !== 0) {
    console.log("RECENT CATS FOUND IN REDIS");
    recentCats = data;
  }
});
```

We initialise a new variable `recentCats` as empty list which will store the list of recent cat images. We fetch all the elements from list associated with key `recentCats` using the `lrange()` function. If the value exists and is not empty list, store the list to the list variable `recentCats`.

### Task 5 Regulate uploads with queue

The changes were made in [upload.js](scripts/upload.js#L31-L35)  and [app.js](scripts/app.js#L44-L60).

`upload.js`
```js
// add image to another queue from which images will be read and written into DB later on
client.lpush('imageQueue', img, function(err, reply) {
  if(!err)
    console.log("Image left pushed to queue");
});
```

We define a new Redis list associated to key `imageQueue`. This list will store the images rather than them being written to DB directly. We also comment the `await db.cat(img);` call since the DB writing will be done in `app.js` now.

`app.js`
```js
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
```

We define a function named `intervalFunc()` which will be executed at a set interval of 100ms. In this function, we pop an image from the right from the list associated to key `imageQueue`. If the value exists (list is not empty), store the image into the DB using the `await db.cat(value);` function call. 

Since we pushed the images from the left in the `imageQueue` list, we pop from the right of this list so that images which are inserted first into the queue are written first into the DB.

## Conceptual Questions

1. Describe three desirable properties for infrastructure.

* Availability: No or limited interruption to service. Less downtime and the service should be available for the majority of the time.
* Scalable: Increase units or machines providing endpoints to service in case of more demand. Dynamically handle service load.
* Efficient: Avoid dumb work in service and avoid repetitive expensive operations at all costs. Shift work responsibility.

2. Describe some benefits and issues related to using Load Balancers.

**Benefits:**

* Ensures availability of service. The load balancer can move queries from a server which is bogged down by too many requests to other servers which do not have enough load. This way the service is available to all.
* Ensures scalability. Load balancer can request new instances/servers which run the service in order to properly handle the load.

**Issues:**

* Security issues. Load balancers, in order to know where to redirect the request decrypt the request headers and this might lead to extraction of data at this point.
* Load balancers need to be properly configured with the system and require maintenance and updates regularly. This might be costly for small scale teams.

3. What are some reasons for keeping servers in separate availability zones?

* Isolate failures. It helps us more easily find failures in the service.
* Spread risk across zones. If there is some problem in one of the zones and the servers are down in that zone, it isn't going to affect another zone. This ensures availabiity and allows the service to be more robust.
* Useful for supporting certain deployment strategies.

4. Describe the Circuit Breaker and Bulkhead pattern.

**Circuit Breaker pattern:**

* Eliminate connection to faulty service. If the operation is not likely to succeed, the application should not make continuous requests to it. The service should be closed and the application should accept that service has failed and not make connections further on.

**Bulkhead pattern:**

* Isolate components and prevent failure in one component from causing failures in other components. 
* Enforce limits (load shedding) in machines. This allows us to ensure that the component wouldn't fail locally because of resource unavailability, etc.

## Screencast

* [Task 1](https://drive.google.com/file/d/14k1kityMCy0T1l88TqxuioLQ8jMHo-Bl/view?usp=sharing): Implement a day of week service
* [Task 2](https://drive.google.com/file/d/1JNAuhcBO2bhYKO4wVZyzwAitFdja_KSx/view?usp=sharing): Self-destruct message service
* [Task 3](https://drive.google.com/file/d/1lzqJlkYm76Q062b13CsjVsKZPFrlhtUb/view?usp=sharing): Cache best facts calculation
* [Task 4](https://drive.google.com/file/d/1SML_JFn2Rcdjq2wzpcFFpjGm4MlwjXKU/view?usp=sharing): Cat picture uploads storage
* [Task 5](https://drive.google.com/file/d/1ywFwygHKuOYIpotuNNHtkCKwsn5inh3H/view?usp=sharing): Regulate uploads with queue
