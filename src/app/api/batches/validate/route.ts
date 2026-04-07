import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("certificate") as File | null;
    const batchId = formData.get("batchId") as string;

    if (!file || !batchId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Save PDF/Image locally
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || "pdf";
    const filename = `${Date.now()}-cert.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "certs");
    
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, filename), buffer);

    const publicPath = `/uploads/certs/${filename}`;

    // Update DB
    const batch = await prisma.batch.update({
      where: { id: batchId },
      data: {
        status: "VALIDATED",
        certificatePath: publicPath,
        validatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, batch });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
