import express from 'express';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

const router = express.Router();

// Get all suppliers
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause = ` WHERE supplier_name ILIKE $${paramIndex} OR contact_person ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM suppliers ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated suppliers
    const query = `
      SELECT 
        supplier_id,
        supplier_name,
        contact_person,
        phone,
        email,
        address,
        created_at
      FROM suppliers
      ${whereClause}
      ORDER BY supplier_name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(Number(limit), offset);
    const result = await pool.query(query, params);

    logger.info(`Inventory: Retrieved ${result.rows.length} suppliers`);

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
    logger.error('Error fetching suppliers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching suppliers'
    });
  }
});

// Get supplier by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        s.*,
        COUNT(i.item_id) as total_items
      FROM suppliers s
      LEFT JOIN inventory i ON s.supplier_id = i.supplier_id
      WHERE s.supplier_id = $1
      GROUP BY s.supplier_id
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    logger.info(`Inventory: Retrieved supplier ${id}`);

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
