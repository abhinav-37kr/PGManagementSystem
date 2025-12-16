
const SUPABASE_URL = "https://guzfqaeiyyswgizlkumu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1emZxYWVpeXlzd2dpemxrdW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NTUwODgsImV4cCI6MjA4MTQzMTA4OH0.zwHp0VXzxmisdpPSIWKPztM1kj2KVzAtAH9jBSWmAzY";


const { createClient } = supabase;
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

