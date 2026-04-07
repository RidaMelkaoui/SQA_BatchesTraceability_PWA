import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-for-intranet');

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // Check against authorized hardcoded usernames and password
    const authorizedUsers = ["Reda", "Youssef", "Khaoula", "Aicha", "Manal"];
    const hardcodedPassword = "SQA2026";

    // Format input safely
    const formattedUsername = username.trim();

    // Case-insensitive check
    const isValidUser = authorizedUsers.find(u => u.toLowerCase() === formattedUsername.toLowerCase());

    if (!isValidUser || password !== hardcodedPassword) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    // Sync user with Database (seeding logic for tracking)
    let user = await prisma.user.findUnique({
      where: { username: isValidUser }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          username: isValidUser,
          password: hardcodedPassword, // Typically hashed, but cleartext for prototype requirement
          role: "OPERATOR"
        }
      });
    }

    // Generate JWT
    const token = await new SignJWT({ id: user.id, username: user.username, role: user.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    // Set HttpOnly Cookie
    const response = NextResponse.json({ success: true, user });
    
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
