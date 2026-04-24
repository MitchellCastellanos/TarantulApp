import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import BrandName from '../components/BrandName'
import { PUBLIC_CONTACT } from '../constants/publicContact'

export default function TermsPage() {
  return (
    <div>
      <Navbar />
      <div className="container mt-4 mb-5" style={{ maxWidth: 720 }}>
        <h2 className="fw-bold mb-1">Terms of Service</h2>
        <p className="text-muted small mb-4">Last updated: April 2026</p>

        <p>By using <BrandName /> you agree to these terms. Please read them carefully.</p>

        <h5 className="fw-bold mt-4">1. Use of the Service</h5>
        <ul>
          <li><BrandName /> is a personal collection tracker for tarantula keepers.</li>
          <li>You must be at least 13 years old to use this service.</li>
          <li>You are responsible for maintaining the security of your account credentials.</li>
          <li>You may not use the service for any illegal or unauthorized purpose.</li>
        </ul>

        <h5 className="fw-bold mt-4">2. Free and Pro Plans</h5>
        <ul>
          <li>The Free plan allows up to 6 tarantulas in your collection.</li>
          <li>The Pro plan offers unlimited tarantulas and additional features for $4.99/month or $49.99/year (annual billing when enabled in Stripe). Higher tiers (Pro+, Vendor) may be offered separately.</li>
          <li>Subscriptions renew automatically. You may cancel at any time; access continues until the end of the billing period.</li>
        </ul>

        <h5 className="fw-bold mt-4">3. Your Content</h5>
        <p>You retain ownership of all content you create (records, photos, notes). You grant <BrandName /> a license to store and display this content to provide the service.</p>

        <h5 className="fw-bold mt-4">4. Limitation of Liability</h5>
        <p><BrandName /> is provided "as is". We are not liable for any data loss or damages resulting from use of the service. We recommend maintaining backups of important records.</p>

        <h5 className="fw-bold mt-4">5. Changes to Terms</h5>
        <p>We may update these terms. Continued use of the service after changes constitutes acceptance of the new terms.</p>

        <h5 className="fw-bold mt-4">6. Contact</h5>
        <p>General &amp; legal:{' '}
          <a href={`mailto:${PUBLIC_CONTACT.hello}`}>{PUBLIC_CONTACT.hello}</a>
          {' · '}
          <a href={`mailto:${PUBLIC_CONTACT.legal}`}>{PUBLIC_CONTACT.legal}</a>
        </p>
        <p>Technical:{' '}
          <a href={`mailto:${PUBLIC_CONTACT.support}`}>{PUBLIC_CONTACT.support}</a>
          {' · '}Billing:{' '}
          <a href={`mailto:${PUBLIC_CONTACT.billing}`}>{PUBLIC_CONTACT.billing}</a>
          {' · '}Marketing &amp; partnerships:{' '}
          <a href={`mailto:${PUBLIC_CONTACT.partners}`}>{PUBLIC_CONTACT.partners}</a>
        </p>
        <p className="small text-muted mb-0">
          <Link to="/contact">All contact options</Link>
        </p>

      </div>
    </div>
  )
}
