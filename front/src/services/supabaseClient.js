import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://fufiohljmxasfvgxmllm.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1ZmlvaGxqbXhhc2Z2Z3htbGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MjUwMjcsImV4cCI6MjA3MDUwMTAyN30.pTcbJMRDATyge38gkD6ugMxlHTLlAp5Dtbf2Mr2dF_s"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
