import express from 'express';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

const router = express.Router();



router.post('/getall', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sf_get_dentist_list();');
    res.status(200).json(result.rows);
    console.log(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


export default router;