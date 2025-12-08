import express from 'express';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

const router = express.Router();


// =====================================
// Get list of treatment plan headers (all or by patient_id)
// =====================================
router.post('/getall', async (req, res) => {
  try {
    const { patientId } = req.body;
    
    const result = await pool.query('SELECT * FROM sf_get_treatment_plan_header_list($1);', [patientId || null]);
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('sf_get_treatment_plan_header_list error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



// =====================================
// Get list of treatment plan entries by planId
// =====================================
router.post('/getall-entries', async (req, res) => {
  try {
    const { planId } = req.body;
    if (!planId) {
      return res.status(400).json({ error: 'planId   is required' });
    }
    
    const result = await pool.query('SELECT * FROM sf_get_treatment_plan_entry_list($1);', [planId]);
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('sf_get_treatment_plan_entry_list error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
