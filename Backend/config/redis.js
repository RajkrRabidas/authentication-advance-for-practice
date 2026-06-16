const { createClient } = require("redis");

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.log("redis url missing");
  process.exit(1);
}


const redisClient = createClient({
  url: redisUrl,
});

redisClient
  .connect()
  .then(() => console.log("connect to redis"))
  .catch(console.error);

module.exports = redisClient;
