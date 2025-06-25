import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add error handling for React initialization
try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }

  console.log("Initializing React application...");
  const root = createRoot(rootElement);
  root.render(<App />);
  console.log("React application initialized successfully");
} catch (error) {
  console.error("Failed to initialize React application:", error);
  // Show a basic fallback UI
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h1>SAGE Platform</h1>
        <p>Loading application...</p>
        <p>If this persists, please refresh the page.</p>
      </div>
    `;
  }
}
