/**
 * Persist and recover in-progress recording across page refresh (IndexedDB + sessionStorage).
 */

const DB_NAME = 'VellumRecording'
const STORE_NAME = 'pending'
const RECORDING_KEY = 'recording'
const RECOVERY_FLAG = 'vellum-recording-recovery'

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
  })
}

export function setRecoveryFlag() {
  try {
    sessionStorage.setItem(RECOVERY_FLAG, '1')
  } catch (_) {}
}

export function hasRecoveryFlag() {
  try {
    return sessionStorage.getItem(RECOVERY_FLAG) === '1'
  } catch (_) {
    return false
  }
}

export function clearRecoveryFlag() {
  try {
    sessionStorage.removeItem(RECOVERY_FLAG)
  } catch (_) {}
}

export async function savePendingRecording(blob, mimeType) {
  if (!blob || blob.size < 500) return
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put({ id: RECORDING_KEY, blob, mimeType: mimeType || 'audio/webm;codecs=opus' })
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => reject(tx.error)
    })
  } catch (_) {}
}

export async function getPendingRecording() {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(RECORDING_KEY)
      req.onsuccess = () => {
        db.close()
        resolve(req.result ? { blob: req.result.blob, mimeType: req.result.mimeType } : null)
      }
      req.onerror = () => reject(req.error)
    })
  } catch (_) {
    return null
  }
}

export async function clearPendingRecording() {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(RECORDING_KEY)
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => reject(tx.error)
    })
  } catch (_) {}
}
