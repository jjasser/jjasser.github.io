#!/bin/bash

echo "Enter your commit message:"
read commit_message

# Add all files to staging
git add .

# Commit with the provided message
git commit -m "$commit_message"

# Push changes to the main branch
git push -u origin main