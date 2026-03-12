import Link from "next/link";

export default function NotFoundPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-gray-50 dark:bg-gray-900">
            <h1 className="text-6xl font-black text-gray-200 dark:text-gray-700">404</h1>
            <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">Page not found</p>
            <p className="text-sm text-gray-400">You don't have access to this page.</p>
            <Link href="/dashboard" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">
                Go to Dashboard
            </Link>
        </div>
    );
}