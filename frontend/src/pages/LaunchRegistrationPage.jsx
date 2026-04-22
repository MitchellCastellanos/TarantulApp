import { useEffect, useMemo, useState } from 'react'
import publicApi from '../services/publicApi'
import { usePageSeo } from '../hooks/usePageSeo'

const COPY = {
  en: {
    title: "Congratulations, you've arrived.",
    subtitle: 'Apply for a spot - Montreal launch registration event',
    blockedTitle: 'Sorry, this page is not available in your region.',
    blockedBody: 'This launch registration is currently limited to Quebec visitors only.',
    loadingEligibility: 'Checking your region...',
    seatsLabel: 'Spots left',
    waitlistLabel: 'Spots are full. Join newsletter/releases/perks updates.',
    formTitle: 'Apply for a spot',
    cinematic: 'Doors open. Lights down. The next chapter starts now.',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    owns: 'Do you own tarantulas?',
    howMany: 'How many?',
    attend: 'Will you attend?',
    attendYes: "Yes, I'll be there",
    bringInfo: 'Will you bring your collection info/photos?',
    reminder: 'Send me a reminder 2 days before',
    newsletter: 'Join newsletter (events, releases, perks)',
    submit: 'Apply for a spot',
    yes: 'Yes',
    no: 'No',
    successReserved: 'Congratulations, your spot is reserved.',
    successWaitlist: "We're at capacity right now. You're on the waitlist + newsletter.",
    message1: '"Your spot is confirmed" will arrive by email.',
    message2: '"Reminder - limited group, we\'re expecting you" (if reminder is enabled).',
    message3: '"See you tomorrow - doors open at 3 PM" one day before.',
    submitLoading: 'Reviewing your application...',
  },
  fr: {
    title: 'Felicitations, vous etes arrive.',
    subtitle: "Demander une place - evenement d'inscription Montreal",
    blockedTitle: "Desole, cette page n'est pas disponible dans votre region.",
    blockedBody: "Cette inscription est reservee aux visiteurs du Quebec pour le moment.",
    loadingEligibility: 'Verification de votre region...',
    seatsLabel: 'Places restantes',
    waitlistLabel: 'Plus de places. Inscrivez-vous aux mises a jour newsletter/releases/perks.',
    formTitle: 'Demander une place',
    cinematic: 'Portes ouvertes. Lumiere basse. Le prochain chapitre commence.',
    name: 'Nom',
    email: 'Email',
    phone: 'Telephone',
    owns: 'Possedez-vous des tarentules?',
    howMany: 'Combien?',
    attend: 'Allez-vous assister?',
    attendYes: "Oui, je serai la",
    bringInfo: 'Apporterez-vous vos infos/photos de collection?',
    reminder: 'Envoyer un rappel 2 jours avant',
    newsletter: 'Joindre newsletter (evenements, sorties, perks)',
    submit: 'Demander une place',
    yes: 'Oui',
    no: 'Non',
    successReserved: 'Felicitations, votre place est reservee.',
    successWaitlist: "Capacite atteinte. Vous etes en liste d'attente + newsletter.",
    message1: '"Your spot is confirmed" sera envoye par email.',
    message2: '"Reminder - limited group, we\'re expecting you" (si rappel active).',
    message3: '"See you tomorrow - doors open at 3 PM" la veille.',
    submitLoading: "Verification de votre demande...",
  },
}

function detectLang() {
  if (typeof navigator === 'undefined') return 'en'
  return (navigator.language || '').toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

export default function LaunchRegistrationPage() {
  const [lang, setLang] = useState(detectLang())
  const [eligibility, setEligibility] = useState({ loading: true, eligible: false })
  const [status, setStatus] = useState({ capacity: 45, remaining: 45 })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    ownsTarantulas: true,
    tarantulaCount: '',
    willAttend: true,
    bringCollectionInfo: false,
    reminderOptIn: true,
    newsletterOptIn: true,
  })

  const t = useMemo(() => COPY[lang], [lang])
  usePageSeo({ title: `${t.formTitle} | TarantulApp`, description: t.subtitle, noindex: true })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [eligibilityResp, statusResp] = await Promise.all([
          publicApi.get('public/launch-event/eligibility'),
          publicApi.get('public/launch-event/status'),
        ])
        if (!mounted) return
        setEligibility({ loading: false, eligible: !!eligibilityResp.data?.eligible })
        setStatus(statusResp.data || { capacity: 45, remaining: 45 })
      } catch {
        if (!mounted) return
        setEligibility({ loading: false, eligible: false })
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    setResult(null)
    try {
      const payload = {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        ownsTarantulas: !!form.ownsTarantulas,
        tarantulaCount: form.ownsTarantulas && form.tarantulaCount !== '' ? Number(form.tarantulaCount) : null,
        willAttend: !!form.willAttend,
        bringCollectionInfo: !!form.bringCollectionInfo,
        reminderOptIn: !!form.reminderOptIn,
        newsletterOptIn: !!form.newsletterOptIn,
        language: lang,
        sourcePath: window.location.pathname,
      }
      const resp = await publicApi.post('public/launch-event/register', payload)
      setStatus((prev) => ({ ...prev, ...(resp.data || {}) }))
      setResult(resp.data || {})
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (eligibility.loading) {
    return (
      <div className="container py-5 text-center">
        <p>{t.loadingEligibility}</p>
      </div>
    )
  }

  if (!eligibility.eligible) {
    return (
      <div className="min-vh-100 d-flex flex-column justify-content-center align-items-center text-center px-3" style={{ background: 'radial-gradient(circle at top, #1e1e1e 0%, #0b0b0b 60%, #050505 100%)' }}>
        <img src="/logo-black.png" alt="TarantulApp" style={{ width: 220, maxWidth: '62vw', marginBottom: 20, filter: 'drop-shadow(0 0 14px rgba(255,255,255,.15)) invert(1)' }} />
        <h1 style={{ color: '#f6f6f6', fontSize: '1.35rem' }}>{COPY.en.blockedTitle}</h1>
        <p style={{ color: '#c9c9c9', maxWidth: 560 }}>{COPY.en.blockedBody}</p>
        <h2 style={{ color: '#f6f6f6', fontSize: '1.15rem', marginTop: 20 }}>{COPY.fr.blockedTitle}</h2>
        <p style={{ color: '#c9c9c9', maxWidth: 560 }}>{COPY.fr.blockedBody}</p>
      </div>
    )
  }

  return (
    <div className="container py-4 py-md-5" style={{ maxWidth: 760 }}>
      <style>{`
        @keyframes launchReveal {
          0% { opacity: 0; transform: translateY(24px) scale(.98); filter: blur(4px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes pulseBar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>

      <div className="d-flex justify-content-end mb-3 gap-2">
        <button type="button" className={`btn btn-sm ${lang === 'en' ? 'btn-warning' : 'btn-outline-secondary'}`} onClick={() => setLang('en')}>EN</button>
        <button type="button" className={`btn btn-sm ${lang === 'fr' ? 'btn-warning' : 'btn-outline-secondary'}`} onClick={() => setLang('fr')}>FR</button>
      </div>

      <section
        className="rounded-4 p-4 p-md-5 mb-4"
        style={{
          animation: 'launchReveal 900ms ease both',
          background: 'linear-gradient(120deg, #1b1410 0%, #292016 55%, #0e0a07 100%)',
          border: '1px solid rgba(200,170,80,.35)',
          boxShadow: '0 18px 55px rgba(0,0,0,.45)',
        }}
      >
        <p className="text-uppercase mb-2" style={{ letterSpacing: '.15em', color: 'var(--ta-gold)', fontSize: '.72rem' }}>
          Montreal - May 9
        </p>
        <h1 className="fw-bold mb-2" style={{ color: 'var(--ta-parchment)', fontSize: '2rem' }}>{t.title}</h1>
        <p className="mb-2" style={{ color: 'var(--ta-text)' }}>{t.subtitle}</p>
        <p className="mb-0 fst-italic" style={{ color: '#f1d295' }}>{t.cinematic}</p>
      </section>

      <div className="rounded-3 p-3 mb-4" style={{ border: '1px solid rgba(200,170,80,.25)', background: 'rgba(27,20,16,.45)' }}>
        <strong style={{ color: 'var(--ta-gold)' }}>{t.seatsLabel}: </strong>
        <span style={{ color: 'var(--ta-parchment)' }}>{Math.max(0, status.remaining ?? 0)} / {status.capacity ?? 45}</span>
      </div>

      <section className="rounded-4 p-4" style={{ border: '1px solid var(--ta-border)', background: 'rgba(22,18,13,.52)' }}>
        <h2 className="h4 mb-3" style={{ color: 'var(--ta-parchment)' }}>{t.formTitle}</h2>
        <form onSubmit={onSubmit} className="d-grid gap-3">
          <input className="form-control" placeholder={t.name} value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} required />
          <input className="form-control" placeholder={t.email} type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
          <input className="form-control" placeholder={t.phone} value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} required />

          <label className="form-label mb-0">{t.owns}</label>
          <div className="d-flex gap-3">
            <label><input type="radio" checked={form.ownsTarantulas === true} onChange={() => setForm((p) => ({ ...p, ownsTarantulas: true }))} /> {t.yes}</label>
            <label><input type="radio" checked={form.ownsTarantulas === false} onChange={() => setForm((p) => ({ ...p, ownsTarantulas: false, tarantulaCount: '' }))} /> {t.no}</label>
          </div>

          {form.ownsTarantulas && (
            <input className="form-control" placeholder={t.howMany} type="number" min="0" value={form.tarantulaCount} onChange={(e) => setForm((p) => ({ ...p, tarantulaCount: e.target.value }))} />
          )}

          <label className="form-label mb-0">{t.attend}</label>
          <label><input type="checkbox" checked={form.willAttend} onChange={(e) => setForm((p) => ({ ...p, willAttend: e.target.checked }))} /> {t.attendYes}</label>
          <label><input type="checkbox" checked={form.bringCollectionInfo} onChange={(e) => setForm((p) => ({ ...p, bringCollectionInfo: e.target.checked }))} /> {t.bringInfo}</label>
          <label><input type="checkbox" checked={form.reminderOptIn} onChange={(e) => setForm((p) => ({ ...p, reminderOptIn: e.target.checked }))} /> {t.reminder}</label>
          <label><input type="checkbox" checked={form.newsletterOptIn} onChange={(e) => setForm((p) => ({ ...p, newsletterOptIn: e.target.checked }))} /> {t.newsletter}</label>

          {submitting && (
            <div style={{ position: 'relative', height: 8, overflow: 'hidden', borderRadius: 999, background: 'rgba(255,255,255,.15)' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '40%', height: '100%', background: 'linear-gradient(90deg, #d6ab4b, #ffe29c)', animation: 'pulseBar 1.05s linear infinite' }} />
            </div>
          )}
          {submitting && <small className="text-muted">{t.submitLoading}</small>}

          <button type="submit" className="btn btn-warning fw-semibold" disabled={submitting}>{t.submit}</button>
          {error && <p className="text-danger mb-0">{error}</p>}
        </form>
      </section>

      {result && (
        <section className="rounded-4 p-4 mt-4" style={{ border: '1px solid rgba(200,170,80,.35)', background: 'rgba(22,18,13,.52)' }}>
          <h3 className="h5" style={{ color: 'var(--ta-parchment)' }}>
            {result.isReserved ? t.successReserved : t.successWaitlist}
          </h3>
          {!result.isReserved && <p className="mb-2" style={{ color: 'var(--ta-text)' }}>{t.waitlistLabel}</p>}
          <ul className="mb-0" style={{ color: 'var(--ta-text)' }}>
            <li>{t.message1}</li>
            <li>{t.message2}</li>
            <li>{t.message3}</li>
          </ul>
        </section>
      )}
    </div>
  )
}
