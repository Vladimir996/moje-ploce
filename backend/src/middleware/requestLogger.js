const { logActivity } = require("../lib/logger");

const READ_METHODS = ["GET", "HEAD", "OPTIONS"];

// Loguje API pozive koji mijenjaju podatke (POST/PUT/PATCH/DELETE). Obična
// čitanja se ne loguju — besplatna baza (npr. Clever Cloud DEV, 10 MB) bi se
// inače brzo napunila. Ne čeka upis u bazu prije nego što nastavi zahtjev dalje.
function requestLogger(req, res, next) {
  if (!READ_METHODS.includes(req.method)) {
    logActivity({
      action: `request.${req.method.toLowerCase()}`,
      payload: { path: req.originalUrl },
      req,
    });
  }
  next();
}

module.exports = requestLogger;
