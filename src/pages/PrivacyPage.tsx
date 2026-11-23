import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="safe-top safe-bottom mx-auto max-w-lg px-5 pb-12">
      <header className="flex items-center gap-2 py-4">
        <Link to="/" className="rounded-full p-1.5 text-ink-2 hover:bg-card" aria-label="Volver"><ChevronLeft size={22} /></Link>
        <h1 className="text-2xl font-bold">Política de privacidad</h1>
      </header>
      <div className="space-y-4 text-sm leading-relaxed text-ink-2">
        <p className="text-xs text-ink-3">Versión 1.0 · RadioPatio Trip es una app privada de uso entre amigos, sin fines comerciales.</p>
        <H>Qué datos guardamos</H>
        <ul className="list-disc space-y-1 pl-5">
          <li><b>Cuenta:</b> email y contraseña (cifrada), gestionados por Supabase Auth. El email solo se usa para iniciar sesión y recuperar la cuenta.</li>
          <li><b>Perfil:</b> el nombre que elijas y, si quieres, una foto. Nada más.</li>
          <li><b>Contenido del viaje:</b> transportes, visitas, platos, fotos, vídeos, documentos, gastos, listas y diario que tú y tus amigos añadís.</li>
          <li><b>Consentimiento:</b> versión de esta política y fecha en la que la aceptaste.</li>
        </ul>
        <H>Qué NO guardamos</H>
        <ul className="list-disc space-y-1 pl-5">
          <li>Tu ubicación: se usa solo en tu móvil para centrar el mapa y abrir Google Maps. Nunca se envía al servidor.</li>
          <li>Metadatos de las fotos: al subirlas se recomprimen y se eliminan los datos EXIF (incluida la geolocalización de la cámara).</li>
          <li>Analítica, publicidad ni rastreadores de terceros.</li>
        </ul>
        <H>Quién puede ver tus datos</H>
        <p>Solo las personas que forman parte del mismo viaje que tú (reglas de seguridad a nivel de fila en la base de datos). Las fotos, vídeos y documentos están en almacenamiento privado y se sirven con enlaces temporales firmados. Nadie fuera del grupo puede acceder a ellos.</p>
        <H>Dónde se alojan</H>
        <p>En Supabase, en un centro de datos de la Unión Europea (región elegida al crear el proyecto). Google Maps se abre en tu dispositivo con la dirección de destino; no compartimos tu identidad con Google. El buscador de lugares usa OpenStreetMap (Nominatim), que recibe solo el texto que escribes. La previsión meteorológica (Open-Meteo) y el cambio de divisa (Frankfurter) reciben únicamente coordenadas de la ciudad y códigos de moneda.</p>
        <H>Tus derechos</H>
        <ul className="list-disc space-y-1 pl-5">
          <li><b>Acceso y portabilidad:</b> en "Mi cuenta" puedes descargar todos tus datos en JSON.</li>
          <li><b>Rectificación:</b> puedes editar tu nombre, tu foto y cualquier cosa que hayas añadido.</li>
          <li><b>Supresión:</b> en "Mi cuenta" puedes borrar tu cuenta. Se eliminan tu perfil, tu foto, todo lo que hayas subido y tus valoraciones. Lo que añadiste al plan común (una visita, un vuelo) se conserva anonimizado para que el resto del grupo no pierda el plan.</li>
          <li><b>Salir de un viaje:</b> dejas de ver sus datos al instante.</li>
        </ul>
        <H>Conservación</H>
        <p>Los datos existen mientras exista el viaje o tu cuenta. Al eliminar un viaje se borra todo su contenido, incluidos los archivos.</p>
        <H>Responsable</H>
        <p>La persona que administra el proyecto de Supabase del grupo. Para cualquier duda, pregúntale directamente en el grupo del viaje.</p>
      </div>
    </div>
  )
}

const H = ({ children }: { children: string }) => <h2 className="pt-2 text-lg font-bold text-ink">{children}</h2>
