import jwt from 'jsonwebtoken';

// This function is our "bouncer"
const auth = (req, res, next) => {
    // 1. Get token from the header
    const token = req.header('x-auth-token');

    // 2. Check if no token
    if (!token) {
        // Correctly returns 401
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // 3. Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 4. Check if the user is an admin (optional, but good practice)
        if (decoded.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Not an admin' });
        }
        
        // 5. If all good, add the user data to the request object
        req.user = decoded.user;
        next(); // Move on to the next function

    } catch (err) {
        // This catches an expired or invalid token
        res.status(401).json({ message: 'Token is not valid' });
    }
};

export default auth;