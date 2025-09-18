import { gql } from 'graphql-tag';

export const typeDefs = gql`
  scalar Date

  type User {
    id: ID!
    name: String!
    email: String!
    role: UserRole!
    isActive: Boolean!
    lastLogin: Date
    createdAt: Date!
    updatedAt: Date!
  }

  enum UserRole {
    ADMIN
    MANAGER
    USER
  }

  type Promotion {
    id: ID!
    title: String!
    description: String!
    type: PromotionType!
    startDate: Date!
    endDate: Date!
    isActive: Boolean!
    conditions: PromotionConditions!
    reward: PromotionReward!
    usageLimit: Int
    usageCount: Int!
    targetAudience: TargetAudience!
    priority: Int!
    createdBy: User!
    isValid: Boolean!
    hasUsageAvailable: Boolean!
    createdAt: Date!
    updatedAt: Date!
  }

  enum PromotionType {
    WELCOME_BONUS
    DEPOSIT_BONUS
    FREE_BET
    CASHBACK
    LOYALTY_REWARD
  }

  type PromotionConditions {
    minDeposit: Float
    minOdds: Float
    maxBetAmount: Float
    eligibleSports: [String!]
    newUsersOnly: Boolean
    minAge: Int
  }

  type PromotionReward {
    type: RewardType!
    value: Float!
    maxValue: Float
    currency: String!
  }

  enum RewardType {
    PERCENTAGE
    FIXED_AMOUNT
    FREE_BET
  }

  type TargetAudience {
    userRoles: [UserRole!]
    countries: [String!]
    excludedUsers: [ID!]
  }

  type PromotionUsage {
    id: ID!
    user: User!
    promotion: Promotion!
    usedAt: Date!
    status: UsageStatus!
    rewardAmount: Float!
    currency: String!
    conditions: UsageConditions!
    notes: String
    processedBy: User
    processedAt: Date
    expiresAt: Date
    createdAt: Date!
    updatedAt: Date!
  }

  enum UsageStatus {
    PENDING
    APPROVED
    REJECTED
    EXPIRED
  }

  type UsageConditions {
    depositAmount: Float
    betAmount: Float
    odds: Float
    sport: String
  }

  type AgentTask {
    id: ID!
    type: TaskType!
    status: TaskStatus!
    priority: TaskPriority!
    data: String! # JSON string
    result: String # JSON string
    error: String
    attempts: Int!
    maxAttempts: Int!
    scheduledFor: Date!
    startedAt: Date
    completedAt: Date
    processingTime: Int
    agent: String
    createdBy: User
    createdAt: Date!
    updatedAt: Date!
  }

  enum TaskType {
    PROMOTION_NOTIFICATION
    USAGE_VALIDATION
    REPORT_GENERATION
    CLEANUP
    ANALYTICS
  }

  enum TaskStatus {
    PENDING
    PROCESSING
    COMPLETED
    FAILED
    CANCELLED
  }

  enum TaskPriority {
    LOW
    MEDIUM
    HIGH
    URGENT
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    # User queries
    me: User
    users(limit: Int, offset: Int): [User!]!
    user(id: ID!): User

    # Promotion queries
    promotions(
      limit: Int
      offset: Int
      isActive: Boolean
      type: PromotionType
      startDate: Date
      endDate: Date
    ): [Promotion!]!
    promotion(id: ID!): Promotion
    activePromotions: [Promotion!]!
    promotionsByUser(userId: ID!): [Promotion!]!

    # Promotion Usage queries
    promotionUsages(
      limit: Int
      offset: Int
      userId: ID
      promotionId: ID
      status: UsageStatus
    ): [PromotionUsage!]!
    promotionUsage(id: ID!): PromotionUsage
    userPromotionUsages(userId: ID!): [PromotionUsage!]!

    # Agent Task queries
    agentTasks(
      limit: Int
      offset: Int
      type: TaskType
      status: TaskStatus
      priority: TaskPriority
    ): [AgentTask!]!
    agentTask(id: ID!): AgentTask
    pendingTasks: [AgentTask!]!
  }

  type Mutation {
    # Auth mutations
    login(email: String!, password: String!): AuthPayload!
    register(input: RegisterInput!): AuthPayload!
    updateProfile(input: UpdateProfileInput!): User!
    changePassword(currentPassword: String!, newPassword: String!): Boolean!

    # Promotion mutations
    createPromotion(input: CreatePromotionInput!): Promotion!
    updatePromotion(id: ID!, input: UpdatePromotionInput!): Promotion!
    deletePromotion(id: ID!): Boolean!
    activatePromotion(id: ID!): Promotion!
    deactivatePromotion(id: ID!): Promotion!

    # Promotion Usage mutations
    usePromotion(input: UsePromotionInput!): PromotionUsage!
    approvePromotionUsage(id: ID!, notes: String): PromotionUsage!
    rejectPromotionUsage(id: ID!, notes: String!): PromotionUsage!

    # Agent Task mutations
    createAgentTask(input: CreateAgentTaskInput!): AgentTask!
    cancelAgentTask(id: ID!): AgentTask!
    retryAgentTask(id: ID!): AgentTask!
  }

  input RegisterInput {
    name: String!
    email: String!
    password: String!
    role: UserRole = USER
  }

  input UpdateProfileInput {
    name: String
    email: String
  }

  input CreatePromotionInput {
    title: String!
    description: String!
    type: PromotionType!
    startDate: Date!
    endDate: Date!
    conditions: PromotionConditionsInput!
    reward: PromotionRewardInput!
    usageLimit: Int
    targetAudience: TargetAudienceInput!
    priority: Int = 0
  }

  input UpdatePromotionInput {
    title: String
    description: String
    type: PromotionType
    startDate: Date
    endDate: Date
    conditions: PromotionConditionsInput
    reward: PromotionRewardInput
    usageLimit: Int
    targetAudience: TargetAudienceInput
    priority: Int
  }

  input PromotionConditionsInput {
    minDeposit: Float
    minOdds: Float
    maxBetAmount: Float
    eligibleSports: [String!]
    newUsersOnly: Boolean
    minAge: Int
  }

  input PromotionRewardInput {
    type: RewardType!
    value: Float!
    maxValue: Float
    currency: String = "BRL"
  }

  input TargetAudienceInput {
    userRoles: [UserRole!]
    countries: [String!]
    excludedUsers: [ID!]
  }

  input UsePromotionInput {
    promotionId: ID!
    conditions: UsageConditionsInput!
  }

  input UsageConditionsInput {
    depositAmount: Float
    betAmount: Float
    odds: Float
    sport: String
  }

  input CreateAgentTaskInput {
    type: TaskType!
    priority: TaskPriority = MEDIUM
    data: String! # JSON string
    scheduledFor: Date
    maxAttempts: Int = 3
  }
`;