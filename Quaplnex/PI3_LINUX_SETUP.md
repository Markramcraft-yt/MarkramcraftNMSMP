# Quaplnex on Raspberry Pi OS Headless (Pi3)

Complete setup guide for running Quaplnex backend + web on Raspberry Pi 3 headless.

## Hardware Info
- **Device:** Raspberry Pi 3
- **RAM:** 1GB
- **CPU:** ARMv7 (32-bit)
- **Storage:** 16GB+ microSD recommended
- **OS:** Raspberry Pi OS Lite (headless)

---

## Part 1: Initial Pi3 Setup

### Flash Raspberry Pi OS

1. **Download Pi Imager:** https://www.raspberrypi.com/software/
2. **Flash microSD card** with Raspberry Pi OS Lite (32-bit)
3. **Enable SSH:**
   - Before booting, create empty file named `ssh` in boot partition
   - Or use `raspi-config` after first boot

4. **Find Pi3 IP:**
   ```bash
   # On your main machine
   ping raspberrypi.local
   # Or check your router's connected devices
   ```

5. **SSH into Pi3:**
   ```bash
   ssh pi@raspberrypi.local
   # Default password: raspberry
   ```

### Initial Configuration

```bash
# Update system
sudo apt update
sudo apt upgrade -y

# Change password (IMPORTANT!)
passwd

# Set timezone
sudo raspi-config
# → Localization Options → Timezone → Select your timezone
# → Exit

# Enable I2C/SPI if needed (optional)
sudo raspi-config
# → Interface Options → Enable as needed
# → Exit

# Reboot
sudo reboot
```

---

## Part 2: Install .NET 8 Runtime

**Why .NET 8?** Better ARM support, smaller footprint than .NET 9

```bash
# SSH back in after reboot
ssh pi@raspberrypi.local

# Download .NET 8 ARM installer
cd ~
wget https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh
chmod +x ./dotnet-install.sh

# Install .NET 8 (32-bit ARM)
./dotnet-install.sh --channel 8.0 --architecture arm

# Add to PATH
echo 'export PATH=$PATH:$HOME/.dotnetruntime-8.0' >> ~/.bashrc
source ~/.bashrc

# Verify
dotnet --version
```

---

## Part 3: Install Node.js (for Web App)

```bash
# Install Node.js 18 LTS (ARM compatible)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version
npm --version
```

---

## Part 4: Prepare Backend

### Option A: Transfer from Development Machine

On your **development machine** (with Visual Studio):

1. **Build release version:**
   ```bash
   cd Quaplnex
   dotnet publish -c Release -o ./publish
   ```

2. **Copy to Pi3:**
   ```bash
   scp -r ./publish/Quaplnex.API/* pi@raspberrypi.local:~/quaplnex/
   ```

### Option B: Clone from GitHub

On **Pi3:**

```bash
# Clone repository (if on GitHub)
git clone https://github.com/YOUR_USERNAME/quaplnex.git
cd quaplnex

# Build on Pi3 (slow, ~15 minutes)
dotnet build -c Release

# Or just restore and use DLL
dotnet restore
```

### Create Backend Directory

```bash
mkdir -p ~/quaplnex
cd ~/quaplnex

# Create appsettings.json
nano appsettings.json
```

Paste this (update Gmail credentials):
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

---

## Part 5: Create Systemd Service for Backend

```bash
# Create service file
sudo nano /etc/systemd/system/quaplnex-backend.service
```

Paste this:
```ini
[Unit]
Description=Quaplnex Chat Backend
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/quaplnex
ExecStart=/home/pi/.dotnet/dotnet Quaplnex.API.dll
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Save: `Ctrl+X` → `Y` → `Enter`

```bash
# Enable service
sudo systemctl daemon-reload
sudo systemctl enable quaplnex-backend
sudo systemctl start quaplnex-backend

# Check status
sudo systemctl status quaplnex-backend

# View logs
sudo journalctl -u quaplnex-backend -f
```

---

## Part 6: Prepare Web App

```bash
mkdir -p ~/quaplnex-web
cd ~/quaplnex-web

# Copy React web app from your dev machine
# Or clone from GitHub
git clone https://github.com/YOUR_USERNAME/quaplnex-web.git .

# Install dependencies
npm install --production

# Build for production
npm run build

# Output goes to 'dist' folder
```

---

## Part 7: Install and Configure Nginx

Nginx will serve the React web app and proxy the API.

```bash
# Install Nginx
sudo apt install -y nginx

# Create config
sudo nano /etc/nginx/sites-available/default
```

Replace entire file with:
```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    # Serve React web app
    location / {
        root /home/pi/quaplnex-web/dist;
        try_files $uri /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Proxy API requests to backend
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

Save and restart Nginx:
```bash
sudo systemctl restart nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

---

## Part 8: Test Everything

```bash
# Test backend
curl http://localhost:5000/health

# Test Nginx
curl http://localhost/

# Check backend logs
sudo journalctl -u quaplnex-backend -f
```

---

## Part 9: Expose Worldwide with playit.gg

```bash
# Download playit.gg on Pi3
wget https://playit.gg/downloads/playit-linux-arm.zip
unzip playit-linux-arm.zip
chmod +x playit

# Run playit
./playit

# Follow prompts to create tunnel
# Point to: localhost:80 (Nginx proxy)
# Get public URL
```

---

## Part 10: Access Quaplnex

### Local Network
```
http://raspberrypi.local
http://PI_IP_ADDRESS
```

### Worldwide (via playit.gg)
```
https://your-quaplnex-xxxxx.playit.gg
```

---

## Performance Tips for Pi3

### 1. Limit Node.js Memory
```bash
# Set max memory for Node
export NODE_OPTIONS="--max-old-space-size=256"
```

### 2. Disable Unused Services
```bash
# Disable Bluetooth (saves RAM)
sudo systemctl disable bluetooth

# Disable WiFi (if using Ethernet)
sudo nano /boot/config.txt
# Add: dtoverlay=disable-wifi

sudo reboot
```

### 3. Monitor System
```bash
# Check CPU/Memory
top

# Check disk space
df -h

# Check temperature
vcgencmd measure_temp
```

### 4. Database Optimization
SQLite settings in `appsettings.json`:
```
ConnectionStrings: "Data Source=quaplnex.db;Journal Mode=WAL;"
```

---

## Manage Services

```bash
# Check all services
sudo systemctl status

# Restart backend
sudo systemctl restart quaplnex-backend

# View backend logs
sudo journalctl -u quaplnex-backend -n 100 -f

# Check Nginx
sudo systemctl status nginx
nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## Update Quaplnex

### Update Backend
```bash
cd ~/quaplnex

# Get latest code (if using git)
git pull

# Rebuild
dotnet build -c Release

# Restart service
sudo systemctl restart quaplnex-backend
```

### Update Web App
```bash
cd ~/quaplnex-web

# Get latest code
git pull

# Rebuild
npm install --production
npm run build

# Nginx auto-serves from dist folder
```

---

## Troubleshooting

### Backend won't start
```bash
# Check logs
sudo journalctl -u quaplnex-backend -e

# Check port 5000
sudo netstat -tulpn | grep 5000

# Check database permissions
ls -la ~/quaplnex/quaplnex.db
```

### Web app not loading
```bash
# Check Nginx
sudo nginx -t
sudo systemctl restart nginx

# Check files exist
ls -la ~/quaplnex-web/dist/

# Check logs
sudo tail -f /var/log/nginx/error.log
```

### Out of memory
```bash
# Pi3 only has 1GB
# Kill unused processes
ps aux | sort -k 4 -rn | head -5

# Check RAM usage
free -h
```

### Too slow
- Reduce Node.js max memory further
- Consider disabling non-essential services
- Use `pm2` to manage processes more efficiently

---

## Backup Database

```bash
# Backup
cp ~/quaplnex/quaplnex.db ~/quaplnex/quaplnex.db.backup

# Automated daily backup
sudo nano /etc/cron.daily/quaplnex-backup
```

Add:
```bash
#!/bin/bash
cp /home/pi/quaplnex/quaplnex.db /home/pi/quaplnex/quaplnex.db.$(date +%Y%m%d)
```

---

## Done! 🚀

Your Quaplnex is now running on **Raspberry Pi 3 headless**!

### Summary
- **Backend:** Running on port 5000 (systemd service)
- **Web App:** Served via Nginx on port 80
- **Database:** SQLite (auto-created)
- **Worldwide:** Via playit.gg tunnel
- **Logs:** View with `sudo journalctl -u quaplnex-backend -f`

### Commands Cheat Sheet
```bash
# SSH into Pi
ssh pi@raspberrypi.local

# Check backend status
sudo systemctl status quaplnex-backend

# View logs
sudo journalctl -u quaplnex-backend -f

# Restart everything
sudo systemctl restart quaplnex-backend nginx

# Check system resources
top
df -h
free -h
```

You're all set! 🎉
