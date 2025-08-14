#!/bin/bash
# Docker Engine kurulum script'i - Ubuntu WSL için

echo "🐋 Docker Engine kurulumu başlıyor..."

# Sistem güncellemesi
sudo apt update
sudo apt upgrade -y

# Gerekli paketleri kur
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Docker'ın resmi GPG anahtarını ekle
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Docker repository'sini ekle
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Paket listesini güncelle
sudo apt update

# Docker Engine'i kur
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Docker Compose'u kur
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Kullanıcıyı docker grubuna ekle
sudo usermod -aG docker $USER

# Docker servisini başlat
sudo service docker start

echo "✅ Docker kurulumu tamamlandı!"
echo "⚠️  WSL'i yeniden başlatmanız gerekiyor: wsl --shutdown"
echo "📝 Sonra 'docker --version' ile test edin"
