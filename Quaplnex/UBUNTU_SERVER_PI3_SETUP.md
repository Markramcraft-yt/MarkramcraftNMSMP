# Quaplnex on Ubuntu Server (Raspberry Pi 3)

Complete setup for Quaplnex on Ubuntu Server headless.

## Part 1: Initial Ubuntu Server Setup

### Flash Ubuntu Server

1. Download Ubuntu Server 22.04 LTS for Pi3 (32-bit ARM): https://ubuntu.com/download/raspberry-pi
2. Flash to microSD with Balena Etcher
3. Boot Pi3
4. Wait for first boot (may take 2-3 minutes)

### SSH Setup

```bash
# On your dev machine, find Pi3
ping ubuntu.local
# or check router

# SSH in
ssh ubuntu@ubuntu.local
# Default password: ubuntu
# You'll be asked to change it on first login
```

---

## Part 2: System Update

```bash
# Update package lists
sudo apt update

# Upgrade packages
sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git nano htop

# Optional: Install useful tools
sudo apt install -y build-essential

# Reboot
sudo reboot
```

---

## Part 3: Install .NET 8 Runtime

```bash
# SSH back in
ssh ubuntu@ubuntu.local

# Download .NET 8 install script
wget https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh
chmod +x dotnet-install.sh

# Install .NET 8 for ARM32
./dotnet-install.sh --channel 8.0 --architecture arm

# Add .NET to PATH
echo 'export DOTNET_ROOT=$HOME/.dotnet' >> ~/.bashrc
echo 'export PATH=$PATH:$DOTNET_ROOT' >> ~/.bashrc
source ~/.bashrc

# Verify
dotnet --version
```

---

## Part 4: Install Node.js

```bash
# Update NodeSource repo
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js and npm
sudo apt install -y nodejs

# Verify
node --version
npm --version
```

---

## Part 5: Prepare Backend Files

### Option A: Transfer from Dev Machine

On your **dev machine:**
```bash
cd Quaplnex
dotnet publish -c Release -o ./publish
```

Then transfer:
```bash
scp -r ./publish/Quaplnex.API/* ubuntu@ubuntu.local:~/quaplnex/
```

### Option B: Clone from GitHub

On **Pi3:**
```bash
git clone https://github.com/YOUR_USERNAME/quaplnex.git quaplnex-src
cd quaplnex-src/Quaplnex.API
dotnet publish -c Release -o ~/quaplnex
```

### Create Backend Directory

```bash
mkdir -p ~/quaplnex
cd ~/quaplnex
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
    "Secret": "your-super-secret-jwt-key-change-this-in-production-XXXXXXXX",
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

### Test Backend Manually

```bash
cd ~/quaplnex
dotnet Quaplnex.API.dll

# In another SSH terminal, test
curl http://localhost:5000/health

# Should return: {"status":"ok","timestamp":"..."}
# Press Ctrl+C to stop
```

---

## Part 6: Create Systemd Service for Backend

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
ExecStart=/home/ubuntu/.dotnet/dotnet Quaplnex.API.dll
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Save: `Ctrl+X` → `Y` → `Enter`

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable quaplnex-backend
sudo systemctl start quaplnex-backend

# Check status
sudo systemctl status quaplnex-backend

# View logs (real-time)
sudo journalctl -u quaplnex-backend -f
```

---

## Part 7: Prepare Web App

```bash
# Create directory
mkdir -p ~/quaplnex-web
cd ~/quaplnex-web

# Transfer from dev machine or clone
# scp -r ~/quaplnex-web/* ubuntu@ubuntu.local:~/quaplnex-web/

# Install dependencies (production only)
npm install --production

# Build
npm run build

# Verify dist folder
ls dist/
```

---

## Part 8: Install and Configure Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Create Quaplnex config
sudo nano /etc/nginx/sites-available/quaplnex
```

Paste:
```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    # Serve React web app from dist
    location / {
        root /home/ubuntu/quaplnex-web;
        try_files $uri /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Proxy API requests
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy WebSocket (SignalR)
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
# Disable default site
sudo rm /etc/nginx/sites-enabled/default

# Enable Quaplnex site
sudo ln -s /etc/nginx/sites-available/quaplnex /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

---

## Part 9: Test Everything

```bash
# Test backend API
curl http://localhost:5000/health
# Should return: {"status":"ok","timestamp":"..."}

# Test web app
curl http://localhost/
# Should return HTML

# Check backend logs
sudo journalctl -u quaplnex-backend -f

# Monitor system
top
```

---

## Part 10: Expose Worldwide with playit.gg

```bash
# Download playit for ARM
wget https://github.com/playit-cloud/playit/releases/download/latest/playit-linux-arm -O playit
chmod +x playit

# Run it
./playit

# Follow prompts:
# 1. Create/login to account
# 2. Create tunnel
# 3. Point to localhost:80
# 4. Get public URL
```

Keep playit running in background:

```bash
# Create systemd service
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

Save and enable:
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
http://ubuntu.local
http://YOUR_PI_IP
```

### Worldwide (via playit.gg)
```
https://your-quaplnex-xxxxx.playit.gg
```

---

## Management Commands

```bash
# Backend service
sudo systemctl status quaplnex-backend
sudo systemctl restart quaplnex-backend
sudo systemctl stop quaplnex-backend
sudo journalctl -u quaplnex-backend -f

# Nginx
sudo systemctl status nginx
sudo systemctl restart nginx
sudo systemctl reload nginx

# playit
sudo systemctl status playit
sudo systemctl restart playit
sudo journalctl -u playit -f

# System resources
free -h          # Memory
df -h            # Disk space
top              # CPU/RAM usage
vcgencmd measure_temp  # CPU temperature
```

---

## Update Quaplnex

### Update Backend

```bash
cd ~/quaplnex

# If using git
git pull origin main

# Rebuild
dotnet publish -c Release -o .

# Restart service
sudo systemctl restart quaplnex-backend
```

### Update Web App

```bash
cd ~/quaplnex-web

# Get latest
git pull origin main

# Rebuild
npm install --production
npm run build

# Nginx serves from dist automatically
```

---

## Performance Optimization for Pi3

### Reduce Memory Usage

```bash
# Set Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=256"

# Add to ~/.bashrc for persistence
echo 'export NODE_OPTIONS="--max-old-space-size=256"' >> ~/.bashrc
```

### Disable Unnecessary Services

```bash
# Check what's running
systemctl list-units --type=service

# Disable unused services (examples)
sudo systemctl disable bluetooth
sudo systemctl disable cups
sudo systemctl disable avahi-daemon
```

### Monitor System

```bash
# Memory usage
free -h

# Disk usage
df -h

# Temperature (should stay below 60°C)
vcgencmd measure_temp

# CPU load
uptime

# Most resource-hungry processes
ps aux --sort=-%cpu | head -10
ps aux --sort=-%mem | head -10
```

---

## Database Backup

### Manual Backup

```bash
# Backup database
cp ~/quaplnex/quaplnex.db ~/quaplnex/quaplnex.db.backup

# Backup with timestamp
cp ~/quaplnex/quaplnex.db ~/quaplnex/quaplnex.db.$(date +%Y%m%d_%H%M%S)
```

### Automated Daily Backup

```bash
# Edit crontab
crontab -e

# Add this line (backup every day at 2 AM)
0 2 * * * cp /home/ubuntu/quaplnex/quaplnex.db /home/ubuntu/quaplnex/quaplnex.db.$(date +\%Y\%m\%d)
```

---

## Troubleshooting

### Backend won't start
```bash
# Check logs
sudo journalctl -u quaplnex-backend -e

# Check if port 5000 is in use
sudo netstat -tulpn | grep 5000

# Check permissions
ls -la ~/quaplnex/

# Test manually
cd ~/quaplnex && dotnet Quaplnex.API.dll
```

### Web app not loading
```bash
# Check Nginx
sudo nginx -t
sudo systemctl restart nginx

# Check dist folder
ls -la ~/quaplnex-web/dist/

# Check Nginx error log
sudo tail -50 /var/log/nginx/error.log

# Test with curl
curl http://localhost/
```

### Out of memory errors
```bash
# Check memory
free -h

# Kill heavy processes
ps aux | sort -k 4 -rn | head -5

# Restart services
sudo systemctl restart quaplnex-backend
sudo systemctl restart nginx
```

### Pi3 too slow
- Reduce tasks running simultaneously
- Check temperature: `vcgencmd measure_temp`
- Disable Bluetooth/WiFi if not needed
- Consider using SSD via USB instead of microSD

---

## Complete Setup Summary

```bash
# All-in-one quick reference
ssh ubuntu@ubuntu.local

# Check everything is running
sudo systemctl status quaplnex-backend
sudo systemctl status nginx
sudo systemctl status playit

# View all logs
sudo journalctl -u quaplnex-backend -f
sudo journalctl -u playit -f
tail -f /var/log/nginx/error.log

# System health
free -h
df -h
vcgencmd measure_temp
```

---

## Done! 🚀

Your Quaplnex is now running on **Ubuntu Server Pi3**!

### Key Points
- **Backend:** Systemd service at port 5000
- **Web App:** Nginx serving from ~/quaplnex-web/dist
- **Database:** SQLite at ~/quaplnex/quaplnex.db
- **Worldwide:** playit.gg tunnel at port 80
- **Logs:** View with `sudo journalctl -u quaplnex-backend -f`

### Quick Commands
```bash
ssh ubuntu@ubuntu.local
sudo systemctl status quaplnex-backend
sudo systemctl restart quaplnex-backend
sudo journalctl -u quaplnex-backend -f
free -h && df -h
```

You're all set! 🎉
