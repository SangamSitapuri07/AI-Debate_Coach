// ═══════════════════════════════════════════════════════════════
// API Configuration
// Development: http://localhost:3001
// Production:  VITE_API_URL from Netlify environment variables
// ═══════════════════════════════════════════════════════════════

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default API_URL;