import { describe, expect, it } from "vitest";
import { hashInvitationToken } from "../../src/lib/auth/tokens";

describe("invitation tokens", () => {
  it("stores a deterministic SHA-256 hash instead of the raw token", () => {
    const raw = "valid-token";
    const hash = hashInvitationToken(raw);
    expect(hash).toBe("397a2a9c5bf5e2ccec38c2596b682bb1bd05fe6e4ecea6c10cf42755ff225403");
    expect(hash).not.toContain(raw);
  });
});
