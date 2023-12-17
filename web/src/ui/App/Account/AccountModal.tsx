import {FullScreenDialog} from "../../Components/Dialog.tsx";
import DialogContent from "@mui/material/DialogContent";
import {useStore} from "../../../data/store";
import {shallow} from "zustand/shallow";
import React, {useCallback, useEffect, useState} from "react";

import Premium from "./Premium.tsx"
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import {Auth} from "aws-amplify";

export default function AccountModal() {
  const me = useStore(s => s.user?.me)
  const accountModal = useStore(s => s.modals.account)
  const setAccountModal = useStore(s => s.modals.setAccount)
  const send = useStore(s => s.send)
  const logout = useStore(s => s.logout)
  const userDeleteResponse = useStore((store) => store.res.users_delete_response)

  const [textFieldContent, setTextFieldContent] = useState('')

  function deleteAccount() {
    send("users_delete_request", { })
  }


  useEffect(
    () => {
      if (userDeleteResponse) {
        logout()
      }
    },
    [userDeleteResponse]
  )


  return <FullScreenDialog
    title="Account"
    open={accountModal}
    onClose={() => setAccountModal(false)}
    className="premium modal"
  >
    <DialogContent>

      <Typography>
        Registered email: {me?.email}
      </Typography>
      <Premium/>

      <Box
        sx={{
          marginTop: 10,
          display: "flex",
          alignItems: "center",
          flexDirection: "column",
          gap: 3
        }}
      >

        <TextField
          value={textFieldContent}
          onChange={(event) => setTextFieldContent(event.target.value)}
          id="outlined-password-input"
          label="To delete your account type delete me"
          type="text"
        />
        <Button
          onClick={deleteAccount}
          disabled={textFieldContent !== "delete me"}
        >
          Delete Account
        </Button>

      </Box>
    </DialogContent>
  </FullScreenDialog>
}
