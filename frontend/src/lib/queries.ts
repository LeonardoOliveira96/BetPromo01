import { gql } from '@apollo/client';

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        name
        email
        role
      }
    }
  }
`;

export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    me {
      id
      name
      email
      role
    }
  }
`;

export const GET_PROMOTIONS = gql`
  query GetPromotions {
    promotions {
      id
      name
      description
      startDate
      endDate
      brand
      type
      rules
      targetAudience {
        userRoles
        specificUsers
      }
      status
      createdBy
      createdAt
      usageCount
      eligibleCount
    }
  }
`;

export const CREATE_PROMOTION = gql`
  mutation CreatePromotion($input: PromotionInput!) {
    createPromotion(input: $input) {
      id
      name
      description
      startDate
      endDate
      brand
      type
      rules
      targetAudience {
        userRoles
        specificUsers
      }
      status
      createdBy
      createdAt
    }
  }
`;

export const UPDATE_PROMOTION = gql`
  mutation UpdatePromotion($id: ID!, $input: PromotionInput!) {
    updatePromotion(id: $id, input: $input) {
      id
      name
      description
      startDate
      endDate
      brand
      type
      rules
      targetAudience {
        userRoles
        specificUsers
      }
      status
      createdBy
      createdAt
    }
  }
`;

export const DELETE_PROMOTION = gql`
  mutation DeletePromotion($id: ID!) {
    deletePromotion(id: $id)
  }
`;

export const GET_USERS = gql`
  query GetUsers {
    users {
      id
      name
      email
      role
      createdAt
    }
  }
`;

export const GET_PROMOTION_USAGE = gql`
  query GetPromotionUsage($promotionId: ID!) {
    promotionUsage(promotionId: $promotionId) {
      id
      promotionId
      userId
      usedAt
      appliedBy
      status
    }
  }
`;