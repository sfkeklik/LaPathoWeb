# 🦷 LaPatho - Dental Annotation System

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Java](https://img.shields.io/badge/Java-17-orange.svg)
![Angular](https://img.shields.io/badge/Angular-17-red.svg)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-brightgreen.svg)

**Diş hekimliği ve patoloji görüntüleri için profesyonel anotasyon sistemi**

[English](#english) | [Türkçe](#türkçe)

</div>

---

## Türkçe

### 📋 İçindekiler

- [Özellikler](#-özellikler)
- [Sistem Gereksinimleri](#-sistem-gereksinimleri)
- [Kurulum](#-kurulum)
- [Kullanım](#-kullanım)
- [API Dokümantasyonu](#-api-dokümantasyonu)
- [Proje Yapısı](#-proje-yapısı)
- [Katkıda Bulunma](#-katkıda-bulunma)

### ✨ Özellikler

#### 🖼️ Görüntü İşleme
- **Çoklu Format Desteği**: TIFF, BIF, PNG, JPEG, JPG formatlarında görüntü yükleme
- **Tile Tabanlı Görüntüleme**: Büyük patoloji görüntüleri için optimize edilmiş tile sistemi
- **Bio-Formats Entegrasyonu**: Tıbbi görüntü formatları için profesyonel destek
- **Çoklu Görüntü Yükleme**: Aynı anda birden fazla görüntü yükleme imkanı

#### 🏷️ Anotasyon Araçları
- **Dikdörtgen Anotasyon**: Bölge seçimi için dikdörtgen çizim aracı
- **Nokta Anotasyon**: Hassas nokta işaretleme
- **Polygon Anotasyon**: Serbest şekil çizimi
- **Özelleştirilebilir Etiketler**: Proje bazlı dinamik etiket sistemi
- **Renk Kodlama**: Her etiket için otomatik renk ataması

#### 👥 Kullanıcı Yönetimi
- **Rol Tabanlı Erişim**: Admin ve Doktor rolleri
- **Proje Bazlı Yetkilendirme**: Kullanıcılar sadece atandıkları projelerdeki görüntüleri görür
- **JWT Kimlik Doğrulama**: Güvenli token tabanlı oturum yönetimi

#### 🏗️ Proje Yönetimi
- **Çoklu Proje Desteği**: Farklı çalışmalar için ayrı projeler
- **Görüntü Atama**: Görüntüleri projelere atama
- **Etiket Yönetimi**: Her proje için özel etiket listesi
- **Proje Küçük Resmi**: Projelerde ilk görüntünün önizlemesi

#### 🌐 Çok Dilli Destek
- **Türkçe** 🇹🇷
- **İngilizce** 🇬🇧

#### 🎨 Modern Arayüz
- **Responsive Tasarım**: Tüm ekran boyutlarına uyumlu
- **Angular Material**: Modern ve tutarlı UI bileşenleri
- **OpenSeadragon**: Yüksek performanslı görüntü görüntüleyici
- **Annotorious**: Profesyonel anotasyon kütüphanesi

### 💻 Sistem Gereksinimleri

#### Minimum Gereksinimler
- **İşletim Sistemi**: Windows 10+, macOS 10.14+, Linux (Ubuntu 18.04+)
- **RAM**: 8 GB
- **Disk Alanı**: 10 GB (görüntüler hariç)
- **Java**: JDK 17+
- **Node.js**: 18+
- **Docker**: 20.10+ (opsiyonel)

#### Önerilen Gereksinimler
- **RAM**: 16 GB+
- **Disk Alanı**: SSD, 50 GB+
- **İşlemci**: 4+ çekirdek

### 🚀 Kurulum

#### Docker ile Kurulum (Önerilen)

```bash
# Repository'yi klonlayın
git clone https://github.com/sfkeklik/LaPathoWeb.git
cd LaPathoWeb

# Docker Compose ile başlatın
docker-compose up -d

# Uygulamaya erişin
# Frontend: http://localhost:4200
# Backend API: http://localhost:8080
```

#### Manuel Kurulum

##### 1. Veritabanı Kurulumu

```bash
# PostgreSQL kurulumu (Docker ile)
docker run -d \
  --name lapatho-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=secretpassword \
  -e POSTGRES_DB=lapatho \
  -p 5432:5432 \
  postgres:15
```

##### 2. Backend Kurulumu

```bash
# Proje dizinine gidin
cd LaPathoWeb

# Maven ile derleyin
./mvnw clean package -DskipTests

# Uygulamayı başlatın
java -jar target/lapatho-*.jar
```

##### 3. Frontend Kurulumu

```bash
# Frontend dizinine gidin
cd src/main/web-ui

# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm start

# Veya production build
npm run build
```

### 📖 Kullanım

#### İlk Giriş

1. Tarayıcınızda `http://localhost:4200` adresine gidin
2. Varsayılan admin hesabı ile giriş yapın:
   - **Kullanıcı Adı**: `admin`
   - **Şifre**: `admin123`

#### Admin Paneli

Admin paneline giriş yaptıktan sonra şu işlemleri yapabilirsiniz:

| Sekme | İşlev |
|-------|-------|
| **Kullanıcı Yönetimi** | Yeni kullanıcı ekleme, düzenleme, silme |
| **Proje Yönetimi** | Proje oluşturma, kullanıcı atama |
| **Görüntü Yönetimi** | Görüntüleri projelere atama, silme |
| **Etiket Yönetimi** | Proje bazlı etiket ekleme/düzenleme |

#### Görüntü Anotasyonu

1. Ana sayfada bir görüntü seçin
2. Anotasyon araçlarından birini seçin:
   - 🔲 **Dikdörtgen**: Bölge seçimi
   - 📍 **Nokta**: Hassas işaretleme
   - 🔷 **Polygon**: Serbest şekil
3. Görüntü üzerinde çizim yapın
4. Açılan pencereden etiket seçin
5. Anotasyon otomatik kaydedilir

#### Çoklu Görüntü Yükleme

1. Admin panelinde "Görüntü Yönetimi" sekmesine gidin
2. "Görüntü Yükle" butonuna tıklayın
3. Birden fazla dosya seçin
4. Yükleme ilerlemesini takip edin

### 📡 API Dokümantasyonu

#### Kimlik Doğrulama

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

#### Görüntü İşlemleri

```http
# Görüntü yükleme
POST /api/images/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

# Tüm görüntüleri listeleme
GET /api/images
Authorization: Bearer {token}

# Görüntü silme (sadece admin)
DELETE /api/images/{id}
Authorization: Bearer {token}
```

#### Proje İşlemleri

```http
# Projeleri listeleme
GET /api/projects
Authorization: Bearer {token}

# Yeni proje oluşturma
POST /api/projects
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Dental Projesi",
  "description": "Diş görüntüleri anotasyonu"
}

# Projeye görüntü ekleme
POST /api/projects/{projectId}/images/{imageId}
Authorization: Bearer {token}
```

#### Anotasyon İşlemleri

```http
# Anotasyonları kaydetme
POST /api/annotations
Authorization: Bearer {token}
Content-Type: application/json

{
  "imageId": 1,
  "type": "RECTANGLE",
  "coordinates": {...},
  "label": "cavity"
}

# Görüntüye ait anotasyonları getirme
GET /api/annotations/image/{imageId}
Authorization: Bearer {token}
```

#### Etiket İşlemleri

```http
# Proje etiketlerini listeleme
GET /api/labels/project/{projectId}
Authorization: Bearer {token}

# Yeni etiket ekleme
POST /api/labels
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "cavity",
  "color": "#FF5733",
  "projectId": 1
}
```

### 📁 Proje Yapısı

```
LaPathoWeb/
├── 📁 src/
│   ├── 📁 main/
│   │   ├── 📁 java/com/cvlab/spring/LaPatho/
│   │   │   ├── 📄 FileUploadController.java    # Dosya yükleme
│   │   │   ├── 📄 ImageController.java         # Görüntü işlemleri
│   │   │   ├── 📄 TileController.java          # Tile servisi
│   │   │   ├── 📄 TileService.java             # Tile üretimi
│   │   │   ├── 📁 project/                     # Proje modülü
│   │   │   │   ├── 📁 controller/
│   │   │   │   ├── 📁 entity/
│   │   │   │   ├── 📁 repository/
│   │   │   │   └── 📁 service/
│   │   │   └── 📁 security/                    # Güvenlik modülü
│   │   │       ├── 📁 config/
│   │   │       ├── 📁 controller/
│   │   │       └── 📁 entity/
│   │   ├── 📁 resources/
│   │   │   ├── 📄 application.properties       # Uygulama ayarları
│   │   │   ├── 📄 application-docker.properties
│   │   │   └── 📄 schema.sql                   # Veritabanı şeması
│   │   └── 📁 web-ui/                          # Angular frontend
│   │       ├── 📁 src/
│   │       │   ├── 📁 app/
│   │       │   │   ├── 📁 components/
│   │       │   │   │   ├── 📁 admin/           # Admin paneli
│   │       │   │   │   ├── 📁 home/            # Ana sayfa
│   │       │   │   │   ├── 📁 image-annotator/ # Anotasyon bileşeni
│   │       │   │   │   ├── 📁 login/           # Giriş sayfası
│   │       │   │   │   └── 📁 language-switcher/
│   │       │   │   └── 📁 services/
│   │       │   └── 📁 assets/
│   │       │       └── 📁 i18n/                # Çeviri dosyaları
│   │       └── 📄 angular.json
├── 📁 uploads/                                 # Yüklenen görüntüler
├── 📁 tiles/                                   # Üretilen tile'lar
├── 📄 docker-compose.yml
├── 📄 Dockerfile.backend
└── 📄 pom.xml
```

### 🔧 Yapılandırma

#### application.properties

```properties
# Veritabanı
spring.datasource.url=jdbc:postgresql://localhost:5432/lapatho
spring.datasource.username=postgres
spring.datasource.password=secretpassword

# Upload ayarları
upload.base-path=./uploads
tile.base-path=./tiles

# JWT ayarları
jwt.secret=your-secret-key
jwt.expiration=86400000
```

#### Docker Ortam Değişkenleri

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `SPRING_DATASOURCE_URL` | PostgreSQL bağlantı URL'i | - |
| `SPRING_DATASOURCE_USERNAME` | Veritabanı kullanıcısı | postgres |
| `SPRING_DATASOURCE_PASSWORD` | Veritabanı şifresi | - |
| `UPLOAD_BASE_PATH` | Yükleme dizini | /app/uploads |
| `TILE_BASE_PATH` | Tile dizini | /app/tiles |

### 🐛 Sorun Giderme

#### Sık Karşılaşılan Hatalar

**1. Görüntü yüklenmiyor**
```bash
# Upload dizini izinlerini kontrol edin
chmod -R 755 ./uploads
```

**2. Tile'lar görünmüyor**
```bash
# Tile dizini izinlerini kontrol edin
chmod -R 755 ./tiles

# Health endpoint'ini kontrol edin
curl http://localhost:8080/api/images/health
```

**3. Veritabanı bağlantı hatası**
```bash
# PostgreSQL'in çalıştığından emin olun
docker ps | grep postgres

# Bağlantıyı test edin
psql -h localhost -U postgres -d lapatho
```

### 🤝 Katkıda Bulunma

1. Repository'yi fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'feat: Add amazing feature'`)
4. Branch'i push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

### 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

---

## English

### 📋 Table of Contents

- [Features](#-features-1)
- [System Requirements](#-system-requirements)
- [Installation](#-installation-1)
- [Usage](#-usage-1)
- [API Documentation](#-api-documentation-1)

### ✨ Features

#### 🖼️ Image Processing
- **Multi-format Support**: Upload images in TIFF, BIF, PNG, JPEG, JPG formats
- **Tile-based Viewing**: Optimized tile system for large pathology images
- **Bio-Formats Integration**: Professional support for medical image formats
- **Batch Upload**: Upload multiple images simultaneously

#### 🏷️ Annotation Tools
- **Rectangle Annotation**: Rectangle drawing tool for region selection
- **Point Annotation**: Precise point marking
- **Polygon Annotation**: Free-form shape drawing
- **Customizable Labels**: Project-based dynamic label system
- **Color Coding**: Automatic color assignment for each label

#### 👥 User Management
- **Role-based Access**: Admin and Doctor roles
- **Project-based Authorization**: Users only see images in their assigned projects
- **JWT Authentication**: Secure token-based session management

#### 🏗️ Project Management
- **Multi-project Support**: Separate projects for different studies
- **Image Assignment**: Assign images to projects
- **Label Management**: Custom label list for each project
- **Project Thumbnails**: Preview of first image in projects

#### 🌐 Multi-language Support
- **Turkish** 🇹🇷
- **English** 🇬🇧

### 💻 System Requirements

#### Minimum Requirements
- **OS**: Windows 10+, macOS 10.14+, Linux (Ubuntu 18.04+)
- **RAM**: 8 GB
- **Disk Space**: 10 GB (excluding images)
- **Java**: JDK 17+
- **Node.js**: 18+
- **Docker**: 20.10+ (optional)

### 🚀 Installation

#### Docker Installation (Recommended)

```bash
# Clone the repository
git clone https://github.com/sfkeklik/LaPathoWeb.git
cd LaPathoWeb

# Start with Docker Compose
docker-compose up -d

# Access the application
# Frontend: http://localhost:4200
# Backend API: http://localhost:8080
```

### 📖 Usage

#### First Login

1. Navigate to `http://localhost:4200` in your browser
2. Login with default admin credentials:
   - **Username**: `admin`
   - **Password**: `admin123`

#### Admin Panel

After logging in as admin, you can perform the following operations:

| Tab | Function |
|-----|----------|
| **User Management** | Add, edit, delete users |
| **Project Management** | Create projects, assign users |
| **Image Management** | Assign images to projects, delete |
| **Label Management** | Add/edit project-specific labels |

### 📡 API Documentation

See the Turkish section above for detailed API documentation.

---

<div align="center">

**Made with ❤️ for Dental Pathology Research**

[⬆ Back to Top](#-lapatho---dental-annotation-system)

</div>

