import { OAuth2Client } from "google-auth-library"

let client: OAuth2Client | null = null

/** Returns the shared Google OAuth client, or null if the Drive/Sheets integration isn't configured. */
export function getGoogleClient(): OAuth2Client | null {
  if (client) return client
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) return null
  client = new OAuth2Client(clientId, clientSecret)
  client.setCredentials({ refresh_token: refreshToken })
  return client
}

export async function getGoogleAccessToken(): Promise<string | null> {
  const oauth2Client = getGoogleClient()
  if (!oauth2Client) return null
  const { token } = await oauth2Client.getAccessToken()
  return token ?? null
}
