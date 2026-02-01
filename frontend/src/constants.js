/**
 * App-wide constants (tiers, token limits, etc.)
 */

// Free tier token cap per month. Kept low enough to be sustainable without losing money.
// ~25k tokens ≈ 18k words; typical LLM cost is well under $0.01/user/month at this level.
export const FREE_TIER_TOKEN_LIMIT = 25_000

// Apprentice tier: 1M tokens per month (paid $5/month).
export const APPRENTICE_TIER_TOKEN_LIMIT = 1_000_000

// Pro tier has unlimited notarizations (no token cap).
// Sovereign uses the user's own API key (no app token limit).
