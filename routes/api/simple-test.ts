export async function GET(_req: Request): Promise<Response> {
  return new Response(JSON.stringify({
    ok: true,
    message: "Simple test API is working!",
    timestamp: new Date().toISOString(),
    server: "Fresh + Deno"
  }), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    
    return new Response(JSON.stringify({
      ok: true,
      message: "POST request received",
      receivedData: body,
      timestamp: new Date().toISOString()
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: "Failed to process POST request",
      details: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
} 