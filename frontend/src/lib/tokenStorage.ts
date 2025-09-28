/**
 * Utilitário para gerenciamento de tokens com expiração
 * Armazena tokens no localStorage com data de expiração
 */

interface TokenData {
  token: string;
  expiresAt: number; // timestamp em millisegundos
  refreshAt: number; // timestamp para refresh automático
}

const TOKEN_KEY = 'auth_token_data';
const DEFAULT_EXPIRY_DAYS = 7; // 7 dias por padrão

export class TokenStorage {
  /**
   * Armazena token com data de expiração
   * @param token - JWT token
   * @param expiryDays - Dias até expiração (padrão: 7 dias)
   */
  static setToken(token: string, expiryDays: number = 7): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);
    const refreshAt = new Date(now.getTime() + (expiryDays - 1) * 24 * 60 * 60 * 1000);

    const tokenData = {
      token,
      expiresAt: expiresAt.toISOString(),
      refreshAt: refreshAt.toISOString()
    };

    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokenData));
  }

  /**
   * Recupera token se ainda válido
   * @returns Token válido ou null se expirado
   */
  static getToken(): string | null {
    try {
      const storedData = localStorage.getItem(TOKEN_KEY);
      
      if (!storedData) {
        // Fallback para tokens antigos (sem estrutura de expiração)
        const oldToken = localStorage.getItem('token');
        if (oldToken) {
          // Migra para nova estrutura com expiração padrão
          this.setToken(oldToken);
          return oldToken;
        }
        return null;
      }

      const tokenData: TokenData = JSON.parse(storedData);
      const now = new Date();
      const expiresAt = new Date(tokenData.expiresAt);

      // Verifica se o token expirou
      if (now >= expiresAt) {
        this.clearToken();
        return null;
      }

      return tokenData.token;
    } catch (error) {
      console.error('Erro ao recuperar token:', error);
      // Em caso de erro, limpa dados corrompidos
      this.clearToken();
      return null;
    }
  }

  /**
   * Verifica se o token precisa ser renovado
   * @returns true se precisa renovar
   */
  static shouldRefresh(): boolean {
    try {
      const storedData = localStorage.getItem(TOKEN_KEY);
      if (!storedData) {
        return false;
      }

      const tokenData: TokenData = JSON.parse(storedData);
      const now = Date.now();

      return now >= tokenData.refreshAt && now < tokenData.expiresAt;
    } catch (error) {
      console.error('Erro ao verificar refresh:', error);
      return false;
    }
  }

  /**
   * Verifica se existe token válido
   * @returns true se existe token válido
   */
  static hasValidToken(): boolean {
    return this.getToken() !== null;
  }

  /**
   * Remove token do armazenamento
   */
  static clearToken(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('token'); // Remove token antigo também
    } catch (error) {
      console.error('Erro ao limpar token:', error);
    }
  }

  /**
   * Obtém informações sobre o token
   * @returns Informações do token ou null
   */
  static getTokenInfo(): { expiresAt: Date; refreshAt: Date; daysLeft: number } | null {
    try {
      const storedData = localStorage.getItem(TOKEN_KEY);
      if (!storedData) {
        return null;
      }

      const tokenData: TokenData = JSON.parse(storedData);
      const now = Date.now();
      const daysLeft = Math.ceil((tokenData.expiresAt - now) / (24 * 60 * 60 * 1000));

      return {
        expiresAt: new Date(tokenData.expiresAt),
        refreshAt: new Date(tokenData.refreshAt),
        daysLeft: Math.max(0, daysLeft)
      };
    } catch (error) {
      console.error('Erro ao obter informações do token:', error);
      return null;
    }
  }

  /**
   * Estende a validade do token
   * @param additionalDays - Dias adicionais de validade
   */
  static extendToken(additionalDays: number = DEFAULT_EXPIRY_DAYS): boolean {
    try {
      const storedData = localStorage.getItem(TOKEN_KEY);
      if (!storedData) {
        return false;
      }

      const tokenData: TokenData = JSON.parse(storedData);
      const now = Date.now();
      
      // Estende a validade
      tokenData.expiresAt = now + (additionalDays * 24 * 60 * 60 * 1000);
      tokenData.refreshAt = now + ((additionalDays - 1) * 24 * 60 * 60 * 1000);

      localStorage.setItem(TOKEN_KEY, JSON.stringify(tokenData));
      return true;
    } catch (error) {
      console.error('Erro ao estender token:', error);
      return false;
    }
  }
}