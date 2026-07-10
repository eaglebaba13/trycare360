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
      activity_logs: {
        Row: {
          actor_id: string | null
          id: number
          meta: Json
          object_id: string | null
          object_type: string | null
          org_unit_id: string | null
          tenant_id: string | null
          ts: string
          verb: string
        }
        Insert: {
          actor_id?: string | null
          id?: number
          meta?: Json
          object_id?: string | null
          object_type?: string | null
          org_unit_id?: string | null
          tenant_id?: string | null
          ts?: string
          verb: string
        }
        Update: {
          actor_id?: string | null
          id?: number
          meta?: Json
          object_id?: string | null
          object_type?: string | null
          org_unit_id?: string | null
          tenant_id?: string | null
          ts?: string
          verb?: string
        }
        Relationships: []
      }
      analytics_kpis: {
        Row: {
          category: string
          code: string
          created_at: string
          created_by: string | null
          data_source: string | null
          direction: string | null
          formula: string | null
          id: string
          is_active: boolean
          is_system: boolean
          meta: Json
          name: string
          target: number | null
          tenant_id: string | null
          unit: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          created_by?: string | null
          data_source?: string | null
          direction?: string | null
          formula?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          meta?: Json
          name: string
          target?: number | null
          tenant_id?: string | null
          unit?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          created_by?: string | null
          data_source?: string | null
          direction?: string | null
          formula?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          meta?: Json
          name?: string
          target?: number | null
          tenant_id?: string | null
          unit?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_kpis_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_snapshots: {
        Row: {
          captured_at: string
          dimensions: Json
          id: number
          kpi_code: string
          period: string
          period_end: string
          period_start: string
          target: number | null
          tenant_id: string
          value: number
        }
        Insert: {
          captured_at?: string
          dimensions?: Json
          id?: number
          kpi_code: string
          period: string
          period_end: string
          period_start: string
          target?: number | null
          tenant_id: string
          value: number
        }
        Update: {
          captured_at?: string
          dimensions?: Json
          id?: number
          kpi_code?: string
          period?: string
          period_end?: string
          period_start?: string
          target?: number | null
          tenant_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "analytics_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          label: string
          last_used_at: string | null
          prefix: string
          scopes: string[]
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          label: string
          last_used_at?: string | null
          prefix: string
          scopes?: string[]
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          label?: string
          last_used_at?: string | null
          prefix?: string
          scopes?: string[]
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_actions: {
        Row: {
          acted_at: string
          action: string
          actor_id: string | null
          comment: string | null
          id: string
          level: number
          meta: Json | null
          request_id: string
        }
        Insert: {
          acted_at?: string
          action: string
          actor_id?: string | null
          comment?: string | null
          id?: string
          level: number
          meta?: Json | null
          request_id: string
        }
        Update: {
          acted_at?: string
          action?: string
          actor_id?: string | null
          comment?: string | null
          id?: string
          level?: number
          meta?: Json | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_definitions: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          entity: string | null
          id: string
          is_active: boolean
          levels: Json
          module: string | null
          name: string
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity?: string | null
          id?: string
          is_active?: boolean
          levels?: Json
          module?: string | null
          name: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity?: string | null
          id?: string
          is_active?: boolean
          levels?: Json
          module?: string | null
          name?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          created_at: string
          current_level: number
          decided_at: string | null
          definition_id: string
          entity_ref: Json | null
          id: string
          payload: Json
          reason: string | null
          status: string
          submitted_by: string | null
          tenant_id: string
          timeout_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_level?: number
          decided_at?: string | null
          definition_id: string
          entity_ref?: Json | null
          id?: string
          payload?: Json
          reason?: string | null
          status?: string
          submitted_by?: string | null
          tenant_id: string
          timeout_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_level?: number
          decided_at?: string | null
          definition_id?: string
          entity_ref?: Json | null
          id?: string
          payload?: Json
          reason?: string | null
          status?: string
          submitted_by?: string | null
          tenant_id?: string
          timeout_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "approval_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          city_id: string
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          city_id: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          city_id?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "areas_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_definitions: {
        Row: {
          ai_model: string | null
          ai_system_prompt: string | null
          category: string
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          photo_slots: Json
          requires_photos: boolean
          scoring_config: Json
          sections: Json
          tenant_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          ai_model?: string | null
          ai_system_prompt?: string | null
          category: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          photo_slots?: Json
          requires_photos?: boolean
          scoring_config?: Json
          sections?: Json
          tenant_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          ai_model?: string | null
          ai_system_prompt?: string | null
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          photo_slots?: Json
          requires_photos?: boolean
          scoring_config?: Json
          sections?: Json
          tenant_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      assessment_photos: {
        Row: {
          ai_labels: Json | null
          created_at: string
          height: number | null
          id: string
          mime_type: string | null
          session_id: string
          size_bytes: number | null
          slot: string
          storage_path: string
          uploaded_at: string
          width: number | null
        }
        Insert: {
          ai_labels?: Json | null
          created_at?: string
          height?: number | null
          id?: string
          mime_type?: string | null
          session_id: string
          size_bytes?: number | null
          slot: string
          storage_path: string
          uploaded_at?: string
          width?: number | null
        }
        Update: {
          ai_labels?: Json | null
          created_at?: string
          height?: number | null
          id?: string
          mime_type?: string | null
          session_id?: string
          size_bytes?: number | null
          slot?: string
          storage_path?: string
          uploaded_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_photos_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_recommendations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          kind: string
          meta: Json
          priority: number
          reason: string | null
          ref_id: string | null
          ref_slug: string | null
          session_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          kind: string
          meta?: Json
          priority?: number
          reason?: string | null
          ref_id?: string | null
          ref_slug?: string | null
          session_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          meta?: Json
          priority?: number
          reason?: string | null
          ref_id?: string | null
          ref_slug?: string | null
          session_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_recommendations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_results: {
        Row: {
          ai_model: string | null
          ai_raw: Json | null
          ai_summary: string | null
          confidence: number | null
          created_at: string
          id: string
          key_findings: Json
          probable_causes: Json
          processing_ms: number | null
          scale_scores: Json
          session_id: string
          severity: string
          updated_at: string
          urgency: string | null
        }
        Insert: {
          ai_model?: string | null
          ai_raw?: Json | null
          ai_summary?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          key_findings?: Json
          probable_causes?: Json
          processing_ms?: number | null
          scale_scores?: Json
          session_id: string
          severity: string
          updated_at?: string
          urgency?: string | null
        }
        Update: {
          ai_model?: string | null
          ai_raw?: Json | null
          ai_summary?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          key_findings?: Json
          probable_causes?: Json
          processing_ms?: number | null
          scale_scores?: Json
          session_id?: string
          severity?: string
          updated_at?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_sessions: {
        Row: {
          age: number | null
          campaign: string | null
          category: string
          channel: string
          completed_at: string | null
          consent_at: string | null
          consent_given: boolean
          contact_city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          definition_id: string
          gender: string | null
          id: string
          ip_address: string | null
          lead_person_id: string | null
          person_id: string | null
          progress_pct: number
          public_token: string
          responses: Json
          source: string | null
          started_at: string
          status: string
          submitted_at: string | null
          tenant_id: string | null
          updated_at: string
          user_agent: string | null
          utm: Json
        }
        Insert: {
          age?: number | null
          campaign?: string | null
          category: string
          channel?: string
          completed_at?: string | null
          consent_at?: string | null
          consent_given?: boolean
          contact_city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          definition_id: string
          gender?: string | null
          id?: string
          ip_address?: string | null
          lead_person_id?: string | null
          person_id?: string | null
          progress_pct?: number
          public_token?: string
          responses?: Json
          source?: string | null
          started_at?: string
          status?: string
          submitted_at?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_agent?: string | null
          utm?: Json
        }
        Update: {
          age?: number | null
          campaign?: string | null
          category?: string
          channel?: string
          completed_at?: string | null
          consent_at?: string | null
          consent_given?: boolean
          contact_city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          definition_id?: string
          gender?: string | null
          id?: string
          ip_address?: string | null
          lead_person_id?: string | null
          person_id?: string | null
          progress_pct?: number
          public_token?: string
          responses?: Json
          source?: string | null
          started_at?: string
          status?: string
          submitted_at?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_agent?: string | null
          utm?: Json
        }
        Relationships: [
          {
            foreignKeyName: "assessment_sessions_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "assessment_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_sessions_lead_person_id_fkey"
            columns: ["lead_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_sessions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      attribution_credits: {
        Row: {
          branch_id: string | null
          campaign_id: string | null
          created_at: string
          credit_amount: number
          credit_pct: number
          currency: string
          doctor_id: string | null
          franchise_id: string | null
          google_campaign_id: string | null
          id: string
          lead_id: string | null
          lead_source: string | null
          master_franchise_id: string | null
          membership_id: string | null
          meta: Json
          meta_campaign_id: string | null
          model: string
          person_id: string
          product_id: string | null
          referral_partner_id: string | null
          referral_source: string | null
          revenue_event_id: string
          sales_owner_id: string | null
          subscription_id: string | null
          telecaller_id: string | null
          tenant_id: string
          therapist_id: string | null
          treatment_id: string | null
          utm: Json
        }
        Insert: {
          branch_id?: string | null
          campaign_id?: string | null
          created_at?: string
          credit_amount: number
          credit_pct?: number
          currency?: string
          doctor_id?: string | null
          franchise_id?: string | null
          google_campaign_id?: string | null
          id?: string
          lead_id?: string | null
          lead_source?: string | null
          master_franchise_id?: string | null
          membership_id?: string | null
          meta?: Json
          meta_campaign_id?: string | null
          model?: string
          person_id: string
          product_id?: string | null
          referral_partner_id?: string | null
          referral_source?: string | null
          revenue_event_id: string
          sales_owner_id?: string | null
          subscription_id?: string | null
          telecaller_id?: string | null
          tenant_id: string
          therapist_id?: string | null
          treatment_id?: string | null
          utm?: Json
        }
        Update: {
          branch_id?: string | null
          campaign_id?: string | null
          created_at?: string
          credit_amount?: number
          credit_pct?: number
          currency?: string
          doctor_id?: string | null
          franchise_id?: string | null
          google_campaign_id?: string | null
          id?: string
          lead_id?: string | null
          lead_source?: string | null
          master_franchise_id?: string | null
          membership_id?: string | null
          meta?: Json
          meta_campaign_id?: string | null
          model?: string
          person_id?: string
          product_id?: string | null
          referral_partner_id?: string | null
          referral_source?: string | null
          revenue_event_id?: string
          sales_owner_id?: string | null
          subscription_id?: string | null
          telecaller_id?: string | null
          tenant_id?: string
          therapist_id?: string | null
          treatment_id?: string | null
          utm?: Json
        }
        Relationships: [
          {
            foreignKeyName: "attribution_credits_revenue_event_id_fkey"
            columns: ["revenue_event_id"]
            isOneToOne: false
            referencedRelation: "revenue_events"
            referencedColumns: ["id"]
          },
        ]
      }
      attribution_touches: {
        Row: {
          ad_id: string | null
          campaign_id: string | null
          creative_id: string | null
          device: string | null
          geo: Json | null
          google_campaign_id: string | null
          id: number
          landing_page: string | null
          lead_id: string | null
          medium: string | null
          meta_campaign_id: string | null
          occurred_at: string
          person_id: string
          source: string | null
          tenant_id: string
          touch_kind: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          ad_id?: string | null
          campaign_id?: string | null
          creative_id?: string | null
          device?: string | null
          geo?: Json | null
          google_campaign_id?: string | null
          id?: number
          landing_page?: string | null
          lead_id?: string | null
          medium?: string | null
          meta_campaign_id?: string | null
          occurred_at?: string
          person_id: string
          source?: string | null
          tenant_id: string
          touch_kind: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          ad_id?: string | null
          campaign_id?: string | null
          creative_id?: string | null
          device?: string | null
          geo?: Json | null
          google_campaign_id?: string | null
          id?: number
          landing_page?: string | null
          lead_id?: string | null
          medium?: string | null
          meta_campaign_id?: string | null
          occurred_at?: string
          person_id?: string
          source?: string | null
          tenant_id?: string
          touch_kind?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attribution_touches_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_touches_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          diff: Json | null
          id: number
          ip: unknown
          org_unit_id: string | null
          row_id: string | null
          table_name: string
          tenant_id: string | null
          ts: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          diff?: Json | null
          id?: number
          ip?: unknown
          org_unit_id?: string | null
          row_id?: string | null
          table_name: string
          tenant_id?: string | null
          ts?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          diff?: Json | null
          id?: number
          ip?: unknown
          org_unit_id?: string | null
          row_id?: string | null
          table_name?: string
          tenant_id?: string | null
          ts?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      automation_triggers: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          event_filter: Json
          event_type: string | null
          id: string
          is_active: boolean
          last_fired_at: string | null
          name: string
          schedule_cron: string | null
          tenant_id: string | null
          trigger_type: string
          updated_at: string
          updated_by: string | null
          workflow_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          event_filter?: Json
          event_type?: string | null
          id?: string
          is_active?: boolean
          last_fired_at?: string | null
          name: string
          schedule_cron?: string | null
          tenant_id?: string | null
          trigger_type: string
          updated_at?: string
          updated_by?: string | null
          workflow_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          event_filter?: Json
          event_type?: string | null
          id?: string
          is_active?: boolean
          last_fired_at?: string | null
          name?: string
          schedule_cron?: string | null
          tenant_id?: string | null
          trigger_type?: string
          updated_at?: string
          updated_by?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_triggers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_triggers_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          account_type: string | null
          bank_name: string
          branch: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency_code: string | null
          display_order: number
          id: string
          ifsc: string | null
          is_active: boolean
          is_primary: boolean
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          account_type?: string | null
          bank_name: string
          branch?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          display_order?: number
          id?: string
          ifsc?: string | null
          is_active?: boolean
          is_primary?: boolean
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          account_type?: string | null
          bank_name?: string
          branch?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          display_order?: number
          id?: string
          ifsc?: string | null
          is_active?: boolean
          is_primary?: boolean
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address_id: string | null
          bank_account_id: string | null
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          display_order: number
          email: string | null
          gst_registration_id: string | null
          id: string
          is_active: boolean
          name: string
          org_unit_id: string | null
          phone: string | null
          settings: Json
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address_id?: string | null
          bank_account_id?: string | null
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          email?: string | null
          gst_registration_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          org_unit_id?: string | null
          phone?: string | null
          settings?: Json
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address_id?: string | null
          bank_account_id?: string | null
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          email?: string | null
          gst_registration_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          org_unit_id?: string | null
          phone?: string | null
          settings?: Json
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "company_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_gst_registration_id_fkey"
            columns: ["gst_registration_id"]
            isOneToOne: false
            referencedRelation: "gst_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          code: string
          company_id: string | null
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_active: boolean
          logo_url: string | null
          meta: Json
          name: string
          primary_color: string | null
          secondary_color: string | null
          tagline: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          logo_url?: string | null
          meta?: Json
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          tagline?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          logo_url?: string | null
          meta?: Json
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          tagline?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brands_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          created_at: string
          created_by: string | null
          display_order: number
          district_id: string
          id: string
          is_active: boolean
          is_metro: boolean
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          district_id: string
          id?: string
          is_active?: boolean
          is_metro?: boolean
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          district_id?: string
          id?: string
          is_active?: boolean
          is_metro?: boolean
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cities_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_ab_assignments: {
        Row: {
          converted: boolean
          converted_at: string | null
          created_at: string
          experiment_id: string
          id: number
          variant: string
          visitor_id: string
        }
        Insert: {
          converted?: boolean
          converted_at?: string | null
          created_at?: string
          experiment_id: string
          id?: number
          variant: string
          visitor_id: string
        }
        Update: {
          converted?: boolean
          converted_at?: string | null
          created_at?: string
          experiment_id?: string
          id?: number
          variant?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_ab_assignments_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "cms_ab_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_ab_experiments: {
        Row: {
          created_at: string
          created_by: string | null
          ended_at: string | null
          goal_event: string | null
          id: string
          name: string
          page_id: string
          started_at: string | null
          status: string
          tenant_id: string
          traffic_split: number
          updated_at: string
          variant_a: Json
          variant_b: Json
          winner: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          goal_event?: string | null
          id?: string
          name: string
          page_id: string
          started_at?: string | null
          status?: string
          tenant_id: string
          traffic_split?: number
          updated_at?: string
          variant_a: Json
          variant_b: Json
          winner?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          goal_event?: string | null
          id?: string
          name?: string
          page_id?: string
          started_at?: string | null
          status?: string
          tenant_id?: string
          traffic_split?: number
          updated_at?: string
          variant_a?: Json
          variant_b?: Json
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_ab_experiments_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "cms_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_academy_courses: {
        Row: {
          brochure_url: string | null
          cover_url: string | null
          created_at: string
          currency: string | null
          duration: string | null
          faculty: Json | null
          id: string
          level: string | null
          outline: Json | null
          price: number | null
          published_at: string | null
          seo: Json | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["cms_status"]
          subtitle: string | null
          summary: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          brochure_url?: string | null
          cover_url?: string | null
          created_at?: string
          currency?: string | null
          duration?: string | null
          faculty?: Json | null
          id?: string
          level?: string | null
          outline?: Json | null
          price?: number | null
          published_at?: string | null
          seo?: Json | null
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["cms_status"]
          subtitle?: string | null
          summary?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          brochure_url?: string | null
          cover_url?: string | null
          created_at?: string
          currency?: string | null
          duration?: string | null
          faculty?: Json | null
          id?: string
          level?: string | null
          outline?: Json | null
          price?: number | null
          published_at?: string | null
          seo?: Json | null
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["cms_status"]
          subtitle?: string | null
          summary?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_academy_courses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_appointment_requests: {
        Row: {
          city: string | null
          created_at: string
          doctor_slug: string | null
          email: string | null
          full_name: string
          id: string
          message: string | null
          meta: Json | null
          phone: string
          preferred_at: string | null
          source: string | null
          status: Database["public"]["Enums"]["cms_appointment_status"]
          tenant_id: string
          treatment_slug: string | null
          updated_at: string
          utm: Json | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          doctor_slug?: string | null
          email?: string | null
          full_name: string
          id?: string
          message?: string | null
          meta?: Json | null
          phone: string
          preferred_at?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["cms_appointment_status"]
          tenant_id: string
          treatment_slug?: string | null
          updated_at?: string
          utm?: Json | null
        }
        Update: {
          city?: string | null
          created_at?: string
          doctor_slug?: string | null
          email?: string | null
          full_name?: string
          id?: string
          message?: string | null
          meta?: Json | null
          phone?: string
          preferred_at?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["cms_appointment_status"]
          tenant_id?: string
          treatment_slug?: string | null
          updated_at?: string
          utm?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_appointment_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_block_types: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string | null
          icon: string | null
          is_active: boolean
          name: string
          schema: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          code: string
          created_at?: string
          description?: string | null
          icon?: string | null
          is_active?: boolean
          name: string
          schema?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          is_active?: boolean
          name?: string
          schema?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cms_blog_authors: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          employee_id: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          socials: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          employee_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          socials?: Json | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          employee_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          socials?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_blog_authors_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_blog_authors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_blog_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          seo: Json | null
          slug: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          seo?: Json | null
          slug: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          seo?: Json | null
          slug?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_blog_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cms_blog_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_blog_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_blog_post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_blog_post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "cms_blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_blog_post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "cms_blog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_blog_posts: {
        Row: {
          author_id: string | null
          body_blocks: Json
          body_text: string | null
          category_id: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          id: string
          publish_at: string | null
          published_at: string | null
          reading_minutes: number | null
          seo: Json | null
          slug: string
          status: Database["public"]["Enums"]["cms_status"]
          tenant_id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          author_id?: string | null
          body_blocks?: Json
          body_text?: string | null
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          publish_at?: string | null
          published_at?: string | null
          reading_minutes?: number | null
          seo?: Json | null
          slug: string
          status?: Database["public"]["Enums"]["cms_status"]
          tenant_id: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          author_id?: string | null
          body_blocks?: Json
          body_text?: string | null
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          publish_at?: string | null
          published_at?: string | null
          reading_minutes?: number | null
          seo?: Json | null
          slug?: string
          status?: Database["public"]["Enums"]["cms_status"]
          tenant_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "cms_blog_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "cms_blog_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_blog_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_blog_tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_blog_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_doctors: {
        Row: {
          bio: string | null
          clinics: Json | null
          created_at: string
          credentials: string[] | null
          employee_id: string | null
          gallery: Json | null
          id: string
          languages: string[] | null
          name: string
          photo_url: string | null
          published_at: string | null
          seo: Json | null
          slug: string
          sort_order: number
          specialties: string[] | null
          status: Database["public"]["Enums"]["cms_status"]
          tenant_id: string
          title: string | null
          updated_at: string
          years_experience: number | null
        }
        Insert: {
          bio?: string | null
          clinics?: Json | null
          created_at?: string
          credentials?: string[] | null
          employee_id?: string | null
          gallery?: Json | null
          id?: string
          languages?: string[] | null
          name: string
          photo_url?: string | null
          published_at?: string | null
          seo?: Json | null
          slug: string
          sort_order?: number
          specialties?: string[] | null
          status?: Database["public"]["Enums"]["cms_status"]
          tenant_id: string
          title?: string | null
          updated_at?: string
          years_experience?: number | null
        }
        Update: {
          bio?: string | null
          clinics?: Json | null
          created_at?: string
          credentials?: string[] | null
          employee_id?: string | null
          gallery?: Json | null
          id?: string
          languages?: string[] | null
          name?: string
          photo_url?: string | null
          published_at?: string | null
          seo?: Json | null
          slug?: string
          sort_order?: number
          specialties?: string[] | null
          status?: Database["public"]["Enums"]["cms_status"]
          tenant_id?: string
          title?: string | null
          updated_at?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_doctors_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_doctors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_franchise_offers: {
        Row: {
          area_sqft_max: number | null
          area_sqft_min: number | null
          benefits: Json | null
          brochure_url: string | null
          cities: string[] | null
          cover_url: string | null
          created_at: string
          currency: string | null
          description_blocks: Json
          id: string
          investment_max: number | null
          investment_min: number | null
          published_at: string | null
          seo: Json | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["cms_status"]
          summary: string | null
          tenant_id: string
          tier: string | null
          title: string
          updated_at: string
        }
        Insert: {
          area_sqft_max?: number | null
          area_sqft_min?: number | null
          benefits?: Json | null
          brochure_url?: string | null
          cities?: string[] | null
          cover_url?: string | null
          created_at?: string
          currency?: string | null
          description_blocks?: Json
          id?: string
          investment_max?: number | null
          investment_min?: number | null
          published_at?: string | null
          seo?: Json | null
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["cms_status"]
          summary?: string | null
          tenant_id: string
          tier?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          area_sqft_max?: number | null
          area_sqft_min?: number | null
          benefits?: Json | null
          brochure_url?: string | null
          cities?: string[] | null
          cover_url?: string | null
          created_at?: string
          currency?: string | null
          description_blocks?: Json
          id?: string
          investment_max?: number | null
          investment_min?: number | null
          published_at?: string | null
          seo?: Json | null
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["cms_status"]
          summary?: string | null
          tenant_id?: string
          tier?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_franchise_offers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_media_assets: {
        Row: {
          alt_text: string | null
          bucket: string
          caption: string | null
          created_at: string
          created_by: string | null
          document_id: string | null
          focal_point: Json | null
          folder: string | null
          height: number | null
          id: string
          is_public: boolean
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          tags: string[] | null
          tenant_id: string
          updated_at: string
          variants: Json | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          bucket?: string
          caption?: string | null
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          focal_point?: Json | null
          folder?: string | null
          height?: number | null
          id?: string
          is_public?: boolean
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          tags?: string[] | null
          tenant_id: string
          updated_at?: string
          variants?: Json | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          bucket?: string
          caption?: string | null
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          focal_point?: Json | null
          folder?: string | null
          height?: number | null
          id?: string
          is_public?: boolean
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string
          variants?: Json | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_media_assets_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_media_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_media_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          path: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          path: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          path?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_media_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cms_media_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_navigation_menus: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          items: Json
          location: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          items?: Json
          location: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          items?: Json
          location?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_navigation_menus_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_page_forms: {
        Row: {
          block_id: string | null
          conversion_event: string | null
          created_at: string
          form_id: string
          id: string
          is_primary: boolean
          page_id: string
          tenant_id: string
          workflow_id: string | null
        }
        Insert: {
          block_id?: string | null
          conversion_event?: string | null
          created_at?: string
          form_id: string
          id?: string
          is_primary?: boolean
          page_id: string
          tenant_id: string
          workflow_id?: string | null
        }
        Update: {
          block_id?: string | null
          conversion_event?: string | null
          created_at?: string
          form_id?: string
          id?: string
          is_primary?: boolean
          page_id?: string
          tenant_id?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_page_forms_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_page_forms_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "cms_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_page_publish_log: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          page_id: string
          snapshot: Json
          tenant_id: string
          to_status: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          page_id: string
          snapshot: Json
          tenant_id: string
          to_status?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          page_id?: string
          snapshot?: Json
          tenant_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_page_publish_log_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "cms_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_page_revisions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          page_id: string
          snapshot: Json
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          page_id: string
          snapshot: Json
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          page_id?: string
          snapshot?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_page_revisions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "cms_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_page_templates: {
        Row: {
          blocks: Json
          category: string | null
          created_at: string
          created_by: string | null
          cta_config: Json
          default_schema: Json
          default_seo: Json
          default_tracking: Json
          description: string | null
          id: string
          is_active: boolean
          is_global: boolean
          name: string
          slug: string
          suggested_forms: string[]
          tenant_id: string | null
          thumbnail_url: string | null
          updated_at: string
          vertical: string | null
        }
        Insert: {
          blocks?: Json
          category?: string | null
          created_at?: string
          created_by?: string | null
          cta_config?: Json
          default_schema?: Json
          default_seo?: Json
          default_tracking?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          is_global?: boolean
          name: string
          slug: string
          suggested_forms?: string[]
          tenant_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          vertical?: string | null
        }
        Update: {
          blocks?: Json
          category?: string | null
          created_at?: string
          created_by?: string | null
          cta_config?: Json
          default_schema?: Json
          default_seo?: Json
          default_tracking?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          is_global?: boolean
          name?: string
          slug?: string
          suggested_forms?: string[]
          tenant_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          vertical?: string | null
        }
        Relationships: []
      }
      cms_pages: {
        Row: {
          blocks: Json
          campaign_id: string | null
          created_at: string
          created_by: string | null
          goal_event: string | null
          id: string
          og_image_url: string | null
          parent_id: string | null
          path: string
          publish_at: string | null
          published_at: string | null
          scheduled_at: string | null
          seo: Json
          seo_score: number | null
          slug: string
          status: Database["public"]["Enums"]["cms_status"]
          template: string
          template_id: string | null
          tenant_id: string
          title: string
          tracking: Json
          updated_at: string
          updated_by: string | null
          utm_defaults: Json
        }
        Insert: {
          blocks?: Json
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          goal_event?: string | null
          id?: string
          og_image_url?: string | null
          parent_id?: string | null
          path: string
          publish_at?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          seo?: Json
          seo_score?: number | null
          slug: string
          status?: Database["public"]["Enums"]["cms_status"]
          template?: string
          template_id?: string | null
          tenant_id: string
          title: string
          tracking?: Json
          updated_at?: string
          updated_by?: string | null
          utm_defaults?: Json
        }
        Update: {
          blocks?: Json
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          goal_event?: string | null
          id?: string
          og_image_url?: string | null
          parent_id?: string | null
          path?: string
          publish_at?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          seo?: Json
          seo_score?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["cms_status"]
          template?: string
          template_id?: string | null
          tenant_id?: string
          title?: string
          tracking?: Json
          updated_at?: string
          updated_by?: string | null
          utm_defaults?: Json
        }
        Relationships: [
          {
            foreignKeyName: "cms_pages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cms_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_products: {
        Row: {
          benefits: Json | null
          brand: string | null
          category: string | null
          compare_at_price: number | null
          cover_url: string | null
          created_at: string
          cta_url: string | null
          currency: string | null
          description_blocks: Json
          gallery: Json | null
          id: string
          ingredients: Json | null
          name: string
          price: number | null
          published_at: string | null
          seo: Json | null
          short_description: string | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["cms_status"]
          tenant_id: string
          updated_at: string
          usage: string | null
        }
        Insert: {
          benefits?: Json | null
          brand?: string | null
          category?: string | null
          compare_at_price?: number | null
          cover_url?: string | null
          created_at?: string
          cta_url?: string | null
          currency?: string | null
          description_blocks?: Json
          gallery?: Json | null
          id?: string
          ingredients?: Json | null
          name: string
          price?: number | null
          published_at?: string | null
          seo?: Json | null
          short_description?: string | null
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["cms_status"]
          tenant_id: string
          updated_at?: string
          usage?: string | null
        }
        Update: {
          benefits?: Json | null
          brand?: string | null
          category?: string | null
          compare_at_price?: number | null
          cover_url?: string | null
          created_at?: string
          cta_url?: string | null
          currency?: string | null
          description_blocks?: Json
          gallery?: Json | null
          id?: string
          ingredients?: Json | null
          name?: string
          price?: number | null
          published_at?: string | null
          seo?: Json | null
          short_description?: string | null
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["cms_status"]
          tenant_id?: string
          updated_at?: string
          usage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_redirects: {
        Row: {
          created_at: string
          from_path: string
          id: string
          is_active: boolean
          notes: string | null
          status_code: number
          tenant_id: string
          to_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_path: string
          id?: string
          is_active?: boolean
          notes?: string | null
          status_code?: number
          tenant_id: string
          to_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_path?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          status_code?: number
          tenant_id?: string
          to_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_redirects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_section_library: {
        Row: {
          block: Json
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_global: boolean
          name: string
          tenant_id: string | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          block: Json
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_global?: boolean
          name: string
          tenant_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          block?: Json
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_global?: boolean
          name?: string
          tenant_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cms_seo_audits: {
        Row: {
          checked_at: string
          checked_by: string | null
          id: string
          issues: Json
          page_id: string
          score: number
          tenant_id: string
        }
        Insert: {
          checked_at?: string
          checked_by?: string | null
          id?: string
          issues?: Json
          page_id: string
          score: number
          tenant_id: string
        }
        Update: {
          checked_at?: string
          checked_by?: string | null
          id?: string
          issues?: Json
          page_id?: string
          score?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_seo_audits_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "cms_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_sites: {
        Row: {
          accent_color: string | null
          address: Json | null
          brand_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          default_seo: Json | null
          favicon_url: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          primary_color: string | null
          robots_directives: string | null
          socials: Json | null
          tagline: string | null
          tenant_id: string
          tracking: Json | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          address?: Json | null
          brand_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          default_seo?: Json | null
          favicon_url?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          primary_color?: string | null
          robots_directives?: string | null
          socials?: Json | null
          tagline?: string | null
          tenant_id: string
          tracking?: Json | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          address?: Json | null
          brand_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          default_seo?: Json | null
          favicon_url?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          primary_color?: string | null
          robots_directives?: string | null
          socials?: Json | null
          tagline?: string | null
          tenant_id?: string
          tracking?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_sites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_tracking_events: {
        Row: {
          event_type: string
          first_touch: Json | null
          id: number
          ip_hash: string | null
          last_touch: Json | null
          meta: Json
          occurred_at: string
          page_id: string | null
          path: string | null
          person_id: string | null
          referrer: string | null
          session_id: string | null
          tenant_id: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string | null
        }
        Insert: {
          event_type: string
          first_touch?: Json | null
          id?: number
          ip_hash?: string | null
          last_touch?: Json | null
          meta?: Json
          occurred_at?: string
          page_id?: string | null
          path?: string | null
          person_id?: string | null
          referrer?: string | null
          session_id?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
        }
        Update: {
          event_type?: string
          first_touch?: Json | null
          id?: number
          ip_hash?: string | null
          last_touch?: Json | null
          meta?: Json
          occurred_at?: string
          page_id?: string | null
          path?: string | null
          person_id?: string | null
          referrer?: string | null
          session_id?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      cms_treatment_doctors: {
        Row: {
          doctor_id: string
          treatment_id: string
        }
        Insert: {
          doctor_id: string
          treatment_id: string
        }
        Update: {
          doctor_id?: string
          treatment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_treatment_doctors_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "cms_doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_treatment_doctors_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "cms_treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_treatments: {
        Row: {
          before_after: Json | null
          benefits: Json | null
          category: string | null
          cover_url: string | null
          created_at: string
          description_blocks: Json
          duration_minutes: number | null
          faq: Json | null
          gallery: Json | null
          id: string
          name: string
          price_currency: string | null
          price_from: number | null
          price_to: number | null
          published_at: string | null
          seo: Json | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["cms_status"]
          summary: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          before_after?: Json | null
          benefits?: Json | null
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description_blocks?: Json
          duration_minutes?: number | null
          faq?: Json | null
          gallery?: Json | null
          id?: string
          name: string
          price_currency?: string | null
          price_from?: number | null
          price_to?: number | null
          published_at?: string | null
          seo?: Json | null
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["cms_status"]
          summary?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          before_after?: Json | null
          benefits?: Json | null
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description_blocks?: Json
          duration_minutes?: number | null
          faq?: Json | null
          gallery?: Json | null
          id?: string
          name?: string
          price_currency?: string | null
          price_from?: number | null
          price_to?: number | null
          published_at?: string | null
          seo?: Json | null
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["cms_status"]
          summary?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_treatments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_accruals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attribution_credit_id: string | null
          audit: Json
          base_amount: number
          beneficiary_id: string
          beneficiary_type: string
          calc_amount: number
          computed_at: string
          created_at: string
          currency: string
          id: string
          locked_at: string | null
          notes: string | null
          paid_at: string | null
          payout_ref: string | null
          period_key: string
          plan_id: string | null
          plan_version: number | null
          revenue_event_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          rule_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attribution_credit_id?: string | null
          audit?: Json
          base_amount: number
          beneficiary_id: string
          beneficiary_type: string
          calc_amount: number
          computed_at?: string
          created_at?: string
          currency?: string
          id?: string
          locked_at?: string | null
          notes?: string | null
          paid_at?: string | null
          payout_ref?: string | null
          period_key: string
          plan_id?: string | null
          plan_version?: number | null
          revenue_event_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          rule_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attribution_credit_id?: string | null
          audit?: Json
          base_amount?: number
          beneficiary_id?: string
          beneficiary_type?: string
          calc_amount?: number
          computed_at?: string
          created_at?: string
          currency?: string
          id?: string
          locked_at?: string | null
          notes?: string | null
          paid_at?: string | null
          payout_ref?: string | null
          period_key?: string
          plan_id?: string | null
          plan_version?: number | null
          revenue_event_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          rule_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_accruals_attribution_credit_id_fkey"
            columns: ["attribution_credit_id"]
            isOneToOne: false
            referencedRelation: "attribution_credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_accruals_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "commission_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_accruals_revenue_event_id_fkey"
            columns: ["revenue_event_id"]
            isOneToOne: false
            referencedRelation: "revenue_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_accruals_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "commission_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_assignments: {
        Row: {
          beneficiary_id: string
          beneficiary_type: string
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          entity_scope: string
          id: string
          is_active: boolean
          meta: Json
          plan_id: string
          scope_ref: string | null
          split_pct: number | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          beneficiary_id: string
          beneficiary_type: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          entity_scope?: string
          id?: string
          is_active?: boolean
          meta?: Json
          plan_id: string
          scope_ref?: string | null
          split_pct?: number | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          beneficiary_id?: string
          beneficiary_type?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          entity_scope?: string
          id?: string
          is_active?: boolean
          meta?: Json
          plan_id?: string
          scope_ref?: string | null
          split_pct?: number | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_assignments_beneficiary_type_fkey"
            columns: ["beneficiary_type"]
            isOneToOne: false
            referencedRelation: "commission_beneficiary_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "commission_assignments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "commission_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_audit_logs: {
        Row: {
          accrual_id: string | null
          action: string
          actor_id: string | null
          after: Json | null
          at: string
          before: Json | null
          id: number
          plan_id: string | null
          rule_id: string | null
          tenant_id: string
        }
        Insert: {
          accrual_id?: string | null
          action: string
          actor_id?: string | null
          after?: Json | null
          at?: string
          before?: Json | null
          id?: number
          plan_id?: string | null
          rule_id?: string | null
          tenant_id: string
        }
        Update: {
          accrual_id?: string | null
          action?: string
          actor_id?: string | null
          after?: Json | null
          at?: string
          before?: Json | null
          id?: number
          plan_id?: string | null
          rule_id?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      commission_beneficiary_types: {
        Row: {
          code: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      commission_periods: {
        Row: {
          created_at: string
          id: string
          locked_at: string | null
          locked_by: string | null
          meta: Json
          paid_at: string | null
          paid_by: string | null
          period_key: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          meta?: Json
          paid_at?: string | null
          paid_by?: string | null
          period_key: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          meta?: Json
          paid_at?: string | null
          paid_by?: string | null
          period_key?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      commission_plan_versions: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          created_at: string
          id: string
          plan_id: string
          replaced_at: string | null
          rollback_of_version: number | null
          snapshot: Json
          tenant_id: string
          version: number
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string
          id?: string
          plan_id: string
          replaced_at?: string | null
          rollback_of_version?: number | null
          snapshot: Json
          tenant_id: string
          version: number
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string
          id?: string
          plan_id?: string
          replaced_at?: string | null
          rollback_of_version?: number | null
          snapshot?: Json
          tenant_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "commission_plan_versions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "commission_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_plans: {
        Row: {
          beneficiary_type: string
          code: string
          created_at: string
          created_by: string | null
          currency: string
          effective_from: string
          effective_to: string | null
          id: string
          is_active: boolean
          meta: Json
          name: string
          notes: string | null
          parent_plan_id: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          beneficiary_type: string
          code: string
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean
          meta?: Json
          name: string
          notes?: string | null
          parent_plan_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          beneficiary_type?: string
          code?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean
          meta?: Json
          name?: string
          notes?: string | null
          parent_plan_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "commission_plans_beneficiary_type_fkey"
            columns: ["beneficiary_type"]
            isOneToOne: false
            referencedRelation: "commission_beneficiary_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "commission_plans_parent_plan_id_fkey"
            columns: ["parent_plan_id"]
            isOneToOne: false
            referencedRelation: "commission_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          applies_to: Json
          calc_config: Json
          calc_kind: string
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          is_active: boolean
          plan_id: string
          priority: number
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          applies_to?: Json
          calc_config?: Json
          calc_kind: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean
          plan_id: string
          priority?: number
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          applies_to?: Json
          calc_config?: Json
          calc_kind?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean
          plan_id?: string
          priority?: number
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "commission_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          brand_name: string | null
          cin: string | null
          code: string
          created_at: string
          created_by: string | null
          display_order: number
          email: string | null
          id: string
          is_active: boolean
          legal_name: string
          logo_url: string | null
          meta: Json
          pan: string | null
          phone: string | null
          tan: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          website: string | null
        }
        Insert: {
          brand_name?: string | null
          cin?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          email?: string | null
          id?: string
          is_active?: boolean
          legal_name: string
          logo_url?: string | null
          meta?: Json
          pan?: string | null
          phone?: string | null
          tan?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          brand_name?: string | null
          cin?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          email?: string | null
          id?: string
          is_active?: boolean
          legal_name?: string
          logo_url?: string | null
          meta?: Json
          pan?: string | null
          phone?: string | null
          tan?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      company_addresses: {
        Row: {
          area_id: string | null
          city_id: string | null
          company_id: string
          country_id: string | null
          created_at: string
          created_by: string | null
          district_id: string | null
          id: string
          is_active: boolean
          is_primary: boolean
          kind: string
          label: string | null
          landmark: string | null
          line1: string
          line2: string | null
          pincode: string | null
          state_id: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          area_id?: string | null
          city_id?: string | null
          company_id: string
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          district_id?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          kind: string
          label?: string | null
          landmark?: string | null
          line1: string
          line2?: string | null
          pincode?: string | null
          state_id?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          area_id?: string | null
          city_id?: string | null
          company_id?: string
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          district_id?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          kind?: string
          label?: string | null
          landmark?: string | null
          line1?: string
          line2?: string | null
          pincode?: string | null
          state_id?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_addresses_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_addresses_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_addresses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_addresses_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_addresses_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_addresses_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_addresses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          currency_code: string | null
          currency_symbol: string | null
          display_order: number
          id: string
          is_active: boolean
          iso2: string | null
          iso3: string | null
          name: string
          phone_code: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          currency_symbol?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          iso2?: string | null
          iso3?: string | null
          name: string
          phone_code?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          currency_symbol?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          iso2?: string | null
          iso3?: string | null
          name?: string
          phone_code?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      dashboard_layouts: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          role_code: string | null
          scope: string
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          role_code?: string | null
          scope?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          role_code?: string | null
          scope?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_layouts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_widgets: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_active: boolean
          layout_id: string
          position: Json
          title: string
          updated_at: string
          updated_by: string | null
          widget_type: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          layout_id: string
          position?: Json
          title: string
          updated_at?: string
          updated_by?: string | null
          widget_type: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          layout_id?: string
          position?: Json
          title?: string
          updated_at?: string
          updated_by?: string | null
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widgets_layout_id_fkey"
            columns: ["layout_id"]
            isOneToOne: false
            referencedRelation: "dashboard_layouts"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          head_employee_id: string | null
          id: string
          is_active: boolean
          kind: string | null
          meta: Json
          name: string
          org_unit_id: string | null
          parent_id: string | null
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          head_employee_id?: string | null
          id?: string
          is_active?: boolean
          kind?: string | null
          meta?: Json
          name: string
          org_unit_id?: string | null
          parent_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          head_employee_id?: string | null
          id?: string
          is_active?: boolean
          kind?: string | null
          meta?: Json
          name?: string
          org_unit_id?: string | null
          parent_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_head_fk"
            columns: ["head_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      device_logs: {
        Row: {
          app: string | null
          device_id: string | null
          id: number
          os: string | null
          push_token: string | null
          ts: string
          user_id: string | null
        }
        Insert: {
          app?: string | null
          device_id?: string | null
          id?: number
          os?: string | null
          push_token?: string | null
          ts?: string
          user_id?: string | null
        }
        Update: {
          app?: string | null
          device_id?: string | null
          id?: number
          os?: string | null
          push_token?: string | null
          ts?: string
          user_id?: string | null
        }
        Relationships: []
      }
      districts: {
        Row: {
          code: string | null
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          state_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          state_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          state_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "districts_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      document_folders: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          is_system: boolean
          name: string
          parent_id: string | null
          path: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_system?: boolean
          name: string
          parent_id?: string | null
          path?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_system?: boolean
          name?: string
          parent_id?: string | null
          path?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_links: {
        Row: {
          created_at: string
          document_id: string
          entity_id: string
          entity_type: string
          id: number
        }
        Insert: {
          created_at?: string
          document_id: string
          entity_id: string
          entity_type: string
          id?: number
        }
        Update: {
          created_at?: string
          document_id?: string
          entity_id?: string
          entity_type?: string
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_links_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_tag_map: {
        Row: {
          document_id: string
          tag_id: string
        }
        Insert: {
          document_id: string
          tag_id: string
        }
        Update: {
          document_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_tag_map_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_tag_map_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "document_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      document_tags: {
        Row: {
          color: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          color?: string | null
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          color?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          created_at: string
          created_by: string | null
          document_id: string
          file_id: string | null
          id: string
          note: string | null
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_id: string
          file_id?: string | null
          id?: string
          note?: string | null
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_id?: string
          file_id?: string | null
          id?: string
          note?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          current_version: number
          entity_id: string | null
          entity_type: string | null
          file_id: string | null
          folder_id: string | null
          id: string
          meta: Json
          name: string
          ocr_text: string | null
          signed_at: string | null
          signed_by: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          visibility: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          current_version?: number
          entity_id?: string | null
          entity_type?: string | null
          file_id?: string | null
          folder_id?: string | null
          id?: string
          meta?: Json
          name: string
          ocr_text?: string | null
          signed_at?: string | null
          signed_by?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          visibility?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          current_version?: number
          entity_id?: string | null
          entity_type?: string | null
          file_id?: string | null
          folder_id?: string | null
          id?: string
          meta?: Json
          name?: string
          ocr_text?: string | null
          signed_at?: string | null
          signed_by?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string | null
          designation: string | null
          display_order: number
          email: string | null
          employee_code: string
          exited_at: string | null
          full_name: string
          id: string
          is_active: boolean
          joined_at: string | null
          meta: Json
          org_unit_id: string | null
          phone: string | null
          reporting_manager_id: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          designation?: string | null
          display_order?: number
          email?: string | null
          employee_code: string
          exited_at?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          joined_at?: string | null
          meta?: Json
          org_unit_id?: string | null
          phone?: string | null
          reporting_manager_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          designation?: string | null
          display_order?: number
          email?: string | null
          employee_code?: string
          exited_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          joined_at?: string | null
          meta?: Json
          org_unit_id?: string | null
          phone?: string | null
          reporting_manager_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_reporting_manager_id_fkey"
            columns: ["reporting_manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          enabled: boolean
          key: string
          rollout: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          key: string
          rollout?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          key?: string
          rollout?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          bucket: string
          created_at: string
          id: string
          kind: string | null
          meta: Json
          mime: string | null
          org_unit_id: string | null
          path: string
          size_bytes: number | null
          tenant_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          bucket: string
          created_at?: string
          id?: string
          kind?: string | null
          meta?: Json
          mime?: string | null
          org_unit_id?: string | null
          path: string
          size_bytes?: number | null
          tenant_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: string
          kind?: string | null
          meta?: Json
          mime?: string | null
          org_unit_id?: string | null
          path?: string
          size_bytes?: number | null
          tenant_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      form_definitions: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          entity: string | null
          id: string
          is_active: boolean
          is_system: boolean
          module: string | null
          name: string
          schema: Json
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          module?: string | null
          name: string
          schema?: Json
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          module?: string | null
          name?: string
          schema?: Json
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "form_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          created_at: string
          data: Json
          entity_ref: Json | null
          form_id: string
          id: string
          submitted_by: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          entity_ref?: Json | null
          form_id: string
          id?: string
          submitted_by?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          entity_ref?: Json | null
          form_id?: string
          id?: string
          submitted_by?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      global_settings: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          key: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          key: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          key?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "global_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gst_registrations: {
        Row: {
          address: Json
          company_id: string
          created_at: string
          created_by: string | null
          effective_from: string | null
          effective_to: string | null
          gstin: string
          id: string
          is_active: boolean
          is_primary: boolean
          legal_name: string | null
          state_id: string | null
          tenant_id: string
          trade_name: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: Json
          company_id: string
          created_at?: string
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          gstin: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          legal_name?: string | null
          state_id?: string | null
          tenant_id: string
          trade_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: Json
          company_id?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          gstin?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          legal_name?: string | null
          state_id?: string | null
          tenant_id?: string
          trade_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gst_registrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gst_registrations_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gst_registrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          is_primary_payer: boolean
          joined_at: string
          person_id: string
          role_in_household: string | null
          tenant_id: string
        }
        Insert: {
          household_id: string
          is_primary_payer?: boolean
          joined_at?: string
          person_id: string
          role_in_household?: string | null
          tenant_id: string
        }
        Update: {
          household_id?: string
          is_primary_payer?: boolean
          joined_at?: string
          person_id?: string
          role_in_household?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          address_id: string | null
          created_at: string
          created_by: string | null
          head_person_id: string | null
          id: string
          name: string
          notes: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address_id?: string | null
          created_at?: string
          created_by?: string | null
          head_person_id?: string | null
          id?: string
          name: string
          notes?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address_id?: string | null
          created_at?: string
          created_by?: string | null
          head_person_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "households_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "person_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "households_head_person_id_fkey"
            columns: ["head_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "households_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_api_logs: {
        Row: {
          connection_id: string | null
          created_at: string
          endpoint: string | null
          error: string | null
          id: string
          latency_ms: number | null
          method: string | null
          provider_code: string | null
          request_summary: Json | null
          response_summary: Json | null
          status_code: number | null
          tenant_id: string | null
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          endpoint?: string | null
          error?: string | null
          id?: string
          latency_ms?: number | null
          method?: string | null
          provider_code?: string | null
          request_summary?: Json | null
          response_summary?: Json | null
          status_code?: number | null
          tenant_id?: string | null
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          endpoint?: string | null
          error?: string | null
          id?: string
          latency_ms?: number | null
          method?: string | null
          provider_code?: string | null
          request_summary?: Json | null
          response_summary?: Json | null
          status_code?: number | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_api_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_api_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          config: Json
          connected_by: string | null
          created_at: string
          created_by: string | null
          credentials_ref: string | null
          id: string
          is_active: boolean
          label: string
          last_error: string | null
          last_sync_at: string | null
          provider_code: string
          scopes: string[]
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config?: Json
          connected_by?: string | null
          created_at?: string
          created_by?: string | null
          credentials_ref?: string | null
          id?: string
          is_active?: boolean
          label: string
          last_error?: string | null
          last_sync_at?: string | null
          provider_code: string
          scopes?: string[]
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config?: Json
          connected_by?: string | null
          created_at?: string
          created_by?: string | null
          credentials_ref?: string | null
          id?: string
          is_active?: boolean
          label?: string
          last_error?: string | null
          last_sync_at?: string | null
          provider_code?: string
          scopes?: string[]
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_provider_code_fkey"
            columns: ["provider_code"]
            isOneToOne: false
            referencedRelation: "integration_providers"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "integration_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_jobs: {
        Row: {
          attempts: number
          connection_id: string | null
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string | null
          job_type: string
          last_error: string | null
          max_attempts: number
          next_run_at: string
          payload: Json
          provider_code: string
          result: Json | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          connection_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          job_type: string
          last_error?: string | null
          max_attempts?: number
          next_run_at?: string
          payload?: Json
          provider_code: string
          result?: Json | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          connection_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          job_type?: string
          last_error?: string | null
          max_attempts?: number
          next_run_at?: string
          payload?: Json
          provider_code?: string
          result?: Json | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_jobs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_providers: {
        Row: {
          auth_type: string
          category: string
          code: string
          config_schema: Json
          created_at: string
          description: string | null
          display_order: number
          docs_url: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          auth_type: string
          category: string
          code: string
          config_schema?: Json
          created_at?: string
          description?: string | null
          display_order?: number
          docs_url?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          auth_type?: string
          category?: string
          code?: string
          config_schema?: Json
          created_at?: string
          description?: string | null
          display_order?: number
          docs_url?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      integration_webhook_events: {
        Row: {
          created_at: string
          error: string | null
          event_type: string | null
          headers: Json
          id: string
          payload: Json
          processed_at: string | null
          retry_count: number
          signature_valid: boolean
          tenant_id: string | null
          webhook_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type?: string | null
          headers?: Json
          id?: string
          payload?: Json
          processed_at?: string | null
          retry_count?: number
          signature_valid?: boolean
          tenant_id?: string | null
          webhook_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string | null
          headers?: Json
          id?: string
          payload?: Json
          processed_at?: string | null
          retry_count?: number
          signature_valid?: boolean
          tenant_id?: string | null
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_webhook_events_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "integration_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_webhooks: {
        Row: {
          connection_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_types: string[]
          id: string
          is_active: boolean
          secret_ref: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          url_slug: string
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_types?: string[]
          id?: string
          is_active?: boolean
          secret_ref?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          url_slug: string
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_types?: string[]
          id?: string
          is_active?: boolean
          secret_ref?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          url_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_webhooks_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          appointment_id: string | null
          attachments: Json
          body: string | null
          channel: string
          created_at: string
          created_by: string | null
          direction: string
          disposition_code: string | null
          duration_sec: number | null
          external_ref: string | null
          id: string
          interaction_type: string | null
          lead_id: string | null
          meta: Json
          occurred_at: string
          outcome: string | null
          owner_id: string | null
          patient_id: string | null
          person_id: string
          recording_url: string | null
          source: string | null
          status: string
          subject: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          attachments?: Json
          body?: string | null
          channel: string
          created_at?: string
          created_by?: string | null
          direction?: string
          disposition_code?: string | null
          duration_sec?: number | null
          external_ref?: string | null
          id?: string
          interaction_type?: string | null
          lead_id?: string | null
          meta?: Json
          occurred_at?: string
          outcome?: string | null
          owner_id?: string | null
          patient_id?: string | null
          person_id: string
          recording_url?: string | null
          source?: string | null
          status?: string
          subject?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          attachments?: Json
          body?: string | null
          channel?: string
          created_at?: string
          created_by?: string | null
          direction?: string
          disposition_code?: string | null
          duration_sec?: number | null
          external_ref?: string | null
          id?: string
          interaction_type?: string | null
          lead_id?: string | null
          meta?: Json
          occurred_at?: string
          outcome?: string | null
          owner_id?: string | null
          patient_id?: string | null
          person_id?: string
          recording_url?: string | null
          source?: string | null
          status?: string
          subject?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_logs: {
        Row: {
          event: string | null
          geo: Json | null
          id: number
          ip: unknown
          ts: string
          user_id: string | null
        }
        Insert: {
          event?: string | null
          geo?: Json | null
          id?: number
          ip?: unknown
          ts?: string
          user_id?: string | null
        }
        Update: {
          event?: string | null
          geo?: Json | null
          id?: number
          ip?: unknown
          ts?: string
          user_id?: string | null
        }
        Relationships: []
      }
      lead_assignments: {
        Row: {
          assigned_by: string | null
          assigned_from: string | null
          assigned_from_type: string | null
          assigned_to: string | null
          assigned_to_type: string
          assignment_kind: string
          created_at: string
          created_by: string | null
          effective_at: string
          ended_at: string | null
          id: string
          lead_id: string
          meta: Json
          person_id: string
          reason: string | null
          sla_impact: Json
          tenant_id: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_from?: string | null
          assigned_from_type?: string | null
          assigned_to?: string | null
          assigned_to_type?: string
          assignment_kind?: string
          created_at?: string
          created_by?: string | null
          effective_at?: string
          ended_at?: string | null
          id?: string
          lead_id: string
          meta?: Json
          person_id: string
          reason?: string | null
          sla_impact?: Json
          tenant_id: string
        }
        Update: {
          assigned_by?: string | null
          assigned_from?: string | null
          assigned_from_type?: string | null
          assigned_to?: string | null
          assigned_to_type?: string
          assignment_kind?: string
          created_at?: string
          created_by?: string | null
          effective_at?: string
          ended_at?: string | null
          id?: string
          lead_id?: string
          meta?: Json
          person_id?: string
          reason?: string | null
          sla_impact?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_callbacks: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          notes: string | null
          outcome: string | null
          owner_id: string | null
          scheduled_at: string
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          outcome?: string | null
          owner_id?: string | null
          scheduled_at: string
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          outcome?: string | null
          owner_id?: string | null
          scheduled_at?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_callbacks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_channel_mappings: {
        Row: {
          branch_default: string | null
          campaign_alias: string | null
          created_at: string
          created_by: string | null
          external_ad_id: string | null
          external_campaign_id: string | null
          external_conversation_id: string | null
          external_form_id: string | null
          external_page_id: string | null
          field_map: Json
          franchise_default: string | null
          id: string
          is_active: boolean
          meta: Json
          owner_default: string | null
          provider: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_default?: string | null
          campaign_alias?: string | null
          created_at?: string
          created_by?: string | null
          external_ad_id?: string | null
          external_campaign_id?: string | null
          external_conversation_id?: string | null
          external_form_id?: string | null
          external_page_id?: string | null
          field_map?: Json
          franchise_default?: string | null
          id?: string
          is_active?: boolean
          meta?: Json
          owner_default?: string | null
          provider: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_default?: string | null
          campaign_alias?: string | null
          created_at?: string
          created_by?: string | null
          external_ad_id?: string | null
          external_campaign_id?: string | null
          external_conversation_id?: string | null
          external_form_id?: string | null
          external_page_id?: string | null
          field_map?: Json
          franchise_default?: string | null
          id?: string
          is_active?: boolean
          meta?: Json
          owner_default?: string | null
          provider?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      lead_dispositions: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          kind: string
          name: string
          sort_order: number
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          name: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      lead_documents: {
        Row: {
          created_at: string
          created_by: string | null
          document_id: string
          id: string
          lead_id: string
          note: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_id: string
          id?: string
          lead_id: string
          note?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_id?: string
          id?: string
          lead_id?: string
          note?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_follow_ups: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          due_at: string
          id: string
          kind: string
          lead_id: string
          notes: string | null
          owner_id: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_at: string
          id?: string
          kind?: string
          lead_id: string
          notes?: string | null
          owner_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string
          id?: string
          kind?: string
          lead_id?: string
          notes?: string | null
          owner_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_reasons: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          kind: string
          name: string
          sort_order: number
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          kind: string
          name: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      lead_scoring_events: {
        Row: {
          actor_id: string | null
          created_at: string
          delta: number
          id: number
          kind: string
          lead_id: string
          meta: Json
          reason: string | null
          tenant_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          delta?: number
          id?: number
          kind: string
          lead_id: string
          meta?: Json
          reason?: string | null
          tenant_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          delta?: number
          id?: number
          kind?: string
          lead_id?: string
          meta?: Json
          reason?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_scoring_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_scripts: {
        Row: {
          applies_to: Json
          body: string
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          applies_to?: Json
          body: string
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          applies_to?: Json
          body?: string
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      lead_source_history: {
        Row: {
          ad_id: string | null
          campaign_id: string | null
          creative_id: string | null
          device: string | null
          external_ref: string | null
          geo: Json | null
          google_campaign_id: string | null
          id: number
          landing_page: string | null
          lead_id: string
          meta_campaign_id: string | null
          occurred_at: string
          referrer: string | null
          source: string | null
          sub_source: string | null
          tenant_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          ad_id?: string | null
          campaign_id?: string | null
          creative_id?: string | null
          device?: string | null
          external_ref?: string | null
          geo?: Json | null
          google_campaign_id?: string | null
          id?: number
          landing_page?: string | null
          lead_id: string
          meta_campaign_id?: string | null
          occurred_at?: string
          referrer?: string | null
          source?: string | null
          sub_source?: string | null
          tenant_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          ad_id?: string | null
          campaign_id?: string | null
          creative_id?: string | null
          device?: string | null
          external_ref?: string | null
          geo?: Json | null
          google_campaign_id?: string | null
          id?: number
          landing_page?: string | null
          lead_id?: string
          meta_campaign_id?: string | null
          occurred_at?: string
          referrer?: string | null
          source?: string | null
          sub_source?: string | null
          tenant_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_source_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_stages: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_terminal: boolean
          name: string
          probability: number
          sla_minutes: number | null
          sort_order: number
          tenant_id: string
          terminal_kind: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_terminal?: boolean
          name: string
          probability?: number
          sla_minutes?: number | null
          sort_order?: number
          tenant_id: string
          terminal_kind?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_terminal?: boolean
          name?: string
          probability?: number
          sla_minutes?: number | null
          sort_order?: number
          tenant_id?: string
          terminal_kind?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      lead_suggestions: {
        Row: {
          body: string | null
          confidence: number | null
          created_at: string
          id: string
          kind: string
          lead_id: string
          meta: Json
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          kind: string
          lead_id: string
          meta?: Json
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          kind?: string
          lead_id?: string
          meta?: Json
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_suggestions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ad_id: string | null
          ai_score: number
          assessment_session_id: string | null
          behavior_score: number
          branch_id: string | null
          browser: string | null
          campaign_id: string | null
          city: string | null
          converted_at: string | null
          converted_person_id: string | null
          converted_to: string | null
          country: string | null
          created_at: string
          created_by: string | null
          creative_id: string | null
          currency: string
          device: string | null
          expected_value: number | null
          first_response_sla_at: string | null
          first_touch: Json
          follow_up_sla_at: string | null
          franchise_id: string | null
          google_campaign_id: string | null
          id: string
          keyword: string | null
          landing_page: string | null
          last_touch: Json
          lead_code: string
          lead_score: number
          lost_reason_id: string | null
          manual_score: number
          marketing_score: number
          master_franchise_id: string | null
          meta: Json
          meta_campaign_id: string | null
          next_follow_up_at: string | null
          owner_id: string | null
          person_id: string
          priority: string
          probability: number
          referral_partner_id: string | null
          referral_source: string | null
          referrer: string | null
          region: string | null
          sales_score: number
          sla_breached_at: string | null
          source: string | null
          stage_code: string
          status: string
          sub_source: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          won_reason_id: string | null
        }
        Insert: {
          ad_id?: string | null
          ai_score?: number
          assessment_session_id?: string | null
          behavior_score?: number
          branch_id?: string | null
          browser?: string | null
          campaign_id?: string | null
          city?: string | null
          converted_at?: string | null
          converted_person_id?: string | null
          converted_to?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          creative_id?: string | null
          currency?: string
          device?: string | null
          expected_value?: number | null
          first_response_sla_at?: string | null
          first_touch?: Json
          follow_up_sla_at?: string | null
          franchise_id?: string | null
          google_campaign_id?: string | null
          id?: string
          keyword?: string | null
          landing_page?: string | null
          last_touch?: Json
          lead_code: string
          lead_score?: number
          lost_reason_id?: string | null
          manual_score?: number
          marketing_score?: number
          master_franchise_id?: string | null
          meta?: Json
          meta_campaign_id?: string | null
          next_follow_up_at?: string | null
          owner_id?: string | null
          person_id: string
          priority?: string
          probability?: number
          referral_partner_id?: string | null
          referral_source?: string | null
          referrer?: string | null
          region?: string | null
          sales_score?: number
          sla_breached_at?: string | null
          source?: string | null
          stage_code?: string
          status?: string
          sub_source?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          won_reason_id?: string | null
        }
        Update: {
          ad_id?: string | null
          ai_score?: number
          assessment_session_id?: string | null
          behavior_score?: number
          branch_id?: string | null
          browser?: string | null
          campaign_id?: string | null
          city?: string | null
          converted_at?: string | null
          converted_person_id?: string | null
          converted_to?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          creative_id?: string | null
          currency?: string
          device?: string | null
          expected_value?: number | null
          first_response_sla_at?: string | null
          first_touch?: Json
          follow_up_sla_at?: string | null
          franchise_id?: string | null
          google_campaign_id?: string | null
          id?: string
          keyword?: string | null
          landing_page?: string | null
          last_touch?: Json
          lead_code?: string
          lead_score?: number
          lost_reason_id?: string | null
          manual_score?: number
          marketing_score?: number
          master_franchise_id?: string | null
          meta?: Json
          meta_campaign_id?: string | null
          next_follow_up_at?: string | null
          owner_id?: string | null
          person_id?: string
          priority?: string
          probability?: number
          referral_partner_id?: string | null
          referral_source?: string | null
          referrer?: string | null
          region?: string | null
          sales_score?: number
          sla_breached_at?: string | null
          source?: string | null
          stage_code?: string
          status?: string
          sub_source?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          won_reason_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_person_id_fkey"
            columns: ["converted_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      ltv_person: {
        Row: {
          consultation_rev: number
          first_conversion_at: string | null
          last_activity_at: string | null
          membership_rev: number
          other_rev: number
          person_id: string
          product_rev: number
          subscription_rev: number
          tenant_id: string
          total_revenue: number
          treatment_rev: number
          updated_at: string
        }
        Insert: {
          consultation_rev?: number
          first_conversion_at?: string | null
          last_activity_at?: string | null
          membership_rev?: number
          other_rev?: number
          person_id: string
          product_rev?: number
          subscription_rev?: number
          tenant_id: string
          total_revenue?: number
          treatment_rev?: number
          updated_at?: string
        }
        Update: {
          consultation_rev?: number
          first_conversion_at?: string | null
          last_activity_at?: string | null
          membership_rev?: number
          other_rev?: number
          person_id?: string
          product_rev?: number
          subscription_rev?: number
          tenant_id?: string
          total_revenue?: number
          treatment_rev?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ltv_person_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      master_types: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          icon: string | null
          is_system: boolean
          name: string
          supports_hierarchy: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          icon?: string | null
          is_system?: boolean
          name: string
          supports_hierarchy?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          icon?: string | null
          is_system?: boolean
          name?: string
          supports_hierarchy?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      masters: {
        Row: {
          code: string
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          is_system: boolean
          meta: Json
          name: string
          parent_id: string | null
          tenant_id: string | null
          type_code: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          meta?: Json
          name: string
          parent_id?: string | null
          tenant_id?: string | null
          type_code: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          meta?: Json
          name?: string
          parent_id?: string | null
          tenant_id?: string | null
          type_code?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "masters_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "masters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "masters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "masters_type_code_fkey"
            columns: ["type_code"]
            isOneToOne: false
            referencedRelation: "master_types"
            referencedColumns: ["code"]
          },
        ]
      }
      notes: {
        Row: {
          attachments: Json
          body: string
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          mentions: string[]
          pinned: boolean
          tenant_id: string
          updated_at: string
          updated_by: string | null
          visibility: string
        }
        Insert: {
          attachments?: Json
          body: string
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          mentions?: string[]
          pinned?: boolean
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          visibility?: string
        }
        Update: {
          attachments?: Json
          body?: string
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          mentions?: string[]
          pinned?: boolean
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          channel: string
          enabled: boolean
          kind: string
          user_id: string
        }
        Insert: {
          channel: string
          enabled?: boolean
          kind: string
          user_id: string
        }
        Update: {
          channel?: string
          enabled?: boolean
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_rules: {
        Row: {
          channels: string[]
          code: string
          condition: Json
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          is_active: boolean
          name: string
          recipients: Json
          template_ids: Json
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          channels?: string[]
          code: string
          condition?: Json
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          is_active?: boolean
          name: string
          recipients?: Json
          template_ids?: Json
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          channels?: string[]
          code?: string
          condition?: Json
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          is_active?: boolean
          name?: string
          recipients?: Json
          template_ids?: Json
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          data: Json
          id: string
          kind: string
          org_unit_id: string | null
          read_at: string | null
          severity: string
          tenant_id: string | null
          title: string
          ts: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          data?: Json
          id?: string
          kind: string
          org_unit_id?: string | null
          read_at?: string | null
          severity?: string
          tenant_id?: string | null
          title: string
          ts?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          data?: Json
          id?: string
          kind?: string
          org_unit_id?: string | null
          read_at?: string | null
          severity?: string
          tenant_id?: string | null
          title?: string
          ts?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      org_units: {
        Row: {
          code: string | null
          created_at: string
          id: string
          meta: Json
          name: string
          parent_id: string | null
          path: unknown
          tenant_id: string
          type: Database["public"]["Enums"]["org_unit_type"]
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          meta?: Json
          name: string
          parent_id?: string | null
          path?: unknown
          tenant_id: string
          type: Database["public"]["Enums"]["org_unit_type"]
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          meta?: Json
          name?: string
          parent_id?: string | null
          path?: unknown
          tenant_id?: string
          type?: Database["public"]["Enums"]["org_unit_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_units_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          allergies: Json
          barcode_value: string | null
          blood_group: string | null
          chronic_conditions: Json
          created_at: string
          created_by: string | null
          current_medications: Json
          family_history: Json
          home_branch_id: string | null
          id: string
          mrn: string | null
          person_id: string
          primary_doctor_id: string | null
          qr_payload: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allergies?: Json
          barcode_value?: string | null
          blood_group?: string | null
          chronic_conditions?: Json
          created_at?: string
          created_by?: string | null
          current_medications?: Json
          family_history?: Json
          home_branch_id?: string | null
          id?: string
          mrn?: string | null
          person_id: string
          primary_doctor_id?: string | null
          qr_payload?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allergies?: Json
          barcode_value?: string | null
          blood_group?: string | null
          chronic_conditions?: Json
          created_at?: string
          created_by?: string | null
          current_medications?: Json
          family_history?: Json
          home_branch_id?: string | null
          id?: string
          mrn?: string | null
          person_id?: string
          primary_doctor_id?: string | null
          qr_payload?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_home_branch_id_fkey"
            columns: ["home_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          code: string
          created_at: string
          description: string | null
          resource: string
        }
        Insert: {
          action: string
          code: string
          created_at?: string
          description?: string | null
          resource: string
        }
        Update: {
          action?: string
          code?: string
          created_at?: string
          description?: string | null
          resource?: string
        }
        Relationships: []
      }
      person_academy_students: {
        Row: {
          created_at: string
          created_by: string | null
          enrollment_code: string | null
          id: string
          person_id: string
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enrollment_code?: string | null
          id?: string
          person_id: string
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enrollment_code?: string | null
          id?: string
          person_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_academy_students_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_academy_students_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      person_address_types: {
        Row: {
          code: string
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      person_addresses: {
        Row: {
          address_type: string
          area: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          district: string | null
          geohash: string | null
          id: string
          is_primary: boolean
          is_verified: boolean
          landmark: string | null
          lat: number | null
          line1: string
          line2: string | null
          lng: number | null
          person_id: string
          pincode: string | null
          state: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          address_type: string
          area?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          district?: string | null
          geohash?: string | null
          id?: string
          is_primary?: boolean
          is_verified?: boolean
          landmark?: string | null
          lat?: number | null
          line1: string
          line2?: string | null
          lng?: number | null
          person_id: string
          pincode?: string | null
          state?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          address_type?: string
          area?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          district?: string | null
          geohash?: string | null
          id?: string
          is_primary?: boolean
          is_verified?: boolean
          landmark?: string | null
          lat?: number | null
          line1?: string
          line2?: string | null
          lng?: number | null
          person_id?: string
          pincode?: string | null
          state?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_addresses_address_type_fkey"
            columns: ["address_type"]
            isOneToOne: false
            referencedRelation: "person_address_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "person_addresses_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_addresses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      person_consent_purposes: {
        Row: {
          code: string
          is_required: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          is_required?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          is_required?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      person_consents: {
        Row: {
          consent_version: string
          created_at: string
          created_by: string | null
          evidence_url: string | null
          granted: boolean
          granted_at: string | null
          id: string
          ip: string | null
          person_id: string
          purpose_code: string
          revoked_at: string | null
          source: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          user_agent: string | null
        }
        Insert: {
          consent_version: string
          created_at?: string
          created_by?: string | null
          evidence_url?: string | null
          granted: boolean
          granted_at?: string | null
          id?: string
          ip?: string | null
          person_id: string
          purpose_code: string
          revoked_at?: string | null
          source?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          user_agent?: string | null
        }
        Update: {
          consent_version?: string
          created_at?: string
          created_by?: string | null
          evidence_url?: string | null
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip?: string | null
          person_id?: string
          purpose_code?: string
          revoked_at?: string | null
          source?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_consents_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_consents_purpose_code_fkey"
            columns: ["purpose_code"]
            isOneToOne: false
            referencedRelation: "person_consent_purposes"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "person_consents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      person_contact_channels: {
        Row: {
          code: string
          is_email: boolean
          is_phone: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          is_email?: boolean
          is_phone?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          is_email?: boolean
          is_phone?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      person_contacts: {
        Row: {
          channel: string
          country_code: string | null
          created_at: string
          created_by: string | null
          do_not_contact: boolean
          id: string
          is_primary: boolean
          is_verified: boolean
          label: string | null
          opt_in: boolean
          person_id: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          valid_from: string | null
          valid_to: string | null
          value_normalized: string
          value_raw: string
          verified_at: string | null
        }
        Insert: {
          channel: string
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          do_not_contact?: boolean
          id?: string
          is_primary?: boolean
          is_verified?: boolean
          label?: string | null
          opt_in?: boolean
          person_id: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          valid_to?: string | null
          value_normalized: string
          value_raw: string
          verified_at?: string | null
        }
        Update: {
          channel?: string
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          do_not_contact?: boolean
          id?: string
          is_primary?: boolean
          is_verified?: boolean
          label?: string | null
          opt_in?: boolean
          person_id?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          valid_to?: string | null
          value_normalized?: string
          value_raw?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_contacts_channel_fkey"
            columns: ["channel"]
            isOneToOne: false
            referencedRelation: "person_contact_channels"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "person_contacts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      person_corporate_contacts: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          person_id: string
          role_at_company: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          person_id: string
          role_at_company?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          person_id?: string
          role_at_company?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_corporate_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_corporate_contacts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_corporate_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      person_corporate_enrollments: {
        Row: {
          company_id: string | null
          created_at: string
          enrolled_at: string | null
          id: string
          metadata: Json
          person_id: string
          program: string | null
          tenant_id: string
          updated_at: string
          valid_to: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          enrolled_at?: string | null
          id?: string
          metadata?: Json
          person_id: string
          program?: string | null
          tenant_id: string
          updated_at?: string
          valid_to?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          enrolled_at?: string | null
          id?: string
          metadata?: Json
          person_id?: string
          program?: string | null
          tenant_id?: string
          updated_at?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_corporate_enrollments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_corporate_enrollments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_corporate_enrollments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      person_data_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          export_url: string | null
          id: string
          notes: string | null
          person_id: string
          request_type: string
          requested_at: string
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          export_url?: string | null
          id?: string
          notes?: string | null
          person_id: string
          request_type: string
          requested_at?: string
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          export_url?: string | null
          id?: string
          notes?: string | null
          person_id?: string
          request_type?: string
          requested_at?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_data_requests_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_data_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      person_doctors: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          person_id: string
          primary_branch_id: string | null
          registration_number: string | null
          specialty: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          person_id: string
          primary_branch_id?: string | null
          registration_number?: string | null
          specialty?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          person_id?: string
          primary_branch_id?: string | null
          registration_number?: string | null
          specialty?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_doctors_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_doctors_primary_branch_id_fkey"
            columns: ["primary_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_doctors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      person_duplicate_candidates: {
        Row: {
          created_at: string
          id: string
          match_signals: Json
          person_a_id: string
          person_b_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          score: number
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_signals?: Json
          person_a_id: string
          person_b_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          score: number
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          match_signals?: Json
          person_a_id?: string
          person_b_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_duplicate_candidates_person_a_id_fkey"
            columns: ["person_a_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_duplicate_candidates_person_b_id_fkey"
            columns: ["person_b_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_duplicate_candidates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      person_employees: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string | null
          designation: string | null
          employee_code: string | null
          id: string
          person_id: string
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          designation?: string | null
          employee_code?: string | null
          id?: string
          person_id: string
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          designation?: string | null
          employee_code?: string | null
          id?: string
          person_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_employees_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      person_erasure_log: {
        Row: {
          column_name: string
          erased_at: string
          id: string
          performed_by: string | null
          person_id: string
          reason: string | null
          table_name: string
          tenant_id: string
        }
        Insert: {
          column_name: string
          erased_at?: string
          id?: string
          performed_by?: string | null
          person_id: string
          reason?: string | null
          table_name: string
          tenant_id: string
        }
        Update: {
          column_name?: string
          erased_at?: string
          id?: string
          performed_by?: string | null
          person_id?: string
          reason?: string | null
          table_name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_erasure_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      person_fk_registry: {
        Row: {
          column_name: string
          id: string
          is_active: boolean
          notes: string | null
          registered_at: string
          table_name: string
          table_schema: string
        }
        Insert: {
          column_name: string
          id?: string
          is_active?: boolean
          notes?: string | null
          registered_at?: string
          table_name: string
          table_schema?: string
        }
        Update: {
          column_name?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          registered_at?: string
          table_name?: string
          table_schema?: string
        }
        Relationships: []
      }
      person_franchise_owners: {
        Row: {
          created_at: string
          created_by: string | null
          franchise_tier: string | null
          id: string
          person_id: string
          primary_branch_id: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          franchise_tier?: string | null
          id?: string
          person_id: string
          primary_branch_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          franchise_tier?: string | null
          id?: string
          person_id?: string
          primary_branch_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_franchise_owners_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_franchise_owners_primary_branch_id_fkey"
            columns: ["primary_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_franchise_owners_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      person_government_ids: {
        Row: {
          country: string | null
          created_at: string
          id: string
          id_number_hash: string
          id_type: string
          metadata: Json
          person_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          id_number_hash: string
          id_type: string
          metadata?: Json
          person_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          id_number_hash?: string
          id_type?: string
          metadata?: Json
          person_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_government_ids_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_government_ids_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      person_insurance_policies: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          person_id: string
          plan: string | null
          policy_number_hash: string | null
          provider: string | null
          tenant_id: string
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          person_id: string
          plan?: string | null
          policy_number_hash?: string | null
          provider?: string | null
          tenant_id: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          person_id?: string
          plan?: string | null
          policy_number_hash?: string | null
          provider?: string | null
          tenant_id?: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_insurance_policies_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_insurance_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      person_iot_devices: {
        Row: {
          created_at: string
          device_ref: string | null
          id: string
          kind: string | null
          linked_at: string | null
          metadata: Json
          person_id: string
          tenant_id: string
          updated_at: string
          vendor: string | null
        }
        Insert: {
          created_at?: string
          device_ref?: string | null
          id?: string
          kind?: string | null
          linked_at?: string | null
          metadata?: Json
          person_id: string
          tenant_id: string
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          created_at?: string
          device_ref?: string | null
          id?: string
          kind?: string | null
          linked_at?: string | null
          metadata?: Json
          person_id?: string
          tenant_id?: string
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_iot_devices_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_iot_devices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      person_lab_orders_ref: {
        Row: {
          created_at: string
          external_ref: string | null
          id: string
          lab_provider: string | null
          metadata: Json
          ordered_at: string | null
          person_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_ref?: string | null
          id?: string
          lab_provider?: string | null
          metadata?: Json
          ordered_at?: string | null
          person_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_ref?: string | null
          id?: string
          lab_provider?: string | null
          metadata?: Json
          ordered_at?: string | null
          person_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_lab_orders_ref_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_lab_orders_ref_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      person_leads: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          owner_id: string | null
          person_id: string
          source: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          owner_id?: string | null
          person_id: string
          source?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          owner_id?: string | null
          person_id?: string
          source?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_leads_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      person_medical_alert_types: {
        Row: {
          code: string
          default_severity: string
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          default_severity?: string
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          default_severity?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      person_medical_alerts: {
        Row: {
          alert_code: string
          created_at: string
          created_by: string | null
          details: string | null
          id: string
          is_active: boolean
          onset_date: string | null
          person_id: string
          recorded_by: string | null
          resolved_date: string | null
          severity: string
          source: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          verified_by: string | null
        }
        Insert: {
          alert_code: string
          created_at?: string
          created_by?: string | null
          details?: string | null
          id?: string
          is_active?: boolean
          onset_date?: string | null
          person_id: string
          recorded_by?: string | null
          resolved_date?: string | null
          severity?: string
          source?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          verified_by?: string | null
        }
        Update: {
          alert_code?: string
          created_at?: string
          created_by?: string | null
          details?: string | null
          id?: string
          is_active?: boolean
          onset_date?: string | null
          person_id?: string
          recorded_by?: string | null
          resolved_date?: string | null
          severity?: string
          source?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_medical_alerts_alert_code_fkey"
            columns: ["alert_code"]
            isOneToOne: false
            referencedRelation: "person_medical_alert_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "person_medical_alerts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_medical_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      person_merge_history: {
        Row: {
          action: string
          fk_repoint_summary: Json
          id: string
          merge_request_id: string | null
          performed_at: string
          performed_by: string | null
          source_person_id: string
          source_snapshot: Json
          target_person_id: string
          target_snapshot: Json
          tenant_id: string
        }
        Insert: {
          action: string
          fk_repoint_summary?: Json
          id?: string
          merge_request_id?: string | null
          performed_at?: string
          performed_by?: string | null
          source_person_id: string
          source_snapshot: Json
          target_person_id: string
          target_snapshot: Json
          tenant_id: string
        }
        Update: {
          action?: string
          fk_repoint_summary?: Json
          id?: string
          merge_request_id?: string | null
          performed_at?: string
          performed_by?: string | null
          source_person_id?: string
          source_snapshot?: Json
          target_person_id?: string
          target_snapshot?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_merge_history_merge_request_id_fkey"
            columns: ["merge_request_id"]
            isOneToOne: false
            referencedRelation: "person_merge_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_merge_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      person_merge_requests: {
        Row: {
          created_at: string
          executed_at: string | null
          id: string
          reason: string | null
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_person_id: string
          status: string
          target_person_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          executed_at?: string | null
          id?: string
          reason?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_person_id: string
          status?: string
          target_person_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          executed_at?: string | null
          id?: string
          reason?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_person_id?: string
          status?: string
          target_person_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_merge_requests_source_person_id_fkey"
            columns: ["source_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_merge_requests_target_person_id_fkey"
            columns: ["target_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_merge_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      person_relationship_types: {
        Row: {
          category: string | null
          code: string
          inverse_code: string | null
          is_reciprocal: boolean
          label: string
          sort_order: number
        }
        Insert: {
          category?: string | null
          code: string
          inverse_code?: string | null
          is_reciprocal?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          category?: string | null
          code?: string
          inverse_code?: string | null
          is_reciprocal?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      person_relationships: {
        Row: {
          created_at: string
          created_by: string | null
          from_person_id: string
          id: string
          is_emergency: boolean
          is_primary: boolean
          notes: string | null
          relationship_code: string
          tenant_id: string
          to_person_id: string
          updated_at: string
          updated_by: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_person_id: string
          id?: string
          is_emergency?: boolean
          is_primary?: boolean
          notes?: string | null
          relationship_code: string
          tenant_id: string
          to_person_id: string
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_person_id?: string
          id?: string
          is_emergency?: boolean
          is_primary?: boolean
          notes?: string | null
          relationship_code?: string
          tenant_id?: string
          to_person_id?: string
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_relationships_from_person_id_fkey"
            columns: ["from_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_relationships_relationship_code_fkey"
            columns: ["relationship_code"]
            isOneToOne: false
            referencedRelation: "person_relationship_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "person_relationships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_relationships_to_person_id_fkey"
            columns: ["to_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      person_tag_defs: {
        Row: {
          category: string | null
          code: string
          color: string | null
          created_at: string
          id: string
          is_system: boolean
          label: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          code: string
          color?: string | null
          created_at?: string
          id?: string
          is_system?: boolean
          label: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          code?: string
          color?: string | null
          created_at?: string
          id?: string
          is_system?: boolean
          label?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_tag_defs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      person_tags: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          person_id: string
          tag_def_id: string
          tenant_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          person_id: string
          tag_def_id: string
          tenant_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          person_id?: string
          tag_def_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_tags_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_tags_tag_def_id_fkey"
            columns: ["tag_def_id"]
            isOneToOne: false
            referencedRelation: "person_tag_defs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      person_vendor_contacts: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          person_id: string
          role_at_vendor: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          vendor_company_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          person_id: string
          role_at_vendor?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          vendor_company_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          person_id?: string
          role_at_vendor?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          vendor_company_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_vendor_contacts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_vendor_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_vendor_contacts_vendor_company_id_fkey"
            columns: ["vendor_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      person_verifications: {
        Row: {
          created_at: string
          created_by: string | null
          document_number_hash: string | null
          document_type: string | null
          document_url: string | null
          expires_at: string | null
          id: string
          initiated_at: string
          metadata: Json
          method: string
          person_id: string
          provider: string | null
          provider_ref: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          verified_at: string | null
          verifier_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_number_hash?: string | null
          document_type?: string | null
          document_url?: string | null
          expires_at?: string | null
          id?: string
          initiated_at?: string
          metadata?: Json
          method: string
          person_id: string
          provider?: string | null
          provider_ref?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verifier_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_number_hash?: string | null
          document_type?: string | null
          document_url?: string | null
          expires_at?: string | null
          id?: string
          initiated_at?: string
          metadata?: Json
          method?: string
          person_id?: string
          provider?: string | null
          provider_ref?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verifier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_verifications_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_verifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      person_wearable_devices: {
        Row: {
          created_at: string
          device_ref: string | null
          id: string
          linked_at: string | null
          metadata: Json
          model: string | null
          person_id: string
          tenant_id: string
          updated_at: string
          vendor: string | null
        }
        Insert: {
          created_at?: string
          device_ref?: string | null
          id?: string
          linked_at?: string | null
          metadata?: Json
          model?: string | null
          person_id: string
          tenant_id: string
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          created_at?: string
          device_ref?: string | null
          id?: string
          linked_at?: string | null
          metadata?: Json
          model?: string | null
          person_id?: string
          tenant_id?: string
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_wearable_devices_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_wearable_devices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      persons: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          display_name: string | null
          dnd_enabled: boolean
          dnd_reason: string | null
          do_not_contact: boolean
          dob: string | null
          duplicate_status: string
          email_normalized: string | null
          erasure_state: string
          first_name: string | null
          full_name: string
          gender: string | null
          id: string
          identity_status: string
          last_name: string | null
          marketing_opt_in: boolean
          merged_into_person_id: string | null
          middle_name: string | null
          national_id_hash: string | null
          phone_e164: string | null
          photo_url: string | null
          preferred_channel_code: string | null
          preferred_contact_end: string | null
          preferred_contact_start: string | null
          preferred_language: string | null
          primary_address_city: string | null
          primary_address_country: string | null
          primary_address_line1: string | null
          primary_address_pincode: string | null
          primary_address_state: string | null
          primary_lat: number | null
          primary_lng: number | null
          retention_policy_code: string | null
          retention_until: string | null
          salutation: string | null
          service_opt_in: boolean
          tenant_id: string
          timezone: string | null
          transactional_opt_in: boolean
          updated_at: string
          updated_by: string | null
          verification_status: string
          vip_flag: boolean
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          dnd_enabled?: boolean
          dnd_reason?: string | null
          do_not_contact?: boolean
          dob?: string | null
          duplicate_status?: string
          email_normalized?: string | null
          erasure_state?: string
          first_name?: string | null
          full_name: string
          gender?: string | null
          id?: string
          identity_status?: string
          last_name?: string | null
          marketing_opt_in?: boolean
          merged_into_person_id?: string | null
          middle_name?: string | null
          national_id_hash?: string | null
          phone_e164?: string | null
          photo_url?: string | null
          preferred_channel_code?: string | null
          preferred_contact_end?: string | null
          preferred_contact_start?: string | null
          preferred_language?: string | null
          primary_address_city?: string | null
          primary_address_country?: string | null
          primary_address_line1?: string | null
          primary_address_pincode?: string | null
          primary_address_state?: string | null
          primary_lat?: number | null
          primary_lng?: number | null
          retention_policy_code?: string | null
          retention_until?: string | null
          salutation?: string | null
          service_opt_in?: boolean
          tenant_id: string
          timezone?: string | null
          transactional_opt_in?: boolean
          updated_at?: string
          updated_by?: string | null
          verification_status?: string
          vip_flag?: boolean
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          dnd_enabled?: boolean
          dnd_reason?: string | null
          do_not_contact?: boolean
          dob?: string | null
          duplicate_status?: string
          email_normalized?: string | null
          erasure_state?: string
          first_name?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          identity_status?: string
          last_name?: string | null
          marketing_opt_in?: boolean
          merged_into_person_id?: string | null
          middle_name?: string | null
          national_id_hash?: string | null
          phone_e164?: string | null
          photo_url?: string | null
          preferred_channel_code?: string | null
          preferred_contact_end?: string | null
          preferred_contact_start?: string | null
          preferred_language?: string | null
          primary_address_city?: string | null
          primary_address_country?: string | null
          primary_address_line1?: string | null
          primary_address_pincode?: string | null
          primary_address_state?: string | null
          primary_lat?: number | null
          primary_lng?: number | null
          retention_policy_code?: string | null
          retention_until?: string | null
          salutation?: string | null
          service_opt_in?: boolean
          tenant_id?: string
          timezone?: string | null
          transactional_opt_in?: boolean
          updated_at?: string
          updated_by?: string | null
          verification_status?: string
          vip_flag?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "persons_merged_into_person_id_fkey"
            columns: ["merged_into_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persons_preferred_channel_code_fkey"
            columns: ["preferred_channel_code"]
            isOneToOne: false
            referencedRelation: "person_contact_channels"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "persons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pincodes: {
        Row: {
          area_id: string | null
          city_id: string
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          area_id?: string | null
          city_id: string
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          area_id?: string | null
          city_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pincodes_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pincodes_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_org_unit_id: string | null
          active_tenant_id: string | null
          address: Json
          avatar_url: string | null
          created_at: string
          dob: string | null
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          phone: string | null
          preferences: Json
          updated_at: string
        }
        Insert: {
          active_org_unit_id?: string | null
          active_tenant_id?: string | null
          address?: Json
          avatar_url?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          phone?: string | null
          preferences?: Json
          updated_at?: string
        }
        Update: {
          active_org_unit_id?: string | null
          active_tenant_id?: string | null
          address?: Json
          avatar_url?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          phone?: string | null
          preferences?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_org_unit_id_fkey"
            columns: ["active_org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_active_tenant_id_fkey"
            columns: ["active_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      report_definitions: {
        Row: {
          code: string
          columns: Json
          created_at: string
          created_by: string | null
          data_source: string
          description: string | null
          filters: Json
          group_by: Json
          id: string
          is_active: boolean
          is_system: boolean
          layout: Json
          module: string | null
          name: string
          sort: Json
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          columns?: Json
          created_at?: string
          created_by?: string | null
          data_source: string
          description?: string | null
          filters?: Json
          group_by?: Json
          id?: string
          is_active?: boolean
          is_system?: boolean
          layout?: Json
          module?: string | null
          name: string
          sort?: Json
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          columns?: Json
          created_at?: string
          created_by?: string | null
          data_source?: string
          description?: string | null
          filters?: Json
          group_by?: Json
          id?: string
          is_active?: boolean
          is_system?: boolean
          layout?: Json
          module?: string | null
          name?: string
          sort?: Json
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      report_runs: {
        Row: {
          created_at: string
          error: string | null
          file_id: string | null
          finished_at: string | null
          format: string
          id: string
          params: Json
          report_id: string
          requested_by: string | null
          row_count: number | null
          started_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          file_id?: string | null
          finished_at?: string | null
          format?: string
          id?: string
          params?: Json
          report_id: string
          requested_by?: string | null
          row_count?: number | null
          started_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          file_id?: string | null
          finished_at?: string | null
          format?: string
          id?: string
          params?: Json
          report_id?: string
          requested_by?: string | null
          row_count?: number | null
          started_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_runs_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_runs_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "report_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      report_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          cron: string
          format: string
          id: string
          is_active: boolean
          last_run_at: string | null
          next_run_at: string | null
          params: Json
          recipients: Json
          report_id: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cron: string
          format?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          params?: Json
          recipients?: Json
          report_id: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cron?: string
          format?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          params?: Json
          recipients?: Json
          report_id?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_schedules_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "report_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_events: {
        Row: {
          amount: number
          branch_id: string | null
          category: string
          created_at: string
          created_by: string | null
          currency: string
          doctor_id: string | null
          franchise_id: string | null
          id: string
          lead_id: string | null
          master_franchise_id: string | null
          membership_id: string | null
          meta: Json
          occurred_at: string
          person_id: string
          product_id: string | null
          source_module: string
          source_ref: string | null
          subscription_id: string | null
          tenant_id: string
          therapist_id: string | null
          treatment_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          branch_id?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          currency?: string
          doctor_id?: string | null
          franchise_id?: string | null
          id?: string
          lead_id?: string | null
          master_franchise_id?: string | null
          membership_id?: string | null
          meta?: Json
          occurred_at?: string
          person_id: string
          product_id?: string | null
          source_module: string
          source_ref?: string | null
          subscription_id?: string | null
          tenant_id: string
          therapist_id?: string | null
          treatment_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          doctor_id?: string | null
          franchise_id?: string | null
          id?: string
          lead_id?: string | null
          master_franchise_id?: string | null
          membership_id?: string | null
          meta?: Json
          occurred_at?: string
          person_id?: string
          product_id?: string | null
          source_module?: string
          source_ref?: string | null
          subscription_id?: string | null
          tenant_id?: string
          therapist_id?: string | null
          treatment_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_events_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      role_history: {
        Row: {
          action: string
          id: string
          meta: Json
          notes: string | null
          org_unit_id: string | null
          performed_at: string
          performed_by: string | null
          role_code: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          id?: string
          meta?: Json
          notes?: string | null
          org_unit_id?: string | null
          performed_at?: string
          performed_by?: string | null
          role_code: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          id?: string
          meta?: Json
          notes?: string | null
          org_unit_id?: string | null
          performed_at?: string
          performed_by?: string | null
          role_code?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          permission_code: string
          role_code: string
        }
        Insert: {
          permission_code: string
          role_code: string
        }
        Update: {
          permission_code?: string
          role_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_code_fkey"
            columns: ["permission_code"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "role_permissions_role_code_fkey"
            columns: ["role_code"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["code"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_customer_facing: boolean
          level: number
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_customer_facing?: boolean
          level?: number
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_customer_facing?: boolean
          level?: number
          name?: string
        }
        Relationships: []
      }
      rule_sets: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          definition: Json
          description: string | null
          id: string
          is_active: boolean
          name: string
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          definition?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          definition?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rule_sets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      search_index: {
        Row: {
          body: string | null
          entity_id: string
          entity_type: string
          id: number
          keywords: string | null
          meta: Json
          subtitle: string | null
          tenant_id: string
          title: string
          tsv: unknown
          updated_at: string
          url: string | null
        }
        Insert: {
          body?: string | null
          entity_id: string
          entity_type: string
          id?: number
          keywords?: string | null
          meta?: Json
          subtitle?: string | null
          tenant_id: string
          title: string
          tsv?: unknown
          updated_at?: string
          url?: string | null
        }
        Update: {
          body?: string | null
          entity_id?: string
          entity_type?: string
          id?: number
          keywords?: string | null
          meta?: Json
          subtitle?: string | null
          tenant_id?: string
          title?: string
          tsv?: unknown
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_index_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          device: string | null
          id: string
          ip: unknown
          last_seen: string
          revoked_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device?: string | null
          id?: string
          ip?: unknown
          last_seen?: string
          revoked_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device?: string | null
          id?: string
          ip?: unknown
          last_seen?: string
          revoked_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sla_definitions: {
        Row: {
          applies_to: Json
          code: string
          created_at: string
          created_by: string | null
          escalation_rules: Json
          id: string
          is_active: boolean
          kind: string
          name: string
          target_minutes: number
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          applies_to?: Json
          code: string
          created_at?: string
          created_by?: string | null
          escalation_rules?: Json
          id?: string
          is_active?: boolean
          kind: string
          name: string
          target_minutes: number
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          applies_to?: Json
          code?: string
          created_at?: string
          created_by?: string | null
          escalation_rules?: Json
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          target_minutes?: number
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      sla_events: {
        Row: {
          breach_type: string | null
          created_at: string
          entity_ref: Json
          escalated_at: string | null
          id: string
          policy_id: string
          resolution_due_at: string | null
          resolution_met_at: string | null
          response_due_at: string | null
          response_met_at: string | null
          started_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          breach_type?: string | null
          created_at?: string
          entity_ref: Json
          escalated_at?: string | null
          id?: string
          policy_id: string
          resolution_due_at?: string | null
          resolution_met_at?: string | null
          response_due_at?: string | null
          response_met_at?: string | null
          started_at?: string
          status?: string
          tenant_id: string
        }
        Update: {
          breach_type?: string | null
          created_at?: string
          entity_ref?: Json
          escalated_at?: string | null
          id?: string
          policy_id?: string
          resolution_due_at?: string | null
          resolution_met_at?: string | null
          response_due_at?: string | null
          response_met_at?: string | null
          started_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_events_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "sla_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_instances: {
        Row: {
          breached_at: string | null
          created_at: string
          due_at: string
          entity_id: string
          entity_type: string
          escalated_at: string | null
          escalation_level: number
          id: string
          meta: Json
          satisfied_at: string | null
          sla_def_id: string | null
          sla_kind: string
          started_at: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          breached_at?: string | null
          created_at?: string
          due_at: string
          entity_id: string
          entity_type: string
          escalated_at?: string | null
          escalation_level?: number
          id?: string
          meta?: Json
          satisfied_at?: string | null
          sla_def_id?: string | null
          sla_kind: string
          started_at?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          breached_at?: string | null
          created_at?: string
          due_at?: string
          entity_id?: string
          entity_type?: string
          escalated_at?: string | null
          escalation_level?: number
          id?: string
          meta?: Json
          satisfied_at?: string | null
          sla_def_id?: string | null
          sla_kind?: string
          started_at?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_instances_sla_def_id_fkey"
            columns: ["sla_def_id"]
            isOneToOne: false
            referencedRelation: "sla_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_policies: {
        Row: {
          applies_when: Json | null
          breach_notify: Json
          business_hours: Json
          code: string
          created_at: string
          created_by: string | null
          entity: string | null
          escalation: Json
          id: string
          is_active: boolean
          module: string | null
          name: string
          resolution_minutes: number | null
          response_minutes: number | null
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          applies_when?: Json | null
          breach_notify?: Json
          business_hours?: Json
          code: string
          created_at?: string
          created_by?: string | null
          entity?: string | null
          escalation?: Json
          id?: string
          is_active?: boolean
          module?: string | null
          name: string
          resolution_minutes?: number | null
          response_minutes?: number | null
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          applies_when?: Json | null
          breach_notify?: Json
          business_hours?: Json
          code?: string
          created_at?: string
          created_by?: string | null
          entity?: string | null
          escalation?: Json
          id?: string
          is_active?: boolean
          module?: string | null
          name?: string
          resolution_minutes?: number | null
          response_minutes?: number | null
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sla_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      states: {
        Row: {
          code: string
          country_id: string
          created_at: string
          created_by: string | null
          display_order: number
          gst_state_code: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          country_id: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          gst_state_code?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          country_id?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          gst_state_code?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "states_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          task_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          task_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          checklist: Json
          completed_at: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          due_at: string | null
          entity_ref: Json | null
          id: string
          org_unit_id: string | null
          parent_task_id: string | null
          priority: string
          recurrence: Json | null
          reminder_at: string | null
          source: string | null
          source_ref: Json | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assignee_id?: string | null
          checklist?: Json
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          due_at?: string | null
          entity_ref?: Json | null
          id?: string
          org_unit_id?: string | null
          parent_task_id?: string | null
          priority?: string
          recurrence?: Json | null
          reminder_at?: string | null
          source?: string | null
          source_ref?: Json | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assignee_id?: string | null
          checklist?: Json
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          due_at?: string | null
          entity_ref?: Json | null
          id?: string
          org_unit_id?: string | null
          parent_task_id?: string | null
          priority?: string
          recurrence?: Json | null
          reminder_at?: string | null
          source?: string | null
          source_ref?: Json | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          body: string
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          meta: Json
          name: string
          provider_template_id: string | null
          subject: string | null
          tenant_id: string | null
          type: string
          updated_at: string
          updated_by: string | null
          variables: Json
        }
        Insert: {
          body: string
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          meta?: Json
          name: string
          provider_template_id?: string | null
          subject?: string | null
          tenant_id?: string | null
          type: string
          updated_at?: string
          updated_by?: string | null
          variables?: Json
        }
        Update: {
          body?: string
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          meta?: Json
          name?: string
          provider_template_id?: string | null
          subject?: string | null
          tenant_id?: string | null
          type?: string
          updated_at?: string
          updated_by?: string | null
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_features: {
        Row: {
          config: Json
          enabled: boolean
          feature_key: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          enabled?: boolean
          feature_key: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          enabled?: boolean
          feature_key?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_features_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          code: string
          created_at: string
          id: string
          meta: Json
          name: string
          plan: string | null
          status: Database["public"]["Enums"]["tenant_status"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          meta?: Json
          name: string
          plan?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          meta?: Json
          name?: string
          plan?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          updated_at?: string
        }
        Relationships: []
      }
      timeline_events: {
        Row: {
          actor_id: string | null
          actor_label: string | null
          body: string | null
          entity_id: string
          entity_type: string
          event_type: string
          id: number
          meta: Json
          tenant_id: string
          title: string
          ts: string
        }
        Insert: {
          actor_id?: string | null
          actor_label?: string | null
          body?: string | null
          entity_id: string
          entity_type: string
          event_type: string
          id?: number
          meta?: Json
          tenant_id: string
          title: string
          ts?: string
        }
        Update: {
          actor_id?: string | null
          actor_label?: string | null
          body?: string | null
          entity_id?: string
          entity_type?: string
          event_type?: string
          id?: number
          meta?: Json
          tenant_id?: string
          title?: string
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          org_unit_id: string | null
          role_code: string
          tenant_id: string | null
          user_id: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          org_unit_id?: string | null
          role_code: string
          tenant_id?: string | null
          user_id: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          org_unit_id?: string | null
          role_code?: string
          tenant_id?: string | null
          user_id?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_code_fkey"
            columns: ["role_code"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_definitions: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          graph: Json
          id: string
          is_active: boolean
          is_system: boolean
          module: string | null
          name: string
          tenant_id: string | null
          trigger_config: Json
          trigger_type: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          graph?: Json
          id?: string
          is_active?: boolean
          is_system?: boolean
          module?: string | null
          name: string
          tenant_id?: string | null
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          graph?: Json
          id?: string
          is_active?: boolean
          is_system?: boolean
          module?: string | null
          name?: string
          tenant_id?: string | null
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          context: Json
          created_at: string
          current_node_id: string | null
          entity_ref: Json | null
          error: string | null
          finished_at: string | null
          id: string
          started_at: string
          status: string
          tenant_id: string
          trigger_source: string | null
          triggered_by: string | null
          updated_at: string
          workflow_id: string
        }
        Insert: {
          context?: Json
          created_at?: string
          current_node_id?: string | null
          entity_ref?: Json | null
          error?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          tenant_id: string
          trigger_source?: string | null
          triggered_by?: string | null
          updated_at?: string
          workflow_id: string
        }
        Update: {
          context?: Json
          created_at?: string
          current_node_id?: string | null
          entity_ref?: Json | null
          error?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          tenant_id?: string
          trigger_source?: string | null
          triggered_by?: string | null
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          input: Json | null
          node_id: string
          node_type: string
          output: Json | null
          run_id: string
          started_at: string | null
          status: string
          wait_until: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json | null
          node_id: string
          node_type: string
          output?: Json | null
          run_id: string
          started_at?: string | null
          status?: string
          wait_until?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json | null
          node_id?: string
          node_type?: string
          output?: Json | null
          run_id?: string
          started_at?: string | null
          status?: string
          wait_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _lead_current_tenant: { Args: never; Returns: string }
      _person_merge_repoint_table: {
        Args: {
          _column: string
          _dry_run: boolean
          _schema: string
          _source_id: string
          _table: string
          _target_id: string
          _tenant_id: string
        }
        Returns: Json
      }
      accrue_commissions_for_event: {
        Args: { _revenue_event_id: string }
        Returns: number
      }
      assessment_result_public: {
        Args: { p_public_token: string }
        Returns: Json
      }
      assessment_save_public: {
        Args: {
          p_contact?: Json
          p_progress_pct?: number
          p_public_token: string
          p_responses: Json
        }
        Returns: boolean
      }
      assessment_start_public: {
        Args: {
          p_channel?: string
          p_definition_code: string
          p_source?: string
          p_utm?: Json
        }
        Returns: {
          definition: Json
          public_token: string
          session_id: string
        }[]
      }
      assessment_submit_public: {
        Args: { p_consent: boolean; p_public_token: string }
        Returns: string
      }
      attribute_conversion: {
        Args: { _revenue_event_id: string }
        Returns: number
      }
      can_manage_cms: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      current_tenant_id: { Args: never; Returns: string }
      emit_automation_event: {
        Args: {
          _entity_ref?: Json
          _event_type: string
          _payload?: Json
          _tenant_id: string
        }
        Returns: number
      }
      evaluate_sla: {
        Args: { _entity_id: string; _entity_type: string }
        Returns: undefined
      }
      has_org_access: {
        Args: { _org_unit_id: string; _user_id: string }
        Returns: boolean
      }
      has_permission: {
        Args: { _org_unit_id: string; _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role_at: {
        Args: { _org_unit_id: string; _role: string; _user_id: string }
        Returns: boolean
      }
      has_tenant_access: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      index_search_entity: {
        Args: {
          _body?: string
          _entity_id: string
          _entity_type: string
          _keywords?: string
          _meta?: Json
          _subtitle?: string
          _tenant_id: string
          _title: string
          _url?: string
        }
        Returns: undefined
      }
      is_config_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      log_interaction: {
        Args: {
          _attachments?: Json
          _body?: string
          _channel: string
          _direction: string
          _disposition_code?: string
          _duration_sec?: number
          _external_ref?: string
          _lead_id?: string
          _meta?: Json
          _occurred_at?: string
          _outcome?: string
          _owner_id?: string
          _patient_id?: string
          _person_id: string
          _source?: string
          _subject?: string
          _tenant_id: string
        }
        Returns: string
      }
      log_timeline_event: {
        Args: {
          _body?: string
          _entity_id: string
          _entity_type: string
          _event_type: string
          _meta?: Json
          _tenant_id: string
          _title: string
        }
        Returns: number
      }
      move_org_unit: {
        Args: { _new_parent_id: string; _unit_id: string }
        Returns: undefined
      }
      person_merge_execute: {
        Args: {
          _reason?: string
          _request_id?: string
          _source_id: string
          _target_id: string
        }
        Returns: Json
      }
      person_merge_preview: {
        Args: { _source_id: string; _target_id: string }
        Returns: Json
      }
      person_merge_unmerge: {
        Args: { _history_id: string; _reason?: string }
        Returns: Json
      }
      person_merge_validate: {
        Args: { _source_id: string; _target_id: string }
        Returns: Json
      }
      record_revenue_event: {
        Args: {
          _amount: number
          _branch_id?: string
          _category: string
          _currency?: string
          _doctor_id?: string
          _franchise_id?: string
          _lead_id?: string
          _master_franchise_id?: string
          _membership_id?: string
          _meta?: Json
          _occurred_at?: string
          _person_id: string
          _product_id?: string
          _source_module: string
          _source_ref: string
          _subscription_id?: string
          _tenant_id: string
          _therapist_id?: string
          _treatment_id?: string
        }
        Returns: string
      }
      refresh_ltv_person: { Args: { _person_id: string }; Returns: undefined }
      search_global: {
        Args: {
          _entity_types?: string[]
          _limit?: number
          _query: string
          _tenant_id: string
        }
        Returns: {
          entity_id: string
          entity_type: string
          rank: number
          subtitle: string
          title: string
          url: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      start_workflow_run: {
        Args: { _context?: Json; _entity_ref?: Json; _workflow_id: string }
        Returns: string
      }
      sweep_sla_breaches: { Args: never; Returns: number }
      text2ltree: { Args: { "": string }; Returns: unknown }
    }
    Enums: {
      cms_appointment_status:
        | "new"
        | "contacted"
        | "scheduled"
        | "cancelled"
        | "converted"
      cms_status: "draft" | "in_review" | "scheduled" | "published" | "archived"
      org_unit_type:
        | "platform"
        | "corporate"
        | "state_master"
        | "city_franchise"
        | "express_center"
        | "advanced_center"
        | "department"
      tenant_status: "active" | "suspended" | "trial" | "closed"
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
      cms_appointment_status: [
        "new",
        "contacted",
        "scheduled",
        "cancelled",
        "converted",
      ],
      cms_status: ["draft", "in_review", "scheduled", "published", "archived"],
      org_unit_type: [
        "platform",
        "corporate",
        "state_master",
        "city_franchise",
        "express_center",
        "advanced_center",
        "department",
      ],
      tenant_status: ["active", "suspended", "trial", "closed"],
    },
  },
} as const
