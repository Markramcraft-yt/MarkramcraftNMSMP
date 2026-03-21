# Quaplnex on Ubuntu Core (Raspberry Pi 3)

Setup guide for running Quaplnex on Ubuntu Core headless.

## Important: Ubuntu Core Differences

Ubuntu Core uses **snaps** for everything (containerized apps).

**Key differences:**
- No apt-get (uses `snap` instead)
- Everything runs in confined containers
- Different filesystem structure
- Better security, slower setup

---

## Part 1: Initial Ubuntu Core Setup

### Flash Ubuntu Core

1. Download Ubuntu Core for Pi3: https://ubuntu.com/download/raspberry-pi/core
2. Flash to microSD using Balena Etcher or similar
3. Boot Pi3
4. Wait ~2 minutes for first boot setup

### SSH Setup

```bash
# On your dev machine, find Pi3 IP
nmap -p 22 192.168.1.0/24
# or check router admin panel

# SSH in (no password, use ssh key)
ssh ubuntu@UBUNTU_CORE_IP

# First time: may need to set password
sudo passwd ubuntu
```

---

## Part 2: System Updates

```bash
# Update snap daemon
sudo snap refresh snapd

# System updates
sudo apt update
sudo apt upgrade -y

# Check Ubuntu version
lsb_release -a
```

---

## Part 3: Install .NET Runtime (via Snap)

**Ubuntu Core limitation:** .NET snap has limited ARM support

```bash
# Check available .NET snaps
snap search dotnet

# Install .NET 8 SDK snap
sudo snap install dotnet-sdk --classic --channel=8.0

# Verify
dotnet --version
```

**Note:** Snap installation is slower on Pi3. Be patient!

---

## Part 4: Install Node.js (via Snap)

```bash
# Install Node.js
sudo snap install node --classic --channel=18

# Verify
node --version
npm --version
```

---

## Part 5: Install Nginx (via Snap)

```bash
# Install Nginx
sudo snap install nginx

# Enable and start
sudo snap start nginx
sudo snap enable nginx

# Check status
sudo snap services nginx
```

---

## Part 6: Prepare Backend

### Create Directory Structure

```bash
# Make directories
mkdir -p ~/quaplnex
mkdir -p ~/quaplnex-web
cd ~/quaplnex

# If transferring from dev machine:
# scp -r ~/path/to/Quaplnex/publish/* ubuntu@UBUNTU_CORE_IP:~/quaplnex/
```

### Create appsettings.json

```bash
nano ~/quaplnex/appsettings.json
```

Paste (update Gmail credentials):
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=quaplnex.db"
  },
  "JwtSettings": {
    "Secret": "your-super-secret-jwt-key-change-this-XXXXXXXX",
    "ExpiryMinutes": 10080
  },
  "EmailSettings": {
    "Provider": "Gmail",
    "User": "your-email@gmail.com",
    "Password": "your-16-char-app-password",
    "FromEmail": "your-email@gmail.com"
  }
}
```

Save: `Ctrl+X` → `Y` → `Enter`

---

## Part 7: Test Backend Manually

```bash
# Navigate to backend
cd ~/quaplnex

# Test run (will hang, press Ctrl+C to stop)
dotnet Quaplnex.API.dll

# Check if it listens on port 5000
curl http://localhost:5000/health
```

---

## Part 8: Create Systemd Service for Backend

```bash
# Create service file
sudo nano /etc/systemd/system/quaplnex-backend.service
```

Paste:
```ini
[Unit]
Description=Quaplnex Chat Backend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/quaplnex
ExecStart=/snap/bin/dotnet /home/ubuntu/quaplnex/Quaplnex.API.dll
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Save and enable:
```bash
sudo systemctl daemon-reload
sudo systemctl enable quaplnex-backend
sudo systemctl start quaplnex-backend

# Check status
sudo systemctl status quaplnex-backend

# View logs
sudo journalctl -u quaplnex-backend -f
```

---

## Part 9: Prepare Web App

```bash
cd ~/quaplnex-web

# Transfer from dev machine or clone
# scp -r ~/quaplnex-web/* ubuntu@UBUNTU_CORE_IP:~/quaplnex-web/

# Install dependencies
npm install --production

# Build
npm run build

# Check dist folder exists
ls dist/
```

---

## Part 10: Configure Nginx on Ubuntu Core

Ubuntu Core Nginx snap stores config differently:

```bash
# Check Nginx config location
snap info nginx

# Create config (snap-friendly location)
sudo mkdir -p /var/snap/nginx/common/conf.d
sudo nano /var/snap/nginx/common/conf.d/quaplnex.conf
```

Paste:
```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    # Serve React web app
    location / {
        root /home/ubuntu/quaplnex-web/dist;
        try_files $uri /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Proxy API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Proxy WebSocket
    location /api/chat {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

Save: `Ctrl+X` → `Y` → `Enter`

```bash
# Test Nginx config
sudo snap run nginx -t

# Restart Nginx
sudo snap restart nginx

# Check status
sudo snap services nginx
```

---

## Part 11: Test Everything

```bash
# Test backend
curl http://localhost:5000/health

# Test web app
curl http://localhost/

# Check backend logs
sudo journalctl -u quaplnex-backend -f

# Monitor resources
top
```

---

## Part 12: Expose with playit.gg

```bash
# Download playit for ARM
wget https://github.com/playit-cloud/playit/releases/download/latest/playit-linux-arm
chmod +x playit

# Run it
./playit

# Follow prompts:
# - Create account
# - Create tunnel pointing to localhost:80
# - Get public URL
```

Keep playit running:
```bash
# Create systemd service for playit
sudo nano /etc/systemd/system/playit.service
```

Paste:
```ini
[Unit]
Description=playit.gg Tunnel
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu
ExecStart=/home/ubuntu/playit
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl daemon-reload
sudo systemctl enable playit
sudo systemctl start playit
sudo systemctl status playit
```

---

## Access Quaplnex

### Local Network
```
http://UBUNTU_CORE_IP
```

### Worldwide
```
https://your-quaplnex-xxxxx.playit.gg
```

---

## Ubuntu Core Specific Commands

```bash
# List installed snaps
snap list

# Update all snaps
sudo snap refresh

# Check snap logs
sudo snap logs nginx -f
sudo snap logs -u quaplnex-backend

# Restart snap services
sudo snap restart nginx
sudo snap restart dotnet-sdk

# Remove snap
sudo snap remove nginx
```

---

## Performance Optimization for Pi3 + Ubuntu Core

### Reduce Memory Usage

```bash
# Disable unnecessary services
sudo systemctl disable --now apport.service
sudo systemctl disable --now snapd.service  # Only if not using other snaps

# Limit Node/Dotnet memory
export NODE_OPTIONS="--max-old-space-size=256"
```

### Monitor Resources

```bash
# Check free memory
free -h

# Check disk usage
df -h

# Check CPU temperature
cat /sys/class/thermal/thermal_zone0/temp  # Divide by 1000

# Check system load
uptime
```

---

## Troubleshooting Ubuntu Core

### Backend won't start
```bash
# Check if port 5000 is in use
sudo netstat -tulpn | grep 5000

# Check snap logs
sudo snap logs -u quaplnex-backend -f

# Check systemd logs
sudo journalctl -u quaplnex-backend -e
```

### Nginx not serving web app
```bash
# Check Nginx snap status
sudo snap services nginx

# Check Nginx error log
tail -f /var/snap/nginx/common/access.log
tail -f /var/snap/nginx/common/error.log

# Reload Nginx
sudo snap restart nginx
```

### Out of memory errors
```bash
# Check memory
free -h

# Kill unused processes
ps aux | sort -k 4 -rn | head

# Restart services to free memory
sudo systemctl restart quaplnex-backend
sudo snap restart nginx
```

### Snap installation too slow
- Ubuntu Core snap installation on Pi3 can be **very slow** (10-30 minutes)
- Don't interrupt it
- Check progress with `snap changes`
- Be patient!

```bash
# Check snap installation progress
snap changes

# Watch a specific task
snap tasks <change-id>
```

---

## Manage Services

```bash
# Backend
sudo systemctl status quaplnex-backend
sudo systemctl restart quaplnex-backend
sudo journalctl -u quaplnex-backend -f

# Nginx
sudo snap services nginx
sudo snap restart nginx

# Playit
sudo systemctl status playit
sudo systemctl logs -u playit -f
```

---

## Backup Database

```bash
# Backup
cp ~/quaplnex/quaplnex.db ~/quaplnex/quaplnex.db.backup

# Automated daily backup
sudo crontab -e
# Add: 0 2 * * * cp /home/ubuntu/quaplnex/quaplnex.db /home/ubuntu/quaplnex/quaplnex.db.\$(date +\%Y\%m\%d)
```

---

## Done! 🚀

Your Quaplnex is running on **Ubuntu Core Pi3**!

### Cheat Sheet
```bash
# SSH in
ssh ubuntu@UBUNTU_CORE_IP

# Check backend
sudo systemctl status quaplnex-backend

# View backend logs
sudo journalctl -u quaplnex-backend -f

# Restart everything
sudo systemctl restart quaplnex-backend
sudo snap restart nginx
sudo snap restart playit

# Check resources
free -h
df -h
top
```

**Note:** Ubuntu Core is more secure but slower to setup. Worth it for production! 🔒
