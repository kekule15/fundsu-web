import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
    });
}

export async function POST(req: Request) {
    try {
        const { walletAddress } = await req.json();

        if (!walletAddress) {
            return NextResponse.json(
                { error: "Missing walletAddress" },
                { status: 400 }
            );
        }

        // Use walletAddress as the Firebase UID
        const token = await admin.auth().createCustomToken(walletAddress);

        return NextResponse.json({ token });
    } catch (error: any) {
        console.error("Error creating custom token:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
