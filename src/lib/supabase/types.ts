export type ChannelType = "telegram" | "email";

export type Database = {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          post_subject: string | null;
          prompt_system: string | null;
          email: string | null;
          telegram_chat_id: string | null;
          telegram_bot_token: string | null;
          telegram_start_command: string | null;
          linkedin_access_token: string | null;
          linkedin_member_id: string | null;
          linkedin_member_name: string | null;
          linkedin_member_picture: string | null;
          linkedin_connected_at: string | null;
          approval_channel: ChannelType | null;
          confirmation_channel: ChannelType | null;
          enable_post_picture: boolean;
          schedule: boolean;
          active: boolean;
          prompt_role: string | null;
          prompt_topic: string | null;
          prompt_audience: string | null;
          prompt_hook_emoji: string | null;
          prompt_hook_prefix: string | null;
          prompt_footer: string | null;
          prompt_has_code: boolean;
          prompt_code_language: string | null;
          prompt_mode: "assistant" | "advanced";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          post_subject?: string | null;
          prompt_system?: string | null;
          email?: string | null;
          telegram_chat_id?: string | null;
          telegram_bot_token?: string | null;
          telegram_start_command?: string | null;
          linkedin_access_token?: string | null;
          linkedin_member_id?: string | null;
          linkedin_member_name?: string | null;
          linkedin_member_picture?: string | null;
          linkedin_connected_at?: string | null;
          approval_channel?: ChannelType | null;
          confirmation_channel?: ChannelType | null;
          enable_post_picture?: boolean;
          schedule?: boolean;
          active?: boolean;
          prompt_role?: string | null;
          prompt_topic?: string | null;
          prompt_audience?: string | null;
          prompt_hook_emoji?: string | null;
          prompt_hook_prefix?: string | null;
          prompt_footer?: string | null;
          prompt_has_code?: boolean;
          prompt_code_language?: string | null;
          prompt_mode?: "assistant" | "advanced";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["agents"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "agents_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      agent_schedule_config: {
        Row: {
          id: string;
          agent_id: string;
          custom_cron: string | null;
          timezone: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          custom_cron?: string | null;
          timezone?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["agent_schedule_config"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "agent_schedule_config_agent_id_fkey";
            columns: ["agent_id"];
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      linkedin_posts: {
        Row: {
          id: string;
          agent_id: string;
          post_text: string | null;
          raw_code: string | null;
          image_url: string | null;
          post_link: string | null;
          is_published: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          post_text?: string | null;
          raw_code?: string | null;
          image_url?: string | null;
          post_link?: string | null;
          is_published?: boolean;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["linkedin_posts"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "linkedin_posts_agent_id_fkey";
            columns: ["agent_id"];
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      channel_type: ChannelType;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Agent = Database["public"]["Tables"]["agents"]["Row"];
export type AgentInsert = Database["public"]["Tables"]["agents"]["Insert"];
export type AgentUpdate = Database["public"]["Tables"]["agents"]["Update"];

export type AgentScheduleConfig =
  Database["public"]["Tables"]["agent_schedule_config"]["Row"];
export type AgentScheduleConfigInsert =
  Database["public"]["Tables"]["agent_schedule_config"]["Insert"];

export type LinkedinPost =
  Database["public"]["Tables"]["linkedin_posts"]["Row"];
export type LinkedinPostInsert =
  Database["public"]["Tables"]["linkedin_posts"]["Insert"];
