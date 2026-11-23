import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Field, Spinner, errMsg, toast } from '@/components/ui'

export const CONSENT_VERSION = '1.0'
/** Siempre apunta al APK de la última Release (descarga pública, sin cuenta de GitHub). */
const APK_URL = 'https://github.com/quintinmr/RadioPatioTrip/releases/latest/download/RadioPatioTrip.apk'

export default function AuthPage() {
  const { user, loading } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState<string | null>(null)

  if (loading) return null
  if (user) return <Navigate to="/" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setInfo(null)
    try {
      if (mode === 'signup') {
        if (!consent) throw new Error('Debes aceptar la política de privacidad')
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: name.trim(), consent_version: CONSENT_VERSION }, emailRedirectTo: window.location.origin },
        })
        if (error) throw error
        if (!data.session) setInfo('Te hemos enviado un correo para confirmar la cuenta. Ábrelo y vuelve aquí.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      toast.err(errMsg(err))
    } finally { setBusy(false) }
  }

  const magic = async () => {
    if (!email) return toast.err('Escribe tu email')
    setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
    setBusy(false)
    if (error) toast.err(error.message); else setInfo('Enlace mágico enviado. Revisa tu correo.')
  }

  return (
    <div className="safe-top safe-bottom flex min-h-full flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-20 w-20 rounded-3xl bg-gradient-to-br from-sky to-bg-2 shadow-lg shadow-sky/20 grid place-items-center text-4xl">🏴󠁧󠁢󠁳󠁣󠁴󠁿</div>
          <h1 className="text-4xl font-extrabold tracking-tight">RadioPatio <span className="text-gold">Trip</span></h1>
          <p className="mt-2 text-ink-2">Organizad el viaje. Vividlo. Guardadlo.</p>
        </div>

        <div className="mb-4 flex rounded-xl bg-card p-1">
          {(['login', 'signup'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${mode === m ? 'bg-gold text-bg' : 'text-ink-2'}`}>
              {m === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="card space-y-4 p-5">
          {mode === 'signup' && (
            <Field label="Tu nombre (como te verán tus amigos)">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} autoComplete="name" />
            </Field>
          )}
          <Field label="Email">
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" inputMode="email" />
          </Field>
          <Field label="Contraseña">
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
          </Field>
          {mode === 'signup' && (
            <label className="flex items-start gap-3 text-sm text-ink-2">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-gold" />
              <span>He leído y acepto la <Link to="/privacidad" className="text-gold underline">política de privacidad</Link>. Mis datos (nombre, foto y lo que suba) solo los verán los miembros de mis viajes.</span>
            </label>
          )}
          {info && <p className="rounded-xl bg-moss/15 px-3 py-2 text-sm text-moss">{info}</p>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? <Spinner /> : mode === 'login' ? 'Entrar' : 'Crear cuenta'}</button>
          {mode === 'login' && (
            <button type="button" onClick={magic} disabled={busy} className="w-full text-center text-sm text-ink-2 underline-offset-2 hover:underline">Entrar con enlace mágico (sin contraseña)</button>
          )}
        </form>
        {!Capacitor.isNativePlatform() && (
          <div className="card mt-6 p-4 text-center text-sm text-ink-2">
            <p className="font-semibold text-ink">¿Cómo instalarla?</p>
            <p className="mt-1"><b>Android:</b> <a href={APK_URL} className="text-gold underline">descarga el APK</a> y ábrelo (acepta "instalar desde este origen").</p>
            <p className="mt-1"><b>iPhone:</b> en Safari pulsa Compartir → "Añadir a pantalla de inicio".</p>
            <p className="mt-1">O úsala directamente aquí en el navegador. No hace falta cuenta de GitHub.</p>
          </div>
        )}
        <p className="mt-4 text-center text-xs text-ink-3">Datos alojados en la UE · <Link to="/privacidad" className="underline">Privacidad</Link></p>
      </div>
    </div>
  )
}
