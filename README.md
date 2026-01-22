# AssetOps — Equipment Management & Operations Platform

AssetOps is a **production-grade equipment and operations management platform** built with **Next.js 14 (App Router)** and **Firebase**, designed to mirror how **real-world operations, maintenance, and asset teams** manage physical assets at scale.

This project emphasizes **enterprise frontend architecture**, **data consistency**, **auditability**, and **decision-oriented dashboards**, making it suitable both as a **portfolio-grade system** and as a foundation for real SaaS products.

---

## 🚀 Live Demo

- **Production URL:**  
  https://equipment-dashboard-three.vercel.app/

- **Repository:**  
  https://github.com/EduardoVisconti/equipment-dashboard

---

## 🔑 Demo Access

A public demo account is available.

- **Email:** `client@test.com`
- **Password:** `123456`

> Demo data is non-sensitive and may be reset at any time.

---

## 🧱 Tech Stack

### Frontend

- Next.js 14 (App Router)
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- lucide-react
- Recharts

### State & Data

- TanStack React Query (server-state management)
- React Hook Form
- Zod (schema validation)

### Backend / Services

- Firebase Firestore
- Firebase Authentication (Email / Password)

### Tooling

- Vercel (Deployment)
- ESLint / Prettier
- Conventional Commits

---

## 🧠 Product Scope

AssetOps allows teams to:

- Register and manage physical assets
- Track operational status and lifecycle
- Manage preventive and corrective maintenance
- Detect overdue and upcoming service events
- Analyze operational health and trends
- Maintain full audit trails
- Enforce role-based access (admin / viewer)
- Archive assets without breaking historical data

---

## ✨ Core Features

### 🔐 Authentication & Roles

- Firebase Email/Password authentication
- Protected routes via Next.js route groups
- Role-based access:
  - **Admin:** full write access
  - **Viewer:** read-only
- UI permissions enforced client-side
- Designed for Firestore Rules enforcement

---

### 🧰 Equipment Management

- Create, edit, archive, and restore assets
- Enterprise-safe handling of archived records
- Serial number uniqueness validation
- Automatic maintenance interval calculations
- Audit metadata on all writes

**Tracked fields include:**

- Name
- Serial number
- Status (active / maintenance / inactive)
- Purchase date
- Last service date
- Next service date (stored or derived)
- Service interval (days)
- Archive metadata
- Audit fields (createdBy / updatedBy)

---

### 🛠 Maintenance History

- Preventive and corrective maintenance records
- Subcollection-based model
- Automatic updates to:
  - lastServiceDate
  - nextServiceDate
- Event logged to activity feed on each maintenance entry
- Admin-only write access

---

### 📊 Dashboard

A real-time operational overview focused on **actionability**:

- Total assets
- Status distribution
- Overdue maintenance
- Maintenance due in 7 / 30 days
- Data quality indicators
- Assets requiring attention
- Recent activity feed

All metrics are derived from live Firestore data.

---

### 📈 Analytics

Analytics are intentionally separated from the dashboard.

Tabs:

- **Overview**
- **Maintenance**
- **Trends**

Capabilities:

- Status distribution
- Maintenance trends
- Asset creation over time
- Overdue vs upcoming service detection
- Time-range and status filters

---

### 📋 Equipment Table (Enterprise-grade)

- Saved Views (persisted via localStorage):
  - Operational
  - Maintenance Focus
  - Archived
- Persistent filters:
  - Search
  - Status
  - Sort
  - Include archived
- Operational sorting strategies
- Next Service column with urgency badges
- Admin-only contextual actions

---

## 🗂️ Data Architecture

### Firestore Structure

```
equipments/
 ├─ {equipmentId}
 │   ├─ fields...
 │   ├─ maintenance/
 │   │   ├─ {maintenanceId}
 │   ├─ events/
 │   │   ├─ {eventId}
```

### Key Design Rules

- Archived items are filtered client-side
- `archivedAt == null` is never used in Firestore queries
- Dates stored as `yyyy-MM-dd` strings
- Derived values always have safe fallbacks

---

## 🧠 Architectural Decisions

- Clear separation between **operational dashboards** and **analytics**
- React Query as the single source of server truth
- No hidden business logic in UI components
- Predictable query keys and invalidation
- Avoided premature abstraction layers
- Enterprise-oriented data consistency rules

---

## 🧪 Running Locally

```bash
git clone https://github.com/EduardoVisconti/equipment-dashboard
cd equipment-dashboard
npm install
npm run dev
```

Create a `.env.local` file with your Firebase credentials.

---

## 🏁 Project Status

- Feature complete
- Production-ready demo
- Enterprise-grade architecture
- No known bugs

---

## 👨‍💻 Author

**Eduardo Visconti**  
Frontend Developer  
Focused on scalable React systems, UX-driven products, and real-world frontend architecture.
