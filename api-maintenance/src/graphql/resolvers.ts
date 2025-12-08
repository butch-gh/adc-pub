import { DateTimeResolver } from 'graphql-scalars';
import { procedureResolvers } from './resolvers/procedureResolvers';
import { accessPrivilegeResolvers } from './resolvers/accessPrivilegeResolvers';
import { activityLogResolvers } from './resolvers/activityLogResolvers';
import { usersResolvers } from './resolvers/usersResolvers';

export const resolvers = {
  DateTime: DateTimeResolver,

  Query: {
    ...procedureResolvers.Query,
    ...accessPrivilegeResolvers.Query,
    ...activityLogResolvers.Query,
    ...usersResolvers.Query
  },

  Mutation: {
    ...procedureResolvers.Mutation,
    ...accessPrivilegeResolvers.Mutation,
    ...activityLogResolvers.Mutation
  }
};
