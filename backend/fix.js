const fs = require('fs');
let code = fs.readFileSync('services/authService.js', 'utf8');

const regex = /generateTokens\(user\) \{[\s\S]*module\.exports = new AuthService\(\);/m;

const replacement = `generateTokens(user) {
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        const accessToken = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        return { accessToken, refreshToken };
    }

    async refreshSession(refreshToken) {
        if (!refreshToken) throw new Error('No refresh token provided');

        try {
            const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
            const user = await userRepository.findById(decoded.user.id);
            
            if (!user || user.refreshToken !== refreshToken) {
                throw new Error('Invalid refresh token');
            }

            const tokens = this.generateTokens(user);
            user.refreshToken = tokens.refreshToken;
            await user.save();

            return tokens;
        } catch (err) {
            throw new Error('Invalid or expired refresh token');
        }
    }

    async calculateOnboardingStatus(user) {
        const status = {
            completed: false,
            steps: []
        };

        const role = user.role ? user.role.toLowerCase() : 'client';

        if (role === 'client') {
            const routeCount = await routeRepository.count({ userId: user._id, role: 'client' });
            const hasRoute = routeCount > 0;

            const placesCount = await placeRepository.count({ user: user._id });
            const hasPlaces = placesCount >= 2;

            status.steps.push({
                id: 'route',
                label: 'Create your first route',
                status: hasRoute ? 'completed' : 'pending',
                required: true
            });

            status.steps.push({
                id: 'places',
                label: 'Add saved places',
                status: hasPlaces ? 'completed' : (placesCount > 0 ? 'in-progress' : 'pending'),
                required: false
            });

            status.completed = hasRoute;
        } else if (role === 'driver') {
            const docs = Array.isArray(user.documents) && user.documents.length > 0 ? user.documents[user.documents.length - 1] : null;
            const hasDocs = !!docs;

            const carOwned = await carRepository.findOne({ ownerId: user._id });
            const carAssigned = await carRepository.findOne({
                'assignment.driverEmail': user.email,
                'assignment.status': 'active'
            });
            const hasCar = !!(carOwned || carAssigned);

            const isApproved = user.verificationStatus === 'verified';

            const routeCount = await routeRepository.count({ userId: user._id, role: 'driver' });
            const hasRoute = routeCount > 0;

            status.steps.push({
                id: 'documents',
                label: 'Upload Required Documents',
                status: hasDocs ? 'completed' : 'pending',
                required: true
            });

            status.steps.push({
                id: 'car',
                label: 'Add or Join a Car',
                status: hasCar ? 'completed' : 'pending',
                required: true
            });

            status.steps.push({
                id: 'approval',
                label: 'Wait for Admin Approval',
                status: isApproved ? 'completed' : (user.verificationStatus === 'pending' ? 'in-progress' : 'pending'),
                required: true
            });

            status.steps.push({
                id: 'route',
                label: 'Create a Route',
                status: hasRoute ? 'completed' : 'pending',
                required: false
            });

            status.completed = hasDocs && hasCar && isApproved;
        }

        return status;
    }
}

module.exports = new AuthService();`;

code = code.replace(regex, replacement);
fs.writeFileSync('services/authService.js', code);
console.log('Fixed authService.js');
