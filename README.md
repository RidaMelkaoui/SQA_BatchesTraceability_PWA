# SQA Traceability PWA  🚀

An enterprise-grade, local-network Progressive Web App for digitizing incoming automotive batch parts, assigning certificates, and actively triggering supervisor notifications.

## Tech Stack
- Frontend: Next.js (App Router), TailwindCSS.
- Backend: SQLite, Prisma ORM, Node-Cron.
- Utilities: Nodemailer (SMTP), Jose (JWT Edge Middleware), browser-image-compression.

## 🛠️ Step-by-Step Installation Tutorial

### Step 1: Clone and Configure
1. Extract the project code or `git clone` the repository onto the host computer.
2. Ensure you have Node.js (v18+) installed.
3. Open your terminal in the project directory and run:
   ```bash
   npm install
   ```

### Step 2: Database Setup
1. Generate the Prisma database structure locally by running:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
*(Note: A local SQLite `dev.db` file will be created natively. No external SQL server required!)*

### Step 3: Environment Configuration
1. Create a `.env` file in the root folder with the following format:
   ```env
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="supersafesecretkey123"

   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT="587"
   SMTP_SECURE="false"
   SMTP_USER="ridamelkaouiofficial@gmail.com"
   SMTP_PASS="YOUR_APP_PASSWORD"
   ```
*(Replace the App Password with your 16-character Google App Bypass Code.)*

### Step 4: Network Accessibility (Mobile Access)
1. Ensure the host PC and Mobile Phone are on the **exact same** Wi-Fi network.
2. **Important:** In your Windows Defender Firewall, open an inbound rule for Port **3000** (TCP traffic) so external devices aren't actively blocked.
3. Access the site on mobile via your Host's IP address: `http://192.168.11.100:3000`.

### Step 5: Booting the Application
To launch the server (which simultaneously starts both the responsive Next.js frontend and the background Node-Cron Weekly Email Engine), type:

```bash
npm run dev
```

### 👤 Testing the App
Navigate to the URL on your device.
Log in using any of the seeded prototype names (e.g., `Reda`, `Youssef`, `Khaoula`, `Aicha`, `Manal`) using the uniform password:
**`SQA2026`**

- Use **Widget 1 (Take New Batch Photo)** to natively snap pictures of incoming batch labels. (This will actively trigger a secure SMTP email drop).
- Use **Widget 2 (Track Batch Status)** to securely attach supplier Certificate PDFs/Images to verifying batches over time!
