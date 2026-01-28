# YO3 Platform

Production-grade video surveillance platform demonstrating **Zero-Trust architecture**, client-side **AES-256-GCM encryption**, **JWT authentication**, and **tiered licensing**.

> **🌐 Live Demo:** [hyukiody.github.io/yO3-platform](https://hyukiody.github.io/yO3-platform/)

[![CI/CD Pipeline](https://github.com/hyukiody/yO3-platform/actions/workflows/deploy.yml/badge.svg)](https://github.com/hyukiody/yO3-platform/actions)
[![Docker Hub](https://img.shields.io/docker/v/hyukiody/yo3-platform?label=Docker%20Hub&logo=docker)](https://hub.docker.com/r/hyukiody/yo3-platform)
[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](LICENSE)

**📦 Docker Hub:** [`hyukiody/yo3-platform`](https://hub.docker.com/r/hyukiody/yo3-platform)

---

## ✨ Features

- 🔐 **Zero-Trust Security** — Client-side AES-256-GCM encryption with user-controlled keys
- 🎥 **Video Surveillance** — Real-time streaming with encrypted storage
- 🔑 **JWT Authentication** — Secure stateless authentication with Spring Security
- 💳 **Tiered Licensing** — Solo, Pro, and Enterprise license tiers
- 📱 **Responsive UI** — Mobile-first React 18 interface
- 🌍 **Internationalization** — English and Japanese support

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
git clone https://github.com/hyukiody/yO3-platform.git
cd yO3-platform
npm install
npm run dev
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite |
| **Backend** | Spring Boot 3.4, Java 21 |
| **Security** | AES-256-GCM, JWT, Web Crypto API |
| **Database** | PostgreSQL 16 |
| **Deployment** | Docker, GitHub Actions |

---

## 📂 Project Structure

```
yO3-platform/
├── src/
│   ├── components/     # React UI components
│   ├── contexts/       # Auth & License contexts
│   ├── services/       # API clients
│   ├── workers/        # Web Workers (encryption)
│   └── types/          # TypeScript definitions
├── public/             # Static assets
├── Dockerfile          # Container build
└── vite.config.ts      # Build configuration
```

---

## 🔐 Security Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Device   │───▶│   API Gateway   │───▶│  Backend APIs   │
│  (Seed Key)     │    │   (JWT Auth)    │    │  (Encrypted)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                                              │
        ▼                                              ▼
┌─────────────────┐                          ┌─────────────────┐
│  Web Crypto API │                          │   PostgreSQL    │
│  (AES-256-GCM)  │                          │  (Encrypted)    │
└─────────────────┘                          └─────────────────┘
```

**Key Principle:** Server never sees plaintext video data. Decryption happens client-side only.

---

## 📄 License

This project is open source under the [MIT License](LICENSE).

---

## 📧 Contact

- **GitHub:** [@hyukiody](https://github.com/hyukiody)
- **Issues:** [Report bugs](https://github.com/hyukiody/yO3-platform/issues)

**Privacy Policy:** [PRIVACY.md](PRIVACY.md)
