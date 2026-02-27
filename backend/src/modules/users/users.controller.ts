import { Response } from 'express';
import prisma from '../../config/database';
import { hashPassword, comparePassword } from '../../utils/bcrypt';
import { AuthRequest } from '../../middleware/auth';
import { isPasswordStrong, PASSWORD_REQUIREMENTS_MESSAGE } from '../../utils/password';
import { logger } from '../../utils/logger';

// Get user by ID
export const getUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user!;

    const user = await prisma.user.findUnique({
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
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
};

// Update user
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user!;
    const { name, role } = req.body;

    const targetUser = await prisma.user.findUnique({
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

    const updatedUser = await prisma.user.update({
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
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
};

// Delete user
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user!;

    // Only admins can delete users
    if (requestingUser.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can delete users' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is from same company
    if (targetUser.companyId !== requestingUser.companyId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await prisma.user.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

// Create user (admin only)
export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const requestingUser = req.user!;
    const { email, password, name, role } = req.body;

    // Only admins can create users
    if (requestingUser.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can create users' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
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

    if (!password || !isPasswordStrong(password)) {
      return res.status(400).json({ message: PASSWORD_REQUIREMENTS_MESSAGE });
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await prisma.user.create({
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
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
};

// List all users (admin only)
export const listUsers = async (req: AuthRequest, res: Response) => {
  try {
    const requestingUser = req.user!;

    // Only admins can list all users
    if (requestingUser.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can list users' });
    }

    const users = await prisma.user.findMany({
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
  } catch (error) {
    logger.error('List users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// Update user password
export const updateUserPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user!;
    const { currentPassword, newPassword } = req.body;

    const targetUser = await prisma.user.findUnique({
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
    const isPasswordValid = await comparePassword(currentPassword, targetUser.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash and update password
    if (!newPassword || !isPasswordStrong(newPassword)) {
      return res.status(400).json({ message: PASSWORD_REQUIREMENTS_MESSAGE });
    }
    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    logger.error('Update password error:', error);
    res.status(500).json({ message: 'Failed to update password' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name, email } = req.body;

    // Check if email is already taken by another user
    if (email !== req.user!.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: 'Email is already taken' });
      }
    }

    const updatedUser = await prisma.user.update({
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
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    if (!newPassword || !isPasswordStrong(newPassword)) {
      return res.status(400).json({ message: PASSWORD_REQUIREMENTS_MESSAGE });
    }
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
};

export const getCompanyUsers = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    // Only admins can see company users
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can view company users' });
    }

    const users = await prisma.user.findMany({
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
  } catch (error) {
    logger.error('Get company users error:', error);
    res.status(500).json({ message: 'Failed to fetch company users' });
  }
};

export const updateCompany = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { name, domain } = req.body;

    // Only admins can update company
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can update company settings' });
    }

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        name,
        domain,
      },
    });

    res.json({ data: updatedCompany });
  } catch (error) {
    logger.error('Update company error:', error);
    res.status(500).json({ message: 'Failed to update company' });
  }
};

export const getCompany = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    const company = await prisma.company.findUnique({
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
  } catch (error) {
    logger.error('Get company error:', error);
    res.status(500).json({ message: 'Failed to fetch company' });
  }
};

export const getCompanyStats = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    // Only admins can see company stats
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can view company statistics' });
    }

    const [
      totalUsers,
      totalEvents,
      totalOrders,
      totalRestaurants,
    ] = await Promise.all([
      prisma.user.count({ where: { companyId } }),
      prisma.event.count({ where: { companyId } }),
      prisma.order.count({
        where: {
          event: { companyId },
        },
      }),
      prisma.restaurant.count({ where: { companyId } }),
    ]);

    res.json({
      data: {
        totalUsers,
        totalEvents,
        totalOrders,
        totalRestaurants,
      },
    });
  } catch (error) {
    logger.error('Get company stats error:', error);
    res.status(500).json({ message: 'Failed to fetch company statistics' });
  }
};

export const getUserStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Get date range for "this week"
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);

    // Get total orders count
    const totalOrders = await prisma.order.count({
      where: { userId },
    });

    // Get this week's orders count
    const thisWeekOrders = await prisma.order.count({
      where: {
        userId,
        createdAt: {
          gte: startOfWeek,
        },
      },
    });

    // Get total spent (sum of all order totals)
    const orders = await prisma.order.findMany({
      where: { userId },
      select: { totalAmount: true },
    });
    const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    // Get recent orders (last 5)
    const recentOrders = await prisma.order.findMany({
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
  } catch (error) {
    logger.error('Get user stats error:', error);
    res.status(500).json({ message: 'Failed to fetch user statistics' });
  }
};
