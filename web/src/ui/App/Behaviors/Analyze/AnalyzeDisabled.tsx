import Typography from "@mui/material/Typography";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import CardActions from "@mui/material/CardActions";
import Card from "@mui/material/Card";
import React, {useCallback} from "react";
import {Link} from "../../../Components/Link";
import {shallow} from "zustand/shallow";
import {DISCORD_LINK} from "../../../../utils/config.ts";
import {useStore} from "../../../../data/store";
import Button from "@mui/material/Button";
import BtnTryGenerative from "../../../Components/BtnTryGenerative.tsx";

export function NotEnough() {
  return <Card sx={{borderRadius: 2, height: "100%", backgroundColor: "white"}}>
    <CardContent sx={{backgroundColor: "white", mx: 5}}>
      <Box
        sx={{display: "flex", alignItems: "center", justifyContent: "center", mt: 2}}
      >
        <RocketLaunchIcon sx={{color: "#50577a", fontSize: 40}}/>
      </Box>
      <Typography mt={1} textAlign="center" fontWeight={500} variant="h4" color="primary" mb={3}>
        Keep tracking to see behaviors insights!
      </Typography>
      <Typography mb={2} variant={"body1"}>
        After you have 6 or more days of behavior-tracking, this is where you’ll see charts and various insights. Be sure to continue tracking behaviors in the meantime.
      </Typography>
      <Typography color="primary" variant={"body1"} fontWeight={500}>
        Why is tracking crucial?
      </Typography>
      <Typography mb={2} variant={"body1"}>
        It paves the way for AI insights, captivating correlations, and greater awareness—all of these help you decide
        what’s working, what isn’t, and where you want to go next.
      </Typography>
      <Typography color="primary" variant={"body1"} fontWeight={500}>
        Have questions, or want updates?
      </Typography>
      <Typography mb={2} variant={"body1"}>Stay in the loop, find out how to contribute to this open-source project, and
        more by connecting with the creators on Discord.</Typography>
      <CardActions sx={{backgroundColor: "white", alignContent: "center"}}>
        <Link.Button
          variant="outlined"
          color="secondary"
          size="small"
          to={DISCORD_LINK}
          target="_blank"
        >Connect with the creators</Link.Button>
      </CardActions>
    </CardContent>
  </Card>
}

export function Upgrade() {
  const [
    me,
    creditActive
  ] = useStore(s => [
    s.user?.me,
    s.creditActive
  ], shallow)
  const [send] = useStore(useCallback(s => [s.send], []))

  function submitHandler() {
    send("users_credit_request", {})
  }

  return <Card sx={{borderRadius: 2, height: "100%", backgroundColor: "white"}}>
    <CardContent sx={{backgroundColor: "white", mx: 5}}>
      <Box
        sx={{display: "flex", alignItems: "center", justifyContent: "center", mt: 2}}
      >
        <RocketLaunchIcon sx={{color: "#50577a", fontSize: 40}}/>
      </Box>
      <Typography mt={1} textAlign="center" fontWeight={500} variant="h4" color="primary" mb={3}>
        Behavior analysis is a premium feature
      </Typography>
      <Typography mb={2} variant={"body1"}>
        Upgrade to premium or use a credit to see charts and graphs, correlation analysis, predicted next-day values, top behavior influencers, and more. <strong>Note:</strong> this feature relies on 6 or more days of behavior tracking to generate insights. If you haven't tracked much yet, consider waiting to use a credit. On the other hand, a credit is site-wide, so you can experiment with the premium journal features (which don't rely on time for value).
      </Typography>
      <CardActions sx={{backgroundColor: "white", alignContent: "center"}}>
        <BtnTryGenerative
          tryLabel={"Try Behavior Analysis"}
          premiumLabel={""}
          submit={submitHandler}
        />
      </CardActions>
    </CardContent>
  </Card>
}
