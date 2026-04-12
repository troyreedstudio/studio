import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Email domains and addresses used by the Fiverr test team
const TEST_EMAIL_PATTERNS = [
  "mailinator.com",
  "nrlord.com",
  "lovleo.com",
  "testing@gmail.com",
];

function isTestEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return TEST_EMAIL_PATTERNS.some(
    (pattern) => lower.includes(pattern) || lower === pattern
  );
}

async function cleanTestData() {
  console.log("=== Clean Test Data ===\n");
  console.log("Looking for test users with emails matching:");
  TEST_EMAIL_PATTERNS.forEach((p) => console.log(`  - ${p}`));
  console.log();

  // 1. Find all test users
  const allUsers = await prisma.user.findMany({
    select: { id: true, fullName: true, email: true },
  });

  const testUsers = allUsers.filter((u) => isTestEmail(u.email));

  if (testUsers.length === 0) {
    console.log("No test users found. Database is clean.");
    return;
  }

  console.log(`Found ${testUsers.length} test user(s):`);
  testUsers.forEach((u) => console.log(`  - ${u.fullName} (${u.email})`));
  console.log();

  const testUserIds = testUsers.map((u) => u.id);

  // 2. Find all events created by test users
  const testEvents = await prisma.events.findMany({
    where: { userId: { in: testUserIds } },
    select: { id: true, eventName: true, userId: true },
  });

  console.log(`Found ${testEvents.length} test event(s):`);
  testEvents.forEach((e) => console.log(`  - ${e.eventName} (${e.id})`));
  console.log();

  if (testEvents.length > 0) {
    const testEventIds = testEvents.map((e) => e.id);

    // 3. Delete related records in dependency order

    // 3a. Find event tickets to delete their charges
    const testTickets = await prisma.eventTickets.findMany({
      where: { eventId: { in: testEventIds } },
      select: { id: true },
    });
    const testTicketIds = testTickets.map((t) => t.id);

    // 3b. Find event tables to delete their charges
    const testTables = await prisma.eventTable.findMany({
      where: { eventId: { in: testEventIds } },
      select: { id: true },
    });
    const testTableIds = testTables.map((t) => t.id);

    // Delete ticket charges
    if (testTicketIds.length > 0) {
      const ticketChargesResult = await prisma.ticketCharges.deleteMany({
        where: { eventTicketId: { in: testTicketIds } },
      });
      console.log(`  Deleted ${ticketChargesResult.count} ticket charge(s)`);
    }

    // Delete table charges
    if (testTableIds.length > 0) {
      const tableChargesResult = await prisma.tableCharges.deleteMany({
        where: { eventTableId: { in: testTableIds } },
      });
      console.log(`  Deleted ${tableChargesResult.count} table charge(s)`);
    }

    // Delete bookings for test events
    const bookingsResult = await prisma.booking.deleteMany({
      where: { eventId: { in: testEventIds } },
    });
    console.log(`  Deleted ${bookingsResult.count} booking(s)`);

    // Delete event favorites for test events
    const eventFavResult = await prisma.eventFavorite.deleteMany({
      where: { eventId: { in: testEventIds } },
    });
    console.log(`  Deleted ${eventFavResult.count} event favorite(s)`);

    // Delete event tickets
    const ticketsResult = await prisma.eventTickets.deleteMany({
      where: { eventId: { in: testEventIds } },
    });
    console.log(`  Deleted ${ticketsResult.count} event ticket(s)`);

    // Delete event tables
    const tablesResult = await prisma.eventTable.deleteMany({
      where: { eventId: { in: testEventIds } },
    });
    console.log(`  Deleted ${tablesResult.count} event table(s)`);

    // Delete the events themselves
    const eventsResult = await prisma.events.deleteMany({
      where: { id: { in: testEventIds } },
    });
    console.log(`  Deleted ${eventsResult.count} event(s)`);
  }

  console.log(`\n--- Summary ---`);
  console.log(`Test users found: ${testUsers.length}`);
  console.log(`Test events cleaned: ${testEvents.length}`);
  console.log(
    `\nNote: Test user accounts were NOT deleted (only their events and related data).`
  );
  console.log(
    `To delete the user accounts themselves, remove them manually or extend this script.`
  );
  console.log(`\nDone.`);
}

cleanTestData()
  .catch((error) => {
    console.error("Clean failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
