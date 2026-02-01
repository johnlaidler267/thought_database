/**
 * App-wide constants (tiers, limits, etc.)
 */

// Free tier token cap per month. Kept low enough to be sustainable without losing money.
// ~25k tokens ≈ 18k words; typical LLM cost is well under $0.01/user/month at this level.
export const FREE_TIER_TOKEN_LIMIT = 25_000
