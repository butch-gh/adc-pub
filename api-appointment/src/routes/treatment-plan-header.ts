import express, { Request, Response } from 'express';
import { pool } from '../config/database';
import { extractUser } from '../middleware/extractUser';

const router = express.Router();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId: string;
    role: string;
    email: string;
    username: string;
  };
}

// =====================================
// Get single treatment plan header by ID
// =====================================
router.post('/get', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.body;
    const result = await pool.query('SELECT * FROM sf_get_treatment_plan_header($1);', [id]);
    res.status(200).json(result.rows[0] || null);
  } catch (error) {
    console.error('sf_get_treatment_plan_header error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// =====================================
// Get list of treatment plan headers (all or by patient_id)
// =====================================
router.post('/getall', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { patient_id } = req.body;
    console.log('Fetching treatment plan headers for patient_id:', patient_id);
    const result = await pool.query('SELECT * FROM sf_get_treatment_plan_header_list($1);', [patient_id || null]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('sf_get_treatment_plan_header_list error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// =====================================
// Insert new treatment plan header
// =====================================
router.post('/add', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { patient_id, plan_name, diagnosis_summary, status } = req.body;
    const created_by = req.user?.userId || req.user?.id;
    
    const result = await pool.query(
      `SELECT sf_insert_treatment_plan_header($1,$2,$3,$4,$5) AS new_id;`,
      [patient_id, plan_name, diagnosis_summary || null, created_by, status || 'Active']
    );
    res.status(201).json({ success: true, id: result.rows[0].new_id });
  } catch (error) {
    console.error('sf_insert_treatment_plan_header error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// =====================================
// Update treatment plan header
// =====================================
router.post('/update', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, patient_id, plan_name, diagnosis_summary, status } = req.body;
    const result = await pool.query(
      `SELECT sf_update_treatment_plan_header($1,$2,$3,$4,$5) AS updated;`,
      [id, patient_id, plan_name, diagnosis_summary || null, status]
    );
    res.status(200).json({ success: result.rows[0].updated });
  } catch (error) {
    console.error('sf_update_treatment_plan_header error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// =====================================
// Delete treatment plan header
// =====================================
router.post('/delete', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.body;
    const result = await pool.query('SELECT sf_delete_treatment_plan_header($1) AS deleted;', [id]);
    res.status(200).json({
      success: result.rows[0].deleted,
      message: result.rows[0].deleted ? 'Deleted successfully' : 'No record found'
    });
  } catch (error: any) {
    console.error('sf_delete_treatment_plan_header error:', error);
    if (error.code === '23503') {
      res.status(400).json({
        success: false,
        errorCode: error.code,
        message: 'Plan has entries or is referenced by another table'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal Server Error'
      });
    }
  }
});

export default router;
