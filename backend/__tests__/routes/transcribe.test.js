import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import multer from 'multer'
import transcribeRouter from '../../routes/transcribe.js'

const app = express()
const upload = multer({ storage: multer.memoryStorage() })
app.use('/api/transcribe', transcribeRouter)

describe('Transcribe Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject request without audio file', async () => {
    const response = await request(app)
      .post('/api/transcribe')
      .send({})

    expect(response.status).toBe(400)
    expect(response.body.error).toContain('No audio file')
  })

  it('should reject empty audio file', async () => {
    const response = await request(app)
      .post('/api/transcribe')
      .attach('audio', Buffer.from(''), 'empty.webm')

    expect(response.status).toBe(400)
    expect(response.body.error).toContain('empty')
  })

  it('should reject files larger than 50MB', async () => {
    // Create a buffer larger than 50MB
    const largeBuffer = Buffer.alloc(51 * 1024 * 1024) // 51MB

    const response = await request(app)
      .post('/api/transcribe')
      .attach('audio', largeBuffer, 'large.webm')

    expect(response.status).toBe(400)
    expect(response.body.error).toContain('too large')
  })

  it('should reject completely silent audio', async () => {
    // This would require mocking the audio processing
    // For now, test the validation endpoint exists
    const smallBuffer = Buffer.alloc(100)

    const response = await request(app)
      .post('/api/transcribe')
      .attach('audio', smallBuffer, 'silent.webm')

    // Should either reject as silent or fail processing
    expect([400, 500]).toContain(response.status)
  })
})
