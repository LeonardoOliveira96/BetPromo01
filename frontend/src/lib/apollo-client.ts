import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// Cria o link HTTP para a API GraphQL
const httpLink = createHttpLink({
  uri: 'http://localhost:4000/graphql', // Ajuste para a URL correta da sua API
});

// Adiciona o token de autenticação ao cabeçalho se disponível
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('authToken');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  };
});

// Cria o cliente Apollo
export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});