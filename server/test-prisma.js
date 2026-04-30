import prisma from './src/prisma.js';

async function test() {
  try {
    const program = await prisma.auditProgram.findFirst();
    if (!program) {
      console.log("No audit program found in DB to test with.");
      return;
    }
    const plan = await prisma.auditPlan.create({
      data: {
        auditProgramId: program.id,
        executionId: 'test-exec-' + Date.now(),
        auditType: 'Internal',
        auditName: 'Test Name',
        templateId: 'iso-9001-2015-qms',
        date: new Date(),
        location: 'Location',
        scope: '',
        objective: '',
        criteria: '',
        leadAuditorId: null,
        auditors: { connect: [] },
        itinerary: [
          { id: "1", startTime: "09:00", endTime: "09:30", activity: "Opening Meeting", notes: "Intro" }
        ],
        userId: program.userId || null
      }
    });
    console.log("Success:", plan.id);
  } catch (e) {
    console.error("Prisma error:", e);
  }
}

test();
