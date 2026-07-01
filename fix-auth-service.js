const fs = require('fs');
let code = fs.readFileSync('backend/services/authService.js', 'utf8');
if (!code.includes('const { AppError }')) {
    code = "const { AppError } = require('../middleware/errorHandler');\n" + code;
}
code = code.replace(/throw new Error\('User already exists'\)/g, "throw new AppError('User already exists', 400)");
code = code.replace(/throw new Error\('Phone number already in use'\)/g, "throw new AppError('Phone number already in use', 400)");
code = code.replace(/throw new Error\('User not found'\)/g, "throw new AppError('User not found', 404)");
code = code.replace(/throw new Error\('Phone already verified'\)/g, "throw new AppError('Phone already verified', 400)");
code = code.replace(/throw new Error\('Invalid OTP code'\)/g, "throw new AppError('Invalid OTP code', 400)");
code = code.replace(/throw new Error\('OTP code expired'\)/g, "throw new AppError('OTP code expired', 400)");
code = code.replace(/throw new Error\('Invalid Credentials'\)/g, "throw new AppError('Invalid Credentials', 401)");
fs.writeFileSync('backend/services/authService.js', code);
console.log('authService.js updated');
