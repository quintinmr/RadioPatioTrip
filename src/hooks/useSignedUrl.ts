import { useQuery } from '@tanstack/react-query'
import { signedUrl } from '@/lib/storage'

export function useSignedUrl(bucket: 'media' | 'avatars', path: string | null | undefined) {
  const q = useQuery({
    queryKey: ['signed', bucket, path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: () => signedUrl(bucket, path),
  })
  return q.data ?? null
}
