// Espelha supabase/migrations/20261027000000_init.sql no formato do
// `supabase gen types typescript`. Depois de linkar o projeto, substitua por:
//   npx supabase gen types typescript --project-id <id> > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reading_preferences: {
        Row: {
          user_id: string;
          theme: Database["public"]["Enums"]["reader_theme"];
          font_size: number;
          text_align: Database["public"]["Enums"]["reader_text_align"];
          font_family: Database["public"]["Enums"]["reader_font"];
          line_height: Database["public"]["Enums"]["reader_leading"];
          updated_at: string;
        };
        Insert: {
          user_id: string;
          theme?: Database["public"]["Enums"]["reader_theme"];
          font_size?: number;
          text_align?: Database["public"]["Enums"]["reader_text_align"];
          font_family?: Database["public"]["Enums"]["reader_font"];
          line_height?: Database["public"]["Enums"]["reader_leading"];
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          theme?: Database["public"]["Enums"]["reader_theme"];
          font_size?: number;
          text_align?: Database["public"]["Enums"]["reader_text_align"];
          font_family?: Database["public"]["Enums"]["reader_font"];
          line_height?: Database["public"]["Enums"]["reader_leading"];
          updated_at?: string;
        };
        Relationships: [];
      };
      books: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          author: string | null;
          description: string | null;
          status: Database["public"]["Enums"]["reading_status"];
          processing_status: Database["public"]["Enums"]["processing_status"];
          pdf_path: string;
          cover_path: string | null;
          content_path: string | null;
          page_count: number | null;
          word_count: number | null;
          progress: number;
          started_at: string | null;
          finished_at: string | null;
          last_read_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          title: string;
          author?: string | null;
          description?: string | null;
          status?: Database["public"]["Enums"]["reading_status"];
          processing_status?: Database["public"]["Enums"]["processing_status"];
          pdf_path: string;
          cover_path?: string | null;
          content_path?: string | null;
          page_count?: number | null;
          word_count?: number | null;
          progress?: number;
          started_at?: string | null;
          finished_at?: string | null;
          last_read_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          author?: string | null;
          description?: string | null;
          status?: Database["public"]["Enums"]["reading_status"];
          processing_status?: Database["public"]["Enums"]["processing_status"];
          pdf_path?: string;
          cover_path?: string | null;
          content_path?: string | null;
          page_count?: number | null;
          word_count?: number | null;
          progress?: number;
          started_at?: string | null;
          finished_at?: string | null;
          last_read_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          book_id: string;
          user_id: string;
          rating: number | null;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          user_id?: string;
          rating?: number | null;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          user_id?: string;
          rating?: number | null;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_book_id_user_id_fkey";
            columns: ["book_id", "user_id"];
            isOneToOne: true;
            referencedRelation: "books";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      notes: {
        Row: {
          id: string;
          book_id: string;
          user_id: string;
          quote: string | null;
          content: string;
          position: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          user_id?: string;
          quote?: string | null;
          content?: string;
          position?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          user_id?: string;
          quote?: string | null;
          content?: string;
          position?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notes_book_id_user_id_fkey";
            columns: ["book_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      reading_status: "to_read" | "reading" | "finished" | "abandoned";
      processing_status: "pending" | "ready" | "failed";
      reader_theme:
        | "light"
        | "dark"
        | "sepia"
        | "linen"
        | "sage"
        | "contrast"
        | "twilight"
        | "ocean"
        | "black";
      reader_text_align: "left" | "justify";
      reader_font: "serif" | "sans";
      reader_leading: "normal" | "relaxed" | "loose";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T];
