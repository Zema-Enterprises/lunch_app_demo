import { Response } from 'express';
import prisma from '../../config/database';
import { hashPassword, comparePassword } from '../../utils/bcrypt';
import { generateToken } from '../../utils/jwt';
import { AuthRequest } from '../../middleware/auth';

export const register = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name, companyName, companyDomain, companySlug, companyId, role } =
      req.body;

    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

    if (!password || !strongPasswordRegex.test(password)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
      });
    }

    // Check if user already exists (case-insensitive)
    const existingUser = await prisma.user.findFirst({
      where: { 
        email: {
          equals: email,
          mode: 'insensitive',
        }
      },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    let result;

    // Check if registering to existing company or creating new one
    if (companyId) {
      // Register to existing company
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        return res.status(400).json({ message: 'Company not found' });
      }

      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          name,
          role: role || 'USER',
          companyId,
        },
      });

      result = { company, user };
    } else {
      // Create new company and admin user
      if (!companyName || !companyDomain || !companySlug) {
        return res.status(400).json({ message: 'Company information required' });
      }

      // Check if company slug is taken
      const existingCompany = await prisma.company.findUnique({
        where: { slug: companySlug },
      });

      if (existingCompany) {
        return res.status(400).json({ message: 'Company slug already taken' });
      }

      result = await prisma.$transaction(async (tx) => {
        const company = await tx.company.create({
          data: {
            name: companyName,
            domain: companyDomain,
            slug: companySlug,
          },
        });

        const user = await tx.user.create({
          data: {
            email: email.toLowerCase(),
            password: hashedPassword,
            name,
            role: 'ADMIN',
            companyId: company.id,
          },
        });

        return { company, user };
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: result.user.id,
      email: result.user.email,
      companyId: result.user.companyId,
      role: result.user.role,
    });

    return res.status(201).json({
      data: {
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          companyId: result.user.companyId,
        },
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Registration failed' });
  }
};

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user (case-insensitive email)
    const user = await prisma.user.findFirst({
      where: { 
        email: {
          equals: email,
          mode: 'insensitive',
        }
      },
      include: {
        company: true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
    });

    return res.json({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Login failed' });
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        company: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ message: 'Failed to get user' });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  // For JWT-based auth, logout is typically handled client-side
  // But we provide an endpoint for consistency
  return res.status(200).json({ message: 'Logged out successfully' });
};
