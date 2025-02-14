import {Base} from './base'
import {GnothiError} from "../../routes/errors";
import * as S from '@gnothi/schemas'
import {boolMapToKeys} from '@gnothi/schemas/utils'
// @ts-ignore
import dayjs from "dayjs";
import {db} from "../dbSingleton";
import {CREDIT_MINUTES} from '@gnothi/schemas/users'
import {sql} from "drizzle-orm"
import { and, asc, desc, eq, or } from 'drizzle-orm';
import {users, User} from '../schemas/users'
import {people, Person} from '../schemas/people'
import {shares, sharesUsers, Share} from '../schemas/shares'
import {DB} from "../db";
import {FnContext} from "../../routes/types";
import {Logger} from "../../aws/logs";

/**
 * Each model has its own snooping capabilities, but this snoop() function is the top-level
 * check which determines if the user is snooping, and if so load the snooped user. The only
 * access-check here is if the user can snoop generally (there's a connecting share). Fine-grained
 * permissions are checked later in each model.
 */
export class Users extends Base {
  people?: Person[]
  async snoop(): Promise<Pick<FnContext, 'viewer' | 'snooping'>> {
    // TODO why would vid == share_id? What is share_id? I need to revisit this
    const [db, viewer, share_id] = [this.context.db, this.context.user, this.context.vid]
    const vid = viewer.id
    if (!share_id || vid === share_id) {
      return {snooping: false, viewer: {user: viewer}}
    }

    const res = await db.drizzle.select({
      user: users,
      share: shares
    })
      .from(users)
      .innerJoin(shares, eq(shares.user_id, share_id))
      .innerJoin(sharesUsers, and(
        eq(shares.id, sharesUsers.share_id),
        eq(sharesUsers.obj_id, vid)
      ))
    return {snooping: true, viewer: res[0]}
  }
  
  async lastCheckin() {
    const {db} = this.context
    const res = await db.drizzle.execute(sql`
      select extract(
        epoch FROM (now() - max(updated_at))
      ) / 60 as mins
      from ${users} limit 1
    `)
    return res[0].mins || 99
  }
  
  async tz(userId: string) {
    const {drizzle} = this.context.db
    const res = await drizzle.execute(sql`
      select coalesce(timezone, 'America/Los_Angeles') as tz
      from ${users} where id=${userId}
    `)
    return res[0].tz
  }
  
  async profileToText(): Promise<string> {
    const {drizzle} = this.context.db
    // TODO consider removing this, very old and weird.
    let txt: string = ''
    const profile = this.context.viewer.user
    if (profile.gender) {
      txt += `I am ${profile.gender}. `
    }
    if (profile.orientation && !/straight/i.test(profile.orientation)) {
      txt += `I am ${profile.orientation}. `
    }
    if (profile.bio) {
      txt += profile.bio
    }
    // load cached people if previously-loaded.
    if (!this.people) {
      this.people = await drizzle.select().from(people).where(eq(people.user_id, profile.id)).execute()
    }
    for (const p of this.people) {
      const whose: string = p.relation.split(' ')[0].includes("'") ? '' : 'my ';
      txt += `${p.name} is ${whose}${p.relation}. `;

      if (p.bio) {
        txt += p.bio;
      }

      // if (p.issues) {
      //     txt += `${p.name} has these issues: ${p.issues} `;
      // }
    }
    txt = txt.replace(/\s+/g, ' ');
    // console.log(txt);
    return txt;
  }

  async canGenerative(user: User, useCredit?: boolean): Promise<boolean> {
    // FIXME handle viewer
    if (user.premium) { return true }
    if (user.credits < 0) { return false }

    // They have x minutes to use a credit, across all Generative tasks for that "session"
    // TODO ensure timezone works out ok
    const alreadyActive = user.last_credit && dayjs().diff(dayjs(user.last_credit), 'minute') < CREDIT_MINUTES
    if (alreadyActive) { return true }
    if (!useCredit) { return false }

    // update user inline for downstream tasks of same Lambda call
    user.credits = user.credits - 1
    user.last_credit = new Date()

    await this.context.db.drizzle.update(users)
      .set({credits: user.credits, last_credit: sql`now()`})
      .where(eq(users.id, user.id)).execute()
    // notify of credit usage
    await this.context.handleReq({event: 'users_list_request', data: {}}, this.context)
    Logger.metric({event: "users_usecredit_request", user: user})

    return true
  }
}
