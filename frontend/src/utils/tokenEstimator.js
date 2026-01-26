/**
 * Token estimation utility
 * Estimates token count for text using a simple approximation
 * 
 * Common approximations:
 * - ~4 characters = 1 token (for English text)
 * - ~0.75 words = 1 token (for English text)
 * 
 * We use a hybrid approach: count words and characters for better accuracy
 */

/**
 * Estimate token count for a given text
 * @param {string} text - The text to estimate tokens for
 * @returns {number} - Estimated token count
 */
export function estimateTokens(text) {
  if (!text || typeof text !== 'string') {
    return 0
  }

  const trimmedText = text.trim()
  if (trimmedText.length === 0) {
    return 0
  }

  // Count words (split by whitespace)
  const words = trimmedText.split(/\s+/).filter(word => word.length > 0)
  const wordCount = words.length

  // Estimate: ~0.75 words per token (more accurate for English)
  // Fallback to character-based if no words
  if (wordCount > 0) {
    return Math.ceil(wordCount / 0.75)
  }

  // Character-based fallback: ~4 characters per token
  return Math.ceil(trimmedText.length / 4)
}

/**
 * Estimate tokens for transcription (audio input)
 * Since we don't have the actual audio token count, we estimate based on transcript length
 * @param {string} transcript - The transcribed text
 * @returns {number} - Estimated input tokens (audio is typically more tokens than text output)
 */
export function estimateTranscriptionTokens(transcript) {
  // Audio transcription typically uses more input tokens than the output text
  // Rough estimate: 2x the output text tokens (audio encoding is token-heavy)
  const outputTokens = estimateTokens(transcript)
  return Math.ceil(outputTokens * 2)
}

/**
 * Estimate total tokens used for a thought processing pipeline (with transcription)
 * @param {string} rawTranscript - Original transcript
 * @param {string} cleanedText - Cleaned text
 * @param {string[]} tags - Extracted tags
 * @returns {number} - Total estimated tokens used (includes transcription)
 */
export function estimateTotalTokens(rawTranscript, cleanedText, tags = []) {
  // Transcription: input tokens (audio) + output tokens (transcript)
  const transcriptionInputTokens = estimateTranscriptionTokens(rawTranscript)
  const transcriptionOutputTokens = estimateTokens(rawTranscript)
  const transcriptionTokens = transcriptionInputTokens + transcriptionOutputTokens

  // Cleaning: input (raw transcript) + output (cleaned text)
  const cleaningInputTokens = estimateTokens(rawTranscript)
  const cleaningOutputTokens = estimateTokens(cleanedText)
  const cleaningTokens = cleaningInputTokens + cleaningOutputTokens

  // Tagging: input (cleaned text) + output (tags as JSON)
  const taggingInputTokens = estimateTokens(cleanedText)
  const tagsText = Array.isArray(tags) ? tags.join(', ') : ''
  const taggingOutputTokens = estimateTokens(tagsText)
  const taggingTokens = taggingInputTokens + taggingOutputTokens

  return transcriptionTokens + cleaningTokens + taggingTokens
}

/**
 * Estimate tokens for typed thoughts (no transcription, only cleaning + tagging)
 * @param {string} rawText - Original typed text
 * @param {string} cleanedText - Cleaned text
 * @param {string[]} tags - Extracted tags
 * @returns {number} - Total estimated tokens used (cleaning + tagging only)
 */
export function estimateTypedThoughtTokens(rawText, cleanedText, tags = []) {
  // Cleaning: input (raw text) + output (cleaned text)
  const cleaningInputTokens = estimateTokens(rawText)
  const cleaningOutputTokens = estimateTokens(cleanedText)
  const cleaningTokens = cleaningInputTokens + cleaningOutputTokens

  // Tagging: input (cleaned text) + output (tags as JSON)
  const taggingInputTokens = estimateTokens(cleanedText)
  const tagsText = Array.isArray(tags) ? tags.join(', ') : ''
  const taggingOutputTokens = estimateTokens(tagsText)
  const taggingTokens = taggingInputTokens + taggingOutputTokens

  return cleaningTokens + taggingTokens
}
