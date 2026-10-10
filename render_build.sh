#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "--- Installing Python Backend Dependencies ---"
pip install -r requirements.txt

echo "--- Building React Frontend Bundle ---"
cd frontend
npm install
npm run build
cd ..

echo "--- Build completed successfully! ---"
