export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function errorResponse(error: unknown) {
  if (error instanceof ApiError) return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  // Keep connection strings, ORM messages and private data out of API responses.
  console.error('Invitation operation failed:', error instanceof Error ? error.name : 'Unknown error');
  return Response.json({ error: { code: 'INTERNAL_ERROR', message: 'Unable to complete this request. Please try again.' } }, { status: 500 });
}
