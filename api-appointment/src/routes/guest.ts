import express, { Request, Response } from 'express';
import { pool } from '../config/database';
import { extractUser } from '../middleware/extractUser';

const router = express.Router();

// GET ONE
router.post('/get', extractUser, async (req: Request, res: Response) => {
    try {
        const { p_id } = req.body;
        const result = await pool.query(
            'SELECT * FROM sf_guest_get_appointment($1);',
            [p_id]
        );
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET ALL
router.post('/getall', extractUser, async (_req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM sf_guest_get_all_appointment();');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// INSERT
router.post('/insert', extractUser, async (req: Request, res: Response) => {
    try {
        const {
            firstName,
            lastName,
            mobileNumber,
            serviceId,
            appointmentDate,
            appointmentTimeSlot,
            status,
            updatedBy
        } = req.body;

        const result = await pool.query(
            'SELECT sf_guest_insert_appointment($1,$2,$3,$4,$5,$6,$7,$8) AS id;',
            [
                firstName,
                lastName,
                mobileNumber,
                serviceId,
                appointmentDate,
                appointmentTimeSlot,
                status,
                updatedBy
            ]
        );

        res.status(200).json({ message: 'Inserted Successfully', id: result.rows[0].id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// UPDATE
router.post('/update', extractUser, async (req: Request, res: Response) => {
    try {
        const {
            id,
            firstName,
            lastName,
            mobileNumber,
            serviceId,
            appointmentDate,
            appointmentTimeSlot,
            status,
            updatedBy
        } = req.body;

        console.log('UPDATE REQ BODY:', req.body);
        await pool.query(
            'SELECT sf_guest_update_appointment($1,$2,$3,$4,$5,$6,$7,$8,$9);',
            [
                id,
                firstName,
                lastName,
                mobileNumber,
                serviceId,
                appointmentDate,
                appointmentTimeSlot,
                status,
                updatedBy
            ]
        );

        res.status(200).json({ message: 'Updated Successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE
router.post('/delete', extractUser, async (req: Request, res: Response) => {
    try {
        const { id } = req.body;

        await pool.query('SELECT sf_guest_delete_appointment($1);', [id]);

        res.status(200).json({ message: 'Deleted Successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.post('/getOccupiedSlots', extractUser, async (req: Request, res: Response) => {
                try {
                    const { date } = req.body;
                    const result = await pool.query('SELECT * FROM sf_guest_get_appointment_code($1);', [date]);
                    res.status(200).json(result.rows);
                } catch (error) {
                    console.error(error);
                    res.status(500).json({ error: 'Internal Server Error' });
                }
            });

export default router;
