import { Link } from 'react-router-dom'
import BrandLogoMark from './BrandLogoMark'
import BrandName from './BrandName'

/**
 * @param {{ homeTo?: string, showIntro?: boolean }} [props]
 */
export default function BrandNavbarLogo({ homeTo = '/', showIntro = true }) {
  return (
    <Link
      to={homeTo}
      className="navbar-brand text-decoration-none d-inline-flex align-items-center gap-2 ta-brand-nav-link"
    >
      <BrandLogoMark size={40} showIntro={showIntro} />
      <BrandName className="ta-brand-logo-wordmark cinzel fw-semibold" />
    </Link>
  )
}
