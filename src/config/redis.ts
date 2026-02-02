import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL || "", {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

redis.on("connect", () => {
  console.log("🟢 Redis connected");
});

redis.on("error", (err) => {
  console.error("🔴 Redis error:", err.message);
});
