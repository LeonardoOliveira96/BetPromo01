// API service for REST endpoints
const API_BASE_URL = 'http://localhost:3000/api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data?: {
    token: string;
    user: {
      id: number;
      email: string;
      name: string;
      role: string;
    };
  };
  message?: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

class ApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async logout(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.user;
  }

  async refreshToken(): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async searchUsers(
    query: string,
    type: 'smartico_user_id' | 'user_ext_id' | 'both' = 'both',
    page: number = 1,
    limit: number = 20
  ): Promise<{
    success: boolean;
    data: {
      users: Array<{
        smartico_user_id: number;
        user_ext_id: string;
        core_sm_brand_id: number;
        crm_brand_id: number;
        ext_brand_id: string;
        crm_brand_name: string;
        current_promotions: string[];
        created_at: string;
        updated_at: string;
      }>;
      pagination: {
        currentPage: number;
        totalPages: number;
        totalCount: number;
        limit: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      };
    };
    message?: string;
  }> {
    const params = new URLSearchParams({
      query: query.trim(),
      type,
      page: page.toString(),
      limit: limit.toString()
    });

    const response = await fetch(`${API_BASE_URL}/search/users?${params}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getUserDetails(userId: string, type: string = 'smartico_user_id'): Promise<{
    success: boolean;
    data: {
      smartico_user_id: number;
      user_ext_id: string;
      core_sm_brand_id: number;
      crm_brand_id: number;
      ext_brand_id: string;
      crm_brand_name: string;
      current_promotions: string[];
      created_at: string;
      updated_at: string;
    };
    message?: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/search/users/${userId}?type=${type}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

export const apiService = new ApiService();