import { useState, useEffect, useCallback } from 'react'

/**
 * Per-user categories stored in localStorage. Returns list, active category, and add/delete handlers.
 */
export function useCategories(userId) {
  const [categories, setCategories] = useState(['All'])
  const [activeCategory, setActiveCategory] = useState('All')
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryToDelete, setCategoryToDelete] = useState(null)

  useEffect(() => {
    if (!userId) {
      setCategories(['All'])
      setActiveCategory('All')
      return
    }
    const key = `axiomCategories_${userId}`
    const saved = localStorage.getItem(key)
    if (!saved) {
      setCategories(['All'])
      setActiveCategory('All')
      return
    }
    try {
      const parsed = JSON.parse(saved)
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setCategories(['All'])
        setActiveCategory('All')
        return
      }
      const list = parsed.includes('All') ? parsed : ['All', ...parsed]
      setCategories(list)
      setActiveCategory('All')
    } catch {
      // Don't overwrite state on parse error so we don't persist ['All'] over their list
      setActiveCategory('All')
    }
  }, [userId])

  useEffect(() => {
    if (!userId || !categories.length) return
    const key = `axiomCategories_${userId}`
    // Don't overwrite existing saved list with just ['All'] (e.g. after a parse error)
    if (categories.length === 1 && categories[0] === 'All') {
      const current = localStorage.getItem(key)
      if (current && current !== '["All"]') return
    }
    localStorage.setItem(key, JSON.stringify(categories))
  }, [userId, categories])

  const handleAddCategory = useCallback(() => {
    const trimmedName = newCategoryName.trim()
    if (!trimmedName) return
    setCategories((prev) => {
      if (prev.includes(trimmedName)) return prev
      return [...prev, trimmedName]
    })
    setActiveCategory(trimmedName)
    setIsAddingCategory(false)
    setNewCategoryName('')
  }, [newCategoryName])

  const handleDeleteCategory = useCallback((category) => {
    if (category === 'All') return
    setCategoryToDelete(category)
  }, [])

  const confirmDeleteCategory = useCallback(() => {
    if (!categoryToDelete) return
    setCategories((prev) => prev.filter((cat) => cat !== categoryToDelete))
    setActiveCategory((prev) => (prev === categoryToDelete ? 'All' : prev))
    setCategoryToDelete(null)
  }, [categoryToDelete])

  const cancelDeleteCategory = useCallback(() => setCategoryToDelete(null), [])

  return {
    categories,
    setCategories,
    activeCategory,
    setActiveCategory,
    isAddingCategory,
    setIsAddingCategory,
    newCategoryName,
    setNewCategoryName,
    categoryToDelete,
    handleAddCategory,
    handleDeleteCategory,
    confirmDeleteCategory,
    cancelDeleteCategory,
  }
}
