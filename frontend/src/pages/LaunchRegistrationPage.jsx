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
    message1: '"Your spot is confirmed" will arrive by email.',
    message2: '"Reminder - limited group, we\'re expecting you" (if reminder is enabled).',
    message3: '"See you tomorrow - doors open at 3 PM" one day before.',
    submitLoading: 'Reviewing your application...',
    soldOutTitle: 'This round is full.',
    soldOutLead:
      'We are not taking more spots for this in-person session. If you want early access to future events, exclusive perks, and launch news, leave your email below.',
    futureEmailLabel: 'Email for updates',
    futureNotifyCta: 'Notify me',
    futureThanks: "You're on the list. Watch your inbox.",
    futureLoading: 'Saving...',
  },
  fr: {
    title: 'Felicitations, vous etes arrive.',
    subtitle: "Demander une place - evenement d'inscription Montreal",
    blockedTitle: "Desole, cette page n'est pas disponible dans votre region.",
    blockedBody: "Cette inscription est reservee aux visiteurs du Quebec pour le moment.",
    loadingEligibility: 'Verification de votre region...',
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
    message1: '"Your spot is confirmed" sera envoye par email.',
    message2: '"Reminder - limited group, we\'re expecting you" (si rappel active).',
    message3: '"See you tomorrow - doors open at 3 PM" la veille.',
    submitLoading: "Verification de votre demande...",
    soldOutTitle: 'Complet pour cette session.',
    soldOutLead:
      "Plus de places pour cet evenement presentiel. Si vous voulez etre informe des prochains evenements, perks exclusifs et lancements, laissez votre courriel ci-dessous.",
    futureEmailLabel: 'Courriel pour les mises a jour',
    futureNotifyCta: 'Me prevenir',
    futureThanks: "C'est note. Surveillez votre boite.",
    futureLoading: 'Enregistrement...',
  },
}

function detectLang() {
  if (typeof navigator === 'undefined') return 'en'
  return (navigator.language || '').toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

export default function LaunchRegistrationPage() {
  const [lang, setLang] = useState(detectLang())
  const [eligibility, setEligibility] = useState({ loading: true, eligible: false })
  const [heroIn, setHeroIn] = useState(false)
  const [successIn, setSuccessIn] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [outcome, setOutcome] = useState(null)
  const [error, setError] = useState('')
  const [futureEmail, setFutureEmail] = useState('')
  const [interestSubmitting, setInterestSubmitting] = useState(false)
  const [interestDone, setInterestDone] = useState(false)
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
        const eligibilityResp = await publicApi.get('public/launch-event/eligibility')
        if (!mounted) return
        setEligibility({ loading: false, eligible: !!eligibilityResp.data?.eligible })
      } catch {
        if (!mounted) return
        setEligibility({ loading: false, eligible: false })
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!eligibility.eligible || eligibility.loading) return
    let id = 0
    id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setHeroIn(true))
    })
    return () => cancelAnimationFrame(id)
  }, [eligibility.eligible, eligibility.loading])

  useEffect(() => {
    if (outcome !== 'reserved') {
      setSuccessIn(false)
      return
    }
    setSuccessIn(false)
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setSuccessIn(true))
    })
    return () => cancelAnimationFrame(id)
  }, [outcome])

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    setOutcome(null)
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
      const data = resp.data || {}
      if (data.soldOut) {
        setOutcome('soldout')
        setFutureEmail((form.email || '').trim())
        setInterestDone(false)
      } else if (data.isReserved) {
        setOutcome('reserved')
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const onFutureInterest = async (event) => {
    event.preventDefault()
    setError('')
    setInterestSubmitting(true)
    try {
      await publicApi.post('public/launch-event/notify-future', {
        email: futureEmail.trim(),
        language: lang,
      })
      setInterestDone(true)
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not save. Please try again.')
    } finally {
      setInterestSubmitting(false)
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

  if (outcome === 'soldout') {
    return (
      <div className="min-vh-100 d-flex flex-column justify-content-center px-3 py-5" style={{ background: 'radial-gradient(circle at 30% 0%, #2a2218 0%, #0f0c09 55%, #050403 100%)' }}>
        <div className="mx-auto w-100" style={{ maxWidth: 520 }}>
          <img src="/logo-black.png" alt="" className="d-block mx-auto mb-4" style={{ width: 180, maxWidth: '50vw', filter: 'invert(1) drop-shadow(0 0 12px rgba(255,200,120,.2))' }} />
          <h1 className="h3 fw-bold mb-3" style={{ color: 'var(--ta-parchment)' }}>{t.soldOutTitle}</h1>
          <p className="mb-4" style={{ color: 'var(--ta-text)', lineHeight: 1.6 }}>{t.soldOutLead}</p>
          {!interestDone ? (
            <form onSubmit={onFutureInterest} className="d-grid gap-3">
              <input
                className="form-control form-control-lg"
                type="email"
                required
                placeholder={t.futureEmailLabel}
                value={futureEmail}
                onChange={(e) => setFutureEmail(e.target.value)}
              />
              <button type="submit" className="btn btn-warning fw-semibold" disabled={interestSubmitting}>
                {interestSubmitting ? t.futureLoading : t.futureNotifyCta}
              </button>
              {error && <p className="text-danger mb-0 small">{error}</p>}
            </form>
          ) : (
            <p className="mb-0 fw-semibold" style={{ color: 'var(--ta-gold)' }}>{t.futureThanks}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="container py-4 py-md-5" style={{ maxWidth: 760 }}>
      <style>{`
        .ta-launch-hero {
          opacity: 0;
          -webkit-transform: translate3d(0, 22px, 0) scale(0.98);
          transform: translate3d(0, 22px, 0) scale(0.98);
          will-change: opacity, transform;
        }
        .ta-launch-hero.ta-launch-hero--in {
          opacity: 1;
          -webkit-transform: translate3d(0, 0, 0) scale(1);
          transform: translate3d(0, 0, 0) scale(1);
          -webkit-transition: opacity 0.9s ease, transform 0.9s ease;
          transition: opacity 0.9s ease, transform 0.9s ease;
        }
        @media (prefers-reduced-motion: reduce) {
          .ta-launch-hero.ta-launch-hero--in {
            -webkit-transition: none;
            transition: none;
          }
        }
        @keyframes taPulseBar {
          0% { -webkit-transform: translateX(-100%); transform: translateX(-100%); }
          100% { -webkit-transform: translateX(200%); transform: translateX(200%); }
        }
        .ta-pulse-bar-inner {
          -webkit-animation: taPulseBar 1.05s linear infinite;
          animation: taPulseBar 1.05s linear infinite;
        }
      `}</style>

      <div className="d-flex justify-content-end mb-3 gap-2">
        <button type="button" className={`btn btn-sm ${lang === 'en' ? 'btn-warning' : 'btn-outline-secondary'}`} onClick={() => setLang('en')}>EN</button>
        <button type="button" className={`btn btn-sm ${lang === 'fr' ? 'btn-warning' : 'btn-outline-secondary'}`} onClick={() => setLang('fr')}>FR</button>
      </div>

      <section
        className={`ta-launch-hero rounded-4 p-4 p-md-5 mb-4 ${heroIn ? 'ta-launch-hero--in' : ''}`}
        style={{
          background: 'linear-gradient(120deg, #1b1410 0%, #292016 55%, #0e0a07 100%)',
          border: '1px solid rgba(200,170,80,.35)',
          boxShadow: '0 18px 55px rgba(0,0,0,.45)',
        }}
      >
        <p className="text-uppercase mb-2" style={{ letterSpacing: '.15em', color: 'var(--ta-gold)', fontSize: '.72rem' }}>
          Montreal - May 9
        </p>
        <h1 className="fw-bold mb-2" style={{ color: 'var(--ta-parchment)', fontSize: 'clamp(1.35rem, 5vw, 2rem)' }}>{t.title}</h1>
        <p className="mb-2" style={{ color: 'var(--ta-text)' }}>{t.subtitle}</p>
        <p className="mb-0 fst-italic" style={{ color: '#f1d295' }}>{t.cinematic}</p>
      </section>

      {outcome !== 'reserved' && (
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
                <div
                  className="ta-pulse-bar-inner"
                  style={{ position: 'absolute', top: 0, left: 0, width: '40%', height: '100%', background: 'linear-gradient(90deg, #d6ab4b, #ffe29c)' }}
                />
              </div>
            )}
            {submitting && <small className="text-muted">{t.submitLoading}</small>}

            <button type="submit" className="btn btn-warning fw-semibold" disabled={submitting}>{t.submit}</button>
            {error && <p className="text-danger mb-0">{error}</p>}
          </form>
        </section>
      )}

      {outcome === 'reserved' && (
        <>
          <section
            key="success-hero"
            className={`ta-launch-hero rounded-4 p-4 p-md-5 mb-4 mt-4 ${successIn ? 'ta-launch-hero--in' : ''}`}
            style={{
              background: 'linear-gradient(120deg, #1b1410 0%, #292016 55%, #0e0a07 100%)',
              border: '1px solid rgba(200,170,80,.45)',
              boxShadow: '0 18px 55px rgba(0,0,0,.45)',
            }}
          >
            <h2 className="h4 mb-0" style={{ color: 'var(--ta-parchment)' }}>{t.successReserved}</h2>
          </section>
          <section className="rounded-4 p-4" style={{ border: '1px solid rgba(200,170,80,.35)', background: 'rgba(22,18,13,.52)' }}>
            <ul className="mb-0 small" style={{ color: 'var(--ta-text)' }}>
              <li>{t.message1}</li>
              <li>{t.message2}</li>
              <li>{t.message3}</li>
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
