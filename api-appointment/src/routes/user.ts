import express, { Request, Response } from 'express';
import { pool } from '../config/database';
import { extractUser } from '../middleware/extractUser';
import bcrypt from 'bcryptjs';

const router = express.Router();

interface AuthenticatedRequest extends Request {
  body: any;
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
    const result = await pool.query('SELECT * FROM sf_get_user($1);', [id]);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/getinfo', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username } = req.user!;
    const result = await pool.query('SELECT * FROM sf_get_user_info($1);', [username]);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/getall', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username } = req.user!;
    const result = await pool.query('SELECT * FROM sf_get_user_list($1);', [username]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/getStat', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM sf_get_user_stat();');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/get-access', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username } = req.user!;
    const result = await pool.query('SELECT * FROM sf_get_user_access($1);', [username]);
    //console.log('GET-ACCESS RESULT', result.rows[0]);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/update', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, firstName, lastName, mI, birthDate, sex, job, daysOnDuty, address, email, contactNo, role, status } = req.body;
    const result = await pool.query('SELECT * FROM sf_update_user($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);',
      [id, firstName, lastName, mI, birthDate, sex, job, daysOnDuty, address, email, contactNo, role, status]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/updateAccount', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, un, pw } = req.body;
    const hashedPassword = await bcrypt.hash(pw, 8);
    const result = await pool.query('SELECT * FROM sf_update_account($1, $2, $3);', [id, un, hashedPassword]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/delete', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.body;
    const result = await pool.query('SELECT * FROM sf_delete_user($1);', [id]);
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