import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create demo company
  const company = await prisma.company.create({
    data: {
      name: 'Demo Company',
      domain: 'demo.com',
      slug: 'demo-company',
    },
  });

  console.log('Created company:', company.name);

  // Hash password
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      companyId: company.id,
      notificationSettings: {
        create: {
          emailEnabled: true,
          inAppEnabled: true,
          notifyOnEventCreated: true,
          notifyOnOrderPlaced: true,
          notifyOnDeadlineApproaching: true,
          notifyOnEventClosed: true,
          notifyOnPaymentConfirmed: true,
          notifyOnEventCompleted: true,
        },
      },
    },
  });

  console.log('Created admin user:', adminUser.email);

  // Create regular user
  const regularUser = await prisma.user.create({
    data: {
      email: 'user@demo.com',
      password: hashedPassword,
      name: 'Regular User',
      role: 'USER',
      companyId: company.id,
      notificationSettings: {
        create: {
          emailEnabled: true,
          inAppEnabled: true,
          notifyOnEventCreated: true, // Users should receive event creation notifications
          notifyOnOrderPlaced: true,
          notifyOnDeadlineApproaching: true,
          notifyOnEventClosed: true,
          notifyOnPaymentConfirmed: true,
          notifyOnEventCompleted: true,
        },
      },
    },
  });

  console.log('Created regular user:', regularUser.email);

  // Create restaurants
  const restaurant1 = await prisma.restaurant.create({
    data: {
      name: 'Pizza Palace',
      cuisine: 'Italian',
      openTime: '11:00',
      closeTime: '22:00',
      deliveryTime: '45 minutes',
      hasMenu: true,
      companyId: company.id,
    },
  });

  console.log('Created restaurant:', restaurant1.name);

  const restaurant2 = await prisma.restaurant.create({
    data: {
      name: 'Sushi Express',
      cuisine: 'Japanese',
      openTime: '12:00',
      closeTime: '21:00',
      deliveryTime: '30 minutes',
      hasMenu: true,
      companyId: company.id,
    },
  });

  console.log('Created restaurant:', restaurant2.name);

  // Create no-menu restaurant
  const restaurant3 = await prisma.restaurant.create({
    data: {
      name: 'Local Deli',
      cuisine: 'Sandwiches',
      openTime: '08:00',
      closeTime: '18:00',
      deliveryTime: '20 minutes',
      hasMenu: false,
      companyId: company.id,
    },
  });

  console.log('Created restaurant:', restaurant3.name);

  // Create menu items for Pizza Palace
  const pizzaItems = [
    {
      name: 'Margherita Pizza',
      description: 'Classic tomato and mozzarella',
      price: 12.99,
      category: 'Pizza',
      restaurantId: restaurant1.id,
    },
    {
      name: 'Pepperoni Pizza',
      description: 'Pepperoni and cheese',
      price: 14.99,
      category: 'Pizza',
      restaurantId: restaurant1.id,
    },
    {
      name: 'Caesar Salad',
      description: 'Romaine lettuce, croutons, parmesan',
      price: 8.99,
      category: 'Salad',
      restaurantId: restaurant1.id,
    },
    {
      name: 'Garlic Bread',
      description: 'Fresh baked with garlic butter',
      price: 5.99,
      category: 'Sides',
      restaurantId: restaurant1.id,
    },
  ];

  await prisma.menuItem.createMany({
    data: pizzaItems,
  });

  console.log('Created menu items for Pizza Palace');

  // Create menu items for Sushi Express
  const sushiItems = [
    {
      name: 'California Roll',
      description: 'Crab, avocado, cucumber',
      price: 10.99,
      category: 'Rolls',
      restaurantId: restaurant2.id,
    },
    {
      name: 'Salmon Nigiri',
      description: 'Fresh salmon over rice',
      price: 12.99,
      category: 'Nigiri',
      restaurantId: restaurant2.id,
    },
    {
      name: 'Spicy Tuna Roll',
      description: 'Tuna with spicy mayo',
      price: 11.99,
      category: 'Rolls',
      restaurantId: restaurant2.id,
    },
    {
      name: 'Miso Soup',
      description: 'Traditional Japanese soup',
      price: 3.99,
      category: 'Soup',
      restaurantId: restaurant2.id,
    },
    {
      name: 'Edamame',
      description: 'Steamed soybeans',
      price: 4.99,
      category: 'Appetizers',
      restaurantId: restaurant2.id,
    },
  ];

  await prisma.menuItem.createMany({
    data: sushiItems,
  });

  console.log('Created menu items for Sushi Express');

  // Create a sample event
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0); // 2 PM tomorrow

  const event = await prisma.event.create({
    data: {
      title: 'Team Lunch - Pizza',
      description: 'Weekly team lunch gathering',
      deliveryLocation: 'Office Conference Room A',
      orderDeadline: tomorrow,
      paymentMethod: 'EVENT_CREATOR',
      status: 'OPEN',
      createdById: adminUser.id,
      restaurantId: restaurant1.id,
      companyId: company.id,
    },
  });

  console.log('Created event:', event.title);

  // Add admin user as participant
  await prisma.eventParticipant.create({
    data: {
      userId: adminUser.id,
      eventId: event.id,
    },
  });

  console.log('Added admin user as participant');

  // Note: Commented out delivery receipts seed since notifications don't exist yet
  // Uncomment after creating the referenced notifications
  /*
  // Seed sample delivery receipts for telemetry dashboards
  await prisma.notificationDeliveryReceipt.createMany({
    data: [
      {
        notificationId: 'seed-notification-ws',
        userId: adminUser.id,
        companyId: company.id,
        channel: 'REALTIME',
        status: 'SUCCESS',
        latencyMs: 1200,
        deliveredAt: new Date(),
      },
      {
        notificationId: 'seed-notification-push',
        userId: regularUser.id,
        companyId: company.id,
        channel: 'PUSH',
        status: 'FAILED',
        latencyMs: 2400,
        deliveredAt: new Date(),
        errorCode: '410',
        errorMessage: 'Subscription expired',
      },
    ],
  });

  console.log('Seeded sample delivery receipts');
  */

  console.log('\n=== Seed completed successfully! ===');
  console.log('\nLogin credentials:');
  console.log('Admin: admin@demo.com / password123');
  console.log('User: user@demo.com / password123');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
