import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Singleton pattern to prevent multiple client instances
let supabaseClient: ReturnType<typeof createSupabaseClient> | null = null

export function createClient() {
  // Return existing client if already created
  if (supabaseClient) {
    return supabaseClient
  }

  // Use the exact same configuration that works in test-supabase page
  const supabaseUrl = "https://eivlgwyipqojpeaxoajm.supabase.co"
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdmxnd3lpcHFvanBlYXhvYWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMTY0NzQsImV4cCI6MjA2MjY5MjQ3NH0.U-Q4_5QgZjlp_dOqYM1xOm5sAi7tMBQPqc8UmagYycQ"

  console.log("Creating Supabase client with URL:", supabaseUrl)
  console.log("Key available:", !!supabaseKey)

  // Create a new supabase client with minimal configuration
  supabaseClient = createSupabaseClient(supabaseUrl, supabaseKey)

  return supabaseClient
}