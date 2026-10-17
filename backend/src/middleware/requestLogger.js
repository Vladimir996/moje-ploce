const { logActivity } = require("../lib/logger");

// Loguje svaki API poziv (metoda + putanja). Ne čeka upis u bazu prije nego
// što nastavi zahtev dalje.
function requestLogger(req, res, next) {
  logActivity({
    action: `request.${req.method.toLowerCase()}`,
    payload: { path: req.originalUrl },
    req,
  });
  next();
}

module.exports = requestLogger;
