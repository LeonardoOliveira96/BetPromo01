import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';
import { userResolvers } from './userResolvers';
import { promotionResolvers } from './promotionResolvers';

// Scalar personalizado para Date
const DateScalar = new GraphQLScalarType({
  name: 'Date',
  description: 'Date custom scalar type',
  serialize(value: any) {
    return value instanceof Date ? value.toISOString() : null;
  },
  parseValue(value: any) {
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

// Combina todos os resolvers
export const resolvers = {
  Date: DateScalar,
  
  Query: {
    ...userResolvers.Query,
    ...promotionResolvers.Query,
  },
  
  Mutation: {
    ...userResolvers.Mutation,
    ...promotionResolvers.Mutation,
  },
  
  // Field resolvers
  Promotion: promotionResolvers.Promotion,
};