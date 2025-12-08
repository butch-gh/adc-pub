import { GraphQLSchema, print, ExecutionResult, getIntrospectionQuery, buildClientSchema, GraphQLError } from 'graphql';
import { stitchSchemas } from '@graphql-tools/stitch';
import { AsyncExecutor } from '@graphql-tools/utils';
import { logger } from '../utils/logger';

interface ServiceConfig {
  name: string;
  url: string;
  endpoint?: string; // Custom endpoint path, defaults to /graphql
  enabled: boolean;
}

const services: ServiceConfig[] = [
  {
    name: 'maintenance',
    url: process.env.MAINTENANCE_SERVICE_URL || 'http://localhost:5007',
    endpoint: '/maintenance',
    enabled: true
  },
  // Add more services as they become available
  // {
  //   name: 'billing',
  //   url: process.env.BILLING_SERVICE_URL || 'http://localhost:5003',
  //   enabled: false
  // },
];

// Create executor for GraphQL HTTP requests
const createExecutor = (url: string, endpoint: string = '/graphql'): AsyncExecutor => {
  const executor: AsyncExecutor = async ({ document, variables, context }) => {
    const query = print(document);
    
    // Build headers with authentication
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Forward user context to microservice
    if (context?.user) {
      headers['x-user-id'] = String(context.user.userId || context.user.id || '');
      headers['x-user-role'] = String(context.user.role || '');
      headers['x-user-email'] = String(context.user.email || '');
      headers['x-username'] = String(context.user.username || '');
    }

    try {
      const fetchResult = await fetch(`${url}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables }),
      });

      if (!fetchResult.ok) {
        return {
          errors: [new GraphQLError(`HTTP error! status: ${fetchResult.status}`)]
        } as any;
      }

      const result = await fetchResult.json();
      return result as any;
    } catch (error) {
      logger.error(`Error executing GraphQL request to ${url}:`, error);
      return {
        errors: [new GraphQLError(error instanceof Error ? error.message : 'Unknown error')]
      } as any;
    }
  };
  return executor;
};

// Build the stitched schema
export async function buildSchema(): Promise<GraphQLSchema | null> {
  try {
    const subschemas: any[] = [];

    for (const service of services) {
      if (!service.enabled) {
        logger.info(`Service ${service.name} is disabled, skipping...`);
        continue;
      }

      try {
        const endpointPath = service.endpoint || '/graphql';
        const fullUrl = `${service.url}${endpointPath}`;
        
        logger.info(`Fetching schema from ${service.name} at ${fullUrl}`);
        
        const executor = createExecutor(service.url, endpointPath);

        // Fetch introspection manually
        const introspectionQuery = getIntrospectionQuery();
        const response = await fetch(fullUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: introspectionQuery }),
        });

        if (!response.ok) {
          throw new Error(`Failed to introspect ${service.name}: ${response.statusText}`);
        }

        const result: any = await response.json();
        const schema = buildClientSchema(result.data);

        subschemas.push({
          schema,
          executor,
          batch: true
        });

        logger.success(`Successfully loaded schema from ${service.name}`);
      } catch (error) {
        logger.error(`Failed to load schema from ${service.name}:`, error);
        // Continue with other services even if one fails
      }
    }

    if (subschemas.length === 0) {
      logger.error('No schemas available to stitch');
      return null;
    }

    // Stitch all schemas together
    const stitchedSchema = stitchSchemas({
      subschemas
    });

    logger.success(`Successfully stitched ${subschemas.length} schema(s)`);
    return stitchedSchema;
  } catch (error) {
    logger.error('Error building stitched schema:', error);
    return null;
  }
}

// Refresh schema periodically (optional)
export async function setupSchemaRefresh(
  onSchemaUpdate: (schema: GraphQLSchema) => void,
  intervalMs: number = 60000
): Promise<void> {
  setInterval(async () => {
    try {
      logger.info('Refreshing GraphQL schema...');
      const newSchema = await buildSchema();
      if (newSchema) {
        onSchemaUpdate(newSchema);
        logger.success('Schema refreshed successfully');
      }
    } catch (error) {
      logger.error('Error refreshing schema:', error);
    }
  }, intervalMs);
}
