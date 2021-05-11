import {useHistory, useParams} from "react-router-dom"
import React, {useEffect, useState, useContext, useCallback} from "react"
import {
  Form,
  InputGroup, FormControl
} from "react-bootstrap"
import _ from 'lodash'

import {useStoreActions, useStoreState} from "easy-peasy";
import Error from "../Error";
import * as yup from "yup";
import {useForm} from "react-hook-form";
import {yupResolver} from "@hookform/resolvers/yup";
import {
  CircularProgress, DialogActions, DialogContent, Card, CardHeader, CardContent,
  Grid, Button, FormGroup, InputAdornment, FormHelperText
} from "@material-ui/core";
import {BasicDialog} from "../Helpers/Dialog";
import Editor from "../Helpers/Editor";
import {Checkbox2, Select2, TextField2} from "../Helpers/Form";

const notYet = <b>This feature isn't yet built, but you can enable it now and I'll notify you when it's available.</b>

const privacies = [{
  k: 'public',
  v: 'Public',
  h: "Any user can join this group. It's listed in the groups directory, and matched to users via Gnothi AI."
}, {
  k: 'matchable',
  v: 'Matchable',
  h: <>Any user can join this group, but they won't see it unless Gnothi AI considers them a good fit based on their journal entries. This is a layer of privacy for sensitive groups, Gnothi strives to find good culture fits.</>
}, {
  k: 'private',
  v: 'Private',
  h: <>Group administrators must manually send invite links to users for them to join this group. {notYet}</>
}]
const privaciesObj = _.keyBy(privacies, 'k')

const perks = [{
  k: 'perk_member',
  v: "Membership",
  h: "You can charge users to join this group, or suggest a donation for membership. Sounds mean, but consider groups who's moderator is donating time to ensure quality attention to its members."
}, {
  k: "perk_entry",
  v: "Journal Feedback",
  h: "You can charge to provide personal feedback on journal entries which members share with the group. Anyone can comment on each others' entries, but perhaps you're an expert in the group's topic and they'd find your feedback particularly valuable. It's on you to keep up with the entries as they're created, but I'll do my best to provide good tooling for the moderators."
}, {
  k: "perk_video",
  v: "Video Sessions",
  h: <>You can charge to run scheduled video sessions with your members. When available, I'll provide scheduling and video tooling. {notYet}</>
}]

const perk_field = yup
  .number()
  .nullable()
  .min(1)
  .transform((value, originalValue) => (String(originalValue).trim() === '' ? null : value))

const groupSchema = yup.object().shape({
  title: yup.string().required(),
  text_short: yup.string().required(),
  text_long: yup.string(),
  privacy: yup.string().required(),
  perk_member: perk_field,
  perk_member_donation: yup.boolean(),
  perk_entry: perk_field,
  perk_entry_donation: yup.boolean(),
  perk_video: perk_field,
  perk_video_donation: yup.boolean(),
})


const defaultForm = {
  title: "",
  text_short: "",
  text_long: "",
  privacy: "public",
  perk_member: null,
  perk_member_donation: false,
  perk_entry: null,
  perk_entry_donation: false,
  perk_video: null,
  perk_video_donation: false,
}

function Perk({form, perk}) {
  return <Grid item xs={12} sm={4}>
    <TextField2
      name={perk.k}
      label={perk.v}
      placeholder="Free"
      type="number"
      form={form}
      InputProps={{
        startAdornment: <InputAdornment position="start">$</InputAdornment>
      }}
    />
    <Checkbox2
      name={`${perk.k}_donation`}
      label="Suggested Donation"
      form={form}
    />
    <FormHelperText>{perk.h}</FormHelperText>
  </Grid>
}

export default function EditGroup({show, close, group=null}) {
  const history = useHistory()
  const emit = useStoreActions(actions => actions.ws.emit)
  const as = useStoreState(s => s.user.as)
  const groupPost = useStoreState(s => s.ws.data['groups/groups/post'])
  const groupPut = useStoreState(s => s.ws.res['groups/group/put'])
  const clear = useStoreActions(a => a.ws.clear)

  const form = useForm({
    defaultValues: group || defaultForm,
    resolver: yupResolver(groupSchema),
  })
  const privacy = form.watch('privacy')

  useEffect(() => {
    return function() {
      clear(['groups/groups/post', 'groups/group/put'])
    }
  }, [])

  useEffect(() => {
    if (groupPost?.id) {
      close()
      history.push("groups/" + groupPost.id)
    }
  }, [groupPost])

  useEffect(() => {
    if (groupPut?.code === 200) {close()}
  }, [groupPut])

  function submit(data) {
    if (group) {
      emit(['groups/group/put', {id: group.id, ...data}])
    } else {
      emit(['groups/groups/post', data])
    }
  }

  const renderButtons = () => {
    if (as) return null
    if (groupPost?.submitting) return <CircularProgress />

    return <>
      <Button size="small" onClick={close}>
        Cancel
      </Button>
      <Button
        color="primary"
        variant="outlined"
        onClick={form.handleSubmit(submit)}
      >Submit
      </Button>
    </>
  }

  const renderForm = () => {
    let short_placeholder = "Short description of your group."
    if (!group) {
      short_placeholder += " You'll be able to add a long description with links, formatting, resources, etc on the next screen."
    }

    return <>
      <form onSubmit={form.handleSubmit(submit)}>
        <Grid container spacing={2} direction='column'>

          <Grid item>
            <TextField2 name='title' label='Title' form={form}/>
          </Grid>

          <Grid item>
            <TextField2
              name='text_short'
              placeholder={short_placeholder}
              label="Short Description"
              minRows={3}
              multiline
              form={form}
            />
          </Grid>

          {group && <Grid item>
            <Editor
              placeholder="Write a description about your group, including any links to relevant material."
              name='text_long'
              form={form}
            />
          </Grid>}

          <Grid item>
            <Select2
              name='privacy'
              label='Privacy'
              options={privacies.map(p => ({value: p.k, label: p.v}))}
              helperText={privaciesObj[privacy].h}
              form={form}
            />

            <Card>
              <CardHeader title="Perks" />
              <CardContent>
                <Grid container spacing={3}>
                  {perks.map(p => <Perk key={p.k} perk={p} form={form} />)}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

        </Grid>
      </form>
    </>
  }

  return <>
    <BasicDialog
      open={show}
      size='xl'
      onClose={close}
      title={group ? "Edit Group" : "Create a Group"}
    >
      <DialogContent>
        {renderForm()}
        <Error action={/groups\/groups\/post/g} codes={[400,401,403,422]}/>
      </DialogContent>

      <DialogActions>
        {renderButtons()}
      </DialogActions>
    </BasicDialog>
  </>
}
