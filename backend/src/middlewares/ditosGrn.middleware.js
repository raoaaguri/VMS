// Ditos GRN Token Middleware
export const checkDitosGrnToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authorization header required",
      message: "Bearer token required for Ditos GRN API",
    });
  }

  const token = authHeader.replace("Bearer ", "");

  if (token !== process.env.DITOS_GRN_TOKEN) {
    return res.status(401).json({
      error: "Invalid Ditos GRN token",
      message: "The provided token is not valid for Ditos GRN API access",
    });
  }

  // Add Ditos context to request for logging
  req.ditosGrnAccess = true;
  next();
};
