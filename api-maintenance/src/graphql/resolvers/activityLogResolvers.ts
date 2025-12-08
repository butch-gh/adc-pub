import { pool } from '../../config/database';

export const activityLogResolvers = {
  Query: {
    activityLogs: async () => {
      try {
        const result = await pool.query('SELECT * FROM sf_get_activity_logs();');
        return {
          success: true,
          data: result.rows
        };
      } catch (error) {
        console.error('Error fetching activity logs:', error);
        throw new Error('Error fetching activity logs');
      }
    }
  },

  Mutation: {
    logActivity: async (_parent: any, args: any, context: any) => {
      try {
        const { input } = args;
        const { action, module, ipAdd, details } = input;
        const username = context.user?.username;
        
        const result = await pool.query(
          'SELECT * FROM sf_log_activity($1, $2, $3, $4, $5);',
          [action, module, username, ipAdd, details]
        );
        
        return result.rows[0];
      } catch (error) {
        console.error('Error logging activity:', error);
        throw new Error('Error logging activity');
      }
    }
  }
};
