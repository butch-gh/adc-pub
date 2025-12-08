import { pool } from '../config/database';

/**
 * Log activity directly to database using sf_log_activity stored procedure
 * @param action - Action performed (e.g., 'create', 'update', 'delete')
 * @param module - Module name (e.g., 'role', 'appointment')
 * @param username - Username performing the action
 * @param ipAdd - IP address of the user
 * @param details - JSON stringified details object
 */
export async function logActivity(
  action: string,
  module: string,
  username: string,
  ipAdd: string,
  details: string
): Promise<void> {
  try {
    await pool.query(
      `SELECT * FROM sf_log_activity($1, $2, $3, $4, $5);`,
      [action, module, username, ipAdd, details]
    );
  } catch (error) {
    console.error('Failed to log activity to DB:', error);
    // Don't throw - logging failure shouldn't break the main operation
  }
}
