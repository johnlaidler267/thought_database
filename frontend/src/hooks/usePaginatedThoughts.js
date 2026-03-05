import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '../services/supabase'
import { TIMELINE_PAGE_SIZE } from '../constants'

/**
 * Escape a string for use inside Supabase .ilike() pattern (%, _ are special).
 */
function escapeIlike(s) {
  if (typeof s !== 'string') return ''
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

/**
 * Paginated thoughts for the timeline. Fetches pages of TIMELINE_PAGE_SIZE from Supabase.
 * When filters (searchQuery, category, tags) change, list is reset and pagination starts from page 1.
 * Filtering is always done in Supabase (never filter a local array).
 *
 * @param {object} user - Auth user
 * @param {{ searchQuery?: string, category?: string, tags?: string[], sortOrder?: 'asc'|'desc' }} filters - Optional filters; changes reset to page 1
 * @returns {{ thoughts: object[], setThoughts: function, hasMore: boolean, loading: boolean, loadingMore: boolean, loadMore: function, error: Error|null }}
 */
export function usePaginatedThoughts(user, filters = {}) {
  const { searchQuery = '', category = '', tags: activeTags = [], sortOrder = 'desc' } = filters
  const [thoughts, setThoughts] = useState([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const pageRef = useRef(0)
  const filtersKeyRef = useRef(JSON.stringify({ searchQuery, category, tags: activeTags, sortOrder }))

  const fetchPage = useCallback(
    async (page) => {
      if (!user || !supabase) return []

      const from = page * TIMELINE_PAGE_SIZE
      const to = (page + 1) * TIMELINE_PAGE_SIZE - 1

      let query = supabase
        .from('thoughts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: sortOrder === 'asc' })
        .range(from, to)

      // Category: filter by legacy category column (singular). If you add the categories array
      // (run SUPABASE_ADD_CATEGORIES_ARRAY migration), we could also match categories @> [category].
      if (category && category !== 'All') {
        query = query.eq('category', category)
      }

      // Tags: thought must contain ALL selected tags (AND)
      if (Array.isArray(activeTags) && activeTags.length > 0) {
        const normalized = activeTags.map((t) => String(t).trim()).filter(Boolean)
        if (normalized.length > 0) {
          query = query.contains('tags', normalized)
        }
      }

      // Free-text search: cleaned_text or raw_transcript ilike
      if (searchQuery && searchQuery.trim()) {
        const q = escapeIlike(searchQuery.trim())
        const pattern = `%${q}%`
        query = query.or(`cleaned_text.ilike.${pattern},raw_transcript.ilike.${pattern}`)
      }

      const { data, error: err } = await query
      if (err) throw err
      return data ?? []
    },
    [user?.id, searchQuery, category, activeTags, sortOrder]
  )

  const loadFirstPage = useCallback(() => {
    if (!user) {
      setThoughts([])
      setLoading(false)
      setHasMore(false)
      return
    }

    if (!supabase) {
      const mockThoughts = [
        {
          id: '1',
          raw_transcript: 'Um, so I was thinking, like, you know, maybe we should, uh, consider doing this project differently?',
          cleaned_text: 'I was thinking maybe we should consider doing this project differently.',
          tags: ['Idea', 'Task'],
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          raw_transcript: 'Oh, I need to remember to call Sarah tomorrow. She mentioned something about the meeting on Friday.',
          cleaned_text: 'I need to remember to call Sarah tomorrow. She mentioned something about the meeting on Friday.',
          tags: ['Person', 'Task'],
          created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          raw_transcript: 'The idea of building a personal knowledge base is really interesting.',
          cleaned_text: 'The idea of building a personal knowledge base is really interesting.',
          tags: ['Idea'],
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
      ]
      setThoughts(mockThoughts.map((t) => ({ ...t, follow_ups: [], categories: [] })))
      setLoading(false)
      setHasMore(false)
      return
    }

    setLoading(true)
    setError(null)
    pageRef.current = 0

    fetchPage(0)
      .then((data) => {
        const list = (data || []).map((t) => ({
          ...t,
          follow_ups: Array.isArray(t.follow_ups) ? t.follow_ups : [],
          categories: Array.isArray(t.categories) ? t.categories : (t.category ? [t.category] : []),
        }))
        setThoughts(list)
        setHasMore(list.length === TIMELINE_PAGE_SIZE)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error loading thoughts:', err)
        setError(err)
        setThoughts([])
        setHasMore(false)
        setLoading(false)
      })
  }, [user?.id, fetchPage])

  const loadMore = useCallback(() => {
    if (!user || !hasMore || loading || loadingMore) return
    if (!supabase) return

    setLoadingMore(true)
    const nextPage = pageRef.current + 1
    pageRef.current = nextPage

    fetchPage(nextPage)
      .then((data) => {
        const list = (data || []).map((t) => ({
          ...t,
          follow_ups: Array.isArray(t.follow_ups) ? t.follow_ups : [],
          categories: Array.isArray(t.categories) ? t.categories : (t.category ? [t.category] : []),
        }))
        setThoughts((prev) => [...prev, ...list])
        setHasMore(list.length === TIMELINE_PAGE_SIZE)
        setLoadingMore(false)
      })
      .catch((err) => {
        console.error('Error loading more thoughts:', err)
        setHasMore(false)
        setLoadingMore(false)
      })
  }, [user?.id, hasMore, loading, loadingMore, fetchPage])

  // Initial load and when filters change: fetch page 0 (keep showing current list until new data arrives to avoid lag)
  useEffect(() => {
    const filtersKey = JSON.stringify({ searchQuery, category, tags: activeTags, sortOrder })
    if (filtersKey !== filtersKeyRef.current) {
      filtersKeyRef.current = filtersKey
      setHasMore(true)
      // Don't clear thoughts here — loadFirstPage will replace with new data and avoids unmounting everything
    }
    loadFirstPage()
  }, [loadFirstPage, searchQuery, category, activeTags, sortOrder])

  return {
    thoughts,
    setThoughts,
    hasMore,
    loading,
    loadingMore,
    loadMore,
    error,
  }
}
