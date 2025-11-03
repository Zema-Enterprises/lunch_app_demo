"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const users_controller_1 = require("./users.controller");
const validation_1 = require("../../middleware/validation");
const users_validation_1 = require("./users.validation");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// All user routes require authentication
router.use(auth_1.authMiddleware);
// User profile routes (define before /:id to avoid conflicts)
router.put('/profile', (0, validation_1.validate)(users_validation_1.updateProfileSchema), users_controller_1.updateProfile);
router.post('/change-password', (0, validation_1.validate)(users_validation_1.changePasswordSchema), users_controller_1.changePassword);
router.get('/stats', users_controller_1.getUserStats);
// Company routes (define before /:id to avoid conflicts)
router.get('/company', users_controller_1.getCompany);
router.put('/company', (0, validation_1.validate)(users_validation_1.updateCompanySchema), users_controller_1.updateCompany);
router.get('/company/users', users_controller_1.getCompanyUsers);
router.get('/company/stats', users_controller_1.getCompanyStats);
// User CRUD routes (/:id must come after specific routes)
router.get('/', users_controller_1.listUsers);
router.post('/', users_controller_1.createUser);
router.get('/:id', users_controller_1.getUser);
router.put('/:id', users_controller_1.updateUser);
router.delete('/:id', users_controller_1.deleteUser);
router.put('/:id/password', users_controller_1.updateUserPassword);
exports.default = router;
