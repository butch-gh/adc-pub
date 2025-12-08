import { pool } from '../../config/database';
import { logActivity } from '../../middleware/activityLogger';

export const usersResolvers = {
  Query: {
    users: async (_parent: any, args: any, context: any) => {      
      const client = await pool.connect();
      try {
        const username = context.user?.username;        
        const result = await pool.query('SELECT * FROM sf_get_user_access($1);', [username]);
        return result.rows[0];
      } catch (error) {
        console.error('Error fetching access privilege:', error);
        throw new Error('Failed to fetch access privilege');
      } finally {
        client.release();
      }
    },
  },
};