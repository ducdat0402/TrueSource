#!/bin/bash

/**
 * Script để export Docker images thành file tar
 * Sử dụng: ./scripts/export-docker-images.sh
 */

echo "🐳 Exporting Docker images..."

# Tạo thư mục output
mkdir -p docker-package
cd docker-package

# Build images trước
echo "📦 Building images..."
cd ..
docker-compose -f docker/docker-compose.yml build

# Export backend image
echo "📤 Exporting backend image..."
docker save docker-backend:latest -o docker-package/truesource-backend.tar

# Export frontend image
echo "📤 Exporting frontend image..."
docker save docker-frontend:latest -o docker-package/truesource-frontend.tar

# Copy docker-compose.yml
echo "📋 Copying docker-compose.yml..."
cp docker/docker-compose.yml docker-package/

# Copy .env.example
echo "📋 Copying .env.example..."
cp backend/.env.example docker-package/backend.env.example

# Copy Dockerfiles và nginx.conf
echo "📋 Copying Dockerfiles..."
mkdir -p docker-package/backend docker-package/frontend
cp backend/Dockerfile docker-package/backend/
cp frontend/Dockerfile docker-package/frontend/
cp frontend/nginx.conf docker-package/frontend/

# Tạo script load images
echo "📝 Creating load-images script..."
cat > docker-package/load-images.sh << 'EOF'
#!/bin/bash
echo "Loading Docker images..."
docker load -i truesource-backend.tar
docker load -i truesource-frontend.tar
echo "✅ Images loaded successfully!"
EOF

chmod +x docker-package/load-images.sh

# Tạo README cho package
echo "📝 Creating README..."
cat > docker-package/README.md << 'EOF'
# TrueSource Docker Package

## Cài Đặt

1. Load Docker images:
   ```bash
   chmod +x load-images.sh
   ./load-images.sh
   ```

2. Tạo file .env:
   ```bash
   cp backend.env.example ../backend/.env
   # Chỉnh sửa .env với các giá trị phù hợp
   ```

3. Chạy Docker Compose:
   ```bash
   docker-compose up -d
   ```

4. Truy cập:
   - Frontend: http://localhost:3001
   - Backend: http://localhost:3000
EOF

echo "✅ Export completed!"
echo "📦 Package location: docker-package/"
echo ""
echo "Để tạo file ZIP:"
echo "  cd docker-package"
echo "  zip -r ../truesource-docker-package.zip ."






