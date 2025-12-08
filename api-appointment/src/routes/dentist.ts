
import express, { Request, Response } from 'express';
import { pool } from '../config/database';
import { extractUser } from '../middleware/extractUser';

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
    const result = await pool.query('SELECT * FROM sf_get_dentist_info($1);', [id]);
    res.status(200).json(result.rows[0]);
    //console.log('TRACE', result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/getlist', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM sf_get_dentist();');
    res.status(200).json(result.rows);
    //console.log('dentist.getlist', result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/getAll', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM sf_get_dentist_list();');
    res.status(200).json(result.rows);
    //console.log(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/getWorkingHour', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, appointmentDate } = req.body;
    console.log('TRACE-APPOINTMENTDATE', req.body);
    const result = await pool.query('SELECT * FROM sf_get_dentist_schedule($1,$2);', [id, appointmentDate]);
    res.status(200).json(result.rows[0]);
    console.log(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/add', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { firstName, lastName, mI, birthDate, sex, address, email, contactNo, schedule, times } = req.body;
    //console.log(req.body);
    const result = await pool.query(
      'SELECT * FROM sf_insert_dentist($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);',
      [firstName, lastName, mI, birthDate, sex, address, email, contactNo, schedule, times]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/update', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, firstName, lastName, mI, birthDate, sex, address, email, contactNo, schedule, times } = req.body;
    //console.log('trace', req.body);
    const result = await pool.query(
      'SELECT * FROM sf_update_dentist($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);',
      [id, firstName, lastName, mI, birthDate, sex, address, email, contactNo, schedule, times]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/delete', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.body;
    //console.log('id', req.body);
    const result = await pool.query('SELECT * FROM sf_delete_dentist($1);', [id]);
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