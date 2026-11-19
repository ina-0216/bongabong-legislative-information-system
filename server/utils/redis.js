const Redis = require('ioredis');

let redisClient = null;

const getRedisClient = () => {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 100, 3000);
      },
      lazyConnect: process.env.NODE_ENV !== 'production',
    });

    redisClient.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected');
    });

    // In production, fail fast at startup instead of on first request
    if (process.env.NODE_ENV === 'production') {
      redisClient.connect().catch((err) => {
        console.error('[Redis] Failed to connect at startup:', err.message);
      });
    }
  }
  return redisClient;
};

const setWithExpiry = async (key, value, ttlSeconds) => {
  const client = getRedisClient();
  await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
};

const getValueAndDelete = async (key) => {
  const client = getRedisClient();
  // Use a Lua script to atomically get and delete the key
  const script = `
    local data = redis.call('GET', KEYS[1])
    if data then
      redis.call('DEL', KEYS[1])
    end
    return data
  `;
  const result = await client.eval(script, 1, key);
  return result ? JSON.parse(result) : null;
};

const consumeValueIfEqual = async (key, field, expectedValue, client = getRedisClient()) => {
  const script = `
    local data = redis.call('GET', KEYS[1])
    if not data then return 0 end
    local decoded = cjson.decode(data)
    if tostring(decoded[ARGV[1]] or '') ~= ARGV[2] then return 0 end
    redis.call('DEL', KEYS[1])
    return 1
  `;
  return (await client.eval(script, 1, key, field, String(expectedValue))) === 1;
};

const getValue = async (key) => {
  const client = getRedisClient();
  const data = await client.get(key);
  return data ? JSON.parse(data) : null;
};

const deleteKey = async (key) => {
  const client = getRedisClient();
  await client.del(key);
};

const exists = async (key) => {
  const client = getRedisClient();
  return await client.exists(key);
};

const closeRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
};

module.exports = {
  getRedisClient,
  setWithExpiry,
  getValue,
  getValueAndDelete,
  consumeValueIfEqual,
  deleteKey,
  exists,
  closeRedis,
};
