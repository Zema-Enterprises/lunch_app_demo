"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserStats = exports.getCompanyStats = exports.getCompany = exports.updateCompany = exports.getCompanyUsers = exports.changePassword = exports.updateProfile = exports.updateUserPassword = exports.listUsers = exports.createUser = exports.deleteUser = exports.updateUser = exports.getUser = void 0;
const database_1 = __importDefault(require("../../config/database"));
const bcrypt_1 = require("../../utils/bcrypt");
// Get user by ID
const getUser = async (req, res) => {
    try {
        const { id } = req.params;
        const requestingUser = req.user;
        const user = await database_1.default.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                companyId: true,
                createdAt: true,
            },
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Check if user is from same company
        if (user.companyId !== requestingUser.companyId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        res.json({ data: user });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Failed to fetch user' });
    }
};
exports.getUser = getUser;
// Update user
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const requestingUser = req.user;
        const { name, role } = req.body;
        const targetUser = await database_1.default.user.findUnique({
            where: { id },
        });
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Check if user is from same company
        if (targetUser.companyId !== requestingUser.companyId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        // Check permissions
        // Users can update their own profile
        // Only admins can update other users or change roles
        if (id !== requestingUser.userId) {
            if (requestingUser.role !== 'ADMIN') {
                return res.status(403).json({ message: 'Only admins can update other users' });
            }
        }
        // If trying to change role, must be admin
        if (role && role !== targetUser.role) {
            if (requestingUser.role !== 'ADMIN') {
                return res.status(403).json({ message: 'Only admins can change user roles' });
            }
        }
        const updatedUser = await database_1.default.user.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(role && requestingUser.role === 'ADMIN' && { role }),
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                companyId: true,
            },
        });
        res.json({ data: updatedUser });
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: 'Failed to update user' });
    }
};
exports.updateUser = updateUser;
// Delete user
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const requestingUser = req.user;
        // Only admins can delete users
        if (requestingUser.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Only admins can delete users' });
        }
        const targetUser = await database_1.default.user.findUnique({
            where: { id },
        });
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Check if user is from same company
        if (targetUser.companyId !== requestingUser.companyId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        await database_1.default.user.delete({
            where: { id },
        });
        res.status(204).send();
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Failed to delete user' });
    }
};
exports.deleteUser = deleteUser;
// Create user (admin only)
const createUser = async (req, res) => {
    try {
        const requestingUser = req.user;
        const { email, password, name, role } = req.body;
        // Only admins can create users
        if (requestingUser.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Only admins can create users' });
        }
        // Check if user already exists
        const existingUser = await database_1.default.user.findFirst({
            where: {
                email: {
                    equals: email,
                    mode: 'insensitive',
                },
            },
        });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        const hashedPassword = await (0, bcrypt_1.hashPassword)(password);
        const newUser = await database_1.default.user.create({
            data: {
                email: email.toLowerCase(),
                password: hashedPassword,
                name,
                role: role || 'USER',
                companyId: requestingUser.companyId,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                companyId: true,
            },
        });
        res.status(201).json({ data: newUser });
    }
    catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ message: 'Failed to create user' });
    }
};
exports.createUser = createUser;
// List all users (admin only)
const listUsers = async (req, res) => {
    try {
        const requestingUser = req.user;
        // Only admins can list all users
        if (requestingUser.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Only admins can list users' });
        }
        const users = await database_1.default.user.findMany({
            where: { companyId: requestingUser.companyId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                companyId: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json({ data: users });
    }
    catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
};
exports.listUsers = listUsers;
// Update user password
const updateUserPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const requestingUser = req.user;
        const { currentPassword, newPassword } = req.body;
        const targetUser = await database_1.default.user.findUnique({
            where: { id },
        });
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Check if user is from same company
        if (targetUser.companyId !== requestingUser.companyId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        // Only allow updating own password
        if (id !== requestingUser.userId) {
            return res.status(403).json({ message: 'You can only change your own password' });
        }
        // Verify current password
        const isPasswordValid = await (0, bcrypt_1.comparePassword)(currentPassword, targetUser.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }
        // Hash and update password
        const hashedPassword = await (0, bcrypt_1.hashPassword)(newPassword);
        await database_1.default.user.update({
            where: { id },
            data: { password: hashedPassword },
        });
        res.json({ message: 'Password updated successfully' });
    }
    catch (error) {
        console.error('Update password error:', error);
        res.status(500).json({ message: 'Failed to update password' });
    }
};
exports.updateUserPassword = updateUserPassword;
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name, email } = req.body;
        // Check if email is already taken by another user
        if (email !== req.user.email) {
            const existingUser = await database_1.default.user.findUnique({
                where: { email },
            });
            if (existingUser && existingUser.id !== userId) {
                return res.status(400).json({ message: 'Email is already taken' });
            }
        }
        const updatedUser = await database_1.default.user.update({
            where: { id: userId },
            data: {
                name,
                email,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                companyId: true,
            },
        });
        res.json({ data: updatedUser });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Failed to update profile' });
    }
};
exports.updateProfile = updateProfile;
const changePassword = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { currentPassword, newPassword } = req.body;
        // Get user with password
        const user = await database_1.default.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Verify current password
        const isPasswordValid = await (0, bcrypt_1.comparePassword)(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }
        // Hash new password
        const hashedPassword = await (0, bcrypt_1.hashPassword)(newPassword);
        // Update password
        await database_1.default.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
            },
        });
        res.json({ message: 'Password changed successfully' });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Failed to change password' });
    }
};
exports.changePassword = changePassword;
const getCompanyUsers = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        // Only admins can see company users
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Only admins can view company users' });
        }
        const users = await database_1.default.user.findMany({
            where: { companyId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json({ data: users });
    }
    catch (error) {
        console.error('Get company users error:', error);
        res.status(500).json({ message: 'Failed to fetch company users' });
    }
};
exports.getCompanyUsers = getCompanyUsers;
const updateCompany = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { name, domain } = req.body;
        // Only admins can update company
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Only admins can update company settings' });
        }
        const updatedCompany = await database_1.default.company.update({
            where: { id: companyId },
            data: {
                name,
                domain,
            },
        });
        res.json({ data: updatedCompany });
    }
    catch (error) {
        console.error('Update company error:', error);
        res.status(500).json({ message: 'Failed to update company' });
    }
};
exports.updateCompany = updateCompany;
const getCompany = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const company = await database_1.default.company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                name: true,
                domain: true,
                slug: true,
                createdAt: true,
            },
        });
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }
        res.json({ data: company });
    }
    catch (error) {
        console.error('Get company error:', error);
        res.status(500).json({ message: 'Failed to fetch company' });
    }
};
exports.getCompany = getCompany;
const getCompanyStats = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        // Only admins can see company stats
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Only admins can view company statistics' });
        }
        const [totalUsers, totalEvents, totalOrders, totalRestaurants,] = await Promise.all([
            database_1.default.user.count({ where: { companyId } }),
            database_1.default.event.count({ where: { companyId } }),
            database_1.default.order.count({
                where: {
                    event: { companyId },
                },
            }),
            database_1.default.restaurant.count({ where: { companyId } }),
        ]);
        res.json({
            data: {
                totalUsers,
                totalEvents,
                totalOrders,
                totalRestaurants,
            },
        });
    }
    catch (error) {
        console.error('Get company stats error:', error);
        res.status(500).json({ message: 'Failed to fetch company statistics' });
    }
};
exports.getCompanyStats = getCompanyStats;
const getUserStats = async (req, res) => {
    try {
        const userId = req.user.userId;
        // Get date range for "this week"
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        startOfWeek.setHours(0, 0, 0, 0);
        // Get total orders count
        const totalOrders = await database_1.default.order.count({
            where: { userId },
        });
        // Get this week's orders count
        const thisWeekOrders = await database_1.default.order.count({
            where: {
                userId,
                createdAt: {
                    gte: startOfWeek,
                },
            },
        });
        // Get total spent (sum of all order totals)
        const orders = await database_1.default.order.findMany({
            where: { userId },
            select: { totalAmount: true },
        });
        const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        // Get recent orders (last 5)
        const recentOrders = await database_1.default.order.findMany({
            where: { userId },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                event: {
                    include: {
                        restaurant: {
                            select: {
                                id: true,
                                name: true,
                                cuisine: true,
                            },
                        },
                    },
                },
                orderItems: {
                    include: {
                        menuItem: {
                            select: {
                                id: true,
                                name: true,
                                price: true,
                            },
                        },
                    },
                },
            },
        });
        res.json({
            data: {
                totalOrders,
                thisWeekOrders,
                totalSpent,
                recentOrders,
            },
        });
    }
    catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({ message: 'Failed to fetch user statistics' });
    }
};
exports.getUserStats = getUserStats;
