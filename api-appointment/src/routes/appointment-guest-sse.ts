
import express, { Request, Response } from 'express';
import { pool } from '../config/database';

const router = express.Router();

router.get('/notifstream', async (req: Request, res: Response) => {    
    res.setHeader('Content-Type', 'text/event-stream');
    setInterval(async () => {
        const result = await pool.query('SELECT * FROM sf_get_appointment_guest();');
        console.log("Sending SSE Data:", result.rows);  
        res.write(`data: ${JSON.stringify(result.rows)}\n\n`);
    }, 1000);
});

export default router;