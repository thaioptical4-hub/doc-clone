// One-time helper: obtains a Google OAuth refresh token for the Drive backup feature.
//
// 1. In Google Cloud Console: create a project, enable the "Google Drive API",
//    configure the OAuth consent screen (External, add thaioptical4@gmail.com as a test user),
//    then create an OAuth Client ID of type "Desktop app". Copy its client ID/secret.
// 2. Run:
//      GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy node scripts/get-google-refresh-token.mjs
// 3. Open the printed URL, sign in as thaioptical4@gmail.com, and approve access.
// 4. Copy the printed GOOGLE_REFRESH_TOKEN into your .env.local / Vercel env vars.

import { createServer } from "node:http"
import { OAuth2Client } from "google-auth-library"

const clientId = process.env.GOOGLE_CLIENT_ID
const clientSecret = process.env.GOOGLE_CLIENT_SECRET

if (!clientId || !clientSecret) {
  console.error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars before running this script.")
  process.exit(1)
}

const server = createServer()
server.listen(0, "127.0.0.1", () => {
  const port = server.address().port
  const redirectUri = `http://127.0.0.1:${port}`
  const client = new OAuth2Client(clientId, clientSecret, redirectUri)

  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/drive.file"],
  })

  console.log("\nOpen this URL and sign in as thaioptical4@gmail.com:\n")
  console.log(authUrl)
  console.log("\nWaiting for authorization...\n")

  server.on("request", async (req, res) => {
    const url = new URL(req.url, redirectUri)
    const code = url.searchParams.get("code")
    if (!code) {
      res.writeHead(400).end("Missing authorization code")
      return
    }
    res.writeHead(200, { "Content-Type": "text/html" })
    res.end("<h1>Authorized</h1><p>You can close this tab and return to the terminal.</p>")

    try {
      const { tokens } = await client.getToken(code)
      console.log("Success! Add these to your .env.local / Vercel env vars:\n")
      console.log(`GOOGLE_CLIENT_ID=${clientId}`)
      console.log(`GOOGLE_CLIENT_SECRET=${clientSecret}`)
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`)
    } catch (err) {
      console.error("Failed to exchange authorization code:", err)
    } finally {
      server.close()
      process.exit(0)
    }
  })
})
