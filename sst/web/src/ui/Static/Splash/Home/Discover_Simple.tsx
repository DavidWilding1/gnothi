import React from "react";
import { Section } from "./Utils";
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
// import Button from '@mui/material/Button';
import { styles } from '../../../Setup/Mui'
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import SummaryIcon from '@mui/icons-material/SummarizeOutlined';
import BedtimeOutlinedIcon from '@mui/icons-material/BedtimeOutlined';
import ShareIcon from '@mui/icons-material/Share';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import Divider from '@mui/material/Divider';

// import {Link} from "../../../Components/Link"
import { FeatureIntro2 } from "../Utils";
const { sx } = styles

export default function DiscoverAI() {

  const iconProps = {sx: sx.featureIcon}
  const featureProps = {color: sx.featureIcon.color}

  return <Section color="grey">
    <Box>
    <Grid
      container
      flexDirection='row'
      justifyContent='center'
      alignItems='flex-start'
      spacing={4}
      maxWidth={2000}
    >
      <Grid item xs={12}>
        <Typography
          variant="h2"
          textAlign='center'
        >
          Discover more with AI
        </Typography>

        <Typography
          variant="h4"
          textAlign='center'

        >
          Navigate your journey of self-discovery with more clarity and direction
        </Typography>
      </Grid>


      <FeatureIntro2
        {...featureProps}
        icon={<InsightsOutlinedIcon {...iconProps} />}
        title={"Identify themes and patterns"}
      >
        <Typography>
        Narrow your focus with the keywords and concepts that AI sees in your writing.
        </Typography>
      </FeatureIntro2>

      <FeatureIntro2
        {...featureProps}
        icon={<SummaryIcon {...iconProps} />}
        title={"Get helpful snapshots"}
      >
        <Typography>
        Turn a long entry into a short snippet, or summarize a whole year of entries
        </Typography>
      </FeatureIntro2>

      <FeatureIntro2
        {...featureProps}
        icon={<AutoStoriesOutlinedIcon {...iconProps} />}
        title={"Get book recommendations"}
      >
        <Typography>
        Deepen your understanding with books suggested by AI based on your entries
        </Typography>
      </FeatureIntro2>

      <FeatureIntro2
        {...featureProps}
        icon={<FitnessCenterIcon {...iconProps} />}
        title={"Focus on habits and behaviors"}
      >
        <Typography>
        Track things like mood, sleep, exercise, and all the other behaviors that impact you
        </Typography>
      </FeatureIntro2>

      <FeatureIntro2
        {...featureProps}
        icon={<FolderOpenOutlinedIcon {...iconProps} />}
        title={"Organize entries with tags"}
      >
        <Typography>
        Sort your thoughts with custom tags to group entries and streamline your reflections
        </Typography>
      </FeatureIntro2>
    </Grid>

   {/*<Grid item xs={12}>*/}
   {/* <Link.Button*/}
   {/*   variant="contained"*/}
   {/*   sx={{ backgroundColor: 'primary.main', color: colors.white}}*/}
   {/*   to="/features"*/}
   {/* >*/}
   {/*   Explore features and pricing*/}
   {/* </Link.Button>*/}
   {/* </Grid>*/}

</Box>
  </Section>


}
