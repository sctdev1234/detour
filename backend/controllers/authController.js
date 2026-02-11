const authService = require('../services/authService');
const User = require('../models/User');

class AuthController {
    async signup(req, res) {
        const { email, password, fullName, role, photoURL } = req.body;

        try {
            if (!email || !password || !fullName) {
                return res.status(400).json({ msg: 'Please enter all fields' });
            }

            const { user, token } = await authService.signup({ email, password, fullName, role, photoURL });

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
            if (err.message === 'User already exists') {
                return res.status(400).json({ msg: err.message });
            }
            res.status(500).send('Server Error');
        }
    }

    async login(req, res) {
        const { email, password } = req.body;

        try {
            if (!email || !password) {
                return res.status(400).json({ msg: 'Please enter all fields' });
            }

            const { user, token } = await authService.login({ email, password });

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
            if (err.message === 'Invalid Credentials') {
                return res.status(400).json({ msg: err.message });
            }
            res.status(500).send('Server Error');
        }
    }

    async forgotPassword(req, res) {
        const { email } = req.body;
        try {
            const { token } = await authService.forgotPassword({ email });
            res.json({ msg: 'Reset link sent (simulated)', token });
        } catch (err) {
            console.error(err.message);
            if (err.message === 'User not found') {
                return res.status(404).json({ msg: err.message });
            }
            res.status(500).send('Server Error');
        }
    }

    async resetPassword(req, res) {
        const { token, newPassword } = req.body;
        try {
            await authService.resetPassword({ token, newPassword });
            res.json({ msg: 'Password has been updated' });
        } catch (err) {
            console.error(err.message);
            if (err.message === 'Password reset token is invalid or has expired') {
                return res.status(400).json({ msg: err.message });
            }
            res.status(500).send('Server Error');
        }
    }

    async update(req, res) {
        try {
            const user = await authService.updateProfile(req.user.id, req.body);
            res.json(user);
        } catch (err) {
            console.error(err.message);
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
        const { oldPassword, newPassword } = req.body;
        try {
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
