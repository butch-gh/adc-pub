import express, { Request, Response } from 'express';
import { pool } from '../config/database';
import { extractUser } from '../middleware/extractUser';

const router = express.Router();

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
    const result = await pool.query('SELECT * FROM sf_get_specialty();');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/add', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { description } = req.body;
    const result = await pool.query('SELECT * FROM sf_insert_specialty($1);', [description]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/update', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, description } = req.body;
    const result = await pool.query('SELECT * FROM sf_update_specialty($1, $2);', [id, description]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/delete', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.body;
    const result = await pool.query('SELECT * FROM sf_delete_specialty($1);', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;