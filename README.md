# Japa Tracker

A simple web app to track your daily japa (chanting) rounds and visualize progress towards your goal.

## Features

- Email/password authentication via Supabase
- Set a personal japa target
- Log rounds multiple times per day — counts accumulate
- Overall progress bar with percentage
- Stats: weekly, monthly, daily average, best day, streak, best day of week
- Bar charts for last 7 days and monthly totals
- Edit and delete past entries
- Fully responsive — works on mobile

## Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (note your **Project URL** and **anon public key** from Settings → API)

### 2. Set Up the Database

1. In your Supabase dashboard, go to **SQL Editor**
2. Paste the contents of `setup.sql` and click **Run**
3. This creates the `profiles` and `japa_entries` tables with Row Level Security policies

### 3. Configure Authentication

1. In Supabase dashboard, go to **Authentication → Providers**
2. Make sure **Email** provider is enabled
3. (Optional) Disable "Confirm email" under Authentication → Settings if you want instant signup without email verification

### 4. Add Your Supabase Credentials

Open `app.js` and replace the placeholder values at the top:

```js
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

### 5. Deploy to GitHub Pages

1. Create a new GitHub repository
2. Push this code to the repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/JapaTracker.git
   git branch -M main
   git push -u origin main
   ```
3. Go to your repository **Settings → Pages**
4. Under "Source", select **Deploy from a branch** → `main` → `/ (root)`
5. Your app will be live at `https://YOUR_USERNAME.github.io/JapaTracker/`

### 6. Update Supabase Redirect URL

1. In Supabase dashboard, go to **Authentication → URL Configuration**
2. Add your GitHub Pages URL to the **Redirect URLs** list:
   `https://YOUR_USERNAME.github.io/JapaTracker/`

## File Structure

```
├── index.html      # Main HTML with all screens
├── style.css       # Styles
├── app.js          # App logic (auth, CRUD, stats, rendering)
├── setup.sql       # Supabase database setup script
└── README.md       # This file
```
