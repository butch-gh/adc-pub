import express, {Request, Response} from 'express';
import { pool } from '../config/database';
import { extractUser } from '../middleware/extractUser'; // Import the middleware

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

    router.post('/get-appointment-type', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { rangeType } = req.body;
        console.log('rangeType', rangeType)
        // Define mapping for month and day ranges
        const rangeMapping = {
            '7DAYS': { type: 'day', value: 7 },
            '30DAYS': { type: 'day', value: 30 },
            '6MONTHS': { type: 'month', value: 6 },
            '12MONTHS': { type: 'month', value: 12 },
        } as const;

        type RangeTypeKey = keyof typeof rangeMapping;

        // Determine range type and value
        const { type, value } = rangeMapping[rangeType as RangeTypeKey];

        // Execute the query
        const result = await pool.query('SELECT * FROM sf_get_performance_appointment_type($1, $2)', [type, value]);

        // Log and send response
        console.log(`get-appointment-type data:`, result.rows[0]);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/get-patients-by-gender', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { rangeType } = req.body;
        console.log('rangeType', rangeType)
        // Define mapping for month and day ranges
        const rangeMapping = {
            '7DAYS': { type: 'day', value: 7 },
            '30DAYS': { type: 'day', value: 30 },
            '6MONTHS': { type: 'month', value: 6 },
            '12MONTHS': { type: 'month', value: 12 },
        };

        // Determine range type and value
        const { type, value } = rangeMapping[rangeType as keyof typeof rangeMapping];

        // Prepare query based on range type
        // const query = type === 'month' 
        //     ? 'SELECT * FROM sf_get_appointment_type_month($1);' 
        //     : 'SELECT * FROM sf_get_appointment_type_days($1);';

        // Execute the query
        const result = await pool.query('SELECT * FROM sf_get_performance_patients_by_gender($1, $2)', [type, value]);

        // Log and send response
        console.log(`get-patients-by-gender:`, result.rows[0]);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/get-patients-returning', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { rangeType } = req.body;
        console.log('rangeType', rangeType)
        // Define mapping for month and day ranges
        const rangeMapping = {
            '7DAYS': { type: 'day', value: 7 },
            '30DAYS': { type: 'day', value: 30 },
            '6MONTHS': { type: 'month', value: 6 },
            '12MONTHS': { type: 'month', value: 12 },
        };

        // Explicitly type rangeType and use type assertion
        type RangeTypeKey = keyof typeof rangeMapping;
        const { type, value } = rangeMapping[rangeType as RangeTypeKey];

        // Prepare query based on range type
        // const query = type === 'month' 
        //     ? 'SELECT * FROM sf_get_appointment_type_month($1);' 
        //     : 'SELECT * FROM sf_get_appointment_type_days($1);';

        // Execute the query
        const result = await pool.query('SELECT * FROM sf_get_performance_returning_patients($1, $2)', [type, value]);

        // Log and send response
        console.log(`get-patients-returning:`, result.rows[0]);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.post('/get-noshow-rate', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { rangeType } = req.body;
        console.log('rangeType', rangeType)
        // Define mapping for month and day ranges
        const rangeMapping = {
            '7DAYS': { type: 'day', value: 7 },
            '30DAYS': { type: 'day', value: 30 },
            '6MONTHS': { type: 'month', value: 6 },
            '12MONTHS': { type: 'month', value: 12 },
        };

        // Determine range type and value
        const { type, value } = rangeMapping[rangeType as keyof typeof rangeMapping];

        // Prepare query based on range type
        // const query = type === 'month' 
        //     ? 'SELECT * FROM sf_get_appointment_type_month($1);' 
        //     : 'SELECT * FROM sf_get_appointment_type_days($1);';

        // Execute the query
        const result = await pool.query('SELECT * FROM sf_get_performance_noshow_rate_patients($1, $2)', [type, value]);

        // Log and send response
        console.log(`get-noshow-rate:`, result.rows[0]);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/get-patients', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { num } = req.body;

        // Validate input
        if (typeof num !== 'number' || num < 0 || num > 3) {
            return res.status(400).json({ error: 'Invalid input. "num" must be a number between 0 and 3.' });
        }

        // Define mapping for month and day ranges
        const rangeMapping: { [key: number]: { type: string; value: number } } = {
            0: { type: 'month', value: 12 },
            1: { type: 'month', value: 6 },
            2: { type: 'day', value: 30 },
            3: { type: 'day', value: 7 },
        };

        // Determine range type and value
        const { type, value } = rangeMapping[num as number];

        // Prepare query based on range type
        const query = type === 'month' 
            ? 'SELECT * FROM sf_get_month_range_patients($1);' 
            : 'SELECT * FROM sf_get_days_range_patients($1);';

        // Execute the query
        const result = await pool.query(query, [value]);

        // Log and send response
        console.log(`Patients data for ${type}s:`, result.rows[0]);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;