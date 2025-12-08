
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
    const { id, dental_record_id } = req.body;
    //console.log('dental/get', req.body);
    const result = await pool.query('SELECT * FROM sf_get_dental_record($1, $2);', [id, dental_record_id]);
    //console.log('dental/res', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/getlist', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.body;
    //console.log('dental/getlist', req.body);
    const result = await pool.query('SELECT * FROM sf_get_dental_record_list($1);', [id]);
    console.log('dental/res', result.rows);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/getteethlist', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    //console.log('getteethlist', req.body);
    const result = await pool.query('SELECT * FROM sf_get_teeth_list();');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/add', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { patientId, treatmentId, groupTypeId, toothCode } = req.body;
    //console.log('trace', req.body);
    const result = await pool.query('SELECT * FROM sf_insert_dental_record($1, $2, $3, $4);', [patientId, treatmentId, groupTypeId, toothCode]);
    //const data = result.rows.map(row => row.sf_insert_dental);
    res.status(201).json(result.rows[0]);
    //res.status(201).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/update', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, patientId, treatmentId, groupTypeId, toothCode } = req.body;
    //console.log('trace', req.body);
    const result = await pool.query('SELECT * FROM sf_update_dental_record($1, $2, $3, $4, $5);', [id, patientId, treatmentId, groupTypeId, toothCode]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/delete', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.body;
    //console.log('trace', req.body, id);
    const result = await pool.query('SELECT * FROM sf_delete_dental($1);', [id]);
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