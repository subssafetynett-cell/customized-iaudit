UPDATE "User" 
SET "trialEndDate" = NOW() + INTERVAL '10 days', 
    "subscriptionStatus" = 'trial' 
WHERE id = (SELECT id FROM "User" ORDER BY "createdAt" DESC LIMIT 1);

UPDATE "User" 
SET "trialEndDate" = NOW() + INTERVAL '2 days', 
    "subscriptionStatus" = 'trial' 
WHERE id = (SELECT id FROM "User" ORDER BY "createdAt" DESC LIMIT 1 OFFSET 1);
