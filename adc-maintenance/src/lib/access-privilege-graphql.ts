import { graphqlClient } from './graphql-client';
import { AccessPrivilege, RoleLevel, Screen, ApiResponse } from './maintenance-api';

export const accessPrivilegeGraphQL = {
  // Get all access privileges
  getPrivileges: async (): Promise<ApiResponse<AccessPrivilege[]>> => {
    const query = `
      query {
        accessPrivileges {
          id
          level
          description
          access          
        }
      }
    `;

    try {
      const data = await graphqlClient.request<{ accessPrivileges: any[] }>(query);
      
      // Transform the response to match the expected format
      const privileges: AccessPrivilege[] = data.accessPrivileges.map((item: any) => ({
        id: parseInt(item.id),
        level: parseInt(item.level),
        description: item.description || '',
        access: item.access_permissions || ''
      }));

      return {
        data: privileges,
        success: true
      };
    } catch (error) {
      console.error('GraphQL getPrivileges error:', error);
      throw error;
    }
  },

  // Get single access privilege by ID
  getPrivilege: async (id: number): Promise<ApiResponse<AccessPrivilege>> => {
    const query = `
      query GetAccessPrivilege($id: ID!) {
        accessPrivilege(id: $id) {
          id
          level
          description
          access          
        }
      }
    `;

    try {
      const data = await graphqlClient.request<{ accessPrivilege: any }>(query, { id: id.toString() });
      
      const privilege: AccessPrivilege = {
        id: parseInt(data.accessPrivilege.id),
        level: parseInt(data.accessPrivilege.level),
        description: data.accessPrivilege.description || '',
        access: data.accessPrivilege.access || ''
      };

      return {
        data: privilege,
        success: true
      };
    } catch (error) {
      console.error('GraphQL getPrivilege error:', error);
      throw error;
    }
  },

  // Get role levels
  getRoleLevels: async (): Promise<ApiResponse<RoleLevel[]>> => {
    const query = `
      query {
        roleLevel {
          level
          description
        }
      }
    `;

    try {
      const data = await graphqlClient.request<{ roleLevel: any[] }>(query);
      //console.log('Fetched role levels:', data);
      const roleLevels: RoleLevel[] = data.roleLevel.map((item: any) => ({
        level: item.level,
        description: item.description
      }));
      
      return {
        data: roleLevels,
        success: true
      };
    } catch (error) {
      console.error('GraphQL getRoleLevels error:', error);
      throw error;
    }
  },

  // Get screens by level (LOV - List of Values)
  getScreensByLevel: async (level: number): Promise<ApiResponse<Screen[]>> => {
    const query = `
      query GetAccessScreens($level: Int!) {
        accessScreenLov(level: $level) {          
            code
            description
            route
            category
        }
      }
    `;

    try {
      const data = await graphqlClient.request<{ accessScreenLov: Screen[] }>(query, { level });
      console.log('Fetched access screen LOV data:', data);
      const screens: Screen[] = data.accessScreenLov.map((item: any) => ({
        code: item.code,
        description: item.description,
        route: item.route,
        category: item.category || ''
      }));
      console.log('Fetched screens by level:', screens);
      return {
        data: screens,
        success: true
      };
    } catch (error) {
      console.error('GraphQL getScreensByLevel error:', error);
      throw error;
    }
  },

  // Create new access privilege
  createPrivilege: async (data: Omit<AccessPrivilege, 'id' | 'created_at'>): Promise<ApiResponse<AccessPrivilege>> => {
    const mutation = `
      mutation CreateAccessPrivilege($input: AccessPrivilegeInput!) {
        createAccessPrivilege(input: $input) {
          success
          errorCode
          message
          result
        }
      }
    `;

    try {
      const result = await graphqlClient.request<{ createAccessPrivilege: any }>(mutation, {
        input: {
          level: data.level,
          description: data.description,
          access: data.access
        }
      });

      if (!result.createAccessPrivilege.success) {
        throw new Error(result.createAccessPrivilege.message || 'Failed to create privilege');
      }

      return {
        data: {
          id: 0, // Will be assigned by server
          level: data.level,
          description: data.description,
          access: data.access
        },
        success: true,
        message: result.createAccessPrivilege.message
      };
    } catch (error) {
      console.error('GraphQL createPrivilege error:', error);
      throw error;
    }
  },

  // Update access privilege
  updatePrivilege: async (id: number, data: Partial<AccessPrivilege>): Promise<ApiResponse<AccessPrivilege>> => {
    const mutation = `
      mutation UpdateAccessPrivilege($input: AccessPrivilegeUpdateInput!) {
        updateAccessPrivilege(input: $input) {
          success
          errorCode
          message
          result
        }
      }
    `;

    try {
      const result = await graphqlClient.request<{ updateAccessPrivilege: any }>(mutation, {
        input: {
          id: id,
          level: data.level || 0,
          description: data.description || '',
          access: data.access || ''
        }
      });

      if (!result.updateAccessPrivilege.success) {
        throw new Error(result.updateAccessPrivilege.message || 'Failed to update privilege');
      }

      return {
        data: {
          id,
          level: data.level || 0,
          description: data.description || '',
          access: data.access || ''
        },
        success: true,
        message: result.updateAccessPrivilege.message
      };
    } catch (error) {
      console.error('GraphQL updatePrivilege error:', error);
      throw error;
    }
  },

  // Delete access privilege
  deletePrivilege: async (id: number): Promise<ApiResponse<void>> => {
    const mutation = `
      mutation DeleteAccessPrivilege($id: ID!) {
        deleteAccessPrivilege(id: $id) {
          success
          errorCode
          message
          result
        }
      }
    `;

    try {
      const result = await graphqlClient.request<{ deleteAccessPrivilege: any }>(mutation, { id: id.toString() });

      if (!result.deleteAccessPrivilege.success) {
        throw new Error(result.deleteAccessPrivilege.message || 'Failed to delete privilege');
      }

      return {
        data: undefined,
        success: true,
        message: result.deleteAccessPrivilege.message
      };
    } catch (error) {
      console.error('GraphQL deletePrivilege error:', error);
      throw error;
    }
  }
};
