#!/bin/bash
# SSH Key kurulum script'i - GitHub authentication için

echo "🔑 SSH Key kurulumu başlıyor..."

# SSH key kontrolü
if [ -f ~/.ssh/id_rsa ]; then
    echo "✅ SSH key zaten mevcut"
else
    echo "📝 Yeni SSH key oluşturuluyor..."
    echo "📧 GitHub email adresinizi girin:"
    read email
    ssh-keygen -t rsa -b 4096 -C "$email"
fi

# SSH agent'ı başlat
eval "$(ssh-agent -s)"

# SSH key'i agent'a ekle
ssh-add ~/.ssh/id_rsa

# Public key'i göster
echo ""
echo "🔑 Aşağıdaki SSH public key'ini GitHub'a eklemelisiniz:"
echo "----------------------------------------"
cat ~/.ssh/id_rsa.pub
echo "----------------------------------------"
echo ""
echo "📝 GitHub'da şu adımları takip edin:"
echo "1. GitHub.com → Settings → SSH and GPG keys"
echo "2. 'New SSH key' tıklayın"
echo "3. Yukarıdaki key'i kopyalayıp yapıştırın"
echo "4. 'Add SSH key' tıklayın"
echo ""
echo "✅ SSH kurulumu tamamlandı!"
echo "🔗 SSH ile clone: git clone git@github.com:sfkeklik/LaPathoWeb.git"
