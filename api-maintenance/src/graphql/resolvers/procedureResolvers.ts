import { pool } from '../../config/database';
import { logger } from '../../utils/logger';
import Joi from 'joi';

// Validation schema for procedures
const procedureSchema = Joi.object({
  code: Joi.string().max(20).optional().allow(null, ''),
  name: Joi.string().max(150).required(),
  category: Joi.string().max(100).optional().allow(null, ''),
  default_cost: Joi.number().precision(2).optional().allow(null),
  description: Joi.string().optional().allow(null, '')
});

export const procedureResolvers = {
  Query: {
    procedures: async (_parent: any, args: any) => {
      try {
        const { pagination = {}, filter = {} } = args;
        const { page = 1, limit = 10 } = pagination;
        const { search, category } = filter;
        const offset = (page - 1) * limit;

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
        
        params.push(limit, offset);
        const result = await pool.query(query, params);

        logger.info(`Maintenance: Retrieved ${result.rows.length} procedures`);

        return {
          success: true,
          data: result.rows,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        };
      } catch (error) {
        logger.error('Error fetching procedures:', error);
        throw new Error('Error fetching procedures');
      }
    },

    procedure: async (_parent: any, args: any) => {
      try {
        const { id } = args;

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
          return {
            success: false,
            message: 'Procedure not found',
            data: null
          };
        }

        logger.info(`Maintenance: Retrieved procedure ${id}`);

        return {
          success: true,
          data: result.rows[0]
        };
      } catch (error) {
        logger.error('Error fetching procedure:', error);
        throw new Error('Error fetching procedure');
      }
    },

    procedureCategories: async () => {
      try {
        const query = `
          SELECT DISTINCT category
          FROM procedures
          WHERE category IS NOT NULL AND category != ''
          ORDER BY category ASC
        `;
        
        const result = await pool.query(query);

        logger.info(`Maintenance: Retrieved ${result.rows.length} procedure categories`);

        return result.rows.map(row => row.category);
      } catch (error) {
        logger.error('Error fetching procedure categories:', error);
        throw new Error('Error fetching procedure categories');
      }
    }
  },

  Mutation: {
    createProcedure: async (_parent: any, args: any) => {
      try {
        const { input } = args;

        // Validate input
        const { error, value } = procedureSchema.validate(input);
        if (error) {
          return {
            success: false,
            message: `Validation error: ${error.details.map(d => d.message).join(', ')}`,
            data: null
          };
        }

        const { code, name, category, default_cost, description } = value;

        // Check if procedure with same name already exists
        const checkQuery = 'SELECT id FROM procedures WHERE name = $1';
        const checkResult = await pool.query(checkQuery, [name]);
        
        if (checkResult.rows.length > 0) {
          return {
            success: false,
            message: 'Procedure with this name already exists',
            data: null
          };
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

        logger.info(`Maintenance: Created procedure ${result.rows[0].id} - ${name}`);

        return {
          success: true,
          message: 'Procedure created successfully',
          data: result.rows[0]
        };
      } catch (error) {
        logger.error('Error creating procedure:', error);
        throw new Error('Error creating procedure');
      }
    },

    updateProcedure: async (_parent: any, args: any) => {
      try {
        const { id, input } = args;

        // Validate input
        const { error, value } = procedureSchema.validate(input);
        if (error) {
          return {
            success: false,
            message: `Validation error: ${error.details.map(d => d.message).join(', ')}`,
            data: null
          };
        }

        const { code, name, category, default_cost, description } = value;

        // Check if procedure exists
        const checkQuery = 'SELECT id FROM procedures WHERE id = $1';
        const checkResult = await pool.query(checkQuery, [id]);
        
        if (checkResult.rows.length === 0) {
          return {
            success: false,
            message: 'Procedure not found',
            data: null
          };
        }

        // Check if another procedure with same name exists
        const nameCheckQuery = 'SELECT id FROM procedures WHERE name = $1 AND id != $2';
        const nameCheckResult = await pool.query(nameCheckQuery, [name, id]);
        
        if (nameCheckResult.rows.length > 0) {
          return {
            success: false,
            message: 'Another procedure with this name already exists',
            data: null
          };
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

        logger.info(`Maintenance: Updated procedure ${id} - ${name}`);

        return {
          success: true,
          message: 'Procedure updated successfully',
          data: result.rows[0]
        };
      } catch (error) {
        logger.error('Error updating procedure:', error);
        throw new Error('Error updating procedure');
      }
    },

    deleteProcedure: async (_parent: any, args: any) => {
      try {
        const { id } = args;

        // Check if procedure exists
        const checkQuery = 'SELECT id, name FROM procedures WHERE id = $1';
        const checkResult = await pool.query(checkQuery, [id]);
        
        if (checkResult.rows.length === 0) {
          return {
            success: false,
            message: 'Procedure not found',
            data: null
          };
        }

        const procedureName = checkResult.rows[0].name;

        // Delete procedure
        const deleteQuery = 'DELETE FROM procedures WHERE id = $1';
        await pool.query(deleteQuery, [id]);

        logger.info(`Maintenance: Deleted procedure ${id} - ${procedureName}`);

        return {
          success: true,
          message: 'Procedure deleted successfully',
          data: null
        };
      } catch (error) {
        logger.error('Error deleting procedure:', error);
        
        // Check if it's a foreign key constraint error
        if ((error as any).code === '23503') {
          return {
            success: false,
            message: 'Cannot delete procedure as it is being used in treatment plans or other records',
            data: null
          };
        }

        throw new Error('Error deleting procedure');
      }
    }
  }
};
