# Material UI - Vite example with Tailwind CSS in TypeScript

## How to use

Download the example [or clone the repo](https://github.com/steve8708/mui-vite):

<!-- #target-branch-reference -->

```bash
git clone https://github.com/steve8708/mui-vite.git
cd mui-vite
```

## 🔒 Security Setup (IMPORTANT)

**Before running the application**, you must set up your environment variables:

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your actual Xano authentication token:
   ```bash
   # Replace 'your_xano_auth_token_here' with your actual token
   VITE_XANO_AUTH_TOKEN=your_actual_token_here
   ```

3. **NEVER commit the `.env` file** - it's already in `.gitignore`

Install it and run:

```bash
npm install
npm run dev
```

This example demonstrates how you can use [Tailwind CSS](https://tailwindcss.com/) and [Vite](https://github.com/vitejs/vite) together with Material UI.
It includes `@mui/material` and its peer dependencies, including [Emotion](https://emotion.sh/docs/introduction), the default style engine in Material UI, as well as several examples of using MUI components.

## What's next?

<!-- #host-reference -->

You now have a working example project.
You can head back to the documentation and continue by browsing the [templates](https://mui.com/material-ui/getting-started/templates/) section.
