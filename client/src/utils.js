import React, {useEffect, useState} from "react"
import {OverlayTrigger, Popover, Spinner, Form} from "react-bootstrap"
import _ from "lodash"
import emoji from 'react-easy-emoji'

const spinner = (
  <Spinner animation="border" role="status">
    <span className="sr-only">Loading...</span>
  </Spinner>
)

const SimplePopover = ({children, text}) => (
  <OverlayTrigger
    overlay={<Popover>
      <Popover.Content>
        {text}
      </Popover.Content>
    </Popover>}
    trigger={['hover', 'focus']}
  >
    {children}
  </OverlayTrigger>
)

const sent2face = (sentiment) => {
  if (!sentiment) {return null}
  const style = {}
  style.backgroundColor = ~['joy', 'love', 'surprise'].indexOf(sentiment)
    ? '#24cc8f' : '#ff6165'
  style.padding = 5
  style.marginRight = 5
  const emoji_ = {
    sadness: emoji("😢"),
    joy: emoji("😃"),
    love: emoji("🥰"),
    anger: emoji("😡"),
    fear: emoji("😱"),
    surprise: emoji("😯"),
  }[sentiment] || emoji("⚠")
  return (
    <SimplePopover text="Sentiment is machine-generated from your entry's text">
      <span style={style}>{emoji_}</span>
    </SimplePopover>
  )
}

const aiStatusEmoji = (status) => {
  const statusOpts = {props: {width: 16, height: 16}}
  return {
    off: emoji("🔴", statusOpts),
    on: emoji("🟢", statusOpts),
    pending: emoji("🟡", statusOpts)
  }[status]
}

const AiStatusMsg = ({status}) => {
  const [showMore, setShowMore] = useState(false)
  if (status === 'on') {return null}
  const doShowMore = () => setShowMore(true)

  return <>
    <Form.Text muted>
      {aiStatusEmoji(status)} AI server waking up, check back in 3 minutes. <a href='#' onClick={doShowMore}>Why?</a>
      {showMore && <p>
        The AI-based features require expensive servers. I have them turned off when nobody's using the site, and on when someone's back. It takes about 3 minutes to wake. The status {aiStatusEmoji(status)} icon is always visible top-left of website.
      </p>}
    </Form.Text>
  </>
}

const trueKeys = o => _.transform(o, (m,v,k) => {if (v) {m.push(k)}}, [])

export {
  spinner,
  sent2face,
  trueKeys,
  SimplePopover,
  aiStatusEmoji,
  AiStatusMsg
}
