// Determine the base URL based on whether the app is running locally or deployed
const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

export const API_BASE_URL = isLocalhost
    ? "http://localhost:3001"
    : "";

export const FRONTEND_URL = isLocalhost
    ? "http://localhost:5173"
    : "https://apps.iaudit.global";
