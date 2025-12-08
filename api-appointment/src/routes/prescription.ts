import express, { Request, Response } from 'express';
import { pool } from '../config/database';
import { extractUser } from '../middleware/extractUser';

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
        const { prescription_id, p_id } = req.body;
        const result = await pool.query('SELECT * FROM sf_get_prescription($1, $2);', [prescription_id, p_id]);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/getList', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { p_id } = req.body;
        const result = await pool.query('SELECT * FROM sf_get_prescription_list($1);', [p_id]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/add', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { p_id, date, medication, u_id } = req.body;
        const result = await pool.query('SELECT * FROM sf_insert_prescription($1, $2, $3, $4);', [p_id, date, medication, u_id]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/update', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { prescription_id, p_id, date, medication, u_id } = req.body;
        const result = await pool.query('SELECT * FROM sf_update_prescription($1, $2, $3, $4, $5);', [prescription_id, p_id, date, medication, u_id]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/delete', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { prescription_id, p_id } = req.body;
        const result = await pool.query('SELECT * FROM sf_delete_billing($1, $2);', [prescription_id, p_id]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;