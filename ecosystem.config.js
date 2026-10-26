// pm2 process file for running the demo on a server (PLAN 12.2).
// Usage: npm run build && pm2 start ecosystem.config.js && pm2 save
module.exports = {
  apps: [
    {
      name: "prm-hospitality-twin",
      cwd: __dirname,
      // Call the Next.js CLI directly so this works the same on Windows and Linux
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      env: { NODE_ENV: "production" },
      max_memory_restart: "1G",
    },
  ],
};
