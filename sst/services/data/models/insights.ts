import {Base} from './base'
import {db} from '../db'
import * as S from '@gnothi/schemas'
import {GnothiError} from "../../routes/errors";
import {boolMapToKeys} from '@gnothi/schemas/utils'
// @ts-ignore
import dayjs from "dayjs";
import {Entry} from '@gnothi/schemas/entries'

// prioritize clean-text, worst-case markdown
export function getText (e: Entry): string {
  return e.text_clean || e.text
}
// prioritize summary, worst-case full-text
export function getSummary(e: Entry): string {
  return e.ai_text || getText(e)
}
export function getParas(e: Entry): string[] {
  if (e.text_paras?.length) {
    return e.text_paras
  }
  // TODO text_clean won't have paras, it's clean-join()'d, no paras preserved. This line
  // should be rare though, since text_paras is likely available by now.
  return getText(e).split(/\n+/)
}

export class Insights extends Base {
  async entriesByIds(entry_ids: string[]) {
    return db.executeStatement<S.Entries.Entry>({
      sql: `select text_clean, ai_text, text_paras, text from entries 
        where user_id=:user_id and id in :entry_ids order by created_at asc`,
      parameters: [
        {name: "user_id", typeHint: "UUID", value: {stringValue: this.uid}},
        {name: "entry_ids", typeHint: "UUID", value: {arrayValue: {stringValues: entry_ids}}}
      ]
    })
  }
}
