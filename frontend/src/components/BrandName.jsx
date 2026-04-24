/**
 * Marca con TM en superindice. Para strings planos usar `BRAND_WITH_TM` (ver constants/brand.js).
 * El simbolo se inyecta con \u2122 en el source para no depender de bytes UTF-8 multibyte en el archivo.
 */
export default function BrandName({ className, style, ...rest }) {
  return (
    <span className={className} style={style} {...rest}>
      TarantulApp
      <sup className="ta-tm" aria-label="trademark">
        {'\u2122'}
      </sup>
    </span>
  )
}
