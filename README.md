# Equipment Management Dashboard

A full-stack frontend-focused dashboard built with **Next.js App Router** for managing equipment records.
The application demonstrates CRUD operations, form validation, data fetching with caching, table rendering,
and UI interactions using a modern React stack.

This project was designed as a **technical assessment / learning project**, following real-world frontend
architecture patterns.

---

## 🚀 Tech Stack

- Next.js (App Router)
- TypeScript
- TanStack Query
- TanStack Table
- React Hook Form
- Zod
- Axios
- date-fns
- Zustand
- shadcn/ui
- TailwindCSS

---

## 📌 Features

- View all equipment records in a dynamic table
- Create new equipment
- Edit existing equipment
- View equipment details
- Delete equipment with confirmation dialog
- Form validation with error handling
- Cached data fetching with automatic revalidation
- Date formatting and “last serviced X days ago” calculation
- Clean and reusable component structure

---

## 🧠 Architecture Overview

The project follows a layered architecture to keep responsibilities clear and scalable:

src/
├── app/                # Next.js routes (pages & API)
│   ├── equipment/
│   │   ├── page.tsx
│   │   ├── new/
│   │   ├── [id]/
│   │   └── [id]/edit/
│   └── api/
│       └── equipment/
│           ├── route.ts
│           └── [id]/route.ts
│
├── components/
│   └── equipment/      # UI components (table, form, columns)
│
├── data-access/        # Axios API calls
├── hooks/              # TanStack Query hooks
├── schemas/            # Zod validation schemas
├── types/              # TypeScript models
├── lib/                # Utilities (mock DB, date helpers)
├── stores/             # Zustand store

---

## 🔄 Data Flow

1. User interacts with the UI
2. Custom hooks (TanStack Query) fetch or mutate data
3. Axios communicates with internal API routes
4. API routes interact with a mock in-memory database
5. Cache is invalidated and UI updates automatically

---

## 🧪 Mock Database

This project uses an **in-memory mock database** to simulate backend behavior.

Important notes:
- Data resets when the server restarts
- This is expected behavior
- No real database is used

---

## 📅 Date Handling

Dates coming from form inputs are normalized before formatting to avoid timezone issues.
A shared utility ensures consistency across the application.

---

## 🧩 Forms & Validation

- React Hook Form handles form state
- Zod provides runtime and TypeScript validation
- The same form component is reused for Create and Edit
- Validation occurs before API submission

---

## 🧹 State Management

- TanStack Query handles all server state
- Zustand is used only for small UI preferences
- No unnecessary global state

---

## 🖥️ Running Locally

npm install
npm run dev

Then open:
http://localhost:3000/equipment

---

## ✅ Project Status

✔ CRUD complete  
✔ Validation implemented  
✔ Caching & revalidation working  
✔ UI/UX polished  
✔ Ready for review  

---

## 👤 Author

Built as a learning and technical assessment project to demonstrate modern frontend
development practices using Next.js and the React ecosystem.