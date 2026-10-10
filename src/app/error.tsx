'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="mx-auto max-w-lg px-6 py-16"><h1 className="text-3xl">We couldn’t load this page.</h1><p className="my-5">Please try again. If you’re setting up the app, check your database connection and server configuration.</p><button className="button" onClick={reset}>Try again</button></div>; }
