import { createApp } from './app.js';
import { config } from './config.js';
import { closeDatabase } from './db/database.js';

const app = createApp();

app.listen(config.port, config.host, () => {
  console.log(JSON.stringify({
    level: 'info',
    message: 'time-theater server started',
    url: `http://${config.host}:${config.port}`,
    mvp: `http://${config.host}:${config.port}/ai-mvp.html`,
    aiConfigured: Boolean(config.aiApiKey)
  }));
});

function shutdown(signal) {
  console.log(JSON.stringify({ level: 'info', message: 'shutdown', signal }));
  app.close(() => {
    closeDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
