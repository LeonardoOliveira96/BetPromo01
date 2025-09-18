import { gql } from '@apollo/client';

export const CREATE_PROMOTION = gql`
  mutation CreatePromotion($input: CreatePromotionInput!) {
    createPromotion(input: $input) {
      id
      title
      description
      type
      startDate
      endDate
      isActive
      conditions {
        minDeposit
        minOdds
        maxBetAmount
        eligibleSports
        newUsersOnly
        minAge
      }
      reward {
        type
        value
        maxValue
        currency
      }
      usageLimit
      usageCount
      targetAudience {
        userRoles
        countries
      }
      priority
      createdAt
      updatedAt
    }
  }
`;

export const GET_PROMOTIONS = gql`
  query GetPromotions($limit: Int, $offset: Int, $isActive: Boolean, $type: String) {
    promotions(limit: $limit, offset: $offset, isActive: $isActive, type: $type) {
      id
      title
      description
      type
      startDate
      endDate
      isActive
      conditions {
        minDeposit
        minOdds
        maxBetAmount
        eligibleSports
        newUsersOnly
        minAge
      }
      reward {
        type
        value
        maxValue
        currency
      }
      usageLimit
      usageCount
      targetAudience {
        userRoles
        countries
      }
      priority
      createdAt
      updatedAt
    }
  }
`;