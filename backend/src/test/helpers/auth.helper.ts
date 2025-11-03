/**
 * Authentication helper utilities for tests
 * Provides functions for creating test users and tokens
 */

import prisma from '../../config/database';
import { hashPassword } from '../../utils/bcrypt';
import { generateToken } from '../../utils/jwt';
import { UserRole } from '@prisma/client';

export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
  token: string;
  password: string; // Plain text for testing
}

export interface TestCompany {
  id: string;
  name: string;
  domain: string;
  slug: string;
}

export interface SetupResult {
  company: TestCompany;
  companyId: string;
  admin: TestUser;
  employees?: TestUser[];
}

/**
 * Create a test company with admin and optional employees
 */
export async function setupCompanyWithUsers(options: {
  companyName?: string;
  employeeCount?: number;
} = {}): Promise<SetupResult> {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  
  const companyName = options.companyName || `Test Company ${timestamp}-${random}`;
  const companySlug = `test-${timestamp}-${random}`;
  const companyDomain = `test-${timestamp}-${random}.com`;

  // Create company
  const company = await prisma.company.create({
    data: {
      name: companyName,
      domain: companyDomain,
      slug: companySlug,
    },
  });

  // Create admin user
  const adminPassword = 'TestAdmin123!';
  const hashedAdminPassword = await hashPassword(adminPassword);
  
  const admin = await prisma.user.create({
    data: {
      email: `admin-${timestamp}-${random}@${companyDomain}`,
      password: hashedAdminPassword,
      name: 'Test Admin',
      role: 'ADMIN',
      companyId: company.id,
    },
  });

  const adminToken = generateToken({
    userId: admin.id,
    email: admin.email,
    role: admin.role,
    companyId: company.id,
  });

  const result: SetupResult = {
    company: {
      id: company.id,
      name: company.name,
      domain: company.domain,
      slug: company.slug,
    },
    companyId: company.id,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      companyId: company.id,
      token: adminToken,
      password: adminPassword,
    },
  };

  // Create employee users if requested
  if (options.employeeCount && options.employeeCount > 0) {
    result.employees = [];
    
    for (let i = 0; i < options.employeeCount; i++) {
      const employeePassword = `TestUser${i}123!`;
      const hashedPassword = await hashPassword(employeePassword);
      
      const employee = await prisma.user.create({
        data: {
          email: `user${i}-${timestamp}-${random}@${companyDomain}`,
          password: hashedPassword,
          name: `Test User ${i}`,
          role: 'USER',
          companyId: company.id,
        },
      });

      const employeeToken = generateToken({
        userId: employee.id,
        email: employee.email,
        role: employee.role,
        companyId: company.id,
      });

      result.employees.push({
        id: employee.id,
        email: employee.email,
        name: employee.name,
        role: employee.role,
        companyId: company.id,
        token: employeeToken,
        password: employeePassword,
      });
    }
  }

  return result;
}

/**
 * Login as a test user and get token
 */
export async function loginAsUser(email: string, password: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error(`User not found: ${email}`);
  }

  return generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
  });
}

/**
 * Create a standalone test user (without company setup)
 */
export async function createTestUser(
  companyId: string,
  role: UserRole = 'USER',
  customData: Partial<{ email: string; name: string }> = {}
): Promise<TestUser> {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  
  const email = customData.email || `user-${timestamp}-${random}@test.com`;
  const name = customData.name || `Test User ${timestamp}`;
  const password = 'TestPass123!';
  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role,
      companyId,
    },
  });

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId,
    token,
    password,
  };
}

/**
 * Verify a token is valid
 */
export function isTokenValid(token: string): boolean {
  try {
    const jwt = require('jsonwebtoken');
    jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
    return true;
  } catch {
    return false;
  }
}
