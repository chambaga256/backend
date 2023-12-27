const jwt = require("jsonwebtoken");

function decodeToken(token) {
  if (!token) {
    return null;
  }

  // Remove the "Bearer " prefix
  const tokenWithoutBearer = token.replace("Bearer ", "");

  try {
    // Decode the token to get the payload
    const decodedToken = jwt.verify(tokenWithoutBearer, process.env.PRIVATEKEY);
    return decodedToken;
  } catch (err) {
    return null;
  }
}

module.exports = {
  decodeToken,
};
