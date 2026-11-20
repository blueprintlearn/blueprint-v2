
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "blueprint_guided_companies": {
                  Row: {
                    "company_id": string,"created_at": string
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "blueprint_guided_companies_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"companies": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"company_applicant_auditions": {
                  Row: {
                    "applicant_id": string,"application_id": string,"company_id": string,"completed_at": string | null,"created_at": string,"created_by": string,"description": string | null,"evaluator_name": string | null,"id": string,"location_or_format": string | null,"notes": string | null,"scheduled_at": string | null,"skill_ratings": NonNullable<Json>,"skills": NonNullable<Json>,"status": string,"title": string,"updated_at": string,"updated_by": string
                  }
                  Insert: {
                    "applicant_id": string,"application_id": string,"company_id": string,"completed_at"?: string | null,"created_at"?: string,"created_by": string,"description"?: string | null,"evaluator_name"?: string | null,"id"?: string,"location_or_format"?: string | null,"notes"?: string | null,"scheduled_at"?: string | null,"skill_ratings": NonNullable<Json>,"skills": NonNullable<Json>,"status": string,"title": string,"updated_at"?: string,"updated_by": string
                  }
                  Update: {
                    "applicant_id"?: string,"application_id"?: string,"company_id"?: string,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string,"description"?: string | null,"evaluator_name"?: string | null,"id"?: string,"location_or_format"?: string | null,"notes"?: string | null,"scheduled_at"?: string | null,"skill_ratings"?: NonNullable<Json>,"skills"?: NonNullable<Json>,"status"?: string,"title"?: string,"updated_at"?: string,"updated_by"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_applicant_auditions_applicant_id_fkey"
      columns: ["applicant_id"]
isOneToOne: false
      referencedRelation: "company_applicants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_applicant_auditions_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "company_applications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_applicant_auditions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_applicant_conversations": {
                  Row: {
                    "applicant_id": string,"application_id": string,"company_id": string,"completed_at": string | null,"conversation_type": string,"created_at": string,"created_by": string,"id": string,"next_action": string | null,"notes": string | null,"person_responsible": string | null,"planned_at": string | null,"status": string,"updated_at": string,"updated_by": string
                  }
                  Insert: {
                    "applicant_id": string,"application_id": string,"company_id": string,"completed_at"?: string | null,"conversation_type": string,"created_at"?: string,"created_by": string,"id"?: string,"next_action"?: string | null,"notes"?: string | null,"person_responsible"?: string | null,"planned_at"?: string | null,"status": string,"updated_at"?: string,"updated_by": string
                  }
                  Update: {
                    "applicant_id"?: string,"application_id"?: string,"company_id"?: string,"completed_at"?: string | null,"conversation_type"?: string,"created_at"?: string,"created_by"?: string,"id"?: string,"next_action"?: string | null,"notes"?: string | null,"person_responsible"?: string | null,"planned_at"?: string | null,"status"?: string,"updated_at"?: string,"updated_by"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_applicant_conversations_applicant_id_fkey"
      columns: ["applicant_id"]
isOneToOne: false
      referencedRelation: "company_applicants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_applicant_conversations_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "company_applications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_applicant_conversations_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_applicant_decisions": {
                  Row: {
                    "applicant_id": string,"application_id": string,"company_id": string,"created_at": string,"created_by": string,"decision": string,"from_stage": string | null,"id": string,"reason": string | null,"to_stage": string
                  }
                  Insert: {
                    "applicant_id": string,"application_id": string,"company_id": string,"created_at"?: string,"created_by": string,"decision": string,"from_stage"?: string | null,"id"?: string,"reason"?: string | null,"to_stage": string
                  }
                  Update: {
                    "applicant_id"?: string,"application_id"?: string,"company_id"?: string,"created_at"?: string,"created_by"?: string,"decision"?: string,"from_stage"?: string | null,"id"?: string,"reason"?: string | null,"to_stage"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_applicant_decisions_applicant_id_fkey"
      columns: ["applicant_id"]
isOneToOne: false
      referencedRelation: "company_applicants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_applicant_decisions_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "company_applications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_applicant_decisions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_applicant_evaluations": {
                  Row: {
                    "applicant_id": string,"application_id": string,"categories": NonNullable<Json>,"company_id": string,"completed_at": string | null,"created_at": string,"id": string,"ratings": NonNullable<Json>,"updated_at": string,"updated_by": string
                  }
                  Insert: {
                    "applicant_id": string,"application_id": string,"categories": NonNullable<Json>,"company_id": string,"completed_at"?: string | null,"created_at"?: string,"id"?: string,"ratings": NonNullable<Json>,"updated_at"?: string,"updated_by": string
                  }
                  Update: {
                    "applicant_id"?: string,"application_id"?: string,"categories"?: NonNullable<Json>,"company_id"?: string,"completed_at"?: string | null,"created_at"?: string,"id"?: string,"ratings"?: NonNullable<Json>,"updated_at"?: string,"updated_by"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_applicant_evaluations_applicant_id_fkey"
      columns: ["applicant_id"]
isOneToOne: false
      referencedRelation: "company_applicants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_applicant_evaluations_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "company_applications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_applicant_evaluations_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_applicant_follow_ups": {
                  Row: {
                    "action": string,"applicant_id": string,"application_id": string,"company_id": string,"created_at": string,"due_on": string | null,"id": string,"status": string,"updated_at": string,"updated_by": string
                  }
                  Insert: {
                    "action": string,"applicant_id": string,"application_id": string,"company_id": string,"created_at"?: string,"due_on"?: string | null,"id"?: string,"status": string,"updated_at"?: string,"updated_by": string
                  }
                  Update: {
                    "action"?: string,"applicant_id"?: string,"application_id"?: string,"company_id"?: string,"created_at"?: string,"due_on"?: string | null,"id"?: string,"status"?: string,"updated_at"?: string,"updated_by"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_applicant_follow_ups_applicant_id_fkey"
      columns: ["applicant_id"]
isOneToOne: false
      referencedRelation: "company_applicants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_applicant_follow_ups_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "company_applications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_applicant_follow_ups_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_applicant_hiring_activities": {
                  Row: {
                    "activity_key": string,"applicant_id": string,"application_id": string,"company_id": string,"completed_at": string | null,"completed_by": string | null,"created_at": string,"id": string,"required": boolean,"skip_reason": string | null,"sort_order": number,"status": string,"title": string,"updated_at": string,"updated_by": string
                  }
                  Insert: {
                    "activity_key": string,"applicant_id": string,"application_id": string,"company_id": string,"completed_at"?: string | null,"completed_by"?: string | null,"created_at"?: string,"id"?: string,"required"?: boolean,"skip_reason"?: string | null,"sort_order": number,"status": string,"title": string,"updated_at"?: string,"updated_by": string
                  }
                  Update: {
                    "activity_key"?: string,"applicant_id"?: string,"application_id"?: string,"company_id"?: string,"completed_at"?: string | null,"completed_by"?: string | null,"created_at"?: string,"id"?: string,"required"?: boolean,"skip_reason"?: string | null,"sort_order"?: number,"status"?: string,"title"?: string,"updated_at"?: string,"updated_by"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_applicant_hiring_activities_applicant_id_fkey"
      columns: ["applicant_id"]
isOneToOne: false
      referencedRelation: "company_applicants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_applicant_hiring_activities_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "company_applications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_applicant_hiring_activities_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_applicant_hiring_outcomes": {
                  Row: {
                    "applicant_id": string,"application_id": string,"company_id": string,"created_at": string,"created_by": string,"decision_id": string | null,"engagement_model": string,"id": string,"intended_role": string,"notes": string | null,"outcome": string,"planned_start_date": string | null
                  }
                  Insert: {
                    "applicant_id": string,"application_id": string,"company_id": string,"created_at"?: string,"created_by": string,"decision_id"?: string | null,"engagement_model": string,"id"?: string,"intended_role": string,"notes"?: string | null,"outcome": string,"planned_start_date"?: string | null
                  }
                  Update: {
                    "applicant_id"?: string,"application_id"?: string,"company_id"?: string,"created_at"?: string,"created_by"?: string,"decision_id"?: string | null,"engagement_model"?: string,"id"?: string,"intended_role"?: string,"notes"?: string | null,"outcome"?: string,"planned_start_date"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_applicant_hiring_outcomes_applicant_id_fkey"
      columns: ["applicant_id"]
isOneToOne: false
      referencedRelation: "company_applicants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_applicant_hiring_outcomes_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "company_applications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_applicant_hiring_outcomes_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_applicant_hiring_outcomes_decision_id_fkey"
      columns: ["decision_id"]
isOneToOne: false
      referencedRelation: "company_applicant_decisions"
      referencedColumns: ["id"]
    }
                  ]
                },"company_applicant_hiring_paths": {
                  Row: {
                    "applicant_id": string,"application_id": string,"company_id": string,"created_at": string,"id": string,"path_kind": string,"updated_at": string,"updated_by": string
                  }
                  Insert: {
                    "applicant_id": string,"application_id": string,"company_id": string,"created_at"?: string,"id"?: string,"path_kind": string,"updated_at"?: string,"updated_by": string
                  }
                  Update: {
                    "applicant_id"?: string,"application_id"?: string,"company_id"?: string,"created_at"?: string,"id"?: string,"path_kind"?: string,"updated_at"?: string,"updated_by"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_applicant_hiring_paths_applicant_id_fkey"
      columns: ["applicant_id"]
isOneToOne: false
      referencedRelation: "company_applicants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_applicant_hiring_paths_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "company_applications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_applicant_hiring_paths_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_applicant_notes": {
                  Row: {
                    "applicant_id": string,"application_id": string | null,"body": string,"company_id": string,"created_at": string,"created_by": string,"id": string
                  }
                  Insert: {
                    "applicant_id": string,"application_id"?: string | null,"body": string,"company_id": string,"created_at"?: string,"created_by": string,"id"?: string
                  }
                  Update: {
                    "applicant_id"?: string,"application_id"?: string | null,"body"?: string,"company_id"?: string,"created_at"?: string,"created_by"?: string,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_applicant_notes_applicant_id_fkey"
      columns: ["applicant_id"]
isOneToOne: false
      referencedRelation: "company_applicants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_applicant_notes_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "company_applications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_applicant_notes_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_applicant_stage_events": {
                  Row: {
                    "application_id": string,"changed_at": string,"changed_by": string | null,"company_id": string,"from_stage": string | null,"id": string,"to_stage": string
                  }
                  Insert: {
                    "application_id": string,"changed_at"?: string,"changed_by"?: string | null,"company_id": string,"from_stage"?: string | null,"id"?: string,"to_stage": string
                  }
                  Update: {
                    "application_id"?: string,"changed_at"?: string,"changed_by"?: string | null,"company_id"?: string,"from_stage"?: string | null,"id"?: string,"to_stage"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_applicant_stage_events_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "company_applications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_applicant_stage_events_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_applicant_training_preparations": {
                  Row: {
                    "applicant_id": string,"application_id": string,"approved_at": string | null,"approved_by": string | null,"company_id": string,"created_at": string,"created_by": string,"evidence": NonNullable<Json>,"experience_level": string,"id": string,"intended_role": string,"missing_information": NonNullable<Json>,"owner_notes": string | null,"planned_start_date": string | null,"skills_demonstrated": NonNullable<Json>,"skills_needing_development": NonNullable<Json>,"skills_needing_verification": NonNullable<Json>,"source_outcome_id": string | null,"starting_goals": NonNullable<Json>,"status": string,"suggested_approach": string,"training_approach": string,"updated_at": string,"updated_by": string,"version": number
                  }
                  Insert: {
                    "applicant_id": string,"application_id": string,"approved_at"?: string | null,"approved_by"?: string | null,"company_id": string,"created_at"?: string,"created_by": string,"evidence"?: NonNullable<Json>,"experience_level": string,"id"?: string,"intended_role": string,"missing_information"?: NonNullable<Json>,"owner_notes"?: string | null,"planned_start_date"?: string | null,"skills_demonstrated"?: NonNullable<Json>,"skills_needing_development"?: NonNullable<Json>,"skills_needing_verification"?: NonNullable<Json>,"source_outcome_id"?: string | null,"starting_goals"?: NonNullable<Json>,"status": string,"suggested_approach": string,"training_approach": string,"updated_at"?: string,"updated_by": string,"version": number
                  }
                  Update: {
                    "applicant_id"?: string,"application_id"?: string,"approved_at"?: string | null,"approved_by"?: string | null,"company_id"?: string,"created_at"?: string,"created_by"?: string,"evidence"?: NonNullable<Json>,"experience_level"?: string,"id"?: string,"intended_role"?: string,"missing_information"?: NonNullable<Json>,"owner_notes"?: string | null,"planned_start_date"?: string | null,"skills_demonstrated"?: NonNullable<Json>,"skills_needing_development"?: NonNullable<Json>,"skills_needing_verification"?: NonNullable<Json>,"source_outcome_id"?: string | null,"starting_goals"?: NonNullable<Json>,"status"?: string,"suggested_approach"?: string,"training_approach"?: string,"updated_at"?: string,"updated_by"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_applicant_training_preparations_applicant_id_fkey"
      columns: ["applicant_id"]
isOneToOne: false
      referencedRelation: "company_applicants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_applicant_training_preparations_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "company_applications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_applicant_training_preparations_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_applicant_training_preparations_source_outcome_id_fkey"
      columns: ["source_outcome_id"]
isOneToOne: false
      referencedRelation: "company_applicant_hiring_outcomes"
      referencedColumns: ["id"]
    }
                  ]
                },"company_applicants": {
                  Row: {
                    "company_id": string,"created_at": string,"email": string,"email_normalized": string | null,"first_name": string,"id": string,"last_name": string,"location": string,"phone": string,"updated_at": string
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"email": string,"email_normalized"?: never,"first_name": string,"id"?: string,"last_name": string,"location": string,"phone": string,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"email"?: string,"email_normalized"?: never,"first_name"?: string,"id"?: string,"last_name"?: string,"location"?: string,"phone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_applicants_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_application_attempts": {
                  Row: {
                    "created_at": string,"id": string,"ip_hash": string,"slug": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"ip_hash": string,"slug": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"ip_hash"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"company_applications": {
                  Row: {
                    "answers": NonNullable<Json>,"applicant_id": string,"company_id": string,"created_at": string,"id": string,"idempotency_key": string,"page_version": number,"recruiting_page_id": string,"role_title": string,"slug": string,"source_strategy_id": string | null,"source_strategy_version": number | null,"stage": string,"submitted_at": string,"updated_at": string
                  }
                  Insert: {
                    "answers": NonNullable<Json>,"applicant_id": string,"company_id": string,"created_at"?: string,"id"?: string,"idempotency_key": string,"page_version": number,"recruiting_page_id": string,"role_title": string,"slug": string,"source_strategy_id"?: string | null,"source_strategy_version"?: number | null,"stage": string,"submitted_at"?: string,"updated_at"?: string
                  }
                  Update: {
                    "answers"?: NonNullable<Json>,"applicant_id"?: string,"company_id"?: string,"created_at"?: string,"id"?: string,"idempotency_key"?: string,"page_version"?: number,"recruiting_page_id"?: string,"role_title"?: string,"slug"?: string,"source_strategy_id"?: string | null,"source_strategy_version"?: number | null,"stage"?: string,"submitted_at"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_applications_applicant_id_fkey"
      columns: ["applicant_id"]
isOneToOne: false
      referencedRelation: "company_applicants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_applications_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_blueprint_answers": {
                  Row: {
                    "company_id": string,"created_at": string,"question_key": string,"question_version": number,"state": Database["public"]['Enums']["answer_state"],"updated_at": string,"updated_by": string,"value": Json | null
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"question_key": string,"question_version": number,"state": Database["public"]['Enums']["answer_state"],"updated_at"?: string,"updated_by"?: string,"value"?: Json | null
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"question_key"?: string,"question_version"?: number,"state"?: Database["public"]['Enums']["answer_state"],"updated_at"?: string,"updated_by"?: string,"value"?: Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_blueprint_answers_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_blueprint_progress": {
                  Row: {
                    "company_id": string,"last_question_key": string | null,"last_section": string,"updated_at": string
                  }
                  Insert: {
                    "company_id": string,"last_question_key"?: string | null,"last_section": string,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"last_question_key"?: string | null,"last_section"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_blueprint_progress_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_blueprints": {
                  Row: {
                    "company_id": string,"created_at": string,"owner_goal": Database["public"]['Enums']["owner_goal_code"],"owner_goal_other": string | null,"updated_at": string
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"owner_goal": Database["public"]['Enums']["owner_goal_code"],"owner_goal_other"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"owner_goal"?: Database["public"]['Enums']["owner_goal_code"],"owner_goal_other"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_blueprints_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_evaluation_templates": {
                  Row: {
                    "categories": NonNullable<Json>,"company_id": string,"created_at": string,"id": string,"slug": string,"updated_at": string
                  }
                  Insert: {
                    "categories": NonNullable<Json>,"company_id": string,"created_at"?: string,"id"?: string,"slug": string,"updated_at"?: string
                  }
                  Update: {
                    "categories"?: NonNullable<Json>,"company_id"?: string,"created_at"?: string,"id"?: string,"slug"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_evaluation_templates_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_goals": {
                  Row: {
                    "company_id": string,"created_at": string,"goal": Database["public"]['Enums']["owner_goal_code"],"id": string,"is_primary": boolean,"other_text": string | null,"updated_at": string
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"goal": Database["public"]['Enums']["owner_goal_code"],"id"?: string,"is_primary"?: boolean,"other_text"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"goal"?: Database["public"]['Enums']["owner_goal_code"],"id"?: string,"is_primary"?: boolean,"other_text"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_goals_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_growth_planning": {
                  Row: {
                    "company_id": string,"created_at": string,"inputs": NonNullable<Json>,"recommendation_response": Json | null,"updated_at": string,"updated_by": string
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"inputs"?: NonNullable<Json>,"recommendation_response"?: Json | null,"updated_at"?: string,"updated_by"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"inputs"?: NonNullable<Json>,"recommendation_response"?: Json | null,"updated_at"?: string,"updated_by"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_growth_planning_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_growth_plans": {
                  Row: {
                    "approved_at": string | null,"approved_by": string | null,"company_id": string,"created_at": string,"decisions": NonNullable<Json>,"id": string,"recommended": NonNullable<Json>,"source_fingerprint": string,"status": string,"updated_at": string,"version": number,"warnings": NonNullable<Json>
                  }
                  Insert: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"company_id": string,"created_at"?: string,"decisions": NonNullable<Json>,"id"?: string,"recommended": NonNullable<Json>,"source_fingerprint": string,"status": string,"updated_at"?: string,"version": number,"warnings"?: NonNullable<Json>
                  }
                  Update: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"company_id"?: string,"created_at"?: string,"decisions"?: NonNullable<Json>,"id"?: string,"recommended"?: NonNullable<Json>,"source_fingerprint"?: string,"status"?: string,"updated_at"?: string,"version"?: number,"warnings"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_growth_plans_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_interview_attempts": {
                  Row: {
                    "created_at": string,"id": string,"ip_hash": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"ip_hash": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"ip_hash"?: string
                  }
                  Relationships: [
                    
                  ]
                },"company_interview_templates": {
                  Row: {
                    "company_id": string,"created_at": string,"deadline_days": number,"id": string,"questions": NonNullable<Json>,"retention_days": number,"slug": string,"updated_at": string
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"deadline_days"?: number,"id"?: string,"questions": NonNullable<Json>,"retention_days"?: number,"slug": string,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"deadline_days"?: number,"id"?: string,"questions"?: NonNullable<Json>,"retention_days"?: number,"slug"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_interview_templates_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_memberships": {
                  Row: {
                    "company_id": string,"created_at": string,"id": string,"role": Database["public"]['Enums']["system_role"],"status": string,"user_id": string
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"id"?: string,"role": Database["public"]['Enums']["system_role"],"status"?: string,"user_id": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"id"?: string,"role"?: Database["public"]['Enums']["system_role"],"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_memberships_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_recruiting_pages": {
                  Row: {
                    "ads_content": NonNullable<Json>,"company_id": string,"created_at": string,"id": string,"page_content": NonNullable<Json>,"published_at": string | null,"published_by": string | null,"slug": string,"source_fingerprint": string,"source_strategy_id": string | null,"source_strategy_version": number | null,"status": string,"updated_at": string,"version": number
                  }
                  Insert: {
                    "ads_content": NonNullable<Json>,"company_id": string,"created_at"?: string,"id"?: string,"page_content": NonNullable<Json>,"published_at"?: string | null,"published_by"?: string | null,"slug": string,"source_fingerprint": string,"source_strategy_id"?: string | null,"source_strategy_version"?: number | null,"status": string,"updated_at"?: string,"version": number
                  }
                  Update: {
                    "ads_content"?: NonNullable<Json>,"company_id"?: string,"created_at"?: string,"id"?: string,"page_content"?: NonNullable<Json>,"published_at"?: string | null,"published_by"?: string | null,"slug"?: string,"source_fingerprint"?: string,"source_strategy_id"?: string | null,"source_strategy_version"?: number | null,"status"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_recruiting_pages_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_recruitment_strategies": {
                  Row: {
                    "approved_at": string | null,"approved_by": string | null,"company_id": string,"created_at": string,"decisions": NonNullable<Json>,"id": string,"inputs": NonNullable<Json>,"recommended": NonNullable<Json>,"source_fingerprint": string,"status": string,"updated_at": string,"version": number,"warnings": NonNullable<Json>
                  }
                  Insert: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"company_id": string,"created_at"?: string,"decisions": NonNullable<Json>,"id"?: string,"inputs": NonNullable<Json>,"recommended": NonNullable<Json>,"source_fingerprint": string,"status": string,"updated_at"?: string,"version": number,"warnings"?: NonNullable<Json>
                  }
                  Update: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"company_id"?: string,"created_at"?: string,"decisions"?: NonNullable<Json>,"id"?: string,"inputs"?: NonNullable<Json>,"recommended"?: NonNullable<Json>,"source_fingerprint"?: string,"status"?: string,"updated_at"?: string,"version"?: number,"warnings"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_recruitment_strategies_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_team_today": {
                  Row: {
                    "assistant_only_count": number | null,"company_id": string,"count_basis": Database["public"]['Enums']["team_count_basis"],"count_confirmed_at": string | null,"created_at": string,"current_dj_count": number | null,"desired_confirmed_at": string | null,"desired_count_basis": Database["public"]['Enums']["team_count_basis"],"desired_dj_count": number | null,"earlier_desired_dj_count": number | null,"earlier_dj_count": number | null,"lead_capable_count": number | null,"owner_dj_frequency": Database["public"]['Enums']["owner_dj_frequency"] | null,"updated_at": string
                  }
                  Insert: {
                    "assistant_only_count"?: number | null,"company_id": string,"count_basis"?: Database["public"]['Enums']["team_count_basis"],"count_confirmed_at"?: string | null,"created_at"?: string,"current_dj_count"?: number | null,"desired_confirmed_at"?: string | null,"desired_count_basis"?: Database["public"]['Enums']["team_count_basis"],"desired_dj_count"?: number | null,"earlier_desired_dj_count"?: number | null,"earlier_dj_count"?: number | null,"lead_capable_count"?: number | null,"owner_dj_frequency"?: Database["public"]['Enums']["owner_dj_frequency"] | null,"updated_at"?: string
                  }
                  Update: {
                    "assistant_only_count"?: number | null,"company_id"?: string,"count_basis"?: Database["public"]['Enums']["team_count_basis"],"count_confirmed_at"?: string | null,"created_at"?: string,"current_dj_count"?: number | null,"desired_confirmed_at"?: string | null,"desired_count_basis"?: Database["public"]['Enums']["team_count_basis"],"desired_dj_count"?: number | null,"earlier_desired_dj_count"?: number | null,"earlier_dj_count"?: number | null,"lead_capable_count"?: number | null,"owner_dj_frequency"?: Database["public"]['Enums']["owner_dj_frequency"] | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_team_today_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_training_course_versions": {
                  Row: {
                    "company_id": string,"content": NonNullable<Json>,"course_id": string,"created_at": string,"id": string,"published_at": string | null,"published_by": string | null,"status": string,"updated_at": string,"version": number
                  }
                  Insert: {
                    "company_id": string,"content": NonNullable<Json>,"course_id": string,"created_at"?: string,"id"?: string,"published_at"?: string | null,"published_by"?: string | null,"status": string,"updated_at"?: string,"version": number
                  }
                  Update: {
                    "company_id"?: string,"content"?: NonNullable<Json>,"course_id"?: string,"created_at"?: string,"id"?: string,"published_at"?: string | null,"published_by"?: string | null,"status"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_training_course_versions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_training_course_versions_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "company_training_courses"
      referencedColumns: ["id"]
    }
                  ]
                },"company_training_courses": {
                  Row: {
                    "company_id": string,"created_at": string,"id": string,"legacy_content_version": string | null,"legacy_source_id": string | null,"library_status": string,"origin": string,"source_master_course_id": string | null,"source_master_version": number | null,"title": string,"updated_at": string
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"id"?: string,"legacy_content_version"?: string | null,"legacy_source_id"?: string | null,"library_status"?: string,"origin": string,"source_master_course_id"?: string | null,"source_master_version"?: number | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"id"?: string,"legacy_content_version"?: string | null,"legacy_source_id"?: string | null,"library_status"?: string,"origin"?: string,"source_master_course_id"?: string | null,"source_master_version"?: number | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_training_courses_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_training_courses_source_master_course_id_fkey"
      columns: ["source_master_course_id"]
isOneToOne: false
      referencedRelation: "training_master_courses"
      referencedColumns: ["id"]
    }
                  ]
                },"company_training_enrollments": {
                  Row: {
                    "accepted_at": string | null,"applicant_id": string | null,"application_id": string | null,"assigned_at": string,"assigned_by": string,"cancelled_at": string | null,"cancelled_by": string | null,"company_id": string,"content_title": string,"content_version": number,"course_id": string | null,"created_at": string,"id": string,"invitation_token_hash": string | null,"invite_email": string | null,"path_id": string | null,"preparation_id": string | null,"source": string,"status": string,"target_kind": string,"trainee_user_id": string | null,"updated_at": string
                  }
                  Insert: {
                    "accepted_at"?: string | null,"applicant_id"?: string | null,"application_id"?: string | null,"assigned_at"?: string,"assigned_by": string,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"company_id": string,"content_title": string,"content_version": number,"course_id"?: string | null,"created_at"?: string,"id"?: string,"invitation_token_hash"?: string | null,"invite_email"?: string | null,"path_id"?: string | null,"preparation_id"?: string | null,"source": string,"status": string,"target_kind": string,"trainee_user_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "accepted_at"?: string | null,"applicant_id"?: string | null,"application_id"?: string | null,"assigned_at"?: string,"assigned_by"?: string,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"company_id"?: string,"content_title"?: string,"content_version"?: number,"course_id"?: string | null,"created_at"?: string,"id"?: string,"invitation_token_hash"?: string | null,"invite_email"?: string | null,"path_id"?: string | null,"preparation_id"?: string | null,"source"?: string,"status"?: string,"target_kind"?: string,"trainee_user_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_training_enrollments_applicant_id_fkey"
      columns: ["applicant_id"]
isOneToOne: false
      referencedRelation: "company_applicants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_training_enrollments_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "company_applications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_training_enrollments_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_training_enrollments_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "company_training_courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_training_enrollments_path_id_fkey"
      columns: ["path_id"]
isOneToOne: false
      referencedRelation: "company_training_paths"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_training_enrollments_preparation_id_fkey"
      columns: ["preparation_id"]
isOneToOne: false
      referencedRelation: "company_applicant_training_preparations"
      referencedColumns: ["id"]
    }
                  ]
                },"company_training_path_versions": {
                  Row: {
                    "company_id": string,"content": NonNullable<Json>,"created_at": string,"id": string,"path_id": string,"published_at": string | null,"published_by": string | null,"status": string,"updated_at": string,"version": number
                  }
                  Insert: {
                    "company_id": string,"content": NonNullable<Json>,"created_at"?: string,"id"?: string,"path_id": string,"published_at"?: string | null,"published_by"?: string | null,"status": string,"updated_at"?: string,"version": number
                  }
                  Update: {
                    "company_id"?: string,"content"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"path_id"?: string,"published_at"?: string | null,"published_by"?: string | null,"status"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_training_path_versions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_training_path_versions_path_id_fkey"
      columns: ["path_id"]
isOneToOne: false
      referencedRelation: "company_training_paths"
      referencedColumns: ["id"]
    }
                  ]
                },"company_training_paths": {
                  Row: {
                    "company_id": string,"created_at": string,"id": string,"library_status": string,"title": string,"updated_at": string
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"id"?: string,"library_status"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"id"?: string,"library_status"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_training_paths_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_video_interview_answers": {
                  Row: {
                    "accepted_at": string,"byte_size": number,"company_id": string,"content_type": string,"created_at": string,"duration_ms": number,"id": string,"interview_id": string,"processing_error": string | null,"processing_status": string,"prompt": string,"question_index": number,"storage_path": string,"summary": string | null,"time_limit_seconds": number,"transcript": string | null,"updated_at": string
                  }
                  Insert: {
                    "accepted_at"?: string,"byte_size": number,"company_id": string,"content_type": string,"created_at"?: string,"duration_ms": number,"id"?: string,"interview_id": string,"processing_error"?: string | null,"processing_status"?: string,"prompt": string,"question_index": number,"storage_path": string,"summary"?: string | null,"time_limit_seconds": number,"transcript"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "accepted_at"?: string,"byte_size"?: number,"company_id"?: string,"content_type"?: string,"created_at"?: string,"duration_ms"?: number,"id"?: string,"interview_id"?: string,"processing_error"?: string | null,"processing_status"?: string,"prompt"?: string,"question_index"?: number,"storage_path"?: string,"summary"?: string | null,"time_limit_seconds"?: number,"transcript"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_video_interview_answers_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_video_interview_answers_interview_id_fkey"
      columns: ["interview_id"]
isOneToOne: false
      referencedRelation: "company_video_interviews"
      referencedColumns: ["id"]
    }
                  ]
                },"company_video_interviews": {
                  Row: {
                    "applicant_id": string,"application_id": string,"company_id": string,"created_at": string,"deadline_at": string,"id": string,"invited_at": string,"opened_at": string | null,"overall_summary": string | null,"processed_at": string | null,"processing_attempt": number,"processing_error": string | null,"processing_started_at": string | null,"questions": NonNullable<Json>,"recruiting_page_id": string,"retention_until": string,"slug": string,"started_at": string | null,"status": string,"submitted_at": string | null,"token_hash": string,"updated_at": string
                  }
                  Insert: {
                    "applicant_id": string,"application_id": string,"company_id": string,"created_at"?: string,"deadline_at": string,"id"?: string,"invited_at"?: string,"opened_at"?: string | null,"overall_summary"?: string | null,"processed_at"?: string | null,"processing_attempt"?: number,"processing_error"?: string | null,"processing_started_at"?: string | null,"questions": NonNullable<Json>,"recruiting_page_id": string,"retention_until": string,"slug": string,"started_at"?: string | null,"status": string,"submitted_at"?: string | null,"token_hash": string,"updated_at"?: string
                  }
                  Update: {
                    "applicant_id"?: string,"application_id"?: string,"company_id"?: string,"created_at"?: string,"deadline_at"?: string,"id"?: string,"invited_at"?: string,"opened_at"?: string | null,"overall_summary"?: string | null,"processed_at"?: string | null,"processing_attempt"?: number,"processing_error"?: string | null,"processing_started_at"?: string | null,"questions"?: NonNullable<Json>,"recruiting_page_id"?: string,"retention_until"?: string,"slug"?: string,"started_at"?: string | null,"status"?: string,"submitted_at"?: string | null,"token_hash"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_video_interviews_applicant_id_fkey"
      columns: ["applicant_id"]
isOneToOne: false
      referencedRelation: "company_applicants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_video_interviews_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "company_applications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_video_interviews_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"training_master_course_versions": {
                  Row: {
                    "content": NonNullable<Json>,"course_id": string,"created_at": string,"id": string,"published_at": string | null,"published_by": string | null,"status": string,"updated_at": string,"version": number
                  }
                  Insert: {
                    "content": NonNullable<Json>,"course_id": string,"created_at"?: string,"id"?: string,"published_at"?: string | null,"published_by"?: string | null,"status": string,"updated_at"?: string,"version": number
                  }
                  Update: {
                    "content"?: NonNullable<Json>,"course_id"?: string,"created_at"?: string,"id"?: string,"published_at"?: string | null,"published_by"?: string | null,"status"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "training_master_course_versions_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "training_master_courses"
      referencedColumns: ["id"]
    }
                  ]
                },"training_master_courses": {
                  Row: {
                    "created_at": string,"id": string,"legacy_content_version": string | null,"legacy_source_id": string | null,"title": string,"updated_at": string,"visibility": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"legacy_content_version"?: string | null,"legacy_source_id"?: string | null,"title": string,"updated_at"?: string,"visibility"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"legacy_content_version"?: string | null,"legacy_source_id"?: string | null,"title"?: string,"updated_at"?: string,"visibility"?: string
                  }
                  Relationships: [
                    
                  ]
                },"training_platform_admins": {
                  Row: {
                    "created_at": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_training_invitation":
{ Args: { "p_token_hash": string }; Returns: Json
                           },
"cancel_company_training_enrollment":
{ Args: { "p_enrollment_id": string }; Returns: Json
                           },
"complete_video_interview":
{ Args: { "p_ip_hash": string,"p_token": string }; Returns: Json
                           },
"create_company":
{ Args: { "p_name": string }; Returns: {
              "created_at": string,
"id": string,
"name": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "companies"
        isOneToOne: true
        isSetofReturn: false
      } },
"enroll_company_training":
{ Args: { "p_company_id": string,"p_confirmed"?: boolean,"p_course_id"?: string,"p_invite_email"?: string,"p_path_id"?: string,"p_preparation_id"?: string,"p_source": string,"p_target_kind": string,"p_token_hash"?: string,"p_trainee_user_id"?: string }; Returns: Json
                           },
"expire_stale_video_interviews":
{ Args: { "p_company_id": string }; Returns: number
                           },
"get_published_recruiting_page":
{ Args: { "p_slug": string }; Returns: Json
                           },
"get_training_invitation":
{ Args: { "p_token_hash": string }; Returns: Json
                           },
"import_legacy_master_course":
{ Args: { "p_content": Json,"p_course_id": string,"p_legacy_content_version": string,"p_legacy_source_id": string,"p_published_by": string,"p_title": string,"p_version_id": string }; Returns: string
                           },
"interview_storage_owner_allowed":
{ Args: { "p_name": string }; Returns: boolean
                           },
"interview_storage_upload_allowed":
{ Args: { "p_name": string }; Returns: boolean
                           },
"interview_token_hash":
{ Args: { "p_token": string }; Returns: string
                           },
"invalidate_blueprint_approval":
{ Args: { "p_company_id": string }; Returns: undefined
                           },
"is_guided_blueprint_company":
{ Args: { "p_company_id": string }; Returns: boolean
                           },
"is_guided_company_owner":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_guided_owner_of":
{ Args: { "p_company_id": string }; Returns: boolean
                           },
"is_training_platform_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"list_company_staff_for_training":
{ Args: { "p_company_id": string }; Returns: {
              "email": string,"role": Database["public"]['Enums']["system_role"],"status": string,"user_id": string
            }[]
                           },
"note_interview_attempt":
{ Args: { "p_ip_hash": string }; Returns: boolean
                           },
"open_video_interview":
{ Args: { "p_ip_hash": string,"p_token": string }; Returns: Json
                           },
"publish_training_version":
{ Args: { "p_draft_id": string,"p_kind": string,"p_parent_id": string }; Returns: undefined
                           },
"recruiting_slug_taken":
{ Args: { "p_company_id": string,"p_slug": string }; Returns: boolean
                           },
"regenerate_training_invitation":
{ Args: { "p_enrollment_id": string,"p_token_hash"?: string }; Returns: Json
                           },
"register_video_answer":
{ Args: { "p_byte_size": number,"p_content_type": string,"p_duration_ms": number,"p_ip_hash": string,"p_question_index": number,"p_storage_path": string,"p_token": string }; Returns: Json
                           },
"require_guided_blueprint_company":
{ Args: { "p_company_id": string }; Returns: undefined
                           },
"save_company_goals":
{ Args: { "p_company_id": string,"p_goals": (Database["public"]['Enums']["owner_goal_code"])[],"p_other_text": string,"p_primary": Database["public"]['Enums']["owner_goal_code"] }; Returns: undefined
                           },
"save_team_today_v2":
{ Args: { "p_assistant_only_count"?: number,"p_company_id": string,"p_count_basis"?: Database["public"]['Enums']["team_count_basis"],"p_current_dj_count"?: number,"p_desired_count_basis"?: Database["public"]['Enums']["team_count_basis"],"p_desired_dj_count"?: number,"p_lead_capable_count"?: number,"p_owner_dj_frequency"?: Database["public"]['Enums']["owner_dj_frequency"] }; Returns: undefined
                           },
"submit_recruiting_application":
{ Args: { "p_idempotency_key": string,"p_ip_hash": string,"p_payload": Json,"p_slug": string }; Returns: Json
                           }
          }
          Enums: {
            "answer_state": "answered"|"estimated"|"skipped","owner_dj_frequency": "regularly"|"sometimes"|"no","owner_goal_code": "dj_less"|"stop_djing"|"scale"|"expand"|"improve_quality"|"create_leadership"|"other","system_role": "owner_admin"|"manager"|"trainer_mentor"|"dj_trainee","team_count_basis": "excludes_owner"|"includes_owner"|"unknown"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "answer_state": ["answered", "estimated", "skipped"],"owner_dj_frequency": ["regularly", "sometimes", "no"],"owner_goal_code": ["dj_less", "stop_djing", "scale", "expand", "improve_quality", "create_leadership", "other"],"system_role": ["owner_admin", "manager", "trainer_mentor", "dj_trainee"],"team_count_basis": ["excludes_owner", "includes_owner", "unknown"]
          }
        }
} as const
