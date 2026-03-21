const jwt = require("jsonwebtoken");

const verifyjwt = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(402).json({ message: "No token found" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(500).json({message:'Something went wrong try again'});
  }

};

module.exports= verifyjwt;

