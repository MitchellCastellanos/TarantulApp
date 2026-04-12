const STATUS = {
  active:          { label: 'Activa',           color: 'success' },
  pre_molt:        { label: 'Pre-muda',          color: 'warning' },
  pending_feeding: { label: 'Sin comer',         color: 'danger'  },
}

export default function StatusBadge({ status }) {
  const cfg = STATUS[status] || { label: status ?? '–', color: 'secondary' }
  return (
    <span className={`badge bg-${cfg.color} text-${cfg.color === 'warning' ? 'dark' : 'white'}`}>
      {cfg.label}
    </span>
  )
}
