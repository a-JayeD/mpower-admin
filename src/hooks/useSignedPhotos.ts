import { useQuery } from '@tanstack/react-query';
import { signedStudentPhotoUrls } from '@/services/storage';

/** Batch-sign private student photo paths (one request per page of students). */
export function useSignedPhotos(paths: Array<string | null | undefined>) {
  const clean = [...new Set(paths.filter((p): p is string => Boolean(p)))].sort();
  return useQuery({
    queryKey: ['signed-photos', clean],
    queryFn: () => signedStudentPhotoUrls(clean),
    enabled: clean.length > 0,
    staleTime: 20 * 60 * 1000, // URLs live 30 min
  }).data ?? {};
}
