import { supabase } from './supabase'

const cache = new Map<string, { url: string; exp: number }>()
const TTL = 60 * 55 // segundos (firmamos por 1h y renovamos a los 55 min)

/** URL firmada (buckets privados) con caché en memoria. */
export async function signedUrl(bucket: 'media' | 'avatars', path: string | null | undefined): Promise<string | null> {
  if (!path) return null
  const key = `${bucket}/${path}`
  const hit = cache.get(key)
  if (hit && hit.exp > Date.now()) return hit.url
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)
  if (error || !data) return null
  cache.set(key, { url: data.signedUrl, exp: Date.now() + TTL * 1000 })
  return data.signedUrl
}

export function invalidateSigned(bucket: 'media' | 'avatars', path: string) {
  cache.delete(`${bucket}/${path}`)
}

export async function uploadToBucket(bucket: 'media' | 'avatars', path: string, body: Blob, contentType: string, upsert = false) {
  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType, upsert, cacheControl: '3600' })
  if (error) throw error
  invalidateSigned(bucket, path)
}
