import {z} from 'zod'

export const Events = z.enum([
  'void',
  'wipe_request',
  'auth_login_request',
  'auth_login_response',
  'auth_register_request',
  'auth_register_response',

  'users_everything_request',
  'users_everything_response',
  'users_list_request',
  'users_list_response',
  'users_people_list_request',
  'users_people_list_response',
  'users_profile_get_request',
  'users_profile_get_response',
  'users_profile_put_request',
  'users_profile_put_response',
  'users_people_post_request',
  'users_people_post_response',
  'users_people_put_request',
  'users_people_put_response',
  'users_therapists_list_request',
  'users_therapists_list_response',
  'users_checkusername_request',
  'users_checkusername_response',
  'users_acknowledge_request',
  'users_timezone_put_request',
  'users_timezone_put_response',

  'entries_list_request',
  'entries_list_response',
  'entries_get_request',
  'entries_get_response',
  'entries_put_request',
  'entries_post_request',
  'entries_upsert_response',
  'entries_upsert_final',
  'entries_delete_request',
  'entries_delete_response',
  'entries_notes_list_request',
  'entries_notes_list_response',
  'entries_notes_post_request',
  'entries_notes_post_response',
  'entries_cache_get_request',
  'entries_cache_get_response',

  'tags_list_request',
  'tags_list_response',
  'tags_post_request',
  'tags_post_response',
  'tags_put_request',
  'tags_put_response',
  'tags_delete_request',
  'tags_delete_response',
  'tags_get_request',
  'tags_get_response',
  'tags_reorder_request',
  'tags_reorder_response',
  'tags_toggle_request',
  'tags_toggle_response',

  'fields_get_request',
  'fields_get_response',
  'fields_list_request',
  'fields_list_response',
  'fields_post_request',
  'fields_post_response',
  'fields_put_request',
  'fields_put_response',
  'fields_entries_post_request',
  'fields_entries_post_response',
  'fields_exclude_request',
  'fields_exclude_response',
  'fields_delete_request',
  'fields_delete_response',
  'fields_history_list_request',
  'fields_history_list_response',
  'fields_entries_list_request',
  'fields_entries_list_response',
  'fields_influencers_list_request',
  'fields_influencers_list_response',
  'fields_entries_hasdupes_request',
  'fields_entries_hasdupes_response',
  'fields_entries_cleardupes_request',
  'fields_entries_cleardupes_response',
  'fields_entries_clear_request',
  'fields_entries_clear_response',

  'groups_list_request',
  'groups_list_response',
  'groups_get_request',
  'groups_get_response',
  'groups_post_request',
  'groups_post_response',
  'groups_put_request',
  'groups_put_response',
  'groups_join_request',
  'groups_join_response',
  'groups_leave_request',
  'groups_leave_response',
  'groups_mine_list_request',
  'groups_mine_list_response',
  'groups_mine_get_request',
  'groups_mine_get_response',
  'groups_messages_list_request',
  'groups_messages_list_response',
  'groups_messages_get_request',
  'groups_messages_get_response',
  'groups_messages_post_request',
  'groups_messages_post_response',
  'groups_members_list_request',
  'groups_members_list_response',
  'groups_members_get_request',
  'groups_members_get_response',
  'groups_members_put_request',
  'groups_members_put_response',
  'groups_members_invite_request',
  'groups_members_invite_response',
  'groups_entries_list_request',
  'groups_entries_list_response',
  'groups_entries_get_request',
  'groups_entries_get_response',
  'groups_enter_request',


  'insights_get_request',
  'insights_get_response',
  'insights_themes_response',
  'insights_books_response',
  'insights_ask_response',
  'insights_summarize_response',
  'insights_books_response',
  'insights_search_response',
  'insights_get_final',
  'insights_prompt_request',
  'insights_prompt_response',

  'insights_books_list_request',
  'insights_books_list_response',
  'insights_books_post_request',
  'insights_books_post_response',
  'insights_books_top_request',
  'insights_books_top_response',

  'shares_ingress_list_request',
  'shares_ingress_list_response',
  'shares_egress_list_request',
  'shares_egress_list_response',
  'shares_post_request',
  'shares_post_response',
  'shares_emailcheck_request',
  'shares_emailcheck_response',

  'notifs_groups_list_request',
  'notifs_groups_list_response',
  'notifs_shares_list_request',
  'notifs_shares_list_response',
  'notifs_notes_list_request',
  'notifs_notes_list_response',

  // responses will be deffered to other routes (fields_list_request, users_list_request)
  'habitica_post_request',
  'habitica_sync_request',
  'habitica_delete_request',
  'habitica_sync_cron',

  'payments_publickey_request',
  'payments_publickey_response',
  'payments_products_request',
  'payments_products_response',
  'payments_paymentintent_request',
  'payments_paymentintent_response',
])
export type Events = z.infer<typeof Events>
