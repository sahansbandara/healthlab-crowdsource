# HealthLab Backend API

**Classification: Public — SLIIT**

REST API for the HealthLab platform: authentication, researcher management, experiments, fund requests, participations, community posts, and analytics.

---

## Table of Contents

1. [Features](#features)
2. [Setup Instructions](#setup-instructions)
3. [Environment Variables](#environment-variables)
4. [Run](#run)
5. [API Endpoint Documentation](#api-endpoint-documentation)
6. [Sample Workflows](#sample-workflows)
7. [Deployment (Admin + Community)](#deployment-admin--community)

---

## Features

- **Authentication**: JWT-based auth with roles (Admin, Researcher, Participant).
- **Researcher registration**: Full registration with admin approval workflow; optional file upload for affiliation proof.
- **Experiments**: CRUD for experiments; wallet per experiment; co-researchers; reviews.
- **Fund requests**: Researchers request top-ups; admins approve/reject; transactionally secure wallet credits.
- **Participations**: Join/leave experiments, daily logs, participant lists for researchers.
- **Community (Posts)**: Create, edit, delete posts; like, share, save; author-only edit/delete.
- **Admin**: User/researcher management, approve/reject researchers, delete experiments, PDF export, analytics.
- **Recommendations**: Personalized experiment recommendations for authenticated users.
- **Contributions**: Donations to fund requests; admin management.
- **External APIs**: FDA drug events/labels proxy.
- **Audit logging** and **error handling** across the API.

---

## Setup Instructions

### Step 1: Prerequisites

- **Node.js** v14 or higher (v18+ recommended).
- **MongoDB** (local or Atlas):
  - Local: MongoDB running at `mongodb://localhost:27017`, or
  - Atlas: Create a cluster and obtain a connection string (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/dbname?retryWrites=true&w=majority`).
- **npm** (comes with Node.js).

### Step 2: Clone and enter backend

```bash
git clone <repository-url>
cd HealthLab/backend
```

### Step 3: Install dependencies

```bash
npm install
```

### Step 4: Environment configuration

1. In the `backend` folder, create a file named `.env` (if it does not exist).
2. Add the following variables (replace placeholder values):

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/af_project_db
# Or for Atlas: MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/af_project_db?retryWrites=true&w=majority

JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=7d
```

- **PORT**: Server port (default `5000`).
- **MONGODB_URI** or **MONGO_URI**: MongoDB connection string. The app accepts either variable name.
- **JWT_SECRET**: Secret used to sign JWTs; use a long, random string in production.
- **JWT_EXPIRES_IN**: Token expiry (e.g. `7d`, `24h`).

### Step 5: (Optional) Seed data

To create sample admin and researcher users:

```bash
npm run seed
```

(If a seed script is not defined in `package.json`, you may need to run a script from `src/scripts/seed.js` manually with `node src/scripts/seed.js`.)

### Step 6: Start the server

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

The API will be available at `http://localhost:5000` (or the port you set in `.env`).

### Step 7: Verify

Open in a browser or call with cURL:

```bash
curl http://localhost:5000/health
```

Expected response (when DB is connected):

```json
{
  "status": "ok",
  "api": "HealthLab Backend API",
  "database": "Connected",
  "dbCode": 1,
  "uptime": 1.23,
  "timestamp": "2025-02-25T12:00:00.000Z"
}
```

---

## Environment Variables

| Variable        | Required | Description                                      | Example                    |
|----------------|----------|--------------------------------------------------|----------------------------|
| PORT           | No       | Server port                                      | `5000`                     |
| MONGODB_URI    | Yes*     | MongoDB connection string                        | `mongodb://localhost:27017/af_project_db` |
| MONGO_URI      | Yes*     | Alternative to MONGODB_URI                       | Same as above              |
| JWT_SECRET     | Yes      | Secret for signing JWT tokens                    | Long random string         |
| JWT_EXPIRES_IN | No       | Token expiry                                     | `7d`                       |

*At least one of `MONGODB_URI` or `MONGO_URI` must be set.

---

## Run

| Command      | Description                |
|-------------|----------------------------|
| `npm start` | Start server (production)  |
| `npm run dev` | Start with nodemon (dev) |
| `npm run seed` | Seed DB (if available)   |

---

## API Endpoint Documentation

**Base URL:** `http://localhost:5000` (or your `PORT`).

**Authentication:** For protected routes, send the JWT in the header:

```
Authorization: Bearer <token>
```

**Content type:** For JSON bodies use:

```
Content-Type: application/json
```

Error responses typically follow:

```json
{ "success": false, "message": "Error description" }
```

---

### Health

| Method | Endpoint   | Auth | Description      |
|--------|------------|------|------------------|
| GET    | `/health`  | No   | API and DB status |

**Response (200):**

```json
{
  "status": "ok",
  "api": "HealthLab Backend API",
  "database": "Connected",
  "dbCode": 1,
  "uptime": 1.5,
  "timestamp": "2025-02-25T12:00:00.000Z"
}
```

---

### Auth — `/api/auth`

| Method | Endpoint                | Auth | Description                    |
|--------|-------------------------|------|--------------------------------|
| POST   | `/api/auth/register`    | No   | Register researcher (form + optional file) |
| POST   | `/api/auth/register-participant` | No | Register participant   |
| POST   | `/api/auth/login`       | No   | Login; returns user + token    |
| GET    | `/api/auth/profile`     | Yes  | Current user profile           |
| PUT    | `/api/auth/profile`     | Yes  | Update profile                 |

**POST /api/auth/login**

- **Request body:** `{ "email": "string", "password": "string" }`
- **Response (200):**

```json
{
  "user": {
    "_id": "...",
    "name": "Admin User",
    "email": "admin@healthlab.com",
    "role": "admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

- **Error (401):** `{ "success": false, "message": "Invalid email or password" }`

**POST /api/auth/register** (Researcher)

- **Content-Type:** `multipart/form-data` if uploading affiliation proof; otherwise `application/json`.
- **Request body (JSON or form fields):**
  - `name` (string, required)
  - `fullName` (string, required)
  - `email` (string, required)
  - `password` (string, min 6, required)
  - `nic` (string, required)
  - `gender` (string, required)
  - `currentWorkplace` (string, required)
  - `highestAcademicQualification` (string, required)
  - `researcherType` (string, required): `"Student"` \| `"NGO"` \| `"Affiliated to Organization"` \| `"Other"`
  - `hasPublishedResearch` (boolean, required)
  - `purpose` (string, required)
  - If `researcherType === "Other"`: `otherResearcherTypeExplanation` (string)
  - If `researcherType === "Affiliated to Organization"`: file upload for proof
  - If `hasPublishedResearch === true`: `publicationSiteOrLink` (string)
- **Response (201):**

```json
{
  "success": true,
  "message": "Researcher registration submitted for admin review",
  "researcher": { "_id": "...", "user": {...}, "status": "pending", ... }
}
```

**GET /api/auth/profile**

- **Auth:** Bearer token required.
- **Response (200):** `{ "success": true, "user": { "_id", "name", "email", "role", ... } }`

---

### Admin — `/api/admin`

All admin routes require **Bearer token** and **role: admin**.

| Method | Endpoint                                      | Description                    |
|--------|-----------------------------------------------|--------------------------------|
| GET    | `/api/admin/analytics`                        | Dashboard analytics            |
| GET    | `/api/admin/users`                            | All users (query: `?role=`)    |
| GET    | `/api/admin/users/unapproved`                 | Unapproved researcher users    |
| PATCH  | `/api/admin/users/approve/:id`                | Approve user (user `_id`)      |
| PATCH  | `/api/admin/users/reject/:id`                 | Reject user (user `_id`)       |
| GET    | `/api/admin/researchers`                      | Researchers (query: `?status=`) |
| GET    | `/api/admin/researchers/pending`              | Pending researchers            |
| GET    | `/api/admin/researchers/export/pdf`           | Export researchers PDF          |
| GET    | `/api/admin/researchers/:id`                  | One researcher                  |
| PUT    | `/api/admin/researchers/:id/approve`          | Approve researcher              |
| PUT    | `/api/admin/researchers/:id/reject`           | Reject researcher               |
| DELETE | `/api/admin/researchers/:id`                  | Delete researcher (user → participant) |
| DELETE | `/api/admin/experiments/:id`                  | Delete experiment               |
| GET    | `/api/admin/fund-requests`                    | All fund requests               |
| PATCH  | `/api/admin/fund-requests/:id/status`        | Update request status          |
| GET    | `/api/admin/experiments/:experimentId/wallet`| Experiment wallet               |
| GET    | `/api/admin/fund-analytics`                  | Fund analytics                  |
| GET    | `/api/admin/fund-reports`                    | Fund reports                    |

**PUT /api/admin/researchers/:id/approve**

- **Request body:** `{ "reviewNotes": "optional string" }`
- **Response (200):** Updated researcher object.

**PUT /api/admin/researchers/:id/reject**

- **Request body:** `{ "reviewNotes": "optional string" }`
- **Response (200):** Updated researcher object.

**DELETE /api/admin/experiments/:id**

- **Request body:** `{ "rejectResearcher": boolean, "reassignToParticipant": boolean }` (optional)
- **Response (200):** `{ "success": true, "message": "Experiment deleted" }`

---

### Experiments — `/api/experiments`

| Method | Endpoint                              | Auth              | Description        |
|--------|---------------------------------------|-------------------|--------------------|
| GET    | `/api/experiments`                    | No                | List experiments    |
| GET    | `/api/experiments/:id`               | No                | Get one experiment |
| POST   | `/api/experiments`                   | Researcher        | Create experiment   |
| PUT    | `/api/experiments/:id`              | Researcher, Admin | Update experiment   |
| DELETE | `/api/experiments/:id`              | Researcher, Admin | Delete experiment   |
| GET    | `/api/experiments/:experimentId/wallet` | Researcher/Admin | Get wallet         |
| GET    | `/api/experiments/:experimentId/reviews` | Optional auth  | List reviews       |

**POST /api/experiments**

- **Request body:** Experiment document (e.g. `title`, `description`, ... as per model).
- **Response (201):** Created experiment.

---

### Participations — `/api/participations`

All participation routes require **Bearer token**.

| Method | Endpoint                                                | Auth              | Description           |
|--------|---------------------------------------------------------|-------------------|-----------------------|
| POST   | `/api/participations/join`                              | Any               | Join an experiment     |
| GET    | `/api/participations/my-studies`                       | Any               | My enrolled studies    |
| PUT    | `/api/participations/:id/leave`                        | Any               | Leave study            |
| GET    | `/api/participations/experiment/:experimentId/participants` | Researcher, Admin | List participants |
| GET    | `/api/participations/:id`                              | Any               | Participation detail   |
| POST   | `/api/participations/:id/logs`                         | Any               | Submit daily log       |
| DELETE | `/api/participations/:id/logs/today`                   | Any               | Delete today's log     |

**POST /api/participations/join**

- **Request body:** Typically `{ "experimentId": "..." }` (check controller for exact field).
- **Response (201):** Created participation.

---

### Fund Requests — `/api/fund-requests`

| Method | Endpoint                              | Auth                    | Description        |
|--------|---------------------------------------|-------------------------|--------------------|
| GET    | `/api/fund-requests/open`             | No                      | Open requests      |
| POST   | `/api/fund-requests/:id/contribute`   | Participant, Researcher, Admin | Contribute    |
| POST   | `/api/fund-requests`                  | Researcher              | Create request     |
| GET    | `/api/fund-requests/my`               | Researcher              | My requests        |
| GET    | `/api/fund-requests/:id`              | Researcher, Admin       | Get request        |
| PATCH  | `/api/fund-requests/:id`              | Researcher, Admin       | Update request     |
| DELETE | `/api/fund-requests/:id`              | Researcher, Admin       | Delete request     |

**POST /api/fund-requests**

- **Request body:** `{ "experimentId": "...", "requestedAmount": number, "reason": "string" }`
- **Response (201):** Created fund request.

**PATCH /api/admin/fund-requests/:id/status** (admin)

- **Request body:** `{ "status": "APPROVED" | "REJECTED", "adminDecisionNote": "string", "approvedAmount": number }`
- **Response (200):** Updated request.

---

### Community (Posts) — `/api/posts`

All post routes require **Bearer token** (any authenticated user). Edit/delete of a post is allowed only by the author (enforced in backend).

| Method | Endpoint                    | Description              |
|--------|-----------------------------|--------------------------|
| GET    | `/api/posts`                | List posts               |
| GET    | `/api/posts/saved`          | Current user's saved posts |
| GET    | `/api/posts/:id`           | Get one post             |
| POST   | `/api/posts`               | Create post              |
| PUT    | `/api/posts/:id`           | Update post (author only)|
| DELETE | `/api/posts/:id`           | Delete post (author only)|
| PUT    | `/api/posts/:id/like`      | Toggle like              |
| POST   | `/api/posts/:id/share`     | Increment share count    |
| POST   | `/api/posts/:id/save`      | Save post                |
| DELETE | `/api/posts/:id/save`      | Unsave post              |

**Query for GET /api/posts**

- `sort`: `latest` | `popular` | `most_commented`
- `q`: search string (title, content, tags)

**POST /api/posts**

- **Request body:** `{ "title": "string", "content": "string", "tags": ["string"] }`
- **Response (201):** Created post (with `author`, `likeCount`, `commentCount`).

**PUT /api/posts/:id**

- **Request body:** `{ "title": "string", "content": "string", "tags": ["string"] }`
- **Response (200):** Updated post object.

**GET /api/posts/:id**

- **Response (200):** Single post object (root body is the post; no wrapper).

**PUT /api/posts/:id/like**

- **Response (200):** `{ "likeCount": number, "liked": boolean }`

---

### Recommendations — `/api/recommendations`

| Method | Endpoint                    | Auth | Description        |
|--------|-----------------------------|------|--------------------|
| GET    | `/api/recommendations`      | Yes  | Get recommendations |

**Response (200):** Array or object of recommended experiments (structure as per controller).

---

### Contributions — `/api/contributions`

All require **Bearer token**.

| Method | Endpoint                         | Auth                    | Description     |
|--------|----------------------------------|-------------------------|-----------------|
| GET    | `/api/contributions/my`         | Participant, Researcher, Admin | My contributions |
| GET    | `/api/contributions/admin`      | Admin                   | All contributions |
| PATCH  | `/api/contributions/:id/status` | Admin                   | Update status   |
| DELETE | `/api/contributions/:id`        | Admin                   | Void contribution |

---

### External — `/api/external`

| Method | Endpoint                         | Auth | Description     |
|--------|----------------------------------|------|-----------------|
| GET    | `/api/external/fda/drug-events`  | No   | FDA drug events |
| GET    | `/api/external/fda/drug-labels`  | No   | FDA drug labels |

---

### Co-researchers — `/experiments/:experimentId/co-researchers`

| Method | Endpoint    | Auth              | Description     |
|--------|-------------|-------------------|-----------------|
| GET    | (see above) | Optional          | List co-researchers |
| POST   | (see above) | Researcher, Admin | Add             |
| PUT    | (see above) | Researcher, Admin | Update          |
| DELETE | (see above) | Researcher, Admin | Remove          |

---

### Reviews — `/reviews`

| Method | Endpoint   | Auth              | Description   |
|--------|------------|-------------------|---------------|
| GET    | `/reviews` | Optional          | List reviews  |
| GET    | `/reviews/:id` | Optional       | One review    |
| POST   | `/reviews` | Researcher, Admin | Create review |
| PUT    | `/reviews/:id` | Researcher, Admin | Update    |
| DELETE | `/reviews/:id` | Researcher, Admin | Delete    |

---

## Sample Workflows

### 1. Login as Admin

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@healthlab.com", "password":"admin123"}'
```

Save the `token` from the response.

### 2. Get All Users (Admin)

```bash
curl -X GET "http://localhost:5000/api/admin/users" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### 3. Approve a Researcher (Admin)

```bash
curl -X PUT "http://localhost:5000/api/admin/researchers/<RESEARCHER_ID>/approve" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"reviewNotes": "Approved for HealthLab access"}'
```

### 4. Create a Post (Community)

```bash
curl -X POST http://localhost:5000/api/posts \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"My first post","content":"Hello community.","tags":["health","research"]}'
```

### 5. Create Fund Request (Researcher)

```bash
curl -X POST http://localhost:5000/api/fund-requests \
  -H "Authorization: Bearer <RESEARCHER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"experimentId":"<EXPERIMENT_ID>","requestedAmount":500,"reason":"Top up for participant incentives"}'
```

### 6. Approve Fund Request (Admin)

```bash
curl -X PATCH "http://localhost:5000/api/admin/fund-requests/<REQUEST_ID>/status" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status":"APPROVED","adminDecisionNote":"Approved","approvedAmount":500}'
```

---

  ## Deployment (Admin + Community)

### Backend Deployment Checklist

1. **Environment Setup**
   - Set `NODE_ENV=production` in `.env`
   - Use MongoDB Atlas or production MongoDB instance
   - Generate secure JWT_SECRET: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Set `JWT_EXPIRES_IN=7d` (or desired expiry)

2. **Install Dependencies & Build** (if applicable)
   ```bash
   npm install --production
   npm run build  # if build script exists
   ```

3. **Database Verification**
   - Ensure MongoDB Atlas IP whitelist includes your server
   - Run health check: `curl http://localhost:5000/health`

4. **Start Server**
   ```bash
   NODE_ENV=production npm start
   ```
   Or use process manager (PM2):
   ```bash
   pm2 start src/server.js --name "healthlab-backend" --env NODE_ENV=production
   ```

5. **HTTPS Setup**
   - Configure reverse proxy (Nginx, Apache) for SSL/TLS
   - Example Nginx config:
   ```nginx
   server {
     listen 443 ssl http2;
     server_name api.healthlab.com;
     
     ssl_certificate /path/to/cert.pem;
     ssl_certificate_key /path/to/key.pem;
     
     location / {
       proxy_pass http://localhost:5000;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
     }
   }
   ```

6. **Monitoring & Logging**
   - Check logs: `pm2 logs healthlab-backend`
   - Set up error tracking (Sentry, DataDog) for production errors
   - Monitor disk space, CPU, memory

### Frontend Deployment Checklist

1. **Build for Production**
   ```bash
   cd frontend
   npm install --legacy-peer-deps
   npm run build
   ```
   Output: `dist/` folder

2. **Configure API Endpoint**
   Update `.env.production` or frontend config:
   ```
   VITE_API_BASE_URL=https://api.healthlab.com
   ```
   Reference in `frontend/src/api/api.js`:
   ```javascript
   const api = axios.create({
     baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
   });
   ```

3. **Deploy Static Files**
   Option A — Static host (Vercel, Netlify):
   - Push repo and auto-deploy
   
   Option B — Web server (Nginx, Apache):
   ```bash
   # Copy dist/ to server
   scp -r dist/* user@server:/var/www/healthlab-frontend/
   ```

4. **Nginx Configuration** (for static files + SPA routing)
   ```nginx
   server {
     listen 443 ssl http2;
     server_name healthlab.com;
     
     ssl_certificate /path/to/cert.pem;
     ssl_certificate_key /path/to/key.pem;
     
     root /var/www/healthlab-frontend;
     
     # SPA routing: redirect 404s to index.html
     location / {
       try_files $uri $uri/ /index.html;
     }
     
     # Proxy API calls to backend
     location /api/ {
       proxy_pass https://api.healthlab.com;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
     }
     
     # Cache static assets
     location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff)$ {
       expires 365d;
       add_header Cache-Control "public, immutable";
     }
   }
   ```

5. **Security Headers**
   Add to Nginx (or server):
   ```nginx
   add_header X-Frame-Options "SAMEORIGIN";
   add_header X-Content-Type-Options "nosniff";
   add_header X-XSS-Protection "1; mode=block";
   add_header Referrer-Policy "strict-origin-when-cross-origin";
   add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';";
   ```

---

## Sample Workflows

### Researcher Approval Workflow (Admin)

1. **Researcher registers** → Backend creates user + researcher doc with `status: "pending"`
2. **Admin sees pending researchers** → `GET /api/admin/researchers/pending`
3. **Admin approves** → `PUT /api/admin/researchers/:id/approve` with optional review notes
4. **Researcher can now create experiments**

### Community Post with Poll

1. **User creates post** → `POST /api/posts` with:
   ```json
   {
     "title": "What's your favorite health metric?",
     "content": "Let's discuss what metrics matter most.",
     "tags": ["health", "feedback"],
     "poll": {
       "question": "Which metric do you track?",
       "options": ["Steps", "Sleep", "Heart Rate", "Calories"]
     }
   }
   ```
2. **Other users vote** → `PUT /api/posts/:id/like?vote=up` (like) or poll vote
3. **Comments added** → `POST /api/posts/:id/comments`
4. **Post is liked/shared/saved** → Various endpoints increment counters

### Fund Request Approval

1. **Researcher creates fund request** → `POST /api/fund-requests` with `experimentId`, `requestedAmount`, `reason`
2. **Admin reviews** → `GET /api/admin/fund-requests`
3. **Admin approves** → `PATCH /api/admin/fund-requests/:id/status` with `status: "APPROVED"`, `approvedAmount`, notes
4. **Funds credited to experiment wallet**

---

## Error Handling & Status Codes

| Code | Scenario | Example |
|------|----------|---------|
| 200  | Success (GET, PUT, DELETE, POST with no new resource) | Post updated |
| 201  | Resource created (POST with new resource) | Post created |
| 400  | Validation error (invalid input, missing required field) | `{ "success": false, "message": "Title required" }` |
| 401  | Unauthenticated (missing/invalid token) | No Bearer token provided |
| 403  | Unauthorized (authenticated but insufficient permissions) | Non-author trying to edit post |
| 404  | Not found (resource doesn't exist) | Post ID not found |
| 500  | Server error (unexpected exception) | Database connection failed |

---

## Community Feature Highlights

### Posts with Polls
- Create posts with optional polls
- Single vote per user per poll
- Real-time vote percentages and counts
- Comments on posts
- Like/save/share tracking

### Search & Discovery
- Full-text search in post titles, content, tags
- Tag-based filtering
- Author filtering
- Smart tag suggestions (AI-generated)
- "Following" topic recommendations

### Content Management
- Author-only edit/delete
- Markdown-style formatting (title + content)
- Image uploads for posts
- Tag management (user + AI)
- Pagination with 10 posts/page

### Admin Controls
- View all posts
- Report post system
- User role management
- Delete non-compliant posts
- Analytics on community engagement

---

## Testing

### Run Unit Tests
```bash
npm run test
```

### Run Integration Tests
```bash
npm run test:integration
```

### Performance Testing
```bash
npm run test:performance
```

Tests verify:
- CRUD operations (create, read, update, delete)
- Permission checks (author-only, admin-only)
- Pagination logic (limit, skip, page math)
- Error handling (validation, auth, not found)
- API response formats
- Data persistence
  ### Backend Deployment (Admin + Community APIs)

  **Recommended platform:** Render (Web Service) or Railway (Node.js service)

  #### Backend setup steps

  1. Create a new Web Service and connect your GitHub repository.
  2. Set root directory to `backend`.
  3. Configure build/start:
    - Build command: `npm install`
    - Start command: `npm start`
  4. Add environment variables (see list below).
  5. Deploy and verify:
    - `GET /health`
    - Admin routes (example): `GET /api/admin/analytics`
    - Community routes (example): `GET /api/posts`, `POST /api/posts/:id/report`

  ### Frontend Deployment (Admin + Community UI)

  **Recommended platform:** Vercel or Netlify (Vite static hosting)

  #### Frontend setup steps

  1. Create a new project and connect the same repository.
  2. Set root directory to `frontend`.
  3. Configure build/output:
    - Build command: `npm run build`
    - Output directory: `dist`
  4. Add frontend environment variables (see list below).
  5. Deploy and verify:
    - Admin dashboard page loads and fetches analytics/reports.
    - Community feed loads, post CRUD works, report modal submits.

  ### Environment Variables Used (No Secrets Exposed)

  #### Backend (`backend/.env`)

  - `PORT` (example: `5000`)
  - `MONGODB_URI` or `MONGO_URI` (MongoDB connection string)
  - `JWT_SECRET` (long random secret)
  - `JWT_EXPIRES_IN` (example: `7d`)
  - `GROQ_API_KEY` (for community assistant)
  - `GROQ_MODEL` (optional model override)
  - `HF_TOKEN` (for AI smart tagging)
  - `HF_MODEL` (optional model override)
  - `HF_ENDPOINT` (optional endpoint override)
  - `HF_TIMEOUT_MS` (optional timeout tuning)
  - `HF_TAG_SCORE_THRESHOLD` (optional tagging threshold)

  #### Frontend (`frontend/.env`)

  - No required frontend environment variables are currently used for Admin/Community.
  - Current API base URL is configured directly in frontend code at `frontend/src/api/api.js`.
  - (Recommended future improvement) move API base URL to `VITE_API_BASE_URL`.

  > Security note:
  > - Never commit `.env` files.
  > - Store all secrets in deployment platform environment settings.
  > - Keep only `.env.example` in Git if needed.

  ---

## License & Classification

**Classification: Public — SLIIT**

This README and the API are intended for use within the stated context. Ensure `.env` and secrets are never committed to version control.
