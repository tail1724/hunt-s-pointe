export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      active_collection_selection: {
        Row: {
          collection_id: string | null
          surface: string
          updated_at: string
          user_id: string
        }
        Insert: {
          collection_id?: string | null
          surface: string
          updated_at?: string
          user_id: string
        }
        Update: {
          collection_id?: string | null
          surface?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_collection_selection_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      artifacts: {
        Row: {
          content: string
          created_at: string
          id: string
          kind: string
          parent_artifact_id: string | null
          session_id: string | null
          source_message_index: number | null
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          kind?: string
          parent_artifact_id?: string | null
          session_id?: string | null
          source_message_index?: number | null
          title?: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          kind?: string
          parent_artifact_id?: string | null
          session_id?: string | null
          source_message_index?: number | null
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      bible_annotations: {
        Row: {
          book: string
          chapter: number
          color: string | null
          created_at: string
          id: string
          note: string | null
          translation: string
          updated_at: string
          user_id: string
          verse: number
        }
        Insert: {
          book: string
          chapter: number
          color?: string | null
          created_at?: string
          id?: string
          note?: string | null
          translation?: string
          updated_at?: string
          user_id: string
          verse: number
        }
        Update: {
          book?: string
          chapter?: number
          color?: string | null
          created_at?: string
          id?: string
          note?: string | null
          translation?: string
          updated_at?: string
          user_id?: string
          verse?: number
        }
        Relationships: []
      }
      bible_bookmarks: {
        Row: {
          book: string
          chapter: number
          created_at: string
          id: string
          label: string | null
          translation: string
          user_id: string
          verse: number | null
        }
        Insert: {
          book: string
          chapter: number
          created_at?: string
          id?: string
          label?: string | null
          translation?: string
          user_id: string
          verse?: number | null
        }
        Update: {
          book?: string
          chapter?: number
          created_at?: string
          id?: string
          label?: string | null
          translation?: string
          user_id?: string
          verse?: number | null
        }
        Relationships: []
      }
      bible_verse_embeddings: {
        Row: {
          book: string
          chapter: number
          content: string
          created_at: string
          embedding: string | null
          id: string
          translation: string
          verse: number
        }
        Insert: {
          book: string
          chapter: number
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          translation: string
          verse: number
        }
        Update: {
          book?: string
          chapter?: number
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          translation?: string
          verse?: number
        }
        Relationships: []
      }
      board_columns: {
        Row: {
          board_id: string
          color: string | null
          created_at: string
          id: string
          position: number
          title: string
          user_id: string
          wip_limit: number | null
        }
        Insert: {
          board_id: string
          color?: string | null
          created_at?: string
          id?: string
          position?: number
          title: string
          user_id: string
          wip_limit?: number | null
        }
        Update: {
          board_id?: string
          color?: string | null
          created_at?: string
          id?: string
          position?: number
          title?: string
          user_id?: string
          wip_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "board_columns_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      boards: {
        Row: {
          created_at: string
          emoji: string | null
          id: string
          position: number
          tint: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          id?: string
          position?: number
          tint?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string | null
          id?: string
          position?: number
          tint?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          avatar_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      card_links: {
        Row: {
          card_id: string
          created_at: string
          id: string
          kind: string
          target_id: string
          title: string
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          kind: string
          target_id: string
          title: string
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          kind?: string
          target_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_links_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      card_tags: {
        Row: {
          card_id: string
          tag_id: string
          user_id: string
        }
        Insert: {
          card_id: string
          tag_id: string
          user_id: string
        }
        Update: {
          card_id?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_tags_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "organize_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          all_day: boolean
          board_id: string
          checklist: Json
          column_id: string
          completed_at: string | null
          cover_color: string | null
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          position: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_day?: boolean
          board_id: string
          checklist?: Json
          column_id: string
          completed_at?: string | null
          cover_color?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          position?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          all_day?: boolean
          board_id?: string
          checklist?: Json
          column_id?: string
          completed_at?: string | null
          cover_color?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          position?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "board_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_artifacts: {
        Row: {
          artifact_id: string
          artifact_type: string
          collection_id: string
          created_at: string
          id: string
          preview_snippet: string | null
          preview_title: string | null
          user_id: string
        }
        Insert: {
          artifact_id: string
          artifact_type: string
          collection_id: string
          created_at?: string
          id?: string
          preview_snippet?: string | null
          preview_title?: string | null
          user_id: string
        }
        Update: {
          artifact_id?: string
          artifact_type?: string
          collection_id?: string
          created_at?: string
          id?: string
          preview_snippet?: string | null
          preview_title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_artifacts_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_item_chunks: {
        Row: {
          chunk_index: number
          collection_id: string
          content: string
          content_type: string
          created_at: string
          embedding: string | null
          id: string
          item_id: string
          pipeline_version: string
          token_count: number | null
          user_id: string
        }
        Insert: {
          chunk_index: number
          collection_id: string
          content: string
          content_type?: string
          created_at?: string
          embedding?: string | null
          id?: string
          item_id: string
          pipeline_version?: string
          token_count?: number | null
          user_id: string
        }
        Update: {
          chunk_index?: number
          collection_id?: string
          content?: string
          content_type?: string
          created_at?: string
          embedding?: string | null
          id?: string
          item_id?: string
          pipeline_version?: string
          token_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_item_chunks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "collection_items"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_items: {
        Row: {
          body_text: string | null
          byte_size: number | null
          char_count: number
          collection_id: string
          created_at: string
          error_message: string | null
          id: string
          kind: string
          mime_type: string | null
          source_url: string | null
          status: string
          storage_path: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body_text?: string | null
          byte_size?: number | null
          char_count?: number
          collection_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          kind: string
          mime_type?: string | null
          source_url?: string | null
          status?: string
          storage_path?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body_text?: string | null
          byte_size?: number | null
          char_count?: number
          collection_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          kind?: string
          mime_type?: string | null
          source_url?: string | null
          status?: string
          storage_path?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          color: string
          created_at: string
          description: string | null
          icon: string
          id: string
          is_archived: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_archived?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_archived?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      context_stacks: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          layer: string
          name: string
          negative_keywords: string[]
          positive_keywords: string[]
          sort_order: number
          technical_params: Json | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          layer: string
          name: string
          negative_keywords?: string[]
          positive_keywords?: string[]
          sort_order?: number
          technical_params?: Json | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          layer?: string
          name?: string
          negative_keywords?: string[]
          positive_keywords?: string[]
          sort_order?: number
          technical_params?: Json | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          archived_at: string | null
          auto_created: boolean
          content: Json
          content_text: string
          created_at: string
          deleted_at: string | null
          id: string
          source: Database["public"]["Enums"]["document_source"]
          source_message_id: string | null
          source_session_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          auto_created?: boolean
          content?: Json
          content_text?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          source?: Database["public"]["Enums"]["document_source"]
          source_message_id?: string | null
          source_session_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          auto_created?: boolean
          content?: Json
          content_text?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          source?: Database["public"]["Enums"]["document_source"]
          source_message_id?: string | null
          source_session_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          all_day: boolean
          card_id: string | null
          color: string
          created_at: string
          description: string | null
          ends_at: string
          id: string
          starts_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_day?: boolean
          card_id?: string | null
          color?: string
          created_at?: string
          description?: string | null
          ends_at: string
          id?: string
          starts_at: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          all_day?: boolean
          card_id?: string | null
          color?: string
          created_at?: string
          description?: string | null
          ends_at?: string
          id?: string
          starts_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      generations: {
        Row: {
          campaign_id: string | null
          caption: string | null
          carousel_group_id: string | null
          created_at: string
          id: string
          media_type: string
          prompt_history_id: string | null
          result_url: string | null
          scene_order: number | null
          scheduled_date: string | null
          scheduled_time_slot: string | null
          source_prompt: string
          status: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          caption?: string | null
          carousel_group_id?: string | null
          created_at?: string
          id?: string
          media_type?: string
          prompt_history_id?: string | null
          result_url?: string | null
          scene_order?: number | null
          scheduled_date?: string | null
          scheduled_time_slot?: string | null
          source_prompt: string
          status?: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          caption?: string | null
          carousel_group_id?: string | null
          created_at?: string
          id?: string
          media_type?: string
          prompt_history_id?: string | null
          result_url?: string | null
          scene_order?: number | null
          scheduled_date?: string | null
          scheduled_time_slot?: string | null
          source_prompt?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generations_prompt_history_id_fkey"
            columns: ["prompt_history_id"]
            isOneToOne: false
            referencedRelation: "prompt_history"
            referencedColumns: ["id"]
          },
        ]
      }
      guardrail_events: {
        Row: {
          category: string
          created_at: string
          function: string
          id: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          function: string
          id?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          function?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_entries: {
        Row: {
          content_text: string | null
          content_type: string
          created_at: string
          embedding: string | null
          file_name: string | null
          file_path: string | null
          id: string
          is_hidden: boolean
          metadata: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content_text?: string | null
          content_type?: string
          created_at?: string
          embedding?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          is_hidden?: boolean
          metadata?: Json | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content_text?: string | null
          content_type?: string
          created_at?: string
          embedding?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          is_hidden?: boolean
          metadata?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nexus_logs: {
        Row: {
          action_taken: string | null
          category: string | null
          created_at: string
          delta_score: number | null
          id: string
          mode: string
          pipe_a_output: string | null
          pipe_b_output: string | null
          robustness_score: number | null
          robustness_vector: Json | null
          transcript: string | null
          user_id: string
          viz_payload: Json | null
        }
        Insert: {
          action_taken?: string | null
          category?: string | null
          created_at?: string
          delta_score?: number | null
          id?: string
          mode?: string
          pipe_a_output?: string | null
          pipe_b_output?: string | null
          robustness_score?: number | null
          robustness_vector?: Json | null
          transcript?: string | null
          user_id: string
          viz_payload?: Json | null
        }
        Update: {
          action_taken?: string | null
          category?: string | null
          created_at?: string
          delta_score?: number | null
          id?: string
          mode?: string
          pipe_a_output?: string | null
          pipe_b_output?: string | null
          robustness_score?: number | null
          robustness_vector?: Json | null
          transcript?: string | null
          user_id?: string
          viz_payload?: Json | null
        }
        Relationships: []
      }
      organize_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      partner_feedback: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          output_rating: number | null
          ui_rating: number | null
          updated_at: string
          user_id: string
          week_of: string
          workflow_rating: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          output_rating?: number | null
          ui_rating?: number | null
          updated_at?: string
          user_id: string
          week_of?: string
          workflow_rating?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          output_rating?: number | null
          ui_rating?: number | null
          updated_at?: string
          user_id?: string
          week_of?: string
          workflow_rating?: number | null
        }
        Relationships: []
      }
      partner_sessions: {
        Row: {
          category: string | null
          created_at: string
          id: string
          messages: Json
          pinned_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          messages?: Json
          pinned_at?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          messages?: Json
          pinned_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personas: {
        Row: {
          created_at: string
          description: string | null
          id: string
          locked_stacks: string[]
          name: string
          parent_id: string | null
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          locked_stacks?: string[]
          name: string
          parent_id?: string | null
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          locked_stacks?: string[]
          name?: string
          parent_id?: string | null
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personas_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          tier: string
          trial_days_override: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          tier?: string
          trial_days_override?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          tier?: string
          trial_days_override?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prompt_feedback: {
        Row: {
          accuracy_score: number | null
          corrective_input: string | null
          created_at: string
          id: string
          prompt_history_id: string
          refinement_output: Json | null
          user_id: string
          vote: string | null
        }
        Insert: {
          accuracy_score?: number | null
          corrective_input?: string | null
          created_at?: string
          id?: string
          prompt_history_id: string
          refinement_output?: Json | null
          user_id: string
          vote?: string | null
        }
        Update: {
          accuracy_score?: number | null
          corrective_input?: string | null
          created_at?: string
          id?: string
          prompt_history_id?: string
          refinement_output?: Json | null
          user_id?: string
          vote?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_feedback_prompt_history_id_fkey"
            columns: ["prompt_history_id"]
            isOneToOne: false
            referencedRelation: "prompt_history"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_history: {
        Row: {
          campaign_id: string | null
          created_at: string
          embedding: string | null
          granularity: number
          id: string
          mode: string
          negative_prompt: string | null
          output_audio: string | null
          output_midjourney: string | null
          output_openai: string | null
          output_video: string | null
          persona_id: string | null
          seed: string
          selected_stacks: string[]
          user_id: string
          variables: Json | null
          vibes: Json | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          embedding?: string | null
          granularity?: number
          id?: string
          mode?: string
          negative_prompt?: string | null
          output_audio?: string | null
          output_midjourney?: string | null
          output_openai?: string | null
          output_video?: string | null
          persona_id?: string | null
          seed: string
          selected_stacks?: string[]
          user_id: string
          variables?: Json | null
          vibes?: Json | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          embedding?: string | null
          granularity?: number
          id?: string
          mode?: string
          negative_prompt?: string | null
          output_audio?: string | null
          output_midjourney?: string | null
          output_openai?: string | null
          output_video?: string | null
          persona_id?: string | null
          seed?: string
          selected_stacks?: string[]
          user_id?: string
          variables?: Json | null
          vibes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_history_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_history_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      query_embedding_cache: {
        Row: {
          created_at: string
          embedding: string
          model: string
          query_hash: string
        }
        Insert: {
          created_at?: string
          embedding: string
          model: string
          query_hash: string
        }
        Update: {
          created_at?: string
          embedding?: string
          model?: string
          query_hash?: string
        }
        Relationships: []
      }
      rag_query_events: {
        Row: {
          cache_hit_embedding: boolean
          collection_id: string | null
          event_id: string
          included_bibles: boolean
          included_web: boolean
          latency_breakdown: Json | null
          latency_ms_total: number | null
          raw_query: string | null
          rerank_order: number[] | null
          retrieved_chunk_ids: string[] | null
          rewritten_query: string | null
          ts: string
          user_id: string
        }
        Insert: {
          cache_hit_embedding?: boolean
          collection_id?: string | null
          event_id?: string
          included_bibles?: boolean
          included_web?: boolean
          latency_breakdown?: Json | null
          latency_ms_total?: number | null
          raw_query?: string | null
          rerank_order?: number[] | null
          retrieved_chunk_ids?: string[] | null
          rewritten_query?: string | null
          ts?: string
          user_id: string
        }
        Update: {
          cache_hit_embedding?: boolean
          collection_id?: string | null
          event_id?: string
          included_bibles?: boolean
          included_web?: boolean
          latency_breakdown?: Json | null
          latency_ms_total?: number | null
          raw_query?: string | null
          rerank_order?: number[] | null
          retrieved_chunk_ids?: string[] | null
          rewritten_query?: string | null
          ts?: string
          user_id?: string
        }
        Relationships: []
      }
      scripture_preferences: {
        Row: {
          citation_density: string
          created_at: string
          primary_translation: string
          prose_style: string
          reading_level: number
          secondary_translation: string | null
          tradition: string
          updated_at: string
          user_id: string
        }
        Insert: {
          citation_density?: string
          created_at?: string
          primary_translation?: string
          prose_style?: string
          reading_level?: number
          secondary_translation?: string | null
          tradition?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          citation_density?: string
          created_at?: string
          primary_translation?: string
          prose_style?: string
          reading_level?: number
          secondary_translation?: string | null
          tradition?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      session_branches: {
        Row: {
          created_at: string
          id: string
          label: string
          messages: Json
          parent_message_index: number
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string
          messages?: Json
          parent_message_index: number
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          messages?: Json
          parent_message_index?: number
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      shared_sessions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          redact_user_msgs: boolean
          session_id: string
          slug: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          redact_user_msgs?: boolean
          session_id: string
          slug: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          redact_user_msgs?: boolean
          session_id?: string
          slug?: string
          user_id?: string
        }
        Relationships: []
      }
      signup_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          email_pattern: string | null
          expires_at: string | null
          id: string
          max_uses: number
          tier: string
          updated_at: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          email_pattern?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          tier?: string
          updated_at?: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          email_pattern?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          tier?: string
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          current_mode: string
          harmony_score: number
          id: string
          last_sync: string
          preferences: Json
          trial_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_mode?: string
          harmony_score?: number
          id?: string
          last_sync?: string
          preferences?: Json
          trial_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_mode?: string
          harmony_score?: number
          id?: string
          last_sync?: string
          preferences?: Json
          trial_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_memories: {
        Row: {
          created_at: string
          enabled: boolean
          fact: string
          id: string
          last_used_at: string
          source: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          fact: string
          id?: string
          last_used_at?: string
          source?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          fact?: string
          id?: string
          last_used_at?: string
          source?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vibe_cloud_terms: {
        Row: {
          category: string
          created_at: string
          id: string
          negative_pair: string | null
          term: string
          weight: number
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          negative_pair?: string | null
          term: string
          weight?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          negative_pair?: string | null
          term?: string
          weight?: number
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          program: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          program?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          program?: string | null
          source?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_shared_session: {
        Args: { _slug: string }
        Returns: {
          expires_at: string
          messages: Json
          redact_user_msgs: boolean
          title: string
        }[]
      }
      get_system_baseline: {
        Args: { target_category: string }
        Returns: number
      }
      match_collection_chunks: {
        Args: {
          match_count?: number
          query_embedding: string
          target_collection?: string
          target_user: string
        }
        Returns: {
          collection_id: string
          content: string
          id: string
          item_id: string
          similarity: number
        }[]
      }
      match_knowledge: {
        Args: {
          match_count?: number
          query_embedding: string
          target_user: string
        }
        Returns: {
          content_text: string
          id: string
          similarity: number
          title: string
        }[]
      }
      match_past_prompts: {
        Args: {
          match_count?: number
          query_embedding: string
          target_user: string
        }
        Returns: {
          id: string
          output_openai: string
          seed: string
          similarity: number
        }[]
      }
    }
    Enums: {
      document_source: "manual" | "mary" | "build_prompts"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      document_source: ["manual", "mary", "build_prompts"],
    },
  },
} as const
