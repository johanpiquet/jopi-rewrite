# Start a new project

This document shows the typical steps to create a new Jopi Rewrite project.

1. Install Bun (recommended) or Node.js depending on your environment.
2. Initialize a new project directory:
   - Use a starter repository or CLI template if provided.
   - Create package.json and necessary config files (tsconfig.json if using TypeScript).
3. Install dependencies:
   - For Bun: bun install
   - For Node: npm install / pnpm install / yarn install
4. Create a basic source layout:
   - src/mod_app/@routes
   - src/mod_app/@alias
5. Start the development server:
   - Use the project's start script (e.g. bun run dev or npm run dev).
6. Open your browser at the configured local URL (usually http://localhost:3000).

Tips:
- Use the provided templates for Tailwind and HMR to get immediate developer experience.
- Place pages and API handlers under @routes to let the framework map files to URLs.

