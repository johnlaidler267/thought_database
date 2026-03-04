import express from 'express'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { TaggingService } from '../services/llm/index.js'

dotenv.config()

const router = express.Router()

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null

const taggingService = new TaggingService({
  groqApiKey: process.env.GROQ_API_KEY,
  timeout: 15000,
})

/**
 * POST /api/people/sync-blurb
 * Async: for each person linked to the thought, append key point and regenerate blurb.
 * Does not block the response—work runs in background.
 * Body: { thoughtId, userId, mentionKeyPoints: { "Name": "point" | null } }
 */
router.post('/sync-blurb', async (req, res) => {
  try {
    const { thoughtId, userId, mentionKeyPoints } = req.body

    if (!thoughtId || !userId || !mentionKeyPoints || typeof mentionKeyPoints !== 'object') {
      return res.status(400).json({ error: 'thoughtId, userId, and mentionKeyPoints required' })
    }

    // Respond immediately; do work in background
    res.status(202).json({ accepted: true })

    if (!supabase || !taggingService.isConfigured()) {
      if (!supabase) console.warn('[sync-blurb] Skipped: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in backend/.env')
      if (!taggingService.isConfigured()) console.warn('[sync-blurb] Skipped: GROQ_API_KEY required in backend/.env')
      return
    }

    // Normalize mentionKeyPoints keys for case-insensitive lookup
    const keyPointsByLower = {}
    for (const [name, point] of Object.entries(mentionKeyPoints)) {
      if (name && (point === null || (typeof point === 'string' && point.trim()))) {
        keyPointsByLower[(name || '').trim().toLowerCase()] = point && String(point).trim() ? point.trim() : null
      }
    }
    if (Object.keys(keyPointsByLower).length === 0) return

    const { data: tpRows, error: tpError } = await supabase
      .from('thought_people')
      .select('person_id')
      .eq('thought_id', thoughtId)

    if (tpError || !tpRows || tpRows.length === 0) return

    const personIds = [...new Set(tpRows.map((r) => r.person_id))]

    const { data: people, error: peopleError } = await supabase
      .from('people')
      .select('id, display_name, key_points')
      .in('id', personIds)
      .eq('user_id', userId)

    if (peopleError || !people) {
      if (peopleError) console.warn('[sync-blurb] People fetch failed:', peopleError.message, '(Run migration SUPABASE_ADD_PEOPLE_KEY_POINTS_AND_BLURB.sql if key_points/blurb columns missing)')
      return
    }

    for (const person of people) {
      const displayName = (person.display_name || '').trim()
      const key = displayName.toLowerCase()
      const keyPoint = keyPointsByLower[key]

      if (keyPoint == null) continue

      const existing = Array.isArray(person.key_points) ? person.key_points : []
      const newKeyPoints = [...existing, keyPoint]

      let blurb = null
      if (taggingService.isConfigured()) {
        blurb = await taggingService.generateBlurb(displayName, newKeyPoints)
      }

      await supabase
        .from('people')
        .update({
          key_points: newKeyPoints,
          blurb: blurb || null,
        })
        .eq('id', person.id)
        .eq('user_id', userId)
    }
  } catch (err) {
    console.error('People sync-blurb error:', err)
  }
})

/**
 * POST /api/people/regenerate-blurb
 * For existing people: fetch their linked thoughts, extract key points from each, generate blurb.
 * Body: { personId, userId }
 */
router.post('/regenerate-blurb', async (req, res) => {
  try {
    const { personId, userId } = req.body

    if (!personId || !userId) {
      return res.status(400).json({ error: 'personId and userId required' })
    }

    if (!supabase || !taggingService.isConfigured()) {
      return res.status(503).json({
        error: 'Blurb service not configured',
        hint: 'Ensure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and GROQ_API_KEY are set in backend/.env',
      })
    }

    const { data: person, error: personError } = await supabase
      .from('people')
      .select('id, display_name, user_id')
      .eq('id', personId)
      .single()

    if (personError || !person || person.user_id !== userId) {
      return res.status(404).json({ error: 'Person not found' })
    }

    const { data: tpRows, error: tpError } = await supabase
      .from('thought_people')
      .select('thought_id')
      .eq('person_id', personId)

    if (tpError || !tpRows || tpRows.length === 0) {
      return res.json({ ok: true, message: 'No thoughts linked to this person', blurb: null })
    }

    const thoughtIds = [...new Set(tpRows.map((r) => r.thought_id))]

    const { data: thoughts, error: thoughtsError } = await supabase
      .from('thoughts')
      .select('id, cleaned_text, raw_transcript')
      .in('id', thoughtIds)
      .eq('user_id', userId)

    if (thoughtsError || !thoughts || thoughts.length === 0) {
      return res.json({ ok: true, message: 'No thoughts found', blurb: null })
    }

    const displayName = (person.display_name || '').trim()
    const keyPoints = []

    for (const thought of thoughts) {
      const text = thought.cleaned_text || thought.raw_transcript || ''
      if (!text.trim()) continue
      const point = await taggingService.extractKeyPointForPerson(text, displayName)
      if (point) keyPoints.push(point)
    }

    let blurb = null
    if (keyPoints.length > 0) {
      blurb = await taggingService.generateBlurb(displayName, keyPoints)
    }

    if (blurb) {
      await supabase
        .from('people')
        .update({ key_points: keyPoints, blurb })
        .eq('id', personId)
        .eq('user_id', userId)
    }

    res.json({ ok: true, blurb, keyPointsCount: keyPoints.length })
  } catch (err) {
    console.error('Regenerate blurb error:', err)
    res.status(500).json({ error: err.message || 'Failed to regenerate blurb' })
  }
})

export default router
