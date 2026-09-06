# Timefillers

A warm, multilingual conversation-prompt game for NZ classrooms (Years 1–8), built with React + Vite.

## Run it locally

```bash
npm install
npm run dev
```

Then open the local URL it prints (usually http://localhost:5173).

## Deploy — GitHub → Vercel

1. **Create a GitHub repo** and push this folder to it:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com) and sign in (GitHub login is easiest).
   - Click **Add New → Project**.
   - Select the GitHub repo you just pushed.
   - Vercel auto-detects this as a **Vite** project — leave the default build settings:
     - Build Command: `vite build`
     - Output Directory: `dist`
   - Click **Deploy**.

3. Vercel will give you a live URL (e.g. `https://timefillers.vercel.app`) within a minute or two. Any future `git push` to `main` will automatically redeploy.

## Project structure

```
├── index.html          # HTML entry point
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx         # Mounts the app
    └── App.jsx          # The full Timefillers app (all screens, cards, autopilot, etc.)
```
