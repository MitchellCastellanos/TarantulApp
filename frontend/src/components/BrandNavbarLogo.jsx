import { Link } from 'react-router-dom'
import BrandLogoMark from './BrandLogoMark'
import BrandName from './BrandName'

/**
 * @param {{ homeTo?: string, showIntro?: boolean, disableLink?: boolean }} [props]
 */
export default function BrandNavbarLogo({ homeTo = '/', showIntro = true, disableLink = false }) {
  const inner = (
    <>
      <BrandLogoMark size={40} showIntro={showIntro} />
      <BrandName className="ta-brand-logo-wordmark cinzel fw-semibold" />
    </>
  )
  if (disableLink) {
    return (
      <div
        className="navbar-brand text-decoration-none d-inline-flex align-items-center gap-2 ta-brand-nav-link"
        style={{ cursor: 'default' }}
      >
        {inner}
      </div>
    )
  }
  return (
    <Link
      to={homeTo}
      className="navbar-brand text-decoration-none d-inline-flex align-items-center gap-2 ta-brand-nav-link"
    >
      {inner}
    </Link>
  )
}
