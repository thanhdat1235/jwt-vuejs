const jwt = require("jsonwebtoken");
const { TOKEN_KEY } = require("../_variables");
const { verifyToken } = require("./jwt");

const authentication = async (req, res, next) => {
  const token = req.headers["authorization"];

  if (!token) {
    return res.status(403).send("A token is required for authentication");
  }

  try {
    await verifyToken(token);
    const decoded = jwt.verify(token, TOKEN_KEY);
    req.user = decoded;
  } catch (err) {
    console.log(err);
    return res.status(401).send("Invalid Token");
  }

  res.setHeader("Authorization", token);
  next();
};

module.exports = authentication;
