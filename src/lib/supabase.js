import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://sevmsldqpeczstupletf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNldm1zbGRxcGVjenN0dXBsZXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTI5NDIsImV4cCI6MjA5NDQyODk0Mn0.OXEZkuJXGFxswWI3HIXbPR0rlZHR6MzEbS0kHWwWrmA'
)
