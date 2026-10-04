import { recommendRequestSchema } from "../src/lib/schemas";

describe("recommendRequestSchema", () => {
  it("accepts valid requests", () => {
    const res = recommendRequestSchema.safeParse({ prompt: "a good mystery" });
    expect(res.success).toBe(true);
  });

  it("rejects prompts that are too short", () => {
    const res = recommendRequestSchema.safeParse({ prompt: "hi" });
    expect(res.success).toBe(false);
  });
});
