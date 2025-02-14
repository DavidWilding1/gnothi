import {Stack2} from "./Misc.tsx";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import React, {useMemo} from "react";
import {shallow} from "zustand/shallow";
import {useStore} from "../../data/store";
import {ButtonProps} from '@mui/material/Button'
import {BasicDialog} from "./Dialog.tsx";
import CardContent from "@mui/material/CardContent";
import {create} from "zustand";
import {CREDIT_MINUTES} from "../../../../schemas/users.ts";

const useDialogStore = create<{show: boolean, setShow: (show: boolean) => void}>((set, get) => ({
  show: false,
  setShow: (show: boolean) => set({show}),
}))

function Dialog() {
  const [show, setShow] = useDialogStore(s => [s.show, s.setShow], shallow)
  return <BasicDialog open={show} onClose={() => setShow(false)} size={'sm'}>
    <CardContent>
      <Typography>Users get 10 credits to test-drive Premium. When you activate 1 credit, it is active for {CREDIT_MINUTES} minutes and you can use all generative features. These include summary & themes (dashboard view, and per entry), prompt (chat), next entry suggestion (when starting a new entry), behavior analysis, and more. When the timer runs out, you'll need to use another credit to activate, or upgrade to the Premium plan.</Typography>
    </CardContent>
  </BasicDialog>
}
const dialog = <Dialog />

interface BtnTryGenerative {
  tryLabel: string
  premiumLabel: string | null
  submit: any
  btnProps?: ButtonProps
}
export default function BtnTryGenerative({
  tryLabel,
  premiumLabel,
  submit,
  btnProps={},
}: BtnTryGenerative) {
  const [me, creditActive, creditActivate, setPremium] = useStore(s => [
    s.user?.me,
    s.creditActive,
    s.creditActivate,
    s.modals.setPremium
  ], shallow)
  const setShow = useDialogStore(s => s.setShow)

  function handleSubmit() {
    creditActivate()
    submit()
  }

  const {className, ...btnRest} = btnProps
  const btnProps_: ButtonProps = {
    variant: "contained",
    color: "primary",
    className: className ? `${className} btn-use-credit` : `btn-use-credit`,
    ...btnProps
  }

  if (me?.premium || creditActive) {
    if (!premiumLabel) { return null }
    return <Button
      onClick={submit}
      {...btnProps_}
    >
      {premiumLabel}
    </Button>
  }

  if (me?.credits < 1 && !me?.premium) {
    return <Button
      onClick={() => setPremium(true)}
      {...btnProps_}
    >
      {tryLabel} (0 credits)
    </Button>
  }

  return <>
    <Stack2 direction='column' alignItems="center">
      <Button
        onClick={handleSubmit}
        {...btnProps_}
      >
        {tryLabel} (1 credit)
      </Button>
      <Stack2 direction='row'>
        <Typography variant='body2'>{me?.credits ?? 10} / 10 Credits{creditActive ? " (credit currently active)" : ""}</Typography>
        <Typography
          variant="caption"
          sx={{textDecoration: "underline", cursor: "pointer"}}
          onClick={() => setShow(true)}
        >What's this?</Typography>
      </Stack2>
    </Stack2>
    {dialog}
  </>
}