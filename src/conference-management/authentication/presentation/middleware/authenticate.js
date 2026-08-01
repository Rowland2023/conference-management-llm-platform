/**
 * Temporary authentication middleware.
 *
 * This will later:
 * - Read the Authorization header
 * - Verify the JWT
 * - Load the authenticated user
 * - Populate req.auth
 */
export async function authenticate(req, res, next) {
    req.auth = null;

    return next();
}