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
// Get single treatment plan entry by ID
// =====================================
router.post('/get', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.body;
    const result = await pool.query('SELECT * FROM sf_get_treatment_plan_entry($1);', [id]);
    res.status(200).json(result.rows[0] || null);
  } catch (error) {
    console.error('sf_get_treatment_plan_entry error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// =====================================
// Get list of treatment plan entries by plan_id
// =====================================
router.post('/getall', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { plan_id } = req.body;
    if (!plan_id) {
      return res.status(400).json({ error: 'plan_id is required' });
    }
    console.log('Fetching treatment plan entries for plan_id:', plan_id);
    const result = await pool.query('SELECT * FROM sf_get_treatment_plan_entry_list($1);', [plan_id]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('sf_get_treatment_plan_entry_list error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// =====================================
// Insert new treatment plan entry
// =====================================
router.post('/add', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      plan_id, 
      tooth_code, 
      procedure_id, 
      group_type_id,
      notes, 
      estimated_cost, 
      dentist_id, 
      status, 
      performed_date, 
      invoice_id      
    } = req.body;
    
    const result = await pool.query(
      `SELECT sf_insert_treatment_plan_entry($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) AS new_id;`,
      [
        plan_id, 
        tooth_code || null, 
        procedure_id, 
        group_type_id || null,
        notes || null, 
        estimated_cost || 0, 
        dentist_id || null, 
        status || 'Planned', 
        performed_date || null, 
        invoice_id || null
        
      ]
    );
    res.status(201).json({ success: true, id: result.rows[0].new_id });
  } catch (error) {
    console.error('sf_insert_treatment_plan_entry error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// =====================================
// Update treatment plan entry
// =====================================
router.post('/update', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      id, 
      plan_id, 
      tooth_code, 
      procedure_id, 
      group_type_id,
      notes, 
      estimated_cost, 
      dentist_id, 
      status, 
      performed_date, 
      invoice_id      
    } = req.body;
    
    const result = await pool.query(
      `SELECT sf_update_treatment_plan_entry($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) AS updated;`,
      [
        id, 
        plan_id, 
        tooth_code || null, 
        procedure_id, 
        group_type_id || null,
        notes || null, 
        estimated_cost, 
        dentist_id || null, 
        status, 
        performed_date || null, 
        invoice_id || null        
      ]
    );
    res.status(200).json({ success: result.rows[0].updated });
  } catch (error) {
    console.error('sf_update_treatment_plan_entry error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// =====================================
// Delete treatment plan entry
// =====================================
router.post('/delete', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.body;
    const result = await pool.query('SELECT sf_delete_treatment_plan_entry($1) AS deleted;', [id]);
    res.status(200).json({
      success: result.rows[0].deleted,
      message: result.rows[0].deleted ? 'Deleted successfully' : 'No record found'
    });
  } catch (error: any) {
    console.error('sf_delete_treatment_plan_entry error:', error);
    if (error.code === '23503') {
      res.status(400).json({
        success: false,
        errorCode: error.code,
        message: 'Entry is referenced by another table'
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
