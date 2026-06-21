// supabase/functions/_shared/refund-rules.test.ts
// Mandatory security-critical test for evaluateRefund().
// All four behaviours below are required — this is a gates-vs-money rule.
//
// Run: deno test --allow-env supabase/functions/_shared/refund-rules.test.ts

import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { evaluateRefund } from "./refund-rules.ts";

// Test 1: a Seeker with 0 prior refunds in 30 days -> auto_approved
Deno.test("evaluateRefund: first refund in window -> auto_approved", () => {
  const result = evaluateRefund({
    reasonCode: "blurry",
    priorRefundsIn30d: 0,
    delivered: true,
  });
  assertEquals(result.decision, "auto_approved");
});

// Test 2: a Seeker with 1 prior refund in 30 days -> manual_review
Deno.test("evaluateRefund: repeat refunder (1 prior in 30d) -> manual_review", () => {
  const result = evaluateRefund({
    reasonCode: "wrong_location",
    priorRefundsIn30d: 1,
    delivered: true,
  });
  assertEquals(result.decision, "manual_review");
});

// Test 3: reason 'never_delivered' on an undelivered check -> auto_approved
// regardless of prior refund count (clip genuinely never arrived).
Deno.test("evaluateRefund: never_delivered on undelivered check -> auto_approved even with priors", () => {
  const result = evaluateRefund({
    reasonCode: "never_delivered",
    priorRefundsIn30d: 5,
    delivered: false,
  });
  assertEquals(result.decision, "auto_approved");
});

// Test 4: an unknown reason code -> throws (invalid input rejected at boundary)
Deno.test("evaluateRefund: unknown reason code -> throws", () => {
  assertThrows(
    () =>
      evaluateRefund({
        reasonCode: "totally_fake_reason",
        priorRefundsIn30d: 0,
        delivered: true,
      }),
    Error,
    "invalid refund reason",
  );
});
