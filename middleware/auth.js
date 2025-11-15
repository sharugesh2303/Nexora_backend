import jwt from 'jsonwebtoken';

/**
 * Admin authentication middleware.
 * Accepts token from:
 *  - x-auth-token
 *  - Authorization: Bearer <token>
 */
const requireAuth = (req, res, next) => {
    // Allow both header formats
    const headerToken =
        req.header("x-auth-token") ||
        req.header("authorization");

    if (!headerToken) {
        return res.status(401).json({ message: "No token, authorization denied" });
    }

    // Extract token if "Bearer xxxxx"
    const token = headerToken.startsWith("Bearer ")
        ? headerToken.substring(7)
        : headerToken;

    try {
        const secret = process.env.JWT_SECRET || "devsecret";
        const decoded = jwt.verify(token, secret);

        // Optional admin check
        if (!decoded.user || decoded.user.role !== "admin") {
            return res.status(403).json({ message: "Forbidden: Not an admin" });
        }

        req.user = decoded.user;
        next();
    } catch (err) {
        console.error("JWT Error:", err.message);
        return res.status(401).json({ message: "Token is not valid" });
    }
};

export default requireAuth;
