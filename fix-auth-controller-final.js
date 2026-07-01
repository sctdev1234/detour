const fs = require('fs');

let code = fs.readFileSync('backend/controllers/authController.js', 'utf8');
const lines = code.split('\n');

// Keep everything up to update() closing
const goodLines = lines.slice(0, 116);
const fixedCode = goodLines.join('\n') + `
    async verify(req, res, next) {
        try {
            const user = await authService.verifyDriver(req.user.id, req.body);
            res.json(user);
        } catch (err) {
            next(err);
        }
    }

    async getMe(req, res, next) {
        try {
            const user = await authService.getUser(req.user.id);
            res.json(user);
        } catch (err) {
            next(err);
        }
    }

    async deactivate(req, res, next) {
        try {
            await authService.deactivateAccount(req.user.id);
            res.json({ msg: 'Account deactivated' });
        } catch (err) {
            next(err);
        }
    }

    async delete(req, res, next) {
        try {
            await authService.deleteAccount(req.user.id);
            res.json({ msg: 'User deleted' });
        } catch (err) {
            next(err);
        }
    }

    async changePassword(req, res, next) {
        try {
            const { oldPassword, newPassword } = req.body;
            if (!oldPassword || !newPassword) {
                return res.status(400).json({ msg: 'Please provide both old and new passwords' });
            }
            await authService.changePassword(req.user.id, { oldPassword, newPassword });
            res.json({ msg: 'Password updated successfully' });
        } catch (err) {
            next(err);
        }
    }

    async addSavedPlace(req, res, next) {
        try {
            const places = await authService.addSavedPlace(req.user.id, req.body);
            res.json(places);
        } catch (err) {
            next(err);
        }
    }

    async removeSavedPlace(req, res, next) {
        try {
            const places = await authService.removeSavedPlace(req.user.id, req.params.id);
            res.json(places);
        } catch (err) {
            next(err);
        }
    }

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
}

module.exports = new AuthController();
`;

fs.writeFileSync('backend/controllers/authController.js', fixedCode);
console.log('Fixed authController.js');
