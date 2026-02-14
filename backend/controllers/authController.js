const authService = require('../services/authService');
const User = require('../models/User');

class AuthController {
    async signup(req, res) {
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
            console.error(err.message);
            if (err.name === 'ZodError') {
                return res.status(400).json({ msg: err.errors[0].message });
            }
            if (err.message === 'User already exists') {
                return res.status(400).json({ msg: err.message });
            }
            res.status(500).send('Server Error');
        }
    }

    async login(req, res) {
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
            console.error(err.message);
            if (err.name === 'ZodError') {
                return res.status(400).json({ msg: err.errors[0].message });
            }
            if (err.message === 'Invalid Credentials') {
                return res.status(400).json({ msg: err.message });
            }
            res.status(500).send('Server Error');
        }
    }

    async forgotPassword(req, res) {
        try {
            const { forgotPasswordSchema } = require('../validation/authSchemas');
            const { email } = forgotPasswordSchema.parse(req.body);

            const { token } = await authService.forgotPassword({ email });
            res.json({ msg: 'Reset link sent (simulated)', token });
        } catch (err) {
            console.error(err.message);
            if (err.name === 'ZodError') {
                return res.status(400).json({ msg: err.errors[0].message });
            }
            if (err.message === 'User not found') {
                return res.status(404).json({ msg: err.message });
            }
            res.status(500).send('Server Error');
        }
    }

    async resetPassword(req, res) {
        try {
            const { resetPasswordSchema } = require('../validation/authSchemas');
            const { token, newPassword } = resetPasswordSchema.parse(req.body);

            await authService.resetPassword({ token, newPassword });
            res.json({ msg: 'Password has been updated' });
        } catch (err) {
            console.error(err.message);
            if (err.name === 'ZodError') {
                return res.status(400).json({ msg: err.errors[0].message });
            }
            if (err.message === 'Password reset token is invalid or has expired') {
                return res.status(400).json({ msg: err.message });
            }
            res.status(500).send('Server Error');
        }
    }

    async update(req, res) {
        try {
            const { updateProfileSchema } = require('../validation/authSchemas');
            const validatedData = updateProfileSchema.parse(req.body);

            const user = await authService.updateProfile(req.user.id, validatedData);
            res.json(user);
        } catch (err) {
            console.error(err.message);
            if (err.name === 'ZodError') {
                return res.status(400).json({ msg: err.errors[0].message });
            }
            if (err.message === 'User not found') return res.status(404).json({ msg: 'User not found' });
            res.status(500).send('Server Error');
        }
    }

    async verify(req, res) {
        try {
            const user = await authService.verifyDriver(req.user.id, req.body);
            res.json(user);
        } catch (err) {
            console.error(err.message);
            if (err.message === 'User not found') return res.status(404).json({ msg: 'User not found' });
            res.status(500).send('Server Error');
        }
    }

    async delete(req, res) {
        try {
            await authService.deleteAccount(req.user.id);
            res.json({ msg: 'User deleted' });
        } catch (err) {
            console.error(err.message);
            if (err.message === 'User not found') return res.status(404).json({ msg: 'User not found' });
            res.status(500).send('Server Error');
        }
    }

    async changePassword(req, res) {
        try {
            const { oldPassword, newPassword } = req.body;

            if (!oldPassword || !newPassword) {
                return res.status(400).json({ msg: 'Please provide both old and new passwords' });
            }
            await authService.changePassword(req.user.id, { oldPassword, newPassword });
            res.json({ msg: 'Password updated successfully' });
        } catch (err) {
            console.error(err.message);
            if (err.message === 'Invalid current password') {
                return res.status(400).json({ msg: err.message });
            }
            res.status(500).send('Server Error');
        }
    }

    async addSavedPlace(req, res) {
        try {
            const places = await authService.addSavedPlace(req.user.id, req.body);
            res.json(places);
        } catch (err) {
            console.error(err.message);
            if (err.message === 'User not found') return res.status(404).json({ msg: 'User not found' });
            res.status(500).send('Server Error');
        }
    }

    async removeSavedPlace(req, res) {
        try {
            const places = await authService.removeSavedPlace(req.user.id, req.params.id);
            res.json(places);
        } catch (err) {
            console.error(err.message);
            if (err.message === 'User not found') return res.status(404).json({ msg: 'User not found' });
            res.status(500).send('Server Error');
        }
    }

    async getMe(req, res) {
        try {
            const user = await authService.getUser(req.user.id);
            res.json(user);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    }
}

module.exports = new AuthController();
