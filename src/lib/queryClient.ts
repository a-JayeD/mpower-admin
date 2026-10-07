import { MutationCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { friendlyError } from '@/utils/errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,           // avoid refetch storms on the free tier
      refetchOnWindowFocus: false, // no background polling
      retry: 1,
    },
  },
  mutationCache: new MutationCache({
    onError: (error, _v, _c, mutation) => {
      if (!mutation.options.onError) toast.error(friendlyError(error));
    },
  }),
});
