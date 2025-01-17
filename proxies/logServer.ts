import { serve } from "https://deno.land/std@0.131.0/http/server.ts";

const port = 8000;

const handler = async (request: Request): Promise<Response> => {
  console.log(request.method)
  console.log(request.headers)
  console.log(await request.text());  

  return new Response("Logged", { status: 200 });
};

console.log(`HTTP webserver running. Access it at: http://localhost:${port}/`);
await serve(handler, { port });
