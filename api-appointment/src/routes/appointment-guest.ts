
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

router.post('/add', async (req: Request, res: Response) => {
    try {
        const { firstName, lastName, mobileNumber, treatmentId, appointmentDate, appointmentTimeSlot } = req.body;
        const result = await pool.query(
            'SELECT * FROM sf_insert_appointment_guest($1, $2, $3, $4, $5, $6);',
            [firstName, lastName, mobileNumber, treatmentId, appointmentDate, appointmentTimeSlot]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/approve', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id, newStatus } = req.body;
        const username = req.user?.username;
        const result = await pool.query(
            'SELECT * FROM sf_update_guest_approval($1, $2, $3);',
            [id, username, newStatus]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/getdays', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM sf_get_appointment_days();');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/getslots', async (req: Request, res: Response) => {
    try {
        const { appointmentDate, dentistId } = req.body;
        console.log(appointmentDate, dentistId);
        const result = await pool.query('SELECT * FROM sf_get_appointment_slot($1, $2);', [appointmentDate, dentistId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/getOccupiedGuestSlots', async (req: Request, res: Response) => {
    try {
        const { date } = req.body;
        console.log("Occupied Slots:", date);
        const result = await pool.query('SELECT * FROM sf_get_appointment_guest_code($1);', [date]);
        console.log("Occupied Slots Data:", result.rows);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/notifstream', async (req: Request, res: Response) => {    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // <- Required for NGINX
    res.flushHeaders(); // <- Important: send headers immediately

    const sendData = async () => {
        const result = await pool.query('SELECT * FROM sf_get_appointment_guest();');
        res.write(`data: ${JSON.stringify(result.rows)}\n\n`);
    };

    // Immediately send first data so UI updates without waiting
    sendData();

    // Now send on interval defined by environment variable (fallback to 5000 ms)
    const SSE_INTERVAL_MS = (() => {
        const raw = process.env.SSE_INTERVAL_MS;
        const parsed = parseInt(raw ?? '5000', 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 5000;
    })();

    const intervalId = setInterval(sendData, SSE_INTERVAL_MS);

    // Cleanup when client disconnects
    req.on('close', () => {
        clearInterval(intervalId);
        res.end();
    });
});

export default router;