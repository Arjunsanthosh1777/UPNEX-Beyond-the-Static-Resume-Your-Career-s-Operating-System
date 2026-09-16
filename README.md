# 🚀 UPNEX — Intelligent Student Growth & Smart Education Platform

<p align="center">
  <strong>SMART INDIA HACKATHON 2026</strong><br>
  <em>Transforming Student Data into Personalized Learning & Career Intelligence</em>
</p>

<p align="center">

![SIH](https://img.shields.io/badge/Smart%20India%20Hackathon-2026-orange)
![Problem Statement](https://img.shields.io/badge/PS-SIH26207-blue)
![Theme](https://img.shields.io/badge/Theme-Smart%20Education-purple)
![Category](https://img.shields.io/badge/Category-Software-green)

</p>

---

## 🎯 SIH 2026 — Problem Statement

**Problem Statement ID:** `SIH26207`

**Problem Statement:**
**Student Innovation — Smart Education**

**Theme:** Smart Education
**Category:** Software
**Team:** Byte Brains

The SIH problem statement focuses on **Smart Education** — enabling learners to learn more effectively, efficiently, flexibly, and comfortably in the digital age.

UPNEX addresses this direction by creating a unified student intelligence platform that can understand academic progress, technical development, learning activity, skills, credentials, and career interests to provide more personalized guidance.

---

# 💡 What is UPNEX?

**UPNEX** is an **AI-powered Student Intelligence & Digital Identity Platform** designed to transform fragmented student information into a continuously evolving digital profile.

Traditional student profiles are often distributed across:

```text
Academic Records
      +
Projects
      +
Skills
      +
GitHub Contributions
      +
Certificates
      +
Learning Progress
      +
Career Interests
```

UPNEX brings these signals together into a unified platform to help students understand:

> **Where am I now? → What are my gaps? → What should I learn next? → Where can I go from here?**

---

# 🧠 Our Approach

UPNEX follows a continuous intelligence cycle:

```text
        ┌───────────────┐
        │    RESEARCH   │
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
                └──────────────→ Continuous Student Growth
```

This approach reflects the project's research direction around **adaptive learning and learning analytics**, where learner progress, performance, attempts, and other signals can help identify gaps and guide the next learning step.

---

# ✨ Core Features

## 🧩 1. Student Intelligence Profile

UPNEX creates a dynamic representation of a student's academic and technical journey.

The profile can bring together:

* Academic information
* Projects
* Technical skills
* GitHub activity
* Achievements
* Credentials
* Career interests
* Learning progress

Instead of maintaining disconnected records, students get a **single intelligent student profile**.

---

## 📊 2. Learning & Skill Analytics

UPNEX is designed to turn student activity into meaningful insights.

Analytics can help identify:

* Current skill levels
* Skill gaps
* Learning progress
* Development areas
* Technical strengths
* Areas requiring improvement

The objective is not simply to collect student data, but to convert it into **actionable guidance**.

Learning analytics research supports using learner events such as attempts, time spent, progress, and performance to identify gaps and provide clearer next-step guidance.

---

## 🤖 3. AI-Powered Personalization

The AI layer is designed to provide guidance based on a student's individual profile rather than presenting the same path to everyone.

Potential recommendations include:

```text
Student Profile
      ↓
Current Skills
      ↓
Skill Gap Analysis
      ↓
Learning / Career Goals
      ↓
Personalized Recommendations
      ↓
Next Best Step
```

This supports the SIH Smart Education objective of making learning more **effective, flexible, and personalized**.

---

## 🔎 4. Verifiable Proof-of-Work

UPNEX moves beyond self-reported skills by connecting skills with evidence.

Students can showcase:

* Academic projects
* Technical projects
* Repository contributions
* Skill milestones
* Achievements
* Development progress

> **Don't just say you have the skill. Show the work behind it.**

---

## 🔐 5. Secure Credential Vault

A centralized workspace for managing academic and professional credentials.

Students can:

* Store certificates
* Manage academic records
* Organize supporting documents
* Track verification status
* Share relevant credentials

Uploaded documents begin as **Pending Review** and become **Verified** only after the appropriate verification process.

---

## 🌐 6. Digital Portfolio

UPNEX provides a dynamic digital identity where students can present:

* Projects
* Skills
* Academic achievements
* Technical contributions
* Credentials
* Career interests

The portfolio can evolve as the student's learning journey progresses.

---

# 🏗️ System Architecture

```text
┌─────────────────────────────────────────────┐
│              UPNEX PLATFORM                 │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │   React 19 UI   │
              │    + Vite 6     │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │   Axios API     │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │   Express 5     │
              │     Backend     │
              └───────┬─────────┘
                      │
             ┌────────┴────────┐
             ▼                 ▼
      ┌──────────────┐  ┌──────────────┐
      │     Zod      │  │    Prisma    │
      │  Validation  │  │     ORM      │
      └──────────────┘  └──────┬───────┘
                               │
                               ▼
                        ┌────────────┐
                        │   SQLite   │
                        └────────────┘
```

---

# 🛠️ Technology Stack

| Layer              | Technology                |
| ------------------ | ------------------------- |
| **Frontend**       | React 19                  |
| **Build Tool**     | Vite 6                    |
| **Routing**        | React Router              |
| **API Client**     | Axios                     |
| **Backend**        | Node.js 20+               |
| **Server**         | Express 5                 |
| **ORM**            | Prisma                    |
| **Database**       | SQLite                    |
| **Validation**     | Zod                       |
| **Authentication** | Email & Password + bcrypt |
| **OAuth**          | Google OAuth *(optional)* |

---

# 🗺️ Application Workflow

```text
                  STUDENT
                     │
                     ▼
              ┌─────────────┐
              │   UPNEX     │
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
                     │
                     ▼
              Skill Gap Analysis
                     │
                     ▼
            AI Personalization
                     │
              ┌──────┴──────┐
              ▼             ▼
         Learning Path   Career Path
              │             │
              └──────┬──────┘
                     ▼
              Student Growth
```

---

# 📌 Application Modules

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

### Dashboard

Central workspace for monitoring the student's overall development.

### Analysis

Provides student-focused analytics and identifies development areas.

### Careers

Connects student skills and development with potential career directions.

### Portfolio

Creates a dynamic professional identity around projects, skills, achievements, and contributions.

### Vault

Centralized credential and academic document management.

---

# 🔬 Responsible AI

UPNEX is designed with responsible AI considerations in mind.

The project recognizes the importance of:

* Transparency
* Privacy
* Human oversight
* Feedback loops
* Recommendation bias management

AI recommendations should support student decision-making rather than replace human judgment. The SIH research material specifically highlights trustworthy AI, transparency, privacy, human oversight, and responsible AI practices.

---

# 🌍 Accessibility & Flexibility

Smart education should not depend on a single learning environment.

UPNEX is designed as a web-based platform supporting flexible access to student information, progress, guidance, and digital credentials.

This aligns with the project's research direction around **self-paced and flexible learning across devices**, reducing friction in accessing content, practice, and revision.

---

# 🎯 Expected Impact

UPNEX aims to help students:

* Understand their current capabilities
* Identify skill gaps
* Track academic and technical growth
* Discover relevant learning directions
* Build evidence-backed profiles
* Organize credentials
* Develop a stronger digital identity
* Make more informed learning and career decisions

### From fragmented student data → to intelligent student growth.

---

# 🚀 Innovation

The core idea behind UPNEX is to move from a **static student profile** toward a **dynamic student intelligence system**.

```text
Traditional Model

Marks + Certificates + Resume
              ↓
        Static Profile


UPNEX Model

Academics
    +
Projects
    +
Skills
    +
Learning Signals
    +
Credentials
    +
Technical Contributions
              ↓
      Student Intelligence
              ↓
   Personalized Guidance
              ↓
       Continuous Growth
```

---

# 🗺️ Future Roadmap

* [ ] Advanced adaptive learning recommendations
* [ ] Deeper GitHub integration
* [ ] Automated skill extraction
* [ ] Personalized learning pathways
* [ ] AI-powered career recommendations
* [ ] Advanced learning analytics
* [ ] Institution-level credential verification
* [ ] Student networking
* [ ] Recruiter-facing profiles
* [ ] Cloud-based deployment
* [ ] Scalable production infrastructure

---

# 💻 Run Locally

## Requirements

* Node.js 20+
* npm
* Git

## Clone

```bash
git clone https://github.com/Arjunsanthosh1777/UPNEX-Beyond-the-Static-Resume-Your-Career-s-Operating-System.git

cd UPNEX-Beyond-the-Static-Resume-Your-Career-s-Operating-System
```

## Configure Backend

```powershell
Copy-Item backend\.env.example backend\.env
```

## Install Dependencies

```bash
npm install --prefix backend
```

## Prepare Database

```bash
npm run db:push --prefix backend
npm run seed --prefix backend
```

## Start Development Server

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

# ⚙️ Configuration

Create your environment file:

```powershell
Copy-Item backend\.env.example backend\.env
```

| Variable               | Purpose                             |
| ---------------------- | ----------------------------------- |
| `DATABASE_URL`         | SQLite database connection          |
| `JWT_SECRET`           | Authentication token secret         |
| `GOOGLE_CLIENT_ID`     | Optional Google OAuth client ID     |
| `GOOGLE_CLIENT_SECRET` | Optional Google OAuth client secret |
| `CLIENT_URL`           | Frontend origin for OAuth and CORS  |

Default database configuration:

```env
DATABASE_URL="file:./dev.db"
```

---

# ⚡ Development Commands

| Command                         | Purpose                    |
| ------------------------------- | -------------------------- |
| `npm run dev`                   | Start frontend and backend |
| `npm run dev:backend`           | Start backend              |
| `npm run dev:frontend`          | Start frontend             |
| `npm run build`                 | Build frontend             |
| `npm run seed --prefix backend` | Load sample courses        |
| `npm test --prefix backend`     | Run backend tests          |

For Windows:

```powershell
.\start-upnex.ps1
```

---

# 📊 Project Status

**UPNEX is actively under development.**

The current implementation includes the core full-stack architecture, authentication, student workspace, profile modules, credential management, API layer, database integration, and validation infrastructure.

Some advanced AI, adaptive-learning, integration, and scalability capabilities remain part of the development roadmap.

---

# 🏆 Smart India Hackathon 2026

**Problem Statement:** `SIH26207`
**Theme:** `Smart Education`
**Category:** `Software`
**Team:** `Byte Brains`

### UPNEX

> **Research → Personalize → Measure → Adapt → Improve**

A platform designed to help transform the digital student experience from **static records into continuous, intelligent growth**.

---

# 👨‍💻 Team

### Byte Brains

**UPNEX — Smart Education Innovation**

Built for **Smart India Hackathon 2026**.

---

<p align="center">

### 🚀 UPNEX

**Learn Smarter. Understand Your Growth. Build Your Future.**

⭐ Star the repository if you find the project interesting.

</p>
