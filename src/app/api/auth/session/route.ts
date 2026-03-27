import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token } = body;

        if (!token) {
            return NextResponse.json({ error: "No token provided" }, { status: 400 });
        }

        const cookieStore = await cookies();

        cookieStore.set("auth-token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 3600, // 1 hour
            path: "/",
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
}

export async function DELETE() {
    const cookieStore = await cookies();

    // Specifying the path ensures the cookie is cleared globally
    cookieStore.set("auth-token", "", {
        path: "/",
        maxAge: 0
    });

    return NextResponse.json({ success: true });
}