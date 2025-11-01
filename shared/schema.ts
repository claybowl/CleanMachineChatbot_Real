import { pgTable, text, serial, integer, boolean, timestamp, varchar, numeric, jsonb, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/* Define all tables first */

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Password reset tokens for forgot password functionality
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Session table for connect-pg-simple (PostgreSQL session store)
export const sessions = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// WebAuthn credentials for biometric authentication
export const webauthnCredentials = pgTable("webauthn_credentials", {
  id: text("id").primaryKey(), // credentialID from WebAuthn
  userId: integer("user_id").notNull().references(() => users.id),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  deviceName: text("device_name"),
  createdAt: timestamp("created_at").defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull().unique(),
  address: text("address"),
  vehicleInfo: text("vehicle_info"),
  lastInteraction: timestamp("last_interaction").defaultNow(),
  notes: text("notes"),
  photoFolderLink: text("photo_folder_link"),
  loyaltyProgramOptIn: boolean("loyalty_program_opt_in").default(false),
  loyaltyProgramJoinDate: timestamp("loyalty_program_join_date"),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  priceRange: text("price_range").notNull(),
  overview: text("overview").notNull(),
  detailedDescription: text("detailed_description").notNull(),
  duration: text("duration").notNull(),
  durationHours: numeric("duration_hours").notNull(),
  imageUrl: text("image_url"),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  serviceId: integer("service_id").notNull().references(() => services.id),
  scheduledTime: timestamp("scheduled_time").notNull(),
  completed: boolean("completed").default(false),
  calendarEventId: text("calendar_event_id"),
  reminderSent: boolean("reminder_sent").default(false),
  additionalRequests: text("additional_requests").array(),
  address: text("address").notNull(),
  addOns: jsonb("add_ons"),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull().references(() => appointments.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  amount: numeric("amount").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("unpaid"),
  paymentMethod: varchar("payment_method", { length: 20 }),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  paypalOrderId: text("paypal_order_id"),
  createdAt: timestamp("created_at").defaultNow(),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  serviceDescription: text("service_description").notNull(),
  reviewRequestSent: boolean("review_request_sent").default(false),
  followUpSent: boolean("follow_up_sent").default(false),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id),
  customerPhone: text("customer_phone"),
  customerName: text("customer_name"),
  category: varchar("category", { length: 20 }).default("Other"),
  intent: varchar("intent", { length: 30 }).default("Information Gathering"),
  needsHumanAttention: boolean("needs_human_attention").default(false),
  resolved: boolean("resolved").default(false),
  lastMessageTime: timestamp("last_message_time").defaultNow(),
  platform: varchar("platform", { length: 10 }).notNull(), // web or sms
  controlMode: varchar("control_mode", { length: 20 }).default("auto"), // auto, manual, paused
  assignedAgent: text("assigned_agent"), // Username of agent who took over
  behaviorSettings: jsonb("behavior_settings"), // { tone, forcedAction, formality, responseLength, proactivity }
  status: varchar("status", { length: 20 }).default("active"), // active, closed
  createdAt: timestamp("created_at").defaultNow(),
  handoffRequestedAt: timestamp("handoff_requested_at"), // When customer asked for human or AI detected issue
  manualModeStartedAt: timestamp("manual_mode_started_at"), // When agent took control
  lastAgentActivity: timestamp("last_agent_activity"), // Last time agent sent a message or made changes
  handoffReason: text("handoff_reason"), // Why handoff was triggered (keywords, frustration, etc.)
  appointmentId: integer("appointment_id").references(() => appointments.id), // Associated appointment for booking conversations
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  content: text("content").notNull(),
  sender: varchar("sender", { length: 20 }).notNull(), // customer, ai, agent
  fromCustomer: boolean("from_customer").notNull(), // Keep for backwards compatibility
  timestamp: timestamp("timestamp").defaultNow(),
  topics: text("topics").array(),
  channel: varchar("channel", { length: 10 }), // web, sms
});

// Create the tables for gamification
export const loyaltyPoints = pgTable("loyalty_points", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  points: integer("points").notNull().default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
  expiryDate: timestamp("expiry_date"), // Points expire after 12 months
});

export const loyaltyTiers = pgTable("loyalty_tiers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  pointThreshold: integer("point_threshold").notNull(),
  benefits: text("benefits").array(),
  icon: text("icon"),
});

export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  pointValue: integer("point_value").notNull().default(0),
  criteria: text("criteria").notNull(),
  icon: text("icon"),
  level: integer("level").notNull().default(1),
});

export const rewardServices = pgTable("reward_services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  pointCost: integer("point_cost").notNull(), // 500, 1000, 2000, or 5000
  tier: varchar("tier", { length: 20 }).notNull(), // 'tier_500', 'tier_1000', 'tier_2000', 'tier_5000'
  active: boolean("active").default(true),
  // Note: Table name remains reward_services for database compatibility, but UI shows "Loyalty Offers"
});

export const pointsTransactions = pgTable("points_transactions", {
  id: serial("id").primaryKey(),
  loyaltyPointsId: integer("loyalty_points_id").notNull().references(() => loyaltyPoints.id),
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  transactionDate: timestamp("transaction_date").defaultNow(),
  transactionType: varchar("transaction_type", { length: 20 }).notNull(), // 'earn' or 'redeem'
  source: varchar("source", { length: 30 }).notNull(), // 'appointment', 'referral', 'review', etc.
  sourceId: integer("source_id"), // ID of the related entity (appointment, etc.)
  expiryDate: timestamp("expiry_date"), // When these points expire (12 months from earning)
});

export const customerAchievements = pgTable("customer_achievements", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  achievementId: integer("achievement_id").notNull().references(() => achievements.id),
  dateEarned: timestamp("date_earned").defaultNow(),
  notified: boolean("notified").default(false),
});

export const redeemedRewards = pgTable("redeemed_rewards", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  rewardServiceId: integer("reward_service_id").notNull().references(() => rewardServices.id),
  pointsSpent: integer("points_spent").notNull(),
  redeemedDate: timestamp("redeemed_date").defaultNow(),
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'scheduled', 'completed', 'expired'
  appointmentId: integer("appointment_id").references(() => appointments.id),
  expiryDate: timestamp("expiry_date"), // When the redeemed loyalty offer expires if not used
  // Note: Table name remains redeemed_rewards for database compatibility, but UI shows "Redeemed Loyalty Offers"
});

// Tables for post-purchase upsell system
export const upsellOffers = pgTable("upsell_offers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  serviceId: integer("service_id").references(() => services.id),
  addOnService: boolean("add_on_service").default(false),
  discountPercentage: numeric("discount_percentage"),
  discountAmount: numeric("discount_amount"),
  active: boolean("active").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  minimumPurchaseAmount: numeric("minimum_purchase_amount"),
  applicableServiceIds: text("applicable_service_ids").array(), // Services this upsell can be offered with
  validityDays: integer("validity_days").default(3), // How many days the upsell offer is valid after original purchase
});

export const appointmentUpsells = pgTable("appointment_upsells", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull().references(() => appointments.id),
  upsellOfferId: integer("upsell_offer_id").notNull().references(() => upsellOffers.id),
  offeredAt: timestamp("offered_at").defaultNow(),
  status: varchar("status", { length: 20 }).default("offered"), // 'offered', 'accepted', 'declined', 'expired'
  responseAt: timestamp("response_at"),
  newAppointmentId: integer("new_appointment_id").references(() => appointments.id), // If accepted, reference to the new appointment
  expiryDate: timestamp("expiry_date"), // When the upsell offer expires
  discountApplied: numeric("discount_applied"), // The actual discount amount applied
});

// Email campaign tables
export const emailCampaigns = pgTable("email_campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  scheduledDate: timestamp("scheduled_date"),
  sentAt: timestamp("sent_at"),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // 'draft', 'scheduled', 'sent', 'cancelled'
  openRate: numeric("open_rate"),
  clickRate: numeric("click_rate"),
  targetAudience: varchar("target_audience", { length: 30 }).default("all"), // 'all', 'repeat_customers', 'new_customers', 'premium_customers'
  recipientCount: integer("recipient_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 30 }).notNull().default("general"), // 'promotional', 'transactional', 'seasonal', 'holiday'
  lastUsed: timestamp("last_used"),
});

export const emailSubscribers = pgTable("email_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  subscribed: boolean("subscribed").default(true),
  subscribedAt: timestamp("subscribed_at").defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at"),
});

// Quick reply templates for the messaging interface
export const quickReplyCategories = pgTable("quick_reply_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon"), // Emoji or icon name
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const quickReplyTemplates = pgTable("quick_reply_templates", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => quickReplyCategories.id),
  content: text("content").notNull(),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  lastUsed: timestamp("last_used"),
});

// Create schemas for data insertion
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertCustomerSchema = createInsertSchema(customers).pick({
  name: true,
  email: true,
  phone: true,
  address: true,
  vehicleInfo: true,
  notes: true,
  loyaltyProgramOptIn: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).pick({
  customerId: true,
  serviceId: true,
  scheduledTime: true,
  address: true,
  additionalRequests: true,
  addOns: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).pick({
  appointmentId: true,
  customerId: true,
  amount: true,
  serviceDescription: true,
  notes: true,
});

export const insertLoyaltyPointsSchema = createInsertSchema(loyaltyPoints).pick({
  customerId: true,
  points: true,
  expiryDate: true,
});

export const insertRewardServiceSchema = createInsertSchema(rewardServices).pick({
  name: true,
  description: true,
  pointCost: true,
  tier: true,
  active: true,
  // Schema name remains for API compatibility, but represents "Loyalty Offer" in UI
});

export const insertRedeemedRewardSchema = createInsertSchema(redeemedRewards).pick({
  customerId: true,
  rewardServiceId: true,
  pointsSpent: true,
  status: true,
  expiryDate: true,
  // Schema name remains for API compatibility, but represents "Redeemed Loyalty Offer" in UI
});

export const insertPointsTransactionSchema = createInsertSchema(pointsTransactions).pick({
  loyaltyPointsId: true,
  amount: true,
  description: true,
  transactionType: true,
  source: true,
  sourceId: true,
  expiryDate: true,
});

export const insertUpsellOfferSchema = createInsertSchema(upsellOffers).pick({
  name: true,
  description: true,
  serviceId: true,
  addOnService: true,
  discountPercentage: true,
  discountAmount: true,
  active: true,
  displayOrder: true,
  minimumPurchaseAmount: true,
  applicableServiceIds: true,
  validityDays: true,
});

export const insertAppointmentUpsellSchema = createInsertSchema(appointmentUpsells).pick({
  appointmentId: true,
  upsellOfferId: true,
  status: true,
  expiryDate: true,
  discountApplied: true,
});

export const insertEmailCampaignSchema = createInsertSchema(emailCampaigns).pick({
  name: true,
  subject: true,
  content: true,
  scheduledDate: true,
  status: true,
  targetAudience: true,
  recipientCount: true,
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).pick({
  name: true,
  subject: true,
  content: true,
  category: true,
});

export const insertEmailSubscriberSchema = createInsertSchema(emailSubscribers).pick({
  email: true,
  subscribed: true,
});

export const insertQuickReplyCategorySchema = createInsertSchema(quickReplyCategories).pick({
  name: true,
  icon: true,
  displayOrder: true,
});

export const insertQuickReplyTemplateSchema = createInsertSchema(quickReplyTemplates).pick({
  categoryId: true,
  content: true,
  displayOrder: true,
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  customerId: true,
  customerPhone: true,
  customerName: true,
  platform: true,
  category: true,
  intent: true,
  controlMode: true,
  assignedAgent: true,
  behaviorSettings: true,
  status: true,
  handoffReason: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  content: true,
  sender: true,
  fromCustomer: true,
  channel: true,
  topics: true,
});

// Define types for use in the application
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InsertLoyaltyPoints = z.infer<typeof insertLoyaltyPointsSchema>;
export type InsertRewardService = z.infer<typeof insertRewardServiceSchema>;
export type InsertRedeemedReward = z.infer<typeof insertRedeemedRewardSchema>;
export type InsertPointsTransaction = z.infer<typeof insertPointsTransactionSchema>;
export type InsertUpsellOffer = z.infer<typeof insertUpsellOfferSchema>;
export type InsertAppointmentUpsell = z.infer<typeof insertAppointmentUpsellSchema>;
export type InsertEmailCampaign = z.infer<typeof insertEmailCampaignSchema>;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type InsertEmailSubscriber = z.infer<typeof insertEmailSubscriberSchema>;
export type InsertQuickReplyCategory = z.infer<typeof insertQuickReplyCategorySchema>;
export type InsertQuickReplyTemplate = z.infer<typeof insertQuickReplyTemplateSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type User = typeof users.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type LoyaltyPoints = typeof loyaltyPoints.$inferSelect;
export type PointsTransaction = typeof pointsTransactions.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type CustomerAchievement = typeof customerAchievements.$inferSelect;
export type LoyaltyTier = typeof loyaltyTiers.$inferSelect;
export type RewardService = typeof rewardServices.$inferSelect;
export type RedeemedReward = typeof redeemedRewards.$inferSelect;
export type UpsellOffer = typeof upsellOffers.$inferSelect;
export type AppointmentUpsell = typeof appointmentUpsells.$inferSelect;
export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type EmailSubscriber = typeof emailSubscribers.$inferSelect;
export type QuickReplyCategory = typeof quickReplyCategories.$inferSelect;
export type QuickReplyTemplate = typeof quickReplyTemplates.$inferSelect;