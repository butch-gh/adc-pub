import express, { Request, Response } from 'express';
import { pool } from '../config/database';
import { extractUser } from '../middleware/extractUser';

const router = express.Router();

// Type for user context (if needed for future expansion)
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
    const result = await pool.query('SELECT * FROM sf_get_treatment_service($1);', [id]);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/getall', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM sf_get_treatment_service_list();');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/add', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { description, duration } = req.body;
    const result = await pool.query('SELECT * FROM sf_insert_treatment_service($1, $2);', [description, duration]);
    const data = result.rows.map(row => row.sf_insert_treatment);
    res.status(201).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/update', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, description, duration } = req.body;
    const result = await pool.query('SELECT * FROM sf_update_treatment_service($1, $2, $3);', [id, description, duration]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/delete', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.body;
    const result = await pool.query('SELECT * FROM sf_delete_treatment_service($1);', [id]);
    res.status(201).json({ result: result.rows[0], success: true, errorCode: '00000', message: 'success' });
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