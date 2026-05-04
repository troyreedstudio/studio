module.exports = {
  apps: [
    {
      name: "frontend",
      script: "npm",
      args: "start",
      cwd: "/var/www/troyreed1725-dashboard",
      exec_mode: "fork",
      instances: 1,
      // Give Next.js up to 8 seconds to drain in-flight requests and
      // release port 3000 before pm2 SIGKILLs it. Default is 1600ms which
      // wasnt enough — caused EADDRINUSE on the very next start.
      kill_timeout: 8000,
      // Wait 2 seconds between restart attempts so the port can free up
      // even if shutdown ran slightly longer than kill_timeout.
      restart_delay: 2000,
      // Process must stay up at least 10s before pm2 considers it stable.
      min_uptime: 10000,
      max_restarts: 15,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
