import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  async GET(req) {
    const url = new URL(req.url);
    const query = url.searchParams.get("query");
    const limit = url.searchParams.get("limit") || "10";
    const offset = url.searchParams.get("offset") || "0";

    if (!query || query.length < 2) {
      return new Response(JSON.stringify({
        ok: false,
        error: "Query must be at least 2 characters long"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const ethosUrl = `https://api.ethos.network/api/v1/search?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`;
      
      const response = await fetch(ethosUrl);
      const data = await response.json();

      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      console.error("Error fetching from Ethos API:", error);
      return new Response(JSON.stringify({
        ok: false,
        error: "Failed to fetch from Ethos API"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
}; 