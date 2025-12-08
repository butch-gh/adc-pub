import { pool } from '../config/database';

export interface ActivityLogInput {
  action: string;
  module: string;
  username: string;
  ipAdd: string;
  details: object | string; // Accept both object and string (will be converted to JSONB)
}

export async function logActivity({
  action,
  module,
  username,
  ipAdd,
  details
}: ActivityLogInput): Promise<any> {
  try {
    await pool.query(
      `SELECT * FROM sf_log_activity($1, $2, $3, $4, $5);`,
      [action, module, username, '127.0.0.1', JSON.stringify(details)]
    );

  } catch (err) {
    console.error("logActivity error:", err);
    throw err; // Let caller handle error
  }
}