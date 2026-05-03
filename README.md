# HealthLab


HealthLab is a full-stack MERN system for digital health research management. It brings together researcher onboarding, experiment creation, participant eligibility and enrollment, daily activity logging, community collaboration, funding workflows, moderation, analytics, and AI-assisted research support in a single platform.

The application is designed for three main user groups:

- `Participant` users can register, browse experiments, view recommendation scores, preview eligibility, enroll in studies, submit daily logs, contribute to fund requests, and engage through community features.
- `Researcher` users can register for approval, create and manage experiments, publish research reviews, collaborate with co-researchers, track participant submissions, and manage study wallets and funding requests.
- `Admin` users can approve researchers, moderate reports, manage users and experiments, monitor analytics, and oversee funding workflows.

HealthLab is implemented as a two-part full-stack application:

- `backend/` contains the Node.js, Express, and MongoDB REST API
- `frontend/` contains the React + Vite client application

---

## 1. Project Overview

HealthLab is built to support structured digital research operations rather than only basic CRUD. The system combines research study administration, participant lifecycle management, role-based access control, moderation features, contributions and payment support, and AI-enhanced decision support.

### Core platform capabilities

- Researcher registration with admin approval workflow
- Experiment creation, update, deletion, summaries, and safety guidance
- Participant recommendation matching and eligibility preview
- Study enrollment, My Studies dashboard, and daily activity log submission
- Research review publishing and experiment-linked review access
- Co-researcher management per experiment
- Fund request and experiment wallet management
- Contribution tracking and payment flow support
- Community posts with likes, saves, comments, reporting, and poll voting
- Admin analytics, researcher moderation, report review, and PDF export support
- AI-assisted summary, tagging, chatbot, and clinical-style eligibility support

---

## 2. Tech Stack

| Layer | Technologies |
| ----- | ------------ |
| Backend | Node.js, Express.js, MongoDB, Mongoose, JSON Web Token, Express Validator, Multer, PDFKit, Winston |
| Frontend | React 19, Vite, React Router DOM, Axios, Tailwind CSS, DaisyUI, Framer Motion, Recharts |
| Testing | Jest, Supertest, mongodb-memory-server, Artillery |
| AI / External Services | Google Gemini, Groq, Hugging Face, FDA proxy integration, PayHere |
| Deployment | Render for backend, Vercel for frontend |

---

## 3. Repository Structure

```text
HealthLab/
|-- backend/
|   |-- src/
|   |   |-- config/
|   |   |-- controllers/
|   |   |-- errors/
|   |   |-- middleware/
|   |   |-- models/
|   |   |-- modules/
|   |   |-- routes/
|   |   |-- services/
|   |   |-- utils/
|   |   |-- validators/
|   |   |-- app.js
|   |   `-- server.js
|   |-- scripts/
|   |-- testing/
|   |   |-- integration/
|   |   |-- performance/
|   |   `-- unit/
|   |-- README.md
|   `-- package.json
|-- frontend/
|   |-- src/
|   |   |-- api/
|   |   |-- assets/
|   |   |-- components/
|   |   |-- lib/
|   |   |-- pages/
|   |   |-- styles/
|   |   |-- utils/
|   |   |-- App.jsx
|   |   `-- main.jsx
|   |-- public/
|   `-- package.json
|-- experiment_creation_guide.md
`-- README.md
```

### What the main folders do

| Folder | Purpose |
| --- | --- |
| `backend/src/config` | Database connection logic and application constants |
| `backend/src/controllers` | HTTP request handlers for auth, experiments, reviews, funding, admin, and participation |
| `backend/src/errors` | Custom error types |
| `backend/src/middleware` | Auth, RBAC, uploads, DB readiness, and centralized error handling |
| `backend/src/models` | Main Mongoose models for persistent data |
| `backend/src/modules` | Feature-scoped modules such as community, reports, chatbot, and AI tagging |
| `backend/src/routes` | Route registration for REST API domains |
| `backend/src/services` | Business logic for experiments, eligibility, reviews, analytics, funding, AI, and integrations |
| `backend/src/utils` | Helpers such as async handling, logging, password rules, and response utilities |
| `backend/src/validators` | Request validation rules for auth, admin, and experiments |
| `backend/testing` | Structured unit, integration, and performance test suites |
| `backend/tests` | Additional legacy funding-focused test files |
| `frontend/src/api` | Axios client and API wrapper utilities |
| `frontend/src/components` | Shared UI and feature components |
| `frontend/src/pages` | Top-level routed pages for participant, researcher, admin, and community views |
| `frontend/src/styles` | Shared CSS and styling assets |
| `frontend/src/utils` | Frontend-side utility helpers such as password policy rules |

---

## 4. Functional Components

### Authentication and Users

- Handles participant registration, researcher registration, login, profile retrieval, and profile updates
- Supports create and update flows for user accounts through the auth API
- Enforces role-aware behavior for `participant`, `researcher`, and `admin`
- Includes researcher flagging support and admin-driven approval workflow

### Experiments Management

- Supports experiment creation, listing, retrieval, update, deletion, AI summary generation, and safety guidance access
- Researchers and admins can create or manage experiments based on role and approval state
- Public users can browse experiments and view experiment details

### Research Reviews

- Supports creation, read, update, delete, and experiment-linked filtering of reviews
- Researchers and admins can author and manage reviews
- Anonymous users can see published content while draft visibility is restricted

### Co-Researchers

- Supports listing, adding, updating, and removing collaborators for a specific experiment
- Restricted to authorized researchers and admins
- Managed as experiment-linked collaborator records rather than a separate standalone top-level model file

### Recommendations and Eligibility

- Generates personalized experiment recommendations for participants
- Performs eligibility preview and matching using profile data and experiment criteria
- Includes rule-based and AI-assisted analysis in the backend service layer

### Participation and Daily Logs

- Supports join, leave, study detail retrieval, researcher participant listing, log submission, and same-day log deletion
- Participants manage their own study lifecycle
- Researchers and admins can inspect experiment participation lists

### Fund Management

- Supports fund request creation, update, retrieval, deletion, open-request browsing, and admin status transitions
- Includes experiment wallets, contribution tracking, and audit support
- Researchers initiate requests while admins review and approve funding states

### Payments and Contributions

- Supports payment creation, order status lookup, webhook handling, and development confirmation flow
- Connected to contribution and funding workflows
- Uses PayHere integration settings from environment variables

### Community and Moderation

- Supports posts, comments, saves, likes, shares, poll voting, reporting, search suggestions, and chatbot interaction
- Authenticated users participate in discussions
- Admins review reports and moderate community content

### Admin Controls and Analytics

- Supports analytics retrieval, PDF exports, researcher approval and rejection, user management, wallet access, and report review
- Restricted to `admin` users
- Provides operational oversight across the platform

---

## 5. Backend

### Clean Architecture

| Layer | Location | Responsibility |
| --- | --- | --- |
| Routes | `backend/src/routes/`, `backend/src/modules/community/communityRoutes.js` | Define endpoint paths, attach middleware, and connect requests to controllers |
| Controllers | `backend/src/controllers/`, module controllers | Handle request and response flow, call services, and map business results to HTTP responses |
| Services | `backend/src/services/`, module services | Implement core logic such as eligibility checks, recommendation scoring, funding transitions, chatbot calls, and analytics |
| Models | `backend/src/models/`, `backend/src/modules/community/model/` | Define Mongoose schemas and persistence rules |
| Middleware | `backend/src/middleware/` | Enforce authentication, authorization, validation flow, uploads, DB readiness, and error handling |
| Validations | `backend/src/validators/`, `backend/src/modules/community/*Validators.js` | Validate request payloads and route-specific input rules |
| Config | `backend/src/config/` | Configure database connection, JWT constants, and environment-driven settings |

### API Endpoints Summary

**Total REST API endpoints: 87+ across 12 domains**

| Domain | Base Path | No. of Endpoints | Description |
| --- | --- | ---: | --- |
| Health | `/health` | 1 | API status and DB readiness health check |
| Auth | `/api/auth` | 6 | Participant registration, researcher registration, login, profile, and researcher flagging |
| Experiments | `/api/experiments` | 9 | Experiment listing, detail, CRUD, wallet, AI summary, safety guidelines, and linked reviews |
| Reviews | `/api/reviews` | 5 | Review CRUD and visibility-aware retrieval |
| Co-Researchers | `/experiments/:experimentId/co-researchers` | 4 | Experiment collaborator management |
| Recommendations | `/api/recommendations` | 1 | Participant recommendation engine output |
| Participations | `/api/participations` | 8 | Enrollment, My Studies, logs, leave flow, and participant listings |
| Fund Requests | `/api/fund-requests` | 7 | Research funding request lifecycle |
| Contributions | `/api/contributions` | 4 | Contribution retrieval and admin management |
| Payments | `/api/payments` | 4 | Payment create, status, webhook, and dev confirmation |
| Community | `/api/posts` | 17 | Feed, details, create, update, delete, likes, saves, comments, reports, chatbot, polls, and suggestions |
| Admin | `/api/admin` | 24 | Analytics, approvals, moderation, reports, researchers, users, wallets, and exports |
| External | `/api/external` | 2 | FDA drug events and drug labels proxy endpoints |

### Authentication

HealthLab primarily uses **JWT Bearer authentication** for protected endpoints.

- The backend checks `Authorization: Bearer <token>` in `authMiddleware.js`
- Decoded JWT payloads populate `req.user`
- Role checks are enforced using middleware such as `authorize(...)` and RBAC helpers
- The codebase also supports header-driven role metadata in some internal or development flows through:
  - `x-user-id`
  - `x-user-role`

#### Typical protected request

```http
GET /api/auth/profile
Authorization: Bearer <jwt-token>
```

#### Example login request

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "participant@example.com",
  "password": "HealthLab@2026"
}
```

#### Example login response

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "6800example123",
    "name": "Participant User",
    "email": "participant@example.com",
    "role": "participant"
  }
}
```

#### Example protected profile response

```json
{
  "success": true,
  "user": {
    "_id": "6800example123",
    "name": "Participant User",
    "email": "participant@example.com",
    "role": "participant"
  }
}
```

### Mongoose Models

| Model | File | Description |
| --- | --- | --- |
| `User` | `backend/src/models/User.js` | Core identity, auth, role, and participant profile data |
| `Researcher` | `backend/src/models/Researcher.js` | Researcher registration and approval lifecycle |
| `Experiment` | `backend/src/models/Experiment.js` | Research study metadata, limits, eligibility, and logging rules |
| `Review` | `backend/src/models/Review.js` | Research reviews authored by researchers and admins |
| `Participation` | `backend/src/models/Participation.js` | Enrollment records and daily activity logs |
| `FundRequest` | `backend/src/models/FundRequest.js` | Funding request state and review data |
| `Contribution` | `backend/src/models/Contribution.js` | Contribution and funding support records |
| `ExperimentWallet` | `backend/src/models/ExperimentWallet.js` | Experiment wallet balance and transaction tracking |
| `FundAuditLog` | `backend/src/models/FundAuditLog.js` | Audit entries for funding actions |
| `Post` | `backend/src/models/Post.js` | Community posts and associated social interactions |
| `Report` | `backend/src/models/Report.js` | Moderation reports for community content |
| `Post` | `backend/src/modules/community/model/Post.js` | Community module-scoped post model used by modular services |

### API Documentation

HealthLab provides **repository-driven API documentation and endpoint-level verification** through structured source organization and testing assets.

- `backend/README.md` provides backend-oriented documentation
- `backend/testing/` contains integration and performance assets for route verification
- The route and controller structure supports clear API exploration and manual verification workflows

### Complete API Endpoint Documentation

Base backend URL:

```text
http://localhost:5000
```

Production backend URL:

```text
https://healthlab-backend-0lo8.onrender.com/
```

#### Common authentication requirements

- Public routes do not require a token
- Protected routes require `Authorization: Bearer <jwt-token>`
- Some internal or compatibility flows also read `x-user-id` and `x-user-role`
- Admin-only routes require an authenticated `admin`
- Researcher-only routes require an authenticated `researcher`, and some operations also require approved researcher status

#### Common response style

- Success responses typically use HTTP `200` or `201`
- Validation failures typically use HTTP `400`
- Missing or invalid authentication typically uses HTTP `401`
- Authorization failures typically use HTTP `403`
- Missing resources typically use HTTP `404`

#### Health

| Method | Path | Auth | Request Format | Success Response |
| --- | --- | --- | --- | --- |
| `GET` | `/health` | Public | No body | Health status, DB state, uptime, timestamp |

Example:

```bash
curl http://localhost:5000/health
```

```json
{
  "status": "ok",
  "api": "HealthLab Backend API",
  "database": "Connected",
  "dbCode": 1
}
```

#### Auth

| Method | Path | Auth | Request Format | Success Response |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/register-participant` | Public | JSON participant profile and password | `201`, token, user summary |
| `POST` | `/api/auth/register` | Public | `multipart/form-data` or form fields for researcher registration | `201`, pending researcher record |
| `POST` | `/api/auth/login` | Public | JSON `{ email, password }` | `200`, token and user object |
| `GET` | `/api/auth/profile` | Bearer token | No body | Current authenticated user |
| `PUT` | `/api/auth/profile` | Bearer token | JSON profile updates | Updated user profile |
| `POST` | `/api/auth/researchers/:id/flag` | Bearer token | JSON `{ reason }` | Flag confirmation |

Example request:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"participant@example.com\",\"password\":\"HealthLab@2026\"}"
```

Example response:

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "6800example123",
    "name": "Participant User",
    "email": "participant@example.com",
    "role": "participant"
  }
}
```

#### Experiments

| Method | Path | Auth | Request Format | Success Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/experiments` | Public | Optional query parameters | Experiment list |
| `GET` | `/api/experiments/:id` | Public | No body | Single experiment |
| `GET` | `/api/experiments/:experimentId/reviews` | Optional auth | No body | Reviews for experiment |
| `GET` | `/api/experiments/:id/safety-guidelines` | Optional auth | No body | Safety guidance payload |
| `POST` | `/api/experiments` | Bearer token, `researcher`, approved | JSON experiment payload | `201`, created experiment |
| `GET` | `/api/experiments/:experimentId/wallet` | Bearer token | No body | Experiment wallet |
| `POST` | `/api/experiments/:id/ai-summary` | Bearer token, `researcher` or `admin` | Optional JSON context | Generated AI summary |
| `PUT` | `/api/experiments/:id` | Bearer token, `researcher` or `admin` | JSON partial update | Updated experiment |
| `DELETE` | `/api/experiments/:id` | Bearer token, `researcher` or `admin` | No body | Deletion confirmation |

Example create request:

```json
{
  "title": "Sleep Tracking Study",
  "description": "Tracks sleep quality and hydration over time.",
  "participantLimit": 10,
  "status": "draft",
  "eligibilityCriteria": {
    "minAge": 18,
    "maxAge": 60
  },
  "logFieldDefinitions": [
    {
      "label": "Sleep hours",
      "key": "sleepHours",
      "type": "number",
      "required": true
    }
  ]
}
```

#### Reviews

| Method | Path | Auth | Request Format | Success Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/reviews` | Optional auth | Optional query filters | Review list respecting visibility rules |
| `GET` | `/api/reviews/:id` | Optional auth | No body | Single review respecting draft visibility |
| `POST` | `/api/reviews` | Bearer token, `researcher` or `admin` | JSON review payload | `201`, created review |
| `PUT` | `/api/reviews/:id` | Bearer token, `researcher` or `admin` | JSON partial update | Updated review |
| `DELETE` | `/api/reviews/:id` | Bearer token, `researcher` or `admin` | No body | Delete confirmation |

Typical review payload:

```json
{
  "title": "Digital Sleep Review",
  "summary": "A concise review of digital wellbeing and sleep tracking.",
  "content": "This review discusses sleep tracking methods, risks, and practical recommendations.",
  "status": "draft",
  "keywords": ["sleep", "wellbeing"]
}
```

#### Co-Researchers

| Method | Path | Auth | Request Format | Success Response |
| --- | --- | --- | --- | --- |
| `GET` | `/experiments/:experimentId/co-researchers` | Optional auth | No body | Collaborator list |
| `POST` | `/experiments/:experimentId/co-researchers` | Bearer token, `researcher` or `admin` | JSON co-researcher payload | Created collaborator |
| `PUT` | `/experiments/:experimentId/co-researchers/:coResearcherId` | Bearer token, `researcher` or `admin` | JSON updates | Updated collaborator |
| `DELETE` | `/experiments/:experimentId/co-researchers/:coResearcherId` | Bearer token, `researcher` or `admin` | No body | Removal confirmation |

#### Recommendations

| Method | Path | Auth | Request Format | Success Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/recommendations` | Bearer token | No body | Ranked recommended experiments with scores |

#### Participations

| Method | Path | Auth | Request Format | Success Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/participations/preview-analysis/:experimentId` | Bearer token | No body | Pre-join eligibility and benefit analysis |
| `POST` | `/api/participations/join` | Bearer token | JSON `{ experimentId }` | `201`, participation record |
| `GET` | `/api/participations/my-studies` | Bearer token | No body | Study list for current user |
| `PUT` | `/api/participations/:id/leave` | Bearer token | No body | Leave confirmation |
| `GET` | `/api/participations/experiment/:experimentId/participants` | Bearer token, `researcher` or `admin` | Optional `includeWithdrawn=true` | Participant list with stats |
| `GET` | `/api/participations/:id` | Bearer token | No body | Participation detail and logs |
| `POST` | `/api/participations/:id/logs` | Bearer token | JSON `{ logData: {...} }` | Updated participation logs |
| `DELETE` | `/api/participations/:id/logs/today` | Bearer token | No body | Remaining log list |

Example join request:

```json
{
  "experimentId": "6800exampleExp123"
}
```

#### Fund Requests

| Method | Path | Auth | Request Format | Success Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/fund-requests/open` | Public | Optional query filters | Open request list |
| `POST` | `/api/fund-requests/:id/contribute` | Bearer token, `participant`/`researcher`/`admin` | JSON contribution payload | Contribution/payment initialization |
| `POST` | `/api/fund-requests` | Bearer token, `researcher` | JSON request payload | Created fund request |
| `GET` | `/api/fund-requests/my` | Bearer token, `researcher` | No body | Current researcher's requests |
| `GET` | `/api/fund-requests/:id` | Bearer token, `researcher` or `admin` | No body | Single fund request |
| `PATCH` | `/api/fund-requests/:id` | Bearer token, `researcher` or `admin` | JSON patch payload | Updated fund request |
| `DELETE` | `/api/fund-requests/:id` | Bearer token, `researcher` or `admin` | No body | Delete confirmation |

#### Contributions

| Method | Path | Auth | Request Format | Success Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/contributions/my` | Bearer token | No body | Current user's contributions |
| `GET` | `/api/contributions/admin` | Bearer token, `admin` | Optional query filters | All contributions |
| `PATCH` | `/api/contributions/:id/status` | Bearer token, `admin` | JSON status payload | Updated contribution |
| `DELETE` | `/api/contributions/:id` | Bearer token, `admin` | No body | Void confirmation |

#### Payments

| Method | Path | Auth | Request Format | Success Response |
| --- | --- | --- | --- | --- |
| `POST` | `/api/payments/create` | Bearer token | JSON payment creation payload | Payment initialization response |
| `GET` | `/api/payments/status/:orderId` | Bearer token | No body | Payment status |
| `POST` | `/api/payments/webhook` | Public webhook | PayHere callback payload | Webhook acknowledgment |
| `POST` | `/api/payments/dev-confirm/:orderId` | Bearer token | No body | Dev confirmation of payment |

Example create payment request:

```json
{
  "fundRequestId": "6800fund123",
  "amount": 500
}
```

#### Community

| Method | Path | Auth | Request Format | Success Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/posts` | Bearer token | Optional search and filter queries | Post feed |
| `GET` | `/api/posts/suggestions` | Bearer token | Optional query | Search suggestion list |
| `GET` | `/api/posts/saved` | Bearer token | No body | Saved posts |
| `POST` | `/api/posts/chat` | Bearer token | JSON `{ message, history? }` | Chatbot reply |
| `GET` | `/api/posts/:id` | Bearer token | No body | Single post |
| `POST` | `/api/posts` | Bearer token | Multipart or JSON post payload | Created post |
| `PUT` | `/api/posts/:id` | Bearer token | JSON post updates | Updated post |
| `DELETE` | `/api/posts/:id` | Bearer token | No body | Delete confirmation |
| `PUT` | `/api/posts/:id/like` | Bearer token | No body | Updated like state |
| `PUT` | `/api/posts/:id/poll/vote` | Bearer token | JSON poll vote payload | Updated poll result |
| `POST` | `/api/posts/:id/share` | Bearer token | No body | Share count update |
| `POST` | `/api/posts/:id/save` | Bearer token | No body | Save confirmation |
| `DELETE` | `/api/posts/:id/save` | Bearer token | No body | Unsave confirmation |
| `POST` | `/api/posts/:id/comments` | Bearer token | JSON comment payload | Added comment |
| `PUT` | `/api/posts/:id/comments/:commentId` | Bearer token | JSON comment updates | Updated comment |
| `DELETE` | `/api/posts/:id/comments/:commentId` | Bearer token | No body | Comment removal |
| `POST` | `/api/posts/:id/report` | Bearer token | JSON report payload | `201`, report confirmation |

Typical create post request:

```json
{
  "title": "Community Discussion",
  "content": "What daily habit helps you stay consistent in a study?",
  "tags": ["health", "research"],
  "poll": {
    "question": "Most useful tracker?",
    "options": ["Sleep", "Steps", "Mood"]
  }
}
```

#### Admin

| Method | Path | Auth | Request Format | Success Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/admin/analytics` | Bearer token, `admin` | Optional range query | Dashboard analytics |
| `GET` | `/api/admin/analytics/export/pdf` | Bearer token, `admin` | No body | PDF export stream |
| `GET` | `/api/admin/fund-analytics` | Bearer token, `admin` | Optional range query | Funding analytics |
| `GET` | `/api/admin/fund-reports` | Bearer token, `admin` | Optional pagination filters | Fund request report list |
| `GET` | `/api/admin/users` | Bearer token, `admin` | Optional role filter | User list |
| `GET` | `/api/admin/users/unapproved` | Bearer token, `admin` | No body | Unapproved users |
| `PATCH` | `/api/admin/users/approve/:id` | Bearer token, `admin` | Optional notes payload | Approved user |
| `PATCH` | `/api/admin/users/reject/:id` | Bearer token, `admin` | Optional notes payload | Rejected user |
| `DELETE` | `/api/admin/users/:id` | Bearer token, `admin` | No body | Delete confirmation |
| `GET` | `/api/admin/researchers/pending` | Bearer token, `admin` | No body | Pending researchers |
| `GET` | `/api/admin/researchers` | Bearer token, `admin` | Optional status filter | Researcher list |
| `GET` | `/api/admin/researchers/export/pdf` | Bearer token, `admin` | No body | PDF export stream |
| `GET` | `/api/admin/researchers/:id` | Bearer token, `admin` | No body | Single researcher |
| `PUT` | `/api/admin/researchers/:id/approve` | Bearer token, `admin` | JSON `{ reviewNotes? }` | Approved researcher |
| `PUT` | `/api/admin/researchers/:id/reject` | Bearer token, `admin` | JSON `{ reviewNotes? }` | Rejected researcher |
| `DELETE` | `/api/admin/researchers/:id` | Bearer token, `admin` | No body | Delete confirmation |
| `DELETE` | `/api/admin/experiments/:id` | Bearer token, `admin` | Optional decision payload | Experiment removal |
| `GET` | `/api/admin/fund-requests` | Bearer token, `admin` | Optional filters | All fund requests |
| `PATCH` | `/api/admin/fund-requests/:id/status` | Bearer token, `admin` | JSON status transition payload | Updated request |
| `GET` | `/api/admin/experiments/:experimentId/wallet` | Bearer token, `admin` | No body | Experiment wallet |
| `GET` | `/api/admin/reports` | Bearer token, `admin` | Optional status filter | Moderation reports |
| `GET` | `/api/admin/reports/:postId` | Bearer token, `admin` | No body | Detailed report bundle |
| `POST` | `/api/admin/reports/:postId/ban-user` | Bearer token, `admin` | Optional reason payload | Ban confirmation |
| `DELETE` | `/api/admin/reports/:postId` | Bearer token, `admin` | No body | Reported post deletion |

Example admin approval request:

```json
{
  "reviewNotes": "Approved for experiment publishing"
}
```

#### External

| Method | Path | Auth | Request Format | Success Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/external/fda/drug-events` | Public | Query parameters forwarded to FDA proxy | External FDA event data |
| `GET` | `/api/external/fda/drug-labels` | Public | Query parameters forwarded to FDA proxy | External FDA label data |

---

## 6. Frontend

### Overview

The frontend is a React + Vite single-page application that connects to the HealthLab REST API and exposes role-aware interfaces for participants, researchers, and admins.

It includes:

- public and authenticated navigation
- experiment discovery and recommendation flows
- researcher experiment and review management views
- community feed and post detail pages
- admin dashboard and reporting pages
- wallet, contributions, and funding pages

### Key Libraries

- `react`
- `react-dom`
- `react-router-dom`
- `axios`
- `tailwindcss`
- `daisyui`
- `framer-motion`
- `recharts`
- `html2pdf.js`
- `jspdf`
- `jspdf-autotable`
- `lucide-react`

### Frontend Folder Structure

```text
frontend/src/
|-- api/
|-- assets/
|-- components/
|   |-- admin/
|   |-- common/
|   |-- ui/
|   `-- virtual-labs/
|-- lib/
|-- pages/
|-- styles/
|-- utils/
|-- App.jsx
`-- main.jsx
```

| Folder | Purpose |
| --- | --- |
| `frontend/src/api` | Axios instance, auth helpers, posts API, and fund API wrappers |
| `frontend/src/assets` | Static visual assets and images |
| `frontend/src/components/admin` | Admin dashboard widgets and charts |
| `frontend/src/components/common` | Shared cross-feature display components |
| `frontend/src/components/ui` | Reusable UI primitives such as input, modal, card, badge, and skeleton |
| `frontend/src/components/virtual-labs` | Home and landing-page style feature sections |
| `frontend/src/lib` | Shared utility helpers |
| `frontend/src/pages` | 23 routed pages for auth, participant, researcher, admin, and community views |
| `frontend/src/styles` | Shared CSS files |
| `frontend/src/utils` | Frontend utility helpers such as password policy |

### State and Session Management

The frontend uses a streamlined session-aware routing and API integration approach.

Current application behavior:

- authenticated user session data is persisted across the client experience
- JWT access tokens are attached automatically through the Axios request interceptor
- route access is handled in `App.jsx` using current user role checks
- `BrowserRouter` powers client-side navigation

The frontend Axios base URL is currently configured to the deployed backend:

```text
https://healthlab-backend-0lo8.onrender.com/api
```

---

## 7. Setup and Run

### Prerequisites

- Node.js
- npm
- MongoDB local instance or MongoDB Atlas connection

### Installation Steps

#### Backend

```bash
cd backend
npm install
npm run dev
```

Production mode:

```bash
npm start
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

Create `backend/.env` and configure the values used by the system.

| Variable | Purpose |
| --- | --- |
| `PORT` | Express server port |
| `MONGODB_URI` | Primary MongoDB connection string |
| `MONGO_URI` | Alternate MongoDB connection string key supported by the backend |
| `MONGO_DB_NAME` | Database name override |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES_IN` | Token lifetime |
| `NODE_ENV` | Runtime environment |
| `GEMINI_API_KEY` | Gemini integration |
| `GEMINI_MODEL` | Optional Gemini model override |
| `GROQ_API_KEY` | Groq chatbot integration |
| `GROQ_MODEL` | Optional Groq model override |
| `HF_TOKEN` | Hugging Face tagging integration |
| `HF_MODEL` | Optional model override |
| `HF_ENDPOINT` | Optional custom Hugging Face endpoint |
| `HF_TIMEOUT_MS` | Timeout for AI tagging requests |
| `HF_TAG_SCORE_THRESHOLD` | Smart-tag confidence threshold |
| `PAYHERE_MERCHANT_ID` | PayHere merchant ID |
| `PAYHERE_MERCHANT_SECRET` | PayHere merchant secret |
| `PAYHERE_SANDBOX` | Sandbox toggle |
| `PAYHERE_RETURN_URL` | Frontend success callback |
| `PAYHERE_CANCEL_URL` | Frontend cancel callback |
| `PAYHERE_NOTIFY_URL` | Backend webhook callback |

### Default Local URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

---

## 8. Third-Party Integrations

| Service | Purpose | Where Used |
| --- | --- | --- |
| Google Gemini | Experiment summary generation and clinical-style narrative support | `backend/src/services/gemini.service.js`, experiment and eligibility flows |
| Groq | Community chatbot replies | `backend/src/modules/community/chatbot/services/groqService.js` |
| Hugging Face | AI-assisted tagging and smart metadata support | `backend/src/modules/community/services/aiTaggingService.js` and related env settings |
| PayHere | Payment processing and contribution or funding workflows | `backend/src/services/payhereService.js`, payment routes and controller |
| FDA Open APIs | External health-related data proxy | `backend/src/routes/externalRoutes.js`, `backend/src/controllers/externalApiController.js` |
| MongoDB Atlas or MongoDB | Persistent application database | `backend/src/config/db.js` |

---

## 9. Testing Report

### Test Inventory

| Category | Files | Test Cases / Assets |
| --- | ---: | ---: |
| Unit Tests (`backend/testing/unit`) | 10 | 153 |
| Integration Tests (`backend/testing/integration`) | 2 | 97 |
| Legacy Additional Tests (`backend/tests`) | 3 | 7 |
| Performance Scenarios (`backend/testing/performance`) | 5 YAML scenarios | 5 |
| Total JS Test Files | 15 | 257 |

### What is covered

- service-layer business logic
- controller logic with mocks
- validation rules
- experiment lifecycle flows
- auth and registration flows
- review lifecycle and visibility rules
- eligibility and recommendations
- participation and daily logs
- admin-community moderation scenarios
- funding-oriented legacy coverage
- Artillery load scenarios for admin, community, and researcher read flows

### Commands

Run from `backend/`:

```bash
npm test
npm run test:unit
npm run test:integration
npm run test:performance
npm run test:performance:report
```

### Testing Environment Configuration Details

| Item | Location / Value | Notes |
| --- | --- | --- |
| Jest config | `backend/testing/jest.config.js` | Shared config for backend unit and integration suites |
| Unit test folder | `backend/testing/unit/` | Isolated logic tests with mocks and stubs |
| Integration test folder | `backend/testing/integration/` | API tests using real Express routes and in-memory MongoDB |
| Integration DB engine | `mongodb-memory-server` | Used to avoid touching the production database during integration tests |
| Legacy test folder | `backend/tests/` | Additional funding-oriented test coverage retained outside the structured testing tree |
| Performance scenarios | `backend/testing/performance/` | Artillery YAML load scripts |
| Artillery JSON output | `backend/testing/build/artillery-report.json` | Generated by `npm run test:performance` |
| Artillery HTML report | `backend/testing/build/artillery-report.html` | Generated by `npm run test:performance:report` |
| Backend test environment | `NODE_ENV=test` | Used by integration setup and test-safe runtime flows |

#### How to run unit tests

```bash
cd backend
npm run test:unit
```

#### Integration testing setup and execution

```bash
cd backend
npm run test:integration
```

Integration tests:

- use `mongodb-memory-server` for an ephemeral database
- exercise real route, controller, service, and model behavior
- avoid relying on the production or deployed MongoDB instance

#### Performance testing setup and execution

```bash
cd backend
npm run test:performance
npm run test:performance:report
```

Performance testing uses Artillery scenarios stored in `backend/testing/performance/`.

---

## 10. Deployment Report

> **IMPORTANT:** In this architecture, **ONLY the frontend** should be deployed to Vercel, and **ONLY the backend** should be deployed to Render. The two layers are deployed separately to different platforms.

### Backend Deployment (Render Only)

HealthLab backend is deployed as a Node.js service on Render. Do not deploy the frontend here.

#### Backend deployment process

1. Connect the repository to Render (Web Service).
2. Set the root directory to `backend/`.
3. Use build command `npm install`.
4. Use start command `npm start`.
5. Add environment variables for database, JWT, AI services, and payment configuration.
6. Verify deployment using the `/health` endpoint.

### Frontend Deployment (Vercel Only)

HealthLab frontend is deployed as a React+Vite application on Vercel. Do not deploy the backend here.

#### Frontend deployment process

1. Connect the repository to Vercel or use Vercel CLI (`vercel --prod`).
2. Set the root directory to `frontend/`.
3. Use build command `npm run build`.
4. Use output directory `dist`.
5. Ensure environment variables (like `VITE_API_URL`) are set in Vercel.
6. Verify frontend API integration against the live backend URL.

### Live URLs

| Environment | URL |
| --- | --- |
| Frontend | `https://health-lab-black.vercel.app/` |
| Backend | `https://healthlab-backend-0lo8.onrender.com/` |

---

## 11. Contributors

The current repository git history shows the following contributors:

- J.V.S. Weerasinghe
- H.G.S. Dias
- M.A.T.S Meewalarachchi
- W.D.S.G.S.Sasanka

---

## 12. License

This project is intended for academic and portfolio use unless a separate license file is added.
