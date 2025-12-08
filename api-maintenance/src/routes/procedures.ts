import express, { Request, Response } from 'express';
import { pool } from '../config/database';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router = express.Router();

// Validation schema for procedures
const procedureSchema = Joi.object({
  code: Joi.string().max(20).optional().allow(null, ''),
  name: Joi.string().max(150).required(),
  category: Joi.string().max(100).optional().allow(null, ''),
  default_cost: Joi.number().precision(2).optional().allow(null),
  description: Joi.string().optional().allow(null, '')
});

// Get all procedures with pagination and filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search, category } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    const conditions: string[] = [];

    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR code ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      conditions.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (conditions.length > 0) {
      whereClause = ' WHERE ' + conditions.join(' AND ');
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM procedures ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated procedures
    const query = `
      SELECT
        id,
        code,
        name,
        category,
        default_cost,
        description,
        created_at
      FROM procedures
      ${whereClause}
      ORDER BY name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(Number(limit), offset);
    const result = await pool.query(query, params);

    logger.info(`Maintenance: Retrieved ${result.rows.length} procedures`);

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
    logger.error('Error fetching procedures:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching procedures'
    });
  }
});

// Get all unique categories
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT DISTINCT category
      FROM procedures
      WHERE category IS NOT NULL AND category != ''
      ORDER BY category ASC
    `;
    
    const result = await pool.query(query);

    logger.info(`Maintenance: Retrieved ${result.rows.length} procedure categories`);

    res.json({
      success: true,
      data: result.rows.map(row => row.category)
    });
  } catch (error) {
    logger.error('Error fetching procedure categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching procedure categories'
    });
  }
});

// Get procedure by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        id,
        code,
        name,
        category,
        default_cost,
        description,
        created_at
      FROM procedures
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Procedure not found'
      });
    }

    logger.info(`Maintenance: Retrieved procedure ${id}`);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching procedure:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching procedure'
    });
  }
});

// Create new procedure
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = procedureSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    const { code, name, category, default_cost, description } = value;

    // Check if procedure with same name already exists
    const checkQuery = 'SELECT id FROM procedures WHERE name = $1';
    const checkResult = await pool.query(checkQuery, [name]);
    
    if (checkResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Procedure with this name already exists'
      });
    }

    // Insert new procedure
    const insertQuery = `
      INSERT INTO procedures (code, name, category, default_cost, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, code, name, category, default_cost, description, created_at
    `;

    const result = await pool.query(insertQuery, [
      code || null,
      name,
      category || null,
      default_cost || null,
      description || null
    ]);

    logger.success(`Maintenance: Created procedure ${result.rows[0].id} - ${name}`);

    res.status(201).json({
      success: true,
      message: 'Procedure created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error creating procedure:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating procedure'
    });
  }
});

// Update procedure
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = procedureSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    const { code, name, category, default_cost, description } = value;

    // Check if procedure exists
    const checkQuery = 'SELECT id FROM procedures WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Procedure not found'
      });
    }

    // Check if another procedure with same name exists
    const nameCheckQuery = 'SELECT id FROM procedures WHERE name = $1 AND id != $2';
    const nameCheckResult = await pool.query(nameCheckQuery, [name, id]);
    
    if (nameCheckResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Another procedure with this name already exists'
      });
    }

    // Update procedure
    const updateQuery = `
      UPDATE procedures
      SET code = $1, name = $2, category = $3, default_cost = $4, description = $5
      WHERE id = $6
      RETURNING id, code, name, category, default_cost, description, created_at
    `;

    const result = await pool.query(updateQuery, [
      code || null,
      name,
      category || null,
      default_cost || null,
      description || null,
      id
    ]);

    logger.success(`Maintenance: Updated procedure ${id} - ${name}`);

    res.json({
      success: true,
      message: 'Procedure updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error updating procedure:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating procedure'
    });
  }
});

// Delete procedure
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if procedure exists
    const checkQuery = 'SELECT id, name FROM procedures WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Procedure not found'
      });
    }

    const procedureName = checkResult.rows[0].name;

    // TODO: Add check for foreign key constraints if needed
    // For example, check if procedure is used in treatment plans

    // Delete procedure
    const deleteQuery = 'DELETE FROM procedures WHERE id = $1';
    await pool.query(deleteQuery, [id]);

    logger.success(`Maintenance: Deleted procedure ${id} - ${procedureName}`);

    res.json({
      success: true,
      message: 'Procedure deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting procedure:', error);
    
    // Check if it's a foreign key constraint error
    if ((error as any).code === '23503') {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete procedure as it is being used in treatment plans or other records'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error deleting procedure'
    });
  }
});

export default router;
