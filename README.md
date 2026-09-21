<div align="center">

# 🚀 UPNEX

### Beyond the Static Resume — Your Career's Operating System

**An AI-powered Student Intelligence & Digital Identity Platform**

*From fragmented student data → to intelligent student growth.*

<br>

[![SIH 2026](https://img.shields.io/badge/Smart_India_Hackathon-2026-FF6B00?style=for-the-badge)](https://sih.gov.in)
[![Problem Statement](https://img.shields.io/badge/PS_ID-SIH26207-1E88E5?style=for-the-badge)](https://sih.gov.in)
[![Theme](https://img.shields.io/badge/Theme-Smart_Education-4CAF50?style=for-the-badge)](https://sih.gov.in)

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://prisma.io)
[![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?logo=sqlite&logoColor=white)](https://sqlite.org)

**Team Byte Brains**

</div>

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [What is UPNEX](#-what-is-upnex)
- [Our Approach](#-our-approach)
- [Core Features](#-core-features)
- [System Architecture](#️-system-architecture)
- [Technology Stack](#️-technology-stack)
- [Application Workflow](#️-application-workflow)
- [Application Modules](#-application-modules)
- [Run Locally](#-run-locally)
- [Configuration](#️-configuration)
- [Development Commands](#-development-commands)
- [Responsible AI](#-responsible-ai)
- [Project Status](#-project-status)
- [Roadmap](#️-future-roadmap)
- [Team](#-team)

---

## 🎯 Problem Statement

| | |
|---|---|
| **Problem Statement ID** | SIH26207 |
| **Title** | Student Innovation — Smart Education |
| **Theme** | Smart Education |
| **Category** | Software |
| **Team** | Byte Brains |

The problem statement focuses on **Smart Education** — enabling learners to learn more effectively, efficiently, flexibly and comfortably in the digital age.

UPNEX addresses this by building a unified student intelligence platform that understands academic progress, technical development, learning activity, skills, credentials and career interests, and turns them into personalized guidance.

---

## 💡 What is UPNEX?

A resume claims. UPNEX proves.

Student information today lives in a dozen disconnected places — marks in a college portal, projects on GitHub, certificates in a downloads folder, skills listed on a PDF nobody verifies.

```
Academic Records  +  Projects  +  Skills  +  GitHub Contributions
        +  Certificates  +  Learning Progress  +  Career Interests
                              ↓
                    UNIFIED STUDENT PROFILE
```

UPNEX brings these signals together into one continuously evolving digital profile, so every student can answer four questions:

> **Where am I now?** → **What are my gaps?** → **What should I learn next?** → **Where can I go from here?**

---

## 🧠 Our Approach

UPNEX follows a continuous intelligence cycle:

```
   ┌───────────────┐
   │   RESEARCH    │
   └───────┬───────┘
           ↓
   ┌───────────────┐
   │  PERSONALIZE  │
   └───────┬───────┘
           ↓
   ┌───────────────┐
   │    MEASURE    │
   └───────┬───────┘
           ↓
   ┌───────────────┐
   │     ADAPT     │
   └───────┬───────┘
           ↓
   ┌───────────────┐
   │    IMPROVE    │
   └───────┬───────┘
           │
           └──────────→  Continuous Student Growth
```

This reflects established research in **adaptive learning** and **learning analytics**, where learner progress, performance and attempts help identify gaps and guide the next learning step.

---

## ✨ Core Features

### 🧩 Student Intelligence Profile

A dynamic representation of a student's academic and technical journey, bringing together academic information, projects, technical skills, GitHub activity, achievements, credentials, career interests and learning progress.

Instead of disconnected records, students get **one intelligent profile**.

### 📊 Learning & Skill Analytics

Turns student activity into meaningful insight — current skill levels, skill gaps, learning progress, development areas, technical strengths and areas needing improvement.

The objective is not to collect student data, but to convert it into **actionable guidance**.

### 🤖 AI-Powered Personalization

Guidance based on the individual profile rather than one path for everyone.

```
Student Profile → Current Skills → Skill Gap Analysis
      → Learning / Career Goals → Personalized Recommendations
              → NEXT BEST STEP
```

### 🔎 Verifiable Proof-of-Work

Skills connected to evidence: academic projects, technical projects, repository contributions, skill milestones, achievements and development progress.

> **Don't just say you have the skill. Show the work behind it.**

### 🔐 Secure Credential Vault

A centralized workspace for certificates, academic records and supporting documents, with verification status tracking and selective sharing.

Uploaded documents start as **Pending Review** and become **Verified** only after the appropriate verification process.

### 🌐 Digital Portfolio

A dynamic digital identity presenting projects, skills, academic achievements, technical contributions, credentials and career interests — one that evolves as the student's journey progresses.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────┐
│              UPNEX PLATFORM                 │
└──────────────────────┬──────────────────────┘
                       ▼
              ┌─────────────────┐
              │   React 19 UI   │
              │    + Vite 6     │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │   Axios  API    │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │   Express 5     │
              │    Backend      │
              └───────┬─────────┘
                      │
             ┌────────┴────────┐
             ▼                 ▼
      ┌──────────────┐  ┌──────────────┐
      │     Zod      │  │    Prisma    │
      │  Validation  │  │     ORM      │
      └──────────────┘  └──────┬───────┘
                               ▼
                        ┌────────────┐
                        │   SQLite   │
                        └────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 |
| **Build Tool** | Vite 6 |
| **Routing** | React Router |
| **API Client** | Axios |
| **Runtime** | Node.js 20+ |
| **Server** | Express 5 |
| **ORM** | Prisma |
| **Database** | SQLite |
| **Validation** | Zod |
| **Authentication** | Email & Password + bcrypt |
| **OAuth** | Google OAuth *(optional)* |
| **Testing** | Vitest |

---

## 🗺️ Application Workflow

```
                  STUDENT
                     │
                     ▼
              ┌─────────────┐
              │    UPNEX    │
              │   Profile   │
              └──────┬──────┘
                     │
          ┌──────────┼───────────┐
          ▼          ▼           ▼
      Academics   Projects    Skills
          │          │           │
          └──────────┼───────────┘
                     ▼
             Student Analytics
                     ▼
             Skill Gap Analysis
                     ▼
             AI Personalization
                     │
              ┌──────┴──────┐
              ▼             ▼
       Learning Path    Career Path
              └──────┬──────┘
                     ▼
              STUDENT GROWTH
```

---

## 📌 Application Modules

```
/
├── /login
├── /dashboard
└── /profile
    ├── /vault
    ├── /analysis
    ├── /careers
    └── /portfolio
```

| Module | Purpose |
|---|---|
| **Dashboard** | Central workspace for monitoring overall development |
| **Analysis** | Student-focused analytics that identify development areas |
| **Careers** | Connects skills and development with potential career directions |
| **Portfolio** | Dynamic professional identity built on projects, skills and achievements |
| **Vault** | Centralized credential and academic document management |

---

## 💻 Run Locally

### Requirements

- Node.js 20+
- npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Arjunsanthosh1777/UPNEX-Beyond-the-Static-Resume-Your-Career-s-Operating-System.git

cd UPNEX-Beyond-the-Static-Resume-Your-Career-s-Operating-System
```

### 2. Configure the backend

**Windows (PowerShell)**
```powershell
Copy-Item backend\.env.example backend\.env
```

**macOS / Linux**
```bash
cp backend/.env.example backend/.env
```

### 3. Install dependencies

```bash
npm install --prefix backend
```

### 4. Prepare the database

```bash
npm run db:push --prefix backend
npm run seed --prefix backend
```

### 5. Start the development server

```bash
npm run dev
```

The frontend will be available at **http://localhost:5173**

> **Windows shortcut:** run `.\start-upnex.ps1` to launch everything in one step.

---

## ⚙️ Configuration

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite database connection |
| `JWT_SECRET` | Authentication token secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID *(optional)* |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret *(optional)* |
| `CLIENT_URL` | Frontend origin for OAuth and CORS |

Default database configuration:

```env
DATABASE_URL="file:./dev.db"
```

---

## ⚡ Development Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start frontend and backend together |
| `npm run dev:backend` | Start the backend only |
| `npm run dev:frontend` | Start the frontend only |
| `npm run build` | Build the frontend for production |
| `npm run seed --prefix backend` | Load sample courses |
| `npm test --prefix backend` | Run the backend test suite |

---

## 🔬 Responsible AI

UPNEX is built with responsible AI considerations at its core:

- **Transparency** — students can understand why a recommendation was made
- **Privacy** — student data handling is explicit and scoped
- **Human oversight** — AI supports decisions, it does not make them
- **Feedback loops** — recommendations improve from real student outcomes
- **Bias management** — recommendation pathways are reviewed, not assumed neutral

> AI recommendations should support student decision-making, never replace human judgment.

---

## 🌍 Accessibility & Flexibility

Smart education should not depend on a single learning environment. UPNEX is a web-based platform supporting flexible access to student information, progress, guidance and digital credentials — enabling self-paced learning across devices and reducing friction in accessing content, practice and revision.

---

## 🎯 Expected Impact

UPNEX helps students:

- ✅ Understand their current capabilities
- ✅ Identify skill gaps
- ✅ Track academic and technical growth
- ✅ Discover relevant learning directions
- ✅ Build evidence-backed profiles
- ✅ Organize credentials in one place
- ✅ Develop a stronger digital identity
- ✅ Make more informed learning and career decisions

---

## 🚀 Innovation

The core idea is moving from a **static student profile** to a **dynamic student intelligence system**.

<table>
<tr>
<th>Traditional Model</th>
<th>UPNEX Model</th>
</tr>
<tr>
<td valign="top">

```
Marks
  +
Certificates
  +
Resume
     ↓
Static Profile
```

</td>
<td valign="top">

```
Academics + Projects + Skills
+ Learning Signals + Credentials
+ Technical Contributions
            ↓
  Student Intelligence
            ↓
  Personalized Guidance
            ↓
   Continuous Growth
```

</td>
</tr>
</table>

---

## 📊 Project Status

UPNEX is **actively under development**.

The current implementation includes the core full-stack architecture, authentication, student workspace, profile modules, credential management, API layer, database integration and validation infrastructure.

Advanced AI, adaptive-learning, integration and scalability capabilities remain part of the development roadmap below.

---

## 🗺️ Future Roadmap

- [ ] Advanced adaptive learning recommendations
- [ ] Deeper GitHub integration
- [ ] Automated skill extraction
- [ ] Personalized learning pathways
- [ ] AI-powered career recommendations
- [ ] Advanced learning analytics
- [ ] Institution-level credential verification
- [ ] Student networking
- [ ] Recruiter-facing profiles
- [ ] Cloud-based deployment
- [ ] Scalable production infrastructure

---

## 🤝 Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch — `git checkout -b feature/your-feature`
3. Commit your changes — `git commit -m "Add your feature"`
4. Push the branch — `git push origin feature/your-feature`
5. Open a pull request

Please make sure `npm test --prefix backend` passes before opening a PR.

---

## 👨‍💻 Team

<div align="center">

### Byte Brains

**UPNEX — Smart Education Innovation**

Built for Smart India Hackathon 2026

<br>

| Member |
|:---|
| **Arjun Santhosh**  |
| **Alvin Steve Saji** |
| **Robert Vijayakumar** |
| **Aravindan** |
| **Priyanka** |
| **Prince Haridas** |

</div>

---

<div align="center">

## 🚀 UPNEX

**Learn Smarter. Understand Your Growth. Build Your Future.**

*Research → Personalize → Measure → Adapt → Improve*

<br>

⭐ **Star the repository if you find the project interesting**

</div>
