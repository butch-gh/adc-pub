import express from 'express';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

const router = express.Router();

// Get patient invoice by patient ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
    i.id as invoice_id,
    (select first_name || ' ' || last_name from dentist where id = i.dentist_id) as dentist_name,
    (select first_name || ' ' || last_name from patient where id = i.patient_id) as patient_name,
    i.dentist_id,
    i.patient_id
    FROM invoice i
    where i.patient_id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient invoice not found'
      });
    }

    logger.info(`Inventory: Retrieved patient invoice ${id}`);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching supplier:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching supplier'
    });
  }
});


// get Charge items for a patient by invoice ID
router.get('/:id/charges', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT tc.id as charge_id,
        tc.service_id,
        (select service_name from service where id = tc.service_id) as service_name
        FROM invoice i
        join treatment_charge tc on i.id = tc.invoice_id
        where i.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Charge items not found'
      });
    }

    logger.info(`Inventory: Retrieved charge items for patient ${id}`);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching charge items:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching charge items'
    });
  }
});

// Create new supplier
router.post('/', async (req, res) => {
  try {
    const {
      supplier_name,
      contact_person,
      phone,
      email,
      address
    } = req.body;

    const query = `
      INSERT INTO suppliers (supplier_name, contact_person, phone, email, address)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await pool.query(query, [
      supplier_name,
      contact_person,
      phone,
      email,
      address
    ]);

    logger.info(`Inventory: Created supplier ${result.rows[0].supplier_id}`, {
      supplier_name
    });

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Supplier created successfully'
    });
  } catch (error) {
    logger.error('Error creating supplier:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating supplier'
    });
  }
});

export default router;
