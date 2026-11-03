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
          kind: Database["public"]["Enums"]["book_kind"];
          categories: string[];
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
          kind?: Database["public"]["Enums"]["book_kind"];
          categories?: string[];
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
          kind?: Database["public"]["Enums"]["book_kind"];
          categories?: string[];
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
          shared: boolean;
          spoiler: boolean;
          shared_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          user_id?: string;
          rating?: number | null;
          content?: string;
          shared?: boolean;
          spoiler?: boolean;
          shared_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          user_id?: string;
          rating?: number | null;
          content?: string;
          shared?: boolean;
          spoiler?: boolean;
          shared_at?: string | null;
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
      invites: {
        Row: {
          token: string;
          created_by: string;
          created_at: string;
          expires_at: string;
          used_by: string | null;
          used_at: string | null;
        };
        Insert: {
          token?: string;
          created_by?: string;
          created_at?: string;
          expires_at?: string;
          used_by?: string | null;
          used_at?: string | null;
        };
        Update: {
          token?: string;
          created_by?: string;
          created_at?: string;
          expires_at?: string;
          used_by?: string | null;
          used_at?: string | null;
        };
        Relationships: [];
      };
      review_comments: {
        Row: {
          id: string;
          review_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          review_id: string;
          user_id?: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          review_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_comments_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
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
    Functions: {
      create_invite: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Tables"]["invites"]["Row"];
      };
      check_invite: {
        Args: { p_token: string };
        Returns: { valid: boolean; inviter_name: string | null }[];
      };
      member_books: {
        Args: { p_user: string };
        Returns: {
          id: string;
          title: string;
          author: string | null;
          status: Database["public"]["Enums"]["reading_status"];
          kind: Database["public"]["Enums"]["book_kind"];
          categories: string[];
          cover_path: string | null;
          created_at: string;
          finished_at: string | null;
          review_id: string | null;
          rating: number | null;
          review: string | null;
          spoiler: boolean | null;
          comment_count: number;
        }[];
      };
      timeline: {
        Args: { p_before?: string | null; p_limit?: number };
        Returns: {
          review_id: string;
          user_id: string;
          user_name: string | null;
          book_id: string;
          book_title: string;
          book_author: string | null;
          cover_path: string | null;
          rating: number | null;
          content: string;
          spoiler: boolean;
          shared_at: string;
          updated_at: string;
          comment_count: number;
        }[];
      };
      review_post: {
        Args: { p_review: string };
        Returns: {
          review_id: string;
          user_id: string;
          user_name: string | null;
          book_id: string;
          book_title: string;
          book_author: string | null;
          cover_path: string | null;
          rating: number | null;
          content: string;
          spoiler: boolean;
          shared: boolean;
          shared_at: string | null;
          updated_at: string;
          comment_count: number;
        }[];
      };
    };
    Enums: {
      reading_status: "to_read" | "reading" | "finished" | "abandoned";
      processing_status: "pending" | "ready" | "failed";
      book_kind: "book" | "comic";
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
