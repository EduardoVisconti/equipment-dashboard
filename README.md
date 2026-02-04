# 🏭 AssetOps — Equipment Management System

> A production-ready asset tracking platform with maintenance scheduling, role-based access control, and comprehensive audit logging.

**🔗 Live Demo:** [asset-ops.vercel.app](https://asset-ops.vercel.app/login)
**📧 Demo Login:** `client@test.com` / `123456`

---

## 📸 Screenshots

**Dashboard Overview**
![Dashboard](./screenshots/login-dashboard.gif)

**Equipment Management**
![Equipment](./screenshots/equipment.gif)

**Maintenance Tracking**
![Maintenance](./screenshots/maintenance.gif)

**Analytics Page**
![Analytics](./screenshots/analytics.gif)

---

## 🎯 The Problem

Companies managing physical assets (machinery, tools, equipment) need to:

- Track equipment status and location
- Schedule and log maintenance activities
- Maintain compliance with audit trails
- Prevent equipment downtime through proactive maintenance
- Control access based on user roles

AssetOps solves these challenges with a scalable, secure solution.

---

## ✨ Key Features

### 📊 Asset Management

- Complete equipment lifecycle tracking
- Status monitoring (Active, Inactive, Under Maintenance)
- Automatic maintenance scheduling based on service intervals
- Real-time equipment availability tracking

### 🔧 Maintenance System

- Scheduled maintenance tracking
- Service history with detailed logs
- Overdue maintenance alerts
- Automatic next service date calculation

### 🔐 Security & Permissions

- Role-based access control (Admin/Viewer)
- Firestore security rules enforcement
- Protected routes and actions
- Secure authentication flow

### 📈 Analytics & Reporting

- Equipment status dashboard
- Maintenance trends visualization
- Data quality metrics
- Overdue equipment tracking

### 🗂️ Audit Trail

- Complete event logging
- User action tracking
- Immutable historical records
- Compliance-ready data retention

---

## 🛠️ Tech Stack

### Frontend

- **React 18** — UI framework
- **TypeScript** — Type safety
- **Tailwind CSS** — Styling
- **shadcn/ui** — Component library
- **React Hook Form** — Form management
- **Zod** — Schema validation
- **React Query** — Server state management
- **Recharts** — Data visualization

### Backend & Database

- **Firebase Authentication** — User management
- **Firestore** — NoSQL database
- **Firestore Security Rules** — Backend authorization

### DevOps

- **Vercel** — Deployment & hosting
- **Git/GitHub** — Version control
- **ESLint** — Code quality

---

## 🏗️ Architecture Highlights

### Data Model Design

```
Equipment (Current State)
├── Basic Info (name, type, status)
├── Maintenance Dates (last, next)
└── Subcollections
    ├── Maintenance Records (historical, immutable)
    └── Events (audit trail, immutable)
```

**Key Concept:** Separation of current state vs. historical data

- Equipment collection: mutable current state
- Subcollections: immutable historical records

### Smart Date Calculation

```typescript
nextServiceDate = lastServiceDate + serviceIntervalDays;
```

- No manual input required
- Automatic overdue detection
- Prevents human error

### Security Architecture

- **Frontend:** UI-level role checks
- **Backend:** Firestore Rules enforcement
- Even if frontend is bypassed, rules block unauthorized actions

---

## 📦 Installation & Setup

```bash
# Clone repository
git clone https://github.com/EduardoVisconti/AssetOps.git
cd AssetOps

# Install dependencies
npm install

# Set up environment variables
# Create .env file with:
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Run development server
npm run dev
```

---

## 🎮 Usage

### Demo Accounts

- **Admin:** `admin@test.com` / `123456`
- **Viewer:** `client@test.com` / `123456`

### Key Workflows

**1. Create Equipment**

- Navigate to Equipment page
- Click "New Equipment"
- Fill required fields (name, type, service interval)
- System automatically calculates first service date

**2. Log Maintenance**

- Select equipment
- Click "Add Maintenance"
- Enter service details
- System updates next service date automatically

**3. Monitor Dashboard**

- View real-time equipment status
- Track overdue maintenance
- Analyze maintenance trends

---

## 🧪 Code Quality

- **Type Safety:** Full TypeScript coverage
- **Validation:** Zod schemas for all forms
- **Error Handling:** Comprehensive error boundaries
- **Code Organization:** Feature-based structure
- **Security:** Backend-enforced authorization

---

## 🚀 Deployment

Deployed on Vercel with automatic deployments from `main` branch.

**Production URL:** https://asset-ops.vercel.app

---

## 📚 What I Learned

This project challenged me to:

- Design scalable database architecture for long-term data
- Implement proper separation between mutable state and immutable history
- Build role-based access control with both frontend and backend enforcement
- Handle complex date calculations for automated scheduling
- Structure React applications for maintainability
- Implement comprehensive form validation with type safety

---

## 🔮 Future Enhancements

- [ ] Export maintenance reports (PDF/Excel)
- [ ] Email notifications for upcoming maintenance
- [ ] Mobile app (React Native)
- [ ] Batch equipment import (CSV)
- [ ] Advanced filtering and search
- [ ] Equipment categories and tags

---

## 👨‍💻 Author

**Eduardo Visconti**

- GitHub: [@EduardoVisconti](https://github.com/EduardoVisconti)
- LinkedIn: [linkedin.com/in/eduardo-visconti](https://linkedin.com/in/eduardo-visconti)
- Email: eduardovisconti11@gmail.com

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

**Built with ❤️ using React, TypeScript, and Firebase**

```

```
