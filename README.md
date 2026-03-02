<h1 align="center">
  🌾 ServeStream
  <br/>
  <sub>Centralized IVR-Enabled Ration Distribution Management System</sub>
</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black"/>
  <img src="https://img.shields.io/badge/PostgreSQL-15%2B-4169E1?style=for-the-badge&logo=postgresql&logoColor=white"/>
  <img src="https://img.shields.io/badge/Twilio-IVR%20%26%20SMS-F22F46?style=for-the-badge&logo=twilio&logoColor=white"/>
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white"/>
</p>

<p align="center">
  A full-stack web application that digitizes and automates the Tamil Nadu Public Distribution System (PDS) — enabling beneficiaries to book ration tokens via IVR phone calls, while administrators manage shops, stock, and beneficiaries through a secure web dashboard.
</p>

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Features](#-features)
- [System Architecture](#-system-architecture)
- [Project Workflow](#-project-workflow)
- [Technology Stack](#-technology-stack)
- [Database Schema](#-database-schema)
- [Folder Structure](#-folder-structure)
- [API Reference](#-api-reference)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [User Roles & Access Control](#-user-roles--access-control)

---

## ❗ Problem Statement

The traditional Public Distribution System (PDS) in Tamil Nadu faces critical inefficiencies:

| Problem | Impact |
|---|---|
| 📍 Long physical queues at ration shops | Beneficiaries wait hours; elderly/disabled cannot attend |
| 📄 Manual paper-based token systems | Error-prone, no real-time tracking, prone to fraud |
| 📦 Poor stock visibility | Over-distribution or under-distribution of commodities |
| 🔒 No audit trail | Corruption and ghost beneficiary abuse |
| 📱 No digital access for beneficiaries | Low-income families lack smartphones but have basic phones |

**ServeStream** solves all of these by providing:
- **IVR (Interactive Voice Response)** — beneficiaries book tokens with a simple phone call (no smartphone needed)
- **SMS confirmations** via Twilio — instant booking confirmation to the beneficiary
- **Admin web dashboard** — complete digital management of shops, stock, and bookings
- **Immutable audit logs** — full trail of every action in the system
- **Role-Based Access Control** — different access levels for state admin, district admin, shop operator, and auditor

---

## ✨ Features

### 👥 For Beneficiaries
- 📞 **IVR Token Booking** — Call the shop's dedicated IVR number → enter ration card number via keypad → get a queue token instantly
- 📲 **SMS Confirmation** — Receive booking confirmation with token number, queue position, and shop details via SMS
- 🤖 **Chatbot Booking** — Alternative channel to book, check status, or cancel tokens via a chat interface
- ✅ **Duplicate Prevention** — System ensures only one active token per ration card at a time

### 🛠️ For Administrators
- 📊 **Dashboard** — Real-time stats: active tokens today, total beneficiaries, stock levels, IVR call counts
- 🏪 **Ration Shop Management** — Add/edit shops with unique IVR phone numbers, operators, and GPS coordinates
- 👨‍👩‍👧 **Ration Card Management** — Register beneficiaries with family member details, card type (AAY/PHH/NPHH), and mobile numbers
- 📦 **Stock Management** — Track monthly commodity allocation, distribution, and remaining stock per shop
- 🎫 **Token Management** — View, confirm, and mark tokens as collected or cancelled
- 📞 **IVR Call Logs** — Full log of every IVR call: caller, card used, action taken, success/failure
- 📋 **Audit Logs** — Immutable log of every system action with user, IP, and timestamp
- 👤 **User Management** — Create and manage admin users with specific roles and shop assignments

### 🔒 Security Features
- JWT-based authentication with configurable expiry
- bcrypt password hashing
- Rate limiting (100 requests / 15 minutes per IP)
- Helmet.js security headers
- Role-Based Access Control (RBAC) on every API endpoint

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          SERVESTREAM SYSTEM                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   BENEFICIARY CHANNELS              ADMIN CHANNELS                      │
│   ─────────────────────             ──────────────────────              │
│                                                                         │
│   📞 Phone Call ───────────┐        🌐 Web Browser ─────────┐           │
│   📱 SMS (Twilio) ◄────────┤        🔐 Admin Login ◄────────┤           │
│   💬 Chatbot ──────────────┤        📊 Dashboard ◄──────────┤           │
│                            │                                │           │
│                            ▼                                ▼           │
│              ┌─────────────────────────────────────────────┐            │
│              │         REACT FRONTEND (Vite + React 18)    │            │
│              │         Port: 5173  (dev)                   │            │
│              │                                             │            │
│              │  Pages: Login | Dashboard | Ration Cards    │            │
│              │         Tokens | Shops | Stock | Users      │            │
│              │         IVR Logs | Audit Logs | Chatbot     │            │
│              └───────────────────┬─────────────────────────┘            │
│                                  │ HTTP/REST (JWT Auth)                  │
│                                  ▼                                       │
│              ┌─────────────────────────────────────────────┐            │
│              │      EXPRESS.JS BACKEND API (Node.js)       │            │
│              │      Port: 5000                             │            │
│              │                                             │            │
│              │  Middleware: Helmet | CORS | Rate Limit     │            │
│              │             Morgan (logging) | Auth JWT     │            │
│              │                                             │            │
│              │  Routes: /api/auth  /api/tokens             │            │
│              │          /api/ivr   /api/ration-cards       │            │
│              │          /api/shop-stock  /api/users        │            │
│              │          /api/audit-logs /api/chatbot       │            │
│              └──────────┬────────────────────┬────────────┘            │
│                         │                    │                          │
│                         ▼                    ▼                          │
│              ┌───────────────────┐  ┌─────────────────────┐            │
│              │  PostgreSQL DB    │  │  Twilio API          │            │
│              │  (Local / Cloud)  │  │  • IVR (TwiML)       │            │
│              │                   │  │  • SMS Notifications │            │
│              │  Tables: 12+      │  └─────────────────────┘            │
│              │  Views: 2         │                                       │
│              │  Functions: 2     │                                       │
│              └───────────────────┘                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Project Workflow

### 1️⃣ Beneficiary Token Booking via IVR

```
Beneficiary calls IVR number
        │
        ▼
Twilio receives call → sends webhook to /api/ivr/incoming
        │
        ▼
System identifies shop from IVR phone number
        │
        ▼
TwiML prompts: "Press 1 to Book Token, Press 2 to Check Status"
        │
  ┌─────┴─────┐
  ▼           ▼
Book Token  Check Status
  │
  ▼
"Enter your 10-digit ration card number"
  │
  ▼
System validates:
  → Card exists?
  → Card linked to this shop?
  → Already has active token? (duplicate prevention)
  → Stock available?
  │
  ┌──────────┴──────────┐
  ▼                     ▼
SUCCESS               FAILURE
  │                     │
  ▼                     ▼
Token created         TTS error message
Queue number assigned played to caller
  │
  ▼
SMS sent to beneficiary's mobile:
"Your token TKN-CHN-001-20260302-0023 (Queue #23)
 is booked at Chennai Shop 1. Collect by 5PM."
  │
  ▼
IVR call log recorded in DB
```

### 2️⃣ Admin Dashboard Workflow

```
Admin Login (email + password)
        │
        ▼
JWT Token issued → stored in browser localStorage
        │
        ▼
Role-based dashboard loads:
  super_admin     → All data (all districts/shops)
  district_admin  → Own district data only
  shop_operator   → Own shop data only
  auditor         → Read-only all data
        │
        ▼
Admin can:
  ┌──────────────────────────────────────────┐
  │  • View/manage ration cards              │
  │  • Monitor token bookings (today/all)    │
  │  • Confirm or mark tokens collected      │
  │  • Update monthly stock allocation       │
  │  • View IVR call logs                    │
  │  • View full audit trail                 │
  │  • Add/deactivate user accounts          │
  └──────────────────────────────────────────┘
        │
        ▼
Every action is logged to audit_logs table (who, what, when, old value, new value)
```

### 3️⃣ Token Lifecycle

```
  [ booked ] ──────────────────────► [ confirmed ] ──► [ collected ]
      │              Shop operator                   Beneficiary shows
      │              reviews token                   up at shop
      │
      └────────────────────────────► [ cancelled ]
                  Beneficiary                          (frees up slot
                  or admin cancels                      for re-booking)

      Auto-expiry: token → [ expired ] if not collected within the day
```

---

## 🧰 Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18 + Vite 6 | Admin SPA, fast hot-module reload |
| **Routing** | React Router v6 | Client-side navigation |
| **Styling** | Tailwind CSS v3 | Utility-first responsive UI |
| **Charts** | Chart.js + react-chartjs-2 | Dashboard analytics |
| **Backend** | Node.js + Express.js | REST API server |
| **Auth** | JWT + bcryptjs | Stateless authentication |
| **Database** | PostgreSQL 15+ | Relational data with UUID PKs |
| **IVR** | Twilio (TwiML) | Phone-based token booking |
| **SMS** | Twilio SMS API | Booking confirmation messages |
| **Security** | Helmet + express-rate-limit | HTTP security headers, rate limiting |
| **Validation** | Joi | Request schema validation |
| **Logging** | Morgan | HTTP request logging |

---

## 🗄️ Database Schema

The database follows a **geographic hierarchy**: `Districts → Taluks → Ration Shops → Ration Cards → Tokens`

```
districts
    │
    └──► taluks
              │
              └──► ration_shops  ◄── ivr_phone_number (unique per shop)
                        │
                        ├──► ration_cards ──► family_members
                        │         │
                        │         └──► tokens ──► token_items
                        │                   │
                        │                   └──► ivr_call_logs
                        │
                        └──► shop_stock (commodity, month, year, qty)

users ──► (linked to shop_id or district_id via role)
audit_logs ──► (linked to any entity, immutable)
```

### Key Tables

| Table | Description |
|---|---|
| `districts` | 38 Tamil Nadu districts |
| `taluks` | Sub-districts within each district |
| `ration_shops` | Fair Price Shops with unique IVR phone number |
| `ration_cards` | Beneficiary cards (AAY / PHH / NPHH / AY types) |
| `family_members` | Members listed under each ration card |
| `commodities` | Items distributed: Rice, Wheat, Sugar, Dal, Oil, etc. |
| `shop_stock` | Monthly allocation & distribution per shop per commodity |
| `tokens` | Booking tokens with queue number and lifecycle status |
| `token_items` | Line-item commodities per token with entitled quantity |
| `users` | Admin users with role-based access |
| `ivr_call_logs` | Full record of every IVR interaction |
| `audit_logs` | Immutable trail of every data change |

### Token Status Lifecycle

| Status | Meaning |
|---|---|
| `booked` | Token created via IVR, admin, mobile, or chatbot |
| `confirmed` | Shop operator confirmed the booking |
| `collected` | Beneficiary physically collected the ration |
| `cancelled` | Cancelled by beneficiary or admin |
| `expired` | Not collected within the valid period |

### Card Types (Tamil Nadu PDS)

| Type | Full Name | Category |
|---|---|---|
| `AAY` | Antyodaya Anna Yojana | Poorest of the poor |
| `PHH` | Priority Household | Below poverty line |
| `NPHH` | Non-Priority Household | Above poverty line |
| `AY` | Annapurna Yojana | Senior citizens |

---

## 📁 Folder Structure

```
servestream/
│
├── 📄 .gitignore                      # Excludes .env, node_modules, etc.
├── 📄 README.md                       # This file
├── 📄 package.json                    # Root-level scripts
│
├── 🗂️ backend/                        # Node.js Express API Server
│   ├── 📄 server.js                   # Entry point — Express app setup
│   ├── 📄 schema.sql                  # Full PostgreSQL database schema
│   ├── 📄 seed.js                     # Basic seed data
│   ├── 📄 seed_tn_data.js             # Tamil Nadu district/shop seed data
│   ├── 📄 .env.example                # Environment variable template
│   │
│   ├── 📁 config/
│   │   ├── database.js                # PostgreSQL connection pool (pg)
│   │   └── env.js                     # Validated environment config
│   │
│   ├── 📁 controllers/                # Request handlers (business logic)
│   │   ├── auth.controller.js         # Login, register, JWT
│   │   ├── token.controller.js        # Book, confirm, collect, cancel tokens
│   │   ├── rationCard.controller.js   # CRUD for ration cards
│   │   ├── rationShop.controller.js   # CRUD for shops
│   │   ├── shopStock.controller.js    # Stock allocation & updates
│   │   ├── commodity.controller.js    # Commodity master CRUD
│   │   ├── district.controller.js     # District/taluk data
│   │   ├── user.controller.js         # User management
│   │   ├── ivr.controller.js          # Twilio IVR webhook handler
│   │   ├── audit.controller.js        # Audit log queries
│   │   └── chatbot.controller.js      # Chatbot booking API
│   │
│   ├── 📁 routes/                     # Express route definitions
│   │   ├── auth.routes.js             # POST /api/auth/login|register
│   │   ├── token.routes.js            # GET|POST /api/tokens
│   │   ├── rationCard.routes.js       # CRUD /api/ration-cards
│   │   ├── rationShop.routes.js       # CRUD /api/ration-shops
│   │   ├── shopStock.routes.js        # GET|PUT /api/shop-stock
│   │   ├── commodity.routes.js        # CRUD /api/commodities
│   │   ├── district.routes.js         # GET /api/districts
│   │   ├── user.routes.js             # CRUD /api/users
│   │   ├── ivr.routes.js              # POST /api/ivr/incoming
│   │   ├── audit.routes.js            # GET /api/audit-logs
│   │   └── chatbot.routes.js          # POST /api/chatbot/*
│   │
│   ├── 📁 middleware/
│   │   ├── auth.js                    # JWT verification middleware
│   │   ├── rbac.js                    # Role-based access control
│   │   ├── auditLogger.js             # Auto-logs state-changing actions
│   │   ├── validateRequest.js         # Joi schema validation
│   │   └── errorHandler.js            # Global error handler
│   │
│   ├── 📁 services/
│   │   ├── token.service.js           # Token booking business logic
│   │   ├── sms.service.js             # Twilio SMS sending
│   │   ├── ivr.service.js             # TwiML XML generation
│   │   ├── stock.service.js           # Stock update logic
│   │   └── audit.service.js           # Audit log insertion
│   │
│   └── 📁 utils/
│       ├── errors.js                  # Custom error classes (AppError, etc.)
│       ├── helpers.js                 # Shared utility functions
│       └── response.js                # Standardized API response format
│
└── 🗂️ frontend/                       # React 18 + Vite SPA
    ├── 📄 index.html                  # HTML entry point
    ├── 📄 vite.config.js              # Vite configuration (API proxy)
    ├── 📄 tailwind.config.js          # Tailwind CSS configuration
    │
    └── 📁 src/
        ├── 📄 main.jsx                # React DOM entry point
        ├── 📄 App.jsx                 # Router setup + protected routes
        ├── 📄 index.css               # Global styles + Tailwind imports
        │
        ├── 📁 context/
        │   └── AuthContext.jsx        # Global auth state (JWT, user info)
        │
        ├── 📁 services/
        │   └── api.js                 # Axios instance with JWT interceptor
        │
        ├── 📁 components/             # Reusable UI components
        │   ├── Layout.jsx             # App shell with sidebar + topbar
        │   ├── Sidebar.jsx            # Navigation sidebar
        │   ├── Modal.jsx              # Generic modal wrapper
        │   ├── DataTable.jsx          # Sortable/paginated data table
        │   ├── StatsCard.jsx          # KPI stat card for dashboard
        │   ├── ProtectedRoute.jsx     # Route guard (auth + role check)
        │   └── ChatWidget.jsx         # Chatbot UI widget
        │
        └── 📁 pages/                  # Full page views
            ├── Login.jsx              # Admin login page
            ├── Dashboard.jsx          # Stats overview + charts
            ├── RationCards.jsx        # Beneficiary card management
            ├── RationShops.jsx        # Shop management
            ├── Tokens.jsx             # Token list + actions
            ├── StockManagement.jsx    # Monthly stock per commodity
            ├── Users.jsx              # Admin user management
            ├── IVRCallLogs.jsx        # IVR call history
            ├── AuditLogs.jsx          # Full audit trail
            ├── UserLogin.jsx          # Beneficiary login (mobile booking)
            ├── UserDashboard.jsx      # Beneficiary self-service dashboard
            └── UserBooking.jsx        # Mobile ration booking page
```

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/login` | Admin login, returns JWT | Public |
| POST | `/api/auth/register` | Register new admin user | Super Admin |
| GET | `/api/auth/me` | Get current user info | JWT |

### Tokens
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/tokens` | List all tokens (filterable) | JWT |
| POST | `/api/tokens/book` | Book a new token | JWT / IVR |
| PATCH | `/api/tokens/:id/confirm` | Confirm a token | Shop Operator |
| PATCH | `/api/tokens/:id/collect` | Mark as collected | Shop Operator |
| PATCH | `/api/tokens/:id/cancel` | Cancel a token | JWT |

### IVR
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/ivr/incoming` | Twilio webhook (call received) | Public (Twilio) |
| GET | `/api/ivr/call-logs` | List IVR call logs | JWT |

### Ration Cards
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/ration-cards` | List all cards | JWT |
| POST | `/api/ration-cards` | Create new card | District Admin+ |
| PUT | `/api/ration-cards/:id` | Update card | District Admin+ |
| DELETE | `/api/ration-cards/:id` | Deactivate card | Super Admin |

### Chatbot
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/chatbot/card-details` | Get card info by number | Public |
| POST | `/api/chatbot/book` | Book token via chatbot | Public |
| POST | `/api/chatbot/status` | Check token status | Public |

### Other
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Server + DB health check |
| GET | `/api/districts` | All districts |
| GET | `/api/ration-shops` | All shops |
| GET | `/api/commodities` | All commodities |
| GET | `/api/shop-stock` | Stock per shop |
| GET | `/api/users` | All system users |
| GET | `/api/audit-logs` | Full audit trail |

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:
- [Node.js](https://nodejs.org/) v18 or higher
- [PostgreSQL](https://www.postgresql.org/) v15 or higher
- A [Twilio](https://www.twilio.com/) account (for IVR + SMS features)
- Git

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/Rithanya2345/ServeStream.git
cd ServeStream
```

---

### Step 2 — Setup the Database

1. Open **pgAdmin** or **psql** and create a new database:
   ```sql
   CREATE DATABASE ration_db;
   ```

2. Run the schema file to create all tables, functions, and seed data:
   ```bash
   psql -U postgres -d ration_db -f backend/schema.sql
   ```

3. *(Optional)* Seed Tamil Nadu ration shop data:
   ```bash
   cd backend
   node seed_tn_data.js
   ```

4. Create the first super admin user:
   ```bash
   node create_admin.js
   ```

---

### Step 3 — Configure Environment Variables

```bash
cd backend
copy .env.example .env
```

Edit `backend/.env` with your actual values (see [Environment Variables](#-environment-variables) section below).

---

### Step 4 — Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

### Step 5 — Start the Application

Open **two terminal windows**:

**Terminal 1 — Start Backend API:**
```bash
cd backend
npm run dev
```
> Backend API will run at: **http://localhost:5000**

**Terminal 2 — Start Frontend:**
```bash
cd frontend
npm run dev
```
> Frontend will run at: **http://localhost:5173**

---

### Step 6 — Access the Application

| Interface | URL | Credentials |
|---|---|---|
| **Admin Dashboard** | http://localhost:5173 | Email + password set in `create_admin.js` |
| **API Health Check** | http://localhost:5000/api/health | - |
| **Beneficiary Portal** | http://localhost:5173/user-login | Ration card number |

---

## 🔧 Environment Variables

Create `backend/.env` using the template below (`backend/.env.example`):

```env
# ─── Server ───
PORT=5000
NODE_ENV=development

# ─── PostgreSQL Database ───
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/ration_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ration_db
DB_USER=postgres
DB_PASSWORD=your_password

# ─── JWT Authentication ───
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=24h

# ─── CORS ───
CORS_ORIGIN=http://localhost:5173

# ─── Rate Limiting ───
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# ─── Twilio (IVR + SMS) ───
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

> ⚠️ **Never commit your `.env` file to GitHub.** It is already in `.gitignore`.

---

## 👤 User Roles & Access Control

| Role | Access |
|---|---|
| `super_admin` | Full access to all data across all districts and shops |
| `district_admin` | Access to shops and data within their assigned district |
| `shop_operator` | Can manage bookings and stock only for their assigned shop |
| `auditor` | Read-only access to all data + audit logs |

---

## 📜 License

This project is developed as part of an academic final year project for Tamil Nadu's Public Distribution System modernisation.

---

<p align="center">
  Built with ❤️ for Tamil Nadu's Public Distribution System
  <br/>
  <strong>ServeStream</strong> — Serving Every Household, Every Month.
</p>