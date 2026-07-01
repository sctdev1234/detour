const authService = require('../services/authService');
const User = require('../models/User');

class AuthController {
    async signup(req, res, next) {
        try {
            const { signupSchema } = require('../validation/authSchemas');
            const validatedData = signupSchema.parse(req.body);

            const { user, token } = await authService.signup(validatedData);

            res.json({
                token,
                user: {
                    id: user.id,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                    verificationStatus: user.verificationStatus,
                    photoURL: user.photoURL,
                    onboardingStatus: user.onboardingStatus
                }
            });
        } catch (err) {
            next(err);
        }
    }

    async login(req, res, next) {
        try {
            const { loginSchema } = require('../validation/authSchemas');
            const validatedData = loginSchema.parse(req.body);

            const { user, token } = await authService.login(validatedData);

            res.json({
                token,
                user: {
                    id: user.id,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                    verificationStatus: user.verificationStatus,
                    onboardingStatus: user.onboardingStatus
                }
            });
        } catch (err) {
            next(err);
        }
    }

    async forgotPassword(req, res, next) {
        try {
            const { forgotPasswordSchema } = require('../validation/authSchemas');
            const { email } = forgotPasswordSchema.parse(req.body);

            const { token } = await authService.forgotPassword({ email });
            res.json({ msg: 'Reset link sent (simulated)', token });
        } catch (err) {
            next(err);
        }
    }

    async resetPassword(req, res, next) {
        try {
            const { resetPasswordSchema } = require('../validation/authSchemas');
            const { token, newPassword } = resetPasswordSchema.parse(req.body);

            await authService.resetPassword({ token, newPassword });
            res.json({ msg: 'Password has been updated' });
        } catch (err) {
            next(err);
        }
    }

    async verifyOTP(req, res, next) {
        try {
            const { userId, code } = req.body;
            if (!userId || !code) return res.status(400).json({ msg: 'userId and code are required' });

            const user = await authService.verifyOTP(userId, code);
            res.json({ msg: 'Phone verified successfully', user });
        } catch (err) {
            next(err);
        }
    }

    async resendOTP(req, res, next) {
        try {
            const { userId } = req.body;
            if (!userId) return res.status(400).json({ msg: 'userId is required' });

            const result = await authService.resendOTP(userId);
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    async update(req, res, next) {
        try {
            const { updateProfileSchema } = require('../validation/authSchemas');
            const validatedData = updateProfileSchema.parse(req.body);

            const user = await authService.updateProfile(req.user.id, validatedData);
            res.json(user);
        } catch (err) {
            next(err);
        }
    }

    async updateStatus(req, res, next) {
        try {
            const { status } = req.body;
            if (!status || !['ONLINE', 'OFFLINE', 'BUSY', 'BREAK'].includes(status)) {
                return res.status(400).json({ msg: 'Invalid status provided' });
            }
            const user = await authService.updateDriverStatus(req.user.id, status);
            
            // Broadcast driver status update via socket if possible
            req.app.get('io').emit('driver:status_changed', { driverId: user._id, status });
            
            res.json({ msg: 'Driver status updated successfully', status: user.driverStatus });
        } catch (err) {
            next(err);
        }
    }

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
