const fs = require('fs');

let code = fs.readFileSync('backend/controllers/authController.js', 'utf8');

// Replace standard controller methods with next(err) wrapper where console.error was used.
const methodsToReplace = ['update', 'verify', 'delete', 'changePassword'];

for (const method of methodsToReplace) {
    const regex = new RegExp(`async ${method}\\(req, res\\) \\{[\\s\\S]*?res\\.status\\(500\\)\\.send\\('Server Error'\\);\\s*\\}\\s*\\}`, 'g');
    
    code = code.replace(regex, (match) => {
        let newMatch = match.replace('req, res', 'req, res, next');
        newMatch = newMatch.replace(/console\.error\([\s\S]*?res\.status\(500\)\.send\('Server Error'\);/g, 'next(err);');
        return newMatch;
    });
}

// Add deactivate method
const newDeactivate = `
    async deactivate(req, res, next) {
        try {
            await authService.deactivateAccount(req.user.id);
            res.json({ msg: 'Account deactivated' });
        } catch (err) {
            next(err);
        }
    }`;

code = code.replace('async delete(req, res, next) {', newDeactivate + '\n\n    async delete(req, res, next) {');

fs.writeFileSync('backend/controllers/authController.js', code);
console.log('authController updated with next(err) and deactivate method');
