import { Server } from "socket.io";

export default function setupBingo(server) {
  const io = new Server(server, { cors: { origin: "*" } });

  // Store room info
  const rooms = {};

  io.on("connection", (socket) => {
    console.log("🎮 Player connected:", socket.id);

    // Player joins a room
    socket.on("joinRoom", (room) => {
      if (!rooms[room]) {
        rooms[room] = { players: [], numbers: [], winner: null };
      }
      socket.join(room);
      rooms[room].players.push(socket.id);

      console.log(`👤 Player ${socket.id} joined room ${room}`);
      socket.emit("joinedRoom", { room, players: rooms[room].players });
      io.to(room).emit("playerJoined", { players: rooms[room].players });
    });

    // Start a new game (any player can trigger for now)
    socket.on("startGame", (room) => {
      if (!rooms[room]) return;

      rooms[room].numbers = shuffleNumbers();
      rooms[room].winner = null;

      io.to(room).emit("gameStarted", { numbers: rooms[room].numbers });
      console.log(`🎲 Game started in ${room}`);
    });

    // Player claims Bingo
    socket.on("claimBingo", (room) => {
      if (!rooms[room] || rooms[room].winner) return;

      rooms[room].winner = socket.id;
      io.to(room).emit("winnerDeclared", { winner: socket.id });
      console.log(`🏆 Winner in ${room}: ${socket.id}`);
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log("❌ Player disconnected:", socket.id);
      for (const room in rooms) {
        rooms[room].players = rooms[room].players.filter(
          (id) => id !== socket.id
        );
      }
    });
  });

  // Helper to shuffle numbers 1–75
  function shuffleNumbers() {
    return Array.from({ length: 75 }, (_, i) => i + 1).sort(
      () => Math.random() - 0.5
    );
  }
}
