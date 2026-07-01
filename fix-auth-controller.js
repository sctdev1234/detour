const fs = require('fs');

let code = fs.readFileSync('backend/controllers/authController.js', 'utf8');

const newMethods = `
    async oauthLogin(req, res, next) {
        try {
            const { email, fullName, photoURL, provider, providerId } = req.body;
            if (!provider || !providerId) {
                return res.status(400).json({ msg: 'Provider and Provider ID are required' });
            }
            
            const result = await authService.oauthLogin({ email, fullName, photoURL, provider, providerId });
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    async guestLogin(req, res, next) {
        try {
            const { deviceId } = req.body;
            if (!deviceId) {
                return res.status(400).json({ msg: 'Device ID is required for guest access' });
            }
            
            const result = await authService.guestLogin(deviceId);
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    async logout(req, res, next) {
        try {
            const { deviceId } = req.body;
            await authService.logout(req.user.id, deviceId);
            res.json({ msg: 'Logged out successfully' });
        } catch (err) {
            next(err);
        }
    }

    async revokeAll(req, res, next) {
        try {
            await authService.revokeAllTokens(req.user.id);
            res.json({ msg: 'All sessions revoked' });
        } catch (err) {
            next(err);
        }
    }
`;

// Insert the new methods before "module.exports = new AuthController();"
code = code.replace('module.exports = new AuthController();', newMethods + '\nmodule.exports = new AuthController();');
fs.writeFileSync('backend/controllers/authController.js', code);
console.log('Added oauthLogin, guestLogin, logout, revokeAll to authController');
