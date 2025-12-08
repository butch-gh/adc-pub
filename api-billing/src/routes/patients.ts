import express from 'express';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

const router = express.Router();

// Get all patients
router.get('/', async (req, res) => {
  try {
    
    const { page = 1, limit = 10, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause = ` WHERE name ILIKE $${paramIndex} OR phone ILIKE $${paramIndex} OR email ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM patient ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated patients
    const query = `
      SELECT
        id as patient_id,
        first_name || ' ' || last_name as "name",
        contact_no as phone,
        email_address as email,
        birthdate as date_of_birth,
        sex as gender,
        address,
        created_date as created_at
      FROM patient
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(Number(limit), offset);
    const result = await pool.query(query, params);

    

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patients'
    });
  }
});

// Get patient by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        p.*,
        COUNT(i.id) as total_invoices,
        COALESCE(SUM(i.amount), 0) as total_amount
      FROM patient p
      LEFT JOIN invoice i ON p.id = i.patient_id
      WHERE p.id = $1
      GROUP BY p.id
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patient'
    });
  }
});

// Get treatment plans for a patient
router.get('/:id/treatment-plans', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
    tp.id AS plan_id,
    tp.patient_id,
    s.service_name
    FROM treatment_plan tp
    LEFT JOIN service s 
        ON s.id = tp.service_id
    WHERE tp.patient_id = $1  
    `;

    const result = await pool.query(query, [id]);
    
    

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching treatment plans:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching treatment plans'
    });
  }
});

// Create treatment plan
router.post('/treatment-plans', async (req, res) => {
  try {
    const { patient_id, charges } = req.body;

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert treatment plan
      const planQuery = `
        INSERT INTO treatment_plan (patient_id, status)
        VALUES ($1, 'planned')
        RETURNING id, patient_id, status
      `;
      const planResult = await client.query(planQuery, [patient_id]);
      const plan = planResult.rows[0];

      // Insert treatment charges if provided
      if (charges && charges.length > 0) {
        const chargeValues = charges.map((charge: any) =>
          `(${plan.plan_id}, ${charge.service_id}, ${charge.estimated_amount || null}, ${charge.notes ? `'${charge.notes}'` : null})`
        ).join(', ');

        const chargeQuery = `
          INSERT INTO treatment_charge (plan_id, service_id, estimated_amount, notes)
          VALUES ${chargeValues}
        `;
        await client.query(chargeQuery);
      }

      await client.query('COMMIT');

      

      res.status(201).json({
        success: true,
        data: plan
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating treatment plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating treatment plan'
    });
  }
});

export default router;
