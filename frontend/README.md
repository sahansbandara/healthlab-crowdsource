# HealthLab Frontend

**Classification: Public — SLIIT**

A React + Vite web application for the HealthLab platform: authentication, researcher management, experiments, participations, community posts, admin dashboard, and analytics.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Setup Instructions](#setup-instructions)
4. [Environment Variables](#environment-variables)
5. [Run](#run)
6. [Project Structure](#project-structure)
7. [Components & Pages](#components--pages)
8. [API Integration](#api-integration)
9. [Deployment](#deployment)
10. [Development Workflow](#development-workflow)

---

## Features

- **Authentication**: Login/register as researcher or participant; JWT token-based sessions.
- **Researcher Dashboard**: View, create, and manage experiments; co-researchers; participations.
- **Participant Dashboard**: Browse and join experiments; view participations; daily logs; recommendations.
- **Experiments**: Create, edit, delete experiments; wallet management; participant tracking.
- **Community**: Create posts with polls; like, comment, save, share; search and filtering; AI-powered tagging.
- **Admin Dashboard**: User/researcher management; approve/reject; analytics; PDF/CSV export.
- **Fund Requests**: Create fund top-up requests; admin approval; contribution tracking.
- **Payments**: Mock payment gateway; transaction history.
- **Session Management**: Protected routes; auto-login on refresh; token expiry handling.
- **Responsive UI**: Mobile-first design with Tailwind CSS + DaisyUI.
- **Error Handling**: User-friendly error messages; retry buttons; validation feedback.

---

## Tech Stack

| Layer      | Technology                          |
|------------|------------------------------------|
| Framework  | React 19+ (Hooks, Context)         |
| Build Tool | Vite 7+                            |
| Styling    | Tailwind CSS 3.4 + DaisyUI 4.12    |
| HTTP       | Axios                              |
| Router     | React Router DOM 7+                |
| Icons      | Lucide React                       |
| Charts     | Recharts (analytics)                |
| PDF Export | jsPDF + jsPDF-AutoTable            |

---

## Setup Instructions

### Step 1: Prerequisites

- **Node.js** v18+ (LTS recommended)
- **npm** (comes with Node.js)
- **Backend API** running on `http://localhost:5000` (or configured `VITE_API_BASE_URL`)

### Step 2: Clone and enter frontend

```bash
git clone <repository-url>
cd HealthLab/frontend
```

### Step 3: Install dependencies

```bash
npm install --legacy-peer-deps
```

(The `--legacy-peer-deps` flag is needed due to React 19 compatibility with some dependencies like Recharts.)

### Step 4: Environment configuration

Create a `.env` file in the `frontend` folder:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:5000/api

# (Optional) Analytics, feature flags, etc.
# VITE_GTAG_ID=...
```

### Step 5: Verify backend is running

Ensure the backend is running:

```bash
curl http://localhost:5000/health
```

Expected response: `{ "status": "ok", ... }`

### Step 6: Start development server

```bash
npm run dev
```

Open `http://localhost:5174` (or shown port) in your browser.

---

## Environment Variables

| Variable             | Required | Description               | Example                  |
|-------------------|----------|---------------------------|--------------------------|
| VITE_API_BASE_URL  | No       | Backend API base URL      | `http://localhost:5000/api` or `https://api.healthlab.com` |

---

## Run

| Command        | Description                        |
|----------------|------------------------------------|
| `npm run dev`  | Start dev server (HMR enabled)     |
| `npm run build`| Build production bundle            |
| `npm run preview` | Preview production build locally  |
| `npm run lint` | Run ESLint                         |

---

## Project Structure

```
frontend/
├── public/                    # Static assets (favicon, fonts, etc.)
├── src/
│   ├── api/                  # API integration layer
│   │   ├── api.js              # Axios instance + interceptors
│   │   ├── auth.js             # Auth endpoints
│   │   ├── posts.js            # Community posts endpoints
│   │   ├── experiments.js       # Experiment endpoints
│   │   ├── admin.js            # Admin endpoints
│   │   └── ...
│   ├── components/           # Reusable UI components
│   │   ├── ui/                 # Base components (Button, Card, Modal, Input, etc.)
│   │   ├── PostCard.jsx        # Post display component
│   │   ├── ExperimentCard.jsx  # Experiment card
│   │   └── ...
│   ├── pages/                # Page components (full screens)
│   │   ├── Community.jsx       # Community feed page
│   │   ├── AdminDashboard.jsx  # Admin panel
│   │   ├── Dashboard.jsx       # User dashboard
│   │   ├── Login.jsx           # Login page
│   │   └── ...
│   ├── styles/               # Global styles
│   │   ├── globals.css         # Tailwind imports + global styles
│   │   └── ...
│   ├── App.jsx               # Root component + router setup
│   ├── main.jsx              # Entry point
│   └── index.css             # Main CSS
├── .env                       # Environment variables (not in repo)
├── .gitignore                # Git ignore rules
├── vite.config.js            # Vite configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── postcss.config.js         # PostCSS configuration
└── package.json              # Dependencies
```

---

## Components & Pages

### Pages

| Page                  | Route              | Auth Required | Description                            |
|-----------------------|--------------------|---------------|----------------------------------------|
| **Login**             | `/login`           | No            | Sign in with email + password          |
| **Researcher Register**| `/register`        | No            | Researcher registration form           |
| **Participant Register**| `/register/participant` | No      | Participant registration               |
| **Dashboard**         | `/dashboard`       | Yes           | User home (researcher/participant home) |
| **Experiments**       | `/experiments`     | Optional      | Browse all experiments                 |
| **Experiment Detail** | `/experiments/:id` | Optional      | Single experiment view                 |
| **Create Experiment** | `/experiments/new` | Researcher    | Create new experiment                  |
| **Community**         | `/community`       | Yes           | Social feed with posts, polls          |
| **Admin Dashboard**   | `/admin`           | Admin         | User/researcher/analytics management  |
| **Profile**           | `/profile`         | Yes           | User profile settings                  |

### Key Components

- **Button**: Customizable button with variants (primary, secondary, ghost), sizes
- **Card**: Container with border and shadow
- **Modal**: Dialog overlay for forms and confirmations
- **Input**: Text input with label and validation feedback
- **Textarea**: Multi-line input for content
- **PostCardSkeleton**: Loading placeholder for posts
- **EmptyState**: No data message with icon and CTA
- **ErrorMessage**: Error alert with dismiss button

---

## API Integration

### Authentication

1. **Login** → Receive `user` object + `token`
2. **Store token** → Save in `localStorage` as `"token"`
3. **Store user** → Save in `localStorage` as `"user"` (JSON stringified)
4. **Auto-attach token** → Axios interceptor adds `Authorization: Bearer <token>` to all requests
5. **Token expiry** → If 401 received, clear token and redirect to login

### API Calls

All API calls use the `api` instance from `src/api/api.js`:

```javascript
// Example: Get posts
const { data } = await getPosts({ sort: 'latest', page: 1, limit: 10 });
// Response: { success: true, posts: [...], pagination: { total, page, totalPages, ... } }

// Example: Create post
const { data } = await createPost({ title, content, tags, imageFile });
// Response: { success: true, post: {...} }
```

### Error Handling

- API errors (4xx, 5xx) trigger error state → displayed in UI
- Validation errors: `err.response.data.message` shown to user
- Network errors: Fallback message "Failed to load..."
- Retry: Action buttons allow users to retry failed operations

---

## Deployment

### Production Build

```bash
cd frontend
npm run build
```

Creates optimized bundle in `dist/` folder.

### Static Host Deployment (Vercel, Netlify)

1. Connect GitHub repo
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Set environment variable: `VITE_API_BASE_URL=https://api.healthlab.com`
5. Deploy (auto on push)

### Web Server Deployment

#### Nginx Configuration

```nginx
server {
  listen 443 ssl http2;
  server_name healthlab.com;
  
  # SSL certificates
  ssl_certificate /etc/letsencrypt/live/healthlab.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/healthlab.com/privkey.pem;
  
  # Frontend static files
  root /var/www/healthlab-frontend;
  index index.html;
  
  # SPA routing: redirect 404s to index.html
  location / {
    try_files $uri $uri/ /index.html;
  }
  
  # API proxy
  location /api/ {
    proxy_pass https://api.healthlab.com;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  
  # Cache static assets
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 365d;
    add_header Cache-Control "public, immutable";
  }
  
  # Security headers
  add_header X-Frame-Options "SAMEORIGIN";
  add_header X-Content-Type-Options "nosniff";
  add_header X-XSS-Protection "1; mode=block";
  add_header Referrer-Policy "strict-origin-when-cross-origin";
}
```

#### Deploy Steps

1. **Build**:
   ```bash
   npm run build
   ```

2. **Copy to server**:
   ```bash
   scp -r dist/* user@server:/var/www/healthlab-frontend/
   ```

3. **Restart Nginx**:
   ```bash
   sudo systemctl restart nginx
   ```

---

## Development Workflow

### Local Development

1. **Start backend** → `npm run dev` in `backend/`
2. **Start frontend** → `npm run dev` in `frontend/`
3. **Open browser** → `http://localhost:5174`

### Branching Strategy

- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches

### Commit Conventions

```
feat: add pagination to community feed
fix: resolve token expiry redirect issue
docs: update README with deployment steps
refactor: simplify API integration layer
test: add unit tests for auth
```

### Code Quality

- **Linting**: `npm run lint` (ESLint)
- **Formatting**: Use Prettier (optional)
- **Testing**: Component tests with Vitest (optional setup)

### Common Tasks

**Add a new page**:
```
1. Create file: src/pages/MyPage.jsx
2. Import in App.jsx
3. Add route: <Route path="/my-page" element={<MyPage />} />
4. Protect if needed: wrap with <ProtectedRoute>
```

**Add a new API endpoint**:
```
1. Create function in src/api/{feature}.js
2. Use api instance: api.get(), api.post()
3. Import and call in component
4. Handle response + error states
```

**Create a reusable component**:
```
1. Create file: src/components/{ComponentName}.jsx
2. Accept props (data, handlers)
3. Return JSX with Tailwind classes
4. Export default and import where needed
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot find module" | Run `npm install --legacy-peer-deps` |
| 404 errors on reload | Ensure Nginx `try_files` configured to redirect to index.html |
| CORS errors | Backend must have matching `Access-Control-Allow-Origin` header |
| White screen after deploy | Check browser console for errors; verify `VITE_API_BASE_URL` |
| Slow load | Run `npm run build` to optimize; check API response times |

---

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile: iOS Safari 12+, Chrome Android

---

## License

Proprietary — SLIIT
