import * as React from 'react';
import Box from '@mui/material/Box';

import {Route, Routes, useLocation, Outlet, useNavigate} from "react-router-dom";
import useApi from "@gnothi/web/src/data/api";
import {useStore} from "@gnothi/web/src/data/store";
import {useEffect} from "react";
import Error from '@gnothi/web/src/ui/Components/Error'
import {S, Loading} from '@gnothi/web/src/ui/Components/Routing'

import {styles} from '../../Setup/Mui'

import AppBar from '../../Components/AppBar'
import Container from "@mui/material/Container";
import {ErrorSnack} from "../../Components/Error";
const GroupsToolbar = React.lazy(() => import ("../Groups/List/Toolbar"))
const GroupToolbar = React.lazy(() => import ("../Groups/View/Toolbar"))
const SharingModal = React.lazy(() => import("../Account/Sharing"))
const EntryModal = React.lazy(() => import("../Entries/Modal"))

function AppBar_() {
  const location = useLocation()
  const setSharePage = useStore(s => s.setSharePage)
  const setEntryModal = useStore(s => s.setEntryModal)

  const links = [
    {name: "Journal", to: "/j", className: "button-journal"},
    {name: "Sharing", onClick: () => setSharePage({create: true}), className: "button-sharing"},
    // {name: "Groups", to: "/groups", className: "button-groups},
    {name: "Resources", to: "/", className: "button-resources"}
  ] as const

  const journal = {
    name: "New Entry",
    onClick: () => setEntryModal({mode: "new"}),
  }

  const cta =
    location.pathname.startsWith("/j") ? journal
    : {}

  return <AppBar
    clearBottom={true}
    links={links}
    ctas={[cta]}
  />
  // return <>
  //   <Routes>
  //     <Route path='/groups/*' element={<S><GroupsToolbar /></S>} />
  //     <Route path='/groups/:gid' element={<S><GroupToolbar /></S>} />
  //   </Routes>
  // </>
}

export default function Layout() {
  useApi()
  const as = useStore(state => state.user?.as);
  const error = useStore(state => state.apiError);
  const user = useStore(state => state.user?.me)
	const navigate = useNavigate()


  useEffect(() => {
    // FIXME only do after first load
    if (as) {navigate('/j')}
  }, [as])

  if (!user) {
    return <Loading label="Loading user" />
  }

  return <Box key={as}>
    <AppBar_ />
    <Container maxWidth={false}>
      {/*<Error message={error} />*/}
      {/*<Error codes={[422,401,500]} />*/}
      <Outlet />
    </Container>
    <S><SharingModal /></S>
    <S><EntryModal /></S>
    <ErrorSnack />
  </Box>
}
