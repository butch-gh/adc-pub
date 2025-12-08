export const typeDefs = `#graphql
  # Scalar types
  scalar DateTime

  # Pagination input
  input PaginationInput {
    page: Int = 1
    limit: Int = 10
  }

  # Pagination info output
  type PaginationInfo {
    page: Int!
    limit: Int!
    total: Int!
    pages: Int!
  }

  # Procedure Types
  type Procedure {
    id: ID!
    code: String
    name: String!
    category: String
    default_cost: Float
    description: String
    created_at: DateTime!
  }

  input ProcedureInput {
    code: String
    name: String!
    category: String
    default_cost: Float
    description: String
  }

  input ProcedureFilterInput {
    search: String
    category: String
  }

  type ProceduresResponse {
    success: Boolean!
    data: [Procedure!]!
    pagination: PaginationInfo!
  }

  type ProcedureResponse {
    success: Boolean!
    message: String
    data: Procedure
  }

 
  # Access Privilege Types
  type AccessPrivilege {
    id: ID!
    level: Int!
    description: String
    access: String    
  }

  input AccessPrivilegeInput {
    level: Int!
    description: String
    access: String!
  }

  input AccessPrivilegeUpdateInput {
    id: ID!
    level: Int!
    description: String
    access: String!
  }

  
  type AccessScreen {
    code: String
    description: String
    route: String
    category: String    
  }

  type RoleLevel {
    level: Int!
    description: String!
  }

  type DeleteResponse {
    success: Boolean!
    errorCode: String
    message: String!
    result: String
  }

  # User Types
  type Users {
    access: String    
  }

  # Activity Log Types
  type ActivityLog {
    id: ID!
    action: String!
    module: String!
    username: String!
    ip_address: String
    details: String
    created_at: DateTime!
  }

  input ActivityLogInput {
    action: String!
    module: String!
    ipAdd: String
    details: String
  }

  type ActivityLogResponse {
    success: Boolean!
    data: [ActivityLog!]!
  }

  # Queries
  type Query {
    # Procedures
    procedures(
      pagination: PaginationInput
      filter: ProcedureFilterInput
    ): ProceduresResponse!
    
    procedure(id: ID!): ProcedureResponse!
    
    procedureCategories: [String!]!

    # Access Privileges
    accessPrivilege(id: ID!): AccessPrivilege
    
    accessPrivileges: [AccessPrivilege!]!
    
    roleLevel: [RoleLevel!]!
    
    accessScreens: [AccessScreen!]!
    
    accessScreenLov(level: Int!): [AccessScreen!]!

    # Activity Logs
    activityLogs: ActivityLogResponse!
    
    # Users / Access for current user
    users: Users
  }

  # Mutations
  type Mutation {
    # Procedures
    createProcedure(input: ProcedureInput!): ProcedureResponse!
    
    updateProcedure(id: ID!, input: ProcedureInput!): ProcedureResponse!
    
    deleteProcedure(id: ID!): ProcedureResponse!

    # Access Privileges
    createAccessPrivilege(input: AccessPrivilegeInput!): DeleteResponse!
    
    updateAccessPrivilege(input: AccessPrivilegeUpdateInput!): DeleteResponse!
    
    deleteAccessPrivilege(id: ID!): DeleteResponse!

    # Activity Logs
    logActivity(input: ActivityLogInput!): ActivityLog
  }
`;
