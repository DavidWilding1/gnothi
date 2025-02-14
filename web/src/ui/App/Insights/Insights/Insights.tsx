import Box from "@mui/material/Box"
import {Summarize} from "./Summarize"
// import Ask from "./Ask"
import Prompt from "./Prompt/Prompt"
import Books from "./Books"
import Admin from "./Admin"
import Divider from "@mui/material/Divider";
import dayjs from 'dayjs'
import {
  FaLock
} from "react-icons/fa"

import React, {useState, useEffect, useCallback, useMemo} from "react"
import {useStore} from "../../../../data/store"


import BooksIcon from '@mui/icons-material/AutoStoriesOutlined';
import SummaryIcon from '@mui/icons-material/SummarizeOutlined';
import ThemesIcon from '@mui/icons-material/DashboardOutlined';
import PromptIcon from '@mui/icons-material/ChatOutlined';
import ExpandIcon from '@mui/icons-material/FullscreenOutlined';
import AdminIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import Tooltip from "@mui/material/Tooltip"


import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Card from '@mui/material/Card'
import {Stack2, Alert2} from "../../../Components/Misc";
import Stack from "@mui/material/Stack"
import {Typography} from "@mui/material"
import {shallow} from "zustand/shallow";
import {useDebouncedCallback} from "use-debounce";
import IconButton from "@mui/material/IconButton";
import {STAGE} from '../../../../utils/config'

const get = useStore.getState

// 62da7182: books attrs, popovers
const iconProps = {
  size: 40,
  color: "primary"
} as const

interface Insight {
  label: string
  icon: React.ReactNode
  description?: string
  action?: string
  children: React.ReactNode
  moreClick?: () => void
}

function Insight({label, icon, description, action, children, moreClick}: Insight) {
  return <Card
    sx={{backgroundColor: 'white', borderRadius: 2, boxShadow: 1}}
  >
    <CardContent>
      <Stack
        alignItems="center"
        direction="row"
        spacing={1}
      >
        {icon}
        <Typography
          variant="h4"
          fontWeight={500}
          textAlign={'center'}
          color="primary.main"
        >
          {label}
        </Typography>
        {moreClick && <Box
          sx={{flex: 1, display: "flex", justifyContent: "flex-end"}}
        >
          <Tooltip title={"Explore more"}>
            <IconButton
              color='primary'
              size="small"
              onClick={moreClick}
            >
              <ExpandIcon sx={{fontSize: 25}}/>
            </IconButton>
          </Tooltip>
        </Box>}
      </Stack>
      {description && <Typography
        color="primary.main"
        variant="body1"
        fontWeight={500}
      >{description}
      </Typography>}
      {action && <Typography
        mb={3}
        variant="body2"
      >{action}
      </Typography>}
      {children}
    </CardContent>
  </Card>
}


interface Insights {
  entry_ids: string[]
}
export default function Insights({entry_ids}: Insights) {
  const [search, me, creditActive] = useStore(s => [
    s.filters.search,
    s.user?.me,
    s.creditActive
  ], shallow)

  const view = entry_ids.length === 1 ? entry_ids[0] : "list"
  const entryIdsShallow = entry_ids.join("") // for [dependencies] listeners, do a value-compare rather than reference

  // git-blame: checks here to prevent requesting insights if not ready. Now instead I'm debouncing, and
  // letting the server decide.

  const getInsights = useDebouncedCallback(() => {
    // Logging each time this is called, until I'm sure our logic above is solid.
    console.log('insights:useEffect', [search, entry_ids])

    get().send("insights_get_request", {
      view,
      entry_ids,
      generative: creditActive,
      insights: {
        summarize: true,
        query: search,
        books: true,
        prompt: undefined
      }
    })
  }, 2000)

  useEffect(() => {
    if (!entry_ids.length) { return }
    getInsights()
  }, [search, entryIdsShallow, creditActive])

  // FIXME handle on a per-insight basis
  // if (!entry_ids?.length) {
  //   return <Alert2 severity='warning'>
  //     <FaLock /> Not enough entries to work with. Add an entry or adjust the filters
  //   </Alert2>
  // }

  return <div className="insights">
    <Stack2>
      {/*<Stack>*/}
      {/*  <Typography*/}
      {/*    variant="h4"*/}
      {/*    color="primary.main"*/}
      {/*    fontWeight={500}*/}
      {/*    mb={1}*/}
      {/*    mt={0}*/}
      {/*    textAlign='right'*/}
      {/*  >*/}
      {/*    AI Insights*/}
      {/*  </Typography>*/}
      {/*  /!*<Typography*!/*/}
      {/*  /!*  color="primary.main"*!/*/}
      {/*  /!*  variant="body1"*!/*/}
      {/*  /!*  fontWeight={300}*!/*/}
      {/*  /!*  mb={2}*!/*/}
      {/*  /!*>*!/*/}
      {/*  /!*  These are the results based on your search and the entries you’ve selected. You can adjust filters to see different insights.*!/*/}
      {/*  /!*</Typography>*!/*/}
      {/*</Stack>*/}

      {useMemo(() => <Insight
        label="Prompt"
        icon={<PromptIcon {...iconProps} />}
        moreClick={() => me?.premium ? get().modals.setPrompt(true) : get().modals.setPremium(true)}
        description="Ask Gnothi anything"
        action={`The context for the query ${view === "list" ? "are the entries you see, based on your filters." : "is this entry"}`}
      >
        <Prompt entry_ids={entry_ids} view={view}/>
      </Insight>, [me?.premium, entryIdsShallow, view])}

      {useMemo(() => <Insight
        label="Summary & Themes"
        icon={<SummaryIcon {...iconProps} />}
        description="AI-generated snapshot"
        action="Adjust filters for different results."
        // moreClick={() => setSummary(view)}
      >
        <Summarize view={view} entry_ids={entry_ids} />
      </Insight>, [view, entry_ids])}

      {/* git-blame: removed behaviors from dashboard here */}

      {useMemo(() => <Insight
        label="Books"
        icon={<BooksIcon {...iconProps} />}
        description="Titles recommended by AI"
        action="Adjust filters for different results. Expand for thumb up/down and bookshelves."
        //You can thumbs up or down books to train AI on your interests, or add titles you’re interested in to your bookshelf."
        moreClick={() => get().modals.setBooks(view)}
      >
        <Books view={view}/>
      </Insight>, [view])}

      {useMemo(() => me?.is_superuser && <Insight
        label="Admin"
        icon={<AdminIcon {...iconProps} />}
        description="Admin tools and analytics"
      >
        <Admin view={view}/>
      </Insight>, [Boolean(me?.is_superuser)])}

      <iframe style={{borderRadius: 8}} width="100%" height="315" src="https://www.youtube.com/embed/bi0KS8JdHbE" title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen></iframe>

    </Stack2>
  </div>
}
