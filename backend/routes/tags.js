import express from 'express'
// import Anthropic from '@anthropic-ai/sdk'
import dotenv from 'dotenv'

dotenv.config()

const router = express.Router()

// const anthropic = new Anthropic({
//   apiKey: process.env.ANTHROPIC_API_KEY,
// })

const TAG_EXTRACTION_PROMPT = `Extract simple category tags from the following text. 

Return ONLY a JSON array of tag strings. Use these categories:
- #Idea (for ideas, concepts, thoughts)
- #Person (for people, names, relationships)
- #Task (for tasks, todos, reminders)
- #Note (for general notes)

Only include tags that are clearly present. Return an empty array if none apply.

Example format: ["Idea", "Task"]

Text to analyze:`

router.post('/', async (req, res) => {
  try {
    const { text } = req.body

    if (!text) {
      return res.status(400).json({ error: 'No text provided' })
    }

    // if (!process.env.ANTHROPIC_API_KEY) {
    //   return res.status(500).json({ error: 'Anthropic API key not configured' })
    // }

    // const message = await anthropic.messages.create({
    //   model: 'claude-3-5-sonnet-20241022',
    //   max_tokens: 256,
    //   messages: [
    //     {
    //       role: 'user',
    //       content: `${TAG_EXTRACTION_PROMPT}\n\n${text}`,
    //     },
    //   ],
    // })

    // const responseText = message.content[0].text.trim()
    
    // // Try to parse JSON from response
    // let tags = []
    // try {
    //   // Extract JSON array from response (handle cases where there's extra text)
    //   const jsonMatch = responseText.match(/\[.*?\]/s)
    //   if (jsonMatch) {
    //     tags = JSON.parse(jsonMatch[0])
    //   }
    // } catch (parseError) {
    //   console.error('Failed to parse tags:', parseError)
    //   // Return empty array if parsing fails
    // }

    // res.json({ tags })
    
    // Mock response - simple tag detection
    const tags = []
    const lowerText = text.toLowerCase()
    if (lowerText.includes('idea') || lowerText.includes('think') || lowerText.includes('concept')) {
      tags.push('Idea')
    }
    if (lowerText.match(/\b(call|email|meet|remind|todo|task)\b/)) {
      tags.push('Task')
    }
    if (lowerText.match(/\b(sarah|john|person|friend|colleague)\b/)) {
      tags.push('Person')
    }
    
    res.json({ tags })
  } catch (error) {
    console.error('Tag extraction error:', error)
    res.status(500).json({ error: 'Failed to extract tags' })
  }
})

export default router