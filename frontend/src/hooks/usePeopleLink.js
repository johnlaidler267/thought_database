import { useState, useCallback, useMemo } from 'react'
import { supabase } from '../services/supabase'

/**
 * Manages people–thought linking: resolveMentionsToPeople, clarifier/disambiguation/confirmation flows,
 * linkedPeopleByThoughtId, and panel open state. Parent must pass thoughtPeople, peopleMap and their setters
 * (e.g. from useThoughts).
 * @param {Function} [onSyncBlurb] - Optional. Called with (thoughtId) when a person is linked to a thought (e.g. after confirmation/disambiguation). Parent can use this to trigger blurb sync.
 */
export function usePeopleLink(user, thoughtPeople, peopleMap, setThoughtPeople, setPeopleMap, onSyncBlurb) {
  const [openPersonId, setOpenPersonId] = useState(null)
  const [clarifierForPersonId, setClarifierForPersonId] = useState(null)
  const [clarifierForThoughtId, setClarifierForThoughtId] = useState(null)
  const [disambiguationPending, setDisambiguationPending] = useState([])
  const [confirmationPending, setConfirmationPending] = useState([])
  const [clarifierForNewPerson, setClarifierForNewPerson] = useState(null)

  const linkedPeopleByThoughtId = useMemo(() => {
    const out = {}
    const seen = {}
    thoughtPeople.forEach(({ thought_id, person_id }) => {
      const key = String(thought_id)
      const dedupeKey = `${key}:${person_id}`
      if (seen[dedupeKey]) return
      seen[dedupeKey] = true
      const p = peopleMap[person_id]
      if (!p) return
      if (!out[key]) out[key] = []
      out[key].push({ person_id, display_name: p.display_name, clarifier: p.clarifier })
    })
    return out
  }, [thoughtPeople, peopleMap])

  const resolveMentionsToPeople = useCallback(
    async (mentions, thoughtId, userId) => {
      if (!supabase || !userId || !thoughtId || !Array.isArray(mentions) || mentions.length === 0) {
        return {
          newPersonIds: [],
          newThoughtPeople: [],
          newPeopleMap: {},
          disambiguationPending: [],
          confirmationPending: [],
        }
      }
      const normalized = mentions.map((m) => String(m).trim()).filter(Boolean)
      const uniqueByLower = [...new Map(normalized.map((n) => [n.toLowerCase(), n])).values()]

      const { data: existingPeople } = await supabase
        .from('people')
        .select('id, display_name, clarifier')
        .eq('user_id', userId)
      const byLower = {}
      ;(existingPeople || []).forEach((p) => {
        const k = (p.display_name || '').trim().toLowerCase()
        if (!byLower[k]) byLower[k] = []
        byLower[k].push({
          id: p.id,
          display_name: p.display_name || '',
          clarifier: p.clarifier || null,
        })
      })

      const newPeopleMap = {}
      const newPersonIds = []
      const personIdsToLink = []
      const disambiguationPendingOut = []
      const confirmationPendingOut = []

      for (const name of uniqueByLower) {
        const key = name.trim().toLowerCase()
        const matches = byLower[key] || []

        if (matches.length === 0) {
          const { data: inserted, error } = await supabase
            .from('people')
            .insert([{ user_id: userId, display_name: name }])
            .select('id, display_name, clarifier')
            .single()
          if (error) {
            if (error.code === '23505') {
              const { data: list } = await supabase
                .from('people')
                .select('id, display_name, clarifier')
                .eq('user_id', userId)
              const recheck = (list || []).filter(
                (p) => (p.display_name || '').trim().toLowerCase() === key
              )
              if (recheck.length === 1) {
                confirmationPendingOut.push({
                  thoughtId,
                  name,
                  person: {
                    id: recheck[0].id,
                    display_name: recheck[0].display_name || '',
                    clarifier: recheck[0].clarifier || null,
                  },
                })
                byLower[key] = recheck.map((p) => ({
                  id: p.id,
                  display_name: p.display_name || '',
                  clarifier: p.clarifier || null,
                }))
              } else if (recheck.length > 1) {
                disambiguationPendingOut.push({
                  thoughtId,
                  name,
                  people: recheck.map((p) => ({
                    id: p.id,
                    display_name: p.display_name || '',
                    clarifier: p.clarifier || null,
                  })),
                })
              }
            }
            continue
          }
          newPeopleMap[inserted.id] = {
            id: inserted.id,
            display_name: inserted.display_name,
            clarifier: inserted.clarifier,
          }
          newPersonIds.push(inserted.id)
          personIdsToLink.push(inserted.id)
          byLower[key] = [
            {
              id: inserted.id,
              display_name: inserted.display_name,
              clarifier: inserted.clarifier,
            },
          ]
        } else if (matches.length === 1) {
          confirmationPendingOut.push({ thoughtId, name, person: matches[0] })
        } else {
          disambiguationPendingOut.push({ thoughtId, name, people: matches })
        }
      }

      const newThoughtPeople = personIdsToLink.map((person_id) => ({ thought_id: thoughtId, person_id }))
      if (newThoughtPeople.length > 0) {
        await supabase
          .from('thought_people')
          .upsert(newThoughtPeople, { onConflict: 'thought_id,person_id' })
      }
      return {
        newPersonIds,
        newThoughtPeople,
        newPeopleMap,
        disambiguationPending: disambiguationPendingOut,
        confirmationPending: confirmationPendingOut,
      }
    },
    []
  )

  const handleClarifierSubmit = useCallback(
    async (personId, clarifier) => {
      if (!personId || !supabase || !user) return
      setClarifierForPersonId(null)
      setClarifierForThoughtId(null)
      try {
        await supabase
          .from('people')
          .update({ clarifier: clarifier || null })
          .eq('id', personId)
          .eq('user_id', user.id)
        setPeopleMap((prev) => {
          const p = prev[personId]
          return p ? { ...prev, [personId]: { ...p, clarifier: clarifier || null } } : prev
        })
      } catch (err) {
        console.error('Update clarifier:', err)
      }
    },
    [user, setPeopleMap]
  )

  const handleClarifierDismiss = useCallback(() => {
    setClarifierForPersonId(null)
    setClarifierForThoughtId(null)
  }, [])

  const handleConfirmationChoose = useCallback(
    (thoughtId, name, choice) => {
      if (!user) return
      const thoughtIdStr = String(thoughtId)
      setConfirmationPending((prev) => {
        const i = prev.findIndex((e) => String(e.thoughtId) === thoughtIdStr && e.name === name)
        if (i === -1) return prev
        const entry = prev[i]
        if (choice === 'yes') {
          const { id: personId, display_name, clarifier } = entry.person
          setPeopleMap((p) => ({ ...p, [personId]: { id: personId, display_name, clarifier } }))
          supabase
            .from('thought_people')
            .upsert([{ thought_id: thoughtIdStr, person_id: personId }], {
              onConflict: 'thought_id,person_id',
            })
            .then(() => {
              setThoughtPeople((p) => [...p, { thought_id: thoughtIdStr, person_id: personId }])
              onSyncBlurb?.(thoughtIdStr)
            })
        } else {
          setClarifierForNewPerson({ thoughtId: thoughtIdStr, name })
        }
        return prev.filter((_, j) => j !== i)
      })
    },
    [user, setThoughtPeople, setPeopleMap, onSyncBlurb]
  )

  const handleNewPersonClarifierComplete = useCallback(
    async (thoughtId, name, clarifier) => {
      if (!supabase || !user) return
      setClarifierForNewPerson(null)
      const thoughtIdStr = String(thoughtId)
      const { data: inserted, error } = await supabase
        .from('people')
        .insert([{ user_id: user.id, display_name: name, clarifier: clarifier || null }])
        .select('id, display_name, clarifier')
        .single()
      if (error) {
        console.error('Create person (new person clarifier):', error)
        return
      }
      setPeopleMap((prev) => ({
        ...prev,
        [inserted.id]: {
          id: inserted.id,
          display_name: inserted.display_name,
          clarifier: inserted.clarifier,
        },
      }))
      await supabase
        .from('thought_people')
        .upsert([{ thought_id: thoughtIdStr, person_id: inserted.id }], {
          onConflict: 'thought_id,person_id',
        })
      setThoughtPeople((prev) => [...prev, { thought_id: thoughtIdStr, person_id: inserted.id }])
      onSyncBlurb?.(thoughtIdStr)
    },
    [user, setThoughtPeople, setPeopleMap, onSyncBlurb]
  )

  const handleDisambiguationChoose = useCallback(
    async (thoughtId, name, choice) => {
      if (!supabase || !user) return
      const thoughtIdStr = String(thoughtId)
      let entry
      setDisambiguationPending((prev) => {
        const i = prev.findIndex(
          (e) => String(e.thoughtId) === thoughtIdStr && e.name === name
        )
        if (i === -1) return prev
        entry = prev[i]
        return prev.filter((_, j) => j !== i)
      })
      if (!entry) return
      if (choice === 'new') {
        const { data: inserted, error } = await supabase
          .from('people')
          .insert([{ user_id: user.id, display_name: name }])
          .select('id, display_name, clarifier')
          .single()
        if (error) {
          console.error('Create person for disambiguation:', error)
          return
        }
        setPeopleMap((prev) => ({
          ...prev,
          [inserted.id]: {
            id: inserted.id,
            display_name: inserted.display_name,
            clarifier: inserted.clarifier,
          },
        }))
        await supabase
          .from('thought_people')
          .upsert([{ thought_id: thoughtIdStr, person_id: inserted.id }], {
            onConflict: 'thought_id,person_id',
          })
        setThoughtPeople((prev) => [...prev, { thought_id: thoughtIdStr, person_id: inserted.id }])
        setClarifierForPersonId(inserted.id)
        setClarifierForThoughtId(thoughtIdStr)
        onSyncBlurb?.(thoughtIdStr)
      } else {
        const personId = choice
        const person = entry.people.find((p) => p.id === personId)
        if (person) {
          setPeopleMap((prev) => ({
            ...prev,
            [personId]: {
              id: person.id,
              display_name: person.display_name,
              clarifier: person.clarifier,
            },
          }))
        }
        await supabase
          .from('thought_people')
          .upsert([{ thought_id: thoughtIdStr, person_id: personId }], {
            onConflict: 'thought_id,person_id',
          })
        setThoughtPeople((prev) => [...prev, { thought_id: thoughtIdStr, person_id: personId }])
        onSyncBlurb?.(thoughtIdStr)
      }
    },
    [user, setThoughtPeople, setPeopleMap, onSyncBlurb]
  )

  const handleUnlinkThoughtPerson = useCallback(
    async (thoughtId, personId) => {
      if (!supabase || !user) return
      try {
        await supabase
          .from('thought_people')
          .delete()
          .eq('thought_id', thoughtId)
          .eq('person_id', personId)
        setThoughtPeople((prev) =>
          prev.filter((tp) => tp.thought_id !== thoughtId || tp.person_id !== personId)
        )
      } catch (err) {
        console.error('Unlink thought-person:', err)
      }
    },
    [user, setThoughtPeople]
  )

  const handleEditClarifier = useCallback(
    async (personId, clarifier) => {
      if (!personId || !supabase || !user) return
      try {
        await supabase
          .from('people')
          .update({ clarifier: clarifier || null })
          .eq('id', personId)
          .eq('user_id', user.id)
        setPeopleMap((prev) => {
          const p = prev[personId]
          return p ? { ...prev, [personId]: { ...p, clarifier: clarifier || null } } : prev
        })
      } catch (err) {
        console.error('Update clarifier:', err)
      }
    },
    [user, setPeopleMap]
  )

  const handlePersonClick = useCallback((personId) => setOpenPersonId(personId), [])

  const handleMentionClick = useCallback(
    async (name, thoughtId) => {
      if (!supabase || !user || !name || !thoughtId) return
      const thoughtIdStr = String(thoughtId)
      const key = String(name).trim().toLowerCase()
      if (!key) return

      const { data: existingPeople } = await supabase
        .from('people')
        .select('id, display_name, clarifier')
        .eq('user_id', user.id)
      const matches = (existingPeople || []).filter(
        (p) => (p.display_name || '').trim().toLowerCase() === key
      )

      if (matches.length === 1) {
        const person = matches[0]
        const alreadyLinked = (thoughtPeople || []).some(
          (tp) => String(tp.thought_id) === thoughtIdStr && tp.person_id === person.id
        )
        setPeopleMap((prev) => ({ ...prev, [person.id]: { id: person.id, display_name: person.display_name, clarifier: person.clarifier } }))
        if (!alreadyLinked) {
          await supabase
            .from('thought_people')
            .upsert([{ thought_id: thoughtIdStr, person_id: person.id }], { onConflict: 'thought_id,person_id' })
          setThoughtPeople((prev) => {
            const exists = prev.some(
              (tp) => String(tp.thought_id) === thoughtIdStr && tp.person_id === person.id
            )
            return exists ? prev : [...prev, { thought_id: thoughtIdStr, person_id: person.id }]
          })
          onSyncBlurb?.(thoughtIdStr)
        }
        setOpenPersonId(person.id)
      } else if (matches.length === 0) {
        const { data: inserted, error } = await supabase
          .from('people')
          .insert([{ user_id: user.id, display_name: name.trim() }])
          .select('id, display_name, clarifier')
          .single()
        if (error) {
          console.error('Create person on mention click:', error)
          return
        }
        setPeopleMap((prev) => ({
          ...prev,
          [inserted.id]: { id: inserted.id, display_name: inserted.display_name, clarifier: inserted.clarifier },
        }))
        await supabase
          .from('thought_people')
          .upsert([{ thought_id: thoughtIdStr, person_id: inserted.id }], { onConflict: 'thought_id,person_id' })
        setThoughtPeople((prev) => {
          const exists = prev.some(
            (tp) => String(tp.thought_id) === thoughtIdStr && tp.person_id === inserted.id
          )
          return exists ? prev : [...prev, { thought_id: thoughtIdStr, person_id: inserted.id }]
        })
        setOpenPersonId(inserted.id)
        setClarifierForPersonId(inserted.id)
        setClarifierForThoughtId(thoughtIdStr)
        onSyncBlurb?.(thoughtIdStr)
      } else {
        setDisambiguationPending((prev) => {
          const alreadyPending = prev.some(
            (e) => String(e.thoughtId) === thoughtIdStr && e.name === name.trim()
          )
          if (alreadyPending) return prev
          return [
            ...prev,
            { thoughtId: thoughtIdStr, name: name.trim(), people: matches.map((p) => ({ id: p.id, display_name: p.display_name, clarifier: p.clarifier })) },
          ]
        })
      }
    },
    [user, setThoughtPeople, setPeopleMap, onSyncBlurb]
  )

  const handleClosePersonPanel = useCallback(() => setOpenPersonId(null), [])
  const handleScrollToThought = useCallback((thoughtId) => {
    const el = document.querySelector(`[data-thought-id="${thoughtId}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  return {
    linkedPeopleByThoughtId,
    openPersonId,
    setOpenPersonId,
    clarifierForPersonId,
    setClarifierForPersonId,
    clarifierForThoughtId,
    setClarifierForThoughtId,
    disambiguationPending,
    setDisambiguationPending,
    confirmationPending,
    setConfirmationPending,
    clarifierForNewPerson,
    setClarifierForNewPerson,
    resolveMentionsToPeople,
    handleClarifierSubmit,
    handleClarifierDismiss,
    handleConfirmationChoose,
    handleNewPersonClarifierComplete,
    handleDisambiguationChoose,
    handlePersonClick,
    handleMentionClick,
    handleClosePersonPanel,
    handleUnlinkThoughtPerson,
    handleEditClarifier,
    handleScrollToThought,
  }
}
