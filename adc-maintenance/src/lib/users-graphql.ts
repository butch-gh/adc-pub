import { graphqlClient } from './graphql-client';
import { UserAccess } from '../types';

export const usersGraphQL = {
  // Get user access privilege
  getUserAccess: async (): Promise<UserAccess> => {
    const query = `
      query {
        users {
          access
        }
      }
    `;
    const response = await graphqlClient.request<{ users: { access: string } }>(query);
    const accessArr = response.users.access ? JSON.parse(response.users.access) : [];
    return { access: accessArr };
  },
};