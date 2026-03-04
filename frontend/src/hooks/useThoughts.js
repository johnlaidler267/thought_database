import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

/**
 * Loads thoughts, thought_people, and people from Supabase for the given user.
 * Returns thoughts, thoughtPeople, peopleMap and their setters so the parent can update them (e.g. after adding/deleting).
 */
export function useThoughts(user) {
  const [thoughts, setThoughts] = useState([])
  const [thoughtPeople, setThoughtPeople] = useState([])
  const [peopleMap, setPeopleMap] = useState({})

  useEffect(() => {
    if (!user) return

    if (!supabase) {
      const mockThoughts = [
        {
          id: '1',
          raw_transcript: 'Um, so I was thinking, like, you know, maybe we should, uh, consider doing this project differently? Like, what if we, um, started with a simpler approach?',
          cleaned_text: 'I was thinking maybe we should consider doing this project differently. What if we started with a simpler approach?',
          tags: ['Idea', 'Task'],
          category: null,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          raw_transcript: 'Oh, I need to remember to call Sarah tomorrow. She mentioned something about, um, the meeting? Yeah, the meeting on Friday.',
          cleaned_text: 'I need to remember to call Sarah tomorrow. She mentioned something about the meeting on Friday.',
          tags: ['Person', 'Task'],
          category: null,
          created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          raw_transcript: 'The idea of, like, building a personal knowledge base is really interesting. It could help me, um, organize my thoughts better and, you know, make connections between different concepts.',
          cleaned_text: 'The idea of building a personal knowledge base is really interesting. It could help me organize my thoughts better and make connections between different concepts.',
          tags: ['Idea'],
          category: null,
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
      ]
      setThoughts(mockThoughts)
      setThoughtPeople([])
      setPeopleMap({})
      return
    }

    let cancelled = false

    async function load() {
      try {
        const { data, error } = await supabase
          .from('thoughts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        const thoughtList = (data || []).map((t) => ({
          ...t,
          follow_ups: Array.isArray(t.follow_ups) ? t.follow_ups : [],
          categories: Array.isArray(t.categories) ? t.categories : (t.category ? [t.category] : []),
        }))
        if (cancelled) return
        setThoughts(thoughtList)

        const thoughtIds = (data || []).map((t) => t.id).filter(Boolean)
        if (thoughtIds.length === 0) {
          setThoughtPeople([])
          setPeopleMap({})
          return
        }

        const { data: tpData, error: tpError } = await supabase
          .from('thought_people')
          .select('thought_id, person_id')
          .in('thought_id', thoughtIds)

        if (tpError) {
          if (!cancelled) setThoughtPeople([])
          if (!cancelled) setPeopleMap({})
          return
        }
        if (cancelled) return
        setThoughtPeople(tpData || [])

        const personIds = [...new Set((tpData || []).map((r) => r.person_id))]
        if (personIds.length === 0) {
          setPeopleMap({})
          return
        }

        const { data: peopleData, error: peopleError } = await supabase
          .from('people')
          .select('id, display_name, clarifier, blurb')
          .in('id', personIds)

        if (peopleError) {
          if (!cancelled) setPeopleMap({})
          return
        }
        const map = {}
        ;(peopleData || []).forEach((p) => {
          map[p.id] = p
        })
        if (!cancelled) setPeopleMap(map)
      } catch (err) {
        console.error('Error loading thoughts:', err)
        if (err.message?.includes('Failed to fetch') || err.message?.includes('ERR_NAME_NOT_RESOLVED')) {
          console.error('⚠️ Cannot connect to Supabase. Check if your Supabase project is active and the URL is correct.')
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  return { thoughts, setThoughts, thoughtPeople, setThoughtPeople, peopleMap, setPeopleMap }
}
