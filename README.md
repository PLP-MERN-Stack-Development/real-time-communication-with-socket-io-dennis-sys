**Socket.io Chat**

**Project Overview:**
- **Description:** A realtime chat application built with Socket.IO, Express (server) and React + Vite (client). The project demonstrates room-based chat, private messaging, typing indicators, message reactions, read receipts, file attachments (base64), pagination for message history, and an in-memory user store for demo purposes.

**Quick Links:**
- **Server:** `server/` — Express + Socket.IO backend (`server/server.js`).
- **Client:** `client/` — React + Vite frontend (`client/src/`).

**Prerequisites:**
- **Node.js:** v16+ (install from https://nodejs.org/)
- **npm:** comes with Node.js

**Setup & Run (Windows PowerShell):**

- Install server dependencies and start server (development):

```powershell
cd server; npm install; npm run dev
```

- Install client dependencies and start dev server (Vite):

```powershell
cd client; npm install; npm run dev
```

- Production build for client:

```powershell
cd client; npm run build
```

- Preview built client locally:

```powershell
cd client; npm run preview
```

**Environment Variables (server):**
- **Optional:** Create a `.env` file inside `server/` to override defaults:
  - `PORT` — server HTTP port (default `5000`)
  - `CLIENT_URL` — allowed CORS origin (default `http://localhost:5173`)

Example `.env` content:

```
PORT=5000
CLIENT_URL=http://localhost:5173
```

**Implemented Features:**
- **Room-based chat:** Users join a room (default `global`) and messages are broadcast to room members.
- **User join/leave:** Server emits `user_joined`, `user_left` and emits updated `user_list` for rooms.
- **Private messages:** `private_message` events deliver messages to a specific socket id and update unread counts.
- **Typing indicators:** `typing` events notify room members about who is typing.
- **Message pagination:** `fetch_messages` / `/api/messages/:room` supports paginated history.
- **Message reactions:** `message_reaction` updates reactions for messages and broadcasts them.
- **Read receipts & delivery ack:** `message_read` and `ack_message` events update read/delivered status.
- **File attachments:** Messages may include a `file` payload (base64 with `name` and `type`).
- **In-memory demo stores:** Uses in-memory objects for `users`, `messages`, `typingUsers`, and `unreadCounts` (suitable for demo/testing; not for production persistence).
- **API endpoints:**
  - `GET /api/messages/:room` — paginated messages for a room
  - `GET /api/users` — current connected users

**Code Structure (key files):**
- `server/server.js` — main server logic, socket handlers and simple APIs.
- `client/src/components/` — `Chat.jsx`, `MessageInput.jsx`, `MessageList.jsx`, `UsersList.jsx` implement the UI and socket interactions.
- `client/src/socket/socket.js` — client Socket.IO wrapper and connection setup.

**Notes & Troubleshooting:**
- If the client cannot connect to the server, ensure `CLIENT_URL` in `.env` (server) matches the client dev origin (Vite commonly runs on `http://localhost:5173`).
- If ports conflict, set `PORT` in `server/.env` or run client on a different port via Vite config.
- This project uses in-memory storage and is not persistent — restart will clear messages and user lists.

**Next Steps / Suggestions:**
- Add persistent storage (MongoDB, Redis) for messages and users.
- Add authentication (JWT) and persistent user accounts.
- Add file upload endpoints (instead of base64-in-message) and streaming for large files.
- Add tests for socket events and simple E2E tests for message flows.

---

If you'd like, I can also:
- Add a small `.env.example` in `server/`.
- Update `client/src/socket/socket.js` to read `import.meta.env.VITE_SERVER_URL` (if you want configurable client server URL).
