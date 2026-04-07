const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'mock_email@example.com',
    pass: process.env.SMTP_PASS || 'mock_password',
  },
});

const TARGET_EMAIL = 'ridamelkaouiofficial@gmail.com';

cron.schedule('0 9 * * 1', async () => {
  console.log('[Cron] Running weekly certificate reminder job...');
  try {
    const unvalidatedBatches = await prisma.batch.findMany({
      where: { status: 'RECEIVED' },
      include: { operator: true },
      orderBy: { receivedAt: 'desc' }
    });

    if (unvalidatedBatches.length === 0) {
      console.log('[Cron] All batches are validated. No email sent.');
      return;
    }

    const rows = unvalidatedBatches.map(b => `
      <tr>
        <td style="border:1px solid #ccc; padding:8px;">${b.reference}</td>
        <td style="border:1px solid #ccc; padding:8px;">${b.operator?.username || 'Unknown'}</td>
        <td style="border:1px solid #ccc; padding:8px;">${new Date(b.receivedAt).toLocaleDateString()}</td>
      </tr>
    `).join('');

    const htmlBody = `
      <h2>Weekly Reminder: Missing Certificates</h2>
      <p>The following batches are still strictly in the "RECEIVED" state and require immediate certificates:</p>
      <table style="border-collapse: collapse; width: 100%;">
        <tr style="background-color: #f2f2f2;">
          <th style="border:1px solid #ccc; padding:8px;">Reference</th>
          <th style="border:1px solid #ccc; padding:8px;">Operator</th>
          <th style="border:1px solid #ccc; padding:8px;">Received Date</th>
        </tr>
        ${rows}
      </table>
      <p><br/>Log into the QMS Intranet to process validations.</p>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_USER || '"QMS System" <qms@intranet.local>',
      to: TARGET_EMAIL,
      subject: `[QMS Action Required] ${unvalidatedBatches.length} Batches Missing Certificates`,
      html: htmlBody
    });

    console.log(`[Cron] Weekly email sent for ${unvalidatedBatches.length} batches.`);
  } catch (error) {
    console.error('[Cron] Failed to run weekly job:', error);
  }
});

console.log('Cron engine started. Scheduled weekly on Monday at 09:00 AM.');
