module.exports = {
  apps: [
    {
      name: "ANSV File checker",
      exec_mode: "cluster",
      instances: "1",
      script: "./dist/index.js", // your script
      args: "start",
      env: {
        NODE_ENV: "production", 
        PORT: "3003",
        TZ: "Asia/Ho_Chi_Minh",
      },
    },
  ],
};