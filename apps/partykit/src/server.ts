/**
 * PartyKit Server Entry Point
 * 
 * This file serves as the main entry point for the PartyKit server.
 * The actual game logic is in src/rooms/game.ts
 */

export default {
  async fetch(request: Request) {
    return new Response('PartyKit Server Running - Use WebSocket connections to /parties/game-room/:roomId', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};
