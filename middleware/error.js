export const errorHandler = (err, req, res, next) => {
  console.error(err.stack); // Logs the full error stack trace to the console — helpful during development
  
  const statusCode = err.statusCode || 500; // Uses a custom error status code if set, otherwise defaults to 500 (Internal Server Error)
  const message = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong' 
    : err.message; // Uses a custom error status code if set, otherwise defaults to 500 (Internal Server Error) // Uses a custom error status code if set, otherwise defaults to 500 (Internal Server Error)

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

// Example Scenario:
// In your AuthController.js, if you do:

// throw new Error("Invalid credentials");
// → That error will be caught automatically by this errorHandler middleware and sent to the client.

export const notFound = (req, res, next) => { // This handles any undefined routes — for example, if the user tries to access /api/banana, which doesn’t exist.
  const error = new Error(`Not Found - ${req.originalUrl}`); // Not Found - /api/banana
  error.statusCode = 404;
  next(error); //  Hey Express, we hit a problem — skip all remaining routes and middlewares and go directly to the error handler middleware.”
};

// User calls undefined route --> notFound() creates error --> passes to next(error) 
//                             --> Express skips normal flow 
//                             --> hands it to errorHandler() 🔐 
//                             --> sends error response to client