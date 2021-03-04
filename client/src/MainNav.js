import React, { useState, useEffect } from 'react'
import _ from 'lodash'
import {
  Nav,
  Navbar,
  NavDropdown,
  Badge,
} from 'react-bootstrap';
import {LinkContainer} from 'react-router-bootstrap'
import {
  useHistory
} from "react-router-dom";
import emoji from 'react-easy-emoji'
import {aiStatusEmoji, SimplePopover} from "./utils"
import {
  FaRobot,
  FaRegListAlt,
  FaBook, FaRegComments,
} from 'react-icons/fa'

import {useStoreState, useStoreActions} from "easy-peasy";


export default function MainNav() {
  const fetch = useStoreActions(actions => actions.server.fetch)
  const changeAs = useStoreActions(actions => actions.user.changeAs)
  const logout = useStoreActions(actions => actions.user.logout)

  const user = useStoreState(state => state.user.user)
  const shares = useStoreState(state => state.user.shares)
  const as = useStoreState(state => state.user.as)
  const asUser = useStoreState(state => state.user.asUser)
  const aiStatus = useStoreState(state => state.server.ai)

  const renderAsSelect = () => {
    if (!shares.length) {
      return
    }
    return <>
      {as && (
        <NavDropdown.Item onClick={() => changeAs(null)}>
          {emoji("🔀")}{user.email}
        </NavDropdown.Item>
      )}
      {shares.map(s => s.id != as && (
        <NavDropdown.Item
          onClick={() => changeAs(s.id)}
          key={s.id}
        >
          {emoji("🔀")}
          {s.new_entries ? <Badge pill variant='danger'>{s.new_entries}</Badge> : null}
          {s.email}
        </NavDropdown.Item>
      ))}
      <NavDropdown.Divider/>
    </>
  }

  let email = user.email
  if (asUser) {
    email = <>{emoji("🕵️")} {asUser.email}</>
  } else {
    const ne = _.reduce(shares, (m, v) => m + v.new_entries, 0)
    email = !ne ? email : <><Badge pill variant='danger'>{ne}</Badge> {email}</>
  }

  const canProfile = !as || (asUser && asUser.profile)

  let aiStatus_ = null
  if (~['off', 'pending'].indexOf(aiStatus)) {
    aiStatus_ = {
      off: "AI server is offline",
      pending: "AI server is coming online"
    }[aiStatus]
    aiStatus_ = <SimplePopover text={aiStatus_} overlayOpts={{placement: 'right'}}>
      <span>{aiStatusEmoji(aiStatus)}</span>
    </SimplePopover>
  }

  return (
    <Navbar
      bg="light"
      variant="light"
      className="shadow-sm mb-3"
      collapseOnSelect
      expand="sm"
    >
      <LinkContainer to="/j">
        <Navbar.Brand>
          Gnothi {aiStatus_}
        </Navbar.Brand>
      </LinkContainer>
      <Navbar.Toggle aria-controls="responsive-navbar-nav"/>
      <Navbar.Collapse id="responsive-navbar-nav">
        <Nav className="mr-auto">
          <LinkContainer to='/j'>
            <Nav.Link><FaRegListAlt /> Entries</Nav.Link>
          </LinkContainer>
          <LinkContainer to='/insights'>
            <Nav.Link><FaRobot /> Insights</Nav.Link>
          </LinkContainer>
          <LinkContainer to='/resources'>
            <Nav.Link><FaBook /> Resources</Nav.Link>
          </LinkContainer>
          <LinkContainer to='/groups'>
            <Nav.Link><FaRegComments /> Community</Nav.Link>
          </LinkContainer>
          {/* Want resources as Resources->[Books|Therapists]? */}
          {/*<NavDropdown title="Resources" id="collasible-nav-dropdown">
            <NavDropdown.Item href="#action/3.1">Action</NavDropdown.Item>
          </NavDropdown>*/}
        </Nav>
        <Nav>
          <NavDropdown title={email} id="basic-nav-dropdown">
            {renderAsSelect()}
            {canProfile && <LinkContainer to="/account/profile">
              <NavDropdown.Item>Profile</NavDropdown.Item>
            </LinkContainer>}
            {!as && <LinkContainer to="/account/sharing">
              <NavDropdown.Item>Sharing</NavDropdown.Item>
            </LinkContainer>}
            <NavDropdown.Item onClick={() => logout()}>Logout</NavDropdown.Item>
          </NavDropdown>
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  )
}
