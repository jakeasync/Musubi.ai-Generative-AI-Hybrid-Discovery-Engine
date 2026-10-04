import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Dummy redis so it doesn't crash without env variables locally.
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? Redis.fromEnv()
  : new Redis({ url: "https://dummy.upstash.io", token: "dummy" });

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  analytics: true,
});
