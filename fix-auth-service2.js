const fs = require('fs');

let code = fs.readFileSync('backend/services/authService.js', 'utf8');

const newMethods = `
    async oauthLogin({ email, fullName, photoURL, provider, providerId }) {
        let user;
        if (provider === 'google') {
            user = await userRepository.findOne({ googleId: providerId });
        } else if (provider === 'apple') {
            user = await userRepository.findOne({ appleId: providerId });
        }

        if (!user && email) {
            user = await userRepository.findByEmail(email);
        }

        if (!user) {
            // Register new user
            const payload = {
                email,
                fullName,
                photoURL,
                authProvider: provider,
                role: 'client',
                verificationStatus: 'verified' // Assume OAuth emails are verified
            };
            if (provider === 'google') payload.googleId = providerId;
            if (provider === 'apple') payload.appleId = providerId;
            user = await userRepository.create(payload);
        } else {
            // Link existing user
            if (provider === 'google' && !user.googleId) {
                user.googleId = providerId;
            } else if (provider === 'apple' && !user.appleId) {
                user.appleId = providerId;
            }
            await user.save();
        }

        const { accessToken, refreshToken } = this.generateTokens(user);
        user.refreshToken = refreshToken;
        await user.save();

        const userObj = user.toObject();
        userObj.onboardingStatus = await this.calculateOnboardingStatus(user);

        return { token: accessToken, refreshToken, user: userObj };
    }

    async guestLogin(deviceId) {
        let user = await userRepository.findOne({ guestId: deviceId });
        
        if (!user) {
            user = await userRepository.create({
                authProvider: 'guest',
                guestId: deviceId,
                role: 'client',
                verificationStatus: 'unverified'
            });
        }

        const { accessToken, refreshToken } = this.generateTokens(user);
        user.refreshToken = refreshToken;
        await user.save();

        return { token: accessToken, refreshToken, user: user.toObject() };
    }

    async logout(userId, deviceId) {
        const user = await userRepository.findById(userId);
        if (!user) throw new AppError('User not found', 404);
        
        // Remove device or clear refresh token
        user.refreshToken = null;
        if (deviceId) {
            user.devices = user.devices.filter(d => d.deviceId !== deviceId);
        }
        await user.save();
        return true;
    }

    async revokeAllTokens(userId) {
        const user = await userRepository.findById(userId);
        if (!user) throw new AppError('User not found', 404);
        user.refreshToken = null;
        user.devices = [];
        await user.save();
        return true;
    }
`;

// Insert the new methods before "generateTokens(user)"
code = code.replace('generateTokens(user) {', newMethods + '\n    generateTokens(user) {');
fs.writeFileSync('backend/services/authService.js', code);
console.log('Added oauthLogin, guestLogin, logout, revokeAllTokens to authService');
