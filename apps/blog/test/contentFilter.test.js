import test from "node:test";
import assert from "node:assert/strict";
import ContentFilter from "../utils/contentFilter.js";

test("flags payload-style probing comments", () => {
  const payloads = [
    "vpRJ(.,(\"(.',)SRhv",
    "Cznz\",,,..'().",
    "Cznz",
    "jexX,\")),)'(.)",
    "jexX",
    "GvrY.,)))\",,)'",
    "GvrY",
    "TkRx'\"(.),)()(",
  ];

  for (const payload of payloads) {
    const result = ContentFilter.validateReview(payload);
    assert.equal(result.isSpam, true, `Expected to flag: ${payload}`);
    assert.ok(result.score >= 3, `Expected score >= 3 for: ${payload}`);
    assert.ok(
      result.labels.includes("behavioralProbe") ||
        result.labels.includes("spam"),
      `Expected classification label for: ${payload}`,
    );
  }
});

test("flags common SQL injection probes", () => {
  const payload = "' OR 1=1; DROP TABLE users; --";
  const result = ContentFilter.validateReview(payload);

  assert.equal(result.isSpam, true);
  assert.ok(result.details.sqlProbe?.length > 0);
  assert.ok(result.labels.includes("sqlProbe"));
  assert.ok(
    result.reasons.some((reason) => reason.startsWith("sqlProbe:")),
    "Expected SQL probe reason",
  );
});

test("flags common MongoDB/NoSQL probes", () => {
  const payload = '{ "$where": "this.password.length > 0" }';
  const result = ContentFilter.validateReview(payload);

  assert.equal(result.isSpam, true);
  assert.ok(result.details.noSqlProbe?.length > 0);
  assert.ok(result.labels.includes("noSqlProbe"));
});

test("allows normal descriptive reviews", () => {
  const result = ContentFilter.validateReview(
    "Great write-up. I used this pacing tip in my long run and it worked well.",
  );

  assert.equal(result.isSpam, false);
  assert.ok(result.score < 3);
  assert.equal(result.labels.length, 0);
});
