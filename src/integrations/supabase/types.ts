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
      appointment_cancellation: {
        Row: {
          appointment_id: string
          cancelled_at: string
          cancelled_by: string | null
          cancelled_by_role: string | null
          created_at: string
          id: string
          meta: Json
          reason_id: string | null
          reason_notes: string | null
          refund_status: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          cancelled_at?: string
          cancelled_by?: string | null
          cancelled_by_role?: string | null
          created_at?: string
          id?: string
          meta?: Json
          reason_id?: string | null
          reason_notes?: string | null
          refund_status?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          cancelled_at?: string
          cancelled_by?: string | null
          cancelled_by_role?: string | null
          created_at?: string
          id?: string
          meta?: Json
          reason_id?: string | null
          reason_notes?: string | null
          refund_status?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_cancellation_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_cancellation_reason_id_fkey"
            columns: ["reason_id"]
            isOneToOne: false
            referencedRelation: "appointment_cancellation_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_cancellation_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_cancellation_reasons: {
        Row: {
          code: string
          counts_against_no_show: boolean
          created_at: string
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code: string
          counts_against_no_show?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          counts_against_no_show?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_cancellation_reasons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_checkin: {
        Row: {
          appointment_id: string
          arrived_at: string
          branch_id: string
          checked_in_at: string
          checked_in_by: string | null
          created_at: string
          id: string
          meta: Json
          method: string
          tenant_id: string
          token_id: string | null
          updated_at: string
          vitals: Json
        }
        Insert: {
          appointment_id: string
          arrived_at?: string
          branch_id: string
          checked_in_at?: string
          checked_in_by?: string | null
          created_at?: string
          id?: string
          meta?: Json
          method?: string
          tenant_id: string
          token_id?: string | null
          updated_at?: string
          vitals?: Json
        }
        Update: {
          appointment_id?: string
          arrived_at?: string
          branch_id?: string
          checked_in_at?: string
          checked_in_by?: string | null
          created_at?: string
          id?: string
          meta?: Json
          method?: string
          tenant_id?: string
          token_id?: string | null
          updated_at?: string
          vitals?: Json
        }
        Relationships: [
          {
            foreignKeyName: "appointment_checkin_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_checkin_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_feedback: {
        Row: {
          appointment_id: string
          channel: string | null
          comments: string | null
          created_at: string
          id: string
          meta: Json
          nps_score: number | null
          person_id: string
          rating: number | null
          submitted_at: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          channel?: string | null
          comments?: string | null
          created_at?: string
          id?: string
          meta?: Json
          nps_score?: number | null
          person_id: string
          rating?: number | null
          submitted_at?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          channel?: string | null
          comments?: string | null
          created_at?: string
          id?: string
          meta?: Json
          nps_score?: number | null
          person_id?: string
          rating?: number | null
          submitted_at?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_feedback_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_feedback_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_feedback_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_no_show: {
        Row: {
          appointment_id: string
          auto_marked: boolean
          created_at: string
          id: string
          marked_at: string
          marked_by: string | null
          meta: Json
          reason: string | null
          tenant_id: string
          updated_at: string
          waited_minutes: number | null
        }
        Insert: {
          appointment_id: string
          auto_marked?: boolean
          created_at?: string
          id?: string
          marked_at?: string
          marked_by?: string | null
          meta?: Json
          reason?: string | null
          tenant_id: string
          updated_at?: string
          waited_minutes?: number | null
        }
        Update: {
          appointment_id?: string
          auto_marked?: boolean
          created_at?: string
          id?: string
          marked_at?: string
          marked_by?: string | null
          meta?: Json
          reason?: string | null
          tenant_id?: string
          updated_at?: string
          waited_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_no_show_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_no_show_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_package_items: {
        Row: {
          created_at: string
          depends_on_item_id: string | null
          id: string
          meta: Json
          offset_days_max: number | null
          offset_days_min: number
          plan_id: string
          required: boolean
          sequence_no: number
          service_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          depends_on_item_id?: string | null
          id?: string
          meta?: Json
          offset_days_max?: number | null
          offset_days_min?: number
          plan_id: string
          required?: boolean
          sequence_no: number
          service_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          depends_on_item_id?: string | null
          id?: string
          meta?: Json
          offset_days_max?: number | null
          offset_days_min?: number
          plan_id?: string
          required?: boolean
          sequence_no?: number
          service_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_package_items_depends_on_item_id_fkey"
            columns: ["depends_on_item_id"]
            isOneToOne: false
            referencedRelation: "appointment_package_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_package_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "appointment_package_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_package_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_package_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_package_plans: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          meta: Json
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          meta?: Json
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          meta?: Json
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_package_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_queue: {
        Row: {
          avg_service_minutes: number
          branch_id: string
          code: string
          created_at: string
          id: string
          meta: Json
          name: string
          queue_date: string
          queue_type: string
          resource_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          avg_service_minutes?: number
          branch_id: string
          code: string
          created_at?: string
          id?: string
          meta?: Json
          name: string
          queue_date: string
          queue_type?: string
          resource_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          avg_service_minutes?: number
          branch_id?: string
          code?: string
          created_at?: string
          id?: string
          meta?: Json
          name?: string
          queue_date?: string
          queue_type?: string
          resource_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_queue_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_queue_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_reasons: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reasons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_recurrence_exceptions: {
        Row: {
          actor: string | null
          created_at: string
          exception_type: string
          id: string
          meta: Json
          new_start_at: string | null
          original_start_at: string
          reason_code: string | null
          replacement_appointment_id: string | null
          series_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          actor?: string | null
          created_at?: string
          exception_type: string
          id?: string
          meta?: Json
          new_start_at?: string | null
          original_start_at: string
          reason_code?: string | null
          replacement_appointment_id?: string | null
          series_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          actor?: string | null
          created_at?: string
          exception_type?: string
          id?: string
          meta?: Json
          new_start_at?: string | null
          original_start_at?: string
          reason_code?: string | null
          replacement_appointment_id?: string | null
          series_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_recurrence_exceptio_replacement_appointment_id_fkey"
            columns: ["replacement_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_recurrence_exceptions_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "appointment_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_recurrence_exceptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_reminders: {
        Row: {
          appointment_id: string
          attempt_no: number
          channel: string
          created_at: string
          id: string
          last_error: string | null
          meta: Json
          provider_ref: string | null
          scheduled_at: string
          sent_at: string | null
          status: string
          template_code: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          attempt_no?: number
          channel: string
          created_at?: string
          id?: string
          last_error?: string | null
          meta?: Json
          provider_ref?: string | null
          scheduled_at: string
          sent_at?: string | null
          status?: string
          template_code?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          attempt_no?: number
          channel?: string
          created_at?: string
          id?: string
          last_error?: string | null
          meta?: Json
          provider_ref?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          template_code?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_reschedule: {
        Row: {
          appointment_id: string
          created_at: string
          from_branch_id: string | null
          from_resource_id: string | null
          from_starts_at: string
          id: string
          meta: Json
          reason: string | null
          rescheduled_at: string
          rescheduled_by: string | null
          rescheduled_by_role: string | null
          tenant_id: string
          to_branch_id: string | null
          to_resource_id: string | null
          to_starts_at: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          from_branch_id?: string | null
          from_resource_id?: string | null
          from_starts_at: string
          id?: string
          meta?: Json
          reason?: string | null
          rescheduled_at?: string
          rescheduled_by?: string | null
          rescheduled_by_role?: string | null
          tenant_id: string
          to_branch_id?: string | null
          to_resource_id?: string | null
          to_starts_at: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          from_branch_id?: string | null
          from_resource_id?: string | null
          from_starts_at?: string
          id?: string
          meta?: Json
          reason?: string | null
          rescheduled_at?: string
          rescheduled_by?: string | null
          rescheduled_by_role?: string | null
          tenant_id?: string
          to_branch_id?: string | null
          to_resource_id?: string | null
          to_starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reschedule_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_reschedule_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_sequence_items: {
        Row: {
          actual_date: string | null
          appointment_id: string | null
          created_at: string
          id: string
          item_id: string
          meta: Json
          planned_date: string | null
          sequence_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          actual_date?: string | null
          appointment_id?: string | null
          created_at?: string
          id?: string
          item_id: string
          meta?: Json
          planned_date?: string | null
          sequence_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          actual_date?: string | null
          appointment_id?: string | null
          created_at?: string
          id?: string
          item_id?: string
          meta?: Json
          planned_date?: string | null
          sequence_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_sequence_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "appointment_package_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_sequence_items_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "appointment_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_sequence_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asqi_appointment_fk"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_sequences: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          membership_id: string | null
          meta: Json
          package_id: string | null
          person_id: string
          plan_id: string
          started_at: string
          status: string
          subscription_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          membership_id?: string | null
          meta?: Json
          package_id?: string | null
          person_id: string
          plan_id: string
          started_at?: string
          status?: string
          subscription_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          membership_id?: string | null
          meta?: Json
          package_id?: string | null
          person_id?: string
          plan_id?: string
          started_at?: string
          status?: string
          subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_sequences_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_sequences_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "appointment_package_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_sequences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_series: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string | null
          dtstart: string
          franchise_id: string | null
          id: string
          meta: Json
          occurrence_count: number | null
          org_unit_id: string | null
          person_id: string
          resource_id: string | null
          rrule: string
          service_id: string
          status: string
          tenant_id: string
          timezone: string
          until: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by?: string | null
          dtstart: string
          franchise_id?: string | null
          id?: string
          meta?: Json
          occurrence_count?: number | null
          org_unit_id?: string | null
          person_id: string
          resource_id?: string | null
          rrule: string
          service_id: string
          status?: string
          tenant_id: string
          timezone?: string
          until?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string | null
          dtstart?: string
          franchise_id?: string | null
          id?: string
          meta?: Json
          occurrence_count?: number | null
          org_unit_id?: string | null
          person_id?: string
          resource_id?: string | null
          rrule?: string
          service_id?: string
          status?: string
          tenant_id?: string
          timezone?: string
          until?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_series_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_series_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_series_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_series_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_series_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_series_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_series_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_status_history: {
        Row: {
          appointment_id: string
          branch_id: string
          changed_at: string
          changed_by: string | null
          from_status: string | null
          id: string
          meta: Json
          reason: string | null
          tenant_id: string
          to_status: string
        }
        Insert: {
          appointment_id: string
          branch_id: string
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          meta?: Json
          reason?: string | null
          tenant_id: string
          to_status: string
        }
        Update: {
          appointment_id?: string
          branch_id?: string
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          meta?: Json
          reason?: string | null
          tenant_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_status_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_status_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_statuses: {
        Row: {
          code: string
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          is_terminal: boolean
          name: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_terminal?: boolean
          name: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_terminal?: boolean
          name?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_statuses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_types: {
        Row: {
          allow_overbook: boolean
          buffer_after_min: number
          buffer_before_min: number
          category: string
          code: string
          color: string | null
          created_at: string
          default_channel: string | null
          duration_min: number
          id: string
          is_active: boolean
          meta: Json
          name: string
          overbook_pct: number
          priority_weight: number
          requires_doctor: boolean
          requires_machine: boolean
          requires_room: boolean
          requires_therapist: boolean
          sla_policy_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allow_overbook?: boolean
          buffer_after_min?: number
          buffer_before_min?: number
          category: string
          code: string
          color?: string | null
          created_at?: string
          default_channel?: string | null
          duration_min?: number
          id?: string
          is_active?: boolean
          meta?: Json
          name: string
          overbook_pct?: number
          priority_weight?: number
          requires_doctor?: boolean
          requires_machine?: boolean
          requires_room?: boolean
          requires_therapist?: boolean
          sla_policy_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allow_overbook?: boolean
          buffer_after_min?: number
          buffer_before_min?: number
          category?: string
          code?: string
          color?: string | null
          created_at?: string
          default_channel?: string | null
          duration_min?: number
          id?: string
          is_active?: boolean
          meta?: Json
          name?: string
          overbook_pct?: number
          priority_weight?: number
          requires_doctor?: boolean
          requires_machine?: boolean
          requires_room?: boolean
          requires_therapist?: boolean
          sla_policy_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_types_sla_policy_id_fkey"
            columns: ["sla_policy_id"]
            isOneToOne: false
            referencedRelation: "sla_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_waitlist: {
        Row: {
          appointment_type_id: string | null
          branch_id: string | null
          created_at: string
          earliest_at: string | null
          expires_at: string | null
          id: string
          last_offer_at: string | null
          latest_at: string | null
          max_distance_km: number | null
          meta: Json
          notes: string | null
          offer_ttl_seconds: number
          package_context_id: string | null
          person_id: string
          preferred_branch_ids: string[]
          preferred_doctor_ids: string[]
          preferred_time_of_day: string[]
          priority_score: number
          sequence_id: string | null
          service_id: string | null
          status: string
          tenant_id: string
          updated_at: string
          vip_flag: boolean
        }
        Insert: {
          appointment_type_id?: string | null
          branch_id?: string | null
          created_at?: string
          earliest_at?: string | null
          expires_at?: string | null
          id?: string
          last_offer_at?: string | null
          latest_at?: string | null
          max_distance_km?: number | null
          meta?: Json
          notes?: string | null
          offer_ttl_seconds?: number
          package_context_id?: string | null
          person_id: string
          preferred_branch_ids?: string[]
          preferred_doctor_ids?: string[]
          preferred_time_of_day?: string[]
          priority_score?: number
          sequence_id?: string | null
          service_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          vip_flag?: boolean
        }
        Update: {
          appointment_type_id?: string | null
          branch_id?: string | null
          created_at?: string
          earliest_at?: string | null
          expires_at?: string | null
          id?: string
          last_offer_at?: string | null
          latest_at?: string | null
          max_distance_km?: number | null
          meta?: Json
          notes?: string | null
          offer_ttl_seconds?: number
          package_context_id?: string | null
          person_id?: string
          preferred_branch_ids?: string[]
          preferred_doctor_ids?: string[]
          preferred_time_of_day?: string[]
          priority_score?: number
          sequence_id?: string | null
          service_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          vip_flag?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "appointment_waitlist_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_waitlist_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_waitlist_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_waitlist_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "appointment_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_waitlist_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_waitlist_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          admission_id: string | null
          appointment_code: string
          appointment_reason_id: string | null
          appointment_type_id: string | null
          attribution_touch_id: string | null
          booked_by: string | null
          booking_channel: string | null
          booking_source: string
          branch_id: string
          camp_id: string | null
          cancelled_at: string | null
          checked_in_at: string | null
          checked_out_at: string | null
          clinical_encounter_id: string | null
          commission_event_id: string | null
          consult_completed_at: string | null
          consult_started_at: string | null
          created_at: string
          created_by: string | null
          delivery_mode: string
          doctor_id: string | null
          dropoff_location: Json | null
          duration_minutes: number
          ends_at: string
          estimate_id: string | null
          franchise_id: string | null
          household_id: string | null
          id: string
          internal_notes: string | null
          invoice_id: string | null
          is_emergency: boolean
          is_vip: boolean
          is_walk_in: boolean
          lead_id: string | null
          membership_id: string | null
          meta: Json
          no_show_at: string | null
          notes: string | null
          occurrence_start_at: string | null
          org_unit_id: string | null
          package_id: string | null
          parent_appointment_id: string | null
          payment_id: string | null
          person_id: string
          pickup_location: Json | null
          primary_resource_id: string | null
          priority_weight: number
          resource_group_id: string | null
          revenue_event_id: string | null
          room_resource_id: string | null
          sequence_item_id: string | null
          series_id: string | null
          service_id: string | null
          service_location: Json | null
          service_variant_id: string | null
          starts_at: string
          status_code: string
          status_id: string | null
          subscription_id: string | null
          tenant_id: string
          timezone: string
          updated_at: string
          updated_by: string | null
          video_provider: string | null
          video_session_id: string | null
        }
        Insert: {
          admission_id?: string | null
          appointment_code: string
          appointment_reason_id?: string | null
          appointment_type_id?: string | null
          attribution_touch_id?: string | null
          booked_by?: string | null
          booking_channel?: string | null
          booking_source?: string
          branch_id: string
          camp_id?: string | null
          cancelled_at?: string | null
          checked_in_at?: string | null
          checked_out_at?: string | null
          clinical_encounter_id?: string | null
          commission_event_id?: string | null
          consult_completed_at?: string | null
          consult_started_at?: string | null
          created_at?: string
          created_by?: string | null
          delivery_mode?: string
          doctor_id?: string | null
          dropoff_location?: Json | null
          duration_minutes: number
          ends_at: string
          estimate_id?: string | null
          franchise_id?: string | null
          household_id?: string | null
          id?: string
          internal_notes?: string | null
          invoice_id?: string | null
          is_emergency?: boolean
          is_vip?: boolean
          is_walk_in?: boolean
          lead_id?: string | null
          membership_id?: string | null
          meta?: Json
          no_show_at?: string | null
          notes?: string | null
          occurrence_start_at?: string | null
          org_unit_id?: string | null
          package_id?: string | null
          parent_appointment_id?: string | null
          payment_id?: string | null
          person_id: string
          pickup_location?: Json | null
          primary_resource_id?: string | null
          priority_weight?: number
          resource_group_id?: string | null
          revenue_event_id?: string | null
          room_resource_id?: string | null
          sequence_item_id?: string | null
          series_id?: string | null
          service_id?: string | null
          service_location?: Json | null
          service_variant_id?: string | null
          starts_at: string
          status_code?: string
          status_id?: string | null
          subscription_id?: string | null
          tenant_id: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          video_provider?: string | null
          video_session_id?: string | null
        }
        Update: {
          admission_id?: string | null
          appointment_code?: string
          appointment_reason_id?: string | null
          appointment_type_id?: string | null
          attribution_touch_id?: string | null
          booked_by?: string | null
          booking_channel?: string | null
          booking_source?: string
          branch_id?: string
          camp_id?: string | null
          cancelled_at?: string | null
          checked_in_at?: string | null
          checked_out_at?: string | null
          clinical_encounter_id?: string | null
          commission_event_id?: string | null
          consult_completed_at?: string | null
          consult_started_at?: string | null
          created_at?: string
          created_by?: string | null
          delivery_mode?: string
          doctor_id?: string | null
          dropoff_location?: Json | null
          duration_minutes?: number
          ends_at?: string
          estimate_id?: string | null
          franchise_id?: string | null
          household_id?: string | null
          id?: string
          internal_notes?: string | null
          invoice_id?: string | null
          is_emergency?: boolean
          is_vip?: boolean
          is_walk_in?: boolean
          lead_id?: string | null
          membership_id?: string | null
          meta?: Json
          no_show_at?: string | null
          notes?: string | null
          occurrence_start_at?: string | null
          org_unit_id?: string | null
          package_id?: string | null
          parent_appointment_id?: string | null
          payment_id?: string | null
          person_id?: string
          pickup_location?: Json | null
          primary_resource_id?: string | null
          priority_weight?: number
          resource_group_id?: string | null
          revenue_event_id?: string | null
          room_resource_id?: string | null
          sequence_item_id?: string | null
          series_id?: string | null
          service_id?: string | null
          service_location?: Json | null
          service_variant_id?: string | null
          starts_at?: string
          status_code?: string
          status_id?: string | null
          subscription_id?: string | null
          tenant_id?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          video_provider?: string | null
          video_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_appointment_reason_id_fkey"
            columns: ["appointment_reason_id"]
            isOneToOne: false
            referencedRelation: "appointment_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_parent_appointment_id_fkey"
            columns: ["parent_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_primary_resource_id_fkey"
            columns: ["primary_resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_resource_group_id_fkey"
            columns: ["resource_group_id"]
            isOneToOne: false
            referencedRelation: "resource_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_room_resource_id_fkey"
            columns: ["room_resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_sequence_item_id_fkey"
            columns: ["sequence_item_id"]
            isOneToOne: false
            referencedRelation: "appointment_sequence_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "appointment_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_variant_id_fkey"
            columns: ["service_variant_id"]
            isOneToOne: false
            referencedRelation: "service_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "appointment_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
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
      billing_audit: {
        Row: {
          action: string
          actor_id: string | null
          diff: Json
          entity_id: string
          entity_type: string
          id: number
          occurred_at: string
          reason: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          diff?: Json
          entity_id: string
          entity_type: string
          id?: number
          occurred_at?: string
          reason?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          diff?: Json
          entity_id?: string
          entity_type?: string
          id?: number
          occurred_at?: string
          reason?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      billing_estimate_items: {
        Row: {
          created_at: string
          description: string
          discount_amount: number
          estimate_id: string
          id: string
          item_kind: string
          item_ref_id: string | null
          line_no: number
          line_total: number
          meta: Json
          qty: number
          tax_amount: number
          tax_rule_id: string | null
          tenant_id: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          discount_amount?: number
          estimate_id: string
          id?: string
          item_kind: string
          item_ref_id?: string | null
          line_no: number
          line_total?: number
          meta?: Json
          qty?: number
          tax_amount?: number
          tax_rule_id?: string | null
          tenant_id: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          discount_amount?: number
          estimate_id?: string
          id?: string
          item_kind?: string
          item_ref_id?: string | null
          line_no?: number
          line_total?: number
          meta?: Json
          qty?: number
          tax_amount?: number
          tax_rule_id?: string | null
          tenant_id?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_estimate_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "billing_estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_estimates: {
        Row: {
          branch_id: string | null
          converted_invoice_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          discount_total: number
          estimate_no: string
          grand_total: number
          id: string
          meta: Json
          notes: string | null
          patient_id: string | null
          person_id: string | null
          price_book_id: string | null
          status: string
          subtotal: number
          tax_total: number
          tenant_id: string
          updated_at: string
          updated_by: string | null
          valid_until: string | null
        }
        Insert: {
          branch_id?: string | null
          converted_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_total?: number
          estimate_no: string
          grand_total?: number
          id?: string
          meta?: Json
          notes?: string | null
          patient_id?: string | null
          person_id?: string | null
          price_book_id?: string | null
          status?: string
          subtotal?: number
          tax_total?: number
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          valid_until?: string | null
        }
        Update: {
          branch_id?: string | null
          converted_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_total?: number
          estimate_no?: string
          grand_total?: number
          id?: string
          meta?: Json
          notes?: string | null
          patient_id?: string | null
          person_id?: string | null
          price_book_id?: string | null
          status?: string
          subtotal?: number
          tax_total?: number
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_estimates_price_book_id_fkey"
            columns: ["price_book_id"]
            isOneToOne: false
            referencedRelation: "price_books"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_ledger: {
        Row: {
          amount: number
          balance: number | null
          branch_id: string | null
          claim_id: string | null
          credit_note_id: string | null
          currency: string
          debit_note_id: string | null
          entry_type: string
          id: number
          invoice_id: string | null
          meta: Json
          occurred_at: string
          patient_id: string | null
          payment_id: string | null
          person_id: string | null
          refund_id: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          balance?: number | null
          branch_id?: string | null
          claim_id?: string | null
          credit_note_id?: string | null
          currency?: string
          debit_note_id?: string | null
          entry_type: string
          id?: number
          invoice_id?: string | null
          meta?: Json
          occurred_at?: string
          patient_id?: string | null
          payment_id?: string | null
          person_id?: string | null
          refund_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          balance?: number | null
          branch_id?: string | null
          claim_id?: string | null
          credit_note_id?: string | null
          currency?: string
          debit_note_id?: string | null
          entry_type?: string
          id?: number
          invoice_id?: string | null
          meta?: Json
          occurred_at?: string
          patient_id?: string | null
          payment_id?: string | null
          person_id?: string | null
          refund_id?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      billing_recurring_cycles: {
        Row: {
          amount: number
          attempts: number
          branch_id: string | null
          cadence: string
          created_at: string
          created_by: string | null
          currency: string
          id: string
          meta: Json
          next_run_at: string | null
          person_id: string
          source_kind: string
          source_ref_id: string
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number
          attempts?: number
          branch_id?: string | null
          cadence: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          meta?: Json
          next_run_at?: string | null
          person_id: string
          source_kind: string
          source_ref_id: string
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          attempts?: number
          branch_id?: string | null
          cadence?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          meta?: Json
          next_run_at?: string | null
          person_id?: string
          source_kind?: string
          source_ref_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      billing_recurring_runs: {
        Row: {
          cycle_id: string
          error: string | null
          id: string
          invoice_id: string | null
          meta: Json
          payment_id: string | null
          run_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          cycle_id: string
          error?: string | null
          id?: string
          invoice_id?: string | null
          meta?: Json
          payment_id?: string | null
          run_at?: string
          status: string
          tenant_id: string
        }
        Update: {
          cycle_id?: string
          error?: string | null
          id?: string
          invoice_id?: string | null
          meta?: Json
          payment_id?: string | null
          run_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_recurring_runs_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "billing_recurring_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_recurring_runs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_recurring_runs_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_holidays: {
        Row: {
          blocks_all: boolean
          branch_id: string | null
          created_at: string
          holiday_date: string
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          blocks_all?: boolean
          branch_id?: string | null
          created_at?: string
          holiday_date: string
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          blocks_all?: boolean
          branch_id?: string | null
          created_at?: string
          holiday_date?: string
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_holidays_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_holidays_tenant_id_fkey"
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
      capacity_dimensions: {
        Row: {
          created_at: string
          dimension: string
          id: string
          max_units: number
          meta: Json
          plan_id: string
          scope_id: string | null
          soft_max_units: number | null
          tenant_id: string
          time_bucket: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dimension: string
          id?: string
          max_units: number
          meta?: Json
          plan_id: string
          scope_id?: string | null
          soft_max_units?: number | null
          tenant_id: string
          time_bucket?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dimension?: string
          id?: string
          max_units?: number
          meta?: Json
          plan_id?: string
          scope_id?: string | null
          soft_max_units?: number | null
          tenant_id?: string
          time_bucket?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capacity_dimensions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "capacity_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capacity_dimensions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      capacity_overrides: {
        Row: {
          actor: string | null
          created_at: string
          delta_units: number
          dimension: string
          id: string
          meta: Json
          override_date: string
          plan_id: string
          reason_code: string | null
          scope_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          actor?: string | null
          created_at?: string
          delta_units: number
          dimension: string
          id?: string
          meta?: Json
          override_date: string
          plan_id: string
          reason_code?: string | null
          scope_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          actor?: string | null
          created_at?: string
          delta_units?: number
          dimension?: string
          id?: string
          meta?: Json
          override_date?: string
          plan_id?: string
          reason_code?: string | null
          scope_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capacity_overrides_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "capacity_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capacity_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      capacity_plans: {
        Row: {
          branch_id: string
          code: string
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          meta: Json
          name: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          code: string
          created_at?: string
          effective_from: string
          effective_to?: string | null
          id?: string
          meta?: Json
          name: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          code?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          meta?: Json
          name?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capacity_plans_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capacity_plans_tenant_id_fkey"
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
      clinical_ai_audit: {
        Row: {
          action: string
          actor_id: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string
          encounter_id: string | null
          entity_id: string
          entity_type: string
          id: string
          meta: Json
          note: string | null
          patient_id: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          encounter_id?: string | null
          entity_id: string
          entity_type: string
          id?: string
          meta?: Json
          note?: string | null
          patient_id?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          encounter_id?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          meta?: Json
          note?: string | null
          patient_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_ai_audit_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "clinical_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_ai_audit_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_ai_audit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_ai_conversations: {
        Row: {
          cost_usd: number | null
          created_at: string
          encounter_id: string | null
          error: string | null
          feedback: string | null
          feedback_note: string | null
          id: string
          input_context: Json
          latency_ms: number | null
          model: string
          model_version: string | null
          patient_id: string | null
          prompt: string
          prompt_template_code: string | null
          prompt_template_id: string | null
          prompt_template_version: number | null
          purpose: string
          requested_by: string | null
          response: string | null
          response_json: Json | null
          system_prompt: string | null
          tenant_id: string
          tokens_input: number | null
          tokens_output: number | null
          updated_at: string
          version: number
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string
          encounter_id?: string | null
          error?: string | null
          feedback?: string | null
          feedback_note?: string | null
          id?: string
          input_context?: Json
          latency_ms?: number | null
          model: string
          model_version?: string | null
          patient_id?: string | null
          prompt: string
          prompt_template_code?: string | null
          prompt_template_id?: string | null
          prompt_template_version?: number | null
          purpose: string
          requested_by?: string | null
          response?: string | null
          response_json?: Json | null
          system_prompt?: string | null
          tenant_id: string
          tokens_input?: number | null
          tokens_output?: number | null
          updated_at?: string
          version?: number
        }
        Update: {
          cost_usd?: number | null
          created_at?: string
          encounter_id?: string | null
          error?: string | null
          feedback?: string | null
          feedback_note?: string | null
          id?: string
          input_context?: Json
          latency_ms?: number | null
          model?: string
          model_version?: string | null
          patient_id?: string | null
          prompt?: string
          prompt_template_code?: string | null
          prompt_template_id?: string | null
          prompt_template_version?: number | null
          purpose?: string
          requested_by?: string | null
          response?: string | null
          response_json?: Json | null
          system_prompt?: string | null
          tenant_id?: string
          tokens_input?: number | null
          tokens_output?: number | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinical_ai_conversations_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "clinical_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_ai_conversations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_ai_conversations_prompt_template_id_fkey"
            columns: ["prompt_template_id"]
            isOneToOne: false
            referencedRelation: "clinical_ai_prompt_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_ai_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_ai_prompt_templates: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          model_hint: string | null
          name: string
          prompt: string
          purpose: string
          tenant_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          model_hint?: string | null
          name: string
          prompt: string
          purpose: string
          tenant_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          model_hint?: string | null
          name?: string
          prompt?: string
          purpose?: string
          tenant_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinical_ai_prompt_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_ai_recommendations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          applied_ref: Json | null
          body: Json
          confidence: number | null
          conversation_id: string | null
          created_at: string
          edited_at: string | null
          edited_by: string | null
          encounter_id: string | null
          id: string
          kind: string
          meta: Json
          model: string | null
          model_version: string | null
          patient_id: string
          prompt_template_code: string | null
          prompt_template_id: string | null
          prompt_template_version: number | null
          rejected_at: string | null
          rejected_by: string | null
          requested_by: string | null
          severity: string | null
          sources: Json
          status: string
          status_reason: string | null
          summary: string | null
          target_id: string | null
          target_type: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          applied_ref?: Json | null
          body?: Json
          confidence?: number | null
          conversation_id?: string | null
          created_at?: string
          edited_at?: string | null
          edited_by?: string | null
          encounter_id?: string | null
          id?: string
          kind: string
          meta?: Json
          model?: string | null
          model_version?: string | null
          patient_id: string
          prompt_template_code?: string | null
          prompt_template_id?: string | null
          prompt_template_version?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          requested_by?: string | null
          severity?: string | null
          sources?: Json
          status?: string
          status_reason?: string | null
          summary?: string | null
          target_id?: string | null
          target_type?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          applied_ref?: Json | null
          body?: Json
          confidence?: number | null
          conversation_id?: string | null
          created_at?: string
          edited_at?: string | null
          edited_by?: string | null
          encounter_id?: string | null
          id?: string
          kind?: string
          meta?: Json
          model?: string | null
          model_version?: string | null
          patient_id?: string
          prompt_template_code?: string | null
          prompt_template_id?: string | null
          prompt_template_version?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          requested_by?: string | null
          severity?: string | null
          sources?: Json
          status?: string
          status_reason?: string | null
          summary?: string | null
          target_id?: string | null
          target_type?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_ai_recommendations_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "clinical_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_ai_recommendations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_ai_recommendations_prompt_template_id_fkey"
            columns: ["prompt_template_id"]
            isOneToOne: false
            referencedRelation: "clinical_ai_prompt_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_ai_recommendations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_ai_recs_conversation_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "clinical_ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_allergies: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          onset_date: string | null
          patient_id: string
          reaction: string | null
          severity: string | null
          source: string | null
          status: string
          substance: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          onset_date?: string | null
          patient_id: string
          reaction?: string | null
          severity?: string | null
          source?: string | null
          status?: string
          substance: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          onset_date?: string | null
          patient_id?: string
          reaction?: string | null
          severity?: string | null
          source?: string | null
          status?: string
          substance?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_allergies_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_allergies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_anatomy_grids: {
        Row: {
          code: string
          created_at: string
          grid_definition: Json
          id: string
          is_active: boolean
          name: string
          region: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          grid_definition?: Json
          id?: string
          is_active?: boolean
          name: string
          region: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          grid_definition?: Json
          id?: string
          is_active?: boolean
          name?: string
          region?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_anatomy_grids_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_code_systems: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      clinical_codes: {
        Row: {
          code: string
          code_system_id: string
          created_at: string
          display: string
          id: string
          is_active: boolean
          metadata: Json
          tenant_id: string | null
          updated_at: string
          version: string | null
        }
        Insert: {
          code: string
          code_system_id: string
          created_at?: string
          display: string
          id?: string
          is_active?: boolean
          metadata?: Json
          tenant_id?: string | null
          updated_at?: string
          version?: string | null
        }
        Update: {
          code?: string
          code_system_id?: string
          created_at?: string
          display?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          tenant_id?: string | null
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_codes_code_system_id_fkey"
            columns: ["code_system_id"]
            isOneToOne: false
            referencedRelation: "clinical_code_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_consent_templates: {
        Row: {
          body_template: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          language: string
          name: string
          requires_witness: boolean
          scope: string
          tenant_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          body_template: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string
          name: string
          requires_witness?: boolean
          scope: string
          tenant_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          body_template?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string
          name?: string
          requires_witness?: boolean
          scope?: string
          tenant_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinical_consent_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_consents: {
        Row: {
          actor_person_id: string | null
          actor_role: string | null
          created_at: string
          created_by: string | null
          document_id: string | null
          encounter_id: string | null
          id: string
          notes: string | null
          patient_id: string
          signature_meta: Json
          signed_at: string | null
          status: string
          template_code: string | null
          template_id: string | null
          template_version: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          actor_person_id?: string | null
          actor_role?: string | null
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          encounter_id?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          signature_meta?: Json
          signed_at?: string | null
          status?: string
          template_code?: string | null
          template_id?: string | null
          template_version?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          actor_person_id?: string | null
          actor_role?: string | null
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          encounter_id?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          signature_meta?: Json
          signed_at?: string | null
          status?: string
          template_code?: string | null
          template_id?: string | null
          template_version?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_consents_actor_person_id_fkey"
            columns: ["actor_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_consents_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "clinical_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_consents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "clinical_consent_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_consents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_contraindication_rules: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          rule: Json
          severity: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          rule?: Json
          severity?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          rule?: Json
          severity?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_contraindication_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_diagnosis_templates: {
        Row: {
          code: string
          created_at: string
          dx_codes: Json
          id: string
          is_active: boolean
          name: string
          notes: string | null
          specialty: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          dx_codes?: Json
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          specialty?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          dx_codes?: Json
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          specialty?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_diagnosis_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_encounter_participants: {
        Row: {
          created_at: string
          encounter_id: string
          id: string
          joined_at: string
          left_at: string | null
          notes: string | null
          person_id: string
          role: string
          source_tenant_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          encounter_id: string
          id?: string
          joined_at?: string
          left_at?: string | null
          notes?: string | null
          person_id: string
          role: string
          source_tenant_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          encounter_id?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          notes?: string | null
          person_id?: string
          role?: string
          source_tenant_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_encounter_participants_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "clinical_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_encounter_participants_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_encounter_participants_source_tenant_id_fkey"
            columns: ["source_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_encounter_participants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_encounters: {
        Row: {
          appointment_id: string | null
          branch_id: string | null
          chief_complaint: string | null
          created_at: string
          created_by: string | null
          encounter_type: string
          ended_at: string | null
          id: string
          meta: Json
          package_id: string | null
          patient_id: string
          primary_doctor_id: string | null
          room: string | null
          source: string | null
          started_at: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          branch_id?: string | null
          chief_complaint?: string | null
          created_at?: string
          created_by?: string | null
          encounter_type: string
          ended_at?: string | null
          id?: string
          meta?: Json
          package_id?: string | null
          patient_id: string
          primary_doctor_id?: string | null
          room?: string | null
          source?: string | null
          started_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          branch_id?: string | null
          chief_complaint?: string | null
          created_at?: string
          created_by?: string | null
          encounter_type?: string
          ended_at?: string | null
          id?: string
          meta?: Json
          package_id?: string | null
          patient_id?: string
          primary_doctor_id?: string | null
          room?: string | null
          source?: string | null
          started_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_encounters_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_encounters_primary_doctor_id_fkey"
            columns: ["primary_doctor_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_encounters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_family_history: {
        Row: {
          code: string | null
          code_system_id: string | null
          condition_display: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          onset_age: number | null
          patient_id: string
          relation: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          code_system_id?: string | null
          condition_display: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          onset_age?: number | null
          patient_id: string
          relation: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          code_system_id?: string | null
          condition_display?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          onset_age?: number | null
          patient_id?: string
          relation?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_family_history_code_system_id_fkey"
            columns: ["code_system_id"]
            isOneToOne: false
            referencedRelation: "clinical_code_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_family_history_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_family_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_followup_templates: {
        Row: {
          cadence: Json
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          cadence?: Json
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          cadence?: Json
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_followup_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_followups: {
        Row: {
          created_at: string
          created_by: string | null
          encounter_id: string | null
          id: string
          linked_appointment_id: string | null
          notes: string | null
          patient_id: string
          priority: string
          reason: string
          status: string
          suggested_date: string | null
          suggested_interval_days: number | null
          tenant_id: string
          treatment_plan_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          encounter_id?: string | null
          id?: string
          linked_appointment_id?: string | null
          notes?: string | null
          patient_id: string
          priority?: string
          reason: string
          status?: string
          suggested_date?: string | null
          suggested_interval_days?: number | null
          tenant_id: string
          treatment_plan_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          encounter_id?: string | null
          id?: string
          linked_appointment_id?: string | null
          notes?: string | null
          patient_id?: string
          priority?: string
          reason?: string
          status?: string
          suggested_date?: string | null
          suggested_interval_days?: number | null
          tenant_id?: string
          treatment_plan_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_followups_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "clinical_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_followups_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_followups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_followups_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "clinical_treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_lifestyle_history: {
        Row: {
          alcohol: Json | null
          created_at: string
          created_by: string | null
          diet: Json | null
          exercise: Json | null
          id: string
          notes: string | null
          occupation: string | null
          patient_id: string
          recorded_at: string
          sleep: Json | null
          smoking: Json | null
          stress: string | null
          substance_use: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          alcohol?: Json | null
          created_at?: string
          created_by?: string | null
          diet?: Json | null
          exercise?: Json | null
          id?: string
          notes?: string | null
          occupation?: string | null
          patient_id: string
          recorded_at?: string
          sleep?: Json | null
          smoking?: Json | null
          stress?: string | null
          substance_use?: Json | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          alcohol?: Json | null
          created_at?: string
          created_by?: string | null
          diet?: Json | null
          exercise?: Json | null
          id?: string
          notes?: string | null
          occupation?: string | null
          patient_id?: string
          recorded_at?: string
          sleep?: Json | null
          smoking?: Json | null
          stress?: string | null
          substance_use?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_lifestyle_history_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_lifestyle_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_media: {
        Row: {
          annotations: Json
          body_region: string | null
          category: string
          created_at: string
          description: string | null
          encounter_id: string | null
          id: string
          is_private: boolean
          meta: Json
          mime: string | null
          parent_media_id: string | null
          patient_id: string
          size_bytes: number | null
          storage_bucket: string
          storage_path: string
          taken_at: string | null
          tenant_id: string
          title: string | null
          updated_at: string
          uploaded_by: string | null
          version_no: number
        }
        Insert: {
          annotations?: Json
          body_region?: string | null
          category: string
          created_at?: string
          description?: string | null
          encounter_id?: string | null
          id?: string
          is_private?: boolean
          meta?: Json
          mime?: string | null
          parent_media_id?: string | null
          patient_id: string
          size_bytes?: number | null
          storage_bucket?: string
          storage_path: string
          taken_at?: string | null
          tenant_id: string
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
          version_no?: number
        }
        Update: {
          annotations?: Json
          body_region?: string | null
          category?: string
          created_at?: string
          description?: string | null
          encounter_id?: string | null
          id?: string
          is_private?: boolean
          meta?: Json
          mime?: string | null
          parent_media_id?: string | null
          patient_id?: string
          size_bytes?: number | null
          storage_bucket?: string
          storage_path?: string
          taken_at?: string | null
          tenant_id?: string
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinical_media_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "clinical_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_media_parent_media_id_fkey"
            columns: ["parent_media_id"]
            isOneToOne: false
            referencedRelation: "clinical_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_media_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_media_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_medical_history: {
        Row: {
          category: string
          code: string | null
          code_system_id: string | null
          created_at: string
          created_by: string | null
          event_date: string | null
          id: string
          notes: string | null
          patient_id: string
          summary: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category: string
          code?: string | null
          code_system_id?: string | null
          created_at?: string
          created_by?: string | null
          event_date?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          summary: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string | null
          code_system_id?: string | null
          created_at?: string
          created_by?: string | null
          event_date?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          summary?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_medical_history_code_system_id_fkey"
            columns: ["code_system_id"]
            isOneToOne: false
            referencedRelation: "clinical_code_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_medical_history_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_medical_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_nutrition_plan_templates: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          macros: Json
          meals: Json
          name: string
          target: Json
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          macros?: Json
          meals?: Json
          name: string
          target?: Json
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          macros?: Json
          meals?: Json
          name?: string
          target?: Json
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_nutrition_plan_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_prescription_items: {
        Row: {
          allergy_flags: Json
          created_at: string
          dose: string | null
          duration: string | null
          frequency: string | null
          id: string
          instructions: string | null
          interaction_flags: Json
          medication: string
          meta: Json
          position: number
          prescription_id: string
          refills: number
          route: string | null
          tenant_id: string
          updated_at: string
          warnings: Json
        }
        Insert: {
          allergy_flags?: Json
          created_at?: string
          dose?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          interaction_flags?: Json
          medication: string
          meta?: Json
          position?: number
          prescription_id: string
          refills?: number
          route?: string | null
          tenant_id: string
          updated_at?: string
          warnings?: Json
        }
        Update: {
          allergy_flags?: Json
          created_at?: string
          dose?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          interaction_flags?: Json
          medication?: string
          meta?: Json
          position?: number
          prescription_id?: string
          refills?: number
          route?: string | null
          tenant_id?: string
          updated_at?: string
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "clinical_prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "clinical_prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_prescription_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_prescription_templates: {
        Row: {
          code: string
          created_at: string
          diagnosis_hint: string | null
          id: string
          is_active: boolean
          items: Json
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          diagnosis_hint?: string | null
          id?: string
          is_active?: boolean
          items?: Json
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          diagnosis_hint?: string | null
          id?: string
          is_active?: boolean
          items?: Json
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_prescription_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_prescriptions: {
        Row: {
          created_at: string
          created_by: string | null
          encounter_id: string | null
          id: string
          meta: Json
          notes: string | null
          patient_id: string
          prescribed_at: string | null
          prescribed_by: string | null
          printable_ref: string | null
          signature_meta: Json
          status: string
          tenant_id: string
          treatment_plan_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          encounter_id?: string | null
          id?: string
          meta?: Json
          notes?: string | null
          patient_id: string
          prescribed_at?: string | null
          prescribed_by?: string | null
          printable_ref?: string | null
          signature_meta?: Json
          status?: string
          tenant_id: string
          treatment_plan_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          encounter_id?: string | null
          id?: string
          meta?: Json
          notes?: string | null
          patient_id?: string
          prescribed_at?: string | null
          prescribed_by?: string | null
          printable_ref?: string | null
          signature_meta?: Json
          status?: string
          tenant_id?: string
          treatment_plan_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_prescriptions_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "clinical_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_prescriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_prescriptions_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "clinical_treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_problems: {
        Row: {
          category: string
          code: string | null
          code_system_id: string | null
          created_at: string
          created_by: string | null
          display: string
          encounter_id: string | null
          id: string
          notes: string | null
          onset_date: string | null
          patient_id: string
          resolved_date: string | null
          severity: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category?: string
          code?: string | null
          code_system_id?: string | null
          created_at?: string
          created_by?: string | null
          display: string
          encounter_id?: string | null
          id?: string
          notes?: string | null
          onset_date?: string | null
          patient_id: string
          resolved_date?: string | null
          severity?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string | null
          code_system_id?: string | null
          created_at?: string
          created_by?: string | null
          display?: string
          encounter_id?: string | null
          id?: string
          notes?: string | null
          onset_date?: string | null
          patient_id?: string
          resolved_date?: string | null
          severity?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_problems_code_system_id_fkey"
            columns: ["code_system_id"]
            isOneToOne: false
            referencedRelation: "clinical_code_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_problems_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "clinical_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_problems_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_problems_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_procedure_checklists: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          items: Json
          name: string
          phase: string
          procedure_kind: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          items?: Json
          name: string
          phase: string
          procedure_kind: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          items?: Json
          name?: string
          phase?: string
          procedure_kind?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_procedure_checklists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_protocols: {
        Row: {
          code: string
          created_at: string
          definition: Json
          id: string
          is_active: boolean
          name: string
          specialty: string | null
          tenant_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          code: string
          created_at?: string
          definition?: Json
          id?: string
          is_active?: boolean
          name: string
          specialty?: string | null
          tenant_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          code?: string
          created_at?: string
          definition?: Json
          id?: string
          is_active?: boolean
          name?: string
          specialty?: string | null
          tenant_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinical_protocols_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_referrals: {
        Row: {
          created_at: string
          created_by: string | null
          external_provider: string | null
          from_branch_id: string | null
          from_doctor_id: string | null
          id: string
          notes: string | null
          patient_id: string
          priority: string
          reason: string
          source_encounter_id: string | null
          status: string
          tenant_id: string
          to_branch_id: string | null
          to_doctor_id: string | null
          to_tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          external_provider?: string | null
          from_branch_id?: string | null
          from_doctor_id?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          priority?: string
          reason: string
          source_encounter_id?: string | null
          status?: string
          tenant_id: string
          to_branch_id?: string | null
          to_doctor_id?: string | null
          to_tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          external_provider?: string | null
          from_branch_id?: string | null
          from_doctor_id?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          priority?: string
          reason?: string
          source_encounter_id?: string | null
          status?: string
          tenant_id?: string
          to_branch_id?: string | null
          to_doctor_id?: string | null
          to_tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_referrals_from_doctor_id_fkey"
            columns: ["from_doctor_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_referrals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_referrals_source_encounter_id_fkey"
            columns: ["source_encounter_id"]
            isOneToOne: false
            referencedRelation: "clinical_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_referrals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_referrals_to_doctor_id_fkey"
            columns: ["to_doctor_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_referrals_to_tenant_id_fkey"
            columns: ["to_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_scoring_scales: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          scale_definition: Json
          specialty: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          scale_definition?: Json
          specialty?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          scale_definition?: Json
          specialty?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_scoring_scales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_second_opinions: {
        Row: {
          answered_at: string | null
          created_at: string
          id: string
          opinion_doctor_id: string | null
          opinion_tenant_id: string | null
          patient_id: string
          question: string
          requested_at: string
          requested_by_doctor_id: string | null
          response: string | null
          source_encounter_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          answered_at?: string | null
          created_at?: string
          id?: string
          opinion_doctor_id?: string | null
          opinion_tenant_id?: string | null
          patient_id: string
          question: string
          requested_at?: string
          requested_by_doctor_id?: string | null
          response?: string | null
          source_encounter_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          answered_at?: string | null
          created_at?: string
          id?: string
          opinion_doctor_id?: string | null
          opinion_tenant_id?: string | null
          patient_id?: string
          question?: string
          requested_at?: string
          requested_by_doctor_id?: string | null
          response?: string | null
          source_encounter_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_second_opinions_opinion_doctor_id_fkey"
            columns: ["opinion_doctor_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_second_opinions_opinion_tenant_id_fkey"
            columns: ["opinion_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_second_opinions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_second_opinions_requested_by_doctor_id_fkey"
            columns: ["requested_by_doctor_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_second_opinions_source_encounter_id_fkey"
            columns: ["source_encounter_id"]
            isOneToOne: false
            referencedRelation: "clinical_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_second_opinions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_soap_notes: {
        Row: {
          created_at: string
          created_by: string | null
          current_version_id: string | null
          encounter_id: string
          id: string
          patient_id: string
          signature_meta: Json
          signed_at: string | null
          signed_by: string | null
          status: string
          template_code: string | null
          tenant_id: string
          updated_at: string
          version_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          encounter_id: string
          id?: string
          patient_id: string
          signature_meta?: Json
          signed_at?: string | null
          signed_by?: string | null
          status?: string
          template_code?: string | null
          tenant_id: string
          updated_at?: string
          version_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          encounter_id?: string
          id?: string
          patient_id?: string
          signature_meta?: Json
          signed_at?: string | null
          signed_by?: string | null
          status?: string
          template_code?: string | null
          tenant_id?: string
          updated_at?: string
          version_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinical_soap_notes_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_soap_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_soap_notes_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: true
            referencedRelation: "clinical_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_soap_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_soap_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_soap_templates: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          specialty: string | null
          template: Json
          tenant_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          specialty?: string | null
          template?: Json
          tenant_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          specialty?: string | null
          template?: Json
          tenant_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinical_soap_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_soap_versions: {
        Row: {
          assessment: Json
          created_at: string
          id: string
          is_autosave: boolean
          objective: Json
          plan: Json
          restored_from_version_id: string | null
          saved_at: string
          saved_by: string | null
          signature_meta: Json
          soap_note_id: string
          subjective: Json
          template_code: string | null
          tenant_id: string
          version_no: number
        }
        Insert: {
          assessment?: Json
          created_at?: string
          id?: string
          is_autosave?: boolean
          objective?: Json
          plan?: Json
          restored_from_version_id?: string | null
          saved_at?: string
          saved_by?: string | null
          signature_meta?: Json
          soap_note_id: string
          subjective?: Json
          template_code?: string | null
          tenant_id: string
          version_no: number
        }
        Update: {
          assessment?: Json
          created_at?: string
          id?: string
          is_autosave?: boolean
          objective?: Json
          plan?: Json
          restored_from_version_id?: string | null
          saved_at?: string
          saved_by?: string | null
          signature_meta?: Json
          soap_note_id?: string
          subjective?: Json
          template_code?: string | null
          tenant_id?: string
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinical_soap_versions_restored_from_version_id_fkey"
            columns: ["restored_from_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_soap_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_soap_versions_soap_note_id_fkey"
            columns: ["soap_note_id"]
            isOneToOne: false
            referencedRelation: "clinical_soap_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_soap_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_treatment_plans: {
        Row: {
          contraindications: string | null
          created_at: string
          created_by: string | null
          diagnosis: string | null
          encounter_id: string | null
          end_date: string | null
          expected_outcomes: string | null
          goals: Json
          id: string
          instructions: string | null
          milestones: Json
          patient_id: string
          progress: Json
          protocol_id: string | null
          review_schedule: Json
          start_date: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          contraindications?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          encounter_id?: string | null
          end_date?: string | null
          expected_outcomes?: string | null
          goals?: Json
          id?: string
          instructions?: string | null
          milestones?: Json
          patient_id: string
          progress?: Json
          protocol_id?: string | null
          review_schedule?: Json
          start_date?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          contraindications?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          encounter_id?: string | null
          end_date?: string | null
          expected_outcomes?: string | null
          goals?: Json
          id?: string
          instructions?: string | null
          milestones?: Json
          patient_id?: string
          progress?: Json
          protocol_id?: string | null
          review_schedule?: Json
          start_date?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_treatment_plans_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "clinical_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_treatment_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_treatment_plans_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "clinical_treatment_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_treatment_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_treatment_protocols: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          procedure_kind: string
          steps: Json
          tenant_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          procedure_kind: string
          steps?: Json
          tenant_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          procedure_kind?: string
          steps?: Json
          tenant_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinical_treatment_protocols_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_vitals: {
        Row: {
          bmi: number | null
          bp_diastolic: number | null
          bp_systolic: number | null
          created_at: string
          created_by: string | null
          encounter_id: string | null
          heart_rate: number | null
          height_cm: number | null
          hip_cm: number | null
          id: string
          measured_at: string
          notes: string | null
          patient_id: string
          resp_rate: number | null
          spo2: number | null
          temperature_c: number | null
          tenant_id: string
          updated_at: string
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          bmi?: number | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          created_at?: string
          created_by?: string | null
          encounter_id?: string | null
          heart_rate?: number | null
          height_cm?: number | null
          hip_cm?: number | null
          id?: string
          measured_at?: string
          notes?: string | null
          patient_id: string
          resp_rate?: number | null
          spo2?: number | null
          temperature_c?: number | null
          tenant_id: string
          updated_at?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          bmi?: number | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          created_at?: string
          created_by?: string | null
          encounter_id?: string | null
          heart_rate?: number | null
          height_cm?: number | null
          hip_cm?: number | null
          id?: string
          measured_at?: string
          notes?: string | null
          patient_id?: string
          resp_rate?: number | null
          spo2?: number | null
          temperature_c?: number | null
          tenant_id?: string
          updated_at?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_vitals_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "clinical_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_vitals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_vitals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      communication_policies: {
        Row: {
          branch_id: string | null
          channels_order: Json
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          language: string
          meta: Json
          name: string
          priority: number
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          reminder_offsets_minutes: Json
          respect_person_preferences: boolean
          retry_backoff_minutes: number
          retry_max_attempts: number
          scope: string
          service_id: string | null
          templates: Json
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_id?: string | null
          channels_order?: Json
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          language?: string
          meta?: Json
          name: string
          priority?: number
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          reminder_offsets_minutes?: Json
          respect_person_preferences?: boolean
          retry_backoff_minutes?: number
          retry_max_attempts?: number
          scope?: string
          service_id?: string | null
          templates?: Json
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_id?: string | null
          channels_order?: Json
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          language?: string
          meta?: Json
          name?: string
          priority?: number
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          reminder_offsets_minutes?: Json
          respect_person_preferences?: boolean
          retry_backoff_minutes?: number
          retry_max_attempts?: number
          scope?: string
          service_id?: string | null
          templates?: Json
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_policies_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_policies_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      credit_note_items: {
        Row: {
          created_at: string
          credit_note_id: string
          description: string | null
          id: string
          invoice_item_id: string | null
          line_no: number
          line_total: number
          qty: number
          tax_amount: number
          tenant_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          credit_note_id: string
          description?: string | null
          id?: string
          invoice_item_id?: string | null
          line_no: number
          line_total?: number
          qty?: number
          tax_amount?: number
          tenant_id: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          credit_note_id?: string
          description?: string | null
          id?: string
          invoice_item_id?: string | null
          line_no?: number
          line_total?: number
          qty?: number
          tax_amount?: number
          tenant_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_note_items_credit_note_id_fkey"
            columns: ["credit_note_id"]
            isOneToOne: false
            referencedRelation: "credit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_items_invoice_item_id_fkey"
            columns: ["invoice_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_items"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notes: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          grand_total: number
          id: string
          invoice_id: string | null
          issue_date: string | null
          meta: Json
          note_no: string
          reason: string | null
          status: string
          subtotal: number
          tax_total: number
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          grand_total?: number
          id?: string
          invoice_id?: string | null
          issue_date?: string | null
          meta?: Json
          note_no: string
          reason?: string | null
          status?: string
          subtotal?: number
          tax_total?: number
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          grand_total?: number
          id?: string
          invoice_id?: string | null
          issue_date?: string | null
          meta?: Json
          note_no?: string
          reason?: string | null
          status?: string
          subtotal?: number
          tax_total?: number
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
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
      debit_note_items: {
        Row: {
          created_at: string
          debit_note_id: string
          description: string | null
          id: string
          line_no: number
          line_total: number
          qty: number
          tax_amount: number
          tenant_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          debit_note_id: string
          description?: string | null
          id?: string
          line_no: number
          line_total?: number
          qty?: number
          tax_amount?: number
          tenant_id: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          debit_note_id?: string
          description?: string | null
          id?: string
          line_no?: number
          line_total?: number
          qty?: number
          tax_amount?: number
          tenant_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "debit_note_items_debit_note_id_fkey"
            columns: ["debit_note_id"]
            isOneToOne: false
            referencedRelation: "debit_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      debit_notes: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          grand_total: number
          id: string
          invoice_id: string | null
          issue_date: string | null
          meta: Json
          note_no: string
          reason: string | null
          status: string
          subtotal: number
          tax_total: number
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          grand_total?: number
          id?: string
          invoice_id?: string | null
          issue_date?: string | null
          meta?: Json
          note_no: string
          reason?: string | null
          status?: string
          subtotal?: number
          tax_total?: number
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          grand_total?: number
          id?: string
          invoice_id?: string | null
          issue_date?: string | null
          meta?: Json
          note_no?: string
          reason?: string | null
          status?: string
          subtotal?: number
          tax_total?: number
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
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
      discount_schemes: {
        Row: {
          code: string
          config: Json
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          kind: string
          max_percent: number | null
          name: string
          requires_approval: boolean
          scope: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          valid_from: string | null
          valid_to: string | null
          value: number | null
        }
        Insert: {
          code: string
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          kind: string
          max_percent?: number | null
          name: string
          requires_approval?: boolean
          scope: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          valid_to?: string | null
          value?: number | null
        }
        Update: {
          code?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          max_percent?: number | null
          name?: string
          requires_approval?: boolean
          scope?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          valid_to?: string | null
          value?: number | null
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
      external_calendar_accounts: {
        Row: {
          channel_expiry: string | null
          channel_id: string | null
          connection_id: string | null
          created_at: string
          display_name: string | null
          id: string
          last_sync_at: string | null
          last_sync_status: string | null
          meta: Json
          owner_resource_id: string | null
          owner_user_id: string
          provider: string
          provider_account_id: string
          sync_direction: string
          sync_enabled: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          channel_expiry?: string | null
          channel_id?: string | null
          connection_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_status?: string | null
          meta?: Json
          owner_resource_id?: string | null
          owner_user_id: string
          provider: string
          provider_account_id: string
          sync_direction?: string
          sync_enabled?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          channel_expiry?: string | null
          channel_id?: string | null
          connection_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_status?: string | null
          meta?: Json
          owner_resource_id?: string | null
          owner_user_id?: string
          provider?: string
          provider_account_id?: string
          sync_direction?: string
          sync_enabled?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_calendar_accounts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_calendar_accounts_owner_resource_id_fkey"
            columns: ["owner_resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_calendar_accounts_tenant_id_fkey"
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
      fin_accounting_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          code: string
          created_at: string
          end_date: string
          fiscal_year_id: string
          id: string
          org_unit_id: string | null
          period_number: number
          start_date: string
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          code: string
          created_at?: string
          end_date: string
          fiscal_year_id: string
          id?: string
          org_unit_id?: string | null
          period_number: number
          start_date: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          code?: string
          created_at?: string
          end_date?: string
          fiscal_year_id?: string
          id?: string
          org_unit_id?: string | null
          period_number?: number
          start_date?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_accounting_periods_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fin_fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_accounting_periods_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_accounting_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_ap_ledger: {
        Row: {
          balance: number
          bill_id: string | null
          branch_id: string | null
          created_at: string
          credit: number
          currency: string
          debit: number
          entry_date: string
          id: string
          journal_entry_id: string | null
          metadata: Json
          org_unit_id: string | null
          reference: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          balance?: number
          bill_id?: string | null
          branch_id?: string | null
          created_at?: string
          credit?: number
          currency?: string
          debit?: number
          entry_date: string
          id?: string
          journal_entry_id?: string | null
          metadata?: Json
          org_unit_id?: string | null
          reference?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          balance?: number
          bill_id?: string | null
          branch_id?: string | null
          created_at?: string
          credit?: number
          currency?: string
          debit?: number
          entry_date?: string
          id?: string
          journal_entry_id?: string | null
          metadata?: Json
          org_unit_id?: string | null
          reference?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_ap_ledger_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "fin_vendor_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_ap_ledger_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_ap_ledger_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "fin_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_ap_ledger_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_ap_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_ar_ledger: {
        Row: {
          balance: number
          branch_id: string | null
          created_at: string
          credit: number
          currency: string
          debit: number
          entry_date: string
          id: string
          invoice_id: string | null
          journal_entry_id: string | null
          metadata: Json
          org_unit_id: string | null
          partner_id: string | null
          partner_type: string
          reference: string | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          balance?: number
          branch_id?: string | null
          created_at?: string
          credit?: number
          currency?: string
          debit?: number
          entry_date: string
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          metadata?: Json
          org_unit_id?: string | null
          partner_id?: string | null
          partner_type: string
          reference?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          balance?: number
          branch_id?: string | null
          created_at?: string
          credit?: number
          currency?: string
          debit?: number
          entry_date?: string
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          metadata?: Json
          org_unit_id?: string | null
          partner_id?: string | null
          partner_type?: string
          reference?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_ar_ledger_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_ar_ledger_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "fin_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_ar_ledger_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_ar_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          event_type: string
          id: string
          metadata: Json
          occurred_at: string
          org_unit_id: string | null
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          event_type: string
          id?: string
          metadata?: Json
          occurred_at?: string
          org_unit_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          org_unit_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_audit_log_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_bank_accounts: {
        Row: {
          account_number: string | null
          bank_name: string | null
          branch_id: string | null
          code: string
          created_at: string
          currency: string
          gl_account_id: string | null
          id: string
          ifsc: string | null
          is_active: boolean
          name: string
          opening_balance: number
          org_unit_id: string | null
          swift: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          bank_name?: string | null
          branch_id?: string | null
          code: string
          created_at?: string
          currency?: string
          gl_account_id?: string | null
          id?: string
          ifsc?: string | null
          is_active?: boolean
          name: string
          opening_balance?: number
          org_unit_id?: string | null
          swift?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          bank_name?: string | null
          branch_id?: string | null
          code?: string
          created_at?: string
          currency?: string
          gl_account_id?: string | null
          id?: string
          ifsc?: string | null
          is_active?: boolean
          name?: string
          opening_balance?: number
          org_unit_id?: string | null
          swift?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_bank_accounts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_bank_accounts_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_bank_accounts_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_bank_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_bank_reconciliations: {
        Row: {
          bank_account_id: string
          closing_balance: number
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          matched_lines: Json
          opening_balance: number
          org_unit_id: string | null
          reconciled_balance: number
          statement_date: string
          status: string
          tenant_id: string | null
          unmatched_lines: Json
          updated_at: string
        }
        Insert: {
          bank_account_id: string
          closing_balance?: number
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          matched_lines?: Json
          opening_balance?: number
          org_unit_id?: string | null
          reconciled_balance?: number
          statement_date: string
          status?: string
          tenant_id?: string | null
          unmatched_lines?: Json
          updated_at?: string
        }
        Update: {
          bank_account_id?: string
          closing_balance?: number
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          matched_lines?: Json
          opening_balance?: number
          org_unit_id?: string | null
          reconciled_balance?: number
          statement_date?: string
          status?: string
          tenant_id?: string | null
          unmatched_lines?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_bank_reconciliations_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "fin_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_bank_reconciliations_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_bank_reconciliations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_branch_pnl: {
        Row: {
          branch_id: string
          breakdown: Json
          cogs: number
          computed_at: string
          created_at: string
          depreciation: number
          ebitda: number
          gross_profit: number
          id: string
          interest: number
          net_profit: number
          operating_expense: number
          org_unit_id: string | null
          period_id: string
          revenue: number
          royalty: number
          tax: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          breakdown?: Json
          cogs?: number
          computed_at?: string
          created_at?: string
          depreciation?: number
          ebitda?: number
          gross_profit?: number
          id?: string
          interest?: number
          net_profit?: number
          operating_expense?: number
          org_unit_id?: string | null
          period_id: string
          revenue?: number
          royalty?: number
          tax?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          breakdown?: Json
          cogs?: number
          computed_at?: string
          created_at?: string
          depreciation?: number
          ebitda?: number
          gross_profit?: number
          id?: string
          interest?: number
          net_profit?: number
          operating_expense?: number
          org_unit_id?: string | null
          period_id?: string
          revenue?: number
          royalty?: number
          tax?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_branch_pnl_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_branch_pnl_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_branch_pnl_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "fin_accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_branch_pnl_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_budget_lines: {
        Row: {
          account_id: string | null
          amount: number
          budget_id: string
          created_at: string
          id: string
          notes: string | null
          org_unit_id: string | null
          period_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          budget_id: string
          created_at?: string
          id?: string
          notes?: string | null
          org_unit_id?: string | null
          period_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          budget_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          org_unit_id?: string | null
          period_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_budget_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "fin_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_budget_lines_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_budget_lines_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "fin_accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_budget_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_budgets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          budget_type: string
          code: string
          cost_center_id: string | null
          created_at: string
          currency: string
          fiscal_year_id: string | null
          id: string
          metadata: Json
          name: string
          org_unit_id: string | null
          status: string
          tenant_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          budget_type?: string
          code: string
          cost_center_id?: string | null
          created_at?: string
          currency?: string
          fiscal_year_id?: string | null
          id?: string
          metadata?: Json
          name: string
          org_unit_id?: string | null
          status?: string
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          budget_type?: string
          code?: string
          cost_center_id?: string | null
          created_at?: string
          currency?: string
          fiscal_year_id?: string | null
          id?: string
          metadata?: Json
          name?: string
          org_unit_id?: string | null
          status?: string
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_budgets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_budgets_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_budgets_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fin_fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_budgets_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_budgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_cash_books: {
        Row: {
          branch_id: string | null
          code: string
          created_at: string
          currency: string
          gl_account_id: string | null
          id: string
          is_active: boolean
          name: string
          opening_balance: number
          org_unit_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          code: string
          created_at?: string
          currency?: string
          gl_account_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          opening_balance?: number
          org_unit_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          code?: string
          created_at?: string
          currency?: string
          gl_account_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          opening_balance?: number
          org_unit_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_cash_books_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_cash_books_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_cash_books_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_cash_books_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_chart_of_accounts: {
        Row: {
          account_subtype: string | null
          account_type: string
          code: string
          created_at: string
          currency: string
          gst_applicable: boolean
          id: string
          is_active: boolean
          is_group: boolean
          metadata: Json
          name: string
          org_unit_id: string | null
          parent_id: string | null
          tds_applicable: boolean
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          account_subtype?: string | null
          account_type: string
          code: string
          created_at?: string
          currency?: string
          gst_applicable?: boolean
          id?: string
          is_active?: boolean
          is_group?: boolean
          metadata?: Json
          name: string
          org_unit_id?: string | null
          parent_id?: string | null
          tds_applicable?: boolean
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          account_subtype?: string | null
          account_type?: string
          code?: string
          created_at?: string
          currency?: string
          gst_applicable?: boolean
          id?: string
          is_active?: boolean
          is_group?: boolean
          metadata?: Json
          name?: string
          org_unit_id?: string | null
          parent_id?: string | null
          tds_applicable?: boolean
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_chart_of_accounts_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_chart_of_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_cost_centers: {
        Row: {
          branch_id: string | null
          code: string
          created_at: string
          department_id: string | null
          id: string
          is_active: boolean
          name: string
          org_unit_id: string | null
          parent_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          code: string
          created_at?: string
          department_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          org_unit_id?: string | null
          parent_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          code?: string
          created_at?: string
          department_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          org_unit_id?: string | null
          parent_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_cost_centers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_cost_centers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_cost_centers_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_cost_centers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_cost_centers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_depreciation_schedule: {
        Row: {
          accumulated_depreciation: number
          asset_id: string
          book_value: number
          created_at: string
          depreciation_amount: number
          id: string
          journal_entry_id: string | null
          org_unit_id: string | null
          period_id: string | null
          schedule_date: string
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          accumulated_depreciation: number
          asset_id: string
          book_value: number
          created_at?: string
          depreciation_amount: number
          id?: string
          journal_entry_id?: string | null
          org_unit_id?: string | null
          period_id?: string | null
          schedule_date: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          accumulated_depreciation?: number
          asset_id?: string
          book_value?: number
          created_at?: string
          depreciation_amount?: number
          id?: string
          journal_entry_id?: string | null
          org_unit_id?: string | null
          period_id?: string | null
          schedule_date?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_depreciation_schedule_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "fin_fixed_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_depreciation_schedule_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "fin_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_depreciation_schedule_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_depreciation_schedule_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "fin_accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_depreciation_schedule_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_expenses: {
        Row: {
          account_id: string | null
          amount: number
          approval_request_id: string | null
          attachments: Json
          branch_id: string | null
          category: string | null
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          employee_id: string | null
          expense_date: string
          expense_number: string
          id: string
          journal_entry_id: string | null
          notes: string | null
          org_unit_id: string | null
          status: string
          tax_amount: number
          tenant_id: string | null
          total_amount: number
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          approval_request_id?: string | null
          attachments?: Json
          branch_id?: string | null
          category?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          employee_id?: string | null
          expense_date: string
          expense_number: string
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          org_unit_id?: string | null
          status?: string
          tax_amount?: number
          tenant_id?: string | null
          total_amount: number
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          approval_request_id?: string | null
          attachments?: Json
          branch_id?: string | null
          category?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          employee_id?: string | null
          expense_date?: string
          expense_number?: string
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          org_unit_id?: string | null
          status?: string
          tax_amount?: number
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_expenses_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_expenses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_expenses_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "fin_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_expenses_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_fiscal_years: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          code: string
          created_at: string
          end_date: string
          id: string
          name: string
          org_unit_id: string | null
          start_date: string
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          code: string
          created_at?: string
          end_date: string
          id?: string
          name: string
          org_unit_id?: string | null
          start_date: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          code?: string
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          org_unit_id?: string | null
          start_date?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_fiscal_years_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_fiscal_years_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_fixed_assets: {
        Row: {
          accumulated_dep_account_id: string | null
          acquisition_cost: number
          acquisition_date: string
          asset_account_id: string | null
          asset_code: string
          branch_id: string | null
          category: string | null
          created_at: string
          depreciation_account_id: string | null
          depreciation_method: string
          disposal_value: number | null
          disposed_at: string | null
          id: string
          metadata: Json
          name: string
          org_unit_id: string | null
          salvage_value: number
          status: string
          tenant_id: string | null
          updated_at: string
          useful_life_months: number
        }
        Insert: {
          accumulated_dep_account_id?: string | null
          acquisition_cost: number
          acquisition_date: string
          asset_account_id?: string | null
          asset_code: string
          branch_id?: string | null
          category?: string | null
          created_at?: string
          depreciation_account_id?: string | null
          depreciation_method?: string
          disposal_value?: number | null
          disposed_at?: string | null
          id?: string
          metadata?: Json
          name: string
          org_unit_id?: string | null
          salvage_value?: number
          status?: string
          tenant_id?: string | null
          updated_at?: string
          useful_life_months: number
        }
        Update: {
          accumulated_dep_account_id?: string | null
          acquisition_cost?: number
          acquisition_date?: string
          asset_account_id?: string | null
          asset_code?: string
          branch_id?: string | null
          category?: string | null
          created_at?: string
          depreciation_account_id?: string | null
          depreciation_method?: string
          disposal_value?: number | null
          disposed_at?: string | null
          id?: string
          metadata?: Json
          name?: string
          org_unit_id?: string | null
          salvage_value?: number
          status?: string
          tenant_id?: string | null
          updated_at?: string
          useful_life_months?: number
        }
        Relationships: [
          {
            foreignKeyName: "fin_fixed_assets_accumulated_dep_account_id_fkey"
            columns: ["accumulated_dep_account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_fixed_assets_asset_account_id_fkey"
            columns: ["asset_account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_fixed_assets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_fixed_assets_depreciation_account_id_fkey"
            columns: ["depreciation_account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_fixed_assets_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_fixed_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_forecasts: {
        Row: {
          assumptions: Json
          branch_id: string | null
          code: string
          created_at: string
          data_points: Json
          fiscal_year_id: string | null
          forecast_type: string
          generated_at: string | null
          generated_by: string | null
          horizon_months: number
          id: string
          name: string
          org_unit_id: string | null
          scenario: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          assumptions?: Json
          branch_id?: string | null
          code: string
          created_at?: string
          data_points?: Json
          fiscal_year_id?: string | null
          forecast_type?: string
          generated_at?: string | null
          generated_by?: string | null
          horizon_months?: number
          id?: string
          name: string
          org_unit_id?: string | null
          scenario?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          assumptions?: Json
          branch_id?: string | null
          code?: string
          created_at?: string
          data_points?: Json
          fiscal_year_id?: string | null
          forecast_type?: string
          generated_at?: string | null
          generated_by?: string | null
          horizon_months?: number
          id?: string
          name?: string
          org_unit_id?: string | null
          scenario?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_forecasts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_forecasts_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fin_fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_forecasts_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_forecasts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_franchise_pnl: {
        Row: {
          breakdown: Json
          computed_at: string
          created_at: string
          franchise_org_unit_id: string | null
          id: string
          marketing_fee: number
          net_payable: number
          org_unit_id: string | null
          period_id: string
          revenue: number
          royalty_due: number
          royalty_paid: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          breakdown?: Json
          computed_at?: string
          created_at?: string
          franchise_org_unit_id?: string | null
          id?: string
          marketing_fee?: number
          net_payable?: number
          org_unit_id?: string | null
          period_id: string
          revenue?: number
          royalty_due?: number
          royalty_paid?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          breakdown?: Json
          computed_at?: string
          created_at?: string
          franchise_org_unit_id?: string | null
          id?: string
          marketing_fee?: number
          net_payable?: number
          org_unit_id?: string | null
          period_id?: string
          revenue?: number
          royalty_due?: number
          royalty_paid?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_franchise_pnl_franchise_org_unit_id_fkey"
            columns: ["franchise_org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_franchise_pnl_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_franchise_pnl_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "fin_accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_franchise_pnl_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_intercompany_accounts: {
        Row: {
          balance: number
          code: string
          created_at: string
          currency: string
          from_org_unit_id: string
          gl_account_id: string | null
          id: string
          name: string
          org_unit_id: string | null
          tenant_id: string | null
          to_org_unit_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          code: string
          created_at?: string
          currency?: string
          from_org_unit_id: string
          gl_account_id?: string | null
          id?: string
          name: string
          org_unit_id?: string | null
          tenant_id?: string | null
          to_org_unit_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          code?: string
          created_at?: string
          currency?: string
          from_org_unit_id?: string
          gl_account_id?: string | null
          id?: string
          name?: string
          org_unit_id?: string | null
          tenant_id?: string | null
          to_org_unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_intercompany_accounts_from_org_unit_id_fkey"
            columns: ["from_org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_intercompany_accounts_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_intercompany_accounts_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_intercompany_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_intercompany_accounts_to_org_unit_id_fkey"
            columns: ["to_org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_journal_entries: {
        Row: {
          approval_request_id: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          entry_date: string
          entry_number: string
          fx_rate: number
          id: string
          metadata: Json
          org_unit_id: string | null
          period_id: string | null
          posted_at: string | null
          posted_by: string | null
          reference_id: string | null
          reference_type: string | null
          reversed_entry_id: string | null
          source_module: string
          status: string
          tenant_id: string | null
          total_credit: number
          total_debit: number
          updated_at: string
        }
        Insert: {
          approval_request_id?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          entry_date: string
          entry_number: string
          fx_rate?: number
          id?: string
          metadata?: Json
          org_unit_id?: string | null
          period_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          reversed_entry_id?: string | null
          source_module?: string
          status?: string
          tenant_id?: string | null
          total_credit?: number
          total_debit?: number
          updated_at?: string
        }
        Update: {
          approval_request_id?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          entry_date?: string
          entry_number?: string
          fx_rate?: number
          id?: string
          metadata?: Json
          org_unit_id?: string | null
          period_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          reversed_entry_id?: string | null
          source_module?: string
          status?: string
          tenant_id?: string | null
          total_credit?: number
          total_debit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_journal_entries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_journal_entries_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_journal_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "fin_accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_journal_entries_reversed_entry_id_fkey"
            columns: ["reversed_entry_id"]
            isOneToOne: false
            referencedRelation: "fin_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_journal_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_journal_lines: {
        Row: {
          account_id: string
          branch_id: string | null
          cost_center_id: string | null
          created_at: string
          credit: number
          debit: number
          description: string | null
          id: string
          journal_entry_id: string
          line_number: number
          metadata: Json
          org_unit_id: string | null
          partner_id: string | null
          partner_type: string | null
          profit_center_id: string | null
          tax_code: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          branch_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id: string
          line_number: number
          metadata?: Json
          org_unit_id?: string | null
          partner_id?: string | null
          partner_type?: string | null
          profit_center_id?: string | null
          tax_code?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          branch_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id?: string
          line_number?: number
          metadata?: Json
          org_unit_id?: string | null
          partner_id?: string | null
          partner_type?: string | null
          profit_center_id?: string | null
          tax_code?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_journal_lines_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_journal_lines_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_journal_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "fin_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_journal_lines_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_journal_lines_profit_center_id_fkey"
            columns: ["profit_center_id"]
            isOneToOne: false
            referencedRelation: "fin_profit_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_journal_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_payments: {
        Row: {
          amount: number
          approval_request_id: string | null
          bank_account_id: string | null
          branch_id: string | null
          cash_book_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          id: string
          journal_entry_id: string | null
          method: string
          notes: string | null
          org_unit_id: string | null
          partner_id: string | null
          partner_type: string
          payment_date: string
          payment_number: string
          reference: string | null
          source_module: string | null
          source_reference_id: string | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          approval_request_id?: string | null
          bank_account_id?: string | null
          branch_id?: string | null
          cash_book_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          journal_entry_id?: string | null
          method: string
          notes?: string | null
          org_unit_id?: string | null
          partner_id?: string | null
          partner_type: string
          payment_date: string
          payment_number: string
          reference?: string | null
          source_module?: string | null
          source_reference_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          approval_request_id?: string | null
          bank_account_id?: string | null
          branch_id?: string | null
          cash_book_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          journal_entry_id?: string | null
          method?: string
          notes?: string | null
          org_unit_id?: string | null
          partner_id?: string | null
          partner_type?: string
          payment_date?: string
          payment_number?: string
          reference?: string | null
          source_module?: string | null
          source_reference_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "fin_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_payments_cash_book_id_fkey"
            columns: ["cash_book_id"]
            isOneToOne: false
            referencedRelation: "fin_cash_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "fin_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_payments_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_petty_cash: {
        Row: {
          amount: number
          approval_request_id: string | null
          branch_id: string | null
          cash_book_id: string | null
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          journal_entry_id: string | null
          org_unit_id: string | null
          purpose: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          voucher_date: string
          voucher_number: string
        }
        Insert: {
          amount: number
          approval_request_id?: string | null
          branch_id?: string | null
          cash_book_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          journal_entry_id?: string | null
          org_unit_id?: string | null
          purpose?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          voucher_date: string
          voucher_number: string
        }
        Update: {
          amount?: number
          approval_request_id?: string | null
          branch_id?: string | null
          cash_book_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          journal_entry_id?: string | null
          org_unit_id?: string | null
          purpose?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          voucher_date?: string
          voucher_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_petty_cash_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_petty_cash_cash_book_id_fkey"
            columns: ["cash_book_id"]
            isOneToOne: false
            referencedRelation: "fin_cash_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_petty_cash_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "fin_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_petty_cash_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_petty_cash_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_profit_centers: {
        Row: {
          branch_id: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          org_unit_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          org_unit_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          org_unit_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_profit_centers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_profit_centers_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_profit_centers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_receipts: {
        Row: {
          amount: number
          bank_account_id: string | null
          branch_id: string | null
          cash_book_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          id: string
          journal_entry_id: string | null
          method: string
          notes: string | null
          org_unit_id: string | null
          partner_id: string | null
          partner_type: string
          receipt_date: string
          receipt_number: string
          reference: string | null
          source_module: string | null
          source_reference_id: string | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          branch_id?: string | null
          cash_book_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          journal_entry_id?: string | null
          method: string
          notes?: string | null
          org_unit_id?: string | null
          partner_id?: string | null
          partner_type: string
          receipt_date: string
          receipt_number: string
          reference?: string | null
          source_module?: string | null
          source_reference_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          branch_id?: string | null
          cash_book_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          journal_entry_id?: string | null
          method?: string
          notes?: string | null
          org_unit_id?: string | null
          partner_id?: string | null
          partner_type?: string
          receipt_date?: string
          receipt_number?: string
          reference?: string | null
          source_module?: string | null
          source_reference_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_receipts_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "fin_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_receipts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_receipts_cash_book_id_fkey"
            columns: ["cash_book_id"]
            isOneToOne: false
            referencedRelation: "fin_cash_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_receipts_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "fin_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_receipts_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_receipts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_revenue_recognition: {
        Row: {
          amount: number
          branch_id: string | null
          created_at: string
          currency: string
          deferral_schedule: Json
          id: string
          invoice_id: string | null
          journal_entry_id: string | null
          metadata: Json
          org_unit_id: string | null
          recognition_date: string
          service_date: string | null
          source_module: string
          source_reference_id: string | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          branch_id?: string | null
          created_at?: string
          currency?: string
          deferral_schedule?: Json
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          metadata?: Json
          org_unit_id?: string | null
          recognition_date: string
          service_date?: string | null
          source_module: string
          source_reference_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          created_at?: string
          currency?: string
          deferral_schedule?: Json
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          metadata?: Json
          org_unit_id?: string | null
          recognition_date?: string
          service_date?: string | null
          source_module?: string
          source_reference_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_revenue_recognition_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_revenue_recognition_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "fin_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_revenue_recognition_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_revenue_recognition_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_royalty_ledger: {
        Row: {
          adjustments: number
          breakdown: Json
          computed_amount: number
          created_at: string
          final_amount: number
          franchise_org_unit_id: string
          id: string
          journal_entry_id: string | null
          org_unit_id: string | null
          period_id: string | null
          revenue_basis: number
          rule_id: string | null
          settlement_id: string | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          adjustments?: number
          breakdown?: Json
          computed_amount?: number
          created_at?: string
          final_amount?: number
          franchise_org_unit_id: string
          id?: string
          journal_entry_id?: string | null
          org_unit_id?: string | null
          period_id?: string | null
          revenue_basis?: number
          rule_id?: string | null
          settlement_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          adjustments?: number
          breakdown?: Json
          computed_amount?: number
          created_at?: string
          final_amount?: number
          franchise_org_unit_id?: string
          id?: string
          journal_entry_id?: string | null
          org_unit_id?: string | null
          period_id?: string | null
          revenue_basis?: number
          rule_id?: string | null
          settlement_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_royalty_ledger_franchise_org_unit_id_fkey"
            columns: ["franchise_org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_royalty_ledger_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "fin_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_royalty_ledger_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_royalty_ledger_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "fin_accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_royalty_ledger_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "fin_royalty_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_royalty_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_royalty_rules: {
        Row: {
          basis: string
          code: string
          created_at: string
          effective_from: string
          effective_to: string | null
          fixed_amount: number
          franchise_org_unit_id: string | null
          frequency: string
          id: string
          is_active: boolean
          metadata: Json
          minimum_amount: number
          name: string
          org_unit_id: string | null
          rate_pct: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          basis?: string
          code: string
          created_at?: string
          effective_from: string
          effective_to?: string | null
          fixed_amount?: number
          franchise_org_unit_id?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          minimum_amount?: number
          name: string
          org_unit_id?: string | null
          rate_pct?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          basis?: string
          code?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          fixed_amount?: number
          franchise_org_unit_id?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          minimum_amount?: number
          name?: string
          org_unit_id?: string | null
          rate_pct?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_royalty_rules_franchise_org_unit_id_fkey"
            columns: ["franchise_org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_royalty_rules_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_royalty_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_royalty_settlements: {
        Row: {
          adjustments: number
          approval_request_id: string | null
          created_at: string
          created_by: string | null
          franchise_org_unit_id: string
          gross_amount: number
          id: string
          ledger_ids: Json
          net_amount: number
          notes: string | null
          org_unit_id: string | null
          payment_id: string | null
          period_from: string
          period_to: string
          settlement_date: string
          settlement_number: string
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          adjustments?: number
          approval_request_id?: string | null
          created_at?: string
          created_by?: string | null
          franchise_org_unit_id: string
          gross_amount?: number
          id?: string
          ledger_ids?: Json
          net_amount?: number
          notes?: string | null
          org_unit_id?: string | null
          payment_id?: string | null
          period_from: string
          period_to: string
          settlement_date: string
          settlement_number: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          adjustments?: number
          approval_request_id?: string | null
          created_at?: string
          created_by?: string | null
          franchise_org_unit_id?: string
          gross_amount?: number
          id?: string
          ledger_ids?: Json
          net_amount?: number
          notes?: string | null
          org_unit_id?: string | null
          payment_id?: string | null
          period_from?: string
          period_to?: string
          settlement_date?: string
          settlement_number?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_royalty_settlements_franchise_org_unit_id_fkey"
            columns: ["franchise_org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_royalty_settlements_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_royalty_settlements_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "fin_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_royalty_settlements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_tax_ledger: {
        Row: {
          branch_id: string | null
          cess: number
          cgst: number
          created_at: string
          entry_date: string
          gstin: string | null
          id: string
          igst: number
          journal_entry_id: string | null
          metadata: Json
          org_unit_id: string | null
          period_id: string | null
          rate_pct: number
          sgst: number
          source_module: string | null
          source_reference_id: string | null
          status: string
          tax_code: string | null
          tax_type: string
          taxable_amount: number
          tcs_amount: number
          tds_amount: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          cess?: number
          cgst?: number
          created_at?: string
          entry_date: string
          gstin?: string | null
          id?: string
          igst?: number
          journal_entry_id?: string | null
          metadata?: Json
          org_unit_id?: string | null
          period_id?: string | null
          rate_pct?: number
          sgst?: number
          source_module?: string | null
          source_reference_id?: string | null
          status?: string
          tax_code?: string | null
          tax_type: string
          taxable_amount?: number
          tcs_amount?: number
          tds_amount?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          cess?: number
          cgst?: number
          created_at?: string
          entry_date?: string
          gstin?: string | null
          id?: string
          igst?: number
          journal_entry_id?: string | null
          metadata?: Json
          org_unit_id?: string | null
          period_id?: string | null
          rate_pct?: number
          sgst?: number
          source_module?: string | null
          source_reference_id?: string | null
          status?: string
          tax_code?: string | null
          tax_type?: string
          taxable_amount?: number
          tcs_amount?: number
          tds_amount?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_tax_ledger_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_tax_ledger_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "fin_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_tax_ledger_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_tax_ledger_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "fin_accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_tax_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_vendor_bill_items: {
        Row: {
          account_id: string | null
          amount: number
          bill_id: string
          cost_center_id: string | null
          created_at: string
          description: string | null
          id: string
          line_number: number
          org_unit_id: string | null
          quantity: number
          tax_amount: number
          tax_code: string | null
          tenant_id: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          bill_id: string
          cost_center_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          line_number: number
          org_unit_id?: string | null
          quantity?: number
          tax_amount?: number
          tax_code?: string | null
          tenant_id?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          bill_id?: string
          cost_center_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          line_number?: number
          org_unit_id?: string | null
          quantity?: number
          tax_amount?: number
          tax_code?: string | null
          tenant_id?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_vendor_bill_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "fin_chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_vendor_bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "fin_vendor_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_vendor_bill_items_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_vendor_bill_items_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_vendor_bill_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_vendor_bills: {
        Row: {
          approval_request_id: string | null
          balance_amount: number
          bill_date: string
          bill_number: string
          branch_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          discount_amount: number
          due_date: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          org_unit_id: string | null
          paid_amount: number
          source_module: string | null
          source_reference_id: string | null
          status: string
          subtotal: number
          tax_amount: number
          tenant_id: string | null
          total_amount: number
          updated_at: string
          vendor_id: string | null
          vendor_invoice_ref: string | null
        }
        Insert: {
          approval_request_id?: string | null
          balance_amount?: number
          bill_date: string
          bill_number: string
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_amount?: number
          due_date?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          org_unit_id?: string | null
          paid_amount?: number
          source_module?: string | null
          source_reference_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
          vendor_id?: string | null
          vendor_invoice_ref?: string | null
        }
        Update: {
          approval_request_id?: string | null
          balance_amount?: number
          bill_date?: string
          bill_number?: string
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_amount?: number
          due_date?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          org_unit_id?: string | null
          paid_amount?: number
          source_module?: string | null
          source_reference_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
          vendor_id?: string | null
          vendor_invoice_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_vendor_bills_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_vendor_bills_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "fin_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_vendor_bills_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_vendor_bills_tenant_id_fkey"
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
      insurance_authorizations: {
        Row: {
          approved_amount: number | null
          auth_no: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          denial_reason: string | null
          documents: Json
          id: string
          meta: Json
          patient_insurance_id: string
          person_id: string
          requested_amount: number | null
          requested_at: string
          requested_service: Json
          responded_at: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          approved_amount?: number | null
          auth_no?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          denial_reason?: string | null
          documents?: Json
          id?: string
          meta?: Json
          patient_insurance_id: string
          person_id: string
          requested_amount?: number | null
          requested_at?: string
          requested_service?: Json
          responded_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          approved_amount?: number | null
          auth_no?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          denial_reason?: string | null
          documents?: Json
          id?: string
          meta?: Json
          patient_insurance_id?: string
          person_id?: string
          requested_amount?: number | null
          requested_at?: string
          requested_service?: Json
          responded_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_authorizations_patient_insurance_id_fkey"
            columns: ["patient_insurance_id"]
            isOneToOne: false
            referencedRelation: "patient_insurance"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_claim_events: {
        Row: {
          actor_id: string | null
          claim_id: string
          event_type: string
          from_status: string | null
          id: number
          occurred_at: string
          payload: Json
          tenant_id: string
          to_status: string | null
        }
        Insert: {
          actor_id?: string | null
          claim_id: string
          event_type: string
          from_status?: string | null
          id?: number
          occurred_at?: string
          payload?: Json
          tenant_id: string
          to_status?: string | null
        }
        Update: {
          actor_id?: string | null
          claim_id?: string
          event_type?: string
          from_status?: string | null
          id?: number
          occurred_at?: string
          payload?: Json
          tenant_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claim_events_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "insurance_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_claim_items: {
        Row: {
          allowed_amount: number | null
          billed_amount: number
          claim_id: string
          created_at: string
          denial_code: string | null
          description: string | null
          hsn_sac: string | null
          id: string
          invoice_item_id: string | null
          line_no: number
          meta: Json
          paid_amount: number
          qty: number
          service_code: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allowed_amount?: number | null
          billed_amount?: number
          claim_id: string
          created_at?: string
          denial_code?: string | null
          description?: string | null
          hsn_sac?: string | null
          id?: string
          invoice_item_id?: string | null
          line_no: number
          meta?: Json
          paid_amount?: number
          qty?: number
          service_code?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allowed_amount?: number | null
          billed_amount?: number
          claim_id?: string
          created_at?: string
          denial_code?: string | null
          description?: string | null
          hsn_sac?: string | null
          id?: string
          invoice_item_id?: string | null
          line_no?: number
          meta?: Json
          paid_amount?: number
          qty?: number
          service_code?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claim_items_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "insurance_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claim_items_invoice_item_id_fkey"
            columns: ["invoice_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_items"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_claims: {
        Row: {
          allowed_amount: number | null
          authorization_id: string | null
          billed_amount: number
          branch_id: string | null
          claim_no: string
          created_at: string
          created_by: string | null
          denial_reason: string | null
          documents: Json
          external_claim_ref: string | null
          id: string
          invoice_id: string | null
          meta: Json
          paid_amount: number
          patient_insurance_id: string
          patient_responsibility: number
          person_id: string | null
          status: string
          submission_channel: string | null
          submitted_at: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allowed_amount?: number | null
          authorization_id?: string | null
          billed_amount?: number
          branch_id?: string | null
          claim_no: string
          created_at?: string
          created_by?: string | null
          denial_reason?: string | null
          documents?: Json
          external_claim_ref?: string | null
          id?: string
          invoice_id?: string | null
          meta?: Json
          paid_amount?: number
          patient_insurance_id: string
          patient_responsibility?: number
          person_id?: string | null
          status?: string
          submission_channel?: string | null
          submitted_at?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allowed_amount?: number | null
          authorization_id?: string | null
          billed_amount?: number
          branch_id?: string | null
          claim_no?: string
          created_at?: string
          created_by?: string | null
          denial_reason?: string | null
          documents?: Json
          external_claim_ref?: string | null
          id?: string
          invoice_id?: string | null
          meta?: Json
          paid_amount?: number
          patient_insurance_id?: string
          patient_responsibility?: number
          person_id?: string | null
          status?: string
          submission_channel?: string | null
          submitted_at?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claims_authorization_id_fkey"
            columns: ["authorization_id"]
            isOneToOne: false
            referencedRelation: "insurance_authorizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_patient_insurance_id_fkey"
            columns: ["patient_insurance_id"]
            isOneToOne: false
            referencedRelation: "patient_insurance"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_payers: {
        Row: {
          code: string
          contact: Json
          created_at: string
          created_by: string | null
          gst_no: string | null
          id: string
          is_active: boolean
          kind: string
          meta: Json
          name: string
          pan: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          contact?: Json
          created_at?: string
          created_by?: string | null
          gst_no?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          meta?: Json
          name: string
          pan?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          contact?: Json
          created_at?: string
          created_by?: string | null
          gst_no?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          meta?: Json
          name?: string
          pan?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      insurance_plans: {
        Row: {
          annual_limit: number | null
          code: string
          copay_percent: number
          coverage_percent: number
          covered_services: Json
          created_at: string
          created_by: string | null
          excluded_services: Json
          id: string
          is_active: boolean
          meta: Json
          name: string
          payer_id: string
          per_visit_limit: number | null
          plan_type: string | null
          requires_authorization: boolean
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          annual_limit?: number | null
          code: string
          copay_percent?: number
          coverage_percent?: number
          covered_services?: Json
          created_at?: string
          created_by?: string | null
          excluded_services?: Json
          id?: string
          is_active?: boolean
          meta?: Json
          name: string
          payer_id: string
          per_visit_limit?: number | null
          plan_type?: string | null
          requires_authorization?: boolean
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          annual_limit?: number | null
          code?: string
          copay_percent?: number
          coverage_percent?: number
          covered_services?: Json
          created_at?: string
          created_by?: string | null
          excluded_services?: Json
          id?: string
          is_active?: boolean
          meta?: Json
          name?: string
          payer_id?: string
          per_visit_limit?: number | null
          plan_type?: string | null
          requires_authorization?: boolean
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_plans_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "insurance_payers"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_remittance_lines: {
        Row: {
          adjustment_amount: number
          allowed_amount: number
          billed_amount: number
          claim_id: string | null
          claim_item_id: string | null
          created_at: string
          denial_code: string | null
          id: string
          meta: Json
          paid_amount: number
          patient_responsibility: number
          remark: string | null
          remittance_id: string
          tenant_id: string
        }
        Insert: {
          adjustment_amount?: number
          allowed_amount?: number
          billed_amount?: number
          claim_id?: string | null
          claim_item_id?: string | null
          created_at?: string
          denial_code?: string | null
          id?: string
          meta?: Json
          paid_amount?: number
          patient_responsibility?: number
          remark?: string | null
          remittance_id: string
          tenant_id: string
        }
        Update: {
          adjustment_amount?: number
          allowed_amount?: number
          billed_amount?: number
          claim_id?: string | null
          claim_item_id?: string | null
          created_at?: string
          denial_code?: string | null
          id?: string
          meta?: Json
          paid_amount?: number
          patient_responsibility?: number
          remark?: string | null
          remittance_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_remittance_lines_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "insurance_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_remittance_lines_claim_item_id_fkey"
            columns: ["claim_item_id"]
            isOneToOne: false
            referencedRelation: "insurance_claim_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_remittance_lines_remittance_id_fkey"
            columns: ["remittance_id"]
            isOneToOne: false
            referencedRelation: "insurance_remittances"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_remittances: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          external_ref: string | null
          id: string
          meta: Json
          payer_id: string
          remit_date: string
          remittance_no: string
          status: string
          tenant_id: string
          total_amount: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          external_ref?: string | null
          id?: string
          meta?: Json
          payer_id: string
          remit_date: string
          remittance_no: string
          status?: string
          tenant_id: string
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          external_ref?: string | null
          id?: string
          meta?: Json
          payer_id?: string
          remit_date?: string
          remittance_no?: string
          status?: string
          tenant_id?: string
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_remittances_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "insurance_payers"
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
      invoice_discounts: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          discount_scheme_id: string | null
          id: string
          invoice_id: string
          line_no: number | null
          reason: string | null
          scope: string
          tenant_id: string
        }
        Insert: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          discount_scheme_id?: string | null
          id?: string
          invoice_id: string
          line_no?: number | null
          reason?: string | null
          scope: string
          tenant_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          discount_scheme_id?: string | null
          id?: string
          invoice_id?: string
          line_no?: number | null
          reason?: string | null
          scope?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_discounts_discount_scheme_id_fkey"
            columns: ["discount_scheme_id"]
            isOneToOne: false
            referencedRelation: "discount_schemes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_discounts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          discount_amount: number
          discount_scheme_id: string | null
          hsn_sac: string | null
          id: string
          invoice_id: string
          item_kind: string
          item_ref_id: string | null
          line_no: number
          line_total: number
          meta: Json
          package_ref_id: string | null
          performer_id: string | null
          qty: number
          tax_amount: number
          tax_rule_id: string | null
          tenant_id: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          discount_amount?: number
          discount_scheme_id?: string | null
          hsn_sac?: string | null
          id?: string
          invoice_id: string
          item_kind: string
          item_ref_id?: string | null
          line_no: number
          line_total?: number
          meta?: Json
          package_ref_id?: string | null
          performer_id?: string | null
          qty?: number
          tax_amount?: number
          tax_rule_id?: string | null
          tenant_id: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          discount_amount?: number
          discount_scheme_id?: string | null
          hsn_sac?: string | null
          id?: string
          invoice_id?: string
          item_kind?: string
          item_ref_id?: string | null
          line_no?: number
          line_total?: number
          meta?: Json
          package_ref_id?: string | null
          performer_id?: string | null
          qty?: number
          tax_amount?: number
          tax_rule_id?: string | null
          tenant_id?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_discount_scheme_id_fkey"
            columns: ["discount_scheme_id"]
            isOneToOne: false
            referencedRelation: "discount_schemes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_taxes: {
        Row: {
          code: string | null
          created_at: string
          id: string
          invoice_id: string
          name: string | null
          rate_percent: number
          tax_amount: number
          tax_rate_id: string | null
          taxable_amount: number
          tenant_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          invoice_id: string
          name?: string | null
          rate_percent?: number
          tax_amount?: number
          tax_rate_id?: string | null
          taxable_amount?: number
          tenant_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          invoice_id?: string
          name?: string | null
          rate_percent?: number
          tax_amount?: number
          tax_rate_id?: string | null
          taxable_amount?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_taxes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_taxes_tax_rate_id_fkey"
            columns: ["tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due: number
          amount_paid: number
          billing_source: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          discount_total: number
          due_date: string | null
          einvoice_irn: string | null
          einvoice_qr: string | null
          einvoice_status: string | null
          grand_total: number
          gst_registration_id: string | null
          id: string
          insurance_covered: number
          invoice_no: string | null
          invoice_series: string | null
          issue_date: string | null
          meta: Json
          notes: string | null
          patient_id: string | null
          patient_responsibility: number
          person_id: string | null
          place_of_supply: string | null
          price_book_id: string | null
          primary_insurance_id: string | null
          round_off: number
          source_ref: Json
          status: string
          subtotal: number
          tax_total: number
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          billing_source?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_total?: number
          due_date?: string | null
          einvoice_irn?: string | null
          einvoice_qr?: string | null
          einvoice_status?: string | null
          grand_total?: number
          gst_registration_id?: string | null
          id?: string
          insurance_covered?: number
          invoice_no?: string | null
          invoice_series?: string | null
          issue_date?: string | null
          meta?: Json
          notes?: string | null
          patient_id?: string | null
          patient_responsibility?: number
          person_id?: string | null
          place_of_supply?: string | null
          price_book_id?: string | null
          primary_insurance_id?: string | null
          round_off?: number
          source_ref?: Json
          status?: string
          subtotal?: number
          tax_total?: number
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          billing_source?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_total?: number
          due_date?: string | null
          einvoice_irn?: string | null
          einvoice_qr?: string | null
          einvoice_status?: string | null
          grand_total?: number
          gst_registration_id?: string | null
          id?: string
          insurance_covered?: number
          invoice_no?: string | null
          invoice_series?: string | null
          issue_date?: string | null
          meta?: Json
          notes?: string | null
          patient_id?: string | null
          patient_responsibility?: number
          person_id?: string | null
          place_of_supply?: string | null
          price_book_id?: string | null
          primary_insurance_id?: string | null
          round_off?: number
          source_ref?: Json
          status?: string
          subtotal?: number
          tax_total?: number
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_gst_registration_id_fkey"
            columns: ["gst_registration_id"]
            isOneToOne: false
            referencedRelation: "gst_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_price_book_id_fkey"
            columns: ["price_book_id"]
            isOneToOne: false
            referencedRelation: "price_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_primary_insurance_fk"
            columns: ["primary_insurance_id"]
            isOneToOne: false
            referencedRelation: "patient_insurance"
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
      lab_accessions: {
        Row: {
          accession_no: string
          branch_id: string | null
          created_at: string
          id: string
          meta: Json
          order_id: string | null
          received_at: string
          received_by: string | null
          received_location: string | null
          rejection_reason: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          accession_no: string
          branch_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          order_id?: string | null
          received_at?: string
          received_by?: string | null
          received_location?: string | null
          rejection_reason?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          accession_no?: string
          branch_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          order_id?: string | null
          received_at?: string
          received_by?: string | null
          received_location?: string | null
          rejection_reason?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_accessions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "lab_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_analyzer_instruments: {
        Row: {
          analyzer_type_id: string | null
          branch_id: string | null
          code: string
          connection: Json
          created_at: string
          created_by: string | null
          id: string
          last_online_at: string | null
          location: string | null
          meta: Json
          name: string
          serial_no: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          analyzer_type_id?: string | null
          branch_id?: string | null
          code: string
          connection?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          last_online_at?: string | null
          location?: string | null
          meta?: Json
          name: string
          serial_no?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          analyzer_type_id?: string | null
          branch_id?: string | null
          code?: string
          connection?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          last_online_at?: string | null
          location?: string | null
          meta?: Json
          name?: string
          serial_no?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_analyzer_instruments_analyzer_type_id_fkey"
            columns: ["analyzer_type_id"]
            isOneToOne: false
            referencedRelation: "lab_analyzer_types"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_analyzer_queues: {
        Row: {
          completed_at: string | null
          error: string | null
          id: string
          instrument_id: string
          meta: Json
          order_item_id: string | null
          queued_at: string
          specimen_id: string | null
          started_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          completed_at?: string | null
          error?: string | null
          id?: string
          instrument_id: string
          meta?: Json
          order_item_id?: string | null
          queued_at?: string
          specimen_id?: string | null
          started_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          completed_at?: string | null
          error?: string | null
          id?: string
          instrument_id?: string
          meta?: Json
          order_item_id?: string | null
          queued_at?: string
          specimen_id?: string | null
          started_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_analyzer_queues_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "lab_analyzer_instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_analyzer_queues_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "lab_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_analyzer_queues_specimen_id_fkey"
            columns: ["specimen_id"]
            isOneToOne: false
            referencedRelation: "lab_specimens"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_analyzer_results: {
        Row: {
          flag: string | null
          id: string
          ingested_at: string
          instrument_id: string
          meta: Json
          numeric_value: number | null
          order_item_id: string | null
          queue_id: string | null
          raw_payload: Json
          received_at: string
          tenant_id: string
          test_id: string | null
          text_value: string | null
          unit_code: string | null
        }
        Insert: {
          flag?: string | null
          id?: string
          ingested_at?: string
          instrument_id: string
          meta?: Json
          numeric_value?: number | null
          order_item_id?: string | null
          queue_id?: string | null
          raw_payload?: Json
          received_at?: string
          tenant_id: string
          test_id?: string | null
          text_value?: string | null
          unit_code?: string | null
        }
        Update: {
          flag?: string | null
          id?: string
          ingested_at?: string
          instrument_id?: string
          meta?: Json
          numeric_value?: number | null
          order_item_id?: string | null
          queue_id?: string | null
          raw_payload?: Json
          received_at?: string
          tenant_id?: string
          test_id?: string | null
          text_value?: string | null
          unit_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_analyzer_results_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "lab_analyzer_instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_analyzer_results_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "lab_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_analyzer_results_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "lab_analyzer_queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_analyzer_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "lab_test_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_analyzer_types: {
        Row: {
          code: string
          connectivity: string | null
          created_at: string
          id: string
          is_active: boolean
          meta: Json
          name: string
          tenant_id: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          code: string
          connectivity?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          meta?: Json
          name: string
          tenant_id?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          code?: string
          connectivity?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          meta?: Json
          name?: string
          tenant_id?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: []
      }
      lab_audit: {
        Row: {
          action: string
          actor_id: string | null
          diff: Json
          entity_id: string
          entity_type: string
          id: number
          occurred_at: string
          reason: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          diff?: Json
          entity_id: string
          entity_type: string
          id?: number
          occurred_at?: string
          reason?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          diff?: Json
          entity_id?: string
          entity_type?: string
          id?: number
          occurred_at?: string
          reason?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      lab_calibration_records: {
        Row: {
          calibrated_at: string
          created_at: string
          document_id: string | null
          id: string
          instrument_id: string
          intercept: number | null
          meta: Json
          method: string | null
          next_due_at: string | null
          performed_by: string | null
          result: string | null
          slope: number | null
          tenant_id: string
          test_id: string | null
          updated_at: string
        }
        Insert: {
          calibrated_at?: string
          created_at?: string
          document_id?: string | null
          id?: string
          instrument_id: string
          intercept?: number | null
          meta?: Json
          method?: string | null
          next_due_at?: string | null
          performed_by?: string | null
          result?: string | null
          slope?: number | null
          tenant_id: string
          test_id?: string | null
          updated_at?: string
        }
        Update: {
          calibrated_at?: string
          created_at?: string
          document_id?: string | null
          id?: string
          instrument_id?: string
          intercept?: number | null
          meta?: Json
          method?: string | null
          next_due_at?: string | null
          performed_by?: string | null
          result?: string | null
          slope?: number | null
          tenant_id?: string
          test_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_calibration_records_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "lab_analyzer_instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_calibration_records_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "lab_test_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_container_types: {
        Row: {
          additive: string | null
          cap_color: string | null
          code: string
          created_at: string
          default_volume_ml: number | null
          id: string
          is_active: boolean
          meta: Json
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          additive?: string | null
          cap_color?: string | null
          code: string
          created_at?: string
          default_volume_ml?: number | null
          id?: string
          is_active?: boolean
          meta?: Json
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          additive?: string | null
          cap_color?: string | null
          code?: string
          created_at?: string
          default_volume_ml?: number | null
          id?: string
          is_active?: boolean
          meta?: Json
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lab_critical_value_rules: {
        Row: {
          ack_required: boolean
          ack_window_minutes: number
          created_at: string
          high_critical: number | null
          id: string
          is_active: boolean
          low_critical: number | null
          notify_channels: Json
          qualitative_critical: string | null
          tenant_id: string
          test_id: string
          updated_at: string
        }
        Insert: {
          ack_required?: boolean
          ack_window_minutes?: number
          created_at?: string
          high_critical?: number | null
          id?: string
          is_active?: boolean
          low_critical?: number | null
          notify_channels?: Json
          qualitative_critical?: string | null
          tenant_id: string
          test_id: string
          updated_at?: string
        }
        Update: {
          ack_required?: boolean
          ack_window_minutes?: number
          created_at?: string
          high_critical?: number | null
          id?: string
          is_active?: boolean
          low_critical?: number | null
          notify_channels?: Json
          qualitative_critical?: string | null
          tenant_id?: string
          test_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_critical_value_rules_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "lab_test_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_cultures: {
        Row: {
          colony_count: string | null
          created_at: string
          gram_stain: string | null
          growth_status: string
          id: string
          incubated_at: string | null
          meta: Json
          microbiology_order_id: string | null
          notes: string | null
          organism_code: string | null
          organism_name: string | null
          reported_at: string | null
          reported_by: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          colony_count?: string | null
          created_at?: string
          gram_stain?: string | null
          growth_status?: string
          id?: string
          incubated_at?: string | null
          meta?: Json
          microbiology_order_id?: string | null
          notes?: string | null
          organism_code?: string | null
          organism_name?: string | null
          reported_at?: string | null
          reported_by?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          colony_count?: string | null
          created_at?: string
          gram_stain?: string | null
          growth_status?: string
          id?: string
          incubated_at?: string | null
          meta?: Json
          microbiology_order_id?: string | null
          notes?: string | null
          organism_code?: string | null
          organism_name?: string | null
          reported_at?: string | null
          reported_by?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_cultures_microbiology_order_id_fkey"
            columns: ["microbiology_order_id"]
            isOneToOne: false
            referencedRelation: "lab_microbiology_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_delta_check_rules: {
        Row: {
          action: string
          created_at: string
          delta_kind: string
          id: string
          is_active: boolean
          tenant_id: string
          test_id: string
          threshold: number
          updated_at: string
          window_days: number
        }
        Insert: {
          action?: string
          created_at?: string
          delta_kind: string
          id?: string
          is_active?: boolean
          tenant_id: string
          test_id: string
          threshold: number
          updated_at?: string
          window_days?: number
        }
        Update: {
          action?: string
          created_at?: string
          delta_kind?: string
          id?: string
          is_active?: boolean
          tenant_id?: string
          test_id?: string
          threshold?: number
          updated_at?: string
          window_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "lab_delta_check_rules_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "lab_test_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_departments: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          kind: string
          meta: Json
          name: string
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
          meta?: Json
          name: string
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
          meta?: Json
          name?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      lab_distribution_logs: {
        Row: {
          actor_id: string | null
          channel: string
          id: number
          meta: Json
          order_id: string | null
          recipient: string | null
          sent_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          actor_id?: string | null
          channel: string
          id?: number
          meta?: Json
          order_id?: string | null
          recipient?: string | null
          sent_at?: string
          status?: string
          tenant_id: string
        }
        Update: {
          actor_id?: string | null
          channel?: string
          id?: number
          meta?: Json
          order_id?: string | null
          recipient?: string | null
          sent_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_distribution_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "lab_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_external_orders: {
        Row: {
          completed_at: string | null
          cost: number | null
          created_at: string
          created_by: string | null
          currency: string | null
          external_ref: string | null
          id: string
          meta: Json
          order_id: string | null
          status: string
          submitted_at: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          vendor_code: string
        }
        Insert: {
          completed_at?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          external_ref?: string | null
          id?: string
          meta?: Json
          order_id?: string | null
          status?: string
          submitted_at?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          vendor_code: string
        }
        Update: {
          completed_at?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          external_ref?: string | null
          id?: string
          meta?: Json
          order_id?: string | null
          status?: string
          submitted_at?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          vendor_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_external_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "lab_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_external_results: {
        Row: {
          created_at: string
          external_order_id: string | null
          id: string
          ingested: boolean
          meta: Json
          payload: Json
          received_at: string
          result_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          external_order_id?: string | null
          id?: string
          ingested?: boolean
          meta?: Json
          payload?: Json
          received_at?: string
          result_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          external_order_id?: string | null
          id?: string
          ingested?: boolean
          meta?: Json
          payload?: Json
          received_at?: string
          result_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_external_results_external_order_id_fkey"
            columns: ["external_order_id"]
            isOneToOne: false
            referencedRelation: "lab_external_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_external_results_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "lab_results"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_microbiology_orders: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          id: string
          meta: Json
          order_id: string | null
          order_item_id: string | null
          request_kind: string
          specimen_id: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          meta?: Json
          order_id?: string | null
          order_item_id?: string | null
          request_kind?: string
          specimen_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          meta?: Json
          order_id?: string | null
          order_item_id?: string | null
          request_kind?: string
          specimen_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_microbiology_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "lab_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_microbiology_orders_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "lab_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_microbiology_orders_specimen_id_fkey"
            columns: ["specimen_id"]
            isOneToOne: false
            referencedRelation: "lab_specimens"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_order_items: {
        Row: {
          created_at: string
          id: string
          item_kind: string
          meta: Json
          order_id: string
          panel_id: string | null
          reflex_from_item_id: string | null
          status: string
          tenant_id: string
          test_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_kind: string
          meta?: Json
          order_id: string
          panel_id?: string | null
          reflex_from_item_id?: string | null
          status?: string
          tenant_id: string
          test_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_kind?: string
          meta?: Json
          order_id?: string
          panel_id?: string | null
          reflex_from_item_id?: string | null
          status?: string
          tenant_id?: string
          test_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "lab_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_order_items_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "lab_panels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_order_items_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "lab_test_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_orders: {
        Row: {
          authorization_id: string | null
          branch_id: string | null
          clinical_order_ref: Json
          created_at: string
          created_by: string | null
          diagnosis_codes: Json
          encounter_id: string | null
          external_order_ref: string | null
          fasting: boolean | null
          id: string
          invoice_id: string | null
          meta: Json
          notes: string | null
          order_no: string
          ordered_at: string
          ordering_provider_id: string | null
          patient_id: string | null
          person_id: string | null
          priority: string
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          authorization_id?: string | null
          branch_id?: string | null
          clinical_order_ref?: Json
          created_at?: string
          created_by?: string | null
          diagnosis_codes?: Json
          encounter_id?: string | null
          external_order_ref?: string | null
          fasting?: boolean | null
          id?: string
          invoice_id?: string | null
          meta?: Json
          notes?: string | null
          order_no: string
          ordered_at?: string
          ordering_provider_id?: string | null
          patient_id?: string | null
          person_id?: string | null
          priority?: string
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          authorization_id?: string | null
          branch_id?: string | null
          clinical_order_ref?: Json
          created_at?: string
          created_by?: string | null
          diagnosis_codes?: Json
          encounter_id?: string | null
          external_order_ref?: string | null
          fasting?: boolean | null
          id?: string
          invoice_id?: string | null
          meta?: Json
          notes?: string | null
          order_no?: string
          ordered_at?: string
          ordering_provider_id?: string | null
          patient_id?: string | null
          person_id?: string | null
          priority?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      lab_panel_tests: {
        Row: {
          created_at: string
          id: string
          is_optional: boolean
          panel_id: string
          sequence: number
          tenant_id: string
          test_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_optional?: boolean
          panel_id: string
          sequence?: number
          tenant_id: string
          test_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_optional?: boolean
          panel_id?: string
          sequence?: number
          tenant_id?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_panel_tests_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "lab_panels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_panel_tests_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "lab_test_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_panels: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          department_id: string | null
          id: string
          is_active: boolean
          meta: Json
          name: string
          price: number | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean
          meta?: Json
          name: string
          price?: number | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean
          meta?: Json
          name?: string
          price?: number | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_panels_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "lab_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_pathology_cases: {
        Row: {
          attachments: Json
          branch_id: string | null
          case_kind: string
          case_no: string
          created_at: string
          created_by: string | null
          diagnosis: string | null
          gross_description: string | null
          icd_o_code: string | null
          id: string
          meta: Json
          microscopic_description: string | null
          order_id: string | null
          pathologist_id: string | null
          reported_at: string | null
          specimen_id: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attachments?: Json
          branch_id?: string | null
          case_kind?: string
          case_no: string
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          gross_description?: string | null
          icd_o_code?: string | null
          id?: string
          meta?: Json
          microscopic_description?: string | null
          order_id?: string | null
          pathologist_id?: string | null
          reported_at?: string | null
          specimen_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attachments?: Json
          branch_id?: string | null
          case_kind?: string
          case_no?: string
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          gross_description?: string | null
          icd_o_code?: string | null
          id?: string
          meta?: Json
          microscopic_description?: string | null
          order_id?: string | null
          pathologist_id?: string | null
          reported_at?: string | null
          specimen_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_pathology_cases_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "lab_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_pathology_cases_specimen_id_fkey"
            columns: ["specimen_id"]
            isOneToOne: false
            referencedRelation: "lab_specimens"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_qc_materials: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expiry_date: string | null
          id: string
          is_active: boolean
          level: string | null
          lot_no: string
          meta: Json
          name: string
          target_values: Json
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          level?: string | null
          lot_no: string
          meta?: Json
          name: string
          target_values?: Json
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          level?: string | null
          lot_no?: string
          meta?: Json
          name?: string
          target_values?: Json
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      lab_qc_rules: {
        Row: {
          action: string
          created_at: string
          id: string
          is_active: boolean
          meta: Json
          rule_code: string
          tenant_id: string
          test_id: string | null
          updated_at: string
        }
        Insert: {
          action?: string
          created_at?: string
          id?: string
          is_active?: boolean
          meta?: Json
          rule_code: string
          tenant_id: string
          test_id?: string | null
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          is_active?: boolean
          meta?: Json
          rule_code?: string
          tenant_id?: string
          test_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_qc_rules_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "lab_test_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_qc_runs: {
        Row: {
          actor_id: string | null
          comment: string | null
          created_at: string
          id: string
          instrument_id: string | null
          meta: Json
          observed_value: number | null
          qc_material_id: string | null
          run_at: string
          status: string
          tenant_id: string
          test_id: string | null
          updated_at: string
          violated_rules: Json
          z_score: number | null
        }
        Insert: {
          actor_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          instrument_id?: string | null
          meta?: Json
          observed_value?: number | null
          qc_material_id?: string | null
          run_at?: string
          status?: string
          tenant_id: string
          test_id?: string | null
          updated_at?: string
          violated_rules?: Json
          z_score?: number | null
        }
        Update: {
          actor_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          instrument_id?: string | null
          meta?: Json
          observed_value?: number | null
          qc_material_id?: string | null
          run_at?: string
          status?: string
          tenant_id?: string
          test_id?: string | null
          updated_at?: string
          violated_rules?: Json
          z_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_qc_runs_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "lab_analyzer_instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_qc_runs_qc_material_id_fkey"
            columns: ["qc_material_id"]
            isOneToOne: false
            referencedRelation: "lab_qc_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_qc_runs_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "lab_test_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_reference_ranges: {
        Row: {
          age_max_days: number | null
          age_min_days: number | null
          condition: string | null
          created_at: string
          high_value: number | null
          id: string
          is_active: boolean
          low_value: number | null
          meta: Json
          qualitative_expected: string | null
          range_type: string
          sex: string | null
          tenant_id: string
          test_id: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          age_max_days?: number | null
          age_min_days?: number | null
          condition?: string | null
          created_at?: string
          high_value?: number | null
          id?: string
          is_active?: boolean
          low_value?: number | null
          meta?: Json
          qualitative_expected?: string | null
          range_type?: string
          sex?: string | null
          tenant_id: string
          test_id: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          age_max_days?: number | null
          age_min_days?: number | null
          condition?: string | null
          created_at?: string
          high_value?: number | null
          id?: string
          is_active?: boolean
          low_value?: number | null
          meta?: Json
          qualitative_expected?: string | null
          range_type?: string
          sex?: string | null
          tenant_id?: string
          test_id?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_reference_ranges_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "lab_test_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_reference_ranges_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "lab_units"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_result_versions: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          reason: string | null
          result_id: string
          snapshot: Json
          tenant_id: string
          version: number
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          result_id: string
          snapshot: Json
          tenant_id: string
          version: number
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          result_id?: string
          snapshot?: Json
          tenant_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "lab_result_versions_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "lab_results"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_results: {
        Row: {
          amended_reason: string | null
          attachments: Json
          branch_id: string | null
          coded_value: string | null
          created_at: string
          created_by: string | null
          delta_flag: string | null
          flag: string | null
          id: string
          is_critical: boolean
          meta: Json
          method: string | null
          numeric_value: number | null
          order_id: string | null
          order_item_id: string | null
          performed_at: string | null
          performed_by: string | null
          reference_range_text: string | null
          released_at: string | null
          released_by: string | null
          specimen_id: string | null
          status: string
          tenant_id: string
          test_id: string | null
          text_value: string | null
          unit_code: string | null
          updated_at: string
          updated_by: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amended_reason?: string | null
          attachments?: Json
          branch_id?: string | null
          coded_value?: string | null
          created_at?: string
          created_by?: string | null
          delta_flag?: string | null
          flag?: string | null
          id?: string
          is_critical?: boolean
          meta?: Json
          method?: string | null
          numeric_value?: number | null
          order_id?: string | null
          order_item_id?: string | null
          performed_at?: string | null
          performed_by?: string | null
          reference_range_text?: string | null
          released_at?: string | null
          released_by?: string | null
          specimen_id?: string | null
          status?: string
          tenant_id: string
          test_id?: string | null
          text_value?: string | null
          unit_code?: string | null
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amended_reason?: string | null
          attachments?: Json
          branch_id?: string | null
          coded_value?: string | null
          created_at?: string
          created_by?: string | null
          delta_flag?: string | null
          flag?: string | null
          id?: string
          is_critical?: boolean
          meta?: Json
          method?: string | null
          numeric_value?: number | null
          order_id?: string | null
          order_item_id?: string | null
          performed_at?: string | null
          performed_by?: string | null
          reference_range_text?: string | null
          released_at?: string | null
          released_by?: string | null
          specimen_id?: string | null
          status?: string
          tenant_id?: string
          test_id?: string | null
          text_value?: string | null
          unit_code?: string | null
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "lab_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "lab_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_specimen_id_fkey"
            columns: ["specimen_id"]
            isOneToOne: false
            referencedRelation: "lab_specimens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "lab_test_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_sample_types: {
        Row: {
          category: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          loinc_code: string | null
          meta: Json
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          loinc_code?: string | null
          meta?: Json
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          loinc_code?: string | null
          meta?: Json
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lab_sensitivity_panels: {
        Row: {
          antibiotic_code: string
          antibiotic_name: string
          created_at: string
          culture_id: string | null
          id: string
          interpretation: string | null
          meta: Json
          method: string | null
          mic: number | null
          reported_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          antibiotic_code: string
          antibiotic_name: string
          created_at?: string
          culture_id?: string | null
          id?: string
          interpretation?: string | null
          meta?: Json
          method?: string | null
          mic?: number | null
          reported_at?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          antibiotic_code?: string
          antibiotic_name?: string
          created_at?: string
          culture_id?: string | null
          id?: string
          interpretation?: string | null
          meta?: Json
          method?: string | null
          mic?: number | null
          reported_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_sensitivity_panels_culture_id_fkey"
            columns: ["culture_id"]
            isOneToOne: false
            referencedRelation: "lab_cultures"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_specimen_barcodes: {
        Row: {
          barcode_value: string
          container_id: string | null
          created_at: string
          id: string
          is_active: boolean
          meta: Json
          printed_at: string | null
          specimen_id: string | null
          symbology: string
          tenant_id: string
        }
        Insert: {
          barcode_value: string
          container_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          meta?: Json
          printed_at?: string | null
          specimen_id?: string | null
          symbology?: string
          tenant_id: string
        }
        Update: {
          barcode_value?: string
          container_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          meta?: Json
          printed_at?: string | null
          specimen_id?: string | null
          symbology?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_specimen_barcodes_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "lab_specimen_containers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_specimen_barcodes_specimen_id_fkey"
            columns: ["specimen_id"]
            isOneToOne: false
            referencedRelation: "lab_specimens"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_specimen_containers: {
        Row: {
          aliquot_of: string | null
          container_no: string | null
          container_type_id: string | null
          created_at: string
          id: string
          meta: Json
          specimen_id: string
          status: string
          tenant_id: string
          updated_at: string
          volume_ml: number | null
        }
        Insert: {
          aliquot_of?: string | null
          container_no?: string | null
          container_type_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          specimen_id: string
          status?: string
          tenant_id: string
          updated_at?: string
          volume_ml?: number | null
        }
        Update: {
          aliquot_of?: string | null
          container_no?: string | null
          container_type_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          specimen_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          volume_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_specimen_containers_aliquot_of_fkey"
            columns: ["aliquot_of"]
            isOneToOne: false
            referencedRelation: "lab_specimen_containers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_specimen_containers_container_type_id_fkey"
            columns: ["container_type_id"]
            isOneToOne: false
            referencedRelation: "lab_container_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_specimen_containers_specimen_id_fkey"
            columns: ["specimen_id"]
            isOneToOne: false
            referencedRelation: "lab_specimens"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_specimen_tracking: {
        Row: {
          actor_id: string | null
          event: string
          id: number
          location: string | null
          meta: Json
          occurred_at: string
          specimen_id: string
          temperature_c: number | null
          tenant_id: string
        }
        Insert: {
          actor_id?: string | null
          event: string
          id?: number
          location?: string | null
          meta?: Json
          occurred_at?: string
          specimen_id: string
          temperature_c?: number | null
          tenant_id: string
        }
        Update: {
          actor_id?: string | null
          event?: string
          id?: number
          location?: string | null
          meta?: Json
          occurred_at?: string
          specimen_id?: string
          temperature_c?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_specimen_tracking_specimen_id_fkey"
            columns: ["specimen_id"]
            isOneToOne: false
            referencedRelation: "lab_specimens"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_specimens: {
        Row: {
          accession_id: string | null
          branch_id: string | null
          chain_of_custody: Json
          collected_by: string | null
          collection_at: string | null
          collection_site: string | null
          created_at: string
          created_by: string | null
          disposal_at: string | null
          id: string
          meta: Json
          order_id: string | null
          rejection_reason: string | null
          sample_type_id: string | null
          specimen_no: string
          status: string
          storage_location: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          volume_ml: number | null
        }
        Insert: {
          accession_id?: string | null
          branch_id?: string | null
          chain_of_custody?: Json
          collected_by?: string | null
          collection_at?: string | null
          collection_site?: string | null
          created_at?: string
          created_by?: string | null
          disposal_at?: string | null
          id?: string
          meta?: Json
          order_id?: string | null
          rejection_reason?: string | null
          sample_type_id?: string | null
          specimen_no: string
          status?: string
          storage_location?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          volume_ml?: number | null
        }
        Update: {
          accession_id?: string | null
          branch_id?: string | null
          chain_of_custody?: Json
          collected_by?: string | null
          collection_at?: string | null
          collection_site?: string | null
          created_at?: string
          created_by?: string | null
          disposal_at?: string | null
          id?: string
          meta?: Json
          order_id?: string | null
          rejection_reason?: string | null
          sample_type_id?: string | null
          specimen_no?: string
          status?: string
          storage_location?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          volume_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_specimens_accession_id_fkey"
            columns: ["accession_id"]
            isOneToOne: false
            referencedRelation: "lab_accessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_specimens_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "lab_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_specimens_sample_type_id_fkey"
            columns: ["sample_type_id"]
            isOneToOne: false
            referencedRelation: "lab_sample_types"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_test_catalog: {
        Row: {
          analyzer_type_id: string | null
          code: string
          container_type_id: string | null
          cpt_code: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          id: string
          is_active: boolean
          is_reflex: boolean
          loinc_code: string | null
          meta: Json
          method: string | null
          name: string
          price: number | null
          reflex_config: Json
          requires_approval: boolean
          result_kind: string
          sample_type_id: string | null
          short_name: string | null
          tat_minutes: number | null
          tenant_id: string
          unit_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          analyzer_type_id?: string | null
          code: string
          container_type_id?: string | null
          cpt_code?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean
          is_reflex?: boolean
          loinc_code?: string | null
          meta?: Json
          method?: string | null
          name: string
          price?: number | null
          reflex_config?: Json
          requires_approval?: boolean
          result_kind?: string
          sample_type_id?: string | null
          short_name?: string | null
          tat_minutes?: number | null
          tenant_id: string
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          analyzer_type_id?: string | null
          code?: string
          container_type_id?: string | null
          cpt_code?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean
          is_reflex?: boolean
          loinc_code?: string | null
          meta?: Json
          method?: string | null
          name?: string
          price?: number | null
          reflex_config?: Json
          requires_approval?: boolean
          result_kind?: string
          sample_type_id?: string | null
          short_name?: string | null
          tat_minutes?: number | null
          tenant_id?: string
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_test_catalog_analyzer_type_id_fkey"
            columns: ["analyzer_type_id"]
            isOneToOne: false
            referencedRelation: "lab_analyzer_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_test_catalog_container_type_id_fkey"
            columns: ["container_type_id"]
            isOneToOne: false
            referencedRelation: "lab_container_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_test_catalog_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "lab_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_test_catalog_sample_type_id_fkey"
            columns: ["sample_type_id"]
            isOneToOne: false
            referencedRelation: "lab_sample_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_test_catalog_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "lab_units"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_turnaround_logs: {
        Row: {
          actor_id: string | null
          id: number
          meta: Json
          milestone: string
          occurred_at: string
          order_id: string | null
          order_item_id: string | null
          tenant_id: string
        }
        Insert: {
          actor_id?: string | null
          id?: number
          meta?: Json
          milestone: string
          occurred_at?: string
          order_id?: string | null
          order_item_id?: string | null
          tenant_id: string
        }
        Update: {
          actor_id?: string | null
          id?: number
          meta?: Json
          milestone?: string
          occurred_at?: string
          order_id?: string | null
          order_item_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_turnaround_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "lab_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_turnaround_logs_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "lab_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_units: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          tenant_id: string | null
          ucum: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          tenant_id?: string | null
          ucum?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          tenant_id?: string | null
          ucum?: string | null
          updated_at?: string
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
      patient_activity_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          meta: Json
          patient_user_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          meta?: Json
          patient_user_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          meta?: Json
          patient_user_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      patient_app_preferences: {
        Row: {
          created_at: string
          currency: string | null
          home_screen: string | null
          id: string
          language: string | null
          meta: Json
          patient_user_id: string
          timezone: string | null
          units: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          home_screen?: string | null
          id?: string
          language?: string | null
          meta?: Json
          patient_user_id: string
          timezone?: string | null
          units?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          home_screen?: string | null
          id?: string
          language?: string | null
          meta?: Json
          patient_user_id?: string
          timezone?: string | null
          units?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      patient_bookmarks: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          label: string | null
          meta: Json
          patient_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          label?: string | null
          meta?: Json
          patient_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          label?: string | null
          meta?: Json
          patient_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_chat_messages: {
        Row: {
          attachments: Json
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          meta: Json
          patient_user_id: string
          read_at: string | null
          sender_role: string
          sender_user_id: string | null
          updated_at: string
        }
        Insert: {
          attachments?: Json
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          meta?: Json
          patient_user_id: string
          read_at?: string | null
          sender_role: string
          sender_user_id?: string | null
          updated_at?: string
        }
        Update: {
          attachments?: Json
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          meta?: Json
          patient_user_id?: string
          read_at?: string | null
          sender_role?: string
          sender_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "patient_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_conversations: {
        Row: {
          channel: string
          created_at: string
          id: string
          last_message_at: string | null
          meta: Json
          patient_user_id: string
          status: string
          tenant_id: string | null
          topic: string | null
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          meta?: Json
          patient_user_id: string
          status?: string
          tenant_id?: string | null
          topic?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          meta?: Json
          patient_user_id?: string
          status?: string
          tenant_id?: string | null
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_dashboard_preferences: {
        Row: {
          created_at: string
          hidden_sections: Json
          id: string
          layout: Json
          meta: Json
          patient_user_id: string
          updated_at: string
          widgets: Json
        }
        Insert: {
          created_at?: string
          hidden_sections?: Json
          id?: string
          layout?: Json
          meta?: Json
          patient_user_id: string
          updated_at?: string
          widgets?: Json
        }
        Update: {
          created_at?: string
          hidden_sections?: Json
          id?: string
          layout?: Json
          meta?: Json
          patient_user_id?: string
          updated_at?: string
          widgets?: Json
        }
        Relationships: []
      }
      patient_devices: {
        Row: {
          app_version: string | null
          created_at: string
          device_id: string
          id: string
          is_trusted: boolean
          last_seen_at: string | null
          meta: Json
          model: string | null
          os_version: string | null
          patient_user_id: string
          platform: string
          revoked_at: string | null
          updated_at: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          device_id: string
          id?: string
          is_trusted?: boolean
          last_seen_at?: string | null
          meta?: Json
          model?: string | null
          os_version?: string | null
          patient_user_id: string
          platform: string
          revoked_at?: string | null
          updated_at?: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          device_id?: string
          id?: string
          is_trusted?: boolean
          last_seen_at?: string | null
          meta?: Json
          model?: string | null
          os_version?: string | null
          patient_user_id?: string
          platform?: string
          revoked_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      patient_digital_consents: {
        Row: {
          consent_type: string
          created_at: string
          granted_at: string | null
          id: string
          ip_address: unknown
          meta: Json
          patient_user_id: string
          revoked_at: string | null
          signature: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          version: string
        }
        Insert: {
          consent_type: string
          created_at?: string
          granted_at?: string | null
          id?: string
          ip_address?: unknown
          meta?: Json
          patient_user_id: string
          revoked_at?: string | null
          signature?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          version: string
        }
        Update: {
          consent_type?: string
          created_at?: string
          granted_at?: string | null
          id?: string
          ip_address?: unknown
          meta?: Json
          patient_user_id?: string
          revoked_at?: string | null
          signature?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_digital_consents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_document_folders: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          patient_user_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          patient_user_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          patient_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_document_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "patient_document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_documents: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          document_id: string | null
          folder_id: string | null
          id: string
          is_shared: boolean
          meta: Json
          mime_type: string | null
          patient_user_id: string
          size_bytes: number | null
          storage_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          document_id?: string | null
          folder_id?: string | null
          id?: string
          is_shared?: boolean
          meta?: Json
          mime_type?: string | null
          patient_user_id: string
          size_bytes?: number | null
          storage_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          document_id?: string | null
          folder_id?: string | null
          id?: string
          is_shared?: boolean
          meta?: Json
          mime_type?: string | null
          patient_user_id?: string
          size_bytes?: number | null
          storage_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "patient_document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_email_preferences: {
        Row: {
          created_at: string
          digest_frequency: string | null
          email: string | null
          id: string
          is_verified: boolean
          marketing_opt_in: boolean
          meta: Json
          patient_user_id: string
          transactional_opt_in: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          digest_frequency?: string | null
          email?: string | null
          id?: string
          is_verified?: boolean
          marketing_opt_in?: boolean
          meta?: Json
          patient_user_id: string
          transactional_opt_in?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          digest_frequency?: string | null
          email?: string | null
          id?: string
          is_verified?: boolean
          marketing_opt_in?: boolean
          meta?: Json
          patient_user_id?: string
          transactional_opt_in?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      patient_family_accounts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          meta: Json
          name: string
          primary_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          meta?: Json
          name: string
          primary_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          meta?: Json
          name?: string
          primary_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_family_members: {
        Row: {
          accepted_at: string | null
          can_book: boolean
          can_manage: boolean
          can_pay: boolean
          can_view: boolean
          created_at: string
          display_name: string | null
          family_account_id: string | null
          id: string
          invited_at: string | null
          member_patient_id: string | null
          member_user_id: string | null
          primary_user_id: string
          relationship: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          can_book?: boolean
          can_manage?: boolean
          can_pay?: boolean
          can_view?: boolean
          created_at?: string
          display_name?: string | null
          family_account_id?: string | null
          id?: string
          invited_at?: string | null
          member_patient_id?: string | null
          member_user_id?: string | null
          primary_user_id: string
          relationship: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          can_book?: boolean
          can_manage?: boolean
          can_pay?: boolean
          can_view?: boolean
          created_at?: string
          display_name?: string | null
          family_account_id?: string | null
          id?: string
          invited_at?: string | null
          member_patient_id?: string | null
          member_user_id?: string | null
          primary_user_id?: string
          relationship?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_family_members_family_account_id_fkey"
            columns: ["family_account_id"]
            isOneToOne: false
            referencedRelation: "patient_family_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_family_members_member_patient_id_fkey"
            columns: ["member_patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_favourites: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          meta: Json
          patient_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          meta?: Json
          patient_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          meta?: Json
          patient_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          meta: Json
          patient_user_id: string
          rating: number | null
          sentiment: string | null
          target_id: string | null
          target_type: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          meta?: Json
          patient_user_id: string
          rating?: number | null
          sentiment?: string | null
          target_id?: string | null
          target_type: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          meta?: Json
          patient_user_id?: string
          rating?: number | null
          sentiment?: string | null
          target_id?: string | null
          target_type?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_feedback_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_health_goals: {
        Row: {
          created_at: string
          current_value: number | null
          description: string | null
          goal_type: string
          id: string
          meta: Json
          patient_user_id: string
          progress_pct: number | null
          start_date: string | null
          status: string
          target_date: string | null
          target_unit: string | null
          target_value: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_value?: number | null
          description?: string | null
          goal_type: string
          id?: string
          meta?: Json
          patient_user_id: string
          progress_pct?: number | null
          start_date?: string | null
          status?: string
          target_date?: string | null
          target_unit?: string | null
          target_value?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_value?: number | null
          description?: string | null
          goal_type?: string
          id?: string
          meta?: Json
          patient_user_id?: string
          progress_pct?: number | null
          start_date?: string | null
          status?: string
          target_date?: string | null
          target_unit?: string | null
          target_value?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_health_metrics: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          meta: Json
          metric_code: string
          patient_user_id: string
          recorded_at: string
          source: string | null
          unit: string | null
          updated_at: string
          value: number | null
          value_text: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          meta?: Json
          metric_code: string
          patient_user_id: string
          recorded_at?: string
          source?: string | null
          unit?: string | null
          updated_at?: string
          value?: number | null
          value_text?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          meta?: Json
          metric_code?: string
          patient_user_id?: string
          recorded_at?: string
          source?: string | null
          unit?: string | null
          updated_at?: string
          value?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_health_metrics_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "patient_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_health_passport: {
        Row: {
          allergies: Json
          blood_group: string | null
          chronic_conditions: Json
          created_at: string
          current_medications: Json
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          id: string
          is_active: boolean
          meta: Json
          organ_donor: boolean
          passport_code: string
          patient_user_id: string
          qr_payload: string | null
          updated_at: string
        }
        Insert: {
          allergies?: Json
          blood_group?: string | null
          chronic_conditions?: Json
          created_at?: string
          current_medications?: Json
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          is_active?: boolean
          meta?: Json
          organ_donor?: boolean
          passport_code: string
          patient_user_id: string
          qr_payload?: string | null
          updated_at?: string
        }
        Update: {
          allergies?: Json
          blood_group?: string | null
          chronic_conditions?: Json
          created_at?: string
          current_medications?: Json
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          is_active?: boolean
          meta?: Json
          organ_donor?: boolean
          passport_code?: string
          patient_user_id?: string
          qr_payload?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      patient_insurance: {
        Row: {
          card_media_id: string | null
          created_at: string
          created_by: string | null
          effective_from: string | null
          effective_to: string | null
          group_no: string | null
          id: string
          is_primary: boolean
          member_id: string | null
          meta: Json
          patient_id: string | null
          payer_id: string
          person_id: string
          plan_id: string | null
          policy_no: string
          relationship_to_subscriber: string | null
          status: string
          subscriber_name: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          verification_status: string | null
          verified_at: string | null
        }
        Insert: {
          card_media_id?: string | null
          created_at?: string
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          group_no?: string | null
          id?: string
          is_primary?: boolean
          member_id?: string | null
          meta?: Json
          patient_id?: string | null
          payer_id: string
          person_id: string
          plan_id?: string | null
          policy_no: string
          relationship_to_subscriber?: string | null
          status?: string
          subscriber_name?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          verification_status?: string | null
          verified_at?: string | null
        }
        Update: {
          card_media_id?: string | null
          created_at?: string
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          group_no?: string | null
          id?: string
          is_primary?: boolean
          member_id?: string | null
          meta?: Json
          patient_id?: string | null
          payer_id?: string
          person_id?: string
          plan_id?: string | null
          policy_no?: string
          relationship_to_subscriber?: string | null
          status?: string
          subscriber_name?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          verification_status?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_insurance_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "insurance_payers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_insurance_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "insurance_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_loyalty_accounts: {
        Row: {
          created_at: string
          id: string
          lifetime_earned: number
          lifetime_redeemed: number
          meta: Json
          patient_user_id: string
          points_balance: number
          program_code: string
          status: string
          tenant_id: string | null
          tier: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lifetime_earned?: number
          lifetime_redeemed?: number
          meta?: Json
          patient_user_id: string
          points_balance?: number
          program_code: string
          status?: string
          tenant_id?: string | null
          tier?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lifetime_earned?: number
          lifetime_redeemed?: number
          meta?: Json
          patient_user_id?: string
          points_balance?: number
          program_code?: string
          status?: string
          tenant_id?: string | null
          tier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_loyalty_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_loyalty_transactions: {
        Row: {
          account_id: string
          balance_after: number | null
          created_at: string
          direction: string
          id: string
          meta: Json
          note: string | null
          patient_user_id: string
          points: number
          reference_id: string | null
          reference_type: string | null
          source: string
          updated_at: string
        }
        Insert: {
          account_id: string
          balance_after?: number | null
          created_at?: string
          direction: string
          id?: string
          meta?: Json
          note?: string | null
          patient_user_id: string
          points: number
          reference_id?: string | null
          reference_type?: string | null
          source: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          balance_after?: number | null
          created_at?: string
          direction?: string
          id?: string
          meta?: Json
          note?: string | null
          patient_user_id?: string
          points?: number
          reference_id?: string | null
          reference_type?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_loyalty_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "patient_loyalty_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_membership_history: {
        Row: {
          created_at: string
          event: string
          from_status: string | null
          id: string
          membership_id: string
          meta: Json
          note: string | null
          patient_user_id: string
          to_status: string | null
        }
        Insert: {
          created_at?: string
          event: string
          from_status?: string | null
          id?: string
          membership_id: string
          meta?: Json
          note?: string | null
          patient_user_id: string
          to_status?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          from_status?: string | null
          id?: string
          membership_id?: string
          meta?: Json
          note?: string | null
          patient_user_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_membership_history_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "patient_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_memberships: {
        Row: {
          auto_renew: boolean
          created_at: string
          currency: string | null
          expires_at: string | null
          id: string
          meta: Json
          patient_user_id: string
          plan_code: string
          plan_name: string | null
          price: number | null
          started_at: string
          status: string
          tenant_id: string | null
          tier: string | null
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          currency?: string | null
          expires_at?: string | null
          id?: string
          meta?: Json
          patient_user_id: string
          plan_code: string
          plan_name?: string | null
          price?: number | null
          started_at?: string
          status?: string
          tenant_id?: string | null
          tier?: string | null
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          currency?: string | null
          expires_at?: string | null
          id?: string
          meta?: Json
          patient_user_id?: string
          plan_code?: string
          plan_name?: string | null
          price?: number | null
          started_at?: string
          status?: string
          tenant_id?: string | null
          tier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_notification_history: {
        Row: {
          body: string | null
          category: string | null
          channel: string
          clicked_at: string | null
          created_at: string
          delivered_at: string | null
          id: string
          meta: Json
          patient_user_id: string
          read_at: string | null
          reference_id: string | null
          reference_type: string | null
          sent_at: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          category?: string | null
          channel: string
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          meta?: Json
          patient_user_id: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sent_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          category?: string | null
          channel?: string
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          meta?: Json
          patient_user_id?: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sent_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      patient_notification_preferences: {
        Row: {
          category: string
          channel: string
          created_at: string
          enabled: boolean
          id: string
          patient_user_id: string
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string
        }
        Insert: {
          category: string
          channel: string
          created_at?: string
          enabled?: boolean
          id?: string
          patient_user_id: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          channel?: string
          created_at?: string
          enabled?: boolean
          id?: string
          patient_user_id?: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      patient_portal_sessions: {
        Row: {
          created_at: string
          device_id: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          ip_address: unknown
          meta: Json
          patient_user_id: string
          started_at: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          ip_address?: unknown
          meta?: Json
          patient_user_id: string
          started_at?: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          ip_address?: unknown
          meta?: Json
          patient_user_id?: string
          started_at?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_portal_sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "patient_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_preferences: {
        Row: {
          category: string
          created_at: string
          id: string
          key: string
          patient_user_id: string
          updated_at: string
          value: Json
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          key: string
          patient_user_id: string
          updated_at?: string
          value?: Json
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          key?: string
          patient_user_id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      patient_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          created_at: string
          display_name: string | null
          id: string
          last_seen_at: string | null
          locale: string | null
          meta: Json
          onboarded_at: string | null
          onboarding_completed: boolean
          patient_id: string | null
          patient_user_id: string
          person_id: string | null
          tenant_id: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_seen_at?: string | null
          locale?: string | null
          meta?: Json
          onboarded_at?: string | null
          onboarding_completed?: boolean
          patient_id?: string | null
          patient_user_id: string
          person_id?: string | null
          tenant_id?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_seen_at?: string | null
          locale?: string | null
          meta?: Json
          onboarded_at?: string | null
          onboarding_completed?: boolean
          patient_id?: string | null
          patient_user_id?: string
          person_id?: string | null
          tenant_id?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_profiles_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_profiles_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_push_tokens: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          patient_user_id: string
          provider: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          patient_user_id: string
          provider: string
          token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          patient_user_id?: string
          provider?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_relationships: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          patient_user_id: string
          related_patient_id: string | null
          related_user_id: string | null
          relationship: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          patient_user_id: string
          related_patient_id?: string | null
          related_user_id?: string | null
          relationship: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          patient_user_id?: string
          related_patient_id?: string | null
          related_user_id?: string | null
          relationship?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_relationships_related_patient_id_fkey"
            columns: ["related_patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_reward_redemptions: {
        Row: {
          amount_used: number | null
          created_at: string
          fulfilled_at: string | null
          id: string
          loyalty_account_id: string | null
          meta: Json
          patient_user_id: string
          points_used: number
          redeemed_at: string | null
          redemption_code: string | null
          reward_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_used?: number | null
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          loyalty_account_id?: string | null
          meta?: Json
          patient_user_id: string
          points_used?: number
          redeemed_at?: string | null
          redemption_code?: string | null
          reward_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_used?: number | null
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          loyalty_account_id?: string | null
          meta?: Json
          patient_user_id?: string
          points_used?: number
          redeemed_at?: string | null
          redemption_code?: string | null
          reward_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_reward_redemptions_loyalty_account_id_fkey"
            columns: ["loyalty_account_id"]
            isOneToOne: false
            referencedRelation: "patient_loyalty_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "patient_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_rewards: {
        Row: {
          code: string
          cost_amount: number | null
          cost_points: number
          created_at: string
          currency: string | null
          description: string | null
          id: string
          is_active: boolean
          meta: Json
          name: string
          reward_type: string
          stock: number | null
          tenant_id: string | null
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          code: string
          cost_amount?: number | null
          cost_points?: number
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          meta?: Json
          name: string
          reward_type: string
          stock?: number | null
          tenant_id?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          code?: string
          cost_amount?: number | null
          cost_points?: number
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          meta?: Json
          name?: string
          reward_type?: string
          stock?: number | null
          tenant_id?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_rewards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_saved_doctors: {
        Row: {
          created_at: string
          doctor_person_id: string | null
          id: string
          meta: Json
          patient_user_id: string
          saved_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_person_id?: string | null
          id?: string
          meta?: Json
          patient_user_id: string
          saved_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_person_id?: string | null
          id?: string
          meta?: Json
          patient_user_id?: string
          saved_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_saved_doctors_doctor_person_id_fkey"
            columns: ["doctor_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_saved_prescriptions: {
        Row: {
          created_at: string
          id: string
          meta: Json
          notes: string | null
          patient_user_id: string
          prescription_id: string | null
          saved_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          meta?: Json
          notes?: string | null
          patient_user_id: string
          prescription_id?: string | null
          saved_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          meta?: Json
          notes?: string | null
          patient_user_id?: string
          prescription_id?: string | null
          saved_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_saved_prescriptions_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "clinical_prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_saved_reports: {
        Row: {
          created_at: string
          id: string
          meta: Json
          patient_user_id: string
          reference_id: string | null
          report_type: string
          saved_at: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          meta?: Json
          patient_user_id: string
          reference_id?: string | null
          report_type: string
          saved_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          meta?: Json
          patient_user_id?: string
          reference_id?: string | null
          report_type?: string
          saved_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_settings: {
        Row: {
          created_at: string
          id: string
          patient_user_id: string
          settings: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          patient_user_id: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          patient_user_id?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      patient_sms_preferences: {
        Row: {
          created_at: string
          id: string
          is_verified: boolean
          marketing_opt_in: boolean
          meta: Json
          patient_user_id: string
          phone_e164: string | null
          transactional_opt_in: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_verified?: boolean
          marketing_opt_in?: boolean
          meta?: Json
          patient_user_id: string
          phone_e164?: string | null
          transactional_opt_in?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_verified?: boolean
          marketing_opt_in?: boolean
          meta?: Json
          patient_user_id?: string
          phone_e164?: string | null
          transactional_opt_in?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      patient_support_tickets: {
        Row: {
          assigned_to: string | null
          body: string | null
          category: string | null
          created_at: string
          id: string
          meta: Json
          patient_user_id: string
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          body?: string | null
          category?: string | null
          created_at?: string
          id?: string
          meta?: Json
          patient_user_id: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          body?: string | null
          category?: string | null
          created_at?: string
          id?: string
          meta?: Json
          patient_user_id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_support_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_theme_preferences: {
        Row: {
          accent_color: string | null
          created_at: string
          font_scale: number | null
          high_contrast: boolean
          id: string
          meta: Json
          patient_user_id: string
          reduce_motion: boolean
          theme: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          font_scale?: number | null
          high_contrast?: boolean
          id?: string
          meta?: Json
          patient_user_id: string
          reduce_motion?: boolean
          theme?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          font_scale?: number | null
          high_contrast?: boolean
          id?: string
          meta?: Json
          patient_user_id?: string
          reduce_motion?: boolean
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_wallet: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          lifetime_credit: number
          lifetime_debit: number
          meta: Json
          patient_user_id: string
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          lifetime_credit?: number
          lifetime_debit?: number
          meta?: Json
          patient_user_id: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          lifetime_credit?: number
          lifetime_debit?: number
          meta?: Json
          patient_user_id?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_wallet_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_wallet_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          direction: string
          id: string
          meta: Json
          note: string | null
          patient_user_id: string
          reference_id: string | null
          reference_type: string | null
          source: string
          updated_at: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string
          direction: string
          id?: string
          meta?: Json
          note?: string | null
          patient_user_id: string
          reference_id?: string | null
          reference_type?: string | null
          source: string
          updated_at?: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          direction?: string
          id?: string
          meta?: Json
          note?: string | null
          patient_user_id?: string
          reference_id?: string | null
          reference_type?: string | null
          source?: string
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "patient_wallet"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_whatsapp_preferences: {
        Row: {
          created_at: string
          id: string
          is_opted_in: boolean
          meta: Json
          opted_in_at: string | null
          opted_out_at: string | null
          patient_user_id: string
          phone_e164: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_opted_in?: boolean
          meta?: Json
          opted_in_at?: string | null
          opted_out_at?: string | null
          patient_user_id: string
          phone_e164?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_opted_in?: boolean
          meta?: Json
          opted_in_at?: string | null
          opted_out_at?: string | null
          patient_user_id?: string
          phone_e164?: string | null
          updated_at?: string
        }
        Relationships: []
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
      payment_allocations: {
        Row: {
          amount: number
          created_at: string
          credit_note_id: string | null
          id: string
          invoice_id: string | null
          payment_id: string
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credit_note_id?: string | null
          id?: string
          invoice_id?: string | null
          payment_id: string
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_note_id?: string | null
          id?: string
          invoice_id?: string | null
          payment_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_credit_note_id_fkey"
            columns: ["credit_note_id"]
            isOneToOne: false
            referencedRelation: "credit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          external_ref: string | null
          id: string
          meta: Json
          method: string
          notes: string | null
          patient_id: string | null
          payment_no: string
          person_id: string | null
          provider: string | null
          received_at: string
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          external_ref?: string | null
          id?: string
          meta?: Json
          method: string
          notes?: string | null
          patient_id?: string | null
          payment_no: string
          person_id?: string | null
          provider?: string | null
          received_at?: string
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          external_ref?: string | null
          id?: string
          meta?: Json
          method?: string
          notes?: string | null
          patient_id?: string | null
          payment_no?: string
          person_id?: string | null
          provider?: string | null
          received_at?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
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
      pharmacy_batches: {
        Row: {
          batch_no: string
          cost_price: number | null
          created_at: string
          created_by: string | null
          drug_id: string
          expiry_date: string
          gst_percent: number | null
          hsn_code: string | null
          id: string
          is_quarantined: boolean
          is_recalled: boolean
          lot_no: string | null
          manufacture_date: string | null
          manufacturer: string | null
          meta: Json
          mrp: number | null
          quarantine_reason: string | null
          recall_id: string | null
          supplier_id: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          batch_no: string
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
          drug_id: string
          expiry_date: string
          gst_percent?: number | null
          hsn_code?: string | null
          id?: string
          is_quarantined?: boolean
          is_recalled?: boolean
          lot_no?: string | null
          manufacture_date?: string | null
          manufacturer?: string | null
          meta?: Json
          mrp?: number | null
          quarantine_reason?: string | null
          recall_id?: string | null
          supplier_id?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          batch_no?: string
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
          drug_id?: string
          expiry_date?: string
          gst_percent?: number | null
          hsn_code?: string | null
          id?: string
          is_quarantined?: boolean
          is_recalled?: boolean
          lot_no?: string | null
          manufacture_date?: string | null
          manufacturer?: string | null
          meta?: Json
          mrp?: number | null
          quarantine_reason?: string | null
          recall_id?: string | null
          supplier_id?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pharm_batches_recall"
            columns: ["recall_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_drug_recalls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_batches_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_drugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_batches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_coldchain_logs: {
        Row: {
          created_at: string
          created_by: string | null
          device_id: string | null
          excursion_threshold: Json | null
          humidity_percent: number | null
          id: string
          is_excursion: boolean
          location_id: string | null
          meta: Json
          quarantine_triggered: boolean
          reading_at: string
          source: string
          temperature_c: number
          tenant_id: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          device_id?: string | null
          excursion_threshold?: Json | null
          humidity_percent?: number | null
          id?: string
          is_excursion?: boolean
          location_id?: string | null
          meta?: Json
          quarantine_triggered?: boolean
          reading_at?: string
          source?: string
          temperature_c: number
          tenant_id: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          device_id?: string | null
          excursion_threshold?: Json | null
          humidity_percent?: number | null
          id?: string
          is_excursion?: boolean
          location_id?: string | null
          meta?: Json
          quarantine_triggered?: boolean
          reading_at?: string
          source?: string
          temperature_c?: number
          tenant_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_coldchain_logs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_coldchain_logs_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_controlled_register: {
        Row: {
          balance_after: number
          batch_id: string | null
          created_at: string
          created_by: string | null
          discrepancy_flag: boolean
          discrepancy_notes: string | null
          dispensed_by: string | null
          drug_id: string
          entry_type: string
          id: string
          meta: Json
          occurred_at: string
          patient_id: string | null
          prescriber_id: string | null
          quantity_in: number
          quantity_out: number
          reference_id: string | null
          reference_type: string | null
          schedule_code: string
          tenant_id: string
          unit_code: string
          warehouse_id: string
          witness_id: string | null
          witness_signature_ref: string | null
        }
        Insert: {
          balance_after: number
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          discrepancy_flag?: boolean
          discrepancy_notes?: string | null
          dispensed_by?: string | null
          drug_id: string
          entry_type: string
          id?: string
          meta?: Json
          occurred_at?: string
          patient_id?: string | null
          prescriber_id?: string | null
          quantity_in?: number
          quantity_out?: number
          reference_id?: string | null
          reference_type?: string | null
          schedule_code: string
          tenant_id: string
          unit_code: string
          warehouse_id: string
          witness_id?: string | null
          witness_signature_ref?: string | null
        }
        Update: {
          balance_after?: number
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          discrepancy_flag?: boolean
          discrepancy_notes?: string | null
          dispensed_by?: string | null
          drug_id?: string
          entry_type?: string
          id?: string
          meta?: Json
          occurred_at?: string
          patient_id?: string | null
          prescriber_id?: string | null
          quantity_in?: number
          quantity_out?: number
          reference_id?: string | null
          reference_type?: string | null
          schedule_code?: string
          tenant_id?: string
          unit_code?: string
          warehouse_id?: string
          witness_id?: string | null
          witness_signature_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_controlled_register_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_controlled_register_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_drugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_controlled_register_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_controlled_register_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_demand_patterns: {
        Row: {
          baseline: number | null
          created_at: string
          created_by: string | null
          drug_id: string
          id: string
          last_learned_at: string | null
          pattern: Json
          pattern_kind: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          warehouse_id: string | null
        }
        Insert: {
          baseline?: number | null
          created_at?: string
          created_by?: string | null
          drug_id: string
          id?: string
          last_learned_at?: string | null
          pattern?: Json
          pattern_kind: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          warehouse_id?: string | null
        }
        Update: {
          baseline?: number | null
          created_at?: string
          created_by?: string | null
          drug_id?: string
          id?: string
          last_learned_at?: string | null
          pattern?: Json
          pattern_kind?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_demand_patterns_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_drugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_demand_patterns_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_dispense_items: {
        Row: {
          batch_id: string | null
          created_at: string
          created_by: string | null
          dispense_id: string
          drug_id: string
          id: string
          is_controlled: boolean
          kit_id: string | null
          meta: Json
          notes: string | null
          prescription_item_id: string | null
          quantity: number
          substituted_from_drug_id: string | null
          substitution_reason: string | null
          tenant_id: string
          unit_code: string
          unit_price: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          dispense_id: string
          drug_id: string
          id?: string
          is_controlled?: boolean
          kit_id?: string | null
          meta?: Json
          notes?: string | null
          prescription_item_id?: string | null
          quantity: number
          substituted_from_drug_id?: string | null
          substitution_reason?: string | null
          tenant_id: string
          unit_code: string
          unit_price?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          dispense_id?: string
          drug_id?: string
          id?: string
          is_controlled?: boolean
          kit_id?: string | null
          meta?: Json
          notes?: string | null
          prescription_item_id?: string | null
          quantity?: number
          substituted_from_drug_id?: string | null
          substitution_reason?: string | null
          tenant_id?: string
          unit_code?: string
          unit_price?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pharm_disp_items_kit"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_medication_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_dispense_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_dispense_items_dispense_id_fkey"
            columns: ["dispense_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_dispenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_dispense_items_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_drugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_dispense_items_prescription_item_id_fkey"
            columns: ["prescription_item_id"]
            isOneToOne: false
            referencedRelation: "clinical_prescription_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_dispense_items_substituted_from_drug_id_fkey"
            columns: ["substituted_from_drug_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_drugs"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_dispenses: {
        Row: {
          branch_id: string | null
          counselling_notes: string | null
          created_at: string
          created_by: string | null
          dispense_date: string
          dispense_number: string
          dispensed_by: string | null
          encounter_id: string | null
          id: string
          meta: Json
          patient_id: string | null
          patient_signature_ref: string | null
          prescription_id: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          warehouse_id: string
        }
        Insert: {
          branch_id?: string | null
          counselling_notes?: string | null
          created_at?: string
          created_by?: string | null
          dispense_date?: string
          dispense_number: string
          dispensed_by?: string | null
          encounter_id?: string | null
          id?: string
          meta?: Json
          patient_id?: string | null
          patient_signature_ref?: string | null
          prescription_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          warehouse_id: string
        }
        Update: {
          branch_id?: string | null
          counselling_notes?: string | null
          created_at?: string
          created_by?: string | null
          dispense_date?: string
          dispense_number?: string
          dispensed_by?: string | null
          encounter_id?: string | null
          id?: string
          meta?: Json
          patient_id?: string | null
          patient_signature_ref?: string | null
          prescription_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_dispenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_dispenses_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "clinical_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_dispenses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_dispenses_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "clinical_prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_dispenses_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_drug_aliases: {
        Row: {
          alias: string
          alias_type: string
          created_at: string
          created_by: string | null
          drug_id: string
          id: string
          language: string | null
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          alias: string
          alias_type?: string
          created_at?: string
          created_by?: string | null
          drug_id: string
          id?: string
          language?: string | null
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          alias?: string
          alias_type?: string
          created_at?: string
          created_by?: string | null
          drug_id?: string
          id?: string
          language?: string | null
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_drug_aliases_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_drugs"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_drug_recall_items: {
        Row: {
          batch_id: string | null
          batch_no: string | null
          created_at: string
          created_by: string | null
          expiry_from: string | null
          expiry_to: string | null
          id: string
          lot_no: string | null
          meta: Json
          quantity_destroyed: number
          quantity_in_field: number | null
          quantity_returned: number
          recall_id: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          batch_id?: string | null
          batch_no?: string | null
          created_at?: string
          created_by?: string | null
          expiry_from?: string | null
          expiry_to?: string | null
          id?: string
          lot_no?: string | null
          meta?: Json
          quantity_destroyed?: number
          quantity_in_field?: number | null
          quantity_returned?: number
          recall_id: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          batch_id?: string | null
          batch_no?: string | null
          created_at?: string
          created_by?: string | null
          expiry_from?: string | null
          expiry_to?: string | null
          id?: string
          lot_no?: string | null
          meta?: Json
          quantity_destroyed?: number
          quantity_in_field?: number | null
          quantity_returned?: number
          recall_id?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_drug_recall_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_drug_recall_items_recall_id_fkey"
            columns: ["recall_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_drug_recalls"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_drug_recalls: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          drug_id: string | null
          id: string
          initiated_at: string
          manufacturer: string | null
          meta: Json
          reason: string
          recall_class: string | null
          recall_number: string
          regulator_reference: string | null
          scope: Json | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          workflow_run_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          drug_id?: string | null
          id?: string
          initiated_at?: string
          manufacturer?: string | null
          meta?: Json
          reason: string
          recall_class?: string | null
          recall_number: string
          regulator_reference?: string | null
          scope?: Json | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          workflow_run_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          drug_id?: string | null
          id?: string
          initiated_at?: string
          manufacturer?: string | null
          meta?: Json
          reason?: string
          recall_class?: string | null
          recall_number?: string
          regulator_reference?: string | null
          scope?: Json | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          workflow_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_drug_recalls_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_drugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_drug_recalls_workflow_run_id_fkey"
            columns: ["workflow_run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_drugs: {
        Row: {
          atc_code: string | null
          barcode: string | null
          base_unit_code: string
          brand_name: string | null
          category_code: string | null
          clinical_code: string | null
          clinical_code_system_id: string | null
          code: string
          controlled_schedule_code: string | null
          created_at: string
          created_by: string | null
          form_code: string | null
          generic_name: string | null
          hsn_code: string | null
          id: string
          is_active: boolean
          is_cold_chain: boolean
          manufacturer: string | null
          meta: Json
          name: string
          pack_size: number | null
          pack_unit_code: string | null
          requires_prescription: boolean
          storage_condition_code: string | null
          strength: string | null
          strength_unit_code: string | null
          strength_value: number | null
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          atc_code?: string | null
          barcode?: string | null
          base_unit_code: string
          brand_name?: string | null
          category_code?: string | null
          clinical_code?: string | null
          clinical_code_system_id?: string | null
          code: string
          controlled_schedule_code?: string | null
          created_at?: string
          created_by?: string | null
          form_code?: string | null
          generic_name?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          is_cold_chain?: boolean
          manufacturer?: string | null
          meta?: Json
          name: string
          pack_size?: number | null
          pack_unit_code?: string | null
          requires_prescription?: boolean
          storage_condition_code?: string | null
          strength?: string | null
          strength_unit_code?: string | null
          strength_value?: number | null
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          atc_code?: string | null
          barcode?: string | null
          base_unit_code?: string
          brand_name?: string | null
          category_code?: string | null
          clinical_code?: string | null
          clinical_code_system_id?: string | null
          code?: string
          controlled_schedule_code?: string | null
          created_at?: string
          created_by?: string | null
          form_code?: string | null
          generic_name?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          is_cold_chain?: boolean
          manufacturer?: string | null
          meta?: Json
          name?: string
          pack_size?: number | null
          pack_unit_code?: string | null
          requires_prescription?: boolean
          storage_condition_code?: string | null
          strength?: string | null
          strength_unit_code?: string | null
          strength_value?: number | null
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_drugs_clinical_code_system_id_fkey"
            columns: ["clinical_code_system_id"]
            isOneToOne: false
            referencedRelation: "clinical_code_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_goods_receipt_items: {
        Row: {
          batch_id: string | null
          bin_id: string | null
          created_at: string
          created_by: string | null
          drug_id: string
          grn_id: string
          id: string
          location_id: string | null
          meta: Json
          notes: string | null
          po_item_id: string | null
          quantity_received: number
          tenant_id: string
          unit_code: string
          unit_cost: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          batch_id?: string | null
          bin_id?: string | null
          created_at?: string
          created_by?: string | null
          drug_id: string
          grn_id: string
          id?: string
          location_id?: string | null
          meta?: Json
          notes?: string | null
          po_item_id?: string | null
          quantity_received: number
          tenant_id: string
          unit_code: string
          unit_cost?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          batch_id?: string | null
          bin_id?: string | null
          created_at?: string
          created_by?: string | null
          drug_id?: string
          grn_id?: string
          id?: string
          location_id?: string | null
          meta?: Json
          notes?: string | null
          po_item_id?: string | null
          quantity_received?: number
          tenant_id?: string
          unit_code?: string
          unit_cost?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_goods_receipt_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_goods_receipt_items_bin_id_fkey"
            columns: ["bin_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_warehouse_bins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_goods_receipt_items_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_drugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_goods_receipt_items_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_goods_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_goods_receipt_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_goods_receipt_items_po_item_id_fkey"
            columns: ["po_item_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_purchase_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_goods_receipts: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          grn_date: string
          grn_number: string
          id: string
          invoice_date: string | null
          invoice_number: string | null
          meta: Json
          notes: string | null
          po_id: string | null
          posted_at: string | null
          status: string
          supplier_id: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          warehouse_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          grn_date?: string
          grn_number: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          meta?: Json
          notes?: string | null
          po_id?: string | null
          posted_at?: string | null
          status?: string
          supplier_id?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          warehouse_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          grn_date?: string
          grn_number?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          meta?: Json
          notes?: string | null
          po_id?: string | null
          posted_at?: string | null
          status?: string
          supplier_id?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_goods_receipts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_goods_receipts_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_goods_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_goods_receipts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_inventory_forecasts: {
        Row: {
          confidence_lower: number | null
          confidence_upper: number | null
          created_at: string
          created_by: string | null
          drug_id: string
          forecast_from: string
          forecast_to: string
          generated_at: string
          horizon_days: number
          id: string
          inputs: Json
          meta: Json
          model: string | null
          model_version: string | null
          predicted_demand: number
          tenant_id: string
          warehouse_id: string | null
        }
        Insert: {
          confidence_lower?: number | null
          confidence_upper?: number | null
          created_at?: string
          created_by?: string | null
          drug_id: string
          forecast_from: string
          forecast_to: string
          generated_at?: string
          horizon_days: number
          id?: string
          inputs?: Json
          meta?: Json
          model?: string | null
          model_version?: string | null
          predicted_demand: number
          tenant_id: string
          warehouse_id?: string | null
        }
        Update: {
          confidence_lower?: number | null
          confidence_upper?: number | null
          created_at?: string
          created_by?: string | null
          drug_id?: string
          forecast_from?: string
          forecast_to?: string
          generated_at?: string
          horizon_days?: number
          id?: string
          inputs?: Json
          meta?: Json
          model?: string | null
          model_version?: string | null
          predicted_demand?: number
          tenant_id?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_inventory_forecasts_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_drugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_inventory_forecasts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_inventory_ledger: {
        Row: {
          actor_id: string | null
          batch_id: string | null
          bin_id: string | null
          correlation_id: string | null
          created_at: string
          drug_id: string
          id: string
          location_id: string | null
          meta: Json
          occurred_at: string
          quantity: number
          reason_code: string | null
          reverses_id: string | null
          source_id: string | null
          source_type: string
          tenant_id: string
          unit_code: string
          warehouse_id: string
        }
        Insert: {
          actor_id?: string | null
          batch_id?: string | null
          bin_id?: string | null
          correlation_id?: string | null
          created_at?: string
          drug_id: string
          id?: string
          location_id?: string | null
          meta?: Json
          occurred_at?: string
          quantity: number
          reason_code?: string | null
          reverses_id?: string | null
          source_id?: string | null
          source_type: string
          tenant_id: string
          unit_code: string
          warehouse_id: string
        }
        Update: {
          actor_id?: string | null
          batch_id?: string | null
          bin_id?: string | null
          correlation_id?: string | null
          created_at?: string
          drug_id?: string
          id?: string
          location_id?: string | null
          meta?: Json
          occurred_at?: string
          quantity?: number
          reason_code?: string | null
          reverses_id?: string | null
          source_id?: string | null
          source_type?: string
          tenant_id?: string
          unit_code?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_inventory_ledger_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_inventory_ledger_bin_id_fkey"
            columns: ["bin_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_warehouse_bins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_inventory_ledger_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_drugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_inventory_ledger_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_inventory_ledger_reverses_id_fkey"
            columns: ["reverses_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_inventory_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_inventory_ledger_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_medication_kit_items: {
        Row: {
          created_at: string
          created_by: string | null
          drug_id: string
          id: string
          is_mandatory: boolean
          is_substitutable: boolean
          kit_id: string
          meta: Json
          notes: string | null
          quantity: number
          tenant_id: string
          unit_code: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          drug_id: string
          id?: string
          is_mandatory?: boolean
          is_substitutable?: boolean
          kit_id: string
          meta?: Json
          notes?: string | null
          quantity: number
          tenant_id: string
          unit_code: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          drug_id?: string
          id?: string
          is_mandatory?: boolean
          is_substitutable?: boolean
          kit_id?: string
          meta?: Json
          notes?: string | null
          quantity?: number
          tenant_id?: string
          unit_code?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_medication_kit_items_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_drugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_medication_kit_items_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_medication_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_medication_kits: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          meta: Json
          name: string
          service_id: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          meta?: Json
          name: string
          service_id?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          meta?: Json
          name?: string
          service_id?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_medication_kits_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_prescription_fills: {
        Row: {
          created_at: string
          created_by: string | null
          dispense_id: string | null
          dispense_item_id: string | null
          fill_number: number
          filled_at: string
          id: string
          meta: Json
          next_refill_due: string | null
          prescription_id: string
          prescription_item_id: string | null
          quantity_filled: number
          status: string
          tenant_id: string
          unit_code: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dispense_id?: string | null
          dispense_item_id?: string | null
          fill_number?: number
          filled_at?: string
          id?: string
          meta?: Json
          next_refill_due?: string | null
          prescription_id: string
          prescription_item_id?: string | null
          quantity_filled: number
          status?: string
          tenant_id: string
          unit_code: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dispense_id?: string | null
          dispense_item_id?: string | null
          fill_number?: number
          filled_at?: string
          id?: string
          meta?: Json
          next_refill_due?: string | null
          prescription_id?: string
          prescription_item_id?: string | null
          quantity_filled?: number
          status?: string
          tenant_id?: string
          unit_code?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_prescription_fills_dispense_id_fkey"
            columns: ["dispense_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_dispenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_prescription_fills_dispense_item_id_fkey"
            columns: ["dispense_item_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_dispense_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_prescription_fills_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "clinical_prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_prescription_fills_prescription_item_id_fkey"
            columns: ["prescription_item_id"]
            isOneToOne: false
            referencedRelation: "clinical_prescription_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_purchase_order_items: {
        Row: {
          created_at: string
          created_by: string | null
          discount_percent: number | null
          drug_id: string
          id: string
          line_total: number | null
          meta: Json
          notes: string | null
          po_id: string
          quantity_ordered: number
          quantity_received: number
          tax_percent: number | null
          tenant_id: string
          unit_code: string
          unit_price: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          discount_percent?: number | null
          drug_id: string
          id?: string
          line_total?: number | null
          meta?: Json
          notes?: string | null
          po_id: string
          quantity_ordered: number
          quantity_received?: number
          tax_percent?: number | null
          tenant_id: string
          unit_code: string
          unit_price?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          discount_percent?: number | null
          drug_id?: string
          id?: string
          line_total?: number | null
          meta?: Json
          notes?: string | null
          po_id?: string
          quantity_ordered?: number
          quantity_received?: number
          tax_percent?: number | null
          tenant_id?: string
          unit_code?: string
          unit_price?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_purchase_order_items_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_drugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_purchase_orders: {
        Row: {
          approval_request_id: string | null
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          discount_total: number | null
          expected_date: string | null
          grand_total: number | null
          id: string
          meta: Json
          notes: string | null
          po_date: string
          po_number: string
          sent_at: string | null
          status: string
          subtotal: number | null
          supplier_id: string
          tax_total: number | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          warehouse_id: string | null
        }
        Insert: {
          approval_request_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_total?: number | null
          expected_date?: string | null
          grand_total?: number | null
          id?: string
          meta?: Json
          notes?: string | null
          po_date?: string
          po_number: string
          sent_at?: string | null
          status?: string
          subtotal?: number | null
          supplier_id: string
          tax_total?: number | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          warehouse_id?: string | null
        }
        Update: {
          approval_request_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_total?: number | null
          expected_date?: string | null
          grand_total?: number | null
          id?: string
          meta?: Json
          notes?: string | null
          po_date?: string
          po_number?: string
          sent_at?: string | null
          status?: string
          subtotal?: number | null
          supplier_id?: string
          tax_total?: number | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_purchase_orders_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_purchase_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_purchase_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_return_items: {
        Row: {
          batch_id: string | null
          created_at: string
          created_by: string | null
          disposition: string
          drug_id: string
          id: string
          meta: Json
          notes: string | null
          quantity: number
          return_id: string
          tenant_id: string
          unit_code: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          disposition?: string
          drug_id: string
          id?: string
          meta?: Json
          notes?: string | null
          quantity: number
          return_id: string
          tenant_id: string
          unit_code: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          disposition?: string
          drug_id?: string
          id?: string
          meta?: Json
          notes?: string | null
          quantity?: number
          return_id?: string
          tenant_id?: string
          unit_code?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_return_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_return_items_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_drugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_returns: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          id: string
          meta: Json
          notes: string | null
          patient_id: string | null
          reason_code: string | null
          return_date: string
          return_number: string
          return_type: string
          source_id: string | null
          source_type: string | null
          status: string
          supplier_id: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          warehouse_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          meta?: Json
          notes?: string | null
          patient_id?: string | null
          reason_code?: string | null
          return_date?: string
          return_number: string
          return_type: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          supplier_id?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          warehouse_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          meta?: Json
          notes?: string | null
          patient_id?: string | null
          reason_code?: string | null
          return_date?: string
          return_number?: string
          return_type?: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          supplier_id?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_returns_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_returns_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_returns_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_returns_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_seasonal_forecasts: {
        Row: {
          category_code: string | null
          created_at: string
          created_by: string | null
          drug_id: string | null
          effective_from: string
          effective_to: string
          id: string
          meta: Json
          multiplier: number
          notes: string | null
          season_code: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category_code?: string | null
          created_at?: string
          created_by?: string | null
          drug_id?: string | null
          effective_from: string
          effective_to: string
          id?: string
          meta?: Json
          multiplier?: number
          notes?: string | null
          season_code: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category_code?: string | null
          created_at?: string
          created_by?: string | null
          drug_id?: string | null
          effective_from?: string
          effective_to?: string
          id?: string
          meta?: Json
          multiplier?: number
          notes?: string | null
          season_code?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_seasonal_forecasts_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_drugs"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_stock_on_hand: {
        Row: {
          batch_id: string | null
          bin_id: string | null
          drug_id: string
          id: string
          last_movement_at: string | null
          location_id: string | null
          quantity_on_hand: number
          quantity_reserved: number
          tenant_id: string
          unit_code: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          batch_id?: string | null
          bin_id?: string | null
          drug_id: string
          id?: string
          last_movement_at?: string | null
          location_id?: string | null
          quantity_on_hand?: number
          quantity_reserved?: number
          tenant_id: string
          unit_code: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          batch_id?: string | null
          bin_id?: string | null
          drug_id?: string
          id?: string
          last_movement_at?: string | null
          location_id?: string | null
          quantity_on_hand?: number
          quantity_reserved?: number
          tenant_id?: string
          unit_code?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_stock_on_hand_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_stock_on_hand_bin_id_fkey"
            columns: ["bin_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_warehouse_bins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_stock_on_hand_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_drugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_stock_on_hand_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_stock_on_hand_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_stock_reservations: {
        Row: {
          batch_id: string | null
          created_at: string
          created_by: string | null
          drug_id: string
          expires_at: string | null
          id: string
          meta: Json
          quantity: number
          reserved_for_id: string | null
          reserved_for_type: string
          status: string
          tenant_id: string
          unit_code: string
          updated_at: string
          updated_by: string | null
          warehouse_id: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          drug_id: string
          expires_at?: string | null
          id?: string
          meta?: Json
          quantity: number
          reserved_for_id?: string | null
          reserved_for_type: string
          status?: string
          tenant_id: string
          unit_code: string
          updated_at?: string
          updated_by?: string | null
          warehouse_id: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          drug_id?: string
          expires_at?: string | null
          id?: string
          meta?: Json
          quantity?: number
          reserved_for_id?: string | null
          reserved_for_type?: string
          status?: string
          tenant_id?: string
          unit_code?: string
          updated_at?: string
          updated_by?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_stock_reservations_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_stock_reservations_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_drugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_stock_reservations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_supplier_products: {
        Row: {
          created_at: string
          created_by: string | null
          drug_id: string
          id: string
          is_active: boolean
          is_preferred: boolean
          last_price: number | null
          last_price_at: string | null
          last_price_currency: string | null
          lead_time_days: number | null
          meta: Json
          moq: number | null
          supplier_id: string
          supplier_sku: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          drug_id: string
          id?: string
          is_active?: boolean
          is_preferred?: boolean
          last_price?: number | null
          last_price_at?: string | null
          last_price_currency?: string | null
          lead_time_days?: number | null
          meta?: Json
          moq?: number | null
          supplier_id: string
          supplier_sku?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          drug_id?: string
          id?: string
          is_active?: boolean
          is_preferred?: boolean
          last_price?: number | null
          last_price_at?: string | null
          last_price_currency?: string | null
          lead_time_days?: number | null
          meta?: Json
          moq?: number | null
          supplier_id?: string
          supplier_sku?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_supplier_products_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_drugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_suppliers: {
        Row: {
          address: Json | null
          code: string
          company_id: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          drug_license_no: string | null
          email: string | null
          gstin: string | null
          id: string
          is_active: boolean
          lead_time_days: number | null
          legal_name: string | null
          meta: Json
          name: string
          payment_terms: string | null
          phone: string | null
          supplier_score: number | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: Json | null
          code: string
          company_id?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          drug_license_no?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number | null
          legal_name?: string | null
          meta?: Json
          name: string
          payment_terms?: string | null
          phone?: string | null
          supplier_score?: number | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: Json | null
          code?: string
          company_id?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          drug_license_no?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number | null
          legal_name?: string | null
          meta?: Json
          name?: string
          payment_terms?: string | null
          phone?: string | null
          supplier_score?: number | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_transfer_items: {
        Row: {
          batch_id: string | null
          created_at: string
          created_by: string | null
          drug_id: string
          id: string
          meta: Json
          quantity: number
          tenant_id: string
          transfer_id: string
          unit_code: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          drug_id: string
          id?: string
          meta?: Json
          quantity: number
          tenant_id: string
          transfer_id: string
          unit_code: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          drug_id?: string
          id?: string
          meta?: Json
          quantity?: number
          tenant_id?: string
          transfer_id?: string
          unit_code?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_transfer_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_transfer_items_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_drugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_transfers: {
        Row: {
          created_at: string
          created_by: string | null
          from_warehouse_id: string
          id: string
          meta: Json
          notes: string | null
          received_at: string | null
          shipped_at: string | null
          status: string
          tenant_id: string
          to_warehouse_id: string
          transfer_date: string
          transfer_number: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_warehouse_id: string
          id?: string
          meta?: Json
          notes?: string | null
          received_at?: string | null
          shipped_at?: string | null
          status?: string
          tenant_id: string
          to_warehouse_id: string
          transfer_date?: string
          transfer_number: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_warehouse_id?: string
          id?: string
          meta?: Json
          notes?: string | null
          received_at?: string | null
          shipped_at?: string | null
          status?: string
          tenant_id?: string
          to_warehouse_id?: string
          transfer_date?: string
          transfer_number?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_warehouse_bins: {
        Row: {
          bin: string | null
          capacity: number | null
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          location_id: string | null
          meta: Json
          rack: string | null
          shelf: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          warehouse_id: string
        }
        Insert: {
          bin?: string | null
          capacity?: number | null
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          location_id?: string | null
          meta?: Json
          rack?: string | null
          shelf?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          warehouse_id: string
        }
        Update: {
          bin?: string | null
          capacity?: number | null
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          location_id?: string | null
          meta?: Json
          rack?: string | null
          shelf?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_warehouse_bins_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_warehouse_bins_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_warehouse_locations: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          location_type: string
          meta: Json
          name: string
          temperature_max_c: number | null
          temperature_min_c: number | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          warehouse_id: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          location_type?: string
          meta?: Json
          name: string
          temperature_max_c?: number | null
          temperature_min_c?: number | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          warehouse_id: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          location_type?: string
          meta?: Json
          name?: string
          temperature_max_c?: number | null
          temperature_min_c?: number | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_warehouse_locations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_warehouses: {
        Row: {
          address: Json | null
          branch_id: string | null
          code: string
          created_at: string
          created_by: string | null
          drug_license_no: string | null
          gstin: string | null
          id: string
          is_active: boolean
          meta: Json
          name: string
          parent_id: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          warehouse_type: string
        }
        Insert: {
          address?: Json | null
          branch_id?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          drug_license_no?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean
          meta?: Json
          name: string
          parent_id?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          warehouse_type: string
        }
        Update: {
          address?: Json | null
          branch_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          drug_license_no?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean
          meta?: Json
          name?: string
          parent_id?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          warehouse_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_warehouses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_warehouses_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_warehouses"
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
      price_book_items: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          id: string
          is_active: boolean
          item_code: string | null
          item_kind: string
          item_name: string
          item_ref_id: string | null
          meta: Json
          price_book_id: string
          tax_rule_id: string | null
          tenant_id: string
          unit_price: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          item_code?: string | null
          item_kind: string
          item_name: string
          item_ref_id?: string | null
          meta?: Json
          price_book_id: string
          tax_rule_id?: string | null
          tenant_id: string
          unit_price?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          item_code?: string | null
          item_kind?: string
          item_name?: string
          item_ref_id?: string | null
          meta?: Json
          price_book_id?: string
          tax_rule_id?: string | null
          tenant_id?: string
          unit_price?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_book_items_price_book_id_fkey"
            columns: ["price_book_id"]
            isOneToOne: false
            referencedRelation: "price_books"
            referencedColumns: ["id"]
          },
        ]
      }
      price_books: {
        Row: {
          branch_id: string | null
          code: string
          created_at: string
          created_by: string | null
          currency: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          notes: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          branch_id?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          notes?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          branch_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          notes?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          valid_to?: string | null
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
      queue_tokens: {
        Row: {
          appointment_id: string | null
          called_at: string | null
          completed_at: string | null
          created_at: string
          expected_wait_minutes: number | null
          id: string
          issued_at: string
          meta: Json
          person_id: string | null
          priority: number
          queue_id: string
          served_at: string | null
          status: string
          tenant_id: string
          token_label: string
          token_number: number
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          called_at?: string | null
          completed_at?: string | null
          created_at?: string
          expected_wait_minutes?: number | null
          id?: string
          issued_at?: string
          meta?: Json
          person_id?: string | null
          priority?: number
          queue_id: string
          served_at?: string | null
          status?: string
          tenant_id: string
          token_label: string
          token_number: number
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          called_at?: string | null
          completed_at?: string | null
          created_at?: string
          expected_wait_minutes?: number | null
          id?: string
          issued_at?: string
          meta?: Json
          person_id?: string | null
          priority?: number
          queue_id?: string
          served_at?: string | null
          status?: string
          tenant_id?: string
          token_label?: string
          token_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_tokens_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_tokens_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_tokens_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "appointment_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rad_body_parts: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          laterality_supported: boolean
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          laterality_supported?: boolean
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          laterality_supported?: boolean
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rad_image_metadata: {
        Row: {
          cols: number | null
          created_at: string
          frame_count: number | null
          id: string
          instance_uid: string | null
          meta: Json
          rows: number | null
          series_uid: string | null
          sop_class_uid: string | null
          storage_url: string | null
          study_id: string
          tenant_id: string
        }
        Insert: {
          cols?: number | null
          created_at?: string
          frame_count?: number | null
          id?: string
          instance_uid?: string | null
          meta?: Json
          rows?: number | null
          series_uid?: string | null
          sop_class_uid?: string | null
          storage_url?: string | null
          study_id: string
          tenant_id: string
        }
        Update: {
          cols?: number | null
          created_at?: string
          frame_count?: number | null
          id?: string
          instance_uid?: string | null
          meta?: Json
          rows?: number | null
          series_uid?: string | null
          sop_class_uid?: string | null
          storage_url?: string | null
          study_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rad_image_metadata_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "rad_imaging_studies"
            referencedColumns: ["id"]
          },
        ]
      }
      rad_imaging_studies: {
        Row: {
          accession_no: string | null
          attachments: Json
          branch_id: string | null
          created_at: string
          created_by: string | null
          id: string
          impression: string | null
          meta: Json
          modality_code: string | null
          performed_at: string | null
          performed_by: string | null
          rad_order_id: string | null
          radiologist_id: string | null
          report_text: string | null
          reported_at: string | null
          status: string
          study_uid: string | null
          technologist_id: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accession_no?: string | null
          attachments?: Json
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          impression?: string | null
          meta?: Json
          modality_code?: string | null
          performed_at?: string | null
          performed_by?: string | null
          rad_order_id?: string | null
          radiologist_id?: string | null
          report_text?: string | null
          reported_at?: string | null
          status?: string
          study_uid?: string | null
          technologist_id?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accession_no?: string | null
          attachments?: Json
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          impression?: string | null
          meta?: Json
          modality_code?: string | null
          performed_at?: string | null
          performed_by?: string | null
          rad_order_id?: string | null
          radiologist_id?: string | null
          report_text?: string | null
          reported_at?: string | null
          status?: string
          study_uid?: string | null
          technologist_id?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rad_imaging_studies_rad_order_id_fkey"
            columns: ["rad_order_id"]
            isOneToOne: false
            referencedRelation: "rad_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      rad_modalities: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          meta: Json
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          meta?: Json
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          meta?: Json
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rad_orders: {
        Row: {
          authorization_id: string | null
          body_part_id: string | null
          branch_id: string | null
          clinical_history: string | null
          created_at: string
          created_by: string | null
          diagnosis_codes: Json
          encounter_id: string | null
          id: string
          invoice_id: string | null
          laterality: string | null
          meta: Json
          modality_id: string | null
          order_no: string
          ordered_at: string
          ordering_provider_id: string | null
          patient_id: string | null
          person_id: string | null
          priority: string
          scheduled_at: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          authorization_id?: string | null
          body_part_id?: string | null
          branch_id?: string | null
          clinical_history?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis_codes?: Json
          encounter_id?: string | null
          id?: string
          invoice_id?: string | null
          laterality?: string | null
          meta?: Json
          modality_id?: string | null
          order_no: string
          ordered_at?: string
          ordering_provider_id?: string | null
          patient_id?: string | null
          person_id?: string | null
          priority?: string
          scheduled_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          authorization_id?: string | null
          body_part_id?: string | null
          branch_id?: string | null
          clinical_history?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis_codes?: Json
          encounter_id?: string | null
          id?: string
          invoice_id?: string | null
          laterality?: string | null
          meta?: Json
          modality_id?: string | null
          order_no?: string
          ordered_at?: string
          ordering_provider_id?: string | null
          patient_id?: string | null
          person_id?: string | null
          priority?: string
          scheduled_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rad_orders_body_part_id_fkey"
            columns: ["body_part_id"]
            isOneToOne: false
            referencedRelation: "rad_body_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rad_orders_modality_id_fkey"
            columns: ["modality_id"]
            isOneToOne: false
            referencedRelation: "rad_modalities"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_allocations: {
        Row: {
          amount: number
          created_at: string
          credit_note_id: string | null
          id: string
          invoice_id: string | null
          refund_id: string
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credit_note_id?: string | null
          id?: string
          invoice_id?: string | null
          refund_id: string
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_note_id?: string | null
          id?: string
          invoice_id?: string | null
          refund_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_allocations_credit_note_id_fkey"
            columns: ["credit_note_id"]
            isOneToOne: false
            referencedRelation: "credit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_allocations_refund_id_fkey"
            columns: ["refund_id"]
            isOneToOne: false
            referencedRelation: "refunds"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          approval_request_id: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          external_ref: string | null
          id: string
          meta: Json
          method: string | null
          payment_id: string | null
          processed_at: string | null
          reason: string | null
          refund_no: string
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          approval_request_id?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          external_ref?: string | null
          id?: string
          meta?: Json
          method?: string | null
          payment_id?: string | null
          processed_at?: string | null
          reason?: string | null
          refund_no: string
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          approval_request_id?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          external_ref?: string | null
          id?: string
          meta?: Json
          method?: string | null
          payment_id?: string | null
          processed_at?: string | null
          reason?: string | null
          refund_no?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
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
      resource_breaks: {
        Row: {
          break_date: string | null
          created_at: string
          day_of_week: number | null
          end_time: string
          id: string
          is_active: boolean
          reason: string | null
          resource_id: string
          scope: string
          start_time: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          break_date?: string | null
          created_at?: string
          day_of_week?: number | null
          end_time: string
          id?: string
          is_active?: boolean
          reason?: string | null
          resource_id: string
          scope?: string
          start_time: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          break_date?: string | null
          created_at?: string
          day_of_week?: number | null
          end_time?: string
          id?: string
          is_active?: boolean
          reason?: string | null
          resource_id?: string
          scope?: string
          start_time?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_breaks_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_breaks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_conflict_log: {
        Row: {
          actor: string | null
          appointment_id: string | null
          conflict_type: string
          detail: Json
          detected_at: string
          id: string
          resolution: string | null
          resolved_at: string | null
          resource_id: string
          tenant_id: string
        }
        Insert: {
          actor?: string | null
          appointment_id?: string | null
          conflict_type: string
          detail?: Json
          detected_at?: string
          id?: string
          resolution?: string | null
          resolved_at?: string | null
          resource_id: string
          tenant_id: string
        }
        Update: {
          actor?: string | null
          appointment_id?: string | null
          conflict_type?: string
          detail?: Json
          detected_at?: string
          id?: string
          resolution?: string | null
          resolved_at?: string | null
          resource_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_conflict_log_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_conflict_log_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_conflict_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_group_members: {
        Row: {
          group_id: string
          priority: number
          resource_id: string
          tenant_id: string
        }
        Insert: {
          group_id: string
          priority?: number
          resource_id: string
          tenant_id: string
        }
        Update: {
          group_id?: string
          priority?: number
          resource_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "resource_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_group_members_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_group_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_groups: {
        Row: {
          branch_id: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          resource_kind: string | null
          strategy: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          resource_kind?: string | null
          strategy?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          resource_kind?: string | null
          strategy?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_groups_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_holds: {
        Row: {
          branch_id: string | null
          created_at: string
          ends_at: string
          expires_at: string
          held_by: string | null
          held_for_person_id: string | null
          id: string
          meta: Json
          resource_id: string
          slot_key: string
          starts_at: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          ends_at: string
          expires_at: string
          held_by?: string | null
          held_for_person_id?: string | null
          id?: string
          meta?: Json
          resource_id: string
          slot_key: string
          starts_at: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          ends_at?: string
          expires_at?: string
          held_by?: string | null
          held_for_person_id?: string | null
          id?: string
          meta?: Json
          resource_id?: string
          slot_key?: string
          starts_at?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_holds_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_holds_held_for_person_id_fkey"
            columns: ["held_for_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_holds_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_holds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_leaves: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          ends_at: string
          id: string
          leave_type: string
          reason: string | null
          requested_by: string | null
          resource_id: string
          starts_at: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          ends_at: string
          id?: string
          leave_type?: string
          reason?: string | null
          requested_by?: string | null
          resource_id: string
          starts_at: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          ends_at?: string
          id?: string
          leave_type?: string
          reason?: string | null
          requested_by?: string | null
          resource_id?: string
          starts_at?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_leaves_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_leaves_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_locks: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          meta: Json
          override_allowed: boolean
          reason_code: string
          reason_notes: string | null
          resource_id: string
          starts_at: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          meta?: Json
          override_allowed?: boolean
          reason_code: string
          reason_notes?: string | null
          resource_id: string
          starts_at: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          meta?: Json
          override_allowed?: boolean
          reason_code?: string
          reason_notes?: string | null
          resource_id?: string
          starts_at?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_locks_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_locks_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_locks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          effective_from: string
          effective_to: string | null
          end_time: string
          id: string
          is_active: boolean
          resource_id: string
          slot_size_min: number
          start_time: string
          tenant_id: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          effective_from?: string
          effective_to?: string | null
          end_time: string
          id?: string
          is_active?: boolean
          resource_id: string
          slot_size_min?: number
          start_time: string
          tenant_id: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          effective_from?: string
          effective_to?: string | null
          end_time?: string
          id?: string
          is_active?: boolean
          resource_id?: string
          slot_size_min?: number
          start_time?: string
          tenant_id?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_schedules_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_service_map: {
        Row: {
          appointment_type_id: string
          created_at: string
          id: string
          is_preferred: boolean
          priority: number
          resource_id: string
          tenant_id: string
        }
        Insert: {
          appointment_type_id: string
          created_at?: string
          id?: string
          is_preferred?: boolean
          priority?: number
          resource_id: string
          tenant_id: string
        }
        Update: {
          appointment_type_id?: string
          created_at?: string
          id?: string
          is_preferred?: boolean
          priority?: number
          resource_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_service_map_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_service_map_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_service_map_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_skills: {
        Row: {
          created_at: string
          id: string
          proficiency: number | null
          resource_id: string
          skill_code: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          proficiency?: number | null
          resource_id: string
          skill_code: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          proficiency?: number | null
          resource_id?: string
          skill_code?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_skills_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_skills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          branch_id: string | null
          capacity: number
          code: string
          color: string | null
          created_at: string
          franchise_id: string | null
          home_branch_id: string | null
          id: string
          is_active: boolean
          is_shared: boolean
          meta: Json
          name: string
          org_unit_id: string | null
          person_id: string | null
          resource_kind: string
          tenant_id: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          capacity?: number
          code: string
          color?: string | null
          created_at?: string
          franchise_id?: string | null
          home_branch_id?: string | null
          id?: string
          is_active?: boolean
          is_shared?: boolean
          meta?: Json
          name: string
          org_unit_id?: string | null
          person_id?: string | null
          resource_kind: string
          tenant_id: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          capacity?: number
          code?: string
          color?: string | null
          created_at?: string
          franchise_id?: string | null
          home_branch_id?: string | null
          id?: string
          is_active?: boolean
          is_shared?: boolean
          meta?: Json
          name?: string
          org_unit_id?: string | null
          person_id?: string | null
          resource_kind?: string
          tenant_id?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_home_branch_id_fkey"
            columns: ["home_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_tenant_id_fkey"
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
      scheduling_policies: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          effective_from: string
          effective_to: string | null
          id: string
          is_active: boolean
          meta: Json
          policy_key: string
          policy_value: Json
          scope: string
          scope_id: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean
          meta?: Json
          policy_key: string
          policy_value: Json
          scope?: string
          scope_id?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean
          meta?: Json
          policy_key?: string
          policy_value?: Json
          scope?: string
          scope_id?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_policies_tenant_id_fkey"
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
      service_dependencies: {
        Row: {
          condition_expr: Json
          created_at: string
          depends_on_service_id: string
          id: string
          mandatory_completion: boolean
          max_interval: string | null
          min_interval: string | null
          mode: string
          service_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          condition_expr?: Json
          created_at?: string
          depends_on_service_id: string
          id?: string
          mandatory_completion?: boolean
          max_interval?: string | null
          min_interval?: string | null
          mode?: string
          service_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          condition_expr?: Json
          created_at?: string
          depends_on_service_id?: string
          id?: string
          mandatory_completion?: boolean
          max_interval?: string | null
          min_interval?: string | null
          mode?: string
          service_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_dependencies_depends_on_service_id_fkey"
            columns: ["depends_on_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_dependencies_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_dependencies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_resource_requirements: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          meta: Json
          quantity: number
          required_skills: string[]
          resource_type: string
          service_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          meta?: Json
          quantity?: number
          required_skills?: string[]
          resource_type: string
          service_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          meta?: Json
          quantity?: number
          required_skills?: string[]
          resource_type?: string
          service_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_resource_requirements_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_resource_requirements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_room_requirements: {
        Row: {
          created_at: string
          equipment: string[]
          id: string
          is_required: boolean
          meta: Json
          room_type: string
          service_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          equipment?: string[]
          id?: string
          is_required?: boolean
          meta?: Json
          room_type: string
          service_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          equipment?: string[]
          id?: string
          is_required?: boolean
          meta?: Json
          room_type?: string
          service_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_room_requirements_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_room_requirements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_variants: {
        Row: {
          branch_id: string | null
          code: string
          created_at: string
          currency: string
          duration_minutes: number
          id: string
          is_active: boolean
          meta: Json
          name: string
          price_amount: number | null
          service_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          code: string
          created_at?: string
          currency?: string
          duration_minutes: number
          id?: string
          is_active?: boolean
          meta?: Json
          name: string
          price_amount?: number | null
          service_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          code?: string
          created_at?: string
          currency?: string
          duration_minutes?: number
          id?: string
          is_active?: boolean
          meta?: Json
          name?: string
          price_amount?: number | null
          service_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_variants_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_variants_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_variants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          buffer_after_minutes: number
          buffer_before_minutes: number
          category: string
          clinical_protocol_ref: Json | null
          code: string
          color: string | null
          consent_template_id: string | null
          created_at: string
          created_by: string | null
          default_appointment_type_id: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          meta: Json
          name: string
          pricing_ref: Json
          queue_priority: number
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          category: string
          clinical_protocol_ref?: Json | null
          code: string
          color?: string | null
          consent_template_id?: string | null
          created_at?: string
          created_by?: string | null
          default_appointment_type_id?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          meta?: Json
          name: string
          pricing_ref?: Json
          queue_priority?: number
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          category?: string
          clinical_protocol_ref?: Json | null
          code?: string
          color?: string | null
          consent_template_id?: string | null
          created_at?: string
          created_by?: string | null
          default_appointment_type_id?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          meta?: Json
          name?: string
          pricing_ref?: Json
          queue_priority?: number
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_default_appointment_type_id_fkey"
            columns: ["default_appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_tenant_id_fkey"
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
      slot_cache: {
        Row: {
          appointment_type_id: string | null
          branch_id: string | null
          computed_at: string
          ends_at: string
          hold_id: string | null
          id: string
          resource_id: string
          starts_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          appointment_type_id?: string | null
          branch_id?: string | null
          computed_at?: string
          ends_at: string
          hold_id?: string | null
          id?: string
          resource_id: string
          starts_at: string
          status?: string
          tenant_id: string
        }
        Update: {
          appointment_type_id?: string | null
          branch_id?: string | null
          computed_at?: string
          ends_at?: string
          hold_id?: string | null
          id?: string
          resource_id?: string
          starts_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "slot_cache_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_cache_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_cache_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_cache_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      slot_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          mode: string
          reason: string | null
          resource_id: string
          starts_at: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          mode?: string
          reason?: string | null
          resource_id: string
          starts_at: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          mode?: string
          reason?: string | null
          resource_id?: string
          starts_at?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slot_overrides_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      slot_templates: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          slot_size_min: number
          tenant_id: string
          timezone: string | null
          updated_at: string
          weekly: Json
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slot_size_min?: number
          tenant_id: string
          timezone?: string | null
          updated_at?: string
          weekly?: Json
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slot_size_min?: number
          tenant_id?: string
          timezone?: string | null
          updated_at?: string
          weekly?: Json
        }
        Relationships: [
          {
            foreignKeyName: "slot_templates_tenant_id_fkey"
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
      tax_rates: {
        Row: {
          code: string
          created_at: string
          effective_from: string | null
          effective_to: string | null
          id: string
          is_active: boolean
          is_compound: boolean
          jurisdiction: string
          meta: Json
          name: string
          rate_percent: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean
          is_compound?: boolean
          jurisdiction?: string
          meta?: Json
          name: string
          rate_percent?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean
          is_compound?: boolean
          jurisdiction?: string
          meta?: Json
          name?: string
          rate_percent?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tax_rules: {
        Row: {
          code: string
          components: Json
          created_at: string
          created_by: string | null
          hsn_sac: string | null
          id: string
          is_active: boolean
          name: string
          place_of_supply: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          components?: Json
          created_at?: string
          created_by?: string | null
          hsn_sac?: string | null
          id?: string
          is_active?: boolean
          name: string
          place_of_supply?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          components?: Json
          created_at?: string
          created_by?: string | null
          hsn_sac?: string | null
          id?: string
          is_active?: boolean
          name?: string
          place_of_supply?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
      waitlist_offers: {
        Row: {
          appointment_id: string | null
          candidate_branch_id: string | null
          candidate_resource_id: string | null
          candidate_service_id: string | null
          candidate_starts_at: string
          created_at: string
          expires_at: string
          id: string
          meta: Json
          offered_at: string
          responded_at: string | null
          response_channel: string | null
          status: string
          tenant_id: string
          updated_at: string
          waitlist_id: string
        }
        Insert: {
          appointment_id?: string | null
          candidate_branch_id?: string | null
          candidate_resource_id?: string | null
          candidate_service_id?: string | null
          candidate_starts_at: string
          created_at?: string
          expires_at: string
          id?: string
          meta?: Json
          offered_at?: string
          responded_at?: string | null
          response_channel?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          waitlist_id: string
        }
        Update: {
          appointment_id?: string | null
          candidate_branch_id?: string | null
          candidate_resource_id?: string | null
          candidate_service_id?: string | null
          candidate_starts_at?: string
          created_at?: string
          expires_at?: string
          id?: string
          meta?: Json
          offered_at?: string
          responded_at?: string | null
          response_channel?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          waitlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_offers_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_offers_candidate_branch_id_fkey"
            columns: ["candidate_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_offers_candidate_resource_id_fkey"
            columns: ["candidate_resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_offers_candidate_service_id_fkey"
            columns: ["candidate_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_offers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_offers_waitlist_id_fkey"
            columns: ["waitlist_id"]
            isOneToOne: false
            referencedRelation: "appointment_waitlist"
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
      can_approve_purchase: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_dispense_controlled: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_issue_invoice: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_clinical_knowledge: {
        Args: { _tenant: string; _user: string }
        Returns: boolean
      }
      can_manage_cms: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_family: { Args: { _primary_user: string }; Returns: boolean }
      can_manage_membership: { Args: { _row_user: string }; Returns: boolean }
      can_manage_pathology: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_qc: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_radiology: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_wallet: { Args: { _row_user: string }; Returns: boolean }
      can_post_remittance: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_process_refund: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_read_billing: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_read_clinical: {
        Args: { _tenant: string; _user: string }
        Returns: boolean
      }
      can_read_insurance: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_read_lab: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_read_patient_portal: {
        Args: { _row_user: string; _tenant: string }
        Returns: boolean
      }
      can_read_pharmacy: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_record_payment: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_release_results: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_reveal_super_admin: { Args: { _viewer: string }; Returns: boolean }
      can_submit_claim: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_verify_results: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_write_billing: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_write_clinical: {
        Args: { _tenant: string; _user: string }
        Returns: boolean
      }
      can_write_insurance: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_write_lab: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_write_patient_portal: {
        Args: { _row_user: string; _tenant: string }
        Returns: boolean
      }
      can_write_pharmacy: {
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
      fin_next_sequence: {
        Args: { _kind: string; _tenant: string }
        Returns: string
      }
      has_any_role_code: {
        Args: { _roles: string[]; _tenant_id: string }
        Returns: boolean
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
      is_super_admin_target: {
        Args: { _target_user_id: string }
        Returns: boolean
      }
      is_tenant_member: { Args: { _tenant_id: string }; Returns: boolean }
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
