#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "--- Installing Python Backend Dependencies ---"
pip install -r requirements.txt

echo "--- Building React Frontend Bundle ---"
if command -v npm &> /dev/null; then
  echo "Found npm, building frontend..."
  cd frontend
  npm install
  npm run build
  cd ..
  echo "Frontend build generated in frontend/dist"
elif [ -d "frontend/dist" ]; then
  echo "npm not detected, using existing pre-built frontend/dist bundle."
else
  echo "ERROR: Neither npm nor frontend/dist was found!"
  exit 1
fi

echo "--- Build completed successfully! ---"
