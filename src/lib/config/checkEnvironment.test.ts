import { describe, expect, it } from "vitest";
import { checkEnvironment } from "./checkEnvironment";
import { resolvePublicUrl } from "./publicUrl";

const SECRET = "x".repeat(48);

describe("checkEnvironment", () => {
  it("accepts a complete production setup", () => {
    const env = {
      OPENROUTER_API_KEY: "sk",
      MAGISTRAL_PUBLIC_URL: "https://magistral.duckdns.org",
      MAGISTRAL_SECRET_KEY: SECRET,
    };
    expect(checkEnvironment(env, true)).toEqual({ errors: [], warnings: [] });
  });

  it("requires the active provider's key, and the Gemini key for Gemini embeddings", () => {
    const { errors } = checkEnvironment({ LLM_PROVIDER: "anthropic", EMBEDDING_PROVIDER: "gemini" }, false);
    expect(errors.join(" ")).toContain("ANTHROPIC_API_KEY");
    expect(errors.join(" ")).toContain("GEMINI_API_KEY");
    expect(checkEnvironment({ LLM_PROVIDER: "outro" }, false).errors[0]).toContain("LLM_PROVIDER");
  });

  it("makes the public URL and secret key errors in production and warnings in development", () => {
    const env = { OPENROUTER_API_KEY: "sk" };
    expect(checkEnvironment(env, true).errors).toHaveLength(2);
    expect(checkEnvironment(env, false)).toMatchObject({ errors: [], warnings: [expect.any(String), expect.any(String)] });
    expect(checkEnvironment({ ...env, MAGISTRAL_PUBLIC_URL: "magistral" }, false).errors[0]).toContain("MAGISTRAL_PUBLIC_URL");
  });
});

describe("resolvePublicUrl", () => {
  it("keeps only the origin", () => {
    expect(resolvePublicUrl("https://magistral.duckdns.org/")).toBe("https://magistral.duckdns.org");
    expect(resolvePublicUrl("  ")).toBeNull();
    expect(resolvePublicUrl("não é url")).toBeNull();
  });
});
