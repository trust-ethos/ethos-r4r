import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  async GET(req) {
    try {
      const url = new URL(req.url);
      const userkey = url.searchParams.get("userkey");

      if (!userkey) {
        return new Response(JSON.stringify({
          ok: false,
          error: "Userkey is required"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const response = await fetch(`https://api.ethos.network/api/v2/score/${encodeURIComponent(userkey)}`, {
        method: "GET",
        headers: {
          "Accept": "*/*",
        },
      });

      const data = await response.json();

      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      console.error("Error fetching Ethos score:", error);
      return new Response(JSON.stringify({
        ok: false,
        error: "Failed to fetch Ethos score"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
}; 