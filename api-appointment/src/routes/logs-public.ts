import express, {Request, Response} from 'express';
import { pool } from '../config/database';

const router = express.Router();

  router.post('/add', async (req, res) => {
    try {
  
      const { action, module, ipAdd, details } = req.body;            
        console.log('req-activity-logs:', req.body)
        const result = await pool.query('SELECT * FROM sf_log_activity($1, $2, $3, $4, $5);',[action, module, 'guest', ipAdd, details]);
        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
  });


export default router;
