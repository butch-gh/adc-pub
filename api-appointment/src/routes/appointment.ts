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
        const { p_id } = req.body;
        const result = await pool.query('SELECT * FROM sf_get_appointment($1);', [p_id]);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

            router.post('/getAll', extractUser, async (req: AuthenticatedRequest, res: Response) => {
                try {
                    const result = await pool.query('SELECT * FROM sf_get_appointment_list();');
                    res.status(200).json(result.rows);
                } catch (error) {
                    console.error(error);
                    res.status(500).json({ error: 'Internal Server Error' });
                }
            });

            router.post('/getlatest', extractUser, async (req: AuthenticatedRequest, res: Response) => {
                try {
                    const result = await pool.query('SELECT * FROM sf_get_appointment_guest();');
                    res.status(200).json(result.rows);
                } catch (error) {
                    console.error(error);
                    res.status(500).json({ error: 'Internal Server Error' });
                }
            });

            router.post('/notifstream', async (req: Request, res: Response) => {
                console.log("SSE Connection Established", req);
                res.setHeader('Content-Type', 'text/event-stream');
                //setInterval(async () => {
                    const result = await pool.query('SELECT * FROM sf_get_appointment_guest();');
                    res.write(`data: ${JSON.stringify(result.rows)}\n\n`);
                //}, 5000);
            });

            router.post('/getslots', extractUser, async (req: AuthenticatedRequest, res: Response) => {
                try {
                    const { appointmentDate } = req.body;
                    const result = await pool.query('SELECT * FROM sf_get_appointment_slot($1);', [appointmentDate]);
                    res.status(200).json(result.rows);
                } catch (error) {
                    console.error(error);
                    res.status(500).json({ error: 'Internal Server Error' });
                }
            });

            router.post('/getOccupiedSlots', extractUser, async (req: AuthenticatedRequest, res: Response) => {
                try {
                    const { date, dentistId } = req.body;
                    const result = await pool.query('SELECT * FROM sf_get_appointment_code($1, $2);', [date, dentistId]);
                    res.status(200).json(result.rows);
                } catch (error) {
                    console.error(error);
                    res.status(500).json({ error: 'Internal Server Error' });
                }
            });

            router.post('/getAllRecord', extractUser, async (req: AuthenticatedRequest, res: Response) => {
                try {
                    const { id } = req.body;
                    const result = await pool.query('SELECT * FROM sf_get_appointment_record_list($1);', [id]);
                    res.status(200).json(result.rows);
                } catch (error) {
                    console.error(error);
                    res.status(500).json({ error: 'Internal Server Error' });
                }
            });

            router.post('/getAllToday', extractUser, async (req: AuthenticatedRequest, res: Response) => {
                try {
                    const result = await pool.query('SELECT * FROM sf_get_appointment_today();');
                    res.status(200).json(result.rows);
                } catch (error) {
                    console.error(error);
                    res.status(500).json({ error: 'Internal Server Error' });
                }
            });

            router.post('/getAllTomorrow', extractUser, async (req: AuthenticatedRequest, res: Response) => {
                try {
                    const result = await pool.query('SELECT * FROM sf_get_appointment_tomorrow();');
                    res.status(200).json(result.rows);
                } catch (error) {
                    console.error(error);
                    res.status(500).json({ error: 'Internal Server Error' });
                }
            });

            router.post('/getAllUpcoming', extractUser, async (req: AuthenticatedRequest, res: Response) => {
                try {
                    const { id } = req.body;
                    const result = await pool.query('SELECT * FROM sf_get_appointment_upcoming($1);', [id]);
                    res.status(200).json(result.rows);
                } catch (error) {
                    console.error(error);
                    res.status(500).json({ error: 'Internal Server Error' });
                }
            });

            router.post('/getStat', extractUser, async (req: AuthenticatedRequest, res: Response) => {
                try {
                    const result = await pool.query('SELECT * FROM sf_get_appointment_stat();');
                    res.status(200).json(result.rows);
                } catch (error) {
                    console.error(error);
                    res.status(500).json({ error: 'Internal Server Error' });
                }
            });

            router.post('/getdays', extractUser, async (req: AuthenticatedRequest, res: Response) => {
                try {
                    const result = await pool.query('SELECT * FROM sf_get_appointment_days();');
                    res.status(200).json(result.rows);
                } catch (error) {
                    console.error(error);
                    res.status(500).json({ error: 'Internal Server Error' });
                }
            });

            router.post('/add', extractUser, async (req: AuthenticatedRequest, res: Response) => {
                try {
                    const { patientId, dentistId, treatmentId, appointmentDate, appointmentTimeSlot, appointmentStatusId } = req.body;
                    const result = await pool.query(
                        'SELECT * FROM sf_insert_appointment($1, $2, $3, $4, $5, $6);',
                        [patientId, dentistId, treatmentId, appointmentDate, appointmentTimeSlot, appointmentStatusId]
                    );
                    res.status(200).json(result.rows[0]);
                } catch (error) {
                    console.error(error);
                    res.status(500).json({ error: 'Internal Server Error' });
                }
            });

            router.post('/update', extractUser, async (req: AuthenticatedRequest, res: Response) => {
                try {
                    const { id, patientId, dentistId, treatmentId, appointmentDate, appointmentTimeSlot, appointmentStatusId } = req.body;
                    const result = await pool.query(
                        'SELECT * FROM sf_update_appointment($1, $2, $3, $4, $5, $6, $7);',
                        [id, patientId, dentistId, treatmentId, appointmentDate, appointmentTimeSlot, appointmentStatusId]
                    );
                    res.status(200).json(result.rows[0]);
                } catch (error) {
                    console.error(error);
                    res.status(500).json({ error: 'Internal Server Error' });
                }
            });

            router.post('/delete', extractUser, async (req: AuthenticatedRequest, res: Response) => {
                try {
                    const { p_id } = req.body;
                    const result = await pool.query('SELECT * FROM sf_delete_appointment($1);', [p_id]);
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