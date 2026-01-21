import { http, HttpResponse } from 'msw'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export const handlers = [
  // Transcription endpoint
  http.post(`${API_URL}/transcribe`, async ({ request }) => {
    const formData = await request.formData()
    const audioFile = formData.get('audio')
    
    if (!audioFile) {
      return HttpResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }
    
    // Mock successful transcription
    return HttpResponse.json({
      transcript: 'This is a mock transcription of the audio file.'
    })
  }),

  // Clean transcript endpoint
  http.post(`${API_URL}/clean`, async ({ request }) => {
    const body = await request.json() as { transcript: string }
    return HttpResponse.json({
      cleaned_text: body.transcript.replace(/\s+/g, ' ').trim()
    })
  }),

  // Extract tags endpoint
  http.post(`${API_URL}/tags`, async ({ request }) => {
    const body = await request.json() as { text: string }
    // Mock tag extraction
    const tags = body.text.match(/#\w+/g) || []
    return HttpResponse.json({
      tags: tags.map(tag => tag.substring(1))
    })
  }),

  // Stripe endpoints
  http.post(`${API_URL}/stripe/create-checkout-session`, async ({ request }) => {
    const body = await request.json() as { userId: string; email: string; tier?: string }
    
    if (!body.userId || !body.email) {
      return HttpResponse.json(
        { error: 'userId and email are required' },
        { status: 400 }
      )
    }
    
    return HttpResponse.json({
      url: 'https://checkout.stripe.com/test-session',
      sessionId: 'cs_test_1234567890'
    })
  }),

  http.post(`${API_URL}/stripe/verify-session`, async ({ request }) => {
    const body = await request.json() as { sessionId: string }
    
    if (!body.sessionId) {
      return HttpResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }
    
    return HttpResponse.json({
      success: true,
      subscriptionId: 'sub_test_1234567890'
    })
  }),

  http.post(`${API_URL}/stripe/create-portal-session`, async ({ request }) => {
    const body = await request.json() as { customerId: string }
    
    if (!body.customerId) {
      return HttpResponse.json(
        { error: 'customerId is required' },
        { status: 400 }
      )
    }
    
    return HttpResponse.json({
      url: 'https://billing.stripe.com/test-portal'
    })
  }),
]
