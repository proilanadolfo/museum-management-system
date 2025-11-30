# Guide: How to Push to GitHub

## Step 1: Create a GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right corner
3. Select **"New repository"**
4. Fill in the details:
   - **Repository name**: `museum-management-system` (or any name you prefer)
   - **Description**: "Museum Management System - React Frontend & Node.js Backend"
   - Choose **Public** (so your colleagues can access it) or **Private** (if you want to invite specific people)
   - **DO NOT** check "Initialize with README" (we already have files)
5. Click **"Create repository"**

## Step 2: Copy the Repository URL

After creating the repository, GitHub will show you a page with commands. You'll see a URL like:
- `https://github.com/yourusername/museum-management-system.git` (HTTPS)
- OR `git@github.com:yourusername/museum-management-system.git` (SSH)

**Copy this URL** - you'll need it in the next step.

## Step 3: Connect and Push to GitHub

Run these commands in your terminal (replace `YOUR_REPO_URL` with the URL you copied):

```bash
# Add the GitHub repository as remote
git remote add origin YOUR_REPO_URL

# Rename the default branch to 'main' (GitHub's standard)
git branch -M main

# Push your code to GitHub
git push -u origin main
```

### Example:
If your repository URL is `https://github.com/yourusername/museum-management-system.git`, run:
```bash
git remote add origin https://github.com/yourusername/museum-management-system.git
git branch -M main
git push -u origin main
```

## Step 4: Authentication

When you push, GitHub may ask for authentication:
- **If using HTTPS**: You'll need a Personal Access Token (not your password)
  - Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
  - Generate a new token with `repo` permissions
  - Use this token as your password when prompted

- **If using SSH**: Make sure you have SSH keys set up in your GitHub account

## Step 5: Share with Your Colleagues

Once pushed, share the repository URL with your colleagues. They can:
1. Clone the repository: `git clone YOUR_REPO_URL`
2. Install dependencies: Follow the README.md instructions
3. Study the code!

## Quick Commands Reference

```bash
# Check current status
git status

# Add new changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to GitHub
git push

# Pull latest changes (when working with others)
git pull
```

---

**Note**: Make sure your `.env` files are NOT pushed to GitHub (they're already in `.gitignore` for security).

