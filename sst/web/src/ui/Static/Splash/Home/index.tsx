import React from 'react'
import {useStore} from '../../../../data/store'
import Error from '../../../../ui/Components/Error'
import Stack from "@mui/material/Stack";

import {styles} from '../../../Setup/Mui'
const {spacing, colors, sx} = styles

import DiscoverAI from './DiscoverAI';
import NewJournal from "../Old/NewJournal";
import Hero from './Hero'
import Demo from './Demo'
import WhatsNext from '../Old/WhatsNext'
import SignUp from "./SignUp";
import HowItWorks from "./HowItWorks";

export default function Layout() {
  const error = useStore(state => state.apiError)

  return <Stack
    sx={{
      backgroundColor: colors.grey
    }}
  >
    <Error message={error} />
    <Hero />
    <DiscoverAI />
    <Demo />
    <HowItWorks />
    <SignUp />
  </Stack>
}
