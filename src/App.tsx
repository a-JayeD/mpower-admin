import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/hooks/useAuth';
import { ConfirmProvider } from '@/hooks/useConfirm';
import { AppRoutes } from '@/routes/AppRoutes';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ConfirmProvider>
            <AppRoutes />
            <Toaster position="top-right" richColors closeButton toastOptions={{ className: 'font-sans' }} />
          </ConfirmProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
