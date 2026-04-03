# 🎭 AI Mood Scanner

This is a fun and interactive web app that uses your camera to detect your mood and turn it into a meme-style sticker. The app captures your face in real time, analyzes your facial expression using AI, and determines your current mood along with an emoji and description. Based on the detected mood, you can choose a meme style and generate a personalized sticker that reflects your vibe. It combines AI, camera input, and creative UI to make something simple but entertaining and shareable.

---

## ✨ Features

* Capture image using webcam
* Detect mood using AI (Gemini API)
* Show emoji and mood description
* Choose different meme styles
* Generate and download sticker

---

## 🛠️ Tech Used

* React (Vite)
* JavaScript
* Google Gemini API
* HTML Canvas

---

## 🚀 How to run

1. Clone the project

```id="ku03qb"
git clone https://github.com/your-username/moodscanner.git
cd moodscanner
```

2. Install dependencies

```id="t0xnl1"
npm install
```

3. Create a `.env` file and add your API key

```id="e460vq"
VITE_GEMINI_API_KEY=your_api_key_here
```

4. Run the project

```id="uuxgfx"
npm run dev
```

---

## ⚠️ Notes

* Don’t upload your `.env` file
* Camera permission is required
* API key is used on frontend (not secure for production)

---

## 💡 Future ideas

* Add real meme templates
* Improve UI
* Add sharing feature

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
---

Can try here-  
https://mood-scanner-eta.vercel.app/

⭐ If you like this project, give it a star!


