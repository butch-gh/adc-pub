
import express, { Request, Response } from 'express';
import { pool } from '../config/database';
import { extractUser } from '../middleware/extractUser';
import { logActivity } from '../utils/activityLogger';

const router = express.Router();

// Type for user context (for future expansion)
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId: string;
    role: string;
    email: string;
    username: string;
  };
}

router.post('/get', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.body;
    const result = await pool.query('SELECT * FROM sf_get_job($1);', [id]);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/getall', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM sf_get_job_list();');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/add', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    const result = await pool.query('SELECT * FROM sf_insert_job($1, $2);', [name, description]);
    const data = result.rows.map(row => row.sf_insert_job);
    res.status(201).json(data);
    await logActivity('create', 'jobs', req.user?.username || 'unknown', '127.0.0.1',
          JSON.stringify({ details: `Created : ${name}, ${description}`,
            status: 'success', endpoint: '/appointment/jobs/add'}));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/update', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, name, description } = req.body;
    const result = await pool.query('SELECT * FROM sf_update_job($1, $2, $3);', [id, name, description]);
    res.status(201).json(result.rows[0]);
    await logActivity('update', 'jobs', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `Updated : ${id}, ${name}, ${description}`,
        status: 'success', endpoint: '/appointment/jobs/update'}));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/delete', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.body;
    const result = await pool.query('SELECT * FROM sf_delete_job($1);', [id]);
    res.status(201).json({ result: result.rows[0], success: true, errorCode: '00000', message: 'success' });
    await logActivity('delete', 'jobs', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `Deleted : ${id}`,
        status: 'success', endpoint: '/appointment/jobs/delete'}));
  } catch (error: any) {
    console.error(error);
    if (error.code === '23503') {
      res.status(201).json({
        success: false,
        errorCode: error.code,
        message: error.message || 'An error occurred.',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal Server Error',
      });
    }
  }
});

export default router;