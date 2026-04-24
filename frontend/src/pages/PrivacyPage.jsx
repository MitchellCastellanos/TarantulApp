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

        <hr className="my-4" />

        <h2 className="fw-bold mb-1">Política de Privacidad</h2>
        <p className="text-muted small mb-4">Última actualización: Abril 2026</p>

        <p>
          <BrandName /> opera la aplicación web y móvil <BrandName />. Esta página explica cómo recopilamos, usamos y protegemos tu
          información personal.
        </p>

        <h5 className="fw-bold mt-4">1. Información que recopilamos</h5>
        <ul>
          <li><strong>Datos de cuenta:</strong> correo electrónico y nombre al registrarte.</li>
          <li><strong>Contenido que creas:</strong> registros de tarántulas, alimentación, mudas, comportamiento, fotos y recordatorios.</li>
          <li><strong>Datos de pago:</strong> los pagos son procesados por Stripe. No almacenamos datos de tarjetas.</li>
        </ul>

        <h5 className="fw-bold mt-4">2. Cómo usamos tu información</h5>
        <ul>
          <li>
            Para proveer y mejorar las funciones de <BrandName />.
          </li>
          <li>Para enviar correos de recuperación de contraseña cuando lo solicitas.</li>
          <li>Para procesar tu suscripción Pro a través de Stripe.</li>
          <li>No vendemos tus datos a terceros.</li>
        </ul>

        <h5 className="fw-bold mt-4">3. Almacenamiento de datos</h5>
        <p>Tus datos se almacenan en una base de datos PostgreSQL segura en Supabase. Las fotos se guardan en Cloudinary. Todas las conexiones usan cifrado HTTPS/TLS.</p>

        <h5 className="fw-bold mt-4">4. Tus derechos</h5>
        <p>Puedes solicitar la eliminación de tu cuenta y todos tus datos en cualquier momento escribiendo a{' '}
          <a href={`mailto:${PUBLIC_CONTACT.legal}`}>{PUBLIC_CONTACT.legal}</a>. Procesamos la solicitud en 30 días.</p>

        <h5 className="fw-bold mt-4">5. Cookies y almacenamiento local</h5>
        <p>
          <BrandName /> usa localStorage del navegador para guardar tu sesión. No usamos cookies de seguimiento de terceros.
        </p>

        <h5 className="fw-bold mt-4">6. Contacto</h5>
        <p>Dudas sobre esta política:{' '}
          <a href={`mailto:${PUBLIC_CONTACT.legal}`}>{PUBLIC_CONTACT.legal}</a>
        </p>
        <p>Incidencias técnicas:{' '}
          <a href={`mailto:${PUBLIC_CONTACT.support}`}>{PUBLIC_CONTACT.support}</a>
          {' · '}Billing y Stripe:{' '}
          <a href={`mailto:${PUBLIC_CONTACT.billing}`}>{PUBLIC_CONTACT.billing}</a>
          {' · '}Alianzas:{' '}
          <a href={`mailto:${PUBLIC_CONTACT.partners}`}>{PUBLIC_CONTACT.partners}</a>
        </p>
        <p className="small text-muted mb-0">
          <Link to="/contact">Página de contacto</Link>
        </p>
      </div>
    </div>
  )
}
