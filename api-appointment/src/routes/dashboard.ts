
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

router.post('/getstats', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM sf_get_dashboard_stat();');
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/getappointments', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM sf_get_dashboard_apointments();');
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/getbooking', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { num } = req.body;
        // Validate input
        if (typeof num !== 'number' || num < 0 || num > 3) {
            return res.status(400).json({ error: 'Invalid input. "num" must be a number between 0 and 3.' });
        }
        // Define mapping for month and day ranges
        const rangeMapping: Record<number, { type: string; value: number }> = {
            0: { type: 'month', value: 12 },
            1: { type: 'month', value: 6 },
            2: { type: 'day', value: 30 },
            3: { type: 'day', value: 7 },
        };
        // Determine range type and value
        const { type, value } = rangeMapping[num];
        // Prepare query based on range type
        const query = type === 'month'
            ? 'SELECT * FROM sf_get_month_range_booking($1);'
            : 'SELECT * FROM sf_get_days_range_booking($1);';
        // Execute the query
        const result = await pool.query(query, [value]);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching booking data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;