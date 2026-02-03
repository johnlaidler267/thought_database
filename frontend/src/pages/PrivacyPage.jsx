import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
export default function PrivacyPage() {

  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-serif mb-8"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <h1 className="text-2xl font-serif font-semibold mb-2">Privacy Policy</h1>
        <p className="text-sm font-serif mb-8" style={{ color: 'var(--muted-foreground)' }}>
          Last updated: {new Date().toLocaleDateString('en-US')}
        </p>

        <div className="prose prose-sm font-serif space-y-6" style={{ color: 'var(--ink)' }}>
          <section>
            <h2 className="text-lg font-semibold mb-2">1. Introduction</h2>
            <p className="leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              Vellum (“we”) respects your privacy. This policy describes how we collect, use, retain, and
              share information when you use our app, including voice data and other personally
              identifiable information (PII).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. Voice Data (PII) and How We Process It</h2>
            <p className="leading-relaxed mb-3" style={{ color: 'var(--muted-foreground)' }}>
              When you record audio, we process your voice to provide transcription and related features.
              Voice recordings are personally identifiable information (PII).
            </p>
            <ul className="list-disc pl-6 space-y-1 mb-3" style={{ color: 'var(--muted-foreground)' }}>
              <li><strong style={{ color: 'var(--ink)' }}>Transcription:</strong> Your audio is sent to third-party APIs so we can convert speech to text. We do not store the raw audio file on our servers.</li>
              <li><strong style={{ color: 'var(--ink)' }}>Text processing:</strong> The resulting transcript may be sent to other third-party APIs for cleaning (e.g., removing fillers) and tagging. If you use translation, that text may be sent to a translation API.</li>
            </ul>
            <p className="leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              We use the following third-party services to process your data: <strong style={{ color: 'var(--ink)' }}>Groq</strong> (speech-to-text transcription), <strong style={{ color: 'var(--ink)' }}>Google AI (Gemini)</strong> (text cleaning and tagging), and, if you enable translation, <strong style={{ color: 'var(--ink)' }}>Google Translate</strong>. Authentication and storage of your account and saved thoughts use <strong style={{ color: 'var(--ink)' }}>Supabase</strong>; payments use <strong style={{ color: 'var(--ink)' }}>Stripe</strong>. Each of these providers has its own privacy and data processing terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. How Long We Keep Your Data</h2>
            <p className="leading-relaxed mb-3" style={{ color: 'var(--muted-foreground)' }}>
              <strong style={{ color: 'var(--ink)' }}>Voice/audio:</strong> We do not retain your voice recordings. Audio is processed in real time (or in-memory for the duration of the request) to produce a transcript and is then discarded. We do not store raw audio on our servers or with our third-party processors beyond what is required to complete the transcription request.
            </p>
            <p className="leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              <strong style={{ color: 'var(--ink)' }}>Transcripts and saved thoughts:</strong> When you save a thought, we store the transcript and related text (and any tags/categories you have) in our database. We keep this data until you delete the thought or close your account. After you delete your account, we remove your data in accordance with our data retention practices (typically within 30 days of account deletion, unless a longer period is required by law).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Other Data We Collect</h2>
            <p className="leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              We collect account information (e.g., email, profile) and usage-related data necessary to run the Service, prevent abuse, and improve the product. We do not sell your personal information. For more detail on cookies, analytics, or regional rights (e.g., GDPR), contact us or see any supplemental notices we provide in the app or on our website.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Changes and Contact</h2>
            <p className="leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              We may update this Privacy Policy from time to time. The “Last updated” date at the top will change when we do. Continued use of the Service after changes means you accept the updated policy. Questions? Contact us at the email or address provided in the app or on our website.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
