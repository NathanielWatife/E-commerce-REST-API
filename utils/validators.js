const validator = require('validator');

const validateEmail = (email) => {
    return validator.isEmail(email);
};

const validatePassword = (password) => {
    return (
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[^A-Za-z0-9]/.test(password)
    );
};

const validateName = (name) => {
    return name.length >= 2 && name.length <= 50;
};

module.exports = {
    validateEmail,
    validatePassword,
    validateName,
};