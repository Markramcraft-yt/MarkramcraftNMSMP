# Quaplnex Backend

Complete .NET 8 backend for Quaplnex Discord alternative.

## Build & Deploy

### On Dev Machine (Linux/Mac)

```bash
cd Quaplnex
dotnet restore
dotnet publish -c Release -o ./publish
scp -r ./publish/Quaplnex.API/* ubuntu@192.168.0.121:~/quaplnex/
```

### On Raspberry Pi 3 (Ubuntu Server)

```bash
ssh ubuntu@192.168.0.121

# Install Mono runtime
sudo apt install -y mono-complete

# Run backend
cd ~/quaplnex
mono Quaplnex.API.dll

# Or use systemd service (see UBUNTU_SERVER_PI3_SETUP.md)
```

## Features

- ✅ REST API
- ✅ SignalR real-time chat
- ✅ User authentication (JWT)
- ✅ Server & channel management
- ✅ Message history
- ✅ Role-based permissions
- ✅ Email verification (Gmail)
- ✅ SQLite database

## Configuration

Edit `appsettings.json`:
- `ConnectionStrings.DefaultConnection` - SQLite database path
- `JwtSettings.Secret` - Change this to a random string in production!
- `EmailSettings` - Configure Gmail or other email provider

## API Endpoints

- `GET /health` - Health check
- `POST /auth/register` - Register user
- `POST /auth/login` - Login user
- `GET /api/servers` - List user's servers
- `POST /api/servers` - Create server
- `GET /api/channels/{serverId}` - List channels
- `GET /api/messages/{channelId}` - Get message history

## WebSocket (SignalR)

Connect to `ws://localhost:5000/api/chat`

Methods:
- `JoinChannel(channelId)` - Join a channel
- `SendMessage(channelId, message)` - Send message
- `NotifyTyping(channelId)` - User is typing

## Deployment

See `UBUNTU_SERVER_PI3_SETUP.md` for full deployment guide.
