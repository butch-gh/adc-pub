import { api } from './api';

// Types
export interface Procedure {
  id: number;
  code?: string;
  name: string;
  category?: string;
  default_cost?: number;
  description?: string;
  created_at?: string;
}

export interface AccessPrivilege {
  id: number;
  //name: string;
  description: string;
  access: string;
  //created_at?: string;
  level: number;  
}

export interface JobRole {
  id: number;
  name: string;
  description: string;  
  created_at?: string;
  updated_at?: string;
}

export interface RoleLevel {
  level: number;
  description: string;
}

export interface Screen {
  code: string;
  description: string;
  route: string;
  category: string;
}

export interface Service {
  id: number;
  code?: string;
  name: string;
  category?: string;
  price?: number;
  duration?: string;
  description?: string;
  created_at?: string;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  success: boolean;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Procedure API
export const procedureApi = {
  // Get all procedures with pagination and filtering
  getProcedures: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
  }): Promise<PaginatedResponse<Procedure>> => {
    const response = await api.get('/maintenance/procedures', { params });
    return response.data;
  },

  // Get unique categories
  getCategories: async (): Promise<ApiResponse<string[]>> => {
    const response = await api.get('/maintenance/procedures/categories');
    return response.data;
  },

  // Get procedure by ID
  getProcedure: async (id: number): Promise<ApiResponse<Procedure>> => {
    const response = await api.get(`/maintenance/procedures/${id}`);
    return response.data;
  },

  // Create new procedure
  createProcedure: async (data: Omit<Procedure, 'id' | 'created_at'>): Promise<ApiResponse<Procedure>> => {
    const response = await api.post('/maintenance/procedures', data);
    return response.data;
  },

  // Update procedure
  updateProcedure: async (id: number, data: Partial<Procedure>): Promise<ApiResponse<Procedure>> => {
    const response = await api.put(`/maintenance/procedures/${id}`, data);
    return response.data;
  },

  // Delete procedure
  deleteProcedure: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/maintenance/procedures/${id}`);
    return response.data;
  }
};

// Access Privilege API (to be implemented later)
export const accessPrivilegeApi = {
  getPrivileges: async (): Promise<ApiResponse<AccessPrivilege[]>> => {
    const response = await api.post('/appointment/role/getall');    
    return {
      data: response.data,
      success: true
    };
  },

  getPrivilege: async (id: number): Promise<ApiResponse<AccessPrivilege>> => {
    const response = await api.post(`/appointment/role/get`, { id });    
    return {
      data: response.data,
      success: true
    };
  },

  getRoleLevels: async (): Promise<ApiResponse<RoleLevel[]>> => {
    const response = await api.post('/appointment/role/getlevel');    
    return {
      data: response.data,
      success: true
    };
  },

  getScreensByLevel: async (level: number): Promise<ApiResponse<Screen[]>> => {    
    const response = await api.post('/appointment/role/getscreen-lov', { level });
    return {
      data: response.data,
      success: true
    };
  },

  // createPrivilege: async (data: Omit<AccessPrivilege, 'id' | 'created_at'>): Promise<ApiResponse<AccessPrivilege>> => {    
  //   const response = await api.post('/appointment/role/add', { description: data.description, selectedLevel: data.level, accessPermissions: data.access  });
  //       return {
  //     data: response.data,
  //     success: true
  //   };
  // },

  // updatePrivilege: async (id: number, data: Partial<AccessPrivilege>): Promise<ApiResponse<AccessPrivilege>> => {
  //   const response = await api.post('/appointment/role/update', { id, description: data.description, selectedLevel: data.level, accessPermissions: data.access  });
  //   return {
  //     data: response.data,
  //     success: true
  //   };
  // },

  deletePrivilege: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.post('/appointment/role/delete', { id });
    return {
      data: response.data,
      success: true
    };
  }
};

// Job Role API (to be implemented later)
export const jobRoleApi = {
  getRoles: async (): Promise<ApiResponse<JobRole[]>> => {
    const response = await api.post('/appointment/job/getall');
    return {
      data: response.data,
      success: true
    };
  },

  getRole: async (id: number): Promise<ApiResponse<JobRole>> => {
    const response = await api.post(`/appointment/job/get`, { id });
    return {
      data: response.data,
      success: true
    };
  },

  createRole: async (data: Omit<JobRole, 'id' | 'created_at'>): Promise<ApiResponse<JobRole>> => {
    const response = await api.post('/appointment/job/add', data);
    return {
      data: response.data,
      success: true
    };
  },

  updateRole: async (id: number, data: Partial<JobRole>): Promise<ApiResponse<JobRole>> => {
    const response = await api.post(`/appointment/job/update`, { id, ...data });
    return {
      data: response.data,
      success: true
    };
  },

  deleteRole: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.post(`/appointment/job/delete`, { id });
    return {
      data: response.data,
      success: true
    };
  }
};


export const userAccountSettingsApi = {
  // change password
  changePassword: async (currentPassword: string, newPassword: string): Promise<ApiResponse<string>> => {
    const response = await api.post('/appointment/security/changepw', { currentPassword, newPassword });
    return {
      data: response.data,
      success: true
    };
  },
  // change user name 
  changeUserName: async (currentUserName: string, newUserName: string): Promise<ApiResponse<string>> => {
    const response = await api.post('/appointment/security/changeun', { currentUserName, newUserName });
    return {
      data: response.data,
      success: true
    };
  }
};

// Service API 
export const serviceApi = {
  getServices: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
  }): Promise<PaginatedResponse<Service>> => {
    const response = await api.get('/maintenance/services', { params });
    return response.data;
  },

  getService: async (id: number): Promise<ApiResponse<Service>> => {
    const response = await api.get(`/maintenance/services/${id}`);
    return response.data;
  },

  createService: async (data: Omit<Service, 'id' | 'created_at'>): Promise<ApiResponse<Service>> => {
    const response = await api.post('/maintenance/services', data);
    return response.data;
  },

  updateService: async (id: number, data: Partial<Service>): Promise<ApiResponse<Service>> => {
    const response = await api.put(`/maintenance/services/${id}`, data);
    return response.data;
  },

  deleteService: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/maintenance/services/${id}`);
    return response.data;
  }
};


// User Access API
export const userAccessApi = {
  // Get user access items
  getUserAccessCode: async (): Promise<ApiResponse<string>> => {
    const response = await api.post('/appointment/user/get-access');
    return {
      data: response.data.access,
      success: true,
      message: 'Successfully fetched user access codes'
    };
  }
};