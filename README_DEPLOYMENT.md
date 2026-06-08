# Deploying Wyckoff Journal to Vercel

To get this application live on the internet, follow these exact steps. It should take less than 10 minutes.

## Step 1: Push your code to GitHub
Vercel automatically builds and hosts your app by looking at a GitHub repository.

1. Create a free account at [GitHub](https://github.com/).
2. In your local terminal (inside your project folder), run these commands to initialize git and commit your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Trading Journal"
   ```
3. Go to GitHub and click the **New** button to create a new repository. Name it something like `wyckoff-journal`. Leave it public or set it to private.
4. GitHub will show you a page with instructions. Look for the section that says "…or push an existing repository from the command line". Copy those commands and paste them into your terminal. It will look like this:
   ```bash
   git remote add origin https://github.com/YourUsername/wyckoff-journal.git
   git branch -M main
   git push -u origin main
   ```

## Step 2: Deploy to Vercel
1. Create a free account at [Vercel](https://vercel.com/) (Sign up using your GitHub account).
2. On your Vercel Dashboard, click **Add New** -> **Project**.
3. Under "Import Git Repository", you should see the `wyckoff-journal` repository you just created. Click **Import**.
4. You will see a "Configure Project" screen. 
   * **Framework Preset:** Next.js (leave as is).
   * **Root Directory:** ./ (leave as is).
5. **CRITICAL STEP - Environment Variables:** 
   Open your local `.env.local` file. Copy every single key and value into Vercel's Environment Variables section. You need:
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   * `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   * `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
   * `CLOUDINARY_API_SECRET`
   * `NEXT_PUBLIC_CLOUDINARY_API_KEY`
6. Click **Deploy**. Vercel will now build your app and put it on a live URL (e.g., `https://wyckoff-journal.vercel.app`).

## Step 3: Tell Supabase to Trust Your Live URL
Right now, if you try to log in on your new Vercel website, Supabase will block it because it only trusts `localhost:3000`.

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **Authentication** -> **URL Configuration**.
3. Under **Site URL**, paste your new live Vercel URL (e.g., `https://wyckoff-journal.vercel.app`).
4. Under **Redirect URLs**, click "Add URL" and type: `https://wyckoff-journal.vercel.app/**` (the `/**` is important!).
5. Click **Save**.

Your app is now fully live, secure, and accessible from any phone or computer in the world!
