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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_tenant_id: { Args: never; Returns: string }
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
      is_config_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      text2ltree: { Args: { "": string }; Returns: unknown }
    }
    Enums: {
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
