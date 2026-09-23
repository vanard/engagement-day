function unavailable(): Response {
  return Response.json({ error: { code: 'NOT_READY', message: 'Buku tamu belum dibuka.' } }, {
    status: 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
export const GET = unavailable;
export const POST = unavailable;
