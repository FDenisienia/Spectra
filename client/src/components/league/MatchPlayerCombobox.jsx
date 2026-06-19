import { useState, useRef, useEffect, useMemo } from 'react'
import { Form } from 'react-bootstrap'

export default function MatchPlayerCombobox({
  value,
  onChange,
  roster = [],
  teamId,
  suspendedSet = null,
  placeholder = 'Elegir del plantel o escribir invitado',
  className = '',
  style,
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  const filtered = useMemo(() => {
    const q = String(value || '').trim().toLowerCase()
    if (!q) return roster
    return roster.filter((p) => {
      const name = String(p.player_name || '').toLowerCase()
      const num = p.shirt_number != null ? String(p.shirt_number) : ''
      return name.includes(q) || num.includes(q)
    })
  }, [roster, value])

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const pick = (name) => {
    onChange(name)
    setOpen(false)
  }

  return (
    <div
      className={`league-player-combobox ${className}`.trim()}
      ref={wrapRef}
      style={style}
    >
      <Form.Control
        aria-label="Jugador"
        aria-expanded={open}
        aria-autocomplete="list"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(roster.length > 0)}
        autoComplete="off"
      />
      {open && roster.length > 0 && (
        <div className="league-player-combobox__menu" role="listbox">
          {filtered.length === 0 ? (
            <div className="league-player-combobox__empty">
              Sin coincidencias — se agregará como invitado
            </div>
          ) : (
            filtered.map((p) => {
              const key = `${p.player_name}::${teamId}`
              const suspended = suspendedSet?.has(key)
              return (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  className={`league-player-combobox__option${suspended ? ' league-player-combobox__option--suspended' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(p.player_name)}
                >
                  {p.shirt_number ? `${p.shirt_number}. ` : ''}
                  {p.player_name}
                  {p.role === 'guest' && <span className="league-player-combobox__meta"> Invitado</span>}
                  {suspended && <span className="league-player-combobox__meta league-player-combobox__meta--warning"> Sancionado</span>}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
