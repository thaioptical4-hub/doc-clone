import { JWT, OAuth2Client } from "google-auth-library"

type GoogleClient = JWT | OAuth2Client

let client: GoogleClient | null = null

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets",
]

/**
 * Returns a shared Google client. Service-account credentials are preferred because
 * they do not depend on a user's revocable/expiring OAuth refresh token. OAuth is
 * retained as a backwards-compatible fallback while existing deployments migrate.
 */
export function getGoogleClient(): GoogleClient | null {
  if (client) return client

  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const serviceAccountPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n")

  if (serviceAccountEmail && serviceAccountPrivateKey) {
    client = new JWT({
      email: serviceAccountEmail,
      key: serviceAccountPrivateKey,
      scopes: GOOGLE_SCOPES,
    })
    return client
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) return null
  client = new OAuth2Client(clientId, clientSecret)
  client.setCredentials({ refresh_token: refreshToken })
  return client
}

export async function getGoogleAccessToken(): Promise<string | null> {
  const googleClient = getGoogleClient()
  if (!googleClient) return null
  const { token } = await googleClient.getAccessToken()
  return token ?? null
}

