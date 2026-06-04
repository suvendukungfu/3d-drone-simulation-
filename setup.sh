#!/bin/bash
set -e

echo "=========================================="
echo " Setting up Pluto X Drone Inspection Env"
echo "=========================================="

echo "1. Installing Node dependencies..."
npm install

echo "2. Copying 3D Model..."
mkdir -p public/models
mkdir -p src/components

if [ -f "PlutoX [Primus X2 v1].glb" ]; then
  cp "PlutoX [Primus X2 v1].glb" public/models/plutox.glb
elif [ -f "../PlutoX [Primus X2 v1].glb" ]; then
  cp "../PlutoX [Primus X2 v1].glb" public/models/plutox.glb
elif [ -f "../../PlutoX [Primus X2 v1].glb" ]; then
  cp "../../PlutoX [Primus X2 v1].glb" public/models/plutox.glb
else
  echo "Error: PlutoX [Primus X2 v1].glb not found!"
  exit 1
fi

echo "=========================================="
echo " Setup Complete! Starting Dev Server..."
echo "=========================================="
npm run dev
