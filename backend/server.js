import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import transcribeRouter from './routes/transcribe.js'
import cleanRouter from './routes/clean.js'
import tagsRouter from './routes/tags.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/transcribe', transcribeRouter)
app.use('/api/clean', cleanRouter)
app.use('/api/tags', tagsRouter)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

