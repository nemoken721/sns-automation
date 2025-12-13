export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      videos: {
        Row: {
          id: string
          user_id: string
          title: string
          theme: string
          status: 'pending' | 'processing' | 'completed' | 'failed'
          script_data: Json | null
          video_url: string | null
          thumbnail_url: string | null
          caption: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          theme: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          script_data?: Json | null
          video_url?: string | null
          thumbnail_url?: string | null
          caption?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          theme?: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          script_data?: Json | null
          video_url?: string | null
          thumbnail_url?: string | null
          caption?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          credits: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          credits?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          credits?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export type Video = Database['public']['Tables']['videos']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
