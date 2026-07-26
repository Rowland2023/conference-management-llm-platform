export const authGuard = (req, res, next) => {
    // TODO: Implement actual authentication logic (e.g., JWT verification)
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    // Pass through for now
    next();
};