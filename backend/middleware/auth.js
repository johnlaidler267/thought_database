/**
 * Auth middleware: validates Supabase JWT from Authorization header.
 * Rejects with 401 if missing or invalid.
 * Attaches req.user (Supabase user object) for downstream use.
 */
export function requireAuth(supabaseClient) {
  return async (req, res, next) => {
    if (!supabaseClient) {
      return res.status(503).json({
        error: 'Authentication not configured',
        details: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in backend/.env',
      })
    }

    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' })
    }

    const token = authHeader.slice(7).trim()
    if (!token) {
      return res.status(401).json({ error: 'Missing token' })
    }

    try {
      const { data: { user }, error } = await supabaseClient.auth.getUser(token)
      if (error || !user) {
        return res.status(401).json({ error: 'Invalid or expired token' })
      }
      req.user = user
      next()
    } catch (err) {
      console.error('[auth] Token verification failed:', err.message)
      return res.status(401).json({ error: 'Invalid token' })
    }
  }
}
