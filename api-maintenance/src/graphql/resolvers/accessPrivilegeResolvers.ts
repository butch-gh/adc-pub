import { pool } from '../../config/database';
import { logActivity } from '../../middleware/activityLogger';

export const accessPrivilegeResolvers = {
  Query: {
    accessPrivilege: async (_parent: any, args: any, context: any) => {
      try {
        const { id } = args;
        const result = await pool.query('SELECT * FROM sf_get_access_privilege($1);', [id]);
        console.log('Fetched Access Privilege:', result.rows[0]);
        return result.rows[0];
      } catch (error) {
        console.error('Error fetching access privilege:', error);
        throw new Error('Error fetching access privilege');
      }
    },

    accessPrivileges: async (_parent: any, _args: any, context: any) => {
      try {
        const username = context.user?.username;
        console.log('Access Privilege Username:', username);
        const result = await pool.query('SELECT * FROM sf_get_access_privilege_list($1);', [username]);
        console.log('Fetched Access Privileges:', result.rows);
        return result.rows;
      } catch (error) {
        console.error('Error fetching access privileges:', error);
        throw new Error('Error fetching access privileges');
      }
    },

    roleLevel: async (_parent: any, _args: any, context: any) => {
      try {
        const username = context.user?.username;
        const result = await pool.query('SELECT * FROM sf_get_role_level($1);', [username]);
        return result.rows;
      } catch (error) {
        console.error('Error fetching role level:', error);
        throw new Error('Error fetching role level');
      }
    },

    accessScreens: async () => {
      try {
        const result = await pool.query('SELECT * FROM sf_get_access_screen();');
        return result.rows;
      } catch (error) {
        console.error('Error fetching access screens:', error);
        throw new Error('Error fetching access screens');
      }
    },

    accessScreenLov: async (_parent: any, args: any, context: any) => {
      try {
        const { level } = args;
        const username = context.user?.username;
        const result = await pool.query('SELECT * FROM sf_get_access_screen_lov($1, $2);', [username, level]);
        return result.rows;
      } catch (error) {
        console.error('Error fetching access screen LOV:', error);
        throw new Error('Error fetching access screen LOV');
      }
    }
  },

  // Field resolvers to map database fields to schema fields
  // Database returns: screen_code, screen_name OR code, description
  // Schema expects: code, description
  AccessScreen: {
    code: (parent: any) => parent.code || parent.screen_code,
    description: (parent: any) => parent.description || parent.screen_name,
  },

  Mutation: {
    createAccessPrivilege: async (_parent: any, args: any, context: any) => {
      try {
        const { input } = args;
        const { level, description, access } = input;
        
        const result = await pool.query(
          'SELECT * FROM sf_insert_role($1, $2, $3);',
          [level, description, access]
        );
        
        const data = result.rows.map(row => row.sf_insert_role);

        await logActivity({
          action: 'create',
          module: 'access-privileges',
          username: context.user?.username || 'unknown',
          ipAdd: '',
          details: JSON.stringify({
            details: `Created : ${level}, ${description}, ${access}`,
            status: 'success',
            endpoint: '/graphql - createAccessPrivilege'
          })
        });

        return {
          success: true,
          errorCode: '00000',
          message: 'Access privilege created successfully',
          result: JSON.stringify(data)
        };
      } catch (error) {
        console.error('Error creating access privilege:', error);
        
        await logActivity({
          action: 'create',
          module: 'access-privileges',
          username: context.user?.username || 'unknown',
          ipAdd: '',
          details: JSON.stringify({
            details: (error as Error).message,
            status: 'error',
            endpoint: '/graphql - createAccessPrivilege'
          })
        });

        throw new Error('Error creating access privilege');
      }
    },

    updateAccessPrivilege: async (_parent: any, args: any, context: any) => {
      try {
        const { input } = args;
        const { id, level, description, access } = input;

        const result = await pool.query(
          'SELECT * FROM sf_update_access_privilege($1, $2, $3, $4);',
          [id, level, description, access]
        );

        await logActivity({
          action: 'update',
          module: 'access-privileges',
          username: context.user?.username || 'unknown',
          ipAdd: '',
          details: JSON.stringify({
            details: `Updated : ${id}, ${level}, ${description}, ${access}`,
            status: 'success',
            endpoint: '/graphql - updateAccessPrivilege'
          })
        });

        return {
          success: true,
          errorCode: '00000',
          message: 'Access privilege updated successfully',
          result: JSON.stringify(result.rows[0])
        };
      } catch (error) {
        console.error('Error updating access privilege:', error);
        
        await logActivity({
          action: 'update',
          module: 'access-privileges',
          username: context.user?.username || 'unknown',
          ipAdd: '',
          details: JSON.stringify({
            details: (error as Error).message,
            status: 'error',
            endpoint: '/graphql - updateAccessPrivilege'
          })
        });

        throw new Error('Error updating access privilege');
      }
    },

    deleteAccessPrivilege: async (_parent: any, args: any, context: any) => {
      try {
        const { id } = args;
        const result = await pool.query('SELECT * FROM sf_delete_access_privilege($1);', [id]);
        
        return {
          success: true,
          errorCode: '00000',
          message: 'Access privilege deleted successfully',
          result: JSON.stringify(result.rows[0])
        };
      } catch (error) {
        console.error('Error deleting access privilege:', error);
        
        if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === '23503') {
          return {
            success: false,
            errorCode: (error as any).code,
            message: (error as any).message || 'Cannot delete - foreign key constraint',
            result: null
          };
        }

        throw new Error('Error deleting access privilege');
      }
    }
  }
};
