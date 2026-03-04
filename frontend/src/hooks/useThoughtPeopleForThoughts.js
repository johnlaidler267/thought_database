import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../services/supabase'

/**
 * Loads thought_people and people from Supabase for the given thought IDs.
 * Use with paginated thoughts so person/linking data stays in sync for the current list.
 */
export function useThoughtPeopleForThoughts(thoughts) {
  const [thoughtPeople, setThoughtPeople] = useState([])
  const [peopleMap, setPeopleMap] = useState({})
  const thoughtIdsKey = useMemo(
    () => (thoughts?.length ? [...thoughts].map((t) => t.id).filter(Boolean).sort().join(',') : ''),
    [thoughts]
  )

  useEffect(() => {
    if (!thoughtIdsKey || !supabase) {
      setThoughtPeople([])
      setPeopleMap({})
      return
    }

    const thoughtIds = thoughtIdsKey.split(',')
    let cancelled = false

    async function load() {
      const { data: tpData, error: tpError } = await supabase
        .from('thought_people')
        .select('thought_id, person_id')
        .in('thought_id', thoughtIds)

      if (tpError || cancelled) {
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

      if (peopleError || cancelled) {
        if (!cancelled) setPeopleMap({})
        return
      }
      const map = {}
      ;(peopleData || []).forEach((p) => {
        map[p.id] = p
      })
      if (!cancelled) setPeopleMap(map)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [thoughtIdsKey])

  return { thoughtPeople, setThoughtPeople, peopleMap, setPeopleMap }
}
