import { Metadata } from "next";
import LoginClient from "./LoginClient";


export const metadata: Metadata = {
    title: "Sign In",   // Renders as "Sign In | Avexi" via template
    description:
        "Sign in to Avexi — your professional workspace suite for image editing, document management, and election information tools.",
    openGraph: {
        title: "Sign In to Avexi",
        description:
            "Access your professional workspace suite for image editing, document management, and election information tools.",
        url: "https://avexi.digital/login",
    },
    twitter: {
        title: "Sign In to Avexi",
        description:
            "Access your professional workspace suite for image editing, document management, and election information tools.",
    },
    // Tell crawlers the login page is fine to index
    robots: {
        index: true,
        follow: false, // Don't follow links from login page
    },
};

export default function LoginPage() {
    return <LoginClient />;
}