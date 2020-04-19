import React, { useState, useEffect } from 'react'
import _ from 'lodash'
import './App.css'
import {
  Container,
  Nav,
  Navbar,
  NavDropdown
} from 'react-bootstrap';
import {LinkContainer} from 'react-router-bootstrap'
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
  Redirect
} from "react-router-dom";
import Auth from './Auth'
import Journal from './Journal'
import Profile from './Profile'
import Themes from './Themes'
import Books from './Books'

let host = window.location.origin.split(':')
// host = host[0] + ':' + host[1] + ':' + 3001
host = host[0] + ':' + host[1] + ':' + (host[2] === "3002" ? "5002" : "5001")

function App() {
  const [jwt, setJwt] = useState(localStorage.getItem('jwt'))
  const [user, setUser] = useState()
  const [as, setAs] = useState()

  const fetch_ = async (route, method='GET', body=null) => {
    const obj = {
      method,
      headers: {'Content-Type': 'application/json'},
    };
    if (body) obj['body'] = JSON.stringify(body)
    if (jwt) obj['headers']['Authorization'] = `JWT ${jwt}`
    // auth is added by flask-jwt as /auth, all my custom paths are under /api/*
    let url = route === 'auth' ? `${host}/${route}` :
      `${host}/api/${route}`
    if (as && user && as !== user.id) {
      url += (~route.indexOf('?') ? '&' : '?') + `as=${as}`
    }
    let res = await fetch(url, obj)
    const code = res.status
    res = await res.json()
    return {...res, code}
  }

  const getUser = async () => {
    if (!jwt) {return}
    const {data, code} = await fetch_('user', 'GET')
    if (code === 401) { return logout() }
    setUser(data)
  }

  const onAuth = jwt_ => setJwt(jwt_)

  useEffect(() => { getUser() }, [jwt])

  const logout = () => {
    localStorage.removeItem('jwt')
    window.location.href = "/"
  }

  const renderAsSelect = () => {
    if (_.isEmpty(user.shared_with_me)) {return}
    return <>
      {as && (
        <NavDropdown.Item onClick={() => setAs()}>
          🔀{user.username}
        </NavDropdown.Item>
      )}
      {user.shared_with_me.map(s => s.id != as && (
        <NavDropdown.Item onClick={() => setAs(s.id)}>
          🔀{s.username}
        </NavDropdown.Item>
      ))}
      <NavDropdown.Divider />
    </>
  }

  const renderNav = () => {
    let username = !as ? user.username :
      "🕵️" + _.find(user.shared_with_me, {id: as}).username
    return (
      <Navbar bg="dark" variant="dark">
        <Navbar.Brand href="/">Gnothi</Navbar.Brand>
        <Navbar.Toggle aria-controls="responsive-navbar-nav" />
        <Navbar.Collapse id="responsive-navbar-nav">
          <Nav className="mr-auto">
            <LinkContainer exact to="/j">
              <Nav.Link>Journal</Nav.Link>
            </LinkContainer>
            <LinkContainer exact to="/themes">
              <Nav.Link>Themes</Nav.Link>
            </LinkContainer>
            <LinkContainer exact to="/books">
              <Nav.Link>Books</Nav.Link>
            </LinkContainer>
          </Nav>
          <Nav>
            <NavDropdown title={username} id="basic-nav-dropdown">
              {renderAsSelect()}
              {!as && <LinkContainer to="/profile/sharing">
                <NavDropdown.Item>Sharing</NavDropdown.Item>
              </LinkContainer>}
              <LinkContainer to="/profile/family">
                <NavDropdown.Item>Family</NavDropdown.Item>
              </LinkContainer>
              <NavDropdown.Item onClick={logout}>Logout</NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
    )
  }

  if (!user) {
    return (
      <Container fluid>
        <Auth onAuth={onAuth} fetch_={fetch_} />
      </Container>
    )
  }

  // key={as} triggers refresh on these components (triggering fetches)
  return (
    <Router>
      {renderNav()}
      <br/>
      <Container fluid key={as}>
        <Switch>
          <Route path="/j">
            <Journal fetch_={fetch_} as={as} />
          </Route>
          <Route path="/themes">
            <Themes fetch_={fetch_} as={as} />
          </Route>
          <Route path="/books">
            <Books fetch_={fetch_} as={as} />
          </Route>
          <Route path="/profile">
            <Profile fetch_={fetch_} as={as} />
          </Route>
          <Redirect from="/" to="/j" />
        </Switch>
      </Container>
    </Router>
  )
}

export default App;
