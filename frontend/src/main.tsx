import ReactDOM from 'react-dom/client';
import { InternetIdentityProvider } from './hooks/useInternetIdentity';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <QueryClientProvider client={queryClient}>
        <InternetIdentityProvider>
            <App />
        </InternetIdentityProvider>
    </QueryClientProvider>
);
