import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  async POST(req) {
    try {
      const body = await req.json();
      const { userkey, limit = 50, offset = 0 } = body;

      if (!userkey) {
        return new Response(JSON.stringify({
          ok: false,
          error: "Userkey is required"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const requestBody = {
        userkey,
        filter: ["review"], // Only get review activities
        excludeHistorical: false,
        orderBy: {
          field: "timestamp",
          direction: "desc"
        },
        limit,
        offset
      };

      const response = await fetch("https://api.ethos.network/api/v2/activities/profile/given", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody)
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
      console.error("Error fetching given activities from Ethos API:", error);
      return new Response(JSON.stringify({
        ok: false,
        error: "Failed to fetch given activities from Ethos API"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
}; 