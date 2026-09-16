# 🚀 UPNEX — Beyond the Static Resume

> ### **Your Career's Operating System**
>
> **Stop listing your skills. Start proving them.**

UPNEX is an **AI-powered Student Intelligence & Digital Identity Platform** built to transform the traditional resume into a **dynamic, evidence-driven career profile**.

Instead of presenting skills as static claims, UPNEX brings together academic achievements, technical projects, GitHub activity, credentials, and career insights to create a continuously evolving representation of a student's professional growth.

---

## ✨ Key Features

### 🔍 Verifiable Proof-of-Work

Track and showcase real evidence behind your skills and achievements.

* Academic projects and milestones
* Technical skill development
* Repository contributions
* Project achievements
* Transparent progress tracking

> **Skills become more meaningful when they are backed by evidence.**

### 🧠 Digital Student Twin

An AI-driven intelligence layer designed to understand a student's academic and technical journey.

It helps identify:

* Skill gaps
* Career opportunities
* Development areas
* Potential career pathways
* Actionable next steps

### 🌐 Student Network & Portfolio

Build a professional digital identity that goes beyond a traditional PDF resume.

Students can showcase:

* Projects
* Skills
* Achievements
* Academic background
* Technical contributions
* Career interests

### 🔐 Secure Credential Vault

A centralized space for managing academic and professional credentials.

Students can:

* Store certificates and academic records
* Organize career-related documents
* Manage credential information
* Share relevant records
* Track verification status

Uploaded documents initially remain **Pending Review** and are marked **Verified** only after the appropriate verification process.

---

## 🛠️ Technology Stack

| Layer              | Technologies                          |
| ------------------ | ------------------------------------- |
| **Frontend**       | React 19, Vite 6, React Router, Axios |
| **Backend**        | Node.js 20+, Express 5                |
| **Database**       | SQLite                                |
| **ORM**            | Prisma                                |
| **Validation**     | Zod                                   |
| **Authentication** | Email & Password, bcrypt              |
| **OAuth**          | Google OAuth *(optional)*             |

---

## 🏗️ Architecture

UPNEX follows a modern full-stack architecture separating the user interface, API layer, validation, business logic, and database.

```text
                    ┌──────────────────────┐
                    │      UPNEX Web       │
                    │   React 19 + Vite    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    Axios API Layer   │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │     Express 5 API    │
                    └──────────┬───────────┘
                               │
                     ┌─────────┴─────────┐
                     ▼                   ▼
              ┌─────────────┐     ┌─────────────┐
              │    Zod      │     │    Prisma   │
              │ Validation  │     │     ORM     │
              └─────────────┘     └──────┬──────┘
                                         │
                                         ▼
                                  ┌─────────────┐
                                  │    SQLite   │
                                  └─────────────┘
```

---

## 🗺️ Application Flow

```text
Landing Page
     │
     ├── Sign In
     │
     └── Start for Free
              │
              ▼
        Student Dashboard
              │
       ┌──────┼──────────────┐
       ▼      ▼              ▼
     Vault  Analysis      Careers
                              │
                              ▼
                         Portfolio
```

### Main Routes

```text
/
├── /login
├── /dashboard
└── /profile
    ├── /vault
    ├── /analysis
    ├── /careers
    └── /portfolio
```

Authentication is required to access the main workspace.

---

## 💻 Run Locally

### Requirements

* **Node.js 20+**
* **npm**
* **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/Arjunsanthosh1777/UPNEX-Beyond-the-Static-Resume-Your-Career-s-Operating-System.git

cd UPNEX-Beyond-the-Static-Resume-Your-Career-s-Operating-System
```

### 2. Configure the Backend

```powershell
Copy-Item backend\.env.example backend\.env
```

### 3. Install Dependencies

```bash
npm install --prefix backend
```

### 4. Prepare the Database

```bash
npm run db:push --prefix backend
npm run seed --prefix backend
```

### 5. Start the Application

```bash
npm run dev
```

The development environment starts the backend API and frontend together.

The frontend is normally available at:

```text
http://localhost:5173
```

---

## ⚡ Development Commands

| Command                         | Description                         |
| ------------------------------- | ----------------------------------- |
| `npm run dev`                   | Start frontend and backend together |
| `npm run dev:backend`           | Start the backend with Nodemon      |
| `npm run dev:frontend`          | Start the Vite frontend             |
| `npm run build`                 | Build the frontend for production   |
| `npm run seed --prefix backend` | Load sample course data             |
| `npm test --prefix backend`     | Run backend tests                   |

### Windows Shortcut

You can also start the development environment using:

```powershell
.\start-upnex.ps1
```

---

## ⚙️ Configuration

Create your backend environment file from the provided example:

```powershell
Copy-Item backend\.env.example backend\.env
```

### Environment Variables

| Variable               | Purpose                               |
| ---------------------- | ------------------------------------- |
| `DATABASE_URL`         | SQLite database connection            |
| `JWT_SECRET`           | Secret used for authentication tokens |
| `GOOGLE_CLIENT_ID`     | Optional Google OAuth client ID       |
| `GOOGLE_CLIENT_SECRET` | Optional Google OAuth client secret   |
| `CLIENT_URL`           | Frontend origin for OAuth and CORS    |

### Database

UPNEX uses **SQLite by default**, allowing the project to run locally without requiring an external database server.

```env
DATABASE_URL="file:./dev.db"
```

---

## 🔐 Authentication

UPNEX supports multiple authentication paths depending on configuration:

* Email & password authentication
* Password hashing with bcrypt
* JWT-based authentication
* Optional Google OAuth
* Guest access where supported by the application

Google authentication can remain disabled when OAuth credentials are not configured.

---

## 🎯 The Problem UPNEX Addresses

Today's student profile is fragmented across multiple platforms.

```text
GitHub          → Technical Work
Certificates    → Credentials
College ERP     → Academics
Resume          → Self-Reported Skills
Portfolio       → Projects
LinkedIn        → Professional Identity
```

UPNEX brings these elements toward a **unified student intelligence platform**.

```text
          ┌─────────────────────────┐
          │       UPNEX             │
          │                         │
          │  Academics              │
          │  Projects               │
          │  Skills                 │
          │  Credentials            │
          │  Contributions          │
          │  Career Insights        │
          │                         │
          └────────────┬────────────┘
                       │
                       ▼
             Dynamic Digital Identity
```

---

## 💡 Our Philosophy

A resume tells people **what you claim to know**.

UPNEX is designed to show **what you can demonstrate**.

```text
Static Resume
      ↓
Skills & Claims
      ↓
UPNEX
      ↓
Evidence + Progress + Intelligence
      ↓
Dynamic Career Identity
```

---

## 🗺️ Roadmap

* [ ] Advanced AI career recommendations
* [ ] Deeper GitHub integration
* [ ] Automated skill extraction
* [ ] AI-powered resume generation
* [ ] Institution-level credential verification
* [ ] Student networking
* [ ] Recruiter-facing profiles
* [ ] Advanced career simulations
* [ ] Cloud-based deployment
* [ ] Scalable production infrastructure

---

## 📊 Project Status

**UPNEX is actively under development.**

The current system includes the core full-stack architecture, authentication flow, student workspace, profile modules, credential management, API layer, database integration, and validation infrastructure.

Features marked as optional or roadmap items may require additional implementation before production use.

---

## 🌐 Repository

**GitHub:**
https://github.com/Arjunsanthosh1777/UPNEX-Beyond-the-Static-Resume-Your-Career-s-Operating-System

---

## 👨‍💻 Author

### Arjun Santhosh

**AI Developer • Full-Stack Builder • Student Technologist**

Building products around **Artificial Intelligence, Web Technologies, and Student Innovation**.

---

<p align="center">

### UPNEX

**Your career isn't a document. It's a journey.**

⭐ If you find the project interesting, consider starring the repository.

</p>
