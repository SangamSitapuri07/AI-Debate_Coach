# 🔥 AI Debate Coach (Version 2.0.0)

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-black?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![Gemini](https://img.shields.io/badge/Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)

An advanced, interactive platform designed to sharpen your debating skills using cutting-edge AI. Featuring a **3D Battle Arena**, automated argument generation, and deep performance analysis.

---

## ✨ Key Features

-   **⚔️ 3D Battle Arena:** Engage in live, round-based debates against a skilled AI opponent within a dynamic 3D environment powered by React Three Fiber.
-   **📚 Argument Generator:** Instantly generate structured arguments (Claim, Reasoning, Evidence, Impact) for both sides of any topic.
-   **🛡️ Counterargument Builder:** Identify weaknesses in your opponent's logic and build powerful rebuttals.
-   **📊 Argument Evaluator:** Get a detailed "Scorecard" (Clarity, Logic, Evidence, Impact) with actionable feedback to improve your delivery.
-   **🔥 Fire Spectrum Design:** A premium, high-end UI featuring glassmorphism, animated gradients, and interactive "Fire Spectrum" aesthetics.
-   **🤖 Multi-LLM Support:** Seamlessly switch between **Google Gemini 2.0 Flash** and **Groq (Llama 3/Mixtral)** for varying debate styles.

---

## 🛠️ Technology Stack

### **Frontend**
-   **Framework:** React 18 + Vite
-   **3D Engine:** Three.js + React Three Fiber + Drei
-   **Styling:** Vanilla CSS (Glassmorphism & Neon Design System)
-   **Markdown:** React Markdown for rich content rendering

### **Backend**
-   **Runtime:** Node.js + Express
-   **AI APIs:** Google Generative AI (Gemini), Groq SDK
-   **Environment Management:** Dotenv

---

## 🚀 Getting Started

### **1. Prerequisites**
-   Node.js (v18 or higher)
-   API Keys for **Google Gemini** or **Groq**

### **2. Installation**
Clone the repository and run the setup script:
```bash
# Install dependencies for both client and server
npm run setup
```

### **3. Environment Setup**
Create a `.env` file in the `server/` directory:
```env
PORT=3001
AI_PROVIDER=gemini # or "groq"

# If using Gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash

# If using Groq
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
```

### **4. Running the Application**
Start both the client and server concurrently:
```bash
npm run dev
```
-   **Frontend:** `http://localhost:5173`
-   **Backend:** `http://localhost:3001`

---

## 📁 Project Structure

```text
├── client/             # React + Vite frontend
│   ├── src/
│   │   ├── components/ # UI Components (Sidebar, BattleArena, etc.)
│   │   └── App.jsx     # Main application shell
├── server/             # Express backend
│   ├── server.js       # Main server logic & AI integration
│   └── .env            # Backend configuration
└── package.json        # Root workspace configuration
```

---

## ⚖️ License
This project is for educational purposes. Feel free to use and adapt it for your own AI-powered applications!

---
*Created by [SangamSitapuri07](https://github.com/SangamSitapuri07)*
