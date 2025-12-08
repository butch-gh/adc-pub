import express, { Request, Response } from 'express';
import { pool } from '../config/database';

const router = express.Router();

router.post('/getall', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM sf_get_treatment_list();');
    console.log('PUBLIC-treatment.getall', result.rows);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;