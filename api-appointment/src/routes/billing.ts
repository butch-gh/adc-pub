
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
        const { p_id, b_id } = req.body;
        const result = await pool.query('SELECT * FROM sf_get_billing($1, $2);', [p_id, b_id]);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/getList', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { p_id } = req.body;
        const result = await pool.query('SELECT * FROM sf_get_billing_list($1);', [p_id]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/getBreakdown', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { p_id, b_id } = req.body;
        const result = await pool.query('SELECT * FROM sf_get_billing_breakdown($1, $2);', [p_id, b_id]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/add', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { p_id, service_date, payment_date, payment_method, u_id, t_id, t_cost } = req.body;
        const result = await pool.query(
            'SELECT * FROM sf_insert_billing($1, $2, $3, $4, $5, $6, $7);',
            [p_id, service_date, payment_date, payment_method, u_id, t_id, t_cost]
        );
        const data = result.rows.map(row => row.sf_insert_billing);
        res.status(201).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/update', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { b_id, p_id, service_date, payment_date, payment_method, u_id, t_id, t_cost } = req.body;
        const result = await pool.query(
            'SELECT * FROM sf_update_billing($1, $2, $3, $4, $5, $6, $7, $8);',
            [b_id, p_id, service_date, payment_date, payment_method, u_id, t_id, t_cost]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/delete', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { p_id, b_id } = req.body;
        const result = await pool.query('SELECT * FROM sf_delete_billing($1, $2);', [p_id, b_id]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;