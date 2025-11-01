# Clean Machine Auto Detail - AI-Powered Business Assistant

## Overview

Clean Machine Auto Detail is a comprehensive web application that serves as an AI-powered business assistant for an auto detailing service. The system integrates customer management, appointment scheduling, loyalty programs, payment processing, and multi-channel communication (SMS, web chat, email) to streamline business operations. Built with a modern full-stack architecture, it leverages Google Workspace APIs for calendar management, customer data storage, and photo management, while providing intelligent chatbot capabilities powered by OpenAI.

The application serves both customers (booking appointments, viewing loyalty points, redeeming rewards) and business operators (managing schedules, tracking customer history, running email campaigns, monitoring analytics).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React with TypeScript for type-safe component development
- Vite as the build tool and development server
- Tailwind CSS with shadcn/ui component library (New York style variant)
- TanStack React Query for server state management
- React Hook Form with Zod resolvers for form validation
- Stripe integration for payment processing (@stripe/react-stripe-js)

**Design Decisions:**
- Component-based architecture using shadcn/ui for consistent, accessible UI components
- Path aliases configured for clean imports (@/, @shared/, @assets/)
- CSS variables for theming with HSL color system
- Responsive design with mobile-first approach
- Canvas confetti for gamification effects

### Backend Architecture

**Core Framework:**
- Express.js server with TypeScript
- ESM module system throughout
- Modular route registration pattern for scalability

**Key Architectural Patterns:**

1. **Monolithic Service Layer**: Business logic organized into focused service modules (loyaltyService, emailCampaignService, upsellService, gamificationService) rather than microservices, chosen for:
   - Simplified deployment on single platform
   - Reduced operational complexity
   - Easier transaction management across features
   - Better suited for small-to-medium business scale

2. **Multi-Channel Response Formatting**: Custom response formatter (responseFormatter.ts) adapts AI responses based on communication channel (SMS/Web/Email):
   - SMS: Concise, character-limited, text-only
   - Web: Rich content with HTML, interactive elements
   - Email: Formal tone with detailed signatures
   - Configurable settings per channel (formatterConfig.ts)

3. **Customer Memory System**: In-memory customer context storage (customerMemory.ts) for conversation continuity:
   - Tracks vehicle info, preferences, service history
   - Enables personalized interactions
   - Supplements Google Sheets as primary customer database

4. **Knowledge Base Integration**: Google Sheets serves as dynamic knowledge base:
   - Services, pricing, and business information stored in sheets
   - Loaded at runtime and formatted for AI consumption
   - Allows non-technical updates to chatbot knowledge

### Data Storage Architecture

**Primary Database**: PostgreSQL (via Neon serverless)
- Drizzle ORM for type-safe database operations
- Schema-first approach with shared types (@shared/schema.ts)
- WebSocket connections for serverless compatibility
- Migration management via drizzle-kit

**Schema Design**:
- Core entities: users, customers, services, appointments, invoices
- Loyalty system: loyaltyPoints, pointsTransactions, achievements, customerAchievements, loyaltyTiers, rewardServices, redeemedRewards
- Marketing: emailCampaigns, emailTemplates, emailSubscribers
- Upselling: upsellOffers, appointmentUpsells
- Conversation Monitoring: conversations (with controlMode, behaviorSettings, assignedAgent), messages (with sender attribution)

**Hybrid Storage Strategy**:
- PostgreSQL for transactional data and real-time features
- Google Sheets as supplementary customer database (legacy integration)
- Dual-write pattern for loyalty points (both PostgreSQL and Sheets)
- Google Drive for customer photos with folder links stored in sheets

### Authentication & Authorization

**Current Implementation**:
- Basic user authentication with username/password
- Session-based auth (implicit from user table structure)
- Stripe customer/subscription IDs linked to users
- No explicit role-based access control (RBAC) currently implemented

**Security Considerations**:
- Demo mode restrictions (demoProtection.ts) for rate limiting and endpoint blocking
- Environment-based credential management
- Service account authentication for Google APIs

### AI & Chatbot System

**OpenAI Integration**:
- GPT-4o model for conversational AI
- Dynamic prompt generation using knowledge base
- Context-aware responses based on customer history
- Conversation classification for intent detection

**Intelligence Features**:
- Automatic service recommendations (maintenance detail program based on history)
- Multi-vehicle appointment scheduling
- Address validation and service area checking
- Weather-aware appointment recommendations
- Upsell opportunity detection

### External Dependencies

**Google Workspace Suite**:
- **Google Calendar API**: Appointment scheduling and availability checking
  - Calendar ID: cleanmachinetulsa@gmail.com
  - Business hours: 9 AM - 3 PM (no appointments start after 3 PM)
  - Service-specific duration blocking
  
- **Google Sheets API**: Customer database and knowledge base
  - Primary spreadsheet: 1-xeX82TPoxxeyWXoCEXh-TdMkBHuJSXjoUSaiFjfv9g
  - Sheets: Customer Database, Customer Information, Services, FAQ, etc.
  - Loyalty points tracking and service history
  
- **Google Drive API**: Customer photo management
  - Parent folder ID: 1jYUTEaN7Nup_ShvU3plj7RKaedppxuyx
  - Automated folder creation per customer
  - Photo cleanup service for old records (6-month retention)
  
- **Google Maps API**: 
  - Geocoding for address validation
  - Distance/drive time calculation (26-minute service radius from Tulsa base)
  - Route optimization for technician navigation

**Payment Processing**:
- **Stripe**: Primary payment gateway
  - Payment intents for invoice processing
  - Customer and subscription management
  - Webhook handling for payment events
  
- **PayPal**: Alternative payment option
  - Server SDK integration (@paypal/paypal-server-sdk)

**Communication Services**:
- **Twilio**: SMS notifications (appointment reminders, confirmations)
  - Opt-in/opt-out management
  - Day-before reminder system
  
- **SendGrid**: Email delivery service
  - Transactional emails (booking confirmations, invoices)
  - Marketing campaigns
  - Template management
  
- **Slack**: Business notifications and alerts
  - Internal team communication
  - Appointment updates

**Weather & Location**:
- **Open-Meteo API**: Free weather forecasting for appointment planning (no API key required)
  - Rain probability checking
  - Reschedule recommendations based on weather risk
  - Hourly forecasts for outdoor service planning
  - WMO weather codes for accurate precipitation detection

**AI & ML**:
- **OpenAI API**: GPT-4o for chatbot intelligence
  - Conversation handling
  - Email content generation
  - Service recommendations

### Deployment & Infrastructure

**Build Process**:
- Vite for frontend bundling (outputs to dist/public)
- esbuild for backend compilation (ESM format, external packages)
- Separate dev/production environments

**Environment Configuration**:
- Required secrets: DATABASE_URL, OPENAI_API_KEY, STRIPE_SECRET_KEY, SENDGRID_API_KEY, TWILIO credentials, Google API credentials
- Google service account JSON via GOOGLE_API_CREDENTIALS env var
- Demo mode flag for restricted functionality

**Development Workflow**:
- Hot module replacement (HMR) via Vite
- Runtime error overlay for development
- Replit-specific tooling (@replit/vite-plugin-runtime-error-modal, cartographer)
- TypeScript strict mode for type safety

### Key Integrations & Business Logic

**Loyalty Program**:
- Points awarded at 1:1 ratio with invoice amounts
- Automatic tier progression
- Achievement system for gamification
- Reward redemption (up to 3 services per redemption)
- Email notifications when eligible for rewards

**Appointment Scheduling**:
- Multi-vehicle support with separate condition tracking per vehicle
- Weather checking with automatic reschedule suggestions
- Service area validation (26-minute drive time limit)
- Calendar conflict detection
- Day-before reminder automation

**Upselling System**:
- Context-aware offer suggestions based on service type
- Appointment-specific upsell tracking
- Display order management for prioritization
- Performance analytics for offer effectiveness

**Email Marketing**:
- Campaign scheduling and management
- Template library with AI-generated content
- Subscriber management with opt-in/opt-out
- Customer segmentation for targeted campaigns

**Real-Time Chat Monitoring System** (NEW - October 2025):
- Live dashboard at /monitor for monitoring all customer conversations
- Split-view interface: conversation list + detailed message timeline
- Real-time WebSocket updates for instant message delivery
- Manual Takeover: Agent can take control of any conversation
  - AI stops responding when in manual mode
  - Agent sends messages directly to customers via appropriate channel (SMS/web)
  - Messages delivered via Twilio for SMS, WebSocket for web chat
- Handoff to AI: Seamlessly return control to AI assistant
- Pause Mode: Queue messages without AI response (for review)
- Behavior Controls:
  - Tone adjustment (professional, friendly, casual, formal)
  - Forced actions (show scheduler, collect info)
  - Behavior sliders: Formality, Response Length, Proactivity (0-100%)
- Works for both SMS and web chat channels
- Color-coded message bubbles (gray=customer, blue=AI, purple=agent)
- Conversation status indicators (green=auto, blue=manual, yellow=paused)
- All messages persisted to PostgreSQL with sender attribution
- WebSocket rooms: "monitoring" for dashboard, "conversation:ID" for live participants