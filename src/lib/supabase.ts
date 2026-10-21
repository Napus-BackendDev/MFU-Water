import { createClient } from '@supabase/supabase-js'
import { readPublicEnv } from '../config/env'

const { supabaseUrl, supabaseAnonKey } = readPublicEnv()

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
