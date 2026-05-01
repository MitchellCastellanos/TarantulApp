/**
 * Control segmentado tipo pill (tabs accesibles).
 * @param {{ id: string, label: string }[]} options
 */
export default function TaSegmentedControl({ value, onChange, options, className = '', ariaLabel }) {
  return (
    <div className={`ta-seg ${className}`.trim()} role="tablist" aria-label={ariaLabel}>
      <div className="d-flex flex-nowrap gap-1 pb-1" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {options.map((opt) => {
          const active = value === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={active}
              className="btn btn-sm flex-shrink-0 ta-seg__btn"
              data-active={active ? 'true' : 'false'}
              onClick={() => onChange(opt.id)}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
