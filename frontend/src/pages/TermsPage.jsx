import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
export default function TermsPage() {

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

        <h1 className="text-2xl font-serif font-semibold mb-2">Terms of Service</h1>
        <p className="text-sm font-serif mb-8" style={{ color: 'var(--muted-foreground)' }}>
          Last updated: {new Date().toLocaleDateString('en-US')}
        </p>

        <div className="prose prose-sm font-serif space-y-6" style={{ color: 'var(--ink)' }}>
          <section>
            <h2 className="text-lg font-semibold mb-2">1. Acceptance</h2>
            <p className="leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              By using Vellum (“the Service”), you agree to these Terms of Service and to our Privacy Policy.
              If you do not agree, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. Use of the Service</h2>
            <p className="leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              You may use the Service to record, transcribe, and store your thoughts. You are responsible
              for keeping your account secure and for all activity under your account. Do not use the Service
              for any illegal purpose or in violation of these terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. Voice and Personal Data</h2>
            <p className="leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              The Service processes voice recordings (personal data) to provide transcription and related
              features. How we collect, use, retain, and share this data—including use of third-party
              processors—is described in our <Link to="/privacy" className="underline" style={{ color: 'var(--ink)' }}>Privacy Policy</Link>.
              By using the Service you consent to that processing.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Availability and Changes</h2>
            <p className="leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              We strive to keep the Service available but do not guarantee uninterrupted access. We may
              change or discontinue features with reasonable notice where practical. Continued use after
              changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Contact</h2>
            <p className="leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              Questions about these terms? Contact us at the email or address provided in the app or on
              our website.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
