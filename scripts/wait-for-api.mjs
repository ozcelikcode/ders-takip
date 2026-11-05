// Waits until the development API answers its health check, so the frontend dev server never starts first.
// An open tab reloads as soon as Vite is ready; if the API is still booting, the session refresh fails and the
// tab looks signed out.
const url = process.argv[2] ?? 'http://localhost:5002/api/health';
const deadline = Date.now() + 60_000;

while (true) {
  try {
    const response = await fetch(url);
    if (response.ok) break;
  } catch {
    // Not listening yet.
  }
  if (Date.now() > deadline) {
    console.error(`API did not answer at ${url} within 60 s; starting the frontend anyway.`);
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
}
