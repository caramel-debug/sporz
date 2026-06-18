interface HudPanelProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export default function HudPanel({ title, children, className = '' }: HudPanelProps) {
  return (
    <div className={`border border-hud-border bg-hud-panel rounded-sm p-4 ${className}`}>
      {title && (
        <div className="text-xs text-hud-muted uppercase tracking-widest mb-3 pb-2 border-b border-hud-border">
          ⬡ {title}
        </div>
      )}
      {children}
    </div>
  )
}
