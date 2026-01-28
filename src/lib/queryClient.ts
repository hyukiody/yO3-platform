import { QueryClient } from '@tanstack/react-query';

/**
 * Configuração do React Query Client
 * Fornece cache inteligente e gerenciamento de estado para requisições
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache de dados por 5 minutos
      staleTime: 1000 * 60 * 5,
      
      // Manter dados em cache por 10 minutos
      gcTime: 1000 * 60 * 10,
      
      // Retry automático em caso de falha
      retry: 2,
      
      // Refetch quando a janela ganha foco
      refetchOnWindowFocus: false,
      
      // Não refetch automaticamente ao montar
      refetchOnMount: true,
    },
    mutations: {
      // Retry uma vez para mutações
      retry: 1,
    },
  },
});
