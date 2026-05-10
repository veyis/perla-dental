export default {
  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (!upgradeHeader || upgradeHeader !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    // Parse the incoming URL
    const url = new URL(request.url);
    
    // Construct the target ElevenLabs URL, preserving the path and query parameters
    const targetUrl = new URL(`wss://api.elevenlabs.io${url.pathname}${url.search}`);

    // Create the upstream connection to ElevenLabs
    const response = await fetch(targetUrl.toString(), {
      headers: request.headers,
    });

    // If the upstream upgrade failed, return the response as-is
    if (response.status !== 101) {
      return response;
    }

    // Extract the WebSockets from the incoming request and the upstream response
    // @ts-ignore - Cloudflare Workers specific API
    const { 0: clientSocket, 1: serverSocket } = new WebSocketPair();
    const upstreamSocket = response.webSocket;

    if (!upstreamSocket) {
      return new Response("Upstream socket missing", { status: 502 });
    }

    // Accept the client socket
    // @ts-ignore
    clientSocket.accept();
    // Accept the upstream socket
    // @ts-ignore
    upstreamSocket.accept();

    // Pipe messages Client -> Upstream
    clientSocket.addEventListener("message", (event) => {
      upstreamSocket.send(event.data);
    });

    // Pipe messages Upstream -> Client
    upstreamSocket.addEventListener("message", (event) => {
      clientSocket.send(event.data);
    });

    // Handle closure
    clientSocket.addEventListener("close", (event) => {
      // @ts-ignore
      upstreamSocket.close(event.code, event.reason);
    });
    upstreamSocket.addEventListener("close", (event) => {
      // @ts-ignore
      clientSocket.close(event.code, event.reason);
    });

    return new Response(null, {
      status: 101,
      // @ts-ignore
      webSocket: clientSocket,
    });
  },
};
