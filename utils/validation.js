 // This file uses Joi to validate incoming request data before it reaches your logic (in the controller).
 import Joi from 'joi'; // Joi is a library used to validate objects like the req.body.

export const registerSchema = Joi.object({
  name: Joi.string().min(3).max(30).required(), // Must be a string, min 3, max 30, required
  email: Joi.string().email().required(), // Must be a valid email, required
  password: Joi.string() 
    .min(8) // 	- Min 8 characters
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})')) // At least **1 lowercase**, **1 uppercase**, **1 number**, and **1 special character**  
    .message('Password must contain at least one uppercase, one lowercase, one number and one special character') // Custom error message if invalid  
    .required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/)
    .required()
    .invalid(Joi.ref('currentPassword')) // Alternative to disallow  // Not equal to currentPassword
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase, one lowercase, one number and one special character',
      'any.invalid': 'New password cannot be the same as current password'
    })
});