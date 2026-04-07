import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";
import { jwtVerify } from "jose";
import { transporter } from "@/lib/mailer";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-for-intranet');
const TARGET_EMAIL = 'ridamelkaouiofficial@gmail.com';

export async function POST(request: Request) {
  try {
    // 1. Authenticate Request via JWT
    const cookieStore = cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    let operatorId;
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      operatorId = payload.id as string;
    } catch (e) {
      return NextResponse.json({ error: "Invalid Token" }, { status: 401 });
    }

    // 2. Parse FormData
    const formData = await request.formData();
    const file = formData.get("labelImage") as File | null;
    let reference = formData.get("reference") as string;
    
    if (!reference) {
      reference = "BATCH-" + Math.floor(Math.random() * 100000);
    }

    if (!file) {
      return NextResponse.json({ error: "Missing label Image" }, { status: 400 });
    }

    // 3. Save File locally
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "labels");
    
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, filename), buffer);

    const publicPath = `/uploads/labels/${filename}`;

    // 4. Create DB Record
    const batch = await prisma.batch.create({
      data: {
        reference,
        operatorId, // Extracted securely from JWT
        labelImagePath: publicPath,
        status: "RECEIVED",
      },
      include: {
        operator: true
      }
    });

    // 5. Fire Email Alert (Non-blocking)
    transporter.sendMail({
      from: process.env.SMTP_USER || '"QMS System" <qms@intranet.local>',
      to: TARGET_EMAIL,
      subject: `[QMS Alert] New Batch Received: ${batch.reference}`,
      html: `
        <h2>New Batch Awaiting Validation</h2>
        <p><strong>Batch Ref:</strong> ${batch.reference}</p>
        <p><strong>Operator:</strong> ${batch.operator?.username}</p>
        <p><strong>Time:</strong> ${new Date(batch.receivedAt).toLocaleString()}</p>
        <hr />
        <p>Please log in to the QMS Dashboard to upload the corresponding Supplier Certificate.</p>
      `
    }).catch(err => console.error("SMTP Error:", err)); // Do not crash API if SMTP fails

    return NextResponse.json({ success: true, batch });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
