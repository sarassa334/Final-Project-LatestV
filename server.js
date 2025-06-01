import app from './app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;
const ENV = process.env.NODE_ENV || 'development';

app.listen(PORT, () => {
  console.log(`Server running in ${ENV} mode on port ${PORT}`);
});

// What to Build First: app.js or server.js?
// Short Answer:
// Build app.js first, then server.js.
// Why? Because app.js defines how your Express app behaves (middleware, routes, etc.), while server.js simply starts the app after it's fully configured.