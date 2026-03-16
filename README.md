
```markdown
# YO3 Platform

Production-grade video surveillance platform demonstrating **Zero-Trust architecture**, client-side **AES-256-GCM encryption**, **Agentic Vision AI**, and an **11-node microservices** backend with **tiered licensing**.

> **🌐 Live Demo:** [hyukiody.github.io/yO3-platform](https://hyukiody.github.io/yO3-platform/)

[![CI/CD Pipeline](https://github.com/hyukiody/yO3-platform/actions/workflows/deploy.yml/badge.svg)](https://github.com/hyukiody/yO3-platform/actions)
[![Docker Hub](https://img.shields.io/docker/v/hyukiody/yo3-platform?label=Docker%20Hub&logo=docker)](https://hub.docker.com/r/hyukiody/yo3-platform)
[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](LICENSE)

**📦 Docker Hub:** [`hyukiody/yo3-platform`](https://hub.docker.com/r/hyukiody/yo3-platform)

---

## ✨ Features

- 🔐 **Zero-Trust Security** — Hardware-backed client-side AES-256-GCM encryption (server never sees plaintext)
- 🤖 **Agentic Vision AI** — YOLOv8 object detection integrated with Moondream VLM for deep scene analysis
- 🏗️ **Microservices Architecture** — 11 independent Spring Boot nodes with real-time WebSocket/SSE streaming
- 💳 **Commercial SaaS Engine** — 4-tier cryptographic licensing (Solo, Pro, Enterprise) via RSA-2048
- 🔑 **JWT Authentication** — Secure stateless authentication with Spring Security
- 📱 **Showcase-Driven UI** — Mobile-first React 18 interface featuring 5+ interactive developer demos

---

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
docker pull hyukiody/yo3-platform:latest
docker run -d -p 5173:5173 --name yo3 hyukiody/yo3-platform:latest

```

Access at: http://localhost:5173

### Local Development

```bash
git clone [https://github.com/hyukiody/yO3-platform.git](https://github.com/hyukiody/yO3-platform.git)
cd yO3-platform
npm install
npm run dev

```

---

## 🛠 Tech Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React 18, TypeScript, Vite, Web Crypto API |
| **Backend Core** | Spring Boot 3.4, Java 21 (11 Microservices) |
| **AI / Neural** | Python FastAPI, YOLOv8, Moondream VLM |
| **Security** | AES-256-GCM, RSA-2048, JWT |
| **Database & Ops** | PostgreSQL 16, Docker Compose, GitHub Actions |

---

## 📂 Project Structure

```text
yO3-platform/
├── src/
│   ├── components/     # React UI components
│   ├── pages/showcase/ # Interactive demos (Encryption, AI, Architecture)
│   ├── contexts/       # Auth & License contexts
│   ├── workers/        # Web Workers (background client-side encryption)
│   └── types/          # TypeScript & License tier definitions
├── docker/             # Microservices compose files
├── Dockerfile          # Container build
└── vite.config.ts      # Build configuration

```

---

## 🔐 Security & AI Architecture

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Device   │───▶│   API Gateway   │───▶│  Backend APIs   │
│  (Seed Key)     │    │   (JWT Auth)    │    │  (Encrypted)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                                              │
        ▼                                              ▼
┌─────────────────┐                            ┌─────────────────┐
│ Web Crypto API  │                            │   PostgreSQL    │
│ (AES-256-GCM)   │                            │  (Encrypted)    │
└─────────────────┘                            └─────────────────┘

```

**Key Principle:** The server never touches plaintext video data. Decryption happens purely on the client-side via browser Web Workers.

---

## 📄 License

This project is open source under the [MIT License](https://www.google.com/search?q=LICENSE).

---

## 📧 Contact

* **GitHub:** [@hyukiody](https://github.com/hyukiody)
* **Issues:** [Report bugs](https://github.com/hyukiody/yO3-platform/issues)

**Privacy Policy:** [PRIVACY.md](PRIVACY.md)

```

Would you like me to help draft the `PRIVACY.md` file referenced at the bottom, focusing on how the Zero-Trust architecture fulfills standard GDPR/HIPAA compliance?

```
