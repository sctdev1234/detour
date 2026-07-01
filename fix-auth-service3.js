const fs = require('fs');

let code = fs.readFileSync('backend/services/authService.js', 'utf8');

const newUpdateProfile = `    async updateProfile(userId, updateData) {
        const user = await userRepository.findById(userId);
        if (!user) throw new AppError('User not found', 404);

        if (updateData.fullName !== undefined) user.fullName = updateData.fullName;
        if (updateData.photoURL !== undefined) user.photoURL = updateData.photoURL;
        if (updateData.language !== undefined) user.language = updateData.language;
        if (updateData.preferences !== undefined) {
            user.preferences = { ...user.preferences, ...updateData.preferences };
        }

        await user.save();
        return user.toObject();
    }`;

if (code.includes('async updateProfile')) {
    // Basic replacement for the older version of updateProfile
    code = code.replace(/async updateProfile\s*\([\s\S]*?return\s+userObj;\s*\n\s*\}/, newUpdateProfile);
} else {
    code = code.replace('async deleteAccount', newUpdateProfile + '\n\n    async deleteAccount');
}

const newDeactivateAccount = `    async deactivateAccount(userId) {
        const user = await userRepository.findById(userId);
        if (!user) throw new AppError('User not found', 404);
        user.accountStatus = 'deactivated';
        user.refreshToken = null;
        user.devices = [];
        await user.save();
        return true;
    }`;

code = code.replace('async deleteAccount(userId) {', newDeactivateAccount + '\n\n    async deleteAccount(userId) {');

fs.writeFileSync('backend/services/authService.js', code);
console.log('authService updated with profile and deactivation logic');
