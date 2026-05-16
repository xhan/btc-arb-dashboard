const { startDashboardServer } = require('./src/server/server-app');

startDashboardServer({
  rootDir: __dirname,
  argv: process.argv,
  env: process.env
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
