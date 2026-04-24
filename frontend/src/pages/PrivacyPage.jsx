import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import BrandName from '../components/BrandName'
import { PUBLIC_CONTACT } from '../constants/publicContact'

export default function PrivacyPage() {
  return (
    <div>
      <Navbar />
      <div className="container mt-4 mb-5" style={{ maxWidth: 720 }}>
        <h2 className="fw-bold mb-1">Privacy Policy</h2>
        <p className="text-muted small mb-4">Last updated: April 2026</p>

        <p>
          <BrandName /> (&quot;we&quot;, &quot;us&quot;) operates the <BrandName /> web application and mobile app. This page
          explains how we collect, use, and protect your personal information.
        </p>

        <h5 className="fw-bold mt-4">1. Information We Collect</h5>
        <ul>
          <li><strong>Account data:</strong> email address and display name when you register.</li>
          <li><strong>Content you create:</strong> tarantula records, feeding logs, molt logs, behavior notes, photos, and reminders.</li>
          <li><strong>Payment data:</strong> subscription payments are processed by Stripe. We do not store card numbers or payment details.</li>
        </ul>

        <h5 className="fw-bold mt-4">2. How We Use Your Information</h5>
        <ul>
          <li>
            To provide and improve <BrandName /> features.
          </li>
          <li>To send password reset emails when you request them.</li>
          <li>To process your Pro subscription via Stripe.</li>
          <li>We do not sell your data to third parties.</li>
        </ul>

        <h5 className="fw-bold mt-4">3. Data Storage</h5>
        <p>Your data is stored in a secure PostgreSQL database hosted on Supabase. Photos are stored on Cloudinary. All connections use HTTPS/TLS encryption.</p>

        <h5 className="fw-bold mt-4">4. Your Rights</h5>
        <p>You may request deletion of your account and all associated data at any time by emailing{' '}
          <a href={`mailto:${PUBLIC_CONTACT.legal}`}>{PUBLIC_CONTACT.legal}</a>. We will process the request within 30 days.</p>

        <h5 className="fw-bold mt-4">5. Cookies</h5>
        <p>
          <BrandName /> uses browser localStorage to store your authentication token. No third-party tracking cookies are used.
        </p>

        <h5 className="fw-bold mt-4">6. Contact</h5>
        <p>Questions about this policy:{' '}
          <a href={`mailto:${PUBLIC_CONTACT.legal}`}>{PUBLIC_CONTACT.legal}</a>
        </p>
        <p>Technical issues:{' '}
          <a href={`mailto:${PUBLIC_CONTACT.support}`}>{PUBLIC_CONTACT.support}</a>
          {' · '}Billing &amp; Stripe:{' '}
          <a href={`mailto:${PUBLIC_CONTACT.billing}`}>{PUBLIC_CONTACT.billing}</a>
          {' · '}Partnerships &amp; press:{' '}
          <a href={`mailto:${PUBLIC_CONTACT.partners}`}>{PUBLIC_CONTACT.partners}</a>
        </p>
        <p className="small text-muted mb-0">
          <Link to="/contact">All contact options</Link>
        </p>

      </div>
    </div>
  )
}
