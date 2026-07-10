# Deployment Guide

You need to deploy TWO things: the backend (FastAPI) and the frontend (Next.js).
Do the backend first, since the frontend needs its URL.

## 1. Deploy the Backend to Render

1. Go to https://render.com and sign up / log in (you can use your GitHub account).
2. Click **New +** → **Web Service**.
3. Connect your GitHub account and select your `zoom-clone` repository.
4. Fill in:
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt && python -m app.seed`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Free
5. Click **Create Web Service**. Wait for the build to finish.
6. Once live, Render gives you a URL like `https://zoom-clone-backend.onrender.com`.
   Copy it — you need it for the frontend step below.
7. Test it: open `https://<your-backend>.onrender.com/api/health` in a browser.
   You should see `{"status":"ok"}`.

> Note: Render's free tier "spins down" after inactivity, so the first
> request after a while may take ~30s to wake up. This is normal for free
> tier and fine to mention in your evaluation if asked.

## 2. Deploy the Frontend to Vercel

1. Go to https://vercel.com and sign up / log in with GitHub.
2. Click **Add New** → **Project** → import your `zoom-clone` repository.
3. When configuring:
   - **Root Directory**: `frontend`
   - Framework Preset: Next.js (auto-detected)
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL` = `https://<your-backend>.onrender.com` (the URL from step 1, no trailing slash)
5. Click **Deploy**.
6. Once done, Vercel gives you a live URL like `https://zoom-clone-yourname.vercel.app`.

## 3. Cross-check CORS

The backend's `main.py` currently allows all origins (`allow_origins=["*"]`),
so your deployed frontend will be able to call it without extra config. For
a production system you'd restrict this to your exact Vercel URL, but `"*"`
is fine (and simpler to explain) for an assignment demo.

## 4. Final check

Open your Vercel URL in two different browsers (or one normal + one
incognito window) and run through: New Meeting → copy link → paste in the
second window → join → verify video/audio connects and host controls work.
